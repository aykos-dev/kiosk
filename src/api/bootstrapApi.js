import { apiClient } from './client.js';
import { getDefaultApiBaseUrl } from './config.js';

/**
 * Prefer `config.json` api.baseUrl from the main process so menu and order sync hit the same host.
 */
export async function bootstrapApiBase() {
  if (typeof window === 'undefined') return;
  const kiosk = window.kiosk;
  if (!kiosk?.getConfig) return;
  try {
    const cfg = await kiosk.getConfig();
    const url = cfg?.api?.baseUrl;
    if (url && typeof url === 'string') {
      apiClient.defaults.baseURL = url.replace(/\/$/, '');
      return;
    }
  } catch {
    // keep Vite default
  }
  apiClient.defaults.baseURL = getDefaultApiBaseUrl().replace(/\/$/, '');
}
