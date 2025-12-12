import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

export function ProtectedRoute() {
  const { isAuthenticated, checkSession, logout } = useAuthStore();

  useEffect(() => {
    // Check session on mount and periodically
    const isValid = checkSession();
    if (!isValid && isAuthenticated) {
      logout();
    }
  }, [checkSession, isAuthenticated, logout]);

  if (!isAuthenticated || !checkSession()) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
