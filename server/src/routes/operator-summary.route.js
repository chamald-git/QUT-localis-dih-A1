import { Router } from 'express';
import { z } from 'zod';
import {
  getOperatorSummaryCard,
} from '../services/operator-summary.service.js';
import { sendSuccess } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

const VALID_REGIONS = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

const querySchema = z.object({
  region: z.enum(VALID_REGIONS),
  days: z.coerce.number().int().min(1).max(100).default(90),
});

/**
 * GET /api/operator-summary?region=Noosa&days=90
 *
 * Returns live Operator dashboard summary values, including an estimated
 * staffing-pressure signal.
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      throw ApiError.badRequest(
        'Invalid Operator summary query',
        parsed.error.flatten(),
      );
    }

    const summary = await getOperatorSummaryCard(
      parsed.data.region,
      parsed.data.days,
    );

    if (!summary) {
      throw ApiError.notFound(
        `No Operator summary data found for ${parsed.data.region}`,
      );
    }

    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
});

export default router;