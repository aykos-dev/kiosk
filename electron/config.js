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
    paymentTerminal: {
      enabled: true,
      port: 'COM3',
      baudRate: 9600,
      useMock: true,
      // (TEMP until Phase 4) The real WindowsSerialPaymentTerminal is still an
      // unimplemented stub that throws on initialize(), so a packaged build has
      // no working terminal. Allow the mock in packaged/production builds so the
      // app can boot and online ordering can be tested end-to-end. REMOVE this
      // (or set false) once the real serial terminal is implemented.
      allowMockInProduction: true,
    },
    printer: {
      enabled: true,
      vendorId: '0x1234',
      productId: '0x5678',
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

  let useMockTerminal = merged.hardware?.paymentTerminal?.useMock;
  if (useMockTerminal === undefined) {
    useMockTerminal = process.platform === 'darwin' || merged.mode === 'development';
  }
  // (5.2) A mock terminal approves every payment for free. Never let one run in
  // a production build by accident — it must be explicitly opted into.
  if (isProduction && useMockTerminal) {
    const allowMock = merged.hardware?.paymentTerminal?.allowMockInProduction === true;
    if (!allowMock) {
      console.warn(
        '[kiosk] REFUSING mock payment terminal in a production build (it would approve payments for free). ' +
          'Forcing the real terminal. Set hardware.paymentTerminal.allowMockInProduction=true to override for testing.',
      );
      useMockTerminal = false;
    } else {
      console.warn('[kiosk] WARNING: mock payment terminal explicitly enabled in production.');
    }
  }

  let useMockPrinter = merged.hardware?.printer?.useMock;
  if (useMockPrinter === undefined) {
    useMockPrinter = process.platform === 'darwin' || merged.mode === 'development';
  }
  if (isProduction && useMockPrinter) {
    console.warn('[kiosk] WARNING: mock receipt printer active in a production build.');
  }

  merged.hardware = merged.hardware || {};
  merged.hardware.paymentTerminal = {
    ...defaults.hardware.paymentTerminal,
    ...merged.hardware.paymentTerminal,
    useMock: useMockTerminal,
  };
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
