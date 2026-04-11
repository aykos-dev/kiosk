import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

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
    },
    printer: {
      enabled: true,
      vendorId: '0x1234',
      productId: '0x5678',
      useMock: true,
    },
  },
  api: {
    baseUrl: 'https://io.bellissimo.uz/api',
    timeout: 5000,
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

  let useMockTerminal = merged.hardware?.paymentTerminal?.useMock;
  if (useMockTerminal === undefined) {
    useMockTerminal = process.platform === 'darwin' || merged.mode === 'development';
  }
  let useMockPrinter = merged.hardware?.printer?.useMock;
  if (useMockPrinter === undefined) {
    useMockPrinter = process.platform === 'darwin' || merged.mode === 'development';
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
