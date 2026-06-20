import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import PersonaCard from '../components/PersonaCard.jsx';

const PERSONAS = ['government', 'admin', 'operator'];

/**
 * Prototype insights page: one card per persona, each showing the
 * AI-generated narrative and Vega-Lite chart fetched from /api/insights.
 */
export default function InsightsPage() {
  const [insights, setInsights] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all(
      PERSONAS.map((persona) =>
        api
          .getInsight(persona)
          .then((data) => ({ persona, data }))
          .catch((err) => ({ persona, error: err.message }))
      )
    ).then((results) => {
      if (cancelled) return;
      const nextInsights = {};
      const nextErrors = {};
      for (const r of results) {
        if (r.error) nextErrors[r.persona] = r.error;
        else nextInsights[r.persona] = r.data;
      }
      setInsights(nextInsights);
      setErrors(nextErrors);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell shell-wide">
      <header className="brand">
        <div className="brand-mark">DIH</div>
        <div>
          <h1>Destination Insight Hubs</h1>
          <p className="subtitle">AI insights — prototype</p>
        </div>
      </header>

      <p>
        <Link className="muted" to="/">
          ← Back to home
        </Link>
      </p>

      <div className="persona-grid">
        {PERSONAS.map((persona) => (
          <PersonaCard
            key={persona}
            persona={persona}
            insight={insights[persona]}
            error={errors[persona]}
            loading={loading && !insights[persona] && !errors[persona]}
          />
        ))}
      </div>

      <footer className="foot muted">
        Localis Technologies Australia · IFQ717 Capstone
      </footer>
    </main>
  );
}
