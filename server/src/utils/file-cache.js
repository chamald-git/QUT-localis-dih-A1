import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Tiny TTL cache persisted to a single JSON file. Survives restarts and keeps
 * an in-memory mirror so reads don't hit disk every call. Intended for low
 * write-concurrency use (no file locking).
 *
 * @param {string} filePath absolute path to the JSON store
 * @param {number} ttlMs entry lifetime in milliseconds
 */
export function createFileCache(filePath, ttlMs) {
  let mirror = null;

  async function load() {
    if (mirror) return mirror;
    try {
      mirror = JSON.parse(await readFile(filePath, 'utf8'));
    } catch {
      mirror = {}; // missing or unreadable file → start empty
    }
    return mirror;
  }

  async function get(key, { allowStale = false } = {}) {
    const store = await load();
    const entry = store[key];
    if (!entry) return null;
    if (!allowStale && Date.now() - entry.at > ttlMs) return null;
    return entry.value;
  }

  async function set(key, value) {
    const store = await load();
    store[key] = { at: Date.now(), value };
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, JSON.stringify(store, null, 2));
  }

  return { get, set };
}
