import React from 'react';
import { Navigate } from 'react-router-dom';
import { Permission } from '../types/rbac';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyPermission } from '../utils/rbac';

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

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const hasAccess = hasAnyPermission(user, requiredPermissions);

    if (!hasAccess) {
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
};

export default PermissionGuard; 