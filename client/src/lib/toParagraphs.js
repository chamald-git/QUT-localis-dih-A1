/**
 * Split the AI narrative into trimmed, non-empty paragraphs for rendering.
 *
 * @param {unknown} narrative
 * @returns {string[]}
 */
export function toParagraphs(narrative) {
  if (typeof narrative !== 'string') return [];
  return narrative
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
