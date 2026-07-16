import { EventEmitter } from 'node:events';
import { createApiClient } from './api.js';
import * as dbApi from './database.js';

const SYNC_INTERVAL_MS = 30000;

/**
 * Background sync of queued orders. Retries never drop a paid order; orders
 * that repeatedly fail are surfaced via a `stuck` count for operator alerting.
 */
export class SyncManager extends EventEmitter {
  /**
   * @param {import('better-sqlite3').Database} db
   * @param {object} appConfig
   */
  constructor(db, appConfig) {
    super();
    this.db = db;
    this.appConfig = appConfig;
    this.api = createApiClient(appConfig.api);
    this.timer = null;
    // (3.3) Connectivity is unknown until probed — don't assume online.
    this.online = false;
    // (3.2) Guards against overlapping ticks (interval + triggerNow).
    this.syncing = false;
  }

  setOnline(flag) {
    this.online = !!flag;
    this.emit('status', { online: this.online });
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch((e) => console.warn('[sync]', e)), SYNC_INTERVAL_MS);
    this.tick().catch((e) => console.warn('[sync]', e));
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  emitQueueStatus() {
    this.emit('status', {
      online: this.online,
      pending: dbApi.getPendingOrders(this.db).length,
      stuck: dbApi.getStuckOrderCount(this.db),
    });
  }

  async tick() {
    // (3.2) Never run two ticks concurrently — that would double-POST orders
    // and double-count retries.
    if (this.syncing) return;
    if (!this.online) {
      this.emit('status', { online: false, message: 'offline' });
      return;
    }

    this.syncing = true;
    try {
      const pending = dbApi.getPendingOrders(this.db);
      if (!pending.length) {
        this.emitQueueStatus();
        return;
      }

      for (const order of pending) {
        let items;
        try {
          items = JSON.parse(order.items);
        } catch {
          items = [];
        }

        const payload = {
          id: order.id,
          orderNumber: order.order_number,
          items,
          total: order.total,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
          paymentTransactionId: order.payment_transaction_id,
          createdAt: order.created_at,
        };

        const result = await this.api.postOrder(payload);
        if (result.ok) {
          dbApi.markOrderSynced(this.db, order.id);
          this.emit('synced', { orderId: order.id });
        } else {
          dbApi.bumpSyncRetry(this.db, order.id);
          this.emit('failed', { orderId: order.id, error: result.error });
        }
      }

      this.emitQueueStatus();
    } finally {
      this.syncing = false;
    }
  }

  async triggerNow() {
    await this.tick();
  }
}
