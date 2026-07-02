import { verifyToken } from '../auth/jwt.js';

/**
 * @what  Express middleware that extracts and verifies a JWT from the
 *        Authorization header, then injects the decoded claims into req.user.
 * @why   Every protected route needs identity context (role, regions, tier)
 *        without repeating token-parsing logic. This middleware sits before
 *        roleGuard and tierGuard in the middleware chain so those guards
 *        can read req.user.role and req.user.tier directly.
 * @alternative-considered  Reading the token from a cookie was considered
 *        (simpler CSRF story) but Bearer tokens align with the REST API
 *        contract Ben's /api/insights already follows and with the IFQ716
 *        teaching pattern.
 * @module-source  IFQ716 Week 7, middleware authentication pattern
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export default function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { code: 'MISSING_TOKEN', message: 'Authorization header with Bearer token is required' }
    });
  }

  const token = header.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' }
    });
  }

  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    regions: decoded.regions,
    tier: decoded.tier
  };

  next();
}
