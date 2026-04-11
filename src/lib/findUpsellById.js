import pizzaUpsellFallback from '../data/pizzaUpsell.json';

export function findUpsellById(id, upsellData = pizzaUpsellFallback) {
  const s = upsellData.sauces?.find((x) => x.id === id);
  if (s) return s;
  return upsellData.drinks?.find((x) => x.id === id);
}
