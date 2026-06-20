/**
 * Thin fetch wrapper. In development, calls go to relative /api paths and Vite
 * proxies them to the Express server. In production, VITE_API_URL points at the
 * Railway API origin. Centralising this means components never construct URLs
 * or parse the error envelope themselves.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * @param {string} path  API path beginning with /api
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>} the parsed JSON body
 * @throws {Error} with a message taken from the API error envelope when present
 */
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  // Health and most endpoints return JSON; guard against empty bodies.
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      body?.error?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export const api = {
  getHealth() {
    return request('/api/health');
  },

  /**
   * GET /api/insights?persona=… → { persona, narrative, chartSpec, data }
   * Unwraps the { data } success envelope.
   */
  getInsight(persona) {
    return request(`/api/insights?persona=${encodeURIComponent(persona)}`).then(
      (body) => body.data
    );
  },

  getOccupancySummary(region) {
    return request(
      `/api/occupancy/summary?region=${encodeURIComponent(region)}`
    );
  },

  getOccupancyRows(region, limit = 5) {
    return request(
      `/api/occupancy?region=${encodeURIComponent(region)}&limit=${limit}`
    );
  },
};
