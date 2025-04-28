from enum import Enum
from typing import Set, Dict


class Role(str, Enum):
    # Base roles in the system
    GUEST = "guest"
    USER = "user"
    USER_ADMIN = "user_admin"
    SUPER_ADMIN = "super_admin"

    def __str__(self) -> str:
        return self.value


# Define all possible permissions in the system
class Permission(str, Enum):
    # Documentation access
    VIEW_DOCS = "view_docs"
    VIEW_API_DOCS = "view_api_docs"  # Permission to view API documentation

    # User-level permissions
    VIEW_OWN_USAGE = "view_own_usage"
    USE_API = "use_api"
    MANAGE_OWN_ACCOUNT = "manage_own_account"

    # Team-level permissions
    MANAGE_TEAM_MEMBERS = "manage_team_members"
    MANAGE_TEAM_BILLING = "manage_team_billing"
    VIEW_TEAM_USAGE = "view_team_usage"

    # Super admin permissions
    VIEW_ALL_USAGE = "view_all_usage"
    MANAGE_ALL_TEAMS = "manage_all_teams"
    SYSTEM_CONFIGURATION = "system_configuration"
    VIEW_SETTINGS = "view_settings"
    EDIT_SETTINGS = "edit_settings"

    # App Store permissions
    VIEW_APP_STORE = "view_app_store"
    USE_APP_STORE = "use_app_store"
    MANAGE_APP_STORE = "manage_app_store"
    DEPLOY_APPS = "deploy_apps"  # Permission to deploy apps from the App Store
    CONFIGURE_APPS = "configure_apps"  # Permission to configure deployed apps


# Define which permissions each role has
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.GUEST: {
        Permission.VIEW_DOCS,
        Permission.VIEW_APP_STORE,
    },
    Role.USER: {
        Permission.VIEW_DOCS,
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
        Permission.VIEW_APP_STORE,
        Permission.USE_APP_STORE,
    },
    Role.USER_ADMIN: {
        Permission.VIEW_DOCS,
        Permission.VIEW_API_DOCS,  # User admins can view API docs
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
        Permission.MANAGE_TEAM_MEMBERS,
        Permission.MANAGE_TEAM_BILLING,
        Permission.VIEW_TEAM_USAGE,
        Permission.VIEW_APP_STORE,
        Permission.USE_APP_STORE,
        Permission.DEPLOY_APPS,  # User admins can deploy apps
        Permission.CONFIGURE_APPS,  # User admins can configure apps
    },
    Role.SUPER_ADMIN: {
        # Super admins have all permissions
        Permission.VIEW_DOCS,
        Permission.VIEW_API_DOCS,
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
        Permission.MANAGE_TEAM_MEMBERS,
        Permission.MANAGE_TEAM_BILLING,
        Permission.VIEW_TEAM_USAGE,
        Permission.VIEW_ALL_USAGE,
        Permission.MANAGE_ALL_TEAMS,
        Permission.SYSTEM_CONFIGURATION,
        Permission.VIEW_SETTINGS,
        Permission.EDIT_SETTINGS,
        Permission.VIEW_APP_STORE,
        Permission.USE_APP_STORE,
        Permission.MANAGE_APP_STORE,
        Permission.DEPLOY_APPS,
        Permission.CONFIGURE_APPS,
    },
}


def get_role_permissions(role: Role) -> Set[Permission]:
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, set())


def has_permission(role: Role, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, set())
