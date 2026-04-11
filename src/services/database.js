import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number INTEGER NOT NULL,
  items TEXT NOT NULL,
  total REAL NOT NULL,
  payment_status TEXT NOT NULL,
  payment_transaction_id TEXT,
  synced INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  retry_count INTEGER DEFAULT 0,
  last_attempt TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);
CREATE INDEX IF NOT EXISTS idx_sync_queue_order ON sync_queue(order_id);
`;

/**
 * @param {string} dbPath Absolute path to SQLite file
 */
export function openDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

export function insertOrder(db, row) {
  const stmt = db.prepare(`
    INSERT INTO orders (id, order_number, items, total, payment_status, payment_transaction_id, synced, created_at)
    VALUES (@id, @order_number, @items, @total, @payment_status, @payment_transaction_id, 0, @created_at)
  `);
  stmt.run(row);
}

export function enqueueSync(db, orderId) {
  db.prepare('INSERT INTO sync_queue (order_id, retry_count) VALUES (?, 0)').run(orderId);
}

export function getPendingOrders(db) {
  return db
    .prepare(
      `SELECT o.* FROM orders o
       INNER JOIN sync_queue q ON q.order_id = o.id
       WHERE o.synced = 0 AND q.retry_count < 5
       ORDER BY o.created_at ASC`,
    )
    .all();
}

export function markOrderSynced(db, orderId) {
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET synced = 1, synced_at = ? WHERE id = ?').run(now, orderId);
  db.prepare('DELETE FROM sync_queue WHERE order_id = ?').run(orderId);
}

export function nextOrderNumber(db) {
  const row = db.prepare('SELECT MAX(order_number) AS m FROM orders').get();
  const max = row?.m ?? 0;
  return max + 1;
}

export function bumpSyncRetry(db, orderId) {
  db.prepare(
    `UPDATE sync_queue SET retry_count = retry_count + 1, last_attempt = ? WHERE order_id = ?`,
  ).run(new Date().toISOString(), orderId);
}

export function getSyncQueueRows(db) {
  return db.prepare('SELECT * FROM sync_queue ORDER BY id ASC').all();
}

export function listRecentOrders(db, limit = 100) {
  return db
    .prepare('SELECT * FROM orders ORDER BY datetime(created_at) DESC LIMIT ?')
    .all(limit);
}
