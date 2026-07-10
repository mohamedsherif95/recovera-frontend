import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePermissions } from '@/hooks/usePermissions';

export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  anyPermissions,
}) {
  const { isAuthenticated, token, user } = useAuthStore();
  const { hasRole, can, canAny, permissions } = usePermissions();
  const location = useLocation();

  // Check both isAuthenticated flag and token existence
  if (!isAuthenticated || !token) {
    // Redirect to login, save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Infer a simple "permissions ready" state:
  // - If user has roles but permissions array is still empty, wait before enforcing permission checks.
  const hasRoles = Array.isArray(user?.roles) && user.roles.length > 0;
  const permissionsReady = !hasRoles || (Array.isArray(permissions) && permissions.length > 0);

  if (!permissionsReady && (requiredRole || requiredPermission || (anyPermissions && anyPermissions.length))) {
    // Show nothing (or a lightweight placeholder) while permissions are being derived
    return null;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check single permission requirement
  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check any-permissions requirement (OR logic)
  if (anyPermissions && anyPermissions.length > 0 && !canAny(anyPermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
