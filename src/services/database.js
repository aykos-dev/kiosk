import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/** Human-facing order numbers reset each day and wrap after this value. */
export const DAILY_ORDER_NUMBER_MAX = 999;

/**
 * Retry count at/above which a queued order is considered "stuck" and surfaced
 * for operator visibility. Orders are NOT dropped once they hit this — a paid
 * order must keep retrying until the backend accepts it (see getPendingOrders).
 */
export const STUCK_RETRY_THRESHOLD = 5;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number INTEGER NOT NULL,
  items TEXT NOT NULL,
  total INTEGER NOT NULL,
  payment_status TEXT NOT NULL,
  payment_method TEXT,
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
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
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
  migrate(db);
  return db;
}

/** Additive migrations for databases created before a column existed. */
function migrate(db) {
  const cols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
  if (!cols.includes('payment_method')) {
    db.exec('ALTER TABLE orders ADD COLUMN payment_method TEXT');
  }
}

export function getOrder(db, id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

/**
 * Insert or upgrade an order by id (idempotent). Preserves the original
 * created_at / order_number so a pending order upgraded to paid keeps its
 * identity, and re-invoking checkout with the same id never duplicates a row.
 */
export function upsertOrder(db, row) {
  const stmt = db.prepare(`
    INSERT INTO orders (id, order_number, items, total, payment_status, payment_method, payment_transaction_id, synced, created_at)
    VALUES (@id, @order_number, @items, @total, @payment_status, @payment_method, @payment_transaction_id, 0, @created_at)
    ON CONFLICT(id) DO UPDATE SET
      items = excluded.items,
      total = excluded.total,
      payment_status = excluded.payment_status,
      payment_method = excluded.payment_method,
      payment_transaction_id = excluded.payment_transaction_id
  `);
  stmt.run(row);
}

/** Enqueue an order for sync at most once (no duplicate queue rows on retry). */
export function enqueueSyncOnce(db, orderId) {
  const existing = db.prepare('SELECT id FROM sync_queue WHERE order_id = ?').get(orderId);
  if (existing) return;
  db.prepare('INSERT INTO sync_queue (order_id, retry_count) VALUES (?, 0)').run(orderId);
}

/**
 * Orders awaiting sync. Least-retried first so a single permanently-failing
 * row cannot starve newer orders. We intentionally do NOT drop high-retry
 * orders — a paid order must reach the backend eventually (see STUCK).
 */
export function getPendingOrders(db) {
  return db
    .prepare(
      `SELECT o.*, q.retry_count AS retry_count FROM orders o
       INNER JOIN sync_queue q ON q.order_id = o.id
       WHERE o.synced = 0
       ORDER BY q.retry_count ASC, o.created_at ASC`,
    )
    .all();
}

/** How many queued orders have exceeded the stuck threshold (operator alert). */
export function getStuckOrderCount(db, threshold = STUCK_RETRY_THRESHOLD) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS c FROM orders o
       INNER JOIN sync_queue q ON q.order_id = o.id
       WHERE o.synced = 0 AND q.retry_count >= ?`,
    )
    .get(threshold);
  return row?.c ?? 0;
}

export function markOrderSynced(db, orderId) {
  const now = new Date().toISOString();
  db.prepare('UPDATE orders SET synced = 1, synced_at = ? WHERE id = ?').run(now, orderId);
  db.prepare('DELETE FROM sync_queue WHERE order_id = ?').run(orderId);
}

/**
 * Next human-facing order number for the day of `referenceIso`, wrapping after
 * DAILY_ORDER_NUMBER_MAX. Scoped to the UTC calendar day of created_at (the
 * same basis used when the row is stored), so the counter resets daily.
 * @param {string} [referenceIso] ISO timestamp of the order being created
 */
export function nextOrderNumber(db, referenceIso = new Date().toISOString()) {
  const day = String(referenceIso).slice(0, 10); // YYYY-MM-DD
  const row = db
    .prepare(`SELECT MAX(order_number) AS m FROM orders WHERE substr(created_at, 1, 10) = ?`)
    .get(day);
  const max = row?.m ?? 0;
  const next = max + 1;
  return next > DAILY_ORDER_NUMBER_MAX ? 1 : next;
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
