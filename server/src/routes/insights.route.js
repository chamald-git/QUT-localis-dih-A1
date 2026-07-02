import { Router } from 'express';
import { getInsight } from '../services/gemini-insight.service.js';
import { sendSuccess } from '../utils/respond.js';

const router = Router();

/**
 * @what  Helper that splits a comma-separated query parameter (e.g.
 *        ?regions=Cairns,Noosa) into a trimmed string array. Returns
 *        undefined when the parameter is absent so the service can
 *        apply its own defaults.
 * @why   Express does not natively parse CSV query strings into arrays.
 *        Centralising the parse rule here keeps the route handler
 *        readable and ensures regions, metrics, and any future CSV
 *        parameter behave identically.
 * @alternative-considered Using the qs library's array syntax
 *        (?regions[]=Cairns&regions[]=Noosa) was rejected because the
 *        client-side query builder (buildInsightsQuery.js) already
 *        emits CSV form, and changing both ends mid-sprint is risk
 *        without benefit.
 * @module-source IFQ716 Week 6, query-string parsing pattern.
 * @param {unknown} val
 * @returns {string[]|undefined}
 */
const csvToArray = (val) =>
  typeof val === 'string' ? val.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

/**
 * @what  GET /api/insights?regions=&metrics=&period=
 *        Returns the role-framed Gemini narrative plus Vega-Lite chart
 *        specs for the authenticated user. Role is read from req.user
 *        (populated by authenticate middleware from the verified JWT),
 *        not from any client-controlled header.
 * @why   DIH-14 AI Insights. Reading role from req.user closes the
 *        DIH-47 and DIH-48 gap where a client could previously spoof
 *        role via the x-user-role header to receive a different
 *        persona's narrative. regions, metrics, and period remain
 *        client inputs because they are display preferences, not
 *        authorisation signals.
 * @alternative-considered Validating that the requested regions are a
 *        subset of req.user.regions was considered as defence-in-depth,
 *        but that policy belongs in the service layer alongside the
 *        existing region-scoping logic (DIH-69), not in the route.
 * @module-source DIH-14 insights route, IFQ716 Week 7 JWT-derived
 *        authorisation.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
router.get('/', async (req, res, next) => {
  try {
    const insight = await getInsight({
      role: req.user.role,
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