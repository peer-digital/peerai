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
  // Badge removed,
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
  // SettingsIcon removed,
  // AssessmentIcon removed,
  Code as CodeIcon,
  // AccountCircleIcon removed,
  MenuBook as MenuBookIcon,
  // NotificationsIcon removed
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
  Logout as LogoutIcon,
  Rocket as RocketIcon,
  Support as SupportIcon,
  GitHub as GitHubIcon,
  Science as ScienceIcon,
  Share as ShareIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Permission, Role } from '../types/rbac';
import { hasAnyPermission } from '../utils/rbac';
import ThemeToggle from '../components/ui/ThemeToggle';
import ReferralModal from '../components/ReferralModal';

// Responsive drawer width
const drawerWidth = 260;
const mobileDrawerWidth = '100%';

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  requiredPermissions?: Permission[];
  guestAccessible?: boolean;
}

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
  overflowX: 'hidden', // Prevent horizontal scrolling
  maxWidth: '100vw', // Limit width to viewport
  boxSizing: 'border-box', // Include padding in width calculation
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
  [theme.breakpoints.down('xs')]: {
    padding: theme.spacing(1.5),
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
  [theme.breakpoints.down('sm')]: {
    width: '100%',
  },
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
  onOpenReferralModal?: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, isGuestMode = false, onOpenReferralModal }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

  // Determine which logo to use based on theme mode
  // @important: Keep using SVG logos for the dashboard UI
  const logoSrc = theme.palette.mode === 'dark' ? '/assets/logo_neg.svg' : '/assets/logo.svg';

  const [open, setOpen] = useState(!isMobile);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  // Notification bell removed
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);

  // Check if user has any of the required permissions
  const hasRequiredPermissions = (requiredPermissions: Permission[]): boolean => {
    if (isGuestMode) return false;
    if (!user) return false;
    return hasAnyPermission(user, requiredPermissions);
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
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Notification handlers removed

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
    navigate('/login');
  };

  const toggleHelpMenu = () => {
    setHelpMenuOpen(!helpMenuOpen);
  };

  // @important: Menu items with required permissions
  const menuItems: MenuItem[] = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'API Keys', icon: <ApiKeyIcon />, path: '/api-keys' },
    { text: 'Documentation', icon: <MenuBookIcon />, path: '/docs' },
    { text: 'Playground', icon: <ScienceIcon />, path: '/playground' },
    // Analytics and Settings menu items removed
    // Only show these items for super admins
    ...(user?.role === Role.SUPER_ADMIN ? [
      { text: 'Users', icon: <PeopleIcon />, path: '/users' },
      { text: 'Teams', icon: <PeopleIcon />, path: '/teams' },
      { text: 'Models', icon: <ScienceIcon />, path: '/models' },
    ] : []),
  ];

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
              {/* Refer a Friend button - show text only on larger screens */}
              <Tooltip title="Refer a Friend">
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setIsReferralModalOpen(true);
                    onOpenReferralModal?.();
                  }}
                  sx={{
                    mr: 1,
                    '& .MuiButton-startIcon': {
                      mr: { xs: 0, sm: 1 }
                    },
                  }}
                >
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Refer a Friend
                  </Box>
                </Button>
              </Tooltip>

              {/* Notification bell removed */}

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
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                {/* Profile menu item removed */}
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>

              {/* Notification menu removed */}
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
          width: { xs: '100%', sm: drawerWidth },
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: { xs: '85%', sm: drawerWidth },
            boxSizing: 'border-box',
          },
          '& .MuiBackdrop-root': {
            // Ensure backdrop is properly removed when drawer closes
            zIndex: -1,
          },
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={isMobile ? handleDrawerClose : undefined}
        ModalProps={{
          keepMounted: true, // Better mobile performance
          disableScrollLock: true, // Prevent scroll issues
          disablePortal: false, // Use portal for proper stacking
        }}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <img src={logoSrc} alt="PeerAI Logo" style={{ height: 28, marginRight: 8 }} />
          </Box>
        </DrawerHeader>
        <Divider />
        <List>
          {menuItems.map((item) => {
            // Skip menu items that require permissions the user doesn't have
            if (item.requiredPermissions && !hasRequiredPermissions(item.requiredPermissions)) {
              return null;
            }
            // Skip menu items that aren't guest accessible in guest mode
            if (isGuestMode && !item.guestAccessible) {
              return null;
            }

            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => {
                    // First close the drawer on mobile to prevent overlay issues
                    if (isMobile) {
                      setOpen(false); // Directly set state instead of using handler
                    }
                    // Use setTimeout to ensure drawer closes before navigation
                    setTimeout(() => {
                      navigate(item.path);
                    }, isMobile ? 150 : 0);
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      <Main open={open}>
        <DrawerHeader />
        {children}
      </Main>

      {/* Referral Modal */}
      <ReferralModal
        open={isReferralModalOpen}
        onClose={() => {
          setIsReferralModalOpen(false);
          onOpenReferralModal?.();
        }}
      />
    </Box>
  );
};

export default DashboardLayout;