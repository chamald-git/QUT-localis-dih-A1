/**
 * Build a layered Vega-Lite geoshape (choropleth) spec for one metric's snapshot.
 *
 * Three layers:
 *   1. a Queensland backdrop (passed in, inline) for geographic context;
 *   2. a base layer that draws ALL region outlines with a neutral fill (so every
 *      border shows, even regions with no data — Vega-Lite drops null values from
 *      a quantitative colour layer, so the borders must come from this flat layer);
 *   3. the shaded layer — selected regions coloured by value, drawn on top.
 *
 * Rendering contract with <VegaChart>: VegaChart injects the `data` prop into the
 * top-level `spec.data.values`, which the region layer inherits — so the caller
 * passes ALL region features (each with `properties.value` set to a number, or
 * null when that region wasn't selected). The colour scale is normalised to the
 * metric's own min/max (units differ between metrics). The per-chart Vega legend
 * is disabled by VegaChart; the component draws an HTML scale legend instead.
 *
 * @param {{ stateFeature: object, scale: {min:number, max:number} }} args
 * @returns {object} layered Vega-Lite spec (region layer reads VegaChart's data)
 */

// Brand greens, mid → dark = lower → higher. Starts at a saturated mid-green (not
// near-white) so even the lowest region and the small SE LGAs read clearly.
export const CHOROPLETH_RANGE = ['#5a9e80', '#2b7a59', '#08271d'];

const BACKDROP_FILL = '#e7ece8'; // pale land behind the regions
const BACKDROP_STROKE = '#cdd8d1';
const REGION_STROKE = '#0b3a2c'; // dark border so every region is distinct
const NODATA_FILL = '#f2f6f4'; // selected-but-empty / unselected regions

export function buildChoroplethSpec({ stateFeature, scale }) {
  const min = scale?.min ?? 0;
  const max = scale?.max ?? 1;
  // Avoid a zero-width domain (e.g. one region, or equal values) which Vega can't scale.
  const domain = min === max ? [min, min + 1] : [min, max];

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    height: 230,
    projection: { type: 'mercator' },
    layer: [
      {
        data: { values: [stateFeature] },
        mark: { type: 'geoshape', fill: BACKDROP_FILL, stroke: BACKDROP_STROKE, strokeWidth: 0.8 },
      },
      {
        // Base outlines — all regions (inherits VegaChart's top-level features).
        mark: { type: 'geoshape', fill: NODATA_FILL, stroke: REGION_STROKE, strokeWidth: 1.3 },
        encoding: { tooltip: [{ field: 'properties.region', type: 'nominal', title: 'Region' }] },
      },
      {
        // Shaded layer — selected regions on top (null values are dropped here).
        mark: { type: 'geoshape', stroke: REGION_STROKE, strokeWidth: 1.3 },
        encoding: {
          color: {
            field: 'properties.value',
            type: 'quantitative',
            scale: { domain, range: CHOROPLETH_RANGE },
            legend: null,
          },
          tooltip: [
            { field: 'properties.region', type: 'nominal', title: 'Region' },
            { field: 'properties.value', type: 'quantitative', title: 'Value' },
          ],
        },
      },
    ],
  };
}
