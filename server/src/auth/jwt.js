import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * @what  Creates a signed JWT carrying the user's identity claims.
 * @why   Every protected route needs a compact, tamper-proof token that
 *        the authenticate middleware can verify without a database call.
 *        Claims include role, regions, and tier so downstream guards
 *        (roleGuard, tierGuard) can enforce access without extra queries.
 * @alternative-considered  RS256 asymmetric signing was considered but
 *        adds key-management complexity with no benefit for a single-service
 *        architecture where the same server signs and verifies.
 * @module-source  IFQ716 Week 7, JWT authentication pattern
 * @param {{ sub: number, email: string, role: string, regions: string[], tier: string }} payload
 * @returns {string} Signed JWT string
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRY
  });
}

/**
 * @what  Verifies a JWT and returns the decoded payload if valid.
 * @why   The authenticate middleware calls this on every protected request.
 *        Returning null instead of throwing lets the middleware control
 *        the HTTP response shape (401 with error envelope).
 * @alternative-considered  Throwing on invalid tokens was considered but
 *        forces try/catch at every call site. Returning null keeps the
 *        control flow explicit in the middleware.
 * @module-source  IFQ716 Week 7, JWT verification pattern
 * @param {string} token
 * @returns {object|null} Decoded payload or null if invalid/expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}
