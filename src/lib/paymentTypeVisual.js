/** Payment types shown together on the “QR / online” row (order preserved). */
export const QR_GROUP_CODES = ['PAYME', 'CLICK', 'UZUMC'];

/**
 * @param {string | undefined} code
 * @returns {'payme'|'click'|'uzum'|'cash'|'humo'}
 */
export function paymentVisualKind(code) {
  const c = (code || '').toUpperCase();
  if (c === 'PAYME') return 'payme';
  if (c === 'CLICK') return 'click';
  if (c === 'UZUMC') return 'uzum';
  if (c === 'CASH') return 'cash';
  return 'humo';
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
