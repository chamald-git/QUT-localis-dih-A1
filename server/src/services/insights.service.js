import {
  getValidRegions,
  queryInsightData,
  querySpendData,
  INSIGHT_METRICS,
  SPEND_METRIC,
} from '../repositories/insights.repository.js';

/**
 * @what  Orchestration for the AI insights endpoint (DIH-14).
 * @why   Applies request defaults (all regions / [occupancy, adr] / last_90_days),
 *        resolves the period preset to a day count, asks the repository for the
 *        joined rows, and shapes the { appliedFilters, data } context the Gemini
 *        layer consumes. SQL lives in insights.repository.js.
 * @note  Strict input validation, response caching, and server-computed KPIs are
 *        backlog work. Periods mirror the operator dashboard (Last 30/60/90 days).
 */

const DEFAULT_METRICS = ['occupancy', 'adr'];

// Period presets mirror Sarah's operator dashboard: each maps to how many of the
// most-recent dates to include (the repository applies the LIMIT).
const PRESET_DAYS = { last_30_days: 30, last_60_days: 60, last_90_days: 90 };
const DEFAULT_PERIOD = 'last_90_days';

/**
 * Assemble the data context for an insight request.
 *
 * @param {{ regions?: string[], metrics?: string[], period?: string }} params
 * @returns {Promise<{ appliedFilters: { regions: string[], metrics: string[], period: { preset: string, days: number } }, data: object[], spend: object[]|null }>}
 *   `data` is the joined date-grain rows (one wide row per region/date); `spend`
 *   is the region×category spend dataset, or null when spend wasn't requested.
 */
export async function assembleInsightContext({ regions, metrics, period } = {}) {
  const validRegions = await getValidRegions();
  const regionNames = regions && regions.length ? regions : validRegions;

  const requested = (metrics && metrics.length ? metrics : DEFAULT_METRICS).filter((m) =>
    INSIGHT_METRICS.includes(m),
  );
  const metricNames = requested.length ? requested : DEFAULT_METRICS;

  const preset = PRESET_DAYS[period] ? period : DEFAULT_PERIOD;
  const days = PRESET_DAYS[preset];

  // Spend is a pseudo-metric backed by a separate dataset (different grain), so
  // split it out: the date-grain join only ever sees the tourism metrics. The
  // date spine (and from/to below) always comes from the join, even spend-only.
  const includeSpend = metricNames.includes(SPEND_METRIC);
  const tourismMetrics = metricNames.filter((m) => m !== SPEND_METRIC);

  const data = await queryInsightData({ regions: regionNames, metrics: tourismMetrics, days });
  const spend = includeSpend ? await querySpendData({ regions: regionNames, days }) : null;

  // Start/end dates are read off the returned rows (min/max of the YYYY-MM-DD
  // date strings) — no extra query. Null when there is no data.
  let from = null;
  let to = null;
  for (const row of data) {
    if (from === null || row.date < from) from = row.date;
    if (to === null || row.date > to) to = row.date;
  }

  return {
    appliedFilters: { regions: regionNames, metrics: metricNames, period: { preset, days, from, to } },
    data,
    spend,
  };
}
