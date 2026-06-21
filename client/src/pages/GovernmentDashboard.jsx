import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import CommissionBar from '../components/CommissionBar.jsx';
import InsightsPanel from '../components/InsightsPanel.jsx';

// Mirrors the endpoint defaults (all regions / occupancy+adr / last 90 days).
const DEFAULT_SELECTION = {
  regions: ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'],
  metrics: ['occupancy', 'adr'],
  period: 'last_90_days',
};

/**
 * AI storytelling dashboard for the Government role (DIH-14 / wireframe GEN-1+2).
 * The user commissions an analysis; the AI returns a narrative + charts. Role is
 * hardcoded 'government' (this is the Government page); auth/JWT arrives later.
 */
export default function GovernmentDashboard() {
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getInsights({ ...selection, role: 'government' });
      setInsights(result.data);
    } catch (err) {
      setInsights(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasResult = Boolean(insights);
  const showEmptyPrompt = !hasResult && !loading && !error;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Destination Insight Hubs</p>
          <h1>AI storytelling dashboard — Government</h1>
          <p className="subtitle">
            Choose what you&apos;d like to understand; the AI reads the live data and writes the story.
          </p>
        </div>
        <div className="user-pill">
          <span>government</span>
          <strong>Full access</strong>
        </div>
      </header>

      <CommissionBar
        value={selection}
        onChange={setSelection}
        onGenerate={generate}
        loading={loading}
        hasResult={hasResult}
      />

      {showEmptyPrompt && (
        <div className="empty-prompt">
          <div className="empty-prompt-mark">✦</div>
          <strong>Your story will appear here</strong>
          <p className="muted">
            Pick regions, metrics and a period above, then press Generate story.
          </p>
        </div>
      )}

      <InsightsPanel insights={insights} loading={loading} error={error} />

      <nav className="links">
        <Link className="btn" to="/">
          ← Home
        </Link>
      </nav>
    </main>
  );
}
