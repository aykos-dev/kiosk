import menuFallback from '../../assets/menu-items/menu.json';
import { apiClient } from './client.js';
import { saveCatalogSnapshot, loadCatalogSnapshotJson } from './catalogFallback.js';
import { catalogQueryDefaults } from './catalogPolicy.js';
import { normalizeMenuPayload } from './normalizeCatalog.js';
import { queryKeys } from './queryKeys.js';
import { queryClient } from './queryClient.js';

const menuInitial = normalizeMenuPayload(menuFallback);

async function loadMenuFallbackChain() {
  const cached = queryClient.getQueryData(queryKeys.catalog.menu());
  if (Array.isArray(cached) && cached.length) return cached;

  const disk = await loadCatalogSnapshotJson('menu');
  if (disk != null) {
    const doc = normalizeMenuPayload(disk);
    if (doc.length) return doc;
  }

  return menuInitial;
}

/**
 * @returns {Promise<unknown[]>}
 */
export async function fetchMenu() {
  try {
    const { data: raw } = await apiClient.get('/v3.1/menu');
    const doc = normalizeMenuPayload(raw);
    if (!doc?.length) throw new Error('Invalid menu payload');
    await saveCatalogSnapshot('menu', doc);
    return doc;
  } catch {
    return loadMenuFallbackChain();
  }
}

export { menuFallback };

export const menuQuery = {
  ...catalogQueryDefaults,
  queryKey: queryKeys.catalog.menu(),
  queryFn: fetchMenu,
  initialData: menuInitial,
  initialDataUpdatedAt: 0,
};
