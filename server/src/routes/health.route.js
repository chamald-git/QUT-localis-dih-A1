import { Router } from 'express';
import { healthService } from '../services/health.service.js';
import { asyncHandler } from '../utils/respond.js';

const router = Router();

/**
 * GET /api/health
 *
 * Liveness + dependency check. Returns the exact Phase 0 contract:
 *   { "status": "ok", "db": "connected" }
 *
 * Note this route intentionally does NOT use the { data } success envelope.
 * Health endpoints are conventionally probed by uptime monitors and platform
 * health checks (Railway) that expect a flat, predictable JSON body, so the
 * shape is deliberately top-level. If the database is unreachable the body
 * becomes { status: "degraded", db: "disconnected" } with a 503 so monitors
 * register the failure correctly.
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const health = await healthService.getHealth();
    const statusCode = health.db === 'connected' ? 200 : 503;
    res.status(statusCode).json(health);
  }),
);

export default router;
