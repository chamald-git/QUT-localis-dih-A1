import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { adminApi } from '../api/admin.js';
import AdminUserForm from '../components/AdminUserForm.jsx';

/**
 * @what  Localis-branded user management console. Lists all user accounts,
 *        supports search by free text, sortable columns, modal-based create
 *        and edit flows, modal-confirmed delete, plus inline tier reference.
 *        Server enforces auth and admin role via authenticate + roleGuard.
 * @why   DIH-49 plus client demo polish. The previous inline-row UX worked
 *        functionally but read as engineering output rather than product.
 *        This rewrite expresses Localis's three-tier commercial ladder
 *        visually (stats, tier pills, reference panel) so the demo doubles
 *        as a sales conversation.
 * @alternative-considered A drawer panel for create and edit was considered
 *        as alternative to modals, and rejected because modals are simpler
 *        focus traps and match the wireframe direction. A separate edit
 *        route per user was also considered and rejected as overkill at
 *        this scale (under 100 expected users).
 * @module-source Localis wireframes 1 to 3, plus IFQ716 Week 9 hooks
 *        patterns. Class vocabulary aligned to operator dashboard where
 *        practical (panel, status status-error, muted, btn) and namespaced
 *        with admin- prefix elsewhere to avoid bleed.
 */
export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ column: 'created_at', direction: 'desc' });

  const [modal, setModal] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.listUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!modal) return;
    function onKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  function openCreate() {
    setActiveUser(null);
    setModal('create');
  }

  function openEdit(u) {
    setActiveUser(u);
    setModal('edit');
  }

  function openDelete(u) {
    setActiveUser(u);
    setModal('delete');
  }

  function closeModal() {
    setModal(null);
    setActiveUser(null);
  }

  async function handleCreate(payload) {
    try {
      await adminApi.createUser(payload);
      closeModal();
      await refresh();
      pushToast(`Account ${payload.email} created`, 'success');
    } catch (err) {
      const detail = err.details ? `${err.message}: ${err.details.join(', ')}` : err.message;
      pushToast(detail, 'error');
      throw err;
    }
  }

  async function handleUpdate(payload) {
    const target = activeUser;
    try {
      await adminApi.updateUser(target.id, payload);
      closeModal();
      await refresh();
      pushToast(`Account ${target.email} updated`, 'success');
    } catch (err) {
      const detail = err.details ? `${err.message}: ${err.details.join(', ')}` : err.message;
      pushToast(detail, 'error');
      throw err;
    }
  }

  async function handleDelete() {
    const target = activeUser;
    try {
      await adminApi.deleteUser(target.id);
      closeModal();
      await refresh();
      pushToast(`Account ${target.email} deleted`, 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  function toggleSort(column) {
    setSort((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  }

  const visibleUsers = useMemo(() => {
    let list = users;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          (u.tier ?? '').toLowerCase().includes(q) ||
          formatRegions(u.regions).toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const av = a[sort.column] ?? '';
      const bv = b[sort.column] ?? '';
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [users, search, sort]);

  const stats = useMemo(() => {
    const byTier = users.reduce((acc, u) => {
      acc[u.tier] = (acc[u.tier] || 0) + 1;
      return acc;
    }, {});
    return {
      total: users.length,
      spend: byTier['spend-only'] || 0,
      standard: byTier['accommodation-only'] || 0,
      full: byTier.full || 0
    };
  }, [users]);

  return (
    <main className="admin-shell">
      <header className="admin-brand-bar">
        <div className="admin-brand-bar-left">
          <Link to="/" className="admin-brand-mark">
            <span className="admin-brand-mark-badge">L</span>
            <span className="admin-brand-mark-name">localis</span>
          </Link>
          <nav className="admin-brand-nav" aria-label="Primary">
            <Link to="/" className="admin-brand-nav-link">Dashboard</Link>
            <button type="button" className="admin-brand-nav-link" disabled title="Coming soon">Reports</button>
            <button type="button" className="admin-brand-nav-link" disabled title="Coming soon">Insights</button>
            <button type="button" className="admin-brand-nav-link admin-brand-nav-active">Admin</button>
          </nav>
        </div>
        <div className="admin-brand-bar-right">
          <div className="admin-identity">
            <div className="admin-avatar" aria-hidden="true">{getInitials(currentUser?.email)}</div>
            <div className="admin-identity-text">
              <strong>{currentUser?.email}</strong>
              <span className="admin-identity-sub">
                <span className={`role-pill role-${currentUser?.role}`}>{currentUser?.role}</span>
                <span className={`tier-pill tier-${currentUser?.tier}`}>{tierLabel(currentUser?.tier)}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="admin-page-header">
        <p className="eyebrow">User Management</p>
        <h1>Accounts and Access</h1>
        <p className="subtitle">
          Provision client accounts, assign roles, regions, and dataset tiers.
          Tiers map directly to Localis subscription levels.
        </p>
      </section>

      <section className="admin-stats-grid" aria-label="Account statistics">
        <article className="admin-stat-card">
          <p className="admin-stat-label">Total accounts</p>
          <p className="admin-stat-value">{stats.total}</p>
          <p className="admin-stat-hint">Across all roles and tiers</p>
        </article>
        <article className="admin-stat-card admin-stat-card-spend">
          <p className="admin-stat-label">Spend tier</p>
          <p className="admin-stat-value">{stats.spend}</p>
          <p className="admin-stat-hint">Entry subscription</p>
        </article>
        <article className="admin-stat-card admin-stat-card-standard">
          <p className="admin-stat-label">Standard tier</p>
          <p className="admin-stat-value">{stats.standard}</p>
          <p className="admin-stat-hint">Spend plus accommodation</p>
        </article>
        <article className="admin-stat-card admin-stat-card-full">
          <p className="admin-stat-label">Full Access tier</p>
          <p className="admin-stat-value">{stats.full}</p>
          <p className="admin-stat-hint">All data plus AI insights</p>
        </article>
      </section>

      <section className="admin-toolbar">
        <div className="admin-search">
          <span className="admin-search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, role, tier, or region"
            className="admin-search-input"
            aria-label="Search users"
          />
        </div>
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
          + Add user
        </button>
      </section>

      {error && (
        <section className="admin-status admin-status-error">
          <strong>Unable to load accounts.</strong>
          <span>{error}</span>
        </section>
      )}

      <section className="admin-table-panel">
        {loading ? (
          <p className="admin-table-loading">Loading accounts…</p>
        ) : visibleUsers.length === 0 ? (
          <div className="admin-empty">
            <p><strong>No accounts found</strong></p>
            <p className="admin-muted">
              {search.trim()
                ? `No matches for "${search}". Try a different search term.`
                : 'Create the first account to get started.'}
            </p>
            {!search.trim() && (
              <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
                + Add first user
              </button>
            )}
          </div>
        ) : (
          <table className="admin-table" aria-label="User accounts">
            <thead>
              <tr>
                <th onClick={() => toggleSort('email')} className="admin-table-th-sortable">
                  Account {sortIndicator(sort, 'email')}
                </th>
                <th onClick={() => toggleSort('role')} className="admin-table-th-sortable">
                  Role {sortIndicator(sort, 'role')}
                </th>
                <th onClick={() => toggleSort('tier')} className="admin-table-th-sortable">
                  Tier {sortIndicator(sort, 'tier')}
                </th>
                <th>Regions</th>
                <th onClick={() => toggleSort('created_at')} className="admin-table-th-sortable">
                  Created {sortIndicator(sort, 'created_at')}
                </th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-table-user-cell">
                      <div className="admin-avatar admin-avatar-sm" aria-hidden="true">{getInitials(u.email)}</div>
                      <span>{u.email}</span>
                    </div>
                  </td>
                  <td><span className={`role-pill role-${u.role}`}>{u.role}</span></td>
                  <td><span className={`tier-pill tier-${u.tier}`}>{tierLabel(u.tier)}</span></td>
                  <td><span className="admin-regions">{formatRegions(u.regions) || '—'}</span></td>
                  <td className="admin-muted">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-btn-sm"
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        disabled={u.id === currentUser?.id}
                        title={u.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete this account'}
                        onClick={() => openDelete(u)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="admin-tier-reference">
        <header>
          <h2>Subscription tier reference</h2>
          <p className="admin-muted">What each Localis tier unlocks for the client.</p>
        </header>
        <div className="admin-tier-reference-grid">
          <article className="tier-reference-card tier-card-spend">
            <header>
              <span className="tier-pill tier-spend-only">Spend</span>
              <span className="tier-reference-level">Tier 1 of 3</span>
            </header>
            <h3>Card spending data</h3>
            <ul>
              <li>Total visitor spend by region and period</li>
              <li>Spending across 14 categories</li>
              <li>Transactions, spend per visitor, per transaction</li>
            </ul>
            <p className="admin-muted">Suited to small operators benchmarking against their region.</p>
          </article>

          <article className="tier-reference-card tier-card-standard">
            <header>
              <span className="tier-pill tier-accommodation-only">Standard</span>
              <span className="tier-reference-level">Tier 2 of 3</span>
            </header>
            <h3>Spend plus accommodation</h3>
            <ul>
              <li>Everything in Spend</li>
              <li>Occupancy percentage</li>
              <li>Average daily rate</li>
            </ul>
            <p className="admin-muted">Suited to operators making pricing and staffing decisions.</p>
          </article>

          <article className="tier-reference-card tier-card-full">
            <header>
              <span className="tier-pill tier-full">Full Access</span>
              <span className="tier-reference-level">Tier 3 of 3</span>
            </header>
            <h3>All data plus AI</h3>
            <ul>
              <li>Everything in Standard</li>
              <li>Length of stay and booking window</li>
              <li>Estimated staffing pressure</li>
              <li>AI-generated planning narratives</li>
            </ul>
            <p className="admin-muted">Suited to DMOs, government, and premium operators.</p>
          </article>
        </div>
      </section>

      {modal === 'create' && (
        <Modal onClose={closeModal} title="Create new account">
          <AdminUserForm mode="create" onSubmit={handleCreate} onCancel={closeModal} />
        </Modal>
      )}

      {modal === 'edit' && activeUser && (
        <Modal onClose={closeModal} title={`Edit ${activeUser.email}`}>
          <AdminUserForm
            mode="edit"
            initialValues={{
              email: activeUser.email,
              role: activeUser.role,
              regions: parseRegions(activeUser.regions),
              tier: activeUser.tier
            }}
            onSubmit={handleUpdate}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {modal === 'delete' && activeUser && (
        <Modal onClose={closeModal} title="Confirm deletion">
          <div className="admin-modal-confirm">
            <p>Delete <strong>{activeUser.email}</strong>?</p>
            <p className="admin-muted">
              This permanently removes the account. The user will lose access immediately.
              This action cannot be undone.
            </p>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={closeModal}>Cancel</button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={handleDelete}>Delete account</button>
            </div>
          </div>
        </Modal>
      )}

      <div className="admin-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`admin-toast toast-${t.type}`} role="status">
            {t.message}
          </div>
        ))}
      </div>
    </main>
  );
}

/**
 * @what  Lightweight modal with backdrop click, ESC, and focus stop.
 * @why   Replaces inline confirmation rows from the previous milestone.
 *        Local component keeps the modal experience consistent across
 *        create, edit, and delete flows without adding a dependency.
 * @alternative-considered react-modal and radix-dialog give better
 *        focus traps and ARIA out of the box but add bundle weight.
 *        For an internal admin tool the lighter approach is defensible.
 * @module-source IFQ716 Week 9, controlled UI patterns.
 */
function Modal({ title, onClose, children }) {
  return (
    <div
      className="admin-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal-header">
          <h2>{title}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="admin-modal-body">{children}</div>
      </div>
    </div>
  );
}

function getInitials(email) {
  if (!email) return '?';
  const local = email.split('@')[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function formatRegions(regions) {
  if (Array.isArray(regions)) return regions.join(', ');
  if (typeof regions === 'string') {
    try {
      const parsed = JSON.parse(regions);
      if (Array.isArray(parsed)) return parsed.join(', ');
    } catch {
      return regions;
    }
  }
  return '';
}

function parseRegions(regions) {
  if (Array.isArray(regions)) return regions;
  if (typeof regions === 'string') {
    try {
      const parsed = JSON.parse(regions);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(iso));
}

function tierLabel(tier) {
  switch (tier) {
    case 'spend-only': return 'Spend';
    case 'accommodation-only': return 'Standard';
    case 'full': return 'Full Access';
    default: return tier ?? '—';
  }
}

function sortIndicator(sort, column) {
  if (sort.column !== column) {
    return <span className="admin-sort-icon" aria-hidden="true">↕</span>;
  }
  return (
    <span className="admin-sort-icon admin-sort-icon-active" aria-hidden="true">
      {sort.direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}