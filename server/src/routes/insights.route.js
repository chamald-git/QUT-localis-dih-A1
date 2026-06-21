import { Router } from 'express';
import { getInsight } from '../services/gemini-insight.service.js';
import { sendSuccess } from '../utils/respond.js';

const router = Router();

// Comma-separated query value (?regions=Cairns,Noosa) → trimmed array; omitted → undefined.
const csvToArray = (val) =>
  typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

/**
 * @what  GET /api/insights?regions=&metrics=&period=
 * @why   DIH-14 AI Insights. The reader role comes from the authenticated user
 *        (req.user.role — set by the dev mockUser; real JWT later, DIH-1), NOT
 *        the query. regions / metrics / period are optional request inputs; the
 *        service applies defaults and returns the role-framed narrative + charts.
 *        Input validation, auth, and caching are backlog work.
 * @module-source DIH-14 insights route
 */
router.get('/', async (req, res, next) => {
  try {
    const insight = await getInsight({
      role: req.user?.role,
      regions: csvToArray(req.query.regions),
      metrics: csvToArray(req.query.metrics),
      period: req.query.period,
    });
    sendSuccess(res, insight);
  } catch (err) {
    next(err);
  }
});

export default router;
