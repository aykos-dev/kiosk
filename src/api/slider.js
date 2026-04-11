import sliderFallbackRaw from '../../assets/menu-items/slider.json';
import { apiClient } from './client.js';
import { saveCatalogSnapshot, loadCatalogSnapshotJson } from './catalogFallback.js';
import { catalogQueryDefaults, SLIDER_REFETCH_INTERVAL_MS } from './catalogPolicy.js';
import { normalizeSliderPayload } from './normalizeCatalog.js';
import { queryKeys } from './queryKeys.js';
import { queryClient } from './queryClient.js';

/** City UUID for `/slides/city/:id` (override via `VITE_SLIDES_CITY_ID`). */
const SLIDES_CITY_ID =
  import.meta.env.VITE_SLIDES_CITY_ID ?? '41d99206-638b-47b9-8338-95892c28ac41';

const sliderInitial = normalizeSliderPayload(sliderFallbackRaw);

/** BCP 47 tag for `Accept-Language` (matches kiosk `uz` | `ru` | `en`). */
export function localeToAcceptLanguage(locale) {
  if (locale === 'ru' || locale === 'en') return locale;
  return 'uz';
}

async function loadSliderFallbackChain() {
  const cached = queryClient.getQueryData(queryKeys.catalog.slider());
  if (Array.isArray(cached)) return cached;

  const disk = await loadCatalogSnapshotJson('slider');
  if (disk != null) {
    const slides = normalizeSliderPayload(disk);
    return slides;
  }

  return sliderInitial;
}

/**
 * @param {string} [locale]
 * @returns {Promise<unknown[]>}
 */
export async function fetchSlider(locale = 'uz') {
  try {
    const { data: raw } = await apiClient.get(`/slides/city/${SLIDES_CITY_ID}`, {
      params: { source_key: 'mobile' },
      headers: {
        'Accept-Language': localeToAcceptLanguage(locale),
      },
    });
    console.log(raw)
    const slides = normalizeSliderPayload(raw);
    if (!Array.isArray(slides)) throw new Error('Invalid slider payload');
    await saveCatalogSnapshot('slider', slides);
    return slides;
  } catch {
    return loadSliderFallbackChain();
  }
}

export const sliderFallback = sliderInitial;

/**
 * React Query options for slides; key includes locale so refetch uses the right `Accept-Language`.
 * @param {string} locale - `uz` | `ru` | `en`
 */
export function getSliderQueryOptions(locale = 'uz') {
  return {
    ...catalogQueryDefaults,
    queryKey: [...queryKeys.catalog.slider(), locale],
    queryFn: () => fetchSlider(locale),
    initialData: sliderInitial,
    initialDataUpdatedAt: 0,
    refetchInterval: SLIDER_REFETCH_INTERVAL_MS,
  };
}
