import { Router } from 'express';
import healthRoute from './health.route.js';

/**
 * Central router. Every feature router mounts here, and this is mounted once
 * at /api in app.js. As DIH features land (auth, regions, metrics) their
 * routers are added below.
 */
const router = Router();

router.use(healthRoute);

export default router;
