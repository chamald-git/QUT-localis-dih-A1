import { useEffect, useRef } from 'react';
import embed from 'vega-embed';

/**
 * Renders a Vega-Lite spec with vega-embed. The spec from the API uses a named
 * data source (data: { name: 'table' }) and carries no inline data, so we bind
 * the rows here via the top-level `datasets` property. occupancy_pct and adr
 * arrive as strings (mysql2 DECIMAL) — coerced to numbers so quantitative
 * encodings plot correctly.
 */
export default function VegaChart({ spec, rows }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !spec) return;

    const values = (rows ?? []).map((r) => ({
      ...r,
      occupancy_pct: Number(r.occupancy_pct),
      adr: Number(r.adr),
    }));

    const fullSpec = { ...spec, datasets: { table: values }, width: 'container' };

    let view;
    embed(ref.current, fullSpec, { actions: false })
      .then((result) => {
        view = result.view;
      })
      .catch(() => {
        if (ref.current) ref.current.textContent = 'Chart could not be rendered.';
      });

    return () => view?.finalize();
  }, [spec, rows]);

  return <div className="chart" ref={ref} />;
}
