import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  VpnKey as ApiKeyIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Group as TeamIcon,
  Person as UserIcon,
  SmartToy as ModelIcon,
  Apps as AppsIcon,
  Security as SecurityIcon,
  LockPerson as LockPersonIcon,
} from '@mui/icons-material';
import { Permission } from '../types/rbac';

export interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType;
  requiredPermissions?: Permission[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

export const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon,
    requiredPermissions: [Permission.VIEW_DASHBOARD],
  },
  {
    title: 'Apps',
    path: '/my-apps',
    icon: AppsIcon,
    requiredPermissions: [Permission.USE_APP_STORE],
  },
  {
    title: 'App Library',
    path: '/app-library',
    icon: CodeIcon,
    requiredPermissions: [Permission.DEPLOY_APPS],
    adminOnly: true,
  },
  {
    title: 'API Keys',
    path: '/api-keys',
    icon: ApiKeyIcon,
    requiredPermissions: [Permission.VIEW_API_KEYS],
  },
  {
    title: 'Analytics',
    path: '/analytics',
    icon: AnalyticsIcon,
    requiredPermissions: [Permission.VIEW_ANALYTICS],
  },
  {
    title: 'Team',
    path: '/team',
    icon: TeamIcon,
    requiredPermissions: [Permission.MANAGE_TEAM_MEMBERS],
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: SettingsIcon,
    requiredPermissions: [Permission.VIEW_SETTINGS],
  },
  // Admin only items
  {
    title: 'Users',
    path: '/users',
    icon: UserIcon,
    requiredPermissions: [Permission.MANAGE_USERS],
    superAdminOnly: true,
  },
  {
    title: 'Models',
    path: '/models',
    icon: ModelIcon,
    requiredPermissions: [Permission.MANAGE_MODELS],
    superAdminOnly: true,
  },
  {
    title: 'App Templates',
    path: '/app-templates-management',
    icon: AppsIcon,
    requiredPermissions: [Permission.MANAGE_APP_STORE],
    superAdminOnly: true,
  },
  {
    title: 'Developer Docs',
    path: '/docs',
    icon: CodeIcon,
    requiredPermissions: [Permission.VIEW_DOCS],
  },
];