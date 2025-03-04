import React, { useState, useEffect } from 'react';
import { styled, useTheme } from '@mui/material/styles';
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
  Badge,
  Tooltip,
  useMediaQuery,
  Collapse,
  Fade,
  Button,
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
  Notifications as NotificationsIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Rocket as RocketIcon,
  Support as SupportIcon,
  GitHub as GitHubIcon,
  Science as ScienceIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasAnyPermission, Role } from '../types/rbac';
import ThemeToggle from '../components/ui/ThemeToggle';

const drawerWidth = 260;

// @important: Menu items with required permissions
const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/dashboard',
    requiredPermissions: [Permission.VIEW_OWN_USAGE, Permission.VIEW_ALL_USAGE],
    guestAccessible: false
  },
  { 
    text: 'Users', 
    icon: <PeopleIcon />, 
    path: '/users',
    requiredPermissions: [Permission.MANAGE_TEAM_MEMBERS, Permission.MANAGE_ALL_TEAMS],
    guestAccessible: false
  },
  { 
    text: 'API Keys', 
    icon: <ApiKeyIcon />, 
    path: '/api-keys',
    requiredPermissions: [Permission.USE_API],
    guestAccessible: false
  },
  { 
    text: 'Analytics', 
    icon: <AssessmentIcon />, 
    path: '/analytics',
    requiredPermissions: [Permission.VIEW_TEAM_USAGE, Permission.VIEW_ALL_USAGE],
    guestAccessible: false
  },
  { 
    text: 'Playground', 
    icon: <CodeIcon />, 
    path: '/playground',
    requiredPermissions: [Permission.USE_API],
    guestAccessible: false
  },
  { 
    text: 'Settings', 
    icon: <SettingsIcon />, 
    path: '/settings',
    requiredPermissions: [Permission.VIEW_SETTINGS, Permission.EDIT_SETTINGS, Permission.SYSTEM_CONFIGURATION],
    guestAccessible: false
  },
  { 
    text: 'Models', 
    icon: <ScienceIcon />, 
    path: '/models',
    requiredPermissions: [Permission.SYSTEM_CONFIGURATION],
    guestAccessible: false
  },
  { 
    text: 'Get Started', 
    icon: <RocketIcon />, 
    path: '/get-started',
    requiredPermissions: [],
    guestAccessible: true
  },
  { 
    text: 'Developer Docs', 
    icon: <MenuBookIcon />, 
    path: '/docs',
    requiredPermissions: [],
    guestAccessible: true
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
  marginLeft: 0,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: `${drawerWidth}px`,
  }),
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    padding: theme.spacing(2),
    width: '100%',
  },
}));

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{
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
  boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.06)',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'space-between',
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
}));

const Logo = styled('img')({
  height: 32,
  marginRight: 8,
});

const MenuSection = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
}));

const MenuSectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  color: theme.palette.text.secondary,
  padding: theme.spacing(0, 2),
  marginBottom: theme.spacing(1),
}));

interface DashboardLayoutProps {
  children: React.ReactNode;
  isGuestMode?: boolean;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, isGuestMode = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Determine which logo to use based on theme mode
  // @important: Keep using SVG logos for the dashboard UI
  const logoSrc = theme.palette.mode === 'dark' ? '/assets/logo_neg.svg' : '/assets/logo.svg';
  
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  
  // Check if user has any of the required permissions
  const hasRequiredPermissions = (requiredPermissions: Permission[]): boolean => {
    if (isGuestMode) return false;
    if (!user || !user.role) return false;
    return hasAnyPermission(user.role as Role, requiredPermissions);
  };
  
  // Close drawer on mobile by default
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

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
  
  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };
  
  const toggleHelpMenu = () => {
    setHelpMenuOpen(!helpMenuOpen);
  };

  const renderNavigationItems = () => {
    const items = [
      {
        text: 'Dashboard',
        icon: <DashboardIcon />,
        path: '/dashboard',
        permission: Permission.VIEW_OWN_USAGE,
      },
      {
        text: 'API Keys',
        icon: <ApiKeyIcon />,
        path: '/api-keys',
        permission: Permission.USE_API,
      },
      {
        text: 'Documentation',
        icon: <MenuBookIcon />,
        path: '/docs',
        permission: Permission.VIEW_DOCS,
      },
      {
        text: 'Playground',
        icon: <ScienceIcon />,
        path: '/playground',
        permission: Permission.USE_API,
      },
      {
        text: 'Get Started',
        icon: <RocketIcon />,
        path: '/get-started',
        permission: Permission.VIEW_DOCS,
      },
    ];

    // Add admin-only items
    if (user && hasAnyPermission(user.role, [Permission.MANAGE_TEAM_MEMBERS, Permission.MANAGE_ALL_TEAMS])) {
      items.push(
        {
          text: 'Team Management',
          icon: <PeopleIcon />,
          path: '/teams',
          permission: Permission.MANAGE_TEAM_MEMBERS,
        }
      );
    }

    // Add super admin-only items
    if (user && user.role === Role.SUPER_ADMIN) {
      items.push(
        {
          text: 'Users',
          icon: <GroupIcon />,
          path: '/users',
          permission: Permission.MANAGE_ALL_TEAMS,
        }
      );
    }

    return items.map((item) => (
      <ListItem key={item.text} disablePadding>
        <ListItemButton
          selected={location.pathname === item.path}
          onClick={() => navigate(item.path)}
          sx={{
            minHeight: 48,
            px: 2.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
              '& .MuiListItemIcon-root': {
                color: 'inherit',
              },
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: 3,
              justifyContent: 'center',
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.text} />
        </ListItemButton>
      </ListItem>
    ));
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBarStyled position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{
              marginRight: 2,
              ...(open && { display: 'none' }),
            }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* Add logo to AppBar when drawer is closed */}
          {!open && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              <img src={logoSrc} alt="PeerAI Logo" style={{ height: 28, marginRight: 8 }} />
            </Box>
          )}
          
          {/* Page title based on current route */}
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
          </Typography>
          
          {/* Theme toggle for all users */}
          <ThemeToggle />
          
          {/* Only show these controls for authenticated users */}
          {!isGuestMode && (
            <>
              <Tooltip title="Notifications">
                <IconButton 
                  color="inherit" 
                  onClick={handleNotificationMenuOpen}
                  sx={{ mx: 1 }}
                >
                  <Badge badgeContent={3} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Account">
                <IconButton
                  onClick={handleUserMenuOpen}
                  color="inherit"
                  sx={{ ml: 1 }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                    }}
                  >
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>
              </Tooltip>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleUserMenuClose}>
                  <ListItemIcon>
                    <AccountCircleIcon fontSize="small" />
                  </ListItemIcon>
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
              
              <Menu
                anchorEl={notificationAnchorEl}
                open={Boolean(notificationAnchorEl)}
                onClose={handleNotificationMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleNotificationMenuClose}>
                  <Typography variant="inherit" noWrap>
                    New user registered
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleNotificationMenuClose}>
                  <Typography variant="inherit" noWrap>
                    Usage limit reached
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleNotificationMenuClose}>
                  <Typography variant="inherit" noWrap>
                    System update completed
                  </Typography>
                </MenuItem>
              </Menu>
            </>
          )}
          
          {/* Show login button for guest users */}
          {isGuestMode && (
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
          )}
        </Toolbar>
      </AppBarStyled>
      
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
          <LogoContainer>
            <Logo src={logoSrc} alt="PeerAI Logo" />
            <Typography variant="h6" noWrap component="div">
              PeerAI
            </Typography>
          </LogoContainer>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        
        <Divider />
        
        <MenuSection>
          <MenuSectionTitle>
            MAIN
          </MenuSectionTitle>
          <List>
            {renderNavigationItems()}
          </List>
        </MenuSection>
        
        <Divider />
        
        {/* Only show support section for authenticated users */}
        {!isGuestMode && (
          <MenuSection>
            <MenuSectionTitle>
              SUPPORT
            </MenuSectionTitle>
            <List>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={toggleHelpMenu}
                  sx={{
                    borderRadius: '0 24px 24px 0',
                    mx: 1,
                    my: 0.5,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                    <HelpIcon />
                  </ListItemIcon>
                  <ListItemText primary="Help & Resources" />
                  {helpMenuOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </ListItemButton>
              </ListItem>
              
              <Collapse in={helpMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItemButton
                    sx={{ pl: 4, borderRadius: '0 24px 24px 0', mx: 1, my: 0.5 }}
                    onClick={() => window.open('https://docs.peerai.com', '_blank')}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                      <MenuBookIcon />
                    </ListItemIcon>
                    <ListItemText primary="Documentation" />
                  </ListItemButton>
                  
                  <ListItemButton
                    sx={{ pl: 4, borderRadius: '0 24px 24px 0', mx: 1, my: 0.5 }}
                    onClick={() => window.open('https://support.peerai.com', '_blank')}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                      <SupportIcon />
                    </ListItemIcon>
                    <ListItemText primary="Support" />
                  </ListItemButton>
                </List>
              </Collapse>
            </List>
          </MenuSection>
        )}
        
        {/* Support section for guest users */}
        {isGuestMode && (
          <MenuSection>
            <MenuSectionTitle>
              SUPPORT
            </MenuSectionTitle>
            <List>
              <ListItem disablePadding>
                <ListItemButton
                  sx={{
                    borderRadius: '0 24px 24px 0',
                    mx: 1,
                    my: 0.5,
                  }}
                  onClick={() => window.open('https://github.com/peerai', '_blank')}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                    <GitHubIcon />
                  </ListItemIcon>
                  <ListItemText primary="GitHub" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  sx={{
                    borderRadius: '0 24px 24px 0',
                    mx: 1,
                    my: 0.5,
                  }}
                  onClick={() => window.open('mailto:support@peerai.com', '_blank')}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
                    <SupportIcon />
                  </ListItemIcon>
                  <ListItemText primary="Contact Support" />
                </ListItemButton>
              </ListItem>
            </List>
          </MenuSection>
        )}
        
        {/* Show a simplified footer for guest mode */}
        {isGuestMode && (
          <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} PeerAI
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Powerful AI for developers
            </Typography>
          </Box>
        )}
        
        {/* User info section for authenticated users */}
        {!isGuestMode && user && (
          <Box
            sx={{
              p: 2,
              mt: 'auto',
              borderTop: '1px solid rgba(0, 0, 0, 0.12)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                width: 40,
                height: 40,
              }}
            >
              {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ ml: 2, overflow: 'hidden' }}>
              <Typography variant="body2" noWrap>
                {user.name || user.email}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {user.email}
              </Typography>
            </Box>
          </Box>
        )}
      </Drawer>
      
      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
};

export default DashboardLayout; 