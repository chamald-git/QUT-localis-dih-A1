import { Router } from 'express';
import { z } from 'zod';
import { listLengthOfStay, getLengthOfStayCard } from '../services/length-of-stay.service.js';
import { sendSuccess } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

const VALID_REGIONS = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];
const PERIODS = ['last_30_days', 'last_60_days', 'last_90_days'];

// region + period query params (DIH-41); period presets match /api/insights and the operator dashboard.
const querySchema = z.object({
  region: z.enum(VALID_REGIONS),
  period: z.enum(PERIODS).default('last_90_days'),
});

/**
 * @what GET /api/length-of-stay?region=Cairns&period=last_90_days
 * @why Length-of-stay time-series rows for a region — feeds the DIH-5 chart and data table.
 * @module-source DIH-41 REST API
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) throw ApiError.badRequest(parsed.error.issues[0].message);
    const rows = await listLengthOfStay(parsed.data.region, parsed.data.period);
    sendSuccess(res, rows);
  } catch (err) {
    next(err);
  }
});

/**
 * @what GET /api/length-of-stay/summary?region=Cairns&period=last_90_days
 * @why Period average length of stay + delta vs the prior period — the DIH-7 KPI card (consumed by DIH-63).
 * @module-source DIH-41 REST API
 */
router.get('/summary', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) throw ApiError.badRequest(parsed.error.issues[0].message);
    const card = await getLengthOfStayCard(parsed.data.region, parsed.data.period);
    if (!card) throw ApiError.notFound('No length-of-stay data for region');
    sendSuccess(res, card);
  } catch (err) {
    next(err);
  }
});

export default router;
