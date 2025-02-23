from enum import Enum
from typing import Set, Dict, List

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

# Define which permissions each role has
ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
    Role.GUEST: {
        Permission.VIEW_DOCS,
    },
    Role.USER: {
        Permission.VIEW_DOCS,
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
    },
    Role.USER_ADMIN: {
        Permission.VIEW_DOCS,
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
        Permission.MANAGE_TEAM_MEMBERS,
        Permission.MANAGE_TEAM_BILLING,
        Permission.VIEW_TEAM_USAGE,
    },
    Role.SUPER_ADMIN: {
        Permission.VIEW_DOCS,
        Permission.VIEW_OWN_USAGE,
        Permission.USE_API,
        Permission.MANAGE_OWN_ACCOUNT,
        Permission.MANAGE_TEAM_MEMBERS,
        Permission.MANAGE_TEAM_BILLING,
        Permission.VIEW_TEAM_USAGE,
        Permission.VIEW_ALL_USAGE,
        Permission.MANAGE_ALL_TEAMS,
        Permission.SYSTEM_CONFIGURATION,
    }
}

def get_role_permissions(role: Role) -> Set[Permission]:
    """Get all permissions for a given role."""
    return ROLE_PERMISSIONS.get(role, set())

def has_permission(role: Role, permission: Permission) -> bool:
    """Check if a role has a specific permission."""
    return permission in ROLE_PERMISSIONS.get(role, set()) 