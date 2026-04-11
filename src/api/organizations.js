import organizationsFallback from '../../assets/menu-items/organizations.json';
import { apiClient } from './client.js';
import { saveCatalogSnapshot, loadCatalogSnapshotJson } from './catalogFallback.js';
import { catalogQueryDefaults } from './catalogPolicy.js';
import { queryKeys } from './queryKeys.js';
import { queryClient } from './queryClient.js';
import { DEFAULT_KIOSK_CITY_ID } from '../lib/organizationConstants.js';

const initialOrgs = Array.isArray(organizationsFallback) ? organizationsFallback : [];

async function loadOrganizationsFallbackChain(cityId) {
  const key = cityId || DEFAULT_KIOSK_CITY_ID;
  const cached = queryClient.getQueryData(queryKeys.catalog.organizations(key));
  if (Array.isArray(cached) && cached.length) return cached;

  const disk = await loadCatalogSnapshotJson('organizations');
  if (disk != null && Array.isArray(disk) && disk.length) return disk;

  return initialOrgs;
}

/**
 * @param {string} cityId
 * @returns {Promise<unknown[]>}
 */
export async function fetchOrganizations(cityId) {
  const { data } = await apiClient.get(`/v1.1/cities/${cityId}/organizations`);
  return Array.isArray(data) ? data : [];
}

export async function fetchOrganizationsWithFallback(cityId) {
  const id = cityId || DEFAULT_KIOSK_CITY_ID;
  try {
    const doc = await fetchOrganizations(id);
    if (doc?.length) {
      await saveCatalogSnapshot('organizations', doc);
      return doc;
    }
  } catch {
    // offline / error → fallback
  }
  return loadOrganizationsFallbackChain(id);
}

export { organizationsFallback };

/**
 * @param {string} [cityId]
 */
export function getOrganizationsQueryOptions(cityId) {
  const id = cityId || DEFAULT_KIOSK_CITY_ID;
  return {
    ...catalogQueryDefaults,
    queryKey: queryKeys.catalog.organizations(id),
    queryFn: () => fetchOrganizationsWithFallback(id),
    initialData: initialOrgs,
    initialDataUpdatedAt: 0,
  };
}
