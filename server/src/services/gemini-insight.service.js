import { genai, INSIGHT_MODEL } from '../config/gemini.js';
import { assembleInsightContext } from './insights.service.js';
import { userPrompt } from './insight-prompt.js';
import { parseInsightResponse } from './insight-response.js';
import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

// Bounded well under the model's output-token cap. Charts carry no inline data
// (the server attaches rows), so the response stays small.
const MAX_OUTPUT_TOKENS = 8_192;

/** True for Gemini rate-limit / quota-exhausted errors. */
function isRateLimit(err) {
  return (
    err?.status === 429 ||
    /\b429\b|quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(err?.message ?? '')
  );
}

/**
 * Call Gemini with the role-framed prompt + the inlined DATA rows, then shape the
 * structured JSON into { narrative, charts[] }. The prompt (insight-prompt.js)
 * and the parsing/validation (insight-response.js) are pure and unit-tested; this
 * function is the thin SDK wrapper around them.
 *
 * @param {string} role  reader role (government | dmo | operator | admin)
 * @param {{ appliedFilters: object, data: object[] }} context
 */
export async function generateInsight(role, context) {
  const dataText = JSON.stringify({ appliedFilters: context.appliedFilters, data: context.data });
  const parts = [
    { text: userPrompt(role, context.appliedFilters) },
    { text: `\nDATA:\n${dataText}` },
  ];

  const response = await genai.models.generateContent({
    model: INSIGHT_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', maxOutputTokens: MAX_OUTPUT_TOKENS },
  });

  const raw = response.text;
  if (!raw) throw new Error('Gemini returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Gemini response was not valid JSON');
  }

  const result = parseInsightResponse(parsed, context);
  const rawChartCount = Array.isArray(parsed.charts) ? parsed.charts.length : 0;
  if (rawChartCount !== result.charts.length) {
    logger.warn(
      { role, dropped: rawChartCount - result.charts.length },
      'Dropped invalid chart(s) from Gemini response',
    );
  }
  return result;
}

/**
 * End-to-end for one insight request: assemble the data context, generate the
 * role-framed narrative + charts, and compose the response.
 *
 * No KPIs and no response caching (both backlog); the AI-failure fallback is
 * backlog too (DIH-70). Validation errors (ApiError) propagate; a Gemini
 * rate-limit maps to 429; anything else rethrows (→ 500 via the error handler).
 *
 * @param {{ role: string, regions?: string[], metrics?: string[], period?: string }} params
 * @returns {Promise<{ role: string, appliedFilters: object, narrative: string, charts: object[] }>}
 */
export async function getInsight({ role, regions, metrics, period }) {
  try {
    const context = await assembleInsightContext({ regions, metrics, period });
    const { narrative, charts } = await generateInsight(role, context);
    return { role, appliedFilters: context.appliedFilters, narrative, charts };
  } catch (err) {
    if (err instanceof ApiError) throw err; // validation (400) — propagate
    if (isRateLimit(err)) {
      throw new ApiError(429, 'RATE_LIMITED', 'Gemini rate limit reached — please try again shortly.');
    }
    throw err;
  }
}
