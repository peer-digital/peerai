import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Stack,
  Chip,
  Alert,
  Tabs,
  Tab,
  Button,
  Snackbar,
  IconButton,
} from '@mui/material';
import { PageTitle } from '../components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CloseIcon from '@mui/icons-material/Close';
import api from '../api/config';
import { useAuth } from '../contexts/AuthContext';
import { Permission, Role } from '../types/rbac';
import { hasAnyPermission } from '../utils/rbac';

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  activeUsers: number;
  averageLatency: number;
  requestsChange: number;
  tokensChange: number;
  usersChange: number;
  latencyChange: number;
  dailyStats: {
    date: string;
    requests: number;
    tokens: number;
    users: number;
    latency: number;
  }[];
  modelUsage: {
    model: string;
    requests: number;
    percentage: number;
  }[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      style={{ width: '100%', minWidth: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, width: '100%', minWidth: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MetricCard = ({ title, value, change, suffix = '' }: {
  title: string;
  value: number;
  change: number;
  suffix?: string;
}) => (
  <Card elevation={0} sx={{ height: '100%', bgcolor: 'background.default' }}>
    <CardContent>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ mb: 1 }}>
        {value.toLocaleString()}{suffix}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Chip
          size="small"
          icon={change >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
          label={`${Math.abs(change)}% ${change >= 0 ? 'increase' : 'decrease'}`}
          color={change >= 0 ? 'success' : 'error'}
          variant="outlined"
        />
        <Typography variant="caption" color="textSecondary">
          vs last period
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);

const EmptyState = () => (
  <Box sx={{ textAlign: 'center', py: 4 }}>
    <Typography color="text.secondary" variant="body2">
      No data available
    </Typography>
  </Box>
);

interface DashboardProps {
  isReferralModalOpen: boolean;
  onReferralModalClose: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ isReferralModalOpen, onReferralModalClose }) => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [viewType, setViewType] = useState<'personal' | 'team' | 'all'>('personal');

  // Determine the view type based on user role
  useEffect(() => {
    if (!user) return;

    if (hasAnyPermission(user, [Permission.VIEW_ALL_USAGE])) {
      setViewType('all');
    } else if (hasAnyPermission(user, [Permission.VIEW_TEAM_USAGE])) {
      setViewType('team');
    } else {
      setViewType('personal');
    }
  }, [user]);

  // Query for the appropriate data based on view type
  const { data: stats, isLoading, error } = useQuery<UsageStats>({
    queryKey: ['usage-stats', viewType],
    queryFn: async () => {
      let endpoint = '/admin/usage/personal';

      if (viewType === 'team') {
        endpoint = '/admin/usage/team';
      } else if (viewType === 'all') {
        endpoint = '/admin/stats';
      }

      const response = await api.get(endpoint);
      console.log('Usage stats:', response.data);
      return response.data;
    },
  });

  // Calculate token usage percentage
  const tokenUsagePercentage = stats && user ? (stats.totalTokens / user.token_limit) * 100 : 0;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Debug log for stats
  useEffect(() => {
    if (stats) {
      console.log('Token usage percentage:', tokenUsagePercentage);
      console.log('Total tokens:', stats.totalTokens);
    }
  }, [stats, tokenUsagePercentage]);

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 1 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error loading dashboard data. Please try again later.
        </Alert>
      </Box>
    );
  }

  if (!stats) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          No dashboard data available
        </Alert>
      </Box>
    );
  }

  // Dashboard title based on view type
  const getDashboardTitle = () => {
    switch (viewType) {
      case 'all':
        return 'System-wide Usage Dashboard';
      case 'team':
        return 'Team Usage Dashboard';
      default:
        return 'Personal Usage Dashboard';
    }
  };

  return (
    <Box p={3} sx={{ width: '100%', minWidth: '100%' }}>

      {/* Token Status Alert */}
      {stats && user && tokenUsagePercentage >= 100 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button
              variant="contained"
              color="primary"
              href="mailto:info@peerdigital.se?subject=Token%20Request"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get New Tokens
            </Button>
          }
        >
          You have reached your token limit. Please contact us to get more tokens.
        </Alert>
      )}

      {/* Super Admin Tabs - only show if user has VIEW_ALL_USAGE permission */}
      {viewType === 'all' && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab label="Overview" />
            <Tab label="By Team" />
            <Tab label="By User" />
          </Tabs>
        </Box>
      )}

      <TabPanel value={tabValue} index={0}>
        {/* Key Metrics */}
        <Grid container spacing={3} mb={4} sx={{ width: '100%', minWidth: '100%' }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Requests"
              value={stats.totalRequests}
              change={stats.requestsChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Tokens"
              value={stats.totalTokens}
              change={stats.tokensChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title={viewType === 'personal' ? 'Your Sessions' : 'Active Users'}
              value={stats.activeUsers}
              change={stats.usersChange}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Avg. Latency"
              value={stats.averageLatency}
              change={stats.latencyChange}
              suffix="ms"
            />
          </Grid>
        </Grid>

        {/* Token Usage Progress Bar */}
        {viewType === 'personal' && user && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Token Usage
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                {stats.totalTokens.toLocaleString()} / {user.token_limit.toLocaleString()} tokens
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ({tokenUsagePercentage.toFixed(1)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(tokenUsagePercentage, 100)}
              sx={{
                height: 8,
                borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.05)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 1,
                  bgcolor: tokenUsagePercentage >= 90 ? 'error.main' :
                           tokenUsagePercentage >= 75 ? 'warning.main' : 'primary.main',
                }
              }}
            />
            {tokenUsagePercentage >= 90 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                You are approaching your token limit. Please contact info@peerdigital.se to increase your limit.
              </Alert>
            )}
          </Paper>
        )}

        <Grid container spacing={3} sx={{ width: '100%', minWidth: '100%' }}>
          {/* Usage Trends */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Usage Trends
              </Typography>
              <Box sx={{ width: '100%', height: 400 }}>
                {stats.dailyStats && stats.dailyStats.length > 0 ? (
                  <ResponsiveContainer>
                    <AreaChart
                      data={stats.dailyStats}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 30,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="requests"
                        name="Requests"
                        fill="#2563eb"
                        stroke="#2563eb"
                        fillOpacity={0.1}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        dataKey="tokens"
                        name="Tokens"
                        fill="#4f46e5"
                        stroke="#4f46e5"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState />
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Model Usage Distribution */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Model Usage Distribution
              </Typography>
              <Box sx={{ mt: 2 }}>
                {stats.modelUsage && stats.modelUsage.length > 0 ? (
                  stats.modelUsage.map((model) => (
                    <Box key={model.model} sx={{ mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Typography variant="body2">
                          {model.model}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {model.requests.toLocaleString()} requests
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={model.percentage}
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          bgcolor: 'rgba(0,0,0,0.05)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 1,
                          }
                        }}
                      />
                    </Box>
                  ))
                ) : (
                  <EmptyState />
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Team breakdown tab - only for super admins */}
      {viewType === 'all' && (
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Usage by Team
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            This view shows usage statistics broken down by team.
          </Alert>
          {/* Team breakdown charts would go here */}
          <EmptyState />
        </TabPanel>
      )}

      {/* User breakdown tab - only for super admins */}
      {viewType === 'all' && (
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Usage by User
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            This view shows usage statistics broken down by individual users.
          </Alert>
          {/* User breakdown charts would go here */}
          <EmptyState />
        </TabPanel>
      )}
    </Box>
  );
};

export default Dashboard;