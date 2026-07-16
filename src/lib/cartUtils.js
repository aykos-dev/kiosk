/**
 * Single pass over the cart: authoritative integer total (so'm has no minor
 * units) plus per-product quantity map. Used by the App shell.
 * @param {Array<{ id: string; qty: number; lineTotal?: number }>} cart
 */
export function deriveCartState(cart) {
  let total = 0;
  let itemCount = 0;
  const qtyById = {};
  for (const l of cart) {
    total += Number(l.lineTotal) || 0;
    itemCount += l.qty;
    qtyById[l.id] = (qtyById[l.id] ?? 0) + l.qty;
  }
  return { total: Math.round(total), itemCount, qtyById };
}
