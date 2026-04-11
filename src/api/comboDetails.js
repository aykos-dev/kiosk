import { apiClient } from './client.js';
import { localeToAcceptLanguage } from './slider.js';

export function unwrapComboDetailsPayload(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw.data != null && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    return raw.data;
  }
  return raw;
}

/**
 * @param {string} sourceActionId
 * @param {string} [locale]
 */
export async function fetchComboDetails(sourceActionId, locale = 'uz') {
  const { data } = await apiClient.get(`/v2/combos/${sourceActionId}`, {
    headers: {
      'Accept-Language': localeToAcceptLanguage(locale),
    },
  });
  return unwrapComboDetailsPayload(data);
}
