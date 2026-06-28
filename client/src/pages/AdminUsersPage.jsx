import { useEffect, useState, useCallback, Fragment } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { adminApi } from '../api/admin.js';
import AdminUserForm from '../components/AdminUserForm.jsx';

const REGIONS = ['Cairns', 'Gold Coast', 'Noosa', 'Whitsundays'];

function formatRegions(regions) {
  if (Array.isArray(regions)) {
    return regions.join(', ');
  }
  if (typeof regions === 'string') {
    try {
      const parsed = JSON.parse(regions);
      if (Array.isArray(parsed)) {
        return parsed.join(', ');
      }
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
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(iso));
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [actionError, setActionError] = useState(null);

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

  async function handleCreate(payload) {
    setActionError(null);
    try {
      await adminApi.createUser(payload);
      setShowCreateForm(false);
      await refresh();
    } catch (err) {
      const detail = err.details ? `${err.message}: ${err.details.join(', ')}` : err.message;
      setActionError(detail);
      throw err;
    }
  }

  async function handleUpdate(id, payload) {
    setActionError(null);
    try {
      await adminApi.updateUser(id, payload);
      setEditingUserId(null);
      await refresh();
    } catch (err) {
      const detail = err.details ? `${err.message}: ${err.details.join(', ')}` : err.message;
      setActionError(detail);
      throw err;
    }
  }

  async function handleDelete(id) {
    setActionError(null);
    try {
      await adminApi.deleteUser(id);
      setDeletingUserId(null);
      await refresh();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-header-copy">
          <p className="eyebrow">Destination Insight Hubs</p>
          <h1>Admin Users</h1>
          <p className="subtitle">
            Create and manage user accounts, roles, regions, and access tiers.
          </p>
        </div>

        <div className="user-pill">
          <span>{currentUser?.role}</span>
          <strong>{currentUser?.email}</strong>
        </div>
      </header>

      {error && (
        <section className="status status-error">
          <span className="dot" />
          <div>
            <strong>Unable to load users</strong>
            <p className="muted">{error}</p>
          </div>
        </section>
      )}

      {actionError && (
        <section className="status status-error">
          <span className="dot" />
          <div>
            <strong>Action failed</strong>
            <p className="muted">{actionError}</p>
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>User accounts</h2>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setShowCreateForm((s) => !s);
              setEditingUserId(null);
              setActionError(null);
            }}
          >
            {showCreateForm ? 'Cancel' : 'Create user'}
          </button>
        </div>

        {showCreateForm && (
          <article className="panel" style={{ marginBottom: '1.5rem' }}>
            <h3>New user</h3>
            <AdminUserForm
              mode="create"
              regions={REGIONS}
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
            />
          </article>
        )}

        {loading ? (
          <p className="muted">Loading users...</p>
        ) : (
          <article className="panel">
            <div className="mini-table-wrap">
              <table className="mini-table" aria-label="User accounts">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Regions</th>
                    <th>Tier</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <Fragment key={u.id}>
                      <tr>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{formatRegions(u.regions)}</td>
                        <td>{u.tier}</td>
                        <td>{formatDate(u.created_at)}</td>
                        <td>
                          <button
                            type="button"
                            className="btn"
                            style={{ marginRight: '0.5rem' }}
                            onClick={() => {
                              setEditingUserId(editingUserId === u.id ? null : u.id);
                              setShowCreateForm(false);
                              setActionError(null);
                            }}
                          >
                            {editingUserId === u.id ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            disabled={u.id === currentUser?.id}
                            title={u.id === currentUser?.id ? 'You cannot delete your own account' : ''}
                            onClick={() => setDeletingUserId(u.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>

                      {editingUserId === u.id && (
                        <tr>
                          <td colSpan={6}>
                            <AdminUserForm
                              mode="edit"
                              initialValues={{
                                email: u.email,
                                role: u.role,
                                regions: parseRegions(u.regions),
                                tier: u.tier
                              }}
                              regions={REGIONS}
                              onSubmit={(payload) => handleUpdate(u.id, payload)}
                              onCancel={() => setEditingUserId(null)}
                            />
                          </td>
                        </tr>
                      )}

                      {deletingUserId === u.id && (
                        <tr>
                          <td colSpan={6}>
                            <div style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                              <strong>Delete {u.email}? This cannot be undone.</strong>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => handleDelete(u.id)}
                              >
                                Confirm delete
                              </button>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => setDeletingUserId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}