/**
 * Build the query string for GET /api/insights from the commission selection.
 * regions/metrics go as CSV (the route parses them with csvToArray); blank
 * values are omitted so the server applies its own defaults.
 *
 * @param {{ regions?: string[], metrics?: string[], period?: string }} [selection]
 * @returns {string} e.g. "?regions=Cairns,Noosa&metrics=occupancy,adr&period=last_90_days" or ""
 */
export function buildInsightsQuery({ regions = [], metrics = [], period } = {}) {
  const params = new URLSearchParams();
  if (regions.length) params.set('regions', regions.join(','));
  if (metrics.length) params.set('metrics', metrics.join(','));
  if (period) params.set('period', period);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
