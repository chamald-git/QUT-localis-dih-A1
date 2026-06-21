import { buildInsightsQuery } from '../lib/buildInsightsQuery.js';

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

  /**
   * AI insights story. Role is sent via the x-user-role header (the dev mock
   * standing in for JWT); regions/metrics/period go as query params.
   */
  getInsights({ regions = [], metrics = [], period, role = 'government' } = {}) {
    return request(
      `/api/insights${buildInsightsQuery({ regions, metrics, period })}`,
      { headers: { 'x-user-role': role } }
    );
  },
};
