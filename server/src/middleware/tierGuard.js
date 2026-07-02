const TIER_LEVELS = {
  'spend-only': 1,
  'accommodation-only': 2,
  'full': 3
};

/**
 * @what  Factory that returns Express middleware restricting access based
 *        on the user's dataset tier. A user with tier level >= required
 *        tier is allowed through.
 * @why   Localis sells data commercially at different price points. An
 *        operator with spend-only access must not see accommodation data.
 *        The tier claim in the JWT (injected by authenticate) is compared
 *        against the minimum tier each data endpoint requires.
 * @alternative-considered  A per-dataset allowlist in the JWT was considered
 *        (e.g. datasets: ['spend', 'occupancy']) but tiers are simpler to
 *        manage in the admin UI and match the client's existing pricing model.
 * @module-source  IFQ716 Week 8, attribute-based access control adaptation
 * @param {string} requiredTier
 * @returns {import('express').RequestHandler}
 */
export default function tierGuard(requiredTier) {
  const requiredLevel = TIER_LEVELS[requiredTier];

  if (requiredLevel === undefined) {
    throw new Error(`Unknown tier: ${requiredTier}. Valid tiers: ${Object.keys(TIER_LEVELS).join(', ')}`);
  }

  return (req, res, next) => {
    const userLevel = TIER_LEVELS[req.user?.tier];

    if (userLevel === undefined || userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_TIER',
          message: `This endpoint requires "${requiredTier}" tier access or higher`
        }
      });
    }
    next();
  };
}
