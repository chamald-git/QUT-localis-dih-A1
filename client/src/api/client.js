import { buildInsightsQuery } from '../lib/buildInsightsQuery.js';
import { getAuthToken, clearAuthToken } from '../context/tokenStore.js';

/**
 * Thin fetch wrapper. In development, calls go to relative /api paths and Vite
 * proxies them to the Express server. In production, VITE_API_URL points at the
 * Railway API origin. Centralising this means components never construct URLs
 * or parse the error envelope themselves.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * @what  Internal fetch wrapper used by every method on the exported api
 *        object. Centralises base URL handling, JSON parsing, Bearer
 *        token attachment, and error-envelope unwrapping.
 * @why   Sarah's operator dashboard and Ben's government dashboard call
 *        api.getOperatorSummary, api.getOccupancySummary, and so on.
 *        Reading the token here means every existing call site becomes
 *        authenticated without any further changes to dashboard code.
 *        Server-side, the authenticate middleware sets req.user from
 *        the JWT; this client simply ensures the token reaches the
 *        server on every request.
 * @alternative-considered Modifying every dashboard component to use
 *        authFetch from useAuth() was rejected because it would require
 *        editing every component owned by Sarah and Ben, increasing the
 *        regression surface before the upcoming team meeting.
 * @module-source IFQ716 Week 9, fetch-interceptor pattern for centralised
 *        request decoration.
 * @param {string} path  API path beginning with /api
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>} the parsed JSON body
 * @throws {Error} with a message taken from the API error envelope when present
 */
async function request(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
  }

  // Health and most endpoints return JSON; guard against empty bodies.
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const errorMessage =
      body?.error?.message ?? `Request failed with status ${response.status}`;

    const errorDetails = body?.error?.details;

    const detailsText =
      typeof errorDetails === 'string'
        ? errorDetails
        : errorDetails
          ? JSON.stringify(errorDetails)
          : '';

    const message = detailsText
      ? `${errorMessage}: ${detailsText}`
      : errorMessage;

    throw new Error(message);
  }

  return body;
}

export const api = {
  getHealth() {
    return request('/api/health');
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

  getOperatorSummary(region, days = 90) {
    return request(
      `/api/operator-summary?region=${encodeURIComponent(region)}&days=${days}`,
    );
  },

  /**
   * @what  Fetch the AI-generated insights story for the current user.
   * @why   With DIH-47 applying authenticate middleware to /api/insights,
   *        the server now reads role from req.user.role (populated by
   *        authenticate from the verified JWT). The x-user-role header
   *        is no longer sent because the server no longer trusts it as
   *        an authorisation signal.
   * @alternative-considered Keeping the x-user-role header as a
   *        compatibility fallback was rejected because it would defeat
   *        the purpose of the JWT chain: a client could spoof any role
   *        by editing the header. Removing it forces all role decisions
   *        through the signed token.
   * @module-source IFQ716 Week 9, JWT-derived authorisation pattern.
   * @param {{ regions?: string[], metrics?: string[], period?: string }} [options]
   * @returns {Promise<unknown>}
   */
  getInsights({ regions = [], metrics = [], period } = {}) {
    return request(
      `/api/insights${buildInsightsQuery({ regions, metrics, period })}`
    );
  },
};