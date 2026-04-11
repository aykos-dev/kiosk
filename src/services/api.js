import axios from 'axios';

/**
 * @param {{ baseUrl: string; timeout: number; retryAttempts: number }} config
 */
export function createApiClient(config) {
  const client = axios.create({
    baseURL: config.baseUrl.replace(/\/$/, ''),
    timeout: config.timeout,
    headers: { 'Content-Type': 'application/json' },
  });

  /**
   * Push order to backend. Server should treat duplicate id as idempotent success.
   * @param {object} payload
   */
  async function postOrder(payload) {
    const attempts = Math.max(1, config.retryAttempts || 3);
    let lastErr;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await client.post('/orders', payload, {
          validateStatus: (s) => s >= 200 && s < 300,
        });
        return { ok: true, status: res.status, data: res.data };
      } catch (e) {
        lastErr = e;
        const delay = 500 * 2 ** i;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    return { ok: false, error: lastErr?.message || 'request failed' };
  }

  async function healthCheck() {
    try {
      await client.get('/health', { timeout: 2000, validateStatus: () => true });
      return true;
    } catch {
      return false;
    }
  }

  return { postOrder, healthCheck };
}
