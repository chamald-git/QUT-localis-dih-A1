import { fileURLToPath } from 'node:url';
import { genai } from '../config/gemini.js';
import { getInsightCache } from './insights.service.js';
import { INSIGHT_MODEL } from './gemini-cache.service.js';
import { logger } from '../utils/logger.js';
import { createFileCache } from '../utils/file-cache.js';

// Persisted response cache keyed by persona — a hit returns the stored result
// without any Gemini call. TTL matches the 24h data cache; delete the file to
// force regeneration (e.g. after reseeding the DB).
const RESPONSE_TTL_MS = 24 * 60 * 60 * 1000;
const cacheFile = fileURLToPath(new URL('../../.cache/insights.json', import.meta.url));
const responseCache = createFileCache(cacheFile, RESPONSE_TTL_MS);

// Bounded well under the model's 65,536 output-token cap. The chart carries no
// inline data (see prompt), so the response stays small.
const MAX_OUTPUT_TOKENS = 8_192;

/**
 * Persona-specific framing. The data and output contract are shared; only the
 * analytical lens changes per reader (LLM-5).
 */
const PERSONAS = {
  government:
    'The reader is a local government tourism officer. Focus on the visitor economy across all four LGAs, regional comparisons, and trends that inform policy and funding.',
  admin:
    'The reader is a platform administrator. Give an at-a-glance overview of every region, data coverage, and any anomalies worth monitoring.',
  operator:
    'The reader is a tourism operator. Focus on competitive context — how occupancy and average daily rate (ADR) are tracking and what that means for pricing decisions.',
};

export const VALID_PERSONAS = Object.keys(PERSONAS);

/**
 * Persona prompt goes in the USER message (not systemInstruction): a request
 * that references cachedContent cannot also set systemInstruction.
 */
function userPrompt(persona) {
  return [
    'You are an analyst for Destination Insight Hubs, explaining Queensland tourism occupancy data to a non-technical reader.',
    'The provided data is the last 90 days of daily occupancy for four regions. Each row has: region, date, occupancy_pct (a fraction 0–1), adr (average daily rate in AUD).',
    PERSONAS[persona],
    'Write in plain English with no jargon. Call out peaks, troughs and notable differences between regions.',
    'Reply with ONLY a JSON object (no markdown fences) with exactly these keys:',
    '"persona": the persona string;',
    '"narrative": 2–4 short plain-English paragraphs;',
    '"chartSpec": a valid Vega-Lite v5 spec for the most relevant trend. Do NOT inline any data — set "data": {"name": "table"} and the client supplies the rows. Include mark, an encoding (x = date temporal, y = the relevant quantitative field, color = region nominal) and a title.',
    `Generate the insight for the "${persona}" persona.`,
  ].join('\n');
}

/**
 * Structural sanity check on the returned Vega-Lite spec. Full schema
 * validation isn't practical (Vega-Lite is open-ended), but requiring a mark
 * and an x/y encoding catches the common cheap-model failure modes (e.g. a
 * spec with no mark). A spec that fails is dropped, not fatal — the narrative
 * still renders.
 */
function isValidChartSpec(spec) {
  if (!spec || typeof spec !== 'object') return false;
  if (!spec.mark) return false; // string ('line') or object ({ type: 'line' })
  const enc = spec.encoding;
  return Boolean(enc && typeof enc === 'object' && enc.x && enc.y);
}

/**
 * Calls Gemini with the cached data (when available) plus the small per-request
 * persona prompt, then parses the structured JSON into
 * { persona, narrative, chartSpec } (LLM-2 + LLM-6).
 */
export async function generateInsight(persona, { cacheName, dataPart }) {
  // When cached, the data already lives in the cache; otherwise inline it first.
  const parts = cacheName
    ? [{ text: userPrompt(persona) }]
    : [dataPart, { text: userPrompt(persona) }];

  const config = {
    responseMimeType: 'application/json',
    maxOutputTokens: MAX_OUTPUT_TOKENS,
  };
  if (cacheName) config.cachedContent = cacheName;

  const response = await genai.models.generateContent({
    model: INSIGHT_MODEL,
    contents: [{ role: 'user', parts }],
    config,
  });

  const raw = response.text;
  if (!raw) throw new Error('Gemini returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Gemini response was not valid JSON');
  }

  let chartSpec = parsed.chartSpec ?? null;
  if (chartSpec && !isValidChartSpec(chartSpec)) {
    logger.warn({ persona }, 'Gemini returned an invalid Vega-Lite chartSpec; dropping it');
    chartSpec = null;
  }

  return {
    persona,
    narrative: parsed.narrative ?? '',
    chartSpec,
  };
}

/**
 * End-to-end: reuse the memoised data cache, generate an insight, and attach
 * the rows so the response is chart-ready — the client binds `data` to the
 * chartSpec's named "table" dataset (datasets: { table: data }).
 */
export async function getInsight(persona) {
  const cached = await responseCache.get(persona);
  if (cached) return cached;

  try {
    const cache = await getInsightCache();
    const insight = await generateInsight(persona, cache);
    const result = { ...insight, data: cache.context.rows };
    await responseCache.set(persona, result);
    return result;
  } catch (err) {
    // No key / DB / API failure — serve the committed cache even if stale so
    // teammates without a GEMINI_API_KEY can still see results.
    const stale = await responseCache.get(persona, { allowStale: true });
    if (stale) {
      logger.warn({ persona, err: err.message }, 'Serving stale cached insight (live generation unavailable)');
      return stale;
    }
    throw err;
  }
}
