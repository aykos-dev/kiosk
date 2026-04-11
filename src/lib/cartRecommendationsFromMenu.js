import { COMBO_CATALOG_CATEGORY_ID } from './comboCatalogConstants.js';
import {
  isComboProduct,
  isPizzaCategory,
  isPizzaProduct,
  normalizeProductForMenuCard,
} from './menuProduct.js';

/** Max cards in the cart upsell grid (menu order, first wins). */
const MAX_CART_RECOMMENDATIONS = 32;

function flattenCategoryProducts(cat) {
  if (!cat) return [];
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
 * Snacks, drinks, sauces, etc. — excludes pizza category, mobile combo catalog, pizza dishes, and combo rows.
 * @param {unknown[]} categories
 * @param {string} locale
 */
export function buildCartRecommendationsFromCategories(categories, locale) {
  const rows = [];
  for (const cat of categories ?? []) {
    if (!cat || typeof cat !== 'object') continue;
    if (cat.id === COMBO_CATALOG_CATEGORY_ID || cat.menuType === 'comboCatalog') continue;
    if (isPizzaCategory(cat)) continue;

    for (const p of flattenCategoryProducts(cat)) {
      if (isPizzaProduct(p) || isComboProduct(p)) continue;
      const card = normalizeProductForMenuCard(p, locale);
      if (card.kind !== 'simple') continue;
      rows.push({
        id: card.id,
        name: card.name,
        price: Number(card.price) || 0,
        image: card.image,
        badge: typeof p.badge === 'string' ? p.badge : undefined,
      });
    }
  }

  return dedupeById(rows).slice(0, MAX_CART_RECOMMENDATIONS);
}
