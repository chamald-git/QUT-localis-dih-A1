import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { setAuthToken, clearAuthToken } from './tokenStore.js';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * @what  React context provider that holds the JWT in component state
 *        (memory-only) and exposes login, logout, and an authenticated
 *        fetch wrapper to the entire component tree. Also mirrors the
 *        token into a module-scoped store so the api client can attach
 *        Bearer headers from non-React modules.
 * @why   ADR-0006 mandates in-memory token storage, not localStorage,
 *        to limit XSS exposure surface. Every child component can call
 *        useAuth() to check authentication state, read the user profile
 *        (role, regions, tier), or make authenticated API requests
 *        without manually attaching the Bearer header.
 * @alternative-considered localStorage was considered for persistence
 *        across page reloads but rejected per ADR-0006 because a single
 *        XSS vector would expose the token. In-memory storage means a
 *        page refresh logs the user out, which is acceptable for a
 *        capstone demo and safer by default.
 * @module-source IFQ716 Week 9, React context authentication pattern.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const isAuthenticated = token !== null;

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Login failed');
    }

    setToken(data.data.token);
    setUser(data.data.user);
    setAuthToken(data.data.token);
    return data.data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearAuthToken();
  }, []);

  /**
   * @what  Wrapper around fetch that automatically attaches the Bearer
   *        token to every request. Use this instead of raw fetch for
   *        all authenticated API calls.
   * @why   Avoids every component manually reading the token from
   *        context and building the Authorization header. Also handles
   *        401 responses by logging the user out automatically.
   * @param {string} url
   * @param {RequestInit} [options]
   * @returns {Promise<Response>}
   */
  const authFetch = useCallback(async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

    const res = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      setToken(null);
      setUser(null);
      clearAuthToken();
    }

    return res;
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated,
    login,
    logout,
    authFetch
  }), [token, user, isAuthenticated, login, logout, authFetch]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * @what  Custom hook to access auth state and actions from any component.
 * @why   Cleaner API than useContext(AuthContext) at every call site,
 *        and throws a clear error if used outside the provider.
 * @returns {{ token: string|null, user: object|null, isAuthenticated: boolean, login: Function, logout: Function, authFetch: Function }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}