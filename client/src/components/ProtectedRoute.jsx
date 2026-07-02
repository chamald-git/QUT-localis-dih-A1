import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * @what  Route wrapper that redirects unauthenticated users to /login
 *        and optionally restricts access to specific roles.
 * @why   Every dashboard route must require a valid JWT. Without this
 *        wrapper, a user could navigate directly to /operator or
 *        /government and see the page without authenticating. The
 *        optional allowedRoles prop lets specific routes restrict to
 *        certain user types (e.g. admin-only pages).
 * @alternative-considered  A single top-level check in App.jsx was
 *        considered but per-route wrappers are more granular and allow
 *        mixed public/private routes in the same router.
 * @module-source  IFQ716 Week 9, protected route pattern
 * @param {{ children: React.ReactNode, allowedRoles?: string[] }} props
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
