/**
 * House axis styling for the story charts, applied client-side so it's
 * consistent and reliable regardless of what the model emits:
 *  - no axis titles (the card title + narrative describe the axes)
 *  - sparse date labels: one tick per month, "%b %y" → "Jul 24" (hover gives the exact date)
 *  - no gridlines (cleaner; values are read via hover)
 *
 * Walks single-view and layered specs; never mutates the input. The metric
 * number format (e.g. occupancy "%") is layered on afterwards by applyValueFormat.
 *
 * @param {object} spec
 * @returns {object}
 */
export function applyAxisStyle(spec) {
  if (!spec || typeof spec !== 'object') return spec;

  const styleEnc = (enc) => {
    if (!enc || typeof enc !== 'object') return enc;
    const next = { ...enc };
    if (next.x && typeof next.x === 'object') {
      next.x = {
        ...next.x,
        axis: {
          ...(next.x.axis || {}),
          title: null,
          grid: false,
          tickCount: 'month',
          format: '%b %y',
          labelAngle: 0,
        },
      };
    }
    if (next.y && typeof next.y === 'object') {
      next.y = { ...next.y, axis: { ...(next.y.axis || {}), title: null, grid: false } };
    }
    return next;
  };

  const visit = (node) => {
    if (!node || typeof node !== 'object') return node;
    const out = { ...node };
    if (out.encoding) out.encoding = styleEnc(out.encoding);
    if (Array.isArray(out.layer)) out.layer = out.layer.map(visit);
    return out;
  };

  return visit(spec);
}
