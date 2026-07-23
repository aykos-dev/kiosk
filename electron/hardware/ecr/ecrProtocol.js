/**
 * ECR (Electronic Cash Register) serial wire protocol.
 *
 * This models the widely used "POS-to-ECR" serial framing documented publicly
 * by ComGate (POS-2-ECR v3.00) and used, in the same shape, by many acquirers'
 * ECR integrations — including the kind of USB/serial link a kiosk PC uses to
 * drive a Humo (Sunmi P3) or Uzcard (PAX A35) terminal.
 *
 *   Frame:  <STX> <header> <ETX> <data> <LRC>
 *   LRC  =  XOR of every byte from the first header byte through <ETX>.
 *   data =  FS-separated fields, each "<FieldID><value>", any field order.
 *
 * Header (fixed-width, space right-padded where noted):
 *   protocol name  AN4
 *   version        N2
 *   command        AN1     (e.g. START_RQ='P', RQ_SRV='0', RSP_SRV='1', END='E')
 *   sub-command    AN2     (e.g. C_Payment='CP')
 *   source id      AN16
 *   destination id AN16
 *   session id     N4
 *   packet id      N4
 *   data length    N4
 *
 * IMPORTANT: the exact opcodes, field IDs and value encodings a given acquirer
 * uses can differ. Everything acquirer-specific is centralised in DEFAULTS
 * below and can be overridden per terminal via config, so adapting to the real
 * Humo/Uzcard ECR spec is a config/constant change, not a rewrite.
 */

// --- Control bytes (ASCII) ---
export const STX = 0x02; // Start of text
export const ETX = 0x03; // End of text (LRC covers up to and including this)
export const EOT = 0x04; // End of transmission
export const ENQ = 0x05; // Enquiry
export const ACK = 0x06; // Positive acknowledge
export const NAK = 0x15; // Negative acknowledge
export const FS = 0x1c; // Field separator

/** Commands (header "command" byte). Source shown in comments. */
export const CMD = {
  START_RQ: 'P', // ECR  -> open application session
  START_RS: 'p', // POST -> session-start confirmation (see note in parse)
  RQ_SRV: '0', // ECR  -> request a service (sale, refund, ...)
  RSP_SRV: '1', // POST -> service result
  INFO: '2', // POST -> text for ECR screen/printer
  FINISH: 'F', // ECR  -> ask POST to confirm the services to settle
  CONFIRM: 'C', // POST -> confirmation of completion
  END: 'E', // ECR  -> terminate session
};

/** Sub-commands (header "sub-command" field). */
export const SUB = {
  NONE: '00',
  C_PAYMENT: 'CP', // card sale
  C_CANCEL: 'CC', // void a card sale
  C_REFUND: 'CR', // refund to card
  C_LINE_CHECK: 'CL', // host connectivity test
};

/** Data field IDs. */
export const FIELD = {
  AMOUNT: 'C',
  AUTH_CODE: 'A',
  RESULT: 'R', // response/result code ("0000" = OK)
  STATUS: 'S', // 0 approved, 1 declined, 9 error
  RRN: 'r', // retrieval reference number / txn id
  CARD_PAN: 'P', // masked PAN
  TERMINAL_ID: 't',
  MESSAGE: 'm', // human-readable message
};

/** Transaction status values carried in the STATUS field. */
export const STATUS = {
  APPROVED: '0',
  DECLINED: '1',
  ERROR: '9',
};

export const DEFAULTS = {
  protocolName: 'CECP',
  protocolVersion: '01',
  ecrId: 'ECR01',
  hostId: 'POST01',
  /** so'm is a zero-decimal currency, so the amount is sent as whole units. */
  amountDecimals: 0,
};

const enc = new TextEncoder();

/** Right-pad (or truncate) an ASCII string to a fixed field width. */
function fixed(value, width) {
  const s = String(value ?? '');
  if (s.length >= width) return s.slice(0, width);
  return s.padEnd(width, ' ');
}

/** Left-pad a number with zeros to a fixed width (wraps modulo 10^width). */
function num(value, width) {
  const n = ((Number(value) || 0) % 10 ** width + 10 ** width) % 10 ** width;
  return String(n).padStart(width, '0');
}

/**
 * XOR-based Longitudinal Redundancy Check over a byte range.
 * @param {Uint8Array|number[]} bytes
 */
export function computeLrc(bytes) {
  let lrc = 0;
  for (const b of bytes) lrc ^= b & 0xff;
  return lrc & 0xff;
}

/**
 * Encode the amount into the protocol's minor/whole units as an ASCII string.
 * @param {number} amount  integer so'm (major units)
 * @param {number} decimals
 */
export function encodeAmount(amount, decimals = DEFAULTS.amountDecimals) {
  const whole = Math.round(Number(amount) || 0);
  if (decimals <= 0) return String(whole);
  return String(whole * 10 ** decimals);
}

/**
 * Build the FS-separated data section from an ordered list of [fieldId, value].
 * @param {Array<[string, string|number]>} fields
 * @returns {number[]} bytes (no leading/trailing FS)
 */
export function buildData(fields) {
  const parts = [];
  for (const [id, value] of fields) {
    if (value === undefined || value === null) continue;
    parts.push(`${id}${value}`);
  }
  const out = [];
  parts.forEach((p, i) => {
    if (i > 0) out.push(FS);
    for (const b of enc.encode(p)) out.push(b);
  });
  return out;
}

/**
 * Assemble a full framed packet ready to write to the serial port.
 * @param {object} p
 * @param {string} p.command       one of CMD.*
 * @param {string} [p.subCommand]  one of SUB.* (default NONE)
 * @param {number} p.sessionId
 * @param {number} p.packetId
 * @param {number[]} [p.data]      body bytes from buildData()
 * @param {object} [opts]          identities/protocol overrides
 * @returns {Buffer}
 */
export function buildPacket(
  { command, subCommand = SUB.NONE, sessionId, packetId, data = [] },
  opts = {},
) {
  const o = { ...DEFAULTS, ...opts };
  const headerStr =
    fixed(o.protocolName, 4) +
    num(o.protocolVersion, 2) +
    fixed(command, 1) +
    fixed(subCommand, 2) +
    fixed(o.ecrId, 16) +
    fixed(o.hostId, 16) +
    num(sessionId, 4) +
    num(packetId, 4) +
    num(data.length, 4);

  const body = [STX, ...enc.encode(headerStr), ETX, ...data];
  // LRC is computed over the header + ETX (everything after STX up to and
  // including ETX), per the ComGate spec's worked example.
  const lrc = computeLrc([...enc.encode(headerStr), ETX]);
  body.push(lrc);
  return Buffer.from(body);
}

/**
 * Convenience: build a card-sale (C_Payment) service request.
 * @param {object} p
 * @param {number} p.amount     integer so'm
 * @param {number} p.sessionId
 * @param {number} p.packetId
 * @param {object} [opts]
 */
export function buildSaleRequest({ amount, sessionId, packetId }, opts = {}) {
  const data = buildData([[FIELD.AMOUNT, encodeAmount(amount, opts.amountDecimals)]]);
  return buildPacket(
    { command: CMD.RQ_SRV, subCommand: SUB.C_PAYMENT, sessionId, packetId, data },
    opts,
  );
}

/** Build a session-open (START_RQ) packet. */
export function buildStartRequest({ sessionId, packetId }, opts = {}) {
  return buildPacket({ command: CMD.START_RQ, sessionId, packetId }, opts);
}

/** Build a session-close (END) packet. */
export function buildEndRequest({ sessionId, packetId }, opts = {}) {
  return buildPacket({ command: CMD.END, sessionId, packetId }, opts);
}

const dec = new TextDecoder('latin1');

/**
 * Parse one framed packet (STX..LRC) into its header + data fields.
 * @param {Buffer|Uint8Array} buf  a single complete frame
 * @returns {{
 *   command: string, subCommand: string, sessionId: number, packetId: number,
 *   fields: Record<string,string>, lrcOk: boolean
 * }}
 */
export function parsePacket(buf) {
  const bytes = Uint8Array.from(buf);
  const stxIdx = bytes.indexOf(STX);
  const etxIdx = bytes.indexOf(ETX, stxIdx + 1);
  if (stxIdx < 0 || etxIdx < 0 || etxIdx >= bytes.length - 1) {
    throw new Error('ECR: malformed frame (missing STX/ETX/LRC)');
  }
  const headerBytes = bytes.slice(stxIdx + 1, etxIdx);
  const dataBytes = bytes.slice(etxIdx + 1, bytes.length - 1);
  const lrc = bytes[bytes.length - 1];
  const lrcOk = computeLrc([...headerBytes, ETX]) === lrc;

  const header = dec.decode(headerBytes);
  // Fixed-width header layout (see file header comment).
  const command = header.slice(6, 7);
  const subCommand = header.slice(7, 9);
  const sessionId = parseInt(header.slice(41, 45), 10);
  const packetId = parseInt(header.slice(45, 49), 10);

  const fields = {};
  if (dataBytes.length) {
    for (const part of dec.decode(dataBytes).split(String.fromCharCode(FS))) {
      if (!part) continue;
      fields[part[0]] = part.slice(1);
    }
  }
  return { command, subCommand, sessionId, packetId, fields, lrcOk };
}

/**
 * Interpret a parsed RSP_SRV packet as a normalized payment outcome.
 * @param {ReturnType<typeof parsePacket>} pkt
 * @returns {{ status: 'approved'|'declined'|'error', transactionId: string|null,
 *   authCode: string|null, resultCode: string|null, message: string|null }}
 */
export function interpretResponse(pkt) {
  const f = pkt.fields || {};
  const statusField = f[FIELD.STATUS];
  const resultCode = f[FIELD.RESULT] ?? null;

  let status;
  if (statusField === STATUS.APPROVED) status = 'approved';
  else if (statusField === STATUS.DECLINED) status = 'declined';
  else if (statusField === STATUS.ERROR) status = 'error';
  else if (resultCode != null) status = resultCode === '0000' ? 'approved' : 'declined';
  else status = 'error';

  return {
    status,
    transactionId: f[FIELD.RRN] || f[FIELD.AUTH_CODE] || null,
    authCode: f[FIELD.AUTH_CODE] || null,
    resultCode,
    message: f[FIELD.MESSAGE] || null,
  };
}

/**
 * Incremental frame extractor for a serial byte stream. Feed it chunks; it
 * yields complete frames (STX .. ETX + 1 LRC byte) as it finds them and keeps
 * the remainder buffered. Bare ACK/NAK bytes are surfaced separately.
 */
export class FrameParser {
  constructor() {
    this._buf = Buffer.alloc(0);
  }

  /**
   * @param {Buffer} chunk
   * @returns {{ acks: number[], frames: Buffer[] }}
   */
  push(chunk) {
    this._buf = Buffer.concat([this._buf, chunk]);
    const acks = [];
    const frames = [];

    // Consume any leading control bytes (ACK/NAK) that arrive before/without a frame.
    let progressed = true;
    while (progressed) {
      progressed = false;

      // Strip leading ACK/NAK/ENQ handshake bytes.
      while (this._buf.length && (this._buf[0] === ACK || this._buf[0] === NAK || this._buf[0] === ENQ)) {
        acks.push(this._buf[0]);
        this._buf = this._buf.subarray(1);
        progressed = true;
      }

      const stx = this._buf.indexOf(STX);
      if (stx < 0) break;
      const etx = this._buf.indexOf(ETX, stx + 1);
      if (etx < 0 || etx + 1 >= this._buf.length) break; // wait for ETX + LRC

      const frame = this._buf.subarray(stx, etx + 2); // include LRC byte
      frames.push(Buffer.from(frame));
      this._buf = this._buf.subarray(etx + 2);
      progressed = true;
    }
    return { acks, frames };
  }

  reset() {
    this._buf = Buffer.alloc(0);
  }
}
