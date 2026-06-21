import { knex } from '../db/knex.js';

/**
 * @what  Data-access for the AI insights endpoint (DIH-14).
 * @why   Owns the Knex query that joins the two (region, date)-grain tables —
 *        occupancy and length_of_stay — and the valid-region lookup. Keeps SQL
 *        out of the service layer, matching the route -> service -> repository
 *        pattern used by occupancy/health. (Per ADR-0003, Knex is confined to
 *        this insights repository; the other repositories use raw mysql2.)
 *        Spend (region×date×category) is backlog work — a second table.
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

/** Metric names this repository can serve (date-grain metrics). */
export const INSIGHT_METRICS = Object.keys(METRIC_SPECS);

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
  const select = { region: 'r.name', date: 'o.date' };
  for (const m of metrics) {
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
    for (const m of metrics) {
      const { column } = METRIC_SPECS[m];
      out[column] = row[column] == null ? null : Number(row[column]);
    }
    return out;
  });
}
