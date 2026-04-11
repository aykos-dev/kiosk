import { EventEmitter } from 'node:events';

/**
 * Placeholder for USB thermal printer (node-thermal-printer / escpos) on Windows.
 */
export class ThermalReceiptPrinter extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
  }

  async initialize() {
    throw new Error(
      'Thermal printer not implemented yet. Set hardware.printer.useMock to true or add USB ESC/POS in Phase 4.',
    );
  }

  async print() {
    throw new Error('Thermal printer not implemented');
  }
}
