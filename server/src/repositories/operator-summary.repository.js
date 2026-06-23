import { pool } from "../db/pool.js";

/**
 * Returns live summary values for the Operator dashboard.
 *
 * Occupancy is used as the date spine and length-of-stay data is joined
 * by region and date.
 */
export async function getOperatorSummary(regionName, days = 90) {
  const [rows] = await pool.query(
    `SELECT
      r.name AS region,
      ROUND(AVG(o.occupancy_pct) * 100, 1) AS occupancy_pct,
      ROUND(AVG(o.adr), 0) AS adr,
      ROUND(AVG(l.avg_length_of_stay), 1) AS average_stay_nights,
      ROUND(AVG(l.avg_booking_window), 0) AS booking_window_days,
      COUNT(DISTINCT o.date) AS data_points
    FROM occupancy o
    JOIN regions r
      ON r.id = o.region_id
    LEFT JOIN length_of_stay l
      ON l.region_id = o.region_id
      AND l.date = o.date
    WHERE r.name = ?
      AND o.date IN (
        SELECT date
        FROM (
          SELECT DISTINCT date
          FROM occupancy
          ORDER BY date DESC
          LIMIT ?
        ) AS recent_dates
      )
    GROUP BY r.name`,
    [regionName, days],
  );

  return rows[0] ?? null;
}

/**
 * Returns live visitor-spending totals and category breakdowns.
 */
export async function getOperatorSpendSummary(regionName, days = 90) {
  const [[totalRows], [categoryRows]] = await Promise.all([
    pool.query(
      `SELECT
        ROUND(SUM(s.spend), 2) AS total_visitor_spend,
        SUM(s.cards_seen) AS cards_seen,
        SUM(s.no_txns) AS transactions
      FROM spend s
      JOIN regions r
        ON r.id = s.region_id
      WHERE r.name = ?
        AND s.date IN (
          SELECT date
          FROM (
            SELECT DISTINCT date
            FROM spend
            ORDER BY date DESC
            LIMIT ?
          ) AS recent_dates
        )`,
      [regionName, days],
    ),

    pool.query(
      `SELECT
        s.category,
        ROUND(SUM(s.spend), 2) AS total_spend,
        SUM(s.cards_seen) AS cards_seen,
        SUM(s.no_txns) AS transactions
      FROM spend s
      JOIN regions r
        ON r.id = s.region_id
      WHERE r.name = ?
        AND s.date IN (
          SELECT date
          FROM (
            SELECT DISTINCT date
            FROM spend
            ORDER BY date DESC
            LIMIT ?
          ) AS recent_dates
        )
      GROUP BY s.category
      ORDER BY total_spend DESC`,
      [regionName, days],
    ),
  ]);

  const totals = totalRows[0];

  return {
    total_visitor_spend: Number(totals?.total_visitor_spend ?? 0),
    cards_seen: Number(totals?.cards_seen ?? 0),
    transactions: Number(totals?.transactions ?? 0),
    categories: categoryRows.map((row) => ({
      category: row.category,
      total_spend: Number(row.total_spend),
      cards_seen: Number(row.cards_seen),
      transactions: Number(row.transactions),
    })),
  };
}