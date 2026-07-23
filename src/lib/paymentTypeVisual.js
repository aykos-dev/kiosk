/** Payment types shown together on the “QR / online” row (order preserved). */
export const QR_GROUP_CODES = ['PAYME', 'CLICK', 'UZUMC'];

/**
 * The two physical card terminals every kiosk has, each on its own COM port:
 * Humo -> Sunmi P3, Uzcard -> PAX A35. The org API does not expose these as
 * separate payment types, so the UI renders them as static buttons and routes
 * the charge to the matching terminal by kind.
 */
export const CARD_KINDS = ['humo', 'uzcard'];

/**
 * @param {string | undefined} code
 * @returns {'payme'|'click'|'uzum'|'cash'|'humo'|'uzcard'}
 */
export function paymentVisualKind(code) {
  const c = (code || '').toUpperCase();
  if (c === 'PAYME') return 'payme';
  if (c === 'CLICK') return 'click';
  if (c === 'UZUMC') return 'uzum';
  if (c === 'CASH') return 'cash';
  if (c === 'UZCARD') return 'uzcard';
  return 'humo';
}

/** True for the combined bank-card payment type(s) the API lumps together. */
export function isCardKind(kind) {
  return kind === 'humo' || kind === 'uzcard';
}

/**
 * @param {string | undefined} code
 */
export function isQrGroupCode(code) {
  return QR_GROUP_CODES.includes((code || '').toUpperCase());
}

/**
 * @param {{ label?: Record<string, string> }} pt
 * @param {string} locale
 */
export function pickPaymentTypeLabel(pt, locale) {
  const bag = pt?.label;
  if (!bag || typeof bag !== 'object') return '';
  return bag[locale] || bag.uz || bag.ru || bag.en || '';
}
