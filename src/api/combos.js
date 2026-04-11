import { apiClient } from './client.js';
import { saveCatalogSnapshot } from './catalogFallback.js';
import { catalogQueryDefaults } from './catalogPolicy.js';
import { normalizeCombosPayload } from './normalizeCatalog.js';
import { queryKeys } from './queryKeys.js';
import { localeToAcceptLanguage } from './slider.js';

/**
 * Mobile combo offers. On any failure or invalid payload returns `[]` (no bundled fallback).
 * @param {string} [locale]
 * @returns {Promise<unknown[]>}
 */
export async function fetchCombosMobile(locale = 'uz') {
  try {
    const { data: raw } = await apiClient.get('/v3/combos/mobile', {
      headers: {
        'Accept-Language': localeToAcceptLanguage(locale),
      },
    });
    const rows = normalizeCombosPayload(raw);
    if (!Array.isArray(rows)) throw new Error('Invalid combos payload');
    if (rows.length) await saveCatalogSnapshot('combos', rows);
    return rows;
  } catch {
    return [];
  }
}

/**
 * @param {string} locale - `uz` | `ru` | `en`
 */
export function getCombosQueryOptions(locale = 'uz') {
  return {
    ...catalogQueryDefaults,
    queryKey: [...queryKeys.catalog.combos(), locale],
    queryFn: () => fetchCombosMobile(locale),
  };
}
