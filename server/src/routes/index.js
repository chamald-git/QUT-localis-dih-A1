import { Router } from 'express';
import healthRoute from './health.route.js';
import occupancyRoute from './occupancy.route.js';
import lengthOfStayRoute from './length-of-stay.route.js';
import insightsRoute from './insights.route.js';
import operatorSummaryRoute from './operator-summary.route.js';
import authRoute from './auth.route.js';
import adminUsersRoute from './admin-users.route.js';
import authenticate from '../middleware/authenticate.js';
import roleGuard from '../middleware/roleGuard.js';

const router = Router();

router.use(healthRoute);
router.use('/auth', authRoute);

/**
 * @what  All data routes below require a verified JWT. The authenticate
 *        middleware extracts and verifies the Bearer token, then sets
 *        req.user (id, email, role, regions, tier) for downstream
 *        handlers and guard middlewares.
 * @why   DIH-46 applies authenticate to occupancy, length-of-stay, and
 *        operator-summary. DIH-47 replaces the dev-only mockUser on
 *        /insights with the same authenticate middleware. DIH-49
 *        scopes /admin/users behind authenticate plus roleGuard('admin')
 *        so only administrators can manage user accounts.
 * @alternative-considered Adding authenticate as a global app.use()
 *        before all routes was rejected because health and auth must
 *        remain public: health for uptime probes, auth for login itself.
 *        Applying authenticate per-route makes the protected boundary
 *        explicit at the routing layer and easier to audit.
 * @module-source IFQ716 Week 7, middleware chaining pattern.
 */
router.use('/occupancy', authenticate, occupancyRoute);
router.use('/length-of-stay', authenticate, lengthOfStayRoute);
router.use('/operator-summary', authenticate, operatorSummaryRoute);
router.use('/insights', authenticate, insightsRoute);
router.use('/admin/users', authenticate, roleGuard('admin'), adminUsersRoute);

export default router;