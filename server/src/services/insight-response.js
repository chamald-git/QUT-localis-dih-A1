import { SPEND_METRIC } from '../repositories/insights.repository.js';

/**
 * @what  Pure parsing/validation of the Gemini insight response (DIH-14).
 * @why   Keeps the shaping out of the Gemini-calling service so it's unit-testable
 *        without the SDK: validates chart specs, drops invalid/unrequested ones,
 *        and attaches the server's real data rows to each surviving chart.
 */

/**
 * Structural sanity check on a returned Vega-Lite spec. Full schema validation
 * isn't practical (Vega-Lite is open-ended); requiring a mark and an x/y encoding
 * catches the common cheap-model failures. An invalid spec drops just that chart.
 */
function hasXY(node) {
  const enc = node?.encoding;
  return Boolean(enc && typeof enc === 'object' && enc.x && enc.y);
}

export function isValidChartSpec(spec) {
  if (!spec || typeof spec !== 'object') return false;
  // Layered spec (used for annotations): every layer needs a mark, and an x/y
  // encoding must exist somewhere — shared at the top level or on a layer.
  if (Array.isArray(spec.layer)) {
    return (
      spec.layer.length > 0 &&
      spec.layer.every((layer) => layer && layer.mark) &&
      (hasXY(spec) || spec.layer.some(hasXY))
    );
  }
  // Single view: a mark plus x/y encoding.
  return Boolean(spec.mark) && hasXY(spec);
}

/**
 * Shape the raw Gemini object into the response { narrative, charts }. Keeps only
 * charts whose metric was requested and whose spec is structurally valid, and
 * attaches the server's real rows (context.data) to each so rendering / "view
 * data" needs no extra request. Pure — no SDK / DB.
 *
 * @param {{ narrative?: unknown, charts?: unknown }} raw  parsed Gemini JSON
 * @param {{ appliedFilters: { metrics: string[] }, data: object[], spend?: object[]|null }} context
 * @returns {{ narrative: string, charts: object[] }}
 */
export function parseInsightResponse(raw, context) {
  const requested = new Set(context.appliedFilters.metrics);
  const rawCharts = Array.isArray(raw?.charts) ? raw.charts : [];
  const charts = rawCharts
    .filter((c) => c && requested.has(c.metric) && isValidChartSpec(c.chartSpec))
    .map((c) => ({
      metric: c.metric,
      title: typeof c.title === 'string' ? c.title : '',
      caption: typeof c.caption === 'string' ? c.caption : '',
      chartSpec: c.chartSpec,
      // A spend chart carries the region×category spend rows; every other chart
      // carries the date-grain rows. Both are attached server-side so rendering
      // and "view data" need no extra request.
      data: c.metric === SPEND_METRIC ? (context.spend ?? []) : context.data,
    }));
  // The prompt asks for a single string; a cheap model may return otherwise.
  const narrative = typeof raw?.narrative === 'string' ? raw.narrative : '';
  return { narrative, charts };
}
