import { comboOptionLabel, pickToppingName } from '../i18n/translate.js';
import { getOptionForSlot } from './comboPrice.js';

/**
 * Receipt sub-lines for the extra toppings picked on a pizza ("+ Cheese x2").
 * @param {{ toppings?: Array<{ id: string, name?: string }> }} template
 * @param {{ toppings?: Record<string, number> }} sel
 * @param {string} locale
 * @returns {string[]}
 */
export function pizzaToppingDetails(template, sel, locale) {
  const out = [];
  for (const top of template?.toppings ?? []) {
    const n = Number(sel?.toppings?.[top.id]) || 0;
    if (n <= 0) continue;
    const name = pickToppingName(locale, top.id, top.name);
    out.push(n > 1 ? `+ ${name} x${n}` : `+ ${name}`);
  }
  return out;
}

/**
 * Receipt sub-lines for a pizza line: size / crust / bort, then toppings.
 * @param {string} detailLine - output of formatPizzaDetailLine
 * @param {string[]} [toppingLines]
 */
export function pizzaReceiptDetails(detailLine, toppingLines = []) {
  return [detailLine, ...toppingLines].filter(Boolean);
}

/**
 * Receipt sub-lines for a combo: one "- <option>" per slot, followed by the
 * pizza configuration when the slot holds a customised pizza.
 * @param {object} combo - product.combo (slots + options)
 * @param {Record<string, string>} selections - slotId -> optionId
 * @param {Record<string, { detailLine?: string, toppingLines?: string[] }>} comboPizzaBySlot
 * @param {string} locale
 * @returns {string[]}
 */
export function comboReceiptDetails(combo, selections, comboPizzaBySlot, locale) {
  const out = [];
  for (const slot of combo?.slots ?? []) {
    const opt = getOptionForSlot(combo, slot.id, selections?.[slot.id]);
    if (!opt) continue;
    out.push(`- ${comboOptionLabel(locale, opt.id, opt.name ?? '')}`);
    const pizza = comboPizzaBySlot?.[slot.id];
    for (const d of pizzaReceiptDetails(pizza?.detailLine, pizza?.toppingLines)) {
      out.push(`  ${d}`);
    }
  }
  return out;
}

/**
 * Map cart lines to the item shape the receipt printer expects.
 * @param {Array<object>} cart
 */
export function cartToReceiptItems(cart) {
  return (Array.isArray(cart) ? cart : []).map((i) => ({
    name: i.name,
    qty: i.qty || 1,
    price: i.price,
    lineTotal: i.lineTotal ?? (i.price || 0) * (i.qty || 1),
    details: Array.isArray(i.receiptDetails) ? i.receiptDetails : [],
  }));
}
