import { EventEmitter } from 'node:events';
import { createApiClient } from './api.js';
import * as dbApi from './database.js';

const SYNC_INTERVAL_MS = 30000;

/** Background sync with exponential backoff in API client; queue retries match DB filter (retry_count under 5). */
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
    this.online = true;
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

  async tick() {
    if (!this.online) {
      this.emit('status', { online: false, message: 'offline' });
      return;
    }

    const pending = dbApi.getPendingOrders(this.db);
    if (!pending.length) {
      this.emit('status', { online: this.online, pending: 0 });
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

    const remaining = dbApi.getPendingOrders(this.db).length;
    this.emit('status', { online: this.online, pending: remaining });
  }

  async triggerNow() {
    await this.tick();
  }
}
