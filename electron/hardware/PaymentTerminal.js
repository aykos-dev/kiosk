import { MockPaymentTerminal } from './mocks/MockPaymentTerminal.js';
import { SerialEcrPaymentTerminal } from './SerialEcrPaymentTerminal.js';

/**
 * Build a single terminal (real serial ECR or mock) for one card scheme.
 * @param {object} termConfig  a resolved hardware.paymentTerminals[kind] entry
 */
async function createOneTerminal(termConfig) {
  if (termConfig.useMock) {
    const terminal = new MockPaymentTerminal({ kind: termConfig.kind });
    await terminal.initialize();
    return terminal;
  }
  const terminal = new SerialEcrPaymentTerminal(termConfig);
  await terminal.initialize();
  return terminal;
}

/**
 * Create every configured card terminal, keyed by scheme ('humo', 'uzcard').
 * Each every kiosk has both physical terminals, but init is independent and
 * best-effort: if one fails (unplugged / wrong COM port), the other still works
 * and the failed one is simply absent from the returned map.
 *
 * @param {ReturnType<import('../config.js').loadAppConfig>} appConfig
 * @returns {Promise<{ terminals: Record<string, object>, errors: Record<string,string> }>}
 */
export async function createPaymentTerminals(appConfig) {
  const configs = appConfig.hardware.paymentTerminals || {};
  const terminals = {};
  const errors = {};

  await Promise.all(
    Object.entries(configs).map(async ([kind, cfg]) => {
      if (cfg.enabled === false) return;
      try {
        terminals[kind] = await createOneTerminal({ ...cfg, kind });
      } catch (err) {
        errors[kind] = err.message;
        console.error(`[hardware] terminal '${kind}' init failed; continuing without it`, err.message);
      }
    }),
  );

  return { terminals, errors };
}

/**
 * Back-compat single-terminal factory (defaults to the Humo terminal).
 * @param {ReturnType<import('../config.js').loadAppConfig>} appConfig
 */
export async function createPaymentTerminal(appConfig) {
  const { terminals } = await createPaymentTerminals(appConfig);
  return terminals.humo || terminals.uzcard || null;
}
