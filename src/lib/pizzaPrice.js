/** @typedef {{ id: string, label: string, priceDelta: number }} PizzaSize */
/** @typedef {{ id: string, name: string, image: string, priceDelta: number }} PizzaCrust */
/** @typedef {{ id: string, name: string, image: string, priceDelta: number }} PizzaTopping */

/**
 * @param {object} template - pizzaTemplate.json or API-built template
 * @param {number} basePrice - menu price at reference size (30 sm)
 * @param {{ sizeId: string, crustId: string, bortId?: string, toppings: Record<string, number> }} sel
 */
export function computePizzaUnitPrice(template, basePrice, sel) {
  const size = template.sizes?.find((s) => s.id === sel.sizeId);
  const crust = template.crusts?.find((c) => c.id === sel.crustId);
  const bort = template.borts?.find((b) => b.id === sel.bortId);
  let total =
    Number(basePrice) +
    (size?.priceDelta ?? 0) +
    (crust?.priceDelta ?? 0) +
    (bort?.priceDelta ?? 0);
  for (const t of template.toppings ?? []) {
    const n = sel.toppings?.[t.id] ?? 0;
    if (n > 0) total += n * (t.priceDelta ?? 0);
  }
  return Math.max(0, Math.round(total));
}

/**
 * Extra cost vs default crust/bort/toppings (e.g. combo slot pizza add-ons).
 */
export function pizzaCustomizationExtraDelta(template, basePrice, sel) {
  const defaults = initPizzaSelections(template);
  return (
    computePizzaUnitPrice(template, basePrice, sel) -
    computePizzaUnitPrice(template, basePrice, defaults)
  );
}

export function countToppingUnits(toppings) {
  if (!toppings) return 0;
  return Object.values(toppings).reduce((s, n) => s + (Number(n) || 0), 0);
}

/**
 * @param {object} template
 * @param {{ sizeId: string, crustId: string, toppings: Record<string, number> }} sel
 * @param {string} locale - 'uz' | 'ru' stub
 */
/**
 * @param {object} [overrides] - optional resolved labels (e.g. localized crust name)
 */
export function formatPizzaDetailLine(template, sel, locale = 'uz', overrides = {}) {
  const size = template.sizes?.find((s) => s.id === sel.sizeId);
  const crust = template.crusts?.find((c) => c.id === sel.crustId);
  const bort = template.borts?.find((b) => b.id === sel.bortId);
  const sizeLabel = overrides.sizeLabel ?? size?.label ?? '';
  const crustName = overrides.crustName ?? crust?.name ?? '';
  const bortName = overrides.bortName ?? bort?.name ?? '';

  if (template._source === 'api') {
    const parts = [sizeLabel, crustName, bortName].filter(Boolean);
    return parts.join(locale === 'ru' ? ', ' : ', ');
  }

  if (locale === 'ru') {
    return `Средняя, ${crustName.toLowerCase()}, ${sizeLabel}`;
  }
  if (locale === 'en') {
    return `${sizeLabel}, ${crustName}`;
  }
  return `${sizeLabel}, ${crustName}`;
}

export function initPizzaSelections(template) {
  const toppings = {};
  for (const t of template.toppings ?? []) {
    toppings[t.id] = 0;
  }
  return {
    sizeId: template.defaultSizeId ?? template.sizes?.[0]?.id ?? '30',
    crustId: template.defaultCrustId ?? template.crusts?.[0]?.id ?? 'thin',
    bortId: template.defaultBortId ?? template.borts?.[0]?.id,
    toppings,
  };
}
