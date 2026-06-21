/**
 * Force a d3 number format onto a metric's y-axis (and its tooltip entry) in a
 * Vega-Lite spec — used so occupancy (a 0–1 fraction) reads "80%" not "0.8".
 *
 * This is deterministic from the metric, so the client owns it: the model keeps
 * misplacing the format (e.g. encoding.y.format, which Vega-Lite ignores, instead
 * of encoding.y.axis.format). Walks single-view and layered specs; never mutates
 * the input.
 *
 * @param {object} spec    Vega-Lite spec
 * @param {string} [field] the data field to format (e.g. 'occupancy_pct')
 * @param {string} [format] d3 format string (e.g. '.0%')
 * @returns {object}
 */
export function applyValueFormat(spec, field, format) {
  if (!spec || typeof spec !== 'object' || !field || !format) return spec;

  const fmtEncoding = (enc) => {
    if (!enc || typeof enc !== 'object') return enc;
    const next = { ...enc };
    // y is the metric in these charts → format its axis ticks.
    if (next.y && typeof next.y === 'object') {
      next.y = { ...next.y, axis: { ...(next.y.axis || {}), format } };
    }
    // tooltip entries for this field.
    if (Array.isArray(next.tooltip)) {
      next.tooltip = next.tooltip.map((t) => (t && t.field === field ? { ...t, format } : t));
    } else if (next.tooltip && next.tooltip.field === field) {
      next.tooltip = { ...next.tooltip, format };
    }
    return next;
  };

  const visit = (node) => {
    if (!node || typeof node !== 'object') return node;
    const next = { ...node };
    if (next.encoding) next.encoding = fmtEncoding(next.encoding);
    if (Array.isArray(next.layer)) next.layer = next.layer.map(visit);
    return next;
  };

  return visit(spec);
}
