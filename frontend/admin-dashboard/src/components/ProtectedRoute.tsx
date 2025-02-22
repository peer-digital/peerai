import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Permission } from '../utils/rbac';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission } from '../utils/rbac';

interface ProtectedRouteProps {
  permission: Permission;
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  children,
  redirectTo = '/unauthorized',
}) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasPermission(user, permission)) {
    // Redirect to unauthorized page or specified route if user lacks permission
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}; 