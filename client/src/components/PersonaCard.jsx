import VegaChart from './VegaChart.jsx';

const LABELS = {
  government: 'Government',
  admin: 'Admin',
  operator: 'Operator',
};

/**
 * One card per persona: title, AI narrative, and the Vega-Lite chart. Handles
 * its own loading / error / empty states for this persona's fetch.
 */
export default function PersonaCard({ persona, insight, error, loading }) {
  return (
    <section className="card persona-card">
      <h2>{LABELS[persona] ?? persona}</h2>

      {loading && <p className="muted">Loading insight…</p>}

      {error && (
        <div className="status status-error">
          <span className="dot" />
          <p className="muted">{error}</p>
        </div>
      )}

      {insight && (
        <>
          {insight.narrative.split('\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {insight.chartSpec ? (
            <VegaChart spec={insight.chartSpec} rows={insight.data} />
          ) : (
            <p className="muted">No chart available for this insight.</p>
          )}
        </>
      )}
    </section>
  );
}
