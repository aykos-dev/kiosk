/** @param {Array<{ lineTotal?: number; qty?: number }>} cart */
export function cartTotals(cart) {
  const total = cart.reduce((s, l) => s + l.lineTotal, 0);
  const itemCount = cart.reduce((s, l) => s + l.qty, 0);
  return { total, itemCount };
}

/** @param {Array<{ id: string; qty: number; lineTotal?: number }>} cart */
export function qtyByProductId(cart) {
  const m = {};
  for (const l of cart) {
    m[l.id] = (m[l.id] ?? 0) + l.qty;
  }
  return m;
}

/** One pass: totals + per-product qty (used by App shell). */
export function deriveCartState(cart) {
  let total = 0;
  let itemCount = 0;
  const qtyById = {};
  for (const l of cart) {
    total += l.lineTotal;
    itemCount += l.qty;
    qtyById[l.id] = (qtyById[l.id] ?? 0) + l.qty;
  }
  return { total, itemCount, qtyById };
}
