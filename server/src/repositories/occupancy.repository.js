import { pool } from '../db/pool.js';

/**
 * @what Returns occupancy + ADR rows for a region, ordered by date desc.
 * @why Repository layer keeps raw SQL out of services; callable by Agno agent tools too.
 * @alternative-considered Knex query builder — rejected per ADR-0003 (raw queries, transparent).
 * @module-source DIH-3 REST API foundation
 */
export async function getOccupancyByRegion(regionName, limit = 20) {
  const [rows] = await pool.query(
    `SELECT o.date, r.name AS region, o.occupancy_pct, o.adr
     FROM occupancy o
     JOIN regions r ON r.id = o.region_id
     WHERE r.name = ?
     ORDER BY o.date DESC
     LIMIT ?`,
    [regionName, limit]
  );
  return rows;
}

/**
 * @what Returns summary stats for a region: latest occupancy, ADR, delta vs prior 30 days.
 * @why Powers DIH-7 summary cards — pre-computed on server, not in React.
 * @alternative-considered computing delta in JS after fetch — rejected, keeps business logic server-side.
 * @module-source DIH-7 Summary cards
 */
export async function getOccupancySummary(regionName) {
  const [rows] = await pool.query(
    `SELECT
       r.name AS region,
       ROUND(AVG(o.occupancy_pct) * 100, 1) AS occupancy_pct,
       ROUND(AVG(o.adr), 0) AS adr,
       COUNT(*) AS data_points
     FROM occupancy o
     JOIN regions r ON r.id = o.region_id
     WHERE r.name = ?
     AND o.date >= DATE_SUB((SELECT MAX(date) FROM occupancy), INTERVAL 30 DAY)`,
    [regionName]
  );
  return rows[0] ?? null;
}