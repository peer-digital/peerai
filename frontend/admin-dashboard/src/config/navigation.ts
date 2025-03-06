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
} from '@mui/icons-material';
import { Permission } from '../types/rbac';

export interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType;
  requiredPermissions?: Permission[];
}

export const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: DashboardIcon,
    requiredPermissions: [Permission.VIEW_DASHBOARD],
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
  },
  {
    title: 'Models',
    path: '/models',
    icon: ModelIcon,
    requiredPermissions: [Permission.MANAGE_MODELS],
  },
  {
    title: 'Developer Docs',
    path: '/docs',
    icon: CodeIcon,
    requiredPermissions: [Permission.VIEW_DOCS],
  },
]; 