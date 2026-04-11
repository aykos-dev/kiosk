import { translationTitle } from './tEntity.js';

/**
 * Map API modifier group products to pizza template options (price delta vs cheapest in group).
 */
function mapGroupProducts(group, locale) {
  const products = group?.products;
  if (!Array.isArray(products) || products.length === 0) return [];
  const minPrice = Math.min(...products.map((p) => Number(p.price) || 0));
  return products.map((p) => ({
    id: p.id,
    name: translationTitle(p, locale) || p.name || '',
    image: p.image || p.imagePng || p.image2 || '/menu-items/placeholder.svg',
    priceDelta: (Number(p.price) || 0) - minPrice,
  }));
}

/**
 * Visible size label for the segmented control (e.g. "20 sm", "25 sm").
 */
export function formatPizzaSizeLabel(dish, locale) {
  const title = translationTitle(dish, locale) || dish.name || '';
  const m = title.match(/(\d+)\s*(?:cm|см|sm)/i);
  if (m) return `${m[1]} sm`;
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : '';
}

function buildModifierLayersFromDish(dish, locale) {
  const crusts = mapGroupProducts(dish.crusts, locale);
  const borts = mapGroupProducts(dish.borts, locale);
  const toppingRows = dish.toppings?.products;
  const toppings = Array.isArray(toppingRows)
    ? toppingRows.map((p) => ({
        id: p.id,
        name: translationTitle(p, locale) || p.name || '',
        image: p.image || p.imagePng || p.image2 || '/menu-items/placeholder.svg',
        priceDelta: Number(p.price) || 0,
      }))
    : [];

  const maxToppings = Number(dish.toppings?.maxAmount);
  const maxT = Number.isFinite(maxToppings) && maxToppings > 0 ? maxToppings : 16;

  const defaultCrustId = dish.crusts?.defaultProductId ?? crusts[0]?.id;
  const defaultBortId = dish.borts?.defaultProductId ?? borts[0]?.id;

  return {
    crusts,
    borts,
    toppings,
    maxToppings: maxT,
    defaultCrustId,
    defaultBortId,
  };
}

/**
 * @param {object} template - from buildPizzaTemplateFromApiProduct
 * @param {string} sizeId
 * @param {string} locale
 */
export function mergeApiTemplateForSize(template, sizeId, locale) {
  if (template._source !== 'api' || !template.sizeDishes || !sizeId) return template;
  const dish = template.sizeDishes[sizeId];
  if (!dish) return template;
  const layers = buildModifierLayersFromDish(dish, locale);
  return {
    ...template,
    ...layers,
    /** Must match selected tab so initPizzaSelections does not revert to the first size. */
    defaultSizeId: sizeId,
  };
}

/**
 * Build PizzaDetailsModal template from `/v3.1/menu` Dish row (nested crusts / borts / toppings).
 * When `dish._pizzaLineGroup` lists multiple dishes (one per diameter), size tabs map to each dish.
 */
export function buildPizzaTemplateFromApiProduct(dish, locale) {
  const lineGroup = dish._pizzaLineGroup;
  const products = lineGroup?.products;
  const multi = Array.isArray(products) && products.length > 1;

  let sizes;
  /** @type {Record<string, object>} */
  let sizeDishes;
  let defaultSizeId = dish.id;

  if (multi) {
    const sorted = [...products].sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      if (pa !== pb) return pa - pb;
      return String(a.id).localeCompare(String(b.id));
    });
    const minPrice = Math.min(...sorted.map((p) => Number(p.price) || 0));
    sizes = sorted.map((p) => ({
      id: p.id,
      label: formatPizzaSizeLabel(p, locale),
      priceDelta: (Number(p.price) || 0) - minPrice,
    }));
    sizeDishes = Object.fromEntries(sorted.map((p) => [p.id, p]));
    if (!sizeDishes[defaultSizeId]) {
      defaultSizeId = sorted[0]?.id ?? dish.id;
    }
  } else {
    sizes = [{ id: dish.id, label: '', priceDelta: 0 }];
    sizeDishes = { [dish.id]: dish };
  }

  const baseDish = sizeDishes[defaultSizeId] ?? dish;
  const layers = buildModifierLayersFromDish(baseDish, locale);

  return {
    ...layers,
    sizes,
    sizeDishes,
    defaultSizeId,
    _source: 'api',
  };
}
