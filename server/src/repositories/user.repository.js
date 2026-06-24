import { pool } from '../db/pool.js';

/**
 * @what  Finds a user record by email address.
 * @why   The login flow needs to look up the user to compare the
 *        submitted password against the stored bcrypt hash. Returns
 *        the full row including password_hash so the service layer
 *        can run bcrypt.compare.
 * @alternative-considered  Returning the user without password_hash
 *        was considered for safety but the service layer needs it for
 *        comparison and never exposes it beyond that function.
 * @module-source  IFQ716 Week 6, repository pattern
 * @param {string} email
 * @returns {Promise<object|null>}
 */
export async function findByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, email, password_hash, role, regions, tier, created_at FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

/**
 * @what  Finds a user record by primary key.
 * @why   Admin CRUD (DIH-9) and profile lookups need user retrieval by
 *        ID. Excludes password_hash since this is for read-only display.
 * @alternative-considered  None significant.
 * @module-source  IFQ716 Week 6, repository pattern
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, email, role, regions, tier, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

/**
 * @what  Returns all user records without password hashes.
 * @why   Admin user table (DIH-50) needs a full list of users with
 *        role, regions, and tier badges.
 * @alternative-considered  Pagination was considered but with < 100
 *        demo users in scope, a full select is simpler and sufficient.
 * @module-source  IFQ716 Week 6, repository pattern
 * @returns {Promise<object[]>}
 */
export async function findAll() {
  const [rows] = await pool.execute(
    'SELECT id, email, role, regions, tier, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}
