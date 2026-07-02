import bcrypt from 'bcrypt';
import { signToken } from '../auth/jwt.js';
import * as userRepo from '../repositories/user.repository.js';

/**
 * @what  Authenticates a user by email and password, returning a signed
 *        JWT and a safe user profile (no password_hash) on success.
 * @why   The three-layer architecture requires business logic to live in
 *        services, not routes. This function is also callable from the
 *        Agno agent if agent-initiated logins are ever needed, because
 *        services are transport-agnostic.
 * @alternative-considered  Returning the token inside a cookie was
 *        considered but the REST API contract uses Bearer tokens (ADR-0006)
 *        and the React frontend stores the token in memory via AuthContext.
 * @module-source  IFQ716 Week 7, authentication service pattern
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 * @throws {Error} With message 'INVALID_CREDENTIALS' if email not found or password wrong
 */
export async function login(email, password) {
  const user = await userRepo.findByEmail(email);

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const regions = typeof user.regions === 'string'
    ? JSON.parse(user.regions)
    : user.regions;

  const token = signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    regions,
    tier: user.tier
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      regions,
      tier: user.tier
    }
  };
}
