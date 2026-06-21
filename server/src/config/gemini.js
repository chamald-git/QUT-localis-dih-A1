import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

// Default 2.5 Flash — reliable Vega-Lite specs at low cost. Override with
// GEMINI_MODEL to switch. (Documented limits: 1,048,576-token context window,
// 65,536 max output tokens — see ai.google.dev/gemini-api/docs/models.)
export const INSIGHT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let client = null;

/**
 * Lazily construct the GoogleGenAI client on first use rather than at import.
 * This lets the server boot and serve the committed insight cache WITHOUT a
 * GEMINI_API_KEY (teammates can pull the repo and view results); the key is
 * only required when a live Gemini call is actually made.
 */
function init() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required but not set in environment');
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

// Proxy so existing `genai.files` / `genai.models` / `genai.caches` call sites
// are unchanged; the real client is created on first property access.
export const genai = new Proxy(
  {},
  {
    get(_target, prop) {
      return init()[prop];
    },
  }
);
