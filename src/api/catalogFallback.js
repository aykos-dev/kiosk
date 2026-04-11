/** Persist last successful catalog payloads under userData (Electron) for offline fallback. */

export async function saveCatalogSnapshot(name, data) {
  if (typeof window === 'undefined' || !window.kiosk?.saveCatalogFallback) return;
  try {
    await window.kiosk.saveCatalogFallback(name, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export async function loadCatalogSnapshotJson(name) {
  if (typeof window === 'undefined' || !window.kiosk?.loadCatalogFallback) return null;
  try {
    const raw = await window.kiosk.loadCatalogFallback(name);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
