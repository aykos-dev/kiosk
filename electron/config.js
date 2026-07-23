import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { DEFAULT_API_BASE_URL, API_ORDER_TIMEOUT_MS } from '../src/lib/apiDefaults.js';

const defaults = {
  mode: 'development',
  kiosk: {
    fullscreen: true,
    inactivityTimeout: 300000,
    windowWidth: 1080,
    windowHeight: 1920,
    minWindowWidth: 518,
    minWindowHeight: 900,
  },
  hardware: {
    // Two physical card terminals, one per card scheme, each cabled to the
    // kiosk PC over its own USB/serial (COM) port. `port` is meant to be
    // edited per install (a device can enumerate on a different COM number on
    // a different PC) — override it in config.json next to the app or in
    // userData/config.json without touching code.
    paymentTerminals: {
      // Humo card scheme -> Sunmi P3 handheld (USB serial ECR).
      humo: {
        label: 'Humo (Sunmi P3)',
        enabled: true,
        port: 'COM3',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        // How long to wait for the customer to tap/insert + host auth.
        transactionTimeoutMs: 120000,
        // ECR-protocol identities (see electron/hardware/ecr/ecrProtocol.js).
        ecrId: 'ECR01',
        hostId: 'POST01',
        useMock: true,
        allowMockInProduction: true,
      },
      // Uzcard scheme -> PAX A35 PIN-pad (USB serial ECR).
      uzcard: {
        label: 'Uzcard (PAX A35)',
        enabled: true,
        port: 'COM4',
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        transactionTimeoutMs: 120000,
        ecrId: 'ECR01',
        hostId: 'POST01',
        useMock: true,
        allowMockInProduction: true,
      },
    },
    printer: {
      enabled: true,
      interface: 'usb',
      // XPrinter USB (ESC/POS). vendorId/productId identify the device on the
      // USB bus; find them with Device Manager / `lsusb` and set per install.
      vendorId: '0x1234',
      productId: '0x5678',
      // 80mm heads print ~48 chars/line at Font A, 58mm ~32. Adjust to paper.
      charsPerLine: 48,
      useMock: true,
    },
  },
  api: {
    baseUrl: DEFAULT_API_BASE_URL,
    timeout: API_ORDER_TIMEOUT_MS,
    retryAttempts: 3,
  },
};

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const v = override[key];
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v !== 'function') {
      out[key] = deepMerge(out[key] || {}, v);
    } else {
      out[key] = v;
    }
  }
  return out;
}

export function getConfigPaths() {
  const cwd = process.cwd();
  const nextToApp = app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'config.json')
    : path.join(cwd, 'config.json');
  const userData = path.join(app.getPath('userData'), 'config.json');
  return { nextToApp, userData, cwd };
}

let cached;

export function loadAppConfig() {
  if (cached) return cached;
  const { nextToApp, userData } = getConfigPaths();
  let merged = { ...defaults };

  for (const p of [nextToApp, userData]) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        const parsed = JSON.parse(raw);
        merged = deepMerge(merged, parsed);
      }
    } catch (e) {
      console.warn('[kiosk] config read failed', p, e.message);
    }
  }

  const isProduction = app.isPackaged || merged.mode === 'production';

  const mockByDefault = process.platform === 'darwin' || merged.mode === 'development';

  merged.hardware = merged.hardware || {};

  // Back-compat: an old config.json may carry a single `paymentTerminal`
  // (before we split into Humo/Uzcard). Fold its serial settings into the Humo
  // terminal so existing installs keep working, and nudge toward the new keys.
  const legacy = merged.hardware.paymentTerminal;
  if (legacy && typeof legacy === 'object') {
    console.warn(
      '[kiosk] hardware.paymentTerminal is deprecated; migrating it to hardware.paymentTerminals.humo. ' +
        'Move your settings to hardware.paymentTerminals.{humo,uzcard} in config.json.',
    );
    merged.hardware.paymentTerminals = {
      ...merged.hardware.paymentTerminals,
      humo: { ...merged.hardware.paymentTerminals?.humo, ...legacy },
    };
    delete merged.hardware.paymentTerminal;
  }

  // Resolve `useMock` for a device, refusing a payment mock in production
  // unless explicitly opted in — a mock terminal approves every charge for free.
  const resolveTerminalMock = (name, cfg) => {
    let useMock = cfg?.useMock;
    if (useMock === undefined) useMock = mockByDefault;
    if (isProduction && useMock) {
      if (cfg?.allowMockInProduction === true) {
        console.warn(`[kiosk] WARNING: mock '${name}' payment terminal explicitly enabled in production.`);
      } else {
        console.warn(
          `[kiosk] REFUSING mock '${name}' payment terminal in a production build (it would approve payments for free). ` +
            `Forcing the real terminal. Set hardware.paymentTerminals.${name}.allowMockInProduction=true to override for testing.`,
        );
        useMock = false;
      }
    }
    return useMock;
  };

  const terminals = {};
  for (const name of Object.keys(defaults.hardware.paymentTerminals)) {
    const cfg = {
      ...defaults.hardware.paymentTerminals[name],
      ...merged.hardware.paymentTerminals?.[name],
    };
    cfg.kind = name;
    cfg.useMock = resolveTerminalMock(name, cfg);
    terminals[name] = cfg;
  }
  merged.hardware.paymentTerminals = terminals;

  let useMockPrinter = merged.hardware?.printer?.useMock;
  if (useMockPrinter === undefined) useMockPrinter = mockByDefault;
  if (isProduction && useMockPrinter) {
    console.warn('[kiosk] WARNING: mock receipt printer active in a production build.');
  }
  merged.hardware.printer = {
    ...defaults.hardware.printer,
    ...merged.hardware.printer,
    useMock: useMockPrinter,
  };

  cached = merged;
  return cached;
}

export function invalidateConfigCache() {
  cached = undefined;
}

/**
 * Single source of truth for the kiosk BrowserWindow geometry.
 * Reads the merged config (which always carries the `defaults` above), so
 * neither main-app.js nor config.json need to re-hard-code fallback sizes.
 * @param {ReturnType<typeof loadAppConfig>} [appConfig]
 */
export function getWindowOptions(appConfig = loadAppConfig()) {
  const k = appConfig.kiosk || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
  const width = num(k.windowWidth, defaults.kiosk.windowWidth);
  const height = num(k.windowHeight, defaults.kiosk.windowHeight);
  const fullscreen = k.fullscreen !== false;
  // A production kiosk runs on a fixed portrait panel and must not be resized
  // into a layout the UI was never designed for. Only allow resizing while
  // developing with fullscreen off.
  const resizable = !fullscreen && appConfig.mode === 'development';
  return {
    width,
    height,
    // When the window is locked, min === fixed size; when resizing is allowed
    // for dev convenience, fall back to the configured minimums.
    minWidth: resizable ? num(k.minWindowWidth, defaults.kiosk.minWindowWidth) : width,
    minHeight: resizable ? num(k.minWindowHeight, defaults.kiosk.minWindowHeight) : height,
    fullscreen,
    resizable,
  };
}
