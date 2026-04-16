import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

import { loadAppConfig } from './config.js';
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

function broadcast(channel, payload) {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isDestroyed()) w.webContents.send(channel, payload);
  });
}

function attachTerminalListeners(t) {
  const forward = (name) => (detail) => broadcast('terminal:event', { type: name, detail });
  t.on('payment-started', forward('payment-started'));
  t.on('payment-approved', forward('payment-approved'));
  t.on('payment-declined', forward('payment-declined'));
  t.on('payment-error', forward('payment-error'));
}

async function createMainWindow() {
  appConfig = loadAppConfig();
  const fullscreen = appConfig.kiosk?.fullscreen !== false;
  const k = appConfig.kiosk || {};
  const winW = Number.isFinite(Number(k.windowWidth)) ? Number(k.windowWidth) : 1080;
  const winH = Number.isFinite(Number(k.windowHeight)) ? Number(k.windowHeight) : 1920;
  const minW = Number.isFinite(Number(k.minWindowWidth)) ? Number(k.minWindowWidth) : 518;
  const minH = Number.isFinite(Number(k.minWindowHeight)) ? Number(k.minWindowHeight) : 900;

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    minWidth: minW,
    minHeight: minH,
    fullscreen,
    show: false,
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
    const { items, total } = payload || {};
    const amount = Number(total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, reason: 'invalid_amount' };
    }
    try {
      const result = await terminal.processPayment(amount);
      if (result.status === 'declined') {
        return { ok: false, reason: 'declined' };
      }
      if (result.status !== 'approved' || !result.transactionId) {
        return { ok: false, reason: result.status || 'unknown' };
      }

      const orderNumber = dbApi.nextOrderNumber(db);
      const id = uuidv4();
      const createdAt = new Date().toISOString();
      const row = {
        id,
        order_number: orderNumber,
        items: JSON.stringify(items || []),
        total: amount,
        payment_status: 'completed',
        payment_transaction_id: result.transactionId,
        created_at: createdAt,
      };
      dbApi.insertOrder(db, row);
      dbApi.enqueueSync(db, id);

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
        transactionId: result.transactionId,
        timestamp: createdAt,
      });

      syncManager.triggerNow().catch((err) => console.warn('[sync] trigger', err));

      return {
        ok: true,
        orderNumber,
        transactionId: result.transactionId,
        orderId: id,
      };
    } catch (err) {
      console.error('[checkout]', err);
      broadcast('terminal:event', { type: 'payment-error', detail: { message: err.message } });
      return { ok: false, reason: 'error', message: err.message };
    }
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

  terminal = await createPaymentTerminal(appConfig);
  attachTerminalListeners(terminal);
  printer = await createReceiptPrinter(appConfig);

  syncManager = new SyncManager(db, appConfig);
  syncManager.on('status', (payload) => broadcast('sync:status', payload));
  syncManager.on('synced', (payload) => broadcast('sync:status', { ...payload, event: 'synced' }));
  syncManager.on('failed', (payload) => broadcast('sync:status', { ...payload, event: 'failed' }));
  syncManager.setOnline(true);
  syncManager.start();

  setupIpc();
  await createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
