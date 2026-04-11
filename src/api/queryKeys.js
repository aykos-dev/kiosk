/** Centralized query keys for cache reads and invalidation. */

export const queryKeys = {
  combo: {
    /** @param {string} id @param {string} locale */
    detail: (id, locale) => ['combo', 'detail', id, locale],
  },
  catalog: {
    root: ['catalog'],
    menu: () => ['catalog', 'menu'],
    slider: () => ['catalog', 'slider'],
    promo: () => ['catalog', 'promo'],
    combos: () => ['catalog', 'combos'],
    /** @param {string} cityId */
    organizations: (cityId) => ['catalog', 'organizations', cityId],
  },
};
