import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * @what  Full-page login form that collects email and password, calls
 *        the AuthContext login function, and redirects to the appropriate
 *        role-based dashboard on success.
 * @why   DIH-1 requires authenticated access. This page is the single
 *        entry point: unauthenticated users are redirected here by the
 *        ProtectedRoute wrapper (DIH-39). After login, the user lands
 *        on their role-specific dashboard automatically.
 * @alternative-considered  A modal login overlay was considered but a
 *        dedicated page is simpler to route-guard and matches the IFQ716
 *        teaching pattern.
 * @module-source  IFQ716 Week 9, login form pattern
 */

const ROLE_ROUTES = {
  admin: '/',
  government: '/government',
  dmo: '/government',
  operator: '/operator'
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      const destination = ROLE_ROUTES[user.role] || '/';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f5f0',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            backgroundColor: '#1a4d3e',
            borderRadius: '12px',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            marginBottom: '1rem'
          }}>
            DIH
          </div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1a1a1a' }}>
            Destination Insight Hubs
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.875rem' }}>
            Sign in to access your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@demo.com"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="DemoPass123!"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#9ca3af' : '#1a4d3e',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#374151'
        }}>
          <strong>Demo accounts</strong> (password: DemoPass123!)
          <div style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
            admin@demo.com (Admin, all regions)<br />
            gov@demo.com (Government, all regions)<br />
            operator@demo.com (Operator, Cairns only)<br />
            dmo@demo.com (DMO, Gold Coast + Noosa)
          </div>
        </div>
      </div>
    </div>
  );
}
