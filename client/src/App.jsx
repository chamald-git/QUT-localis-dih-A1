import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api/client.js';

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkHealth() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getHealth();
      setHealth(result);
    } catch (err) {
      setError(err.message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  const dbConnected = health?.db === 'connected';

  return (
    <main className="shell">
      <header className="brand">
        <div className="brand-mark">DIH</div>
        <div>
          <h1>Destination Insight Hubs</h1>
          <p className="subtitle">Phase 0 — environment scaffold</p>
        </div>
      </header>

      <section className="card">
        <h2>System health</h2>

        {loading && <p className="muted">Checking…</p>}

        {error && (
          <div className="status status-error">
            <span className="dot" />
            <div>
              <strong>API unreachable</strong>
              <p className="muted">{error}</p>
              <p className="muted">
                Is the server running? Try <code>npm run dev:server</code>.
              </p>
            </div>
          </div>
        )}

        {health && (
          <div
            className={`status ${dbConnected ? 'status-ok' : 'status-warn'}`}
          >
            <span className="dot" />
            <div>
              <strong>
                {dbConnected
                  ? 'All systems connected'
                  : 'API up, database disconnected'}
              </strong>
              <p className="muted">
                status: <code>{health.status}</code> &nbsp;|&nbsp; db:{' '}
                <code>{health.db}</code>
              </p>
              {!dbConnected && (
                <p className="muted">
                  Start MySQL with <code>npm run db:up</code>.
                </p>
              )}
            </div>
          </div>
        )}

        <button className="btn" onClick={checkHealth} disabled={loading}>
          Re-check
        </button>
      </section>

      <nav className="links">
        <Link className="btn" to="/operator">
          Tourism operator dashboard →
        </Link>
        <Link className="btn" to="/government">
          Government AI insights →
        </Link>
      </nav>

      <footer className="foot muted">
        Localis Technologies Australia · IFQ717 Capstone
      </footer>
    </main>
  );
}
