// @important: Role definitions - must match backend enum
export enum Role {
    GUEST = 'guest',
    USER = 'user',
    USER_ADMIN = 'user_admin',
    SUPER_ADMIN = 'super_admin',
    TEAM_ADMIN = 'team_admin',
    ADMIN = 'admin'
}

// @important: Permission definitions - must match backend enum
export enum Permission {
    // Documentation access
    VIEW_DOCS = 'view_docs',
    VIEW_API_DOCS = 'view_api_docs',  // Permission to view API documentation
    
    // User-level permissions
    VIEW_OWN_USAGE = 'view_own_usage',
    USE_API = 'use_api',
    MANAGE_OWN_ACCOUNT = 'manage_own_account',
    
    // Team-level permissions
    MANAGE_TEAM_MEMBERS = 'manage_team_members',
    MANAGE_TEAM_BILLING = 'manage_team_billing',
    VIEW_TEAM_USAGE = 'view_team_usage',
    
    // Super admin permissions
    VIEW_ALL_USAGE = 'view_all_usage',
    MANAGE_ALL_TEAMS = 'manage_all_teams',
    SYSTEM_CONFIGURATION = 'system_configuration',
    VIEW_SETTINGS = 'view_settings',
    EDIT_SETTINGS = 'edit_settings',

    // User permissions
    VIEW_DASHBOARD = 'view_dashboard',
    VIEW_ANALYTICS = 'view_analytics',
    VIEW_API_KEYS = 'view_api_keys',
    MANAGE_API_KEYS = 'manage_api_keys',
    VIEW_REFERRALS = 'view_referrals',
    USE_REFERRALS = 'use_referrals',

    // Admin permissions
    MANAGE_USERS = 'manage_users',
    MANAGE_MODELS = 'manage_models',
    MANAGE_SYSTEM = 'manage_system',
}

export interface Team {
    id: number;
    name: string;
    created_at: string;
    created_by_id: number;
}

export interface TeamWithMembers extends Team {
    members: User[];
}

export interface User {
    id: number;
    email: string;
    full_name?: string;
    is_active: boolean;
    role: Role;
    team_id?: number;
    created_at: string;
    token_limit: number;  // Default is 10000
}

// Role-permission mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    [Role.GUEST]: [
        Permission.VIEW_DOCS,
    ],
    [Role.USER]: [
        Permission.VIEW_DOCS,
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
    ],
    [Role.USER_ADMIN]: [
        Permission.VIEW_DOCS,
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
        Permission.MANAGE_TEAM_MEMBERS,
        Permission.MANAGE_TEAM_BILLING,
        Permission.VIEW_TEAM_USAGE,
    ],
    [Role.SUPER_ADMIN]: [
        // Super admin has access to ALL permissions
        ...Object.values(Permission)
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
        ...Object.values(Permission)
    ]
};

// Helper functions
export const hasPermission = (role: Role, permission: Permission): boolean => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

export const hasAnyPermission = (role: Role, permissions: Permission[]): boolean => {
    if (!role || !permissions?.length) return false;
    return permissions.some(permission => ROLE_PERMISSIONS[role]?.includes(permission));
};

export const hasAllPermissions = (role: Role, permissions: Permission[]): boolean => {
    if (!role || !permissions?.length) return false;
    return permissions.every(permission => ROLE_PERMISSIONS[role]?.includes(permission));
}; 