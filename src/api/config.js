import { DEFAULT_API_BASE_URL } from '../lib/apiDefaults.js';

export function getDefaultApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}
