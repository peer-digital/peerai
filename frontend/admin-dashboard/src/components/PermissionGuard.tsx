import React from 'react';
import { Navigate } from 'react-router-dom';
import { Permission, Role, hasAnyPermission } from '../types/rbac';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredPermissions: Permission[];
    userRole: Role;
    fallbackPath?: string;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    requiredPermissions,
    userRole,
    fallbackPath = '/unauthorized'
}) => {
    const hasAccess = hasAnyPermission(userRole, requiredPermissions);

    if (!hasAccess) {
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
};

export default PermissionGuard; 