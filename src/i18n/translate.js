import uz from '../locales/uz.json';
import ru from '../locales/ru.json';
import en from '../locales/en.json';

const DICTS = { uz, ru, en };

function getPath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

/**
 * @param {string} locale - 'uz' | 'ru' | 'en'
 * @param {string} key - dot.path
 * @param {Record<string, string | number>} [vars] - replaces {name} in string
 */
export function translate(locale, key, vars) {
  const loc = DICTS[locale] ? locale : 'uz';
  let str = getPath(DICTS[loc], key);
  if (str == null || str === '') str = getPath(DICTS.uz, key);
  if (str == null || str === '') str = getPath(DICTS.en, key);
  if (typeof str !== 'string') str = key;

  if (vars && typeof str === 'string') {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

/**
 * Dynamic segment: e.g. lookupDyn(locale, ['recommendations', recId, 'name'])
 */
export function translateParts(locale, parts) {
  const key = parts.join('.');
  return translate(locale, key);
}

/** If translation missing, returns fallback (not the key). */
export function translateFallback(locale, key, fallback) {
  const v = translate(locale, key);
  if (v === key) return fallback;
  return v;
}

export function comboOptionLabel(locale, optionId, fallbackName) {
  const k = `comboOptions.${optionId}`;
  return translateFallback(locale, k, fallbackName);
}

export function pickRecommendation(locale, rec) {
  const bag = getPath(DICTS[locale] || DICTS.uz, `recommendations.${rec.id}`)
    ?? getPath(DICTS.uz, `recommendations.${rec.id}`);
  return {
    ...rec,
    name: bag?.name ?? rec.name,
    deltaLabel: bag?.deltaLabel ?? rec.deltaLabel,
  };
}

export function pickUpsellItem(locale, item) {
  const bag = getPath(DICTS[locale] || DICTS.uz, `upsellItems.${item.id}`)
    ?? getPath(DICTS.uz, `upsellItems.${item.id}`);
  return {
    ...item,
    name: bag?.name ?? item.name,
  };
}

export function pickCrustName(locale, crustId, fallback) {
  return translateFallback(locale, `pizzaTemplate.crust.${crustId}`, fallback);
}

export function pickToppingName(locale, toppingId, fallback) {
  return translateFallback(locale, `pizzaTemplate.topping.${toppingId}`, fallback);
}
