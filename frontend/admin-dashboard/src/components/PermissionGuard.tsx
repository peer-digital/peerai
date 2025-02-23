import React from 'react';
import { Navigate } from 'react-router-dom';
import { Permission, Role, hasAnyPermission } from '../types/rbac';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredPermissions: Permission[];
    fallbackPath?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    requiredPermissions,
    fallbackPath = '/unauthorized'
}) => {
    const { user } = useAuth();
    const userRole = user?.role as Role;

    if (!userRole) {
        return <Navigate to="/login" replace />;
    }

    const hasAccess = hasAnyPermission(userRole, requiredPermissions);

    if (!hasAccess) {
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
};

export default PermissionGuard; 