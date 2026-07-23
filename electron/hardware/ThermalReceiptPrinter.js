import { EventEmitter } from 'node:events';
import { buildReceipt } from './escpos/commands.js';

/**
 * XPrinter USB thermal printer (ESC/POS).
 *
 * Uses node-usb to talk to the printer's bulk-OUT endpoint directly, matching
 * the vendorId/productId in config. Both the `usb` import and the device open
 * are lazy/best-effort so a dev box (macOS, mock mode) or a machine where the
 * native module didn't build still boots — main-app.js treats a printer that
 * fails to initialize as absent and keeps going.
 */
function parseId(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  return s.startsWith('0x') ? parseInt(s, 16) : parseInt(s, 10);
}

export class ThermalReceiptPrinter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.vendorId = parseId(config.vendorId);
    this.productId = parseId(config.productId);
    this.charsPerLine = config.charsPerLine ?? 48;
    this._usb = null;
    this._device = null;
    this._endpoint = null;
    this._iface = null;
    this._ready = false;
  }

  async initialize() {
    if (this.config.enabled === false) {
      throw new Error('Receipt printer is disabled in config');
    }
    try {
      this._usb = await import('usb');
    } catch (err) {
      throw new Error(`usb module unavailable (native build missing?): ${err.message}`);
    }

    const usb = this._usb.usb ?? this._usb; // support both API shapes
    const device = usb.findByIds
      ? usb.findByIds(this.vendorId, this.productId)
      : (this._usb.findByIds && this._usb.findByIds(this.vendorId, this.productId));

    if (!device) {
      throw new Error(
        `USB printer ${hex(this.vendorId)}:${hex(this.productId)} not found on the bus`,
      );
    }

    device.open();
    const iface = device.interfaces[0];
    // On non-Windows, a kernel driver may hold the interface; detach if we can.
    if (typeof iface.isKernelDriverActive === 'function') {
      try {
        if (iface.isKernelDriverActive()) iface.detachKernelDriver();
      } catch {
        /* not supported on Windows; ignore */
      }
    }
    iface.claim();

    const endpoint = iface.endpoints.find((e) => e.direction === 'out');
    if (!endpoint) {
      throw new Error('USB printer has no OUT endpoint');
    }

    this._device = device;
    this._iface = iface;
    this._endpoint = endpoint;
    this._ready = true;
    this.emit('ready', { vendorId: this.vendorId, productId: this.productId });
    return { ok: true };
  }

  _write(buffer) {
    return new Promise((resolve, reject) => {
      this._endpoint.transfer(buffer, (err) => (err ? reject(err) : resolve()));
    });
  }

  /**
   * @param {import('./escpos/commands.js').buildReceipt extends (d: infer D, ...a: any) => any ? D : never} data
   */
  async print(data) {
    if (!this._ready || !this._endpoint) {
      throw new Error('Receipt printer is not connected');
    }
    const bytes = buildReceipt(data, {
      charsPerLine: this.charsPerLine,
      header: this.config.header,
    });
    // Chunk to the endpoint's max packet size to avoid overruns on slow heads.
    const chunk = this._endpoint.descriptor?.wMaxPacketSize || 64;
    for (let i = 0; i < bytes.length; i += chunk) {
      await this._write(bytes.subarray(i, i + chunk));
    }
    this.emit('printed', { orderNumber: data.orderNumber });
    return { ok: true };
  }

  async close() {
    try {
      if (this._iface) await new Promise((r) => this._iface.release(true, () => r()));
      if (this._device) this._device.close();
    } catch {
      /* ignore */
    }
    this._ready = false;
  }
}

function hex(n) {
  return `0x${Number(n || 0).toString(16).padStart(4, '0')}`;
}
