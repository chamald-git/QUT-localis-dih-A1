import { Router } from 'express';
import healthRoute from './health.route.js';
import occupancyRoute from './occupancy.route.js';
import lengthOfStayRoute from './length-of-stay.route.js';
import insightsRoute from './insights.route.js';
import operatorSummaryRoute from './operator-summary.route.js';
import { mockUser } from '../middleware/mockUser.js';

const router = Router();

router.use(healthRoute);
router.use('/occupancy', occupancyRoute);
router.use('/length-of-stay', lengthOfStayRoute);
router.use('/operator-summary', operatorSummaryRoute);

// mockUser is the dev stand-in for JWT auth. It sets req.user.role for
// the insights endpoint only and will be replaced by real authentication.
router.use('/insights', mockUser, insightsRoute);

export default router;