import { Router } from 'express';
import { z } from 'zod';
import { listOccupancy, getOccupancyCard } from '../services/occupancy.service.js';
import { sendSuccess } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

const VALID_REGIONS = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

const querySchema = z.object({
  region: z.enum(VALID_REGIONS),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * @what GET /api/occupancy?region=Cairns&limit=20
 * @why Returns occupancy and ADR rows for a region, used by DIH-5 charts.
 * @module-source DIH-3 REST API foundation
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
    const rows = await listOccupancy(parsed.data.region, parsed.data.limit);
    sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

/**
 * @what GET /api/occupancy/summary?region=Cairns
 * @why Returns single summary card data point for DIH-7.
 * @module-source DIH-7 Summary cards
 */
router.get('/summary', async (req, res, next) => {
  try {
    const parsed = z.object({ region: z.enum(VALID_REGIONS) }).safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
    const card = await getOccupancyCard(parsed.data.region);
    if (!card) throw new ApiError(404, 'No data for region');
    sendSuccess(res, card);
  } catch (err) {
    next(err);
  }
});

export default router;