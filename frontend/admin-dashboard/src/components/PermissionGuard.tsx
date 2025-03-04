import React from 'react';
import { Navigate } from 'react-router-dom';
import { Permission } from '../types/rbac';
import { useAuth } from '../contexts/AuthContext';
import { hasAnyPermission } from '../utils/rbac';

interface PermissionGuardProps {
    children: React.ReactNode;
    requiredPermissions: Permission[];
    fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
    children,
    requiredPermissions,
    fallback = <Navigate to="/unauthorized" replace />,
}) => {
    const { user } = useAuth();

    if (!user || !hasAnyPermission(user, requiredPermissions)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
};

export default PermissionGuard; 