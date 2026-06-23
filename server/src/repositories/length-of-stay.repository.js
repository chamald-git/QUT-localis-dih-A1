import { pool } from '../db/pool.js';

/**
 * @what Returns length-of-stay rows for a region over the last `days` dates, newest first.
 * @why Repository layer keeps raw SQL out of services; powers the DIH-5 length-of-stay chart + data table.
 * @alternative-considered Knex query builder — rejected per ADR-0003 (Knex is confined to the insights
 *   repository; every other repository uses raw parameterised mysql2 via pool.js).
 * @module-source DIH-41 GET /api/length-of-stay
 */
export async function getLengthOfStayByRegion(regionName, days) {
  const [rows] = await pool.query(
    `SELECT l.date, r.name AS region, l.avg_length_of_stay
     FROM length_of_stay l
     JOIN regions r ON r.id = l.region_id
     CROSS JOIN (SELECT MAX(date) AS d FROM length_of_stay) m
     WHERE r.name = ?
       AND l.date > DATE_SUB(m.d, INTERVAL ? DAY)
     ORDER BY l.date DESC`,
    [regionName, days]
  );
  // DECIMAL comes back from mysql2 as a string; coerce to Number for clean JSON.
  return rows.map((row) => ({
    region: row.region,
    date: formatDate(row.date),
    avg_length_of_stay: toNumber(row.avg_length_of_stay),
  }));
}

/**
 * @what Returns the period average length of stay for a region plus the delta vs the prior equal period.
 * @why Powers DIH-7 "summary cards with delta" (consumed by DIH-63). The delta is pre-computed
 *   server-side, not in React, matching the occupancy /summary precedent.
 * @alternative-considered Two queries (one per window) — rejected; a single conditional-aggregation
 *   query over the last 2× period is one DB hit. The prior window is bounded by the WHERE clause.
 * @module-source DIH-41 GET /api/length-of-stay/summary
 */
export async function getLengthOfStaySummary(regionName, days) {
  const [rows] = await pool.query(
    `SELECT
       r.name AS region,
       AVG(CASE WHEN l.date >  DATE_SUB(m.d, INTERVAL ? DAY) THEN l.avg_length_of_stay END) AS current_avg,
       AVG(CASE WHEN l.date <= DATE_SUB(m.d, INTERVAL ? DAY) THEN l.avg_length_of_stay END) AS prior_avg
     FROM length_of_stay l
     JOIN regions r ON r.id = l.region_id
     CROSS JOIN (SELECT MAX(date) AS d FROM length_of_stay) m
     WHERE r.name = ?
       AND l.date > DATE_SUB(m.d, INTERVAL ? DAY)
     GROUP BY r.name`,
    [days, days, regionName, days * 2]
  );
  const row = rows[0];
  if (!row || row.current_avg == null) return null;

  const current = toNumber(row.current_avg);
  const prior = toNumber(row.prior_avg);
  return {
    region: row.region,
    avg_length_of_stay: round2(current),
    // null when there isn't a full prior period of history to compare against.
    delta: prior == null ? null : round2(current - prior),
  };
}

/** mysql2 returns DECIMAL (and AVG of DECIMAL) as strings; coerce to Number, preserving null. */
function toNumber(value) {
  return value == null ? null : Number(value);
}

/** Round to 2 dp (length of stay is in nights), preserving null. */
function round2(value) {
  return value == null ? null : Math.round(value * 100) / 100;
}

/**
 * Normalise a DATE column to YYYY-MM-DD. mysql2 may return a string (already fine) or a Date built at
 * LOCAL midnight — read local components, not toISOString(), which would shift the day in UTC+ zones.
 */
function formatDate(value) {
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
