import { useState, useMemo } from 'react';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Internal Localis staff. Manages all accounts and access.' },
  { value: 'government', label: 'Government', description: 'Government agencies. Cross-region policy and funding view.' },
  { value: 'dmo', label: 'DMO', description: 'Destination Marketing Organisation. Region-specific marketing intelligence.' },
  { value: 'operator', label: 'Operator', description: 'Tourism operator. Sees only their assigned region.' }
];

const TIER_OPTIONS = [
  { value: 'spend-only', label: 'Spend', description: 'Card spending and category breakdowns. Entry subscription.' },
  { value: 'accommodation-only', label: 'Standard', description: 'Spend data plus occupancy and average daily rate.' },
  { value: 'full', label: 'Full Access', description: 'All data plus length of stay, booking window, staffing pressure, and AI insights.' }
];

const REGION_OPTIONS = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

/**
 * @what  Shared user form for create and edit modes. In create mode requires
 *        email plus password; in edit mode it omits password and pre-populates
 *        remaining fields. Renders inline descriptions for the selected role
 *        and tier so the admin understands the commercial implications.
 * @why   DIH-49 plus Localis tier expansion. A single component for both
 *        modes keeps the modal experience consistent and guarantees validation
 *        rules stay in sync. Role and tier descriptions surface the product
 *        ladder at the point of decision.
 * @alternative-considered Two separate Create and Edit components were
 *        rejected; their bodies differed only by one optional field. A wizard
 *        with stepped tier selection was also considered but added latency
 *        without commercial benefit at this scale.
 * @module-source IFQ716 Week 9, controlled form pattern.
 */
export default function AdminUserForm({ mode, initialValues = {}, onSubmit, onCancel }) {
  const [email, setEmail] = useState(initialValues.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialValues.role ?? 'operator');
  const [selectedRegions, setSelectedRegions] = useState(initialValues.regions ?? []);
  const [tier, setTier] = useState(initialValues.tier ?? 'spend-only');
  const [submitting, setSubmitting] = useState(false);

  const roleDescription = useMemo(
    () => ROLE_OPTIONS.find((r) => r.value === role)?.description ?? '',
    [role]
  );

  const tierDescription = useMemo(
    () => TIER_OPTIONS.find((t) => t.value === tier)?.description ?? '',
    [tier]
  );

  function toggleRegion(region) {
    setSelectedRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    const payload = { email, role, regions: selectedRegions, tier };
    if (mode === 'create') {
      payload.password = password;
    }

    try {
      await onSubmit(payload);
    } catch {
      // Parent surfaces error via toast; keep form open.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <div className="admin-form-row">
        <label className="admin-form-field">
          <span className="admin-form-label">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="admin-form-input"
            placeholder="name@organisation.com"
          />
        </label>
      </div>

      {mode === 'create' && (
        <div className="admin-form-row">
          <label className="admin-form-field">
            <span className="admin-form-label">Temporary password</span>
            <input
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="admin-form-input"
              placeholder="Minimum 8 characters"
            />
            <span className="admin-form-hint">
              Share with the user out of band. Self-service password reset is on the roadmap.
            </span>
          </label>
        </div>
      )}

      <div className="admin-form-row admin-form-row-split">
        <label className="admin-form-field">
          <span className="admin-form-label">Role</span>
          <select className="admin-form-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <span className="admin-form-hint">{roleDescription}</span>
        </label>

        <label className="admin-form-field">
          <span className="admin-form-label">Dataset tier</span>
          <select className="admin-form-input" value={tier} onChange={(e) => setTier(e.target.value)}>
            {TIER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <span className="admin-form-hint">{tierDescription}</span>
        </label>
      </div>

      <fieldset className="admin-form-fieldset">
        <legend className="admin-form-label">Regions</legend>
        <div className="admin-form-checkboxes">
          {REGION_OPTIONS.map((region) => (
            <label key={region} className="admin-form-checkbox-label">
              <input
                type="checkbox"
                checked={selectedRegions.includes(region)}
                onChange={() => toggleRegion(region)}
              />
              {region}
            </label>
          ))}
        </div>
        <span className="admin-form-hint">
          Government and DMO typically have multiple regions. Operators usually have one.
        </span>
      </fieldset>

      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}