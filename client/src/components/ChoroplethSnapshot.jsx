import VegaChart from './VegaChart.jsx';
import { qldRegions, queensland } from '../lib/qldRegions.geo.js';
import { buildChoroplethSpec, CHOROPLETH_RANGE } from '../lib/choroplethSpec.js';

/**
 * The Government dashboard's "Current Snapshot": one small-multiple choropleth per
 * metric, each shading the selected QLD regions by that metric's period value.
 * Replaces the DIH-7 KPI-card placeholder. Values are server-computed (the
 * `snapshot` field from /api/insights) — see insight-snapshot.js; the maps are
 * pure data→colour, never AI-generated.
 *
 * Spend is already excluded server-side (region×category, no single value).
 */

const METRIC_META = {
  occupancy: { label: 'Avg occupancy', format: (v) => `${(v * 100).toFixed(1)}%` },
  adr: { label: 'Avg daily rate', format: (v) => `$${Math.round(v).toLocaleString()}` },
  length_of_stay: { label: 'Length of stay', format: (v) => `${v.toFixed(1)} nights` },
  booking_window: { label: 'Booking window', format: (v) => `${Math.round(v)} days` },
};

// Interpolate the choropleth green range at t∈[0,1] for the value swatches, so the
// list dots match the map shading.
const STOPS = CHOROPLETH_RANGE.map((h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
});
function colorAt(t) {
  const c = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  const seg = c * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(seg));
  const f = seg - i;
  const [r, g, b] = [0, 1, 2].map((k) => Math.round(STOPS[i][k] + (STOPS[i + 1][k] - STOPS[i][k]) * f));
  return `rgb(${r}, ${g}, ${b})`;
}

function SnapshotCard({ entry }) {
  const meta = METRIC_META[entry.metric];
  const { min, max } = entry.scale;
  const span = max - min || 1;
  const ranked = [...entry.regions].sort((a, b) => b.value - a.value);
  const valueByRegion = new Map(entry.regions.map((r) => [r.region, r.value]));
  // Draw EVERY region (so all borders show); pre-join the value onto each feature
  // — null where that region wasn't selected (rendered as a neutral no-data fill).
  // (Vega-Lite lookup over inline GeoJSON is unreliable, so we merge in JS and
  // colour on properties.value.)
  const features = qldRegions.features.map((f) => ({
    ...f,
    properties: { ...f.properties, value: valueByRegion.get(f.properties.region) ?? null },
  }));

  return (
    <article className="choro-card">
      <h3 className="choro-card-title">{meta.label}</h3>
      <VegaChart spec={buildChoroplethSpec({ stateFeature: queensland, scale: entry.scale })} data={features} />
      <ul className="choro-values">
        {ranked.map((r) => (
          <li key={r.region}>
            <span className="choro-swatch" style={{ background: colorAt((r.value - min) / span) }} />
            <span className="choro-region">{r.region}</span>
            <span className="choro-value">{meta.format(r.value)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function ChoroplethSnapshot({ snapshot = [] }) {
  const entries = snapshot.filter((s) => METRIC_META[s.metric] && s.regions?.length);
  if (!entries.length) return null;

  return (
    <div className="choro-snapshot">
      <div className="choro-scale" aria-hidden="true">
        <span>Lower</span>
        <span className="choro-grad" />
        <span>Higher</span>
        <span className="choro-scale-note">· shaded within each metric</span>
      </div>
      <div className="choro-grid">
        {entries.map((entry) => (
          <SnapshotCard key={entry.metric} entry={entry} />
        ))}
      </div>
    </div>
  );
}
