/**
 * Localized strings from API `translations` or legacy `i18n` / base fields.
 * @param {string} locale - 'uz' | 'ru' | 'en'
 */

function pickLocaleString(chunk, locale) {
  if (!chunk || typeof chunk !== 'object') return '';
  if (typeof chunk === 'string') return chunk;
  if (Array.isArray(chunk)) return '';
  const v = chunk[locale];
  if (v != null && v !== '') return String(v);
  const uz = chunk.uz;
  if (uz != null && uz !== '') return String(uz);
  const ru = chunk.ru;
  if (ru != null && ru !== '') return String(ru);
  const en = chunk.en;
  if (en != null && en !== '') return String(en);
  return '';
}

/** Title from `translations.title` or legacy `name` / `i18n`. */
export function translationTitle(obj, locale) {
  if (!obj) return '';
  const t = obj.translations?.title;
  if (t && typeof t === 'object' && !Array.isArray(t)) {
    const s = pickLocaleString(t, locale);
    if (s) return s;
  }
  if (locale === 'uz' || !obj.i18n) return obj.name ?? '';
  const chunk = obj.i18n[locale];
  if (chunk && chunk.name != null && chunk.name !== '') return chunk.name;
  return obj.name ?? '';
}

/** Description from `translations.desc` (object or empty). */
export function translationDesc(obj, locale) {
  if (!obj) return '';
  const d = obj.translations?.desc;
  if (d == null) return '';
  if (Array.isArray(d) && d.length === 0) return '';
  if (typeof d === 'object' && !Array.isArray(d)) {
    return pickLocaleString(d, locale);
  }
  return '';
}

/**
 * Read a localized field from a data object with optional per-locale overrides.
 * Supports API `translations.title` / `translations.desc` and legacy `i18n`.
 */
export function tEntity(obj, locale, field = 'name') {
  if (!obj) return '';
  if (field === 'name') {
    const tr = translationTitle(obj, locale);
    if (tr) return tr;
  }
  if (field === 'description') {
    const td = translationDesc(obj, locale);
    if (td) return td;
  }
  if (locale === 'uz' || !obj.i18n) return obj[field] ?? '';
  const chunk = obj.i18n[locale];
  if (chunk && chunk[field] != null && chunk[field] !== '') return chunk[field];
  return obj[field] ?? '';
}
