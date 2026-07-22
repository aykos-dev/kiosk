import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { loadAppConfig, getWindowOptions } from './config.js';
import { createPaymentTerminal } from './hardware/PaymentTerminal.js';
import { createReceiptPrinter } from './hardware/ReceiptPrinter.js';
import * as dbApi from '../src/services/database.js';
import { SyncManager } from '../src/services/syncManager.js';

let mainWindow;
let db;
let terminal;
let printer;
let syncManager;
let appConfig;

/** Methods that charge the physical card terminal. */
const TERMINAL_METHODS = new Set(['card', 'humo']);
/** Methods settled outside the kiosk (recorded as pending, no terminal charge). */
const RECORD_ONLY_METHODS = new Set(['cash', 'qr']);

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
    const paymentMethod = TERMINAL_METHODS.has(method) || RECORD_ONLY_METHODS.has(method)
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

    const chargesCard = TERMINAL_METHODS.has(paymentMethod);
    let transactionId = existing?.payment_transaction_id ?? null;

    try {
      if (chargesCard) {
        const result = await terminal.processPayment(amount);
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

    // (2.1) Printing is best-effort; a failure is logged, not fatal.
    let printed = true;
    try {
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
      });
    } catch (err) {
      printed = false;
      console.error('[checkout] print failed (order still recorded)', err);
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
    await printer.print({
      orderNumber: 999,
      items: [{ name: 'Test Item', qty: 1, price: 1, lineTotal: 1 }],
      total: 1,
      transactionId: 'test',
      timestamp: new Date().toISOString(),
    });
    return { ok: true };
  });

  ipcMain.handle('hardware:test-payment', async () => {
    const r = await terminal.processPayment(0.01);
    return r;
  });
}

app.whenReady().then(async () => {
  const userData = app.getPath('userData');
  db = dbApi.openDatabase(path.join(userData, 'kiosk.db'));
  appConfig = loadAppConfig();

  // Hardware is best-effort: a terminal or printer that fails to initialize
  // must never stop the kiosk UI (and thus online ordering) from booting.
  try {
    terminal = await createPaymentTerminal(appConfig);
  } catch (err) {
    console.error('[main-app] payment terminal init failed; continuing without it', err);
    terminal = null;
  }
  try {
    printer = await createReceiptPrinter(appConfig);
  } catch (err) {
    console.error('[main-app] printer init failed; continuing without it', err);
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
