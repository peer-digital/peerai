import { User } from '../types/auth';
import { Role, Permission } from '../types/rbac';

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission), // Super admin has all permissions
  [Role.USER_ADMIN]: [
    Permission.VIEW_DOCS,
    Permission.VIEW_OWN_USAGE,
    Permission.USE_API,
    Permission.MANAGE_OWN_ACCOUNT,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.MANAGE_TEAM_BILLING,
    Permission.VIEW_TEAM_USAGE,
  ],
  [Role.USER]: [
    Permission.VIEW_DOCS,
    Permission.VIEW_OWN_USAGE,
    Permission.USE_API,
    Permission.MANAGE_OWN_ACCOUNT,
  ],
  [Role.TEAM_ADMIN]: [
    Permission.VIEW_DOCS,
    Permission.VIEW_OWN_USAGE,
    Permission.USE_API,
    Permission.MANAGE_OWN_ACCOUNT,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.MANAGE_TEAM_BILLING,
    Permission.VIEW_TEAM_USAGE,
  ],
  [Role.ADMIN]: [
    Permission.VIEW_DOCS,
    Permission.VIEW_OWN_USAGE,
    Permission.USE_API,
    Permission.MANAGE_OWN_ACCOUNT,
    Permission.MANAGE_TEAM_MEMBERS,
    Permission.MANAGE_TEAM_BILLING,
    Permission.VIEW_TEAM_USAGE,
    Permission.MANAGE_USERS,
    Permission.MANAGE_MODELS,
    Permission.MANAGE_SYSTEM,
  ],
  [Role.GUEST]: [
    Permission.VIEW_DOCS,
  ],
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (user: User, permission: Permission): boolean => {
  if (!user || !user.role) return false;
  
  const userRole = user.role;
  const permissions = rolePermissions[userRole] || [];
  
  return permissions.includes(permission);
};

/**
 * Check if a user has any of the specified permissions
 */
export const hasAnyPermission = (user: User, permissions: Permission[]): boolean => {
  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Check if a user has all of the specified permissions
 */
export const hasAllPermissions = (user: User, permissions: Permission[]): boolean => {
  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Get all permissions for a role
 */
export const getRolePermissions = (role: Role): Permission[] => {
  return rolePermissions[role] || [];
};

/**
 * Check if a user has a specific role
 */
export const hasRole = (user: User, role: Role): boolean => {
  return user?.role === role;
};

/**
 * Check if a user has any of the specified roles
 */
export const hasAnyRole = (user: User, roles: Role[]): boolean => {
  return roles.some(role => hasRole(user, role));
}; 