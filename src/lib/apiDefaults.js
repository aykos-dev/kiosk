/**
 * Single source of truth for API defaults shared by the renderer's HTTP
 * clients and the Electron main-process sync client. Plain constants only
 * (no import.meta / no Node APIs) so this module is safe in both processes.
 */

/** Backend base URL used when no override is configured. */
export const DEFAULT_API_BASE_URL = 'https://io.bellissimo.uz/api';

/** Timeout for order POSTs from the sync manager (short — fail fast, retry). */
export const API_ORDER_TIMEOUT_MS = 5000;

/** Timeout for catalog GETs in the renderer (longer — large menu payloads). */
export const API_CATALOG_TIMEOUT_MS = 30_000;
