/**
 * @what  Dev stand-in for the auth layer: populates req.user.role from the
 *        `x-user-role` request header (default `government`).
 * @why   The JWT login/auth layer is backlog work (DIH-1), but the insights
 *        endpoint already needs `req.user.role` to frame the prompt. This lets
 *        the endpoint be exercised per-role (e.g. in Insomnia / the test page)
 *        before login exists. Replaced by real JWT verification later (DIH-1);
 *        role validation is backlog work too (DIH-1).
 * @module-source DIH-14 insights — role identity (mock)
 */
export function mockUser(req, _res, next) {
  const role = req.headers?.['x-user-role'] || 'government';
  req.user = { role };
  next();
}
