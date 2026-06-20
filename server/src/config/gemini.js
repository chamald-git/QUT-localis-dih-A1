import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

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
