import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * AuthGuard - Prevents authenticated users from accessing auth pages
 * Used for unauthenticated auth pages
 */
export function AuthGuard({ children }) {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isAuthenticated) {
    // If user is already authenticated, redirect to the last requested page or home
    // Check if there's a saved location to redirect to
    const from = location.state?.from?.pathname || '/daily-operations';
    return <Navigate to={from} replace />;
  }

  return children;
}
