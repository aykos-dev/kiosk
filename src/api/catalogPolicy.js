export const CATALOG_STALE_MS = 5 * 60 * 1000;
export const CATALOG_GC_MS = 7 * 24 * 60 * 60 * 1000;
export const CATALOG_REFETCH_INTERVAL_MS = 5 * 60 * 1000;
export const SLIDER_REFETCH_INTERVAL_MS = 3 * 60 * 1000;

export function shouldPersistCatalogQuery(query) {
  return query.queryKey[0] === 'catalog';
}

export const catalogQueryDefaults = {
  staleTime: CATALOG_STALE_MS,
  gcTime: CATALOG_GC_MS,
  refetchInterval: CATALOG_REFETCH_INTERVAL_MS,
  refetchOnReconnect: true,
  refetchOnWindowFocus: false,
  networkMode: 'offlineFirst',
};
