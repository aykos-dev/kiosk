import { MockReceiptPrinter } from './mocks/MockReceiptPrinter.js';
import { ThermalReceiptPrinter } from './ThermalReceiptPrinter.js';

/**
 * @param {ReturnType<import('../config.js').loadAppConfig>} appConfig
 */
export async function createReceiptPrinter(appConfig) {
  const useMock = appConfig.hardware.printer.useMock;
  if (useMock) {
    const printer = new MockReceiptPrinter();
    await printer.initialize();
    return printer;
  }
  const printer = new ThermalReceiptPrinter(appConfig.hardware.printer);
  await printer.initialize();
  return printer;
}
