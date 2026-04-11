/** Normalize backend payloads and bundled JSON into stable shapes for the UI. */

export function normalizeMenuPayload(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

/**
 * Slider may be `{ data: [...], success }` or a bare array (legacy).
 * Items use `picture_url`, `alternative_text`, etc.
 */
export function normalizeSliderPayload(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

/** Same envelope as slider (`{ data: [] }` or bare array). */
export function normalizePromoPayload(raw) {
  return normalizeSliderPayload(raw);
}

/** `/v3/combos/mobile` — bare array or `{ data: [] }`. */
export function normalizeCombosPayload(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}
