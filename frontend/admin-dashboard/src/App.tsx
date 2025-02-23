import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { Permission, Role } from './types/rbac';
import PermissionGuard from './components/PermissionGuard';

import theme from './theme/theme';
import DashboardLayout from './layouts/DashboardLayout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy load pages for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Users = React.lazy(() => import('./pages/Users'));
const ApiKeys = React.lazy(() => import('./pages/ApiKeys'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Login = React.lazy(() => import('./pages/Login'));
const Playground = React.lazy(() => import('./pages/Playground'));
const DeveloperDocs = React.lazy(() => import('./pages/DeveloperDocs'));
const TeamManagement = React.lazy(() => import('./pages/TeamManagement'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Unauthorized = React.lazy(() => import('./pages/Unauthorized'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// @important: This should come from your auth context/state management
const userRole: Role = Role.USER_ADMIN; // Example role, replace with actual user role

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <React.Suspense fallback={<div>Loading...</div>}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="/404" element={<NotFound />} />

                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                
                {/* Protected routes */}
                <Route
                  element={
                    <PrivateRoute>
                      <DashboardLayout>
                        <Outlet />
                      </DashboardLayout>
                    </PrivateRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<PermissionGuard userRole={userRole} requiredPermissions={[Permission.VIEW_OWN_USAGE]}><Dashboard /></PermissionGuard>} />
                  <Route path="/teams" element={<PermissionGuard userRole={userRole} requiredPermissions={[Permission.MANAGE_TEAM_MEMBERS]}><TeamManagement /></PermissionGuard>} />
                  <Route path="/users" element={<PermissionGuard userRole={userRole} requiredPermissions={[Permission.MANAGE_TEAM_MEMBERS]}><UserManagement /></PermissionGuard>} />
                  <Route path="/api-keys" element={<ApiKeys />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/settings" element={<PermissionGuard userRole={userRole} requiredPermissions={[Permission.SYSTEM_CONFIGURATION]}><Settings /></PermissionGuard>} />
                  <Route path="/playground" element={<Playground />} />
                  <Route path="/docs" element={<DeveloperDocs />} />
                </Route>

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/404" replace />} />
              </Routes>
            </React.Suspense>
          </Router>
          <ToastContainer position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// Route guard for authenticated users
function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
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
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default App;
