import { METRIC_SPECS } from '../repositories/insights.repository.js';

/**
 * @what  Pure server-side computation of the Government dashboard's "Current
 *        Snapshot" — one per-region value per metric, used to shade the
 *        choropleth small-multiples (DIH-14, replacing the DIH-7 KPI placeholder).
 * @why   The choropleth is deterministic data→colour, so the SERVER owns the
 *        numbers (the model is never asked to aggregate or rank — same reasoning
 *        as insight-response.js). This is pure (rows in, snapshot out) so it's
 *        unit-testable without the DB or the Gemini SDK.
 */

// Only single-value-per-region metrics can be shaded on a map. Spend is
// region×category (no single regional value), so it's excluded — it keeps its
// own bar chart in charts[].
const SNAPSHOT_METRICS = Object.keys(METRIC_SPECS); // occupancy, adr, length_of_stay, booking_window

/**
 * Build the snapshot from the already-fetched date-grain rows (context.data).
 * For each requested metric we average its column per region over the period and
 * record the value range (for within-metric colour normalisation on the client).
 *
 * @param {object[]} rows     date-grain rows: { region, date, <metric columns> }
 * @param {string[]} metrics  appliedFilters.metrics (may include spend / unknowns)
 * @returns {{ metric: string, scale: { min: number, max: number }, regions: { region: string, value: number }[] }[]}
 *   One entry per snapshot-eligible metric that has data. Metrics with no numeric
 *   data are omitted so the client never renders an empty map.
 */
export function buildSnapshot(rows, metrics) {
  const list = Array.isArray(rows) ? rows : [];
  const wanted = (Array.isArray(metrics) ? metrics : []).filter((m) =>
    SNAPSHOT_METRICS.includes(m),
  );

  const snapshot = [];
  for (const metric of wanted) {
    const { column } = METRIC_SPECS[metric];

    // Sum + count per region, ignoring null/non-numeric cells.
    const totals = new Map(); // region -> { sum, count }
    for (const row of list) {
      const region = row?.region;
      const raw = row?.[column];
      if (region == null || raw == null || Number.isNaN(Number(raw))) continue;
      const acc = totals.get(region) ?? { sum: 0, count: 0 };
      acc.sum += Number(raw);
      acc.count += 1;
      totals.set(region, acc);
    }

    const regions = [...totals.entries()].map(([region, { sum, count }]) => ({
      region,
      value: sum / count,
    }));
    if (!regions.length) continue; // no data for this metric — omit it

    const values = regions.map((r) => r.value);
    snapshot.push({
      metric,
      scale: { min: Math.min(...values), max: Math.max(...values) },
      regions,
    });
  }

  return snapshot;
}
