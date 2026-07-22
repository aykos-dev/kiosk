import { apiClient } from './client.js';

/** Order POST is short — fail fast rather than hang the kiosk on a bad link. */
const TABLE_ORDER_TIMEOUT_MS = 20_000;

/**
 * Create a dine-in / table order.
 *
 * POST /table-orders/add — guest (no Authorization header). Returns the raw
 * `ReturnedType` envelope: `{ success, message, errorType, data, reasonMessage }`.
 *
 * @param {object} payload - CreateTableOrderRequestType (see lib/tableOrder.js)
 * @returns {Promise<object>}
 */
export async function createTableOrder(payload) {
  const { data } = await apiClient.post('/table-orders/add', payload, {
    timeout: TABLE_ORDER_TIMEOUT_MS,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  });
  return data;
}
