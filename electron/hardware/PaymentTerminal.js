import { MockPaymentTerminal } from './mocks/MockPaymentTerminal.js';
import { WindowsSerialPaymentTerminal } from './WindowsSerialPaymentTerminal.js';

/**
 * @param {ReturnType<import('../config.js').loadAppConfig>} appConfig
 */
export async function createPaymentTerminal(appConfig) {
  const useMock = appConfig.hardware.paymentTerminal.useMock;
  if (useMock) {
    const terminal = new MockPaymentTerminal();
    await terminal.initialize();
    return terminal;
  }
  const terminal = new WindowsSerialPaymentTerminal(appConfig.hardware.paymentTerminal);
  await terminal.initialize();
  return terminal;
}
