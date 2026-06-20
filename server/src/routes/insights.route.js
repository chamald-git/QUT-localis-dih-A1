import { Router } from 'express';
import { z } from 'zod';
import { getInsight, VALID_PERSONAS } from '../services/gemini-insight.service.js';
import { sendSuccess } from '../utils/respond.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

const querySchema = z.object({
  persona: z.enum(VALID_PERSONAS).default('government'),
});

/**
 * @what GET /api/insights?persona=government|admin|operator
 * @why Returns an AI-generated plain-English narrative + Vega-Lite chart spec
 *      for the active persona (LLM-2). Thin proxy to the Gemini insight service.
 * @module-source LLM-2 insights route
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0].message);
    const insight = await getInsight(parsed.data.persona);
    sendSuccess(res, insight);
  } catch (err) {
    next(err);
  }
});

export default router;
