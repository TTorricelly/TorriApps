import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

export default function RequireAuth({ children }) {
  const { isAuthenticated, isSessionValid, clearAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Check session validity on every route change
    if (isAuthenticated && !isSessionValid()) {
      console.log('Sessão expirada detectada. Redirecionando para login...');
      clearAuth();
    }
  }, [isAuthenticated, isSessionValid, clearAuth, location.pathname]);

  if (!isAuthenticated || !isSessionValid()) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
