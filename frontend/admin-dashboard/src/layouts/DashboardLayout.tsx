import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  VpnKey as ApiKeyIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Code as CodeIcon,
  AccountCircle as AccountCircleIcon,
  MenuBook as MenuBookIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasAnyPermission, ROLE_PERMISSIONS } from '../types/rbac';

const drawerWidth = 240;

// @important: Menu items with required permissions
const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/dashboard',
    requiredPermissions: [Permission.VIEW_OWN_USAGE, Permission.VIEW_ALL_USAGE]
  },
  { 
    text: 'Users', 
    icon: <PeopleIcon />, 
    path: '/users',
    requiredPermissions: [Permission.MANAGE_TEAM_MEMBERS, Permission.MANAGE_ALL_TEAMS]
  },
  { 
    text: 'API Keys', 
    icon: <ApiKeyIcon />, 
    path: '/api-keys',
    requiredPermissions: [Permission.USE_API]
  },
  { 
    text: 'Analytics', 
    icon: <AssessmentIcon />, 
    path: '/analytics',
    requiredPermissions: [Permission.VIEW_TEAM_USAGE, Permission.VIEW_ALL_USAGE]
  },
  { 
    text: 'Playground', 
    icon: <CodeIcon />, 
    path: '/playground',
    requiredPermissions: [Permission.USE_API]
  },
  { 
    text: 'Settings', 
    icon: <SettingsIcon />, 
    path: '/settings',
    requiredPermissions: [Permission.VIEW_SETTINGS, Permission.EDIT_SETTINGS, Permission.SYSTEM_CONFIGURATION]
  },
  { 
    text: 'Developer Docs', 
    icon: <MenuBookIcon />, 
    path: '/docs',
    requiredPermissions: [Permission.VIEW_DOCS]
  },
];

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

const StyledAppBar = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })<{
  open?: boolean;
}>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Debug logging
  console.log('Current user:', user);
  console.log('User role:', user?.role);
  console.log('Menu items:', menuItems);
  console.log('Role permissions:', user?.role ? ROLE_PERMISSIONS[user.role] : 'No role');

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  // Filter visible menu items based on user permissions
  const visibleMenuItems = React.useMemo(() => {
    if (!user?.role) {
      console.log('No user role found - no menu items visible');
      return [];
    }

    return menuItems.filter(item => {
      const hasAccess = hasAnyPermission(user.role, item.requiredPermissions);
      console.log(`Menu item "${item.text}":`, {
        role: user.role,
        requiredPermissions: item.requiredPermissions,
        rolePermissions: ROLE_PERMISSIONS[user.role],
        hasAccess
      });
      return hasAccess;
    });
  }, [user?.role]);

  return (
    <Box sx={{ display: 'flex' }}>
      <StyledAppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            PeerAI Admin
          </Typography>
          <IconButton
            onClick={handleUserMenuOpen}
            size="small"
            sx={{ ml: 2 }}
            data-testid="user-menu"
          >
            {user?.name || user?.email ? (
              <Avatar sx={{ width: 32, height: 32 }}>
                {(user.name || user.email).charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircleIcon />
            )}
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            onClick={handleUserMenuClose}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="textSecondary">
                Signed in as {user?.email}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </StyledAppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {visibleMenuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
};

export default DashboardLayout; 