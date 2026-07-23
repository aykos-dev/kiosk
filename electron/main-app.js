import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { loadAppConfig, getWindowOptions } from './config.js';
import { createPaymentTerminals } from './hardware/PaymentTerminal.js';
import { createReceiptPrinter } from './hardware/ReceiptPrinter.js';
import * as dbApi from '../src/services/database.js';
import { SyncManager } from '../src/services/syncManager.js';

let mainWindow;
let db;
/** Map of card scheme -> terminal instance ({ humo, uzcard }). */
let terminals = {};
let printer;
let syncManager;
let appConfig;

/** Methods that charge a physical card terminal, mapped to the terminal kind. */
const TERMINAL_METHOD_KIND = { card: 'humo', humo: 'humo', uzcard: 'uzcard' };
/** Methods settled outside the kiosk (recorded as pending, no terminal charge). */
const RECORD_ONLY_METHODS = new Set(['cash', 'qr']);

/** Resolve the terminal to charge for a checkout method, or null. */
function terminalForMethod(method) {
  const kind = TERMINAL_METHOD_KIND[method];
  return kind ? terminals[kind] || null : null;
}

/**
 * Ring buffer of recent hardware problems. During development we surface every
 * terminal/printer error in the UI, so we both broadcast live and keep the last
 * N so a screen that mounts after an error still sees it.
 */
const hardwareErrors = [];
const HW_ERROR_LIMIT = 50;

/**
 * Record a hardware problem: log it, keep it, and push it to every window.
 * This is the single choke point that makes hardware failures visible without
 * ever throwing into the app.
 * @param {string} source  e.g. 'terminal:humo', 'printer', 'init'
 * @param {string} message
 * @param {object} [extra]
 */
function recordHardwareError(source, message, extra = {}) {
  const entry = { source, message: String(message ?? 'unknown error'), ...extra, at: new Date().toISOString() };
  hardwareErrors.push(entry);
  if (hardwareErrors.length > HW_ERROR_LIMIT) hardwareErrors.shift();
  console.error(`[hardware-error] ${source}: ${entry.message}`, extra);
  broadcast('hardware:error', entry);
  return entry;
}

/** Attach an 'error' listener so a device EventEmitter can never crash the app. */
function watchDevice(emitter, source) {
  if (!emitter || typeof emitter.on !== 'function') return;
  emitter.on('error', (err) => recordHardwareError(source, err?.message || err));
  emitter.on('disconnected', () => recordHardwareError(source, 'device disconnected'));
}

/**
 * Authoritative order total (integer so'm) derived from line items, so the
 * amount charged/recorded never depends on a client-supplied number.
 */
function deriveOrderTotal(items) {
  if (!Array.isArray(items)) return 0;
  let sum = 0;
  for (const i of items) {
    const line = Number(i?.lineTotal);
    if (Number.isFinite(line)) {
      sum += line;
    } else {
      sum += (Number(i?.price) || 0) * (Number(i?.qty) || 1);
    }
  }
  return Math.round(sum);
}

function broadcast(channel, payload) {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  });
}

async function createMainWindow() {
  appConfig = loadAppConfig();
  const { width, height, minWidth, minHeight, fullscreen, resizable } =
    getWindowOptions(appConfig);

  const iconBase = path.join(__dirname, '../../assets/images/bellissimo-icon');
  const iconPath =
    process.platform === 'win32' && fs.existsSync(`${iconBase}.ico`)
      ? `${iconBase}.ico`
      : fs.existsSync(`${iconBase}.png`)
        ? `${iconBase}.png`
        : undefined;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth,
    minHeight,
    fullscreen,
    resizable,
    show: false,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  if (!app.isPackaged && appConfig.mode === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function catalogFallbackDir() {
  return path.join(app.getPath('userData'), 'catalog-fallback');
}

function setupIpc() {
  ipcMain.handle('config:get', () => loadAppConfig());

  ipcMain.handle('catalog:saveFallback', (_e, { name, json }) => {
    if (typeof name !== 'string' || !name || typeof json !== 'string') return { ok: false };
    const safe = name.replace(/[^a-z0-9_-]/gi, '');
    if (!safe) return { ok: false };
    try {
      const dir = catalogFallbackDir();
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${safe}.json`), json, 'utf8');
      return { ok: true };
    } catch (e) {
      console.warn('[catalog:saveFallback]', e);
      return { ok: false };
    }
  });

  ipcMain.handle('catalog:loadFallback', (_e, name) => {
    if (typeof name !== 'string' || !name) return null;
    const safe = name.replace(/[^a-z0-9_-]/gi, '');
    if (!safe) return null;
    const file = path.join(catalogFallbackDir(), `${safe}.json`);
    try {
      if (!fs.existsSync(file)) return null;
      return fs.readFileSync(file, 'utf8');
    } catch {
      return null;
    }
  });

  ipcMain.handle('checkout:process', async (_e, payload) => {
    const { items, total, method, orderId } = payload || {};
    const paymentMethod = TERMINAL_METHOD_KIND[method] || RECORD_ONLY_METHODS.has(method)
      ? method
      : 'card';

    // (2.5) Never trust the client total for the charge amount. Re-derive it
    // from the line items and reject if it disagrees with what the UI showed.
    const amount = deriveOrderTotal(items);
    if (!Number.isInteger(amount) || amount <= 0) {
      return { ok: false, reason: 'invalid_amount' };
    }
    const claimed = Math.round(Number(total));
    if (Number.isFinite(claimed) && claimed !== amount) {
      console.warn(`[checkout] client total ${claimed} != derived ${amount}; using derived`);
    }

    // (2.1) Idempotency: a stable id from the renderer means an accidental
    // re-dispatch of the same checkout never charges or records twice.
    const id = typeof orderId === 'string' && orderId ? orderId : uuidv4();
    const existing = dbApi.getOrder(db, id);
    if (existing && existing.payment_status === 'completed') {
      return { ok: true, orderNumber: existing.order_number, orderId: id, alreadyProcessed: true };
    }

    const cardTerminal = terminalForMethod(paymentMethod);
    const chargesCard = !!TERMINAL_METHOD_KIND[paymentMethod];
    let transactionId = existing?.payment_transaction_id ?? null;

    try {
      if (chargesCard) {
        if (!cardTerminal) {
          return { ok: false, reason: 'terminal_unavailable' };
        }
        const result = await cardTerminal.processPayment(amount);
        if (result.status === 'declined') {
          return { ok: false, reason: 'declined' };
        }
        if (result.status !== 'approved' || !result.transactionId) {
          return { ok: false, reason: result.status || 'unknown' };
        }
        transactionId = result.transactionId;
      }
    } catch (err) {
      // Charge failed before any money moved — safe to send the user back.
      console.error('[checkout] terminal', err);
      return { ok: false, reason: 'error', message: err.message };
    }

    // (2.1) Payment has settled (card) or is collected out-of-band (cash/QR).
    // Record the order durably BEFORE printing so a printer fault can never
    // lose a paid order or bounce the customer back into a second charge.
    const createdAt = existing?.created_at ?? new Date().toISOString();
    const orderNumber = existing?.order_number ?? dbApi.nextOrderNumber(db, createdAt);
    const row = {
      id,
      order_number: orderNumber,
      items: JSON.stringify(items || []),
      total: amount,
      payment_status: chargesCard ? 'completed' : 'pending',
      payment_method: paymentMethod,
      payment_transaction_id: transactionId,
      created_at: createdAt,
    };
    try {
      dbApi.upsertOrder(db, row);
      dbApi.enqueueSyncOnce(db, id);
    } catch (err) {
      console.error('[checkout] persist', err);
      return { ok: false, reason: 'error', message: err.message };
    }

    // (2.1) Printing is best-effort; a failure is recorded, not fatal.
    let printed = true;
    try {
      if (!printer) throw new Error('printer unavailable (not initialized / not found)');
      const printItems = (items || []).map((i) => ({
        name: i.name,
        qty: i.qty || 1,
        price: i.price,
        lineTotal: i.lineTotal ?? i.price * (i.qty || 1),
      }));
      await printer.print({
        orderNumber,
        items: printItems,
        total: amount,
        transactionId,
        timestamp: createdAt,
        paymentMethod,
      });
    } catch (err) {
      printed = false;
      recordHardwareError('printer', `print failed (order still recorded): ${err?.message || err}`);
    }

    syncManager.triggerNow().catch((err) => console.warn('[sync] trigger', err));

    return {
      ok: true,
      orderNumber,
      transactionId,
      orderId: id,
      paymentStatus: row.payment_status,
      printed,
    };
  });

  ipcMain.handle('orders:list', () => dbApi.listRecentOrders(db, 100));

  ipcMain.handle('sync:trigger', async () => {
    await syncManager.triggerNow();
    return { ok: true };
  });

  ipcMain.handle('sync:status', () => ({
    online: syncManager.online,
  }));

  ipcMain.on('network:online', (_e, online) => {
    syncManager.setOnline(!!online);
    if (online) syncManager.triggerNow().catch(() => {});
  });

  ipcMain.handle('hardware:test-print', async () => {
    if (!printer) {
      recordHardwareError('printer', 'printer unavailable (not initialized / not found)');
      return { ok: false, reason: 'printer_unavailable' };
    }
    try {
      await printer.print({
        orderNumber: 999,
        items: [{ name: 'Test Item', qty: 1, price: 1, lineTotal: 1 }],
        total: 1,
        transactionId: 'test',
        timestamp: new Date().toISOString(),
      });
      return { ok: true };
    } catch (err) {
      recordHardwareError('printer', err?.message || err);
      return { ok: false, reason: 'error', message: err?.message };
    }
  });

  ipcMain.handle('hardware:test-payment', async (_e, kind = 'humo') => {
    const term = terminals[kind];
    if (!term) {
      recordHardwareError(`terminal:${kind}`, `terminal '${kind}' unavailable`);
      return { status: 'error', reason: 'terminal_unavailable', kind };
    }
    try {
      return await term.processPayment(1);
    } catch (err) {
      recordHardwareError(`terminal:${kind}`, err?.message || err);
      return { status: 'error', reason: 'error', message: err?.message, kind };
    }
  });

  ipcMain.handle('hardware:recent-errors', () => hardwareErrors.slice());

  // Charge a specific card terminal (kind = 'humo' | 'uzcard') for `amount`
  // so'm. Used by the table-order checkout flow, which charges the physical
  // card BEFORE registering the order with the backend.
  ipcMain.handle('hardware:charge', async (_e, { kind, amount } = {}) => {
    const term = terminals[kind];
    if (!term) {
      recordHardwareError(`terminal:${kind}`, `terminal '${kind}' unavailable (unplugged or wrong COM port?)`);
      return { status: 'error', reason: 'terminal_unavailable', kind };
    }
    const amt = Math.round(Number(amount));
    if (!Number.isInteger(amt) || amt <= 0) {
      return { status: 'error', reason: 'invalid_amount' };
    }
    try {
      const result = await term.processPayment(amt);
      // A decline is a normal outcome; only surface genuine errors in the UI.
      if (result?.status === 'error') {
        recordHardwareError(`terminal:${kind}`, result.message || result.reason || 'payment error', { kind });
      }
      return result;
    } catch (err) {
      recordHardwareError(`terminal:${kind}`, err?.message || err, { kind });
      return { status: 'error', reason: 'error', message: err?.message };
    }
  });

  // Print a receipt on demand (used after a server-registered order settles).
  ipcMain.handle('hardware:print-receipt', async (_e, data = {}) => {
    if (!printer) {
      recordHardwareError('printer', 'printer unavailable (not initialized / not found)');
      return { ok: false, reason: 'printer_unavailable' };
    }
    try {
      await printer.print({
        orderNumber: data.orderNumber ?? '—',
        items: Array.isArray(data.items) ? data.items : [],
        total: Math.round(Number(data.total) || 0),
        transactionId: data.transactionId,
        timestamp: data.timestamp || new Date().toISOString(),
        paymentMethod: data.paymentMethod,
      });
      return { ok: true };
    } catch (err) {
      recordHardwareError('printer', err?.message || err);
      return { ok: false, reason: 'error', message: err?.message };
    }
  });
}

app.whenReady().then(async () => {
  const userData = app.getPath('userData');
  db = dbApi.openDatabase(path.join(userData, 'kiosk.db'));
  appConfig = loadAppConfig();

  // Hardware is best-effort: a terminal or printer that fails to initialize
  // must never stop the kiosk UI (and thus online ordering) from booting.
  // Every failure is recorded (and later shown in the UI), never thrown.
  try {
    const res = await createPaymentTerminals(appConfig);
    terminals = res.terminals;
    for (const [kind, msg] of Object.entries(res.errors || {})) {
      recordHardwareError(`terminal:${kind}`, msg);
    }
    for (const [kind, term] of Object.entries(terminals)) watchDevice(term, `terminal:${kind}`);
    const ready = Object.keys(terminals);
    console.log(`[main-app] card terminals ready: ${ready.length ? ready.join(', ') : 'none'}`);
  } catch (err) {
    recordHardwareError('init', `payment terminals init failed: ${err?.message || err}`);
    terminals = {};
  }
  try {
    printer = await createReceiptPrinter(appConfig);
    watchDevice(printer, 'printer');
  } catch (err) {
    recordHardwareError('init', `printer init failed: ${err?.message || err}`);
    printer = null;
  }

  syncManager = new SyncManager(db, appConfig);
  syncManager.on('status', (payload) => broadcast('sync:status', payload));
  syncManager.on('synced', (payload) => broadcast('sync:status', { ...payload, event: 'synced' }));
  syncManager.on('failed', (payload) => broadcast('sync:status', { ...payload, event: 'failed' }));

  // (3.3) Don't assume connectivity at boot. Probe the backend once; the
  // renderer keeps this accurate afterwards via navigator.onLine events.
  syncManager.start();
  syncManager.api
    .healthCheck()
    .then((ok) => {
      syncManager.setOnline(ok);
      if (ok) syncManager.triggerNow().catch(() => {});
    })
    .catch(() => syncManager.setOnline(false));

  setupIpc();
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}).catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[main-app] startup failed', err);
  dialog.showErrorBox(
    'Bellissimo Kiosk — startup failed',
    `${msg}\n\nIf this persists after reinstall, contact support.`,
  );
  app.quit();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
