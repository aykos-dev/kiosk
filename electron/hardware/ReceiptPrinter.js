import { MockReceiptPrinter } from './mocks/MockReceiptPrinter.js';
import { ThermalReceiptPrinter } from './ThermalReceiptPrinter.js';
import { WindowsSpoolerReceiptPrinter } from './WindowsSpoolerReceiptPrinter.js';

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
  // 'windows' = Windows print queue (stock driver); 'usb' = direct WinUSB access.
  const printer =
    appConfig.hardware.printer.interface === 'windows'
      ? new WindowsSpoolerReceiptPrinter(appConfig.hardware.printer)
      : new ThermalReceiptPrinter(appConfig.hardware.printer);
  await printer.initialize();
  return printer;
}
