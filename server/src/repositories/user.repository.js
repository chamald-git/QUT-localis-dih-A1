import bcrypt from 'bcrypt';
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

/**
 * @what  Creates a new user with a bcrypt-hashed password and returns
 *        the persisted record without the password hash.
 * @why   DIH-49 admin user CRUD needs a create operation. Hashing
 *        happens here rather than at the route layer so every call
 *        site (admin CRUD now, self-service signup later) gets
 *        consistent hash cost and storage shape.
 * @alternative-considered Hashing in the service or route layer was
 *        rejected because it would force every future caller to
 *        remember the hash step. Centralising in the repository
 *        guarantees password_hash is never set from plaintext.
 * @module-source IFQ716 Week 6, repository pattern; Week 7, bcrypt
 *        password storage.
 * @param {{ email: string, password: string, role: string, regions: string[], tier: string }} input
 * @returns {Promise<object>}
 */
export async function create({ email, password, role, regions, tier }) {
  const password_hash = await bcrypt.hash(password, 10);
  const regionsJson = JSON.stringify(regions);

  const [result] = await pool.execute(
    'INSERT INTO users (email, password_hash, role, regions, tier) VALUES (?, ?, ?, ?, ?)',
    [email, password_hash, role, regionsJson, tier]
  );

  return findById(result.insertId);
}

/**
 * @what  Updates one or more fields on an existing user. Accepts a
 *        partial input object so admin can change role, regions, tier,
 *        or email independently. Password updates go through a
 *        separate updatePassword function so the bcrypt step is
 *        explicit and auditable.
 * @why   DIH-49 admin user CRUD needs PATCH semantics. A dynamic
 *        UPDATE statement (only setting columns the admin actually
 *        sent) avoids overwriting unrelated fields with stale values
 *        when the frontend submits a partial form.
 * @alternative-considered A full-replacement PUT was considered but
 *        rejected because the frontend would need to re-fetch the
 *        user, merge changes, and re-submit. PATCH is leaner and
 *        matches REST convention for partial updates.
 * @module-source IFQ716 Week 6, repository pattern with dynamic SQL.
 * @param {number} id
 * @param {{ email?: string, role?: string, regions?: string[], tier?: string }} updates
 * @returns {Promise<object|null>}
 */
export async function update(id, updates) {
  const setClauses = [];
  const values = [];

  if (updates.email !== undefined) {
    setClauses.push('email = ?');
    values.push(updates.email);
  }
  if (updates.role !== undefined) {
    setClauses.push('role = ?');
    values.push(updates.role);
  }
  if (updates.regions !== undefined) {
    setClauses.push('regions = ?');
    values.push(JSON.stringify(updates.regions));
  }
  if (updates.tier !== undefined) {
    setClauses.push('tier = ?');
    values.push(updates.tier);
  }

  if (setClauses.length === 0) {
    return findById(id);
  }

  values.push(id);

  await pool.execute(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
    values
  );

  return findById(id);
}

/**
 * @what  Hard-deletes a user row by primary key. Returns true when a
 *        row was removed, false when no user with that id existed.
 * @why   DIH-49 admin user CRUD needs a delete operation. Hard delete
 *        was chosen for the capstone demo because the user table is
 *        small and the demo timeline does not justify the schema
 *        change for soft delete.
 * @alternative-considered Soft delete (UPDATE users SET deleted_at =
 *        NOW()) gives better audit trail and reversibility, and is
 *        the production-grade pattern. It was rejected here only
 *        because it requires a schema migration and a deleted_at IS
 *        NULL filter on every other query, neither of which is worth
 *        the 30-minute cost before the team meeting. A2 future-work
 *        will recommend soft delete for production.
 * @module-source IFQ716 Week 6, repository pattern.
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function remove(id) {
  const [result] = await pool.execute(
    'DELETE FROM users WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}