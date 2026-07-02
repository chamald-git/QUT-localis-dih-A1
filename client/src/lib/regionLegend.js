/**
 * Shared region → colour mapping so the charts and the single HTML legend agree.
 *
 * The charts are separate vega embeds, so there's no native shared legend. We
 * pin an explicit colour scale into each chart's spec (applyColorScale) and
 * render one HTML legend from the same mapping (colorScaleFor) under the section
 * title, instead of a legend inside every chart.
 */

// Tableau-10 hues — distinct and chart-friendly.
export const REGION_COLORS = {
  Cairns: '#4c78a8',
  'Gold Coast': '#f58518',
  Noosa: '#54a24b',
  Whitsundays: '#e45756',
};

const FALLBACK = ['#4c78a8', '#f58518', '#54a24b', '#e45756', '#72b7b2', '#b279a2'];

/**
 * Build a Vega-Lite color scale ({ domain, range }) for the given regions, in
 * order, so the HTML legend and the charts use identical colours.
 */
export function colorScaleFor(regions = []) {
  const domain = [...regions];
  const range = domain.map((r, i) => REGION_COLORS[r] ?? FALLBACK[i % FALLBACK.length]);
  return { domain, range };
}

/**
 * Pin the colour scale onto a spec's color encoding (top-level + any layers).
 * Pure; returns a new spec.
 */
export function applyColorScale(spec, scale) {
  if (!spec || typeof spec !== 'object' || !scale) return spec;

  const setColor = (enc) => {
    if (!enc || typeof enc !== 'object' || !enc.color || typeof enc.color !== 'object') return enc;
    return { ...enc, color: { ...enc.color, scale: { domain: scale.domain, range: scale.range } } };
  };

  const visit = (node) => {
    if (!node || typeof node !== 'object') return node;
    const next = { ...node };
    if (next.encoding) next.encoding = setColor(next.encoding);
    if (Array.isArray(next.layer)) next.layer = next.layer.map(visit);
    return next;
  };

  return visit(spec);
}
