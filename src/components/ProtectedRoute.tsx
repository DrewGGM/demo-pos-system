import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import LoadingScreen from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Legacy role-based gate. Kept for backward compat with routes that still
  // pass requiredRoles; new code should prefer requiredPermissions.
  requiredRoles?: string[];
  // Permission codes. The user needs ALL of these to enter the route. Use the
  // permission catalog codes ("settings.access", "employees.manage", ...).
  requiredPermissions?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requiredPermissions,
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const { can, loading: permsLoading } = usePermissions();

  if (loading || permsLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const missing = requiredPermissions.some((code) => !can(code));
    if (missing) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
