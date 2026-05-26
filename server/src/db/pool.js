import mysql from 'mysql2/promise';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Single shared connection pool for the whole process. mysql2's promise pool
 * lets every repository call `pool.execute(sql, params)` with parameterised
 * queries — the only query style we use, which keeps us safe from SQL
 * injection and keeps the report's security story simple.
 */
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  charset: 'utf8mb4',
});

/**
 * Cheap liveness probe used by the health route. Runs the trivial `SELECT 1`
 * so a real round-trip to MySQL is confirmed, not just that a pool object
 * exists. Returns a boolean rather than throwing so the route can shape the
 * response envelope itself.
 */
export async function verifyConnection() {
  try {
    const connection = await pool.getConnection();
    try {
      await connection.query('SELECT 1');
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error({ err: error }, 'Database connection check failed');
    return false;
  }
}

/**
 * Graceful shutdown helper. Called on SIGINT/SIGTERM so the pool drains
 * cleanly instead of leaving dangling connections.
 */
export async function closePool() {
  await pool.end();
  logger.info('MySQL pool closed');
}
