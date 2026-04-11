import promoFallbackRaw from '../../assets/menu-items/promo.json';
import { apiClient } from './client.js';
import { saveCatalogSnapshot, loadCatalogSnapshotJson } from './catalogFallback.js';
import { catalogQueryDefaults } from './catalogPolicy.js';
import { normalizePromoPayload } from './normalizeCatalog.js';
import { queryKeys } from './queryKeys.js';
import { queryClient } from './queryClient.js';

const promoInitial = normalizePromoPayload(promoFallbackRaw);

/** Normalized promo rows (same shape as API). */
export const promoFallback = promoInitial;

async function loadPromoFallbackChain() {
  const cached = queryClient.getQueryData(queryKeys.catalog.promo());
  if (Array.isArray(cached)) return cached;

  const disk = await loadCatalogSnapshotJson('promo');
  if (disk != null) {
    const rows = normalizePromoPayload(disk);
    return rows;
  }

  return promoInitial;
}

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchPromo() {
  try {
    const { data: raw } = await apiClient.get('/v3.1/promo');
    const rows = normalizePromoPayload(raw);
    if (!Array.isArray(rows)) throw new Error('Invalid promo payload');
    await saveCatalogSnapshot('promo', rows);
    return rows;
  } catch {
    return loadPromoFallbackChain();
  }
}

export const promoQuery = {
  ...catalogQueryDefaults,
  queryKey: queryKeys.catalog.promo(),
  queryFn: fetchPromo,
  initialData: promoInitial,
  initialDataUpdatedAt: 0,
};
