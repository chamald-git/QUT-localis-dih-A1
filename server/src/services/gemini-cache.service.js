import { genai } from '../config/gemini.js';

/**
 * gemini-2.5-flash documented limits (stick to these):
 *   input context window : 1,048,576 tokens
 *   max output tokens    : 65,536
 *   caching minimum      : 2,048 tokens
 * Sources: ai.google.dev/gemini-api/docs/models and /docs/caching
 */
// Default 2.5 Flash — reliable Vega-Lite specs at low cost. Override with
// GEMINI_MODEL if you ever switch (note: an explicit cache is model-bound, so
// changing this invalidates a cache built for the previous model).
export const INSIGHT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const MODEL_LIMITS = Object.freeze({
  contextWindow: 1_048_576,
  maxOutputTokens: 65_536,
  cacheMinTokens: 2_048,
});

const CACHE_DISPLAY_NAME = 'dih-insight-context';
const CACHE_TTL = '86400s'; // 24h

/**
 * Uploads the insight context and creates an explicit Gemini cache for it
 * (a paid feature). Two deliberate choices:
 *  - Uploaded as text/plain: an application/json fileData part causes a 500
 *    INTERNAL at generation time; text/plain is read fine.
 *  - If the payload is below the model's 2,048-token cache minimum we skip the
 *    cache and return the data part for inlining instead.
 *
 * @returns {Promise<{ uploadedFile: object, cacheName: string|null, dataPart: object, tokens: number }>}
 */
export async function createInsightCache(insightContext) {
  const text = JSON.stringify(insightContext, null, 2);

  const uploadedFile = await genai.files.upload({
    file: new Blob([text], { type: 'text/plain' }),
    config: { mimeType: 'text/plain', displayName: `${CACHE_DISPLAY_NAME}.txt` },
  });

  const fileUri = uploadedFile.uri ?? uploadedFile.name;
  if (!fileUri) {
    throw new Error('Gemini file upload did not return a URI');
  }
  const dataPart = { fileData: { fileUri, mimeType: 'text/plain' } };

  // Respect the caching minimum — count tokens before attempting to cache.
  const { totalTokens } = await genai.models.countTokens({
    model: INSIGHT_MODEL,
    contents: text,
  });
  if (totalTokens < MODEL_LIMITS.cacheMinTokens) {
    return { uploadedFile, cacheName: null, dataPart, tokens: totalTokens };
  }

  const cache = await genai.caches.create({
    model: INSIGHT_MODEL,
    config: {
      displayName: CACHE_DISPLAY_NAME,
      ttl: CACHE_TTL,
      contents: [{ role: 'user', parts: [dataPart] }],
    },
  });

  return {
    uploadedFile,
    cacheName: cache.name,
    dataPart,
    tokens: cache.usageMetadata?.totalTokenCount ?? totalTokens,
  };
}
