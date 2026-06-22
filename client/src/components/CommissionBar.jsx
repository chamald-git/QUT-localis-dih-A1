/**
 * GEN-1 commission bar for the Government story page: pick regions, metrics and
 * a period, then Generate. Controlled component — the page owns the selection.
 *
 * Options are hardcoded to the sets the endpoint supports. Period uses the
 * endpoint presets (no custom range). "Spend by category" is a separate dataset
 * (region × category) the endpoint adds when requested — it renders as its own
 * spend-by-category chart rather than a date-trend line.
 */

export const REGION_OPTIONS = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

export const METRIC_OPTIONS = [
  { value: 'occupancy', label: 'Occupancy' },
  { value: 'adr', label: 'ADR' },
  { value: 'length_of_stay', label: 'Length of stay' },
  { value: 'booking_window', label: 'Booking window' },
  { value: 'spend', label: 'Spend by category' },
];

export const PERIOD_OPTIONS = [
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_60_days', label: 'Last 60 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
];

export default function CommissionBar({ value, onChange, onGenerate, loading, hasResult }) {
  function toggle(key, item) {
    const next = new Set(value[key]);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    onChange({ ...value, [key]: [...next] });
  }

  return (
    <section className="commission-bar" aria-label="Choose your analysis">
      <div className="commission-group">
        <span className="commission-label">Regions</span>
        <div className="commission-opts">
          {REGION_OPTIONS.map((region) => (
            <label key={region} className={value.regions.includes(region) ? 'opt on' : 'opt'}>
              <input
                type="checkbox"
                checked={value.regions.includes(region)}
                onChange={() => toggle('regions', region)}
              />
              {region}
            </label>
          ))}
        </div>
      </div>

      <div className="commission-group">
        <span className="commission-label">Metrics</span>
        <div className="commission-opts">
          {METRIC_OPTIONS.map((metric) => (
            <label
              key={metric.value}
              className={value.metrics.includes(metric.value) ? 'opt on' : 'opt'}
            >
              <input
                type="checkbox"
                checked={value.metrics.includes(metric.value)}
                onChange={() => toggle('metrics', metric.value)}
              />
              {metric.label}
            </label>
          ))}
        </div>
      </div>

      <div className="commission-group">
        <span className="commission-label">Period</span>
        <select
          className="commission-period"
          value={value.period}
          onChange={(e) => onChange({ ...value, period: e.target.value })}
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn commission-generate"
        onClick={onGenerate}
        disabled={loading || value.metrics.length === 0}
      >
        {loading ? 'Generating…' : hasResult ? '↻ Regenerate' : '✦ Generate story'}
      </button>
    </section>
  );
}
