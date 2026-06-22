import { knex } from '../db/knex.js';

/**
 * @what  Data-access for the AI insights endpoint (DIH-14).
 * @why   Owns the Knex query that joins the two (region, date)-grain tables —
 *        occupancy and length_of_stay — and the valid-region lookup. Keeps SQL
 *        out of the service layer, matching the route -> service -> repository
 *        pattern used by occupancy/health. (Per ADR-0003, Knex is confined to
 *        this insights repository; the other repositories use raw mysql2.)
 *        Spend has a third dimension (category), so it can't join the date-grain
 *        rows — it's a SEPARATE dataset, aggregated by category (querySpendData).
 */

// Requested metric -> source table alias + column. Both tables are keyed
// (region_id, date): occupancy/adr live on `occupancy` (alias o);
// length_of_stay/booking_window on `length_of_stay` (alias l).
const METRIC_SPECS = {
  occupancy: { alias: 'o', column: 'occupancy_pct' },
  adr: { alias: 'o', column: 'adr' },
  length_of_stay: { alias: 'l', column: 'avg_length_of_stay' },
  booking_window: { alias: 'l', column: 'avg_booking_window' },
};

// Spend is a pseudo-metric, not a join column: requesting it adds the spend
// dataset (region×category, summed over the period) alongside the date-grain rows.
export const SPEND_METRIC = 'spend';

// How many categories the spend dataset keeps. Trimming to the headline
// categories server-side keeps the chart readable and grounds the AI narrative —
// and stops the model from having to (mis)rank all 29 categories itself.
export const SPEND_TOP_N = 10;

/** Metric names this repository can serve (date-grain metrics + the spend dataset). */
export const INSIGHT_METRICS = [...Object.keys(METRIC_SPECS), SPEND_METRIC];

/**
 * Normalise a DATE column to YYYY-MM-DD. mysql2 may hand back a string (already
 * fine) or a Date built at LOCAL midnight — so read local components, not
 * toISOString(), which would shift the calendar day in UTC+ timezones.
 */
function formatDate(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Coerce a numeric column to Number, preserving null. mysql2 returns DECIMAL (and
 * SUM of DECIMAL) as strings, so every numeric read goes through this.
 */
function toNumber(value) {
  return value == null ? null : Number(value);
}

// Valid region names, memoised (the seed set rarely changes; restart to refresh).
let regionsPromise = null;
export function getValidRegions() {
  if (!regionsPromise) {
    regionsPromise = knex('regions')
      .pluck('name')
      .catch((err) => {
        regionsPromise = null;
        throw err;
      });
  }
  return regionsPromise;
}

/**
 * Fetch the joined insight rows: ONE Knex join of occupancy + length_of_stay on
 * region + date, scoped to `regions` and the last `days` dates, selecting only
 * the requested metric columns. Returns coerced wide rows (one per region/date).
 *
 * The period filter is a nested date subquery — the N most-recent distinct dates
 * wrapped in a derived table (MySQL won't allow LIMIT directly inside IN (...)).
 *
 * @param {{ regions: string[], metrics: string[], days: number }} params
 * @returns {Promise<object[]>}
 */
export async function queryInsightData({ regions, metrics, days }) {
  const recentDates = knex
    .select('date')
    .from(knex('occupancy').distinct('date').orderBy('date', 'desc').limit(days).as('recent'));

  // occupancy is the date spine; length_of_stay is LEFT-joined on region + date.
  // Ignore any non-join metric (e.g. the spend pseudo-metric) defensively — the
  // service strips it, but a stray value must not index METRIC_SPECS as undefined.
  const cols = metrics.filter((m) => METRIC_SPECS[m]);
  const select = { region: 'r.name', date: 'o.date' };
  for (const m of cols) {
    const { alias, column } = METRIC_SPECS[m];
    select[column] = `${alias}.${column}`;
  }

  const rows = await knex('occupancy as o')
    .join('regions as r', 'r.id', 'o.region_id')
    .leftJoin('length_of_stay as l', function () {
      this.on('l.region_id', '=', 'o.region_id').andOn('l.date', '=', 'o.date');
    })
    .whereIn('r.name', regions)
    .whereIn('o.date', recentDates)
    .orderBy(['r.name', 'o.date'])
    .select(select);

  // DECIMAL columns come back from mysql2 as strings; coerce to Number and
  // normalise the date. A missing left-joined value stays null.
  return rows.map((row) => {
    const out = { region: row.region, date: formatDate(row.date) };
    for (const m of cols) {
      const { column } = METRIC_SPECS[m];
      out[column] = toNumber(row[column]);
    }
    return out;
  });
}

/**
 * Keep only the rows for the N categories with the highest TOTAL spend across the
 * given rows (summed over every region present). Ranking the top categories needs
 * a cross-region pass, so it's done here in JS rather than a second SQL pass — and
 * being pure, it's unit-testable without a DB. Returned row order is preserved.
 *
 * @param {{ category: string, spend: number|null }[]} rows
 * @param {number} [n]
 */
export function topSpendCategories(rows, n = SPEND_TOP_N) {
  const totals = new Map();
  for (const r of rows) totals.set(r.category, (totals.get(r.category) ?? 0) + (r.spend ?? 0));
  const keep = new Set(
    [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([category]) => category),
  );
  return rows.filter((r) => keep.has(r.category));
}

/**
 * Fetch the spend dataset: spend rolled up to ONE row per region × category over
 * the last `days` dates (no date dimension — exactly what a "spend by category"
 * bar needs), then trimmed to the top SPEND_TOP_N categories. Same recent-dates
 * subquery style as queryInsightData, on the spend table. Per ADR-0003 this stays
 * fluent Knex — no knex.raw.
 *
 * @param {{ regions: string[], days: number }} params
 * @returns {Promise<{ region: string, category: string, spend: number|null, no_txns: number|null, cards_seen: number|null }[]>}
 */
export async function querySpendData({ regions, days }) {
  const recentDates = knex
    .select('date')
    .from(knex('spend').distinct('date').orderBy('date', 'desc').limit(days).as('recent'));

  const rows = await knex('spend as s')
    .join('regions as r', 'r.id', 's.region_id')
    .whereIn('r.name', regions)
    .whereIn('s.date', recentDates)
    .groupBy('r.name', 's.category')
    .orderBy(['r.name', 's.category'])
    .select({ region: 'r.name', category: 's.category' })
    .sum({ spend: 's.spend', no_txns: 's.no_txns', cards_seen: 's.cards_seen' });

  // SUM of a DECIMAL comes back as a string from mysql2; coerce to Number.
  const mapped = rows.map((row) => ({
    region: row.region,
    category: row.category,
    spend: toNumber(row.spend),
    no_txns: toNumber(row.no_txns),
    cards_seen: toNumber(row.cards_seen),
  }));
  // Trim to the headline categories so the chart and AI narrative both focus on
  // what matters (totalled across the requested regions).
  return topSpendCategories(mapped);
}
