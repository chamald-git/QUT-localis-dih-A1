/**
 * @what  Factory that returns Express middleware restricting access to
 *        one or more roles. Returns 403 if req.user.role is not in the
 *        allowed set.
 * @why   Admin-only routes (DIH-9 CRUD) and role-specific dashboards need
 *        a declarative guard that reads the role claim already injected by
 *        the authenticate middleware, without duplicating the check in
 *        every route handler.
 * @alternative-considered  A single combined authz middleware handling
 *        both role and tier was considered but violates single-responsibility
 *        and makes route declarations harder to read. Separate guards
 *        compose: router.get('/admin/users', authenticate, roleGuard('admin'), handler).
 * @module-source  IFQ716 Week 8, role-based access control pattern
 * @param {...string} allowedRoles
 * @returns {import('express').RequestHandler}
 */
export default function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `This route requires one of: ${allowedRoles.join(', ')}` }
      });
    }
    next();
  };
}
