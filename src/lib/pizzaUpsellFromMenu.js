import { resolveProductImage } from './menuProduct.js';
import { translationTitle } from './tEntity.js';

function normalizeIconKey(icon) {
  if (icon == null || typeof icon !== 'string') return '';
  return icon.trim().toLowerCase();
}

function flattenCategoryProducts(cat) {
  const direct = [...(cat.products ?? [])];
  const fromGroups = (cat.groups ?? []).flatMap((g) => [...(g.products ?? [])]);
  return [...direct, ...fromGroups];
}

function dedupeById(rows) {
  const seen = new Set();
  return rows.filter((x) => {
    if (!x?.id || seen.has(x.id)) return false;
    seen.add(x.id);
    return true;
  });
}

/**
 * Map menu categories to pizza upsell rows. Sauces vs drinks are distinguished only by
 * category `icon` (API uses e.g. "Sauce" and "Drinks").
 * @param {unknown[]} categories
 * @param {string} locale
 */
export function buildPizzaUpsellFromCategories(categories, locale) {
  const sauces = [];
  const drinks = [];
  for (const cat of categories ?? []) {
    const key = normalizeIconKey(cat.icon);
    const rows = flattenCategoryProducts(cat).map((p) => ({
      id: p.id,
      name: translationTitle(p, locale) || p.name || '',
      price: Number(p.price) || 0,
      image: resolveProductImage(p),
    }));
    if (key === 'sauce') sauces.push(...rows);
    else if (key === 'drinks') drinks.push(...rows);
  }
  return {
    sauces: dedupeById(sauces),
    drinks: dedupeById(drinks),
  };
}
