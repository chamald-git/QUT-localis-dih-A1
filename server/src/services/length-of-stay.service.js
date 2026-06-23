import {
  getLengthOfStayByRegion,
  getLengthOfStaySummary,
} from '../repositories/length-of-stay.repository.js';

// Period presets mirror the insights endpoint + Sarah's operator dashboard (Last 30/60/90 days).
const PRESET_DAYS = { last_30_days: 30, last_60_days: 60, last_90_days: 90 };
const DEFAULT_PERIOD = 'last_90_days';

// Defensive: the route's zod schema already constrains period to a known preset.
function resolveDays(period) {
  return PRESET_DAYS[period] ?? PRESET_DAYS[DEFAULT_PERIOD];
}

/**
 * @what Fetches length-of-stay time-series rows for a region over a period preset.
 * @why Service layer is transport-agnostic — the same function backs the REST route and any Agno agent tool.
 * @module-source DIH-41 GET /api/length-of-stay
 */
export async function listLengthOfStay(region, period) {
  return getLengthOfStayByRegion(region, resolveDays(period));
}

/**
 * @what Fetches the length-of-stay summary card (period average + delta) for a region.
 * @why Pre-computes the KPI value + delta on the server so React just renders (DIH-7, consumed by DIH-63).
 * @module-source DIH-41 GET /api/length-of-stay/summary
 */
export async function getLengthOfStayCard(region, period) {
  return getLengthOfStaySummary(region, resolveDays(period));
}
