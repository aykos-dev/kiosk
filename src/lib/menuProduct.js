import { translationDesc, translationTitle } from './tEntity.js';

/**
 * Card row from `GET /v3/combos/mobile` (see `assets/menu-items/combo.json`).
 * @param {string} locale
 */
export function normalizeMobileComboOffer(row, locale) {
  if (!row || typeof row !== 'object') return null;
  const name = translationTitle(row, locale) || row.name || '';
  const description = translationDesc(row, locale);
  const image = resolveProductImage(row);
  const price = row.priceModification ?? row.price ?? 0;
  const oldPrice = row.originalPrice ?? null;
  const id = row.sourceActionId;
  if (id == null || id === '') return null;
  return {
    ...row,
    id,
    name,
    description,
    image,
    price,
    oldPrice,
    discountPercent: row.discountPercent,
    kind: 'mobileCombo',
  };
}

/** First usable image URL from API product or modifiers. */
export function resolveProductImage(product) {
  if (!product || typeof product !== 'object') return '/menu-items/placeholder.svg';
  if (product.image) return product.image;
  if (product.imagePng) return product.imagePng;
  if (product.image2) return product.image2;
  return '/menu-items/placeholder.svg';
}

/** Backend pizza: Dish with dough/crust modifier groups. */
export function isPizzaProduct(p) {
  if (!p) return false;
  if (p.menuType === 'pizza') return true;
  if (p.type === 'Dish' && p.crusts?.products?.length) return true;
  return false;
}

export function isComboProduct(p) {
  return !!(p?.kind === 'combo' || p?.combo);
}

/** Top-level menu category that lists pizza line groups (not individual dishes). */
export function isPizzaCategory(cat) {
  return cat?.menuType === 'pizza';
}

/**
 * Pizza line group that lists combo-sized offers (hidden when `/v3/combos/mobile` has no data).
 */
export function isComboGroup(group) {
  if (!group || typeof group !== 'object') return false;
  if (group.menuType === 'combo') return true;
  const ru = group.translations?.title?.ru;
  const uz = group.translations?.title?.uz;
  if (ru === 'Комбо' || uz === 'Kombo') return true;
  return group.name === 'Комбо';
}

/**
 * Pick the dish to open when a pizza group card is tapped (no drill-down screen).
 * Prefer `defaultProductId` vs `id` / `productId`; else first product in the group.
 */
export function resolveGroupToPizzaDish(group) {
  const products = group?.products;
  if (!Array.isArray(products) || products.length === 0) return null;
  const defId = group.defaultProductId;
  if (defId) {
    const found = products.find((p) => p.id === defId || p.productId === defId);
    if (found) return found;
  }
  return products[0];
}

/**
 * Group row for pizza category grid (`kind: 'group'`).
 */
export function normalizeGroupForMenuCard(group, locale) {
  const name = translationTitle(group, locale) || group.name || '';
  const image = resolveProductImage(group);
  const price = group.price ?? 0;
  return {
    ...group,
    kind: 'group',
    name,
    image,
    price,
  };
}

/**
 * Grid card: keep API row, add display helpers (does not mutate if already normalized).
 */
export function normalizeProductForMenuCard(product, locale) {
  const name = translationTitle(product, locale) || product.name || '';
  const description = translationDesc(product, locale);
  const image = resolveProductImage(product);
  let kind = 'simple';
  if (isComboProduct(product)) kind = 'combo';
  else if (isPizzaProduct(product)) kind = 'pizza';

  return {
    ...product,
    name,
    description,
    image,
    kind,
  };
}
