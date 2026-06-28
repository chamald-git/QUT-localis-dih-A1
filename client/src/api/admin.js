import { getAuthToken, clearAuthToken } from '../context/tokenStore.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function request(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    clearAuthToken();
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.error?.message ?? `Request failed with status ${response.status}`;
    const err = new Error(message);
    if (Array.isArray(body?.error?.details)) {
      err.details = body.error.details;
    }
    throw err;
  }

  return body;
}

export const adminApi = {
  async listUsers() {
    const body = await request('/api/admin/users');
    return body.data;
  },

  async createUser(input) {
    const body = await request('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    return body.data;
  },

  async updateUser(id, updates) {
    const body = await request(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    return body.data;
  },

  async deleteUser(id) {
    await request(`/api/admin/users/${id}`, {
      method: 'DELETE'
    });
  }
};