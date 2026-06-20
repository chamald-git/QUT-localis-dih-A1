import { Router } from 'express';
import healthRoute from './health.route.js';
import occupancyRoute from './occupancy.route.js';
import insightsRoute from './insights.route.js';

const router = Router();

router.use(healthRoute);
router.use('/occupancy', occupancyRoute);
router.use('/insights', insightsRoute);

export default router;