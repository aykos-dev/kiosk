import staticPizzaTemplate from '../data/pizzaTemplate.json';
import { buildPizzaTemplateFromApiProduct } from './apiPizzaTemplate.js';
import { pizzaCustomizationExtraDelta } from './pizzaPrice.js';

/** Sum of per-slot price deltas vs combo base. */
export function computeComboDelta(combo, selectionsBySlotId) {
  if (!combo?.slots) return 0;
  let delta = 0;
  for (const slot of combo.slots) {
    const optId = selectionsBySlotId[slot.id];
    const opt = slot.options?.find((o) => o.id === optId);
    if (opt) delta += Number(opt.priceDelta) || 0;
  }
  return delta;
}

export function isComboPizzaOption(option, slot) {
  return !!(option?.isPizza || slot?.pizzaSlot);
}

/**
 * Sum of pizza modifier extras (crust/bort/toppings) vs defaults for selected combo slots.
 */
export function computeComboPizzaExtrasSum(combo, selections, pizzaBySlot, locale) {
  if (!combo?.slots || !pizzaBySlot || typeof pizzaBySlot !== 'object') return 0;
  let sum = 0;
  for (const slot of combo.slots) {
    const payload = pizzaBySlot[slot.id];
    if (!payload?.selections) continue;
    const optId = selections[slot.id];
    const opt = slot.options?.find((o) => o.id === optId);
    if (!opt || !isComboPizzaOption(opt, slot)) continue;
    const template = opt.apiProduct
      ? buildPizzaTemplateFromApiProduct(opt.apiProduct, locale)
      : staticPizzaTemplate;
    if (!template?.crusts?.length) continue;
    const base = opt.apiProduct ? Number(opt.apiProduct.price) || 0 : 0;
    sum += pizzaCustomizationExtraDelta(template, base, payload.selections);
  }
  return sum;
}

/**
 * Cheapest option for a slot: minimum priceDelta; ties keep original order (stable sort).
 * Used for initial combo selections and must match sorted replacement lists (price 0 first).
 */
export function pickDefaultOptionId(slot) {
  const opts = slot?.options;
  if (!Array.isArray(opts) || opts.length === 0) return slot?.defaultOptionId;
  const sorted = [...opts].sort((a, b) => {
    const da = Number(a.priceDelta) || 0;
    const db = Number(b.priceDelta) || 0;
    return da - db;
  });
  return sorted[0]?.id ?? slot.defaultOptionId;
}

export function initComboSelections(combo) {
  const out = {};
  if (!combo?.slots) return out;
  for (const slot of combo.slots) {
    out[slot.id] = pickDefaultOptionId(slot);
  }
  return out;
}

export function getOptionForSlot(combo, slotId, optionId) {
  const slot = combo?.slots?.find((s) => s.id === slotId);
  return slot?.options?.find((o) => o.id === optionId);
}
