import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Permission, Role } from './types/rbac';
import PermissionGuard from './components/PermissionGuard';
import { ToastContainer, PageLoader, MobileLoadingIndicator } from './components/ui';
import { SnackbarProvider } from './contexts/SnackbarContext';

// Import our custom ThemeProvider instead of MUI's
import { ThemeProvider } from './contexts/ThemeContext';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Users = React.lazy(() => import('./pages/Users'));
const ApiKeys = React.lazy(() => import('./pages/ApiKeys'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Login = React.lazy(() => import('./pages/Login'));
const SignUp = React.lazy(() => import('./pages/SignUp'));
const EmailVerification = React.lazy(() => import('./pages/EmailVerification'));
const Playground = React.lazy(() => import('./pages/Playground'));
const DeveloperDocs = React.lazy(() => import('./pages/DeveloperDocs'));
const GetStarted = React.lazy(() => import('./pages/GetStarted'));
const PublicApp = React.lazy(() => import('./pages/PublicApp'));
const TeamManagement = React.lazy(() => import('./pages/TeamManagement'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const ModelManagement = React.lazy(() => import('./pages/ModelManagement'));
// App Store removed - replaced with App Templates
const AppTemplatesManagement = React.lazy(() => import('./pages/AppTemplatesManagement'));
const MyApps = React.lazy(() => import('./pages/MyApps'));
const AppLibrary = React.lazy(() => import('./pages/AppLibrary'));
const DeployedAppView = React.lazy(() => import('./pages/DeployedAppView'));
const Unauthorized = React.lazy(() => import('./pages/Unauthorized'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const LegalPages = React.lazy(() => import('./pages/LegalPages'));

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Remove hardcoded role
// const userRole: Role = Role.USER_ADMIN; // Example role, replace with actual user role

function App() {
  const [isReferralModalOpen, setIsReferralModalOpen] = React.useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SnackbarProvider>
          <AuthProvider>
            <Router>
              <CssBaseline />
              <React.Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/login/:referralCode" element={<Login />} />
                  <Route path="/register" element={<Login initialMode="register" />} />
                  <Route path="/register/:referralCode" element={<Login initialMode="register" />} />
                  {/* Redirect /referral/:referralCode to /register/:referralCode */}
                  <Route path="/referral/:referralCode" element={<ReferralRedirect />} />
                  <Route path="/verify-email/:token" element={<EmailVerification />} />
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="/404" element={<NotFound />} />
                  <Route path="/get-started" element={<GetStarted />} />
                  <Route path="/policy" element={<LegalPages />} />

                  {/* Public App route - accessible without authentication */}
                  <Route path="/apps/:slug" element={<PublicApp />} />

                  {/* Protected routes */}
                  <Route
                    element={
                      <PrivateRoute>
                        <DashboardLayout onOpenReferralModal={() => setIsReferralModalOpen(true)}>
                          <Outlet />
                        </DashboardLayout>
                      </PrivateRoute>
                    }
                  >
                    <Route index element={<Navigate to="/dashboard" replace />} />

                    {/* Dashboard - different views based on role */}
                    <Route path="/dashboard" element={
                      <PermissionGuard requiredPermissions={[Permission.VIEW_OWN_USAGE, Permission.VIEW_TEAM_USAGE, Permission.VIEW_ALL_USAGE]}>
                        <Dashboard isReferralModalOpen={isReferralModalOpen} onReferralModalClose={() => setIsReferralModalOpen(false)} />
                      </PermissionGuard>
                    } />

                    {/* Team management - for admins */}
                    <Route path="/teams" element={
                      <PermissionGuard requiredPermissions={[Permission.MANAGE_TEAM_MEMBERS, Permission.MANAGE_ALL_TEAMS]}>
                        <TeamManagement />
                      </PermissionGuard>
                    } />

                    {/* User management - for super admins only */}
                    <Route path="/users" element={
                      <PermissionGuard requiredPermissions={[Permission.MANAGE_ALL_TEAMS]}>
                        <Users />
                      </PermissionGuard>
                    } />

                    {/* API Keys - for users who can use the API */}
                    <Route path="/api-keys" element={
                      <PermissionGuard requiredPermissions={[Permission.USE_API]}>
                        <ApiKeys />
                      </PermissionGuard>
                    } />

                    {/* Analytics - for admins and super admins */}
                    <Route path="/analytics" element={
                      <PermissionGuard requiredPermissions={[Permission.VIEW_TEAM_USAGE, Permission.VIEW_ALL_USAGE]}>
                        <Analytics />
                      </PermissionGuard>
                    } />

                    {/* Settings - for super admins */}
                    <Route path="/settings" element={
                      <PermissionGuard requiredPermissions={[Permission.VIEW_SETTINGS, Permission.EDIT_SETTINGS, Permission.SYSTEM_CONFIGURATION]}>
                        <Settings />
                      </PermissionGuard>
                    } />

                    {/* Model Management - for super admins only */}
                    <Route path="/models" element={
                      <PermissionGuard requiredPermissions={[Permission.SYSTEM_CONFIGURATION]}>
                        <ModelManagement />
                      </PermissionGuard>
                    } />

                    {/* Playground - for users who can use the API */}
                    <Route path="/playground" element={
                      <PermissionGuard requiredPermissions={[Permission.USE_API]}>
                        <Playground />
                      </PermissionGuard>
                    } />

                    {/* App Store route removed - functionality merged into App Playground */}

                    {/* App Store Management route removed - replaced with App Templates */}

                    {/* App Templates - for admins only */}
                    <Route path="/app-templates-management" element={
                      <PermissionGuard requiredPermissions={[Permission.MANAGE_APP_STORE]}>
                        <AppTemplatesManagement />
                      </PermissionGuard>
                    } />

                    {/* DeployedApps routes removed - replaced with MyApps */}

                    {/* My Apps */}
                    <Route path="/my-apps" element={
                      <PermissionGuard requiredPermissions={[Permission.USE_APP_STORE]}>
                        <MyApps />
                      </PermissionGuard>
                    } />
                    <Route path="/my-apps/:slug" element={
                      <PermissionGuard requiredPermissions={[Permission.USE_APP_STORE]}>
                        <DeployedAppView />
                      </PermissionGuard>
                    } />

                    {/* App Library */}
                    <Route path="/app-library" element={
                      <PermissionGuard requiredPermissions={[Permission.DEPLOY_APPS]}>
                        <AppLibrary />
                      </PermissionGuard>
                    } />

                    {/* Developer Documentation */}
                    <Route path="/docs" element={
                      <PermissionGuard requiredPermissions={[Permission.VIEW_DOCS]}>
                        <DeveloperDocs />
                      </PermissionGuard>
                    } />
                  </Route>

                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </React.Suspense>
              <ToastContainer />
            </Router>
          </AuthProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Route guard for authenticated users
function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Route guard for public routes (accessible only when not authenticated)
function PublicRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <MobileLoadingIndicator />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Layout for guest users that applies DashboardLayout
function GuestLayout({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <MobileLoadingIndicator />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout isGuestMode={true}>
      {children}
    </DashboardLayout>
  );
}

// Root redirect component that sends authenticated users to dashboard and guests to get-started
function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <MobileLoadingIndicator />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/get-started" replace />;
}

// Get Started route component that works for both authenticated and non-authenticated users
function GetStartedRoute() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <DashboardLayout>
      <GetStarted />
    </DashboardLayout>
  ) : (
    <DashboardLayout isGuestMode={true}>
      <GetStarted />
    </DashboardLayout>
  );
}

// Redirect component for referral links
function ReferralRedirect() {
  const { referralCode } = useParams();
  return <Navigate to={`/register/${referralCode}`} replace />;
}

// Redirect components removed

export default App;
