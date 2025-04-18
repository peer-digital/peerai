import React, { useState, useEffect, useRef } from 'react';
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
  Link,
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
import { AnnouncementBanner } from '../components/ui';
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
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: 0,
  overflowX: 'hidden', // Prevent horizontal scrolling
  overflowY: 'auto', // Enable vertical scrolling when needed
  width: '100%', // Take full width when drawer is closed
  minWidth: '100%', // Ensure minimum width is also 100%
  maxWidth: '100vw', // Limit width to viewport
  boxSizing: 'border-box', // Include padding in width calculation
  display: 'flex', // Use flexbox for centering
  flexDirection: 'column', // Stack children vertically
  alignItems: 'center', // Center horizontally
  ...(open && {
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: `${drawerWidth}px`,
    width: `calc(100% - ${drawerWidth}px)`, // Adjust width when drawer is open
    minWidth: `calc(100% - ${drawerWidth}px)`, // Adjust min-width when drawer is open
  }),
  // Add width constraint for larger screens
  [theme.breakpoints.up('lg')]: {
    width: '80%',
    minWidth: '80%',
    maxWidth: '1400px',
    ...(open ? {
      // When sidebar is open, we need to adjust the left margin to account for the drawer
      // and adjust the right margin to maintain visual balance
      marginLeft: `calc(${drawerWidth}px + (100% - ${drawerWidth}px - 80%) / 2)`,
      marginRight: `calc((100% - ${drawerWidth}px - 80%) / 2)`,
    } : {
      // When sidebar is closed, we can use auto margins to center
      marginLeft: 'auto',
      marginRight: 'auto',
    }),
  },
  [theme.breakpoints.up('xl')]: {
    width: '70%',
    minWidth: '70%',
    maxWidth: '1600px',
    ...(open ? {
      // When sidebar is open, we need to adjust the left margin to account for the drawer
      // and adjust the right margin to maintain visual balance
      marginLeft: `calc(${drawerWidth}px + (100% - ${drawerWidth}px - 70%) / 2)`,
      marginRight: `calc((100% - ${drawerWidth}px - 70%) / 2)`,
    } : {
      // When sidebar is closed, we can use auto margins to center
      marginLeft: 'auto',
      marginRight: 'auto',
    }),
  },
  [theme.breakpoints.down('sm')]: {
    marginLeft: 0,
    width: '100%', // Always full width on mobile
    minWidth: '100%', // Always full min-width on mobile
    padding: theme.spacing(2),
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
  announcementProps?: {
    message: string;
    ctaText?: string;
    ctaLink?: string;
    bannerColor?: string;
    textColor?: string;
    bannerId?: string;
    enabled?: boolean;
  };
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  isGuestMode = false,
  onOpenReferralModal,
  announcementProps
}) => {
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

  // Track previous pathname to detect actual navigation changes
  const prevPathnameRef = useRef(location.pathname);

  // Close drawer when location changes (route navigation) on mobile
  useEffect(() => {
    // Only close if the pathname actually changed and drawer is open on mobile
    if (isMobile && open && prevPathnameRef.current !== location.pathname) {
      // Use a small delay to ensure the drawer closes after navigation
      const timer = setTimeout(() => {
        setOpen(false);
      }, 50);

      // Update the ref with current pathname
      prevPathnameRef.current = location.pathname;

      return () => clearTimeout(timer);
    } else {
      // Just update the ref without closing the drawer
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname, isMobile, open]);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  // Helper function to clean up modal elements
  const cleanupModalElements = () => {
    setTimeout(() => {
      // Clean up any lingering backdrop
      const backdrops = document.querySelectorAll('.MuiBackdrop-root');
      backdrops.forEach(backdrop => {
        if (backdrop.getAttribute('aria-hidden') === 'true') {
          (backdrop as HTMLElement).style.display = 'none';
        }
      });

      // Clean up any lingering drawer modal
      const drawerModal = document.querySelector('.css-1so0oxj-MuiModal-root-MuiDrawer-root');
      if (drawerModal && drawerModal.getAttribute('aria-hidden') === 'true') {
        (drawerModal as HTMLElement).style.display = 'none';
      }

      // Clean up any lingering menu modal
      const menuModal = document.querySelector('.css-10nakn3-MuiModal-root-MuiPopover-root-MuiMenu-root');
      if (menuModal && menuModal.getAttribute('aria-hidden') === 'true') {
        (menuModal as HTMLElement).style.display = 'none';
      }

      // Fix for the problematic MuiDrawer-docked class
      const dockedDrawer = document.querySelector('.MuiDrawer-docked.css-qt446r-MuiDrawer-docked');
      if (dockedDrawer && !open) {
        (dockedDrawer as HTMLElement).style.position = 'absolute';
        (dockedDrawer as HTMLElement).style.width = '0';
        (dockedDrawer as HTMLElement).style.overflow = 'hidden';
      }
    }, 300); // Wait for transition to complete
  };

  const handleDrawerClose = () => {
    // Close the drawer
    setOpen(false);

    // Force cleanup of any lingering backdrop or overlay
    cleanupModalElements();
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
    cleanupModalElements();
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
                onClick={handleUserMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                // Use closeAfterTransition and BackdropProps instead of slotProps
                closeAfterTransition
                BackdropProps={{
                  onClick: handleUserMenuClose,
                  onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => {
                    e.preventDefault();
                    handleUserMenuClose();
                  },
                }}
                MenuListProps={{
                  'aria-labelledby': 'user-menu-button',
                  dense: true,
                }}
                disableScrollLock
                disablePortal={false}
                keepMounted={false}
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
          // Fix for the persistent overlay issue
          '& .MuiModal-root': {
            position: open ? 'fixed' : 'absolute',
            zIndex: open ? 1200 : -1, // Use fixed value 1200 instead of theme.zIndex.drawer
          },
          '& .MuiBackdrop-root': {
            display: open ? 'block' : 'none',
          },
          // Fix for the MuiDrawer-docked issue
          '& .MuiDrawer-docked': {
            position: open ? 'relative' : 'absolute',
            // When closed, make sure it doesn't affect layout
            '& .MuiPaper-root': {
              position: open ? 'relative' : 'absolute',
            },
          },
          // Hide the drawer completely when closed
          ...(isMobile === false && open === false && {
            display: 'none',
          }),
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: false, // Don't keep the drawer mounted when closed
          disableScrollLock: true, // Prevent scroll issues
          disablePortal: false, // Use portal for proper stacking
          closeAfterTransition: true, // Ensure proper cleanup after transition
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
                    // Only navigate if we're not already on this path
                    if (location.pathname !== item.path) {
                      // Update the ref before navigation to prevent the useEffect from closing the drawer
                      prevPathnameRef.current = item.path;

                      // Navigate to the new path
                      navigate(item.path);

                      // Close the drawer on mobile after a short delay
                      if (isMobile) {
                        setTimeout(() => {
                          handleDrawerClose();
                        }, 150);
                      }
                    } else if (isMobile) {
                      // If we're already on this path, just close the drawer
                      handleDrawerClose();
                    }
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

      <Main open={open} className="always-show-scrollbar">
        <DrawerHeader />
        {/* Show announcement banner if enabled or if announcementProps is provided */}
        <Box sx={{ width: '100%', mb: 2 }}>
          {(announcementProps?.enabled !== false && announcementProps?.message) ? (
            <AnnouncementBanner
              message={announcementProps.message}
              ctaText={announcementProps.ctaText}
              ctaLink={announcementProps.ctaLink}
              bannerColor={announcementProps.bannerColor}
              textColor={announcementProps.textColor}
              bannerId={announcementProps.bannerId}
            />
          ) : (
            // Default announcement banner
            <AnnouncementBanner
              message={<>
                Welcome to our Beta, the platform is still under development! Please <Link
                  href="mailto:info@peerdigital.se?subject=Peer%20AI%20Beta%20Feedback"
                  target="_blank"
                  rel="noopener"
                  sx={{
                    color: 'inherit',
                    textDecoration: 'underline',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  contact us
                </Link> to provide feedback or ask questions.
              </>}
              bannerId="welcome-beta-2023-en"
              // Using theme colors instead of hardcoded values
            />
          )}
        </Box>
        <Box sx={{ width: '100%' }}>
          {children}
        </Box>
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