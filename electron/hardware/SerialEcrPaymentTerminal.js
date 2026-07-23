import { EventEmitter } from 'node:events';
import {
  ACK,
  NAK,
  CMD,
  FrameParser,
  buildSaleRequest,
  buildStartRequest,
  buildEndRequest,
  buildPacket,
  SUB,
  parsePacket,
  interpretResponse,
} from './ecr/ecrProtocol.js';

/**
 * Drives one physical card terminal (Humo=Sunmi P3, Uzcard=PAX A35) over a
 * Windows USB/serial COM port using the ECR framing in ./ecr/ecrProtocol.js.
 *
 * `serialport` is imported lazily so that a dev machine (macOS, mock mode) or a
 * box where the native module failed to build can still boot the kiosk — a
 * terminal that fails to initialize is treated as "absent" by main-app.js.
 */
export class SerialEcrPaymentTerminal extends EventEmitter {
  /**
   * @param {object} config  a resolved hardware.paymentTerminals[kind] entry
   */
  constructor(config) {
    super();
    this.config = config;
    this.kind = config.kind || 'card';
    this.port = null;
    this._parser = new FrameParser();
    this._session = 0;
    this._packet = 0;
    this._ready = false;
  }

  _protoOpts() {
    return {
      ecrId: this.config.ecrId,
      hostId: this.config.hostId,
      protocolName: this.config.protocolName,
      protocolVersion: this.config.protocolVersion,
      amountDecimals: this.config.amountDecimals,
    };
  }

  _nextPacketId() {
    this._packet = (this._packet + 1) % 10000;
    return this._packet;
  }

  async initialize() {
    if (this.config.enabled === false) {
      throw new Error(`ECR terminal '${this.kind}' is disabled in config`);
    }
    let SerialPort;
    try {
      ({ SerialPort } = await import('serialport'));
    } catch (err) {
      throw new Error(
        `serialport module unavailable (native build missing?) for '${this.kind}': ${err.message}`,
      );
    }

    await new Promise((resolve, reject) => {
      this.port = new SerialPort(
        {
          path: this.config.port,
          baudRate: this.config.baudRate ?? 9600,
          dataBits: this.config.dataBits ?? 8,
          stopBits: this.config.stopBits ?? 1,
          parity: this.config.parity ?? 'none',
          autoOpen: false,
        },
      );
      this.port.open((err) => (err ? reject(err) : resolve()));
    });

    this.port.on('data', (chunk) => this._onData(chunk));
    this.port.on('error', (err) => this.emit('error', err));
    this.port.on('close', () => {
      this._ready = false;
      this.emit('disconnected', { kind: this.kind });
    });

    this._ready = true;
    this.emit('ready', { kind: this.kind, port: this.config.port });
    return { ok: true };
  }

  _onData(chunk) {
    const { acks, frames } = this._parser.push(chunk);
    for (const a of acks) this.emit('_ack', a);
    for (const f of frames) {
      let pkt;
      try {
        pkt = parsePacket(f);
      } catch (err) {
        this.emit('error', err);
        continue;
      }
      // INFO frames mirror the terminal display to the ECR — surface, don't wait on them.
      if (pkt.command === CMD.INFO) {
        this.emit('info', pkt.fields);
        this._writeRaw(Buffer.from([ACK])); // acknowledge INFO so POST proceeds
        continue;
      }
      this.emit('_frame', pkt);
    }
  }

  _writeRaw(buf) {
    return new Promise((resolve, reject) => {
      this.port.write(buf, (err) => (err ? reject(err) : this.port.drain((e) => (e ? reject(e) : resolve()))));
    });
  }

  /** Write a framed packet and wait for the peer's ACK (retrying on NAK). */
  async _sendWithAck(packet, { ackTimeoutMs = 3000, retries = 2 } = {}) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ack = this._waitFor('_ack', ackTimeoutMs);
      await this._writeRaw(packet);
      try {
        const byte = await ack;
        if (byte === ACK) return;
        if (byte === NAK) continue; // resend
      } catch (err) {
        if (attempt === retries) throw new Error(`ECR '${this.kind}': no ACK (${err.message})`);
      }
    }
    throw new Error(`ECR '${this.kind}': peer NAK'd packet after ${retries + 1} attempts`);
  }

  /** Wait for the next event of `name`, rejecting after `timeoutMs`. */
  _waitFor(name, timeoutMs) {
    return new Promise((resolve, reject) => {
      const onEvt = (v) => {
        clearTimeout(timer);
        resolve(v);
      };
      const timer = setTimeout(() => {
        this.off(name, onEvt);
        reject(new Error(`timeout waiting for ${name} after ${timeoutMs}ms`));
      }, timeoutMs);
      this.once(name, onEvt);
    });
  }

  /**
   * Run a card sale for `amount` (integer so'm) and resolve the outcome.
   * @param {number} amount
   * @returns {Promise<{ status: 'approved'|'declined'|'error', transactionId?: string, reason?: string, message?: string }>}
   */
  async processPayment(amount) {
    if (!this._ready || !this.port?.isOpen) {
      throw new Error(`ECR terminal '${this.kind}' is not connected`);
    }
    const amt = Math.round(Number(amount) || 0);
    if (!Number.isInteger(amt) || amt <= 0) {
      return { status: 'error', reason: 'invalid_amount' };
    }

    this._session = (this._session + 1) % 10000;
    this._packet = 0;
    this._parser.reset();
    const opts = this._protoOpts();
    const txTimeout = this.config.transactionTimeoutMs ?? 120000;

    this.emit('payment-started', { kind: this.kind, amount: amt });

    try {
      // 1) Open an application session (some hosts ACK-only; START_RS optional).
      await this._sendWithAck(
        buildStartRequest({ sessionId: this._session, packetId: this._nextPacketId() }, opts),
      );

      // 2) Send the sale and wait for the service result frame (RSP_SRV).
      const sale = buildSaleRequest(
        { amount: amt, sessionId: this._session, packetId: this._nextPacketId() },
        opts,
      );
      await this._sendWithAck(sale);

      const resultPkt = await this._awaitServiceResult(txTimeout);
      // ACK the result so the terminal can finalise its side.
      await this._writeRaw(Buffer.from([ACK]));

      const outcome = interpretResponse(resultPkt);

      // 3) Close the session (best-effort; result already known).
      this._sendWithAck(
        buildEndRequest({ sessionId: this._session, packetId: this._nextPacketId() }, opts),
        { retries: 0 },
      ).catch(() => {});

      if (outcome.status === 'approved') {
        this.emit('payment-approved', { kind: this.kind, amount: amt, ...outcome });
        return {
          status: 'approved',
          transactionId: outcome.transactionId || `${this.kind}-${this._session}`,
          authCode: outcome.authCode,
        };
      }
      this.emit('payment-declined', { kind: this.kind, amount: amt, ...outcome });
      return {
        status: outcome.status === 'error' ? 'error' : 'declined',
        reason: outcome.resultCode || outcome.status,
        message: outcome.message || undefined,
      };
    } catch (err) {
      this.emit('payment-error', { kind: this.kind, amount: amt, error: err.message });
      // Try to abort/close the session so the terminal doesn't hang.
      this._sendWithAck(
        buildPacket(
          { command: CMD.END, subCommand: SUB.NONE, sessionId: this._session, packetId: this._nextPacketId() },
          opts,
        ),
        { retries: 0, ackTimeoutMs: 1500 },
      ).catch(() => {});
      throw err;
    }
  }

  /** Wait for the RSP_SRV (service result) frame, ignoring INFO chatter. */
  _awaitServiceResult(timeoutMs) {
    return new Promise((resolve, reject) => {
      const onFrame = (pkt) => {
        if (pkt.command === CMD.RSP_SRV || pkt.subCommand === SUB.C_PAYMENT) {
          cleanup();
          resolve(pkt);
        }
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`ECR '${this.kind}': no result within ${timeoutMs}ms`));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        this.off('_frame', onFrame);
      };
      this.on('_frame', onFrame);
    });
  }

  async close() {
    if (this.port?.isOpen) {
      await new Promise((resolve) => this.port.close(() => resolve()));
    }
    this._ready = false;
  }
}
