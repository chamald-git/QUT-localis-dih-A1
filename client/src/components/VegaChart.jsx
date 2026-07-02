import { useEffect, useRef, useState } from 'react';
import vegaEmbed from 'vega-embed';
import { applyValueFormat } from '../lib/applyValueFormat.js';
import { applyColorScale } from '../lib/regionLegend.js';
import { applyAxisStyle } from '../lib/applyAxisStyle.js';

/**
 * Renders one Vega-Lite chart from the AI's chartSpec plus the rows the server
 * attached separately.
 *
 * Chart STYLING (axis titles, no in-spec title, date axis) comes from the Gemini
 * prompt. The CLIENT owns what's deterministic or cross-chart: WIDTH (sized to
 * the container — measuring/observing the stable outer element, never the render
 * target, which would feed back into an infinite resize), the metric number
 * FORMAT (e.g. occupancy → "80%"), the region COLOUR scale, and disabling the
 * per-chart legend (one shared HTML legend is rendered for the whole grid).
 */
export default function VegaChart({ spec, data = [], actions = false, valueFormat, colorScale }) {
  const containerRef = useRef(null); // stable, layout-sized — measure + observe this
  const chartRef = useRef(null); // vega renders into here
  const [error, setError] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    const target = chartRef.current;
    if (!spec || !container || !target) return undefined;
    setError(null);

    let result;
    let cancelled = false;
    let applied = -1; // last width pushed to the view, to skip redundant updates

    const widthOf = () => Math.max(0, Math.floor(container.clientWidth));

    // House axis styling (sparse month labels, no gridlines), then region
    // colours, then the metric number format (layered onto the y axis).
    let prepared = applyAxisStyle(spec);
    if (colorScale) prepared = applyColorScale(prepared, colorScale);
    if (valueFormat) prepared = applyValueFormat(prepared, valueFormat.field, valueFormat.format);

    applied = widthOf() || 600;
    const embedSpec = {
      ...prepared,
      width: applied,
      // Fit the WHOLE chart (axes included) inside the width so it never
      // overflows its box.
      autosize: { type: 'fit', contains: 'padding' },
      data: { values: Array.isArray(data) ? data : [] },
      // One shared HTML legend covers the grid — turn off the per-chart legend.
      config: {
        ...prepared.config,
        legend: { ...(prepared.config && prepared.config.legend), disable: true },
      },
    };

    vegaEmbed(target, embedSpec, { actions, renderer: 'svg' })
      .then((r) => {
        if (cancelled) {
          r.view.finalize();
          return;
        }
        result = r;
        // Guard against specs that embed without error but draw no data marks
        // (e.g. the model referenced a field that does not exist) — show a
        // message instead of a silent blank.
        let drawn = 0;
        target.querySelectorAll('g[class*="role-mark"]').forEach((g) => {
          drawn += g.querySelectorAll('path, rect, line, circle, text, symbol').length;
        });
        if (drawn === 0) setError('This chart returned no data to plot.');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    // Observe the stable container so resizing the chart can't feed back; only
    // react to real width changes.
    const observer = new ResizeObserver(() => {
      const w = widthOf();
      if (result && w > 0 && Math.abs(w - applied) > 2) {
        applied = w;
        result.view.width(w).runAsync();
      }
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
      if (result) result.view.finalize();
    };
  }, [spec, data, actions, valueFormat, colorScale]);

  if (!spec) return null;

  return (
    <div className="vega-chart" ref={containerRef}>
      <div ref={chartRef} style={error ? { display: 'none' } : undefined} />
      {error && <p className="chart-error">Chart failed to render: {error}</p>}
    </div>
  );
}
