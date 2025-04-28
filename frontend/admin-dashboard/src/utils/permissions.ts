import { Permission, Role, ROLE_PERMISSIONS } from '../types/rbac';

/**
 * Check if a user has a specific permission
 * @param userPermissions Array of user permissions
 * @param requiredPermission Permission to check
 * @returns Boolean indicating if the user has the permission
 */
export const hasPermission = (
  userPermissions: Permission[] | undefined,
  requiredPermission: Permission
): boolean => {
  if (!userPermissions) return false;
  return userPermissions.includes(requiredPermission);
};

/**
 * Check if a user has any of the specified permissions
 * @param userPermissions Array of user permissions
 * @param requiredPermissions Array of permissions to check
 * @returns Boolean indicating if the user has any of the permissions
 */
export const hasAnyPermission = (
  userPermissions: Permission[] | undefined,
  requiredPermissions: Permission[]
): boolean => {
  if (!userPermissions) return false;
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

/**
 * Check if a user has all of the specified permissions
 * @param userPermissions Array of user permissions
 * @param requiredPermissions Array of permissions to check
 * @returns Boolean indicating if the user has all of the permissions
 */
export const hasAllPermissions = (
  userPermissions: Permission[] | undefined,
  requiredPermissions: Permission[]
): boolean => {
  if (!userPermissions) return false;
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

/**
 * Get all permissions for a specific role
 * @param role User role
 * @returns Array of permissions for the role
 */
export const getRolePermissions = (role: Role): Permission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

export { Permission };
