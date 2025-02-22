import { User } from '../types/auth';

// Define available permissions
export enum Permission {
  // User management
  VIEW_USERS = 'view_users',
  CREATE_USER = 'create_user',
  EDIT_USER = 'edit_user',
  DELETE_USER = 'delete_user',
  
  // API key management
  VIEW_API_KEYS = 'view_api_keys',
  CREATE_API_KEY = 'create_api_key',
  REVOKE_API_KEY = 'revoke_api_key',
  
  // Settings
  VIEW_SETTINGS = 'view_settings',
  EDIT_SETTINGS = 'edit_settings',
  
  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_ANALYTICS = 'export_analytics',
  
  // Beta features
  MANAGE_BETA_FEATURES = 'manage_beta_features',
  USE_VISION_API = 'use_vision_api',
  USE_AUDIO_API = 'use_audio_api',
}

// Define role types
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
}

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission), // Super admin has all permissions
  [Role.ADMIN]: [
    Permission.VIEW_USERS,
    Permission.CREATE_USER,
    Permission.EDIT_USER,
    Permission.VIEW_API_KEYS,
    Permission.CREATE_API_KEY,
    Permission.REVOKE_API_KEY,
    Permission.VIEW_SETTINGS,
    Permission.EDIT_SETTINGS,
    Permission.VIEW_ANALYTICS,
    Permission.EXPORT_ANALYTICS,
    Permission.MANAGE_BETA_FEATURES,
  ],
  [Role.MANAGER]: [
    Permission.VIEW_USERS,
    Permission.VIEW_API_KEYS,
    Permission.CREATE_API_KEY,
    Permission.REVOKE_API_KEY,
    Permission.VIEW_ANALYTICS,
    Permission.USE_VISION_API,
    Permission.USE_AUDIO_API,
  ],
  [Role.USER]: [
    Permission.VIEW_API_KEYS,
    Permission.CREATE_API_KEY,
    Permission.REVOKE_API_KEY,
  ],
};

/**
 * Check if a user has a specific permission
 */
export const hasPermission = (user: User, permission: Permission): boolean => {
  if (!user || !user.role) return false;
  
  const userRole = user.role as Role;
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