import { Router } from 'express';
import healthRoute from './health.route.js';
import occupancyRoute from './occupancy.route.js';

const router = Router();

router.use(healthRoute);
router.use('/occupancy', occupancyRoute);

export default router;