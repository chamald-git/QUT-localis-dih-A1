import { Router } from 'express';
import healthRoute from './health.route.js';
import occupancyRoute from './occupancy.route.js';
import lengthOfStayRoute from './length-of-stay.route.js';
import insightsRoute from './insights.route.js';
import { mockUser } from '../middleware/mockUser.js';

const router = Router();

router.use(healthRoute);
router.use('/occupancy', occupancyRoute);
router.use('/length-of-stay', lengthOfStayRoute);
// mockUser is the dev stand-in for JWT auth (DIH-1); it sets req.user.role for
// the insights endpoint only. Replaced by real auth later.
router.use('/insights', mockUser, insightsRoute);

export default router;