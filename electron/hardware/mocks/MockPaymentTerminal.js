import { EventEmitter } from 'node:events';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Simulates a card terminal on macOS / dev: 2–3s delay, configurable outcome.
 */
export class MockPaymentTerminal extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      minDelayMs: 2000,
      maxDelayMs: 3200,
      declineRate: 0,
      ...options,
    };
  }

  async initialize() {
    return { ok: true };
  }

  /**
   * @param {number} amount
   * @returns {Promise<{ status: string; transactionId?: string; reason?: string }>}
   */
  async processPayment(amount) {
    this.emit('payment-started', { amount, mock: true });
    const ms =
      this.options.minDelayMs +
      Math.random() * (this.options.maxDelayMs - this.options.minDelayMs);
    await delay(ms);

    if (Math.random() < this.options.declineRate) {
      this.emit('payment-declined', { amount, mock: true });
      return { status: 'declined', reason: 'mock_declined' };
    }

    const transactionId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.emit('payment-approved', { amount, transactionId, mock: true });
    return { status: 'approved', transactionId };
  }
}
