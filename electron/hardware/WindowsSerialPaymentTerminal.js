import { EventEmitter } from 'node:events';

/**
 * Placeholder for Windows COM serial integration (Phase 4).
 * Wire protocol depends on your terminal vendor.
 */
export class WindowsSerialPaymentTerminal extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
  }

  async initialize() {
    throw new Error(
      'Serial payment terminal not implemented yet. Set hardware.paymentTerminal.useMock to true or complete Phase 4 integration.',
    );
  }

  async processPayment() {
    throw new Error('Serial payment terminal not implemented');
  }
}
