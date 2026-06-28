import { useState } from 'react';

const ROLES = ['admin', 'government', 'dmo', 'operator'];
const TIERS = ['full', 'spend-only'];

export default function AdminUserForm({ mode, initialValues = {}, regions, onSubmit, onCancel }) {
  const [email, setEmail] = useState(initialValues.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialValues.role ?? 'operator');
  const [selectedRegions, setSelectedRegions] = useState(initialValues.regions ?? []);
  const [tier, setTier] = useState(initialValues.tier ?? 'full');
  const [submitting, setSubmitting] = useState(false);

  function toggleRegion(region) {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      email,
      role,
      regions: selectedRegions,
      tier
    };

    if (mode === 'create') {
      payload.password = password;
    }

    try {
      await onSubmit(payload);
    } catch {
      // Parent surfaces the error message
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
      <label className="filter-field">
        <span className="filter-label">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4dcd8', borderRadius: '6px' }}
        />
      </label>

      {mode === 'create' && (
        <label className="filter-field">
          <span className="filter-label">Password (min 8 characters)</span>
          <input
            type="text"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4dcd8', borderRadius: '6px' }}
          />
        </label>
      )}

      <label className="filter-field">
        <span className="filter-label">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4dcd8', borderRadius: '6px' }}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>

      <fieldset style={{ border: '1px solid #d4dcd8', borderRadius: '6px', padding: '0.75rem 1rem' }}>
        <legend className="filter-label">Regions</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {regions.map((region) => (
            <label key={region} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <input
                type="checkbox"
                checked={selectedRegions.includes(region)}
                onChange={() => toggleRegion(region)}
              />
              {region}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="filter-field">
        <span className="filter-label">Tier</span>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #d4dcd8', borderRadius: '6px' }}
        >
          {TIERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </label>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Saving...' : mode === 'create' ? 'Create user' : 'Save changes'}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}