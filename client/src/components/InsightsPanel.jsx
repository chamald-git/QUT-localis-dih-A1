import VegaChart from './VegaChart.jsx';
import { toParagraphs } from '../lib/toParagraphs.js';
import { colorScaleFor } from '../lib/regionLegend.js';

// Metrics needing a forced number format (occupancy is a 0–1 fraction → "80%").
const METRIC_FORMAT = {
  occupancy: { field: 'occupancy_pct', format: '.0%' },
};

/**
 * Renders the AI story returned by /api/insights: a scope line, the narrative,
 * and the chart grid (one VegaChart per chart). Handles loading/error/empty.
 *
 * KPI summary cards are NOT here — those are Sarah's DIH-7; a labelled
 * placeholder marks where they slot in.
 */
export default function InsightsPanel({ insights, loading, error }) {
  if (loading) {
    return <p className="muted">✦ Generating your story…</p>;
  }

  if (error) {
    return (
      <div className="status status-error">
        <span className="dot" />
        <div>
          <strong>Couldn&apos;t generate the story</strong>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const { narrative, charts = [], appliedFilters } = insights;
  const paragraphs = toParagraphs(narrative);
  const period = appliedFilters?.period;
  const regions = appliedFilters?.regions ?? [];
  const colorScale = colorScaleFor(regions);
  const showLegend = regions.length > 1; // one shared legend, only if multi-region

  return (
    <div className="insights-result">
      {appliedFilters && (
        <p className="scope muted">
          {(appliedFilters.regions ?? []).join(', ')}
          {period && ` · ${period.preset?.replace(/_/g, ' ')} (${period.from} → ${period.to})`}
        </p>
      )}

      {/* KPI summary cards are owned by DIH-7 (Sarah) — placeholder slot. */}
      <section className="dashboard-section">
        <h2>Current Snapshot</h2>
        <div className="kpi-placeholder">
          KPI summary cards — owned by DIH-7. Slot reserved.
        </div>
      </section>

      <section className="dashboard-section">
        <article className="insight-panel">
          <h3>The story</h3>
          {paragraphs.length ? (
            paragraphs.map((para, i) => <p key={i}>{para}</p>)
          ) : (
            <p className="muted">No narrative was returned.</p>
          )}
        </article>
      </section>

      <section className="dashboard-section">
        <h2>The charts behind the story</h2>
        {showLegend && (
          <div className="chart-legend" aria-label="Regions">
            {colorScale.domain.map((region, i) => (
              <span className="chart-legend-item" key={region}>
                <span className="chart-legend-swatch" style={{ background: colorScale.range[i] }} />
                {region}
              </span>
            ))}
          </div>
        )}
        {charts.length ? (
          <div className="chart-grid">
            {charts.map((chart, i) => (
              <article className="chartbox" key={`${chart.metric}-${i}`}>
                <h3>{chart.title ?? chart.metric}</h3>
                {chart.caption && <p className="cap muted">{chart.caption}</p>}
                <VegaChart
                  spec={chart.chartSpec}
                  data={chart.data}
                  valueFormat={METRIC_FORMAT[chart.metric]}
                  colorScale={colorScale}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No charts were returned.</p>
        )}
      </section>
    </div>
  );
}
