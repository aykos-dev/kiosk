/**
 * Utilities: font-{product|inter}-{100|200|…|900}
 * Example: font-product-700 → font-family Product + font-weight 700
 * Legacy aliases: font-product-regular (400), font-product-medium (500), font-product-bold (700), etc.
 */
module.exports = function fontCombosPlugin({ addUtilities }) {
  const families = {
    product: ['"Product"', 'system-ui', 'sans-serif'],
    inter: ['"Inter"', 'system-ui', 'sans-serif'],
  };

  const utilities = {};

  /** Product: 100–900 (all files present under assets/fonts/product/) */
  const productWeights = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  for (const w of productWeights) {
    utilities[`.font-product-${w}`] = {
      fontFamily: families.product.join(', '),
      fontWeight: String(w),
    };
  }

  /** Inter: 200–900 (matches bundled Inter*.ttf files) */
  const interWeights = [200, 300, 400, 500, 600, 700, 800, 900];
  for (const w of interWeights) {
    utilities[`.font-inter-${w}`] = {
      fontFamily: families.inter.join(', '),
      fontWeight: String(w),
    };
  }

  /** Backwards-compatible names */
  const legacy = [
    ['product', 'regular', '400'],
    ['product', 'medium', '500'],
    ['product', 'bold', '700'],
    ['inter', 'regular', '400'],
    ['inter', 'semibold', '600'],
    ['inter', 'bold', '700'],
  ];
  for (const [key, name, weight] of legacy) {
    utilities[`.font-${key}-${name}`] = {
      fontFamily: families[key].join(', '),
      fontWeight: weight,
    };
  }

  addUtilities(utilities);
};
