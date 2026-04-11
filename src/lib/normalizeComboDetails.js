import { translationDesc, translationTitle } from './tEntity.js';
import { resolveProductImage } from './menuProduct.js';

/**
 * Map combo-details `items[]` (each with `products[]`) to ComboDetailsModal `slots`.
 * @param {unknown[]} items
 * @param {string} locale
 */
export function buildComboSlotsFromItems(items, locale) {
  if (!Array.isArray(items)) return [];
  const out = [];
  for (const item of items) {
    const products = item?.products;
    if (!Array.isArray(products) || products.length === 0) continue;
    const prices = products.map((p) => Number(p?.price) || 0);
    const minP = Math.min(...prices);
    const options = products
      .map((p) => {
        const isPizza = !!(p.crusts?.products?.length);
        return {
          id: p.id,
          name: translationTitle(p, locale) || p.name || '',
          image: resolveProductImage(p),
          priceDelta: Math.max(0, (Number(p.price) || 0) - minP),
          isPizza,
          apiProduct: isPizza ? p : undefined,
        };
      })
      .sort((a, b) => {
        const da = Number(a.priceDelta) || 0;
        const db = Number(b.priceDelta) || 0;
        return da - db;
      });
    const defaultOptionId = options[0]?.id;
    if (defaultOptionId == null) continue;
    out.push({
      id: item.id,
      defaultOptionId,
      options,
    });
  }
  return out;
}

/**
 * Normalizes `assets/menu-items/combo-details.json` shape for ComboDetailsModal + cart.
 * @param {object} raw
 * @param {string} locale
 */
export function normalizeComboDetailsToProduct(raw, locale) {
  if (!raw || typeof raw !== 'object') return null;
  const slots = buildComboSlotsFromItems(raw.items, locale);
  if (!slots.length) return null;

  const heroImage = (() => {
    const r = resolveProductImage(raw);
    if (r && r !== '/menu-items/placeholder.svg') return r;
    const first = slots[0]?.options?.[0]?.image;
    return first || '/menu-items/placeholder.svg';
  })();

  const description = translationDesc(raw, locale) || '';

  return {
    id: raw.sourceActionId,
    sourceActionId: raw.sourceActionId,
    name: translationTitle(raw, locale) || raw.name || '',
    translations: raw.translations,
    price: raw.priceModification ?? 0,
    oldPrice: raw.originalPrice ?? null,
    discountPercent: raw.discountPercent,
    image: heroImage,
    kind: 'combo',
    combo: {
      heroImage,
      description,
      slots,
    },
  };
}
