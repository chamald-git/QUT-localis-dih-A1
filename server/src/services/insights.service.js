import { knex } from '../db/knex.js';
import { createInsightCache } from './gemini-cache.service.js';

/**
 * Fetches every daily occupancy row for the last 90 days, for every region, in
 * a single Knex query (one round-trip). Rows are returned RAW and unrounded —
 * the full daily series is handed to Gemini so it can reason over trends; any
 * rounding, percent scaling and number coercion are the UI's responsibility.
 *
 * Returned as a single flat array of region-day rows — Gemini consumes one
 * flat file, no per-region nesting.
 *
 * NOTE: no per-request timestamp in the payload — this object becomes the
 * cached prompt prefix, which must stay byte-identical for implicit caching
 * to hit. Stamp request time outside this blob if you need it.
 *
 * @returns {Promise<{ datasets: string[], rows: Array }>}
 */
export async function assembleInsightContext() {
  // Subquery: the 90 most-recent distinct dates in the dataset.
  const latest90 = knex('occupancy')
    .distinct('date')
    .orderBy('date', 'desc')
    .limit(90);

  // Single query: join those dates back to the data, fanned across all regions.
  // Returned flat (one row per region-day) — Gemini takes a single flat file.
  const rows = await knex('occupancy as o')
    .join('regions as r', 'r.id', 'o.region_id')
    .join(latest90.as('d'), 'd.date', 'o.date')
    .orderBy(['r.name', 'o.date'])
    .select('r.name as region', 'o.date', 'o.occupancy_pct', 'o.adr');

  return {
    datasets: ['occupancy'],
    rows,
  };
}

/**
 * Assembles the insight context and uploads it once, returning a stable prefix
 * part to place FIRST in generateContent (free-tier implicit caching reuses it
 * across requests — explicit caches.create is paid-only).
 *
 * @returns {Promise<{ context: object, uploadedFile: object, prefixPart: object }>}
 */
export async function buildInsightCache() {
  const context = await assembleInsightContext();
  const cache = await createInsightCache(context);
  return { context, ...cache };
}

let cachePromise = null;

/**
 * Memoised cache: assemble + upload + cache the context once per process and
 * reuse the cache handle for all persona prompts (cache TTL is 24h; restart to
 * refresh). On failure the memo is cleared so the next call retries.
 *
 * @returns {Promise<{ context: object, uploadedFile: object, cacheName: string|null, dataPart: object, tokens: number }>}
 */
export function getInsightCache() {
  if (!cachePromise) {
    cachePromise = buildInsightCache().catch((err) => {
      cachePromise = null;
      throw err;
    });
  }
  return cachePromise;
}
