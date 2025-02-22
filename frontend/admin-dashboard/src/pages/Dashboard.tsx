import React from 'react';
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
} from '@mui/material';
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
import api from '../api/config';

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

const Dashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery<UsageStats>({
    queryKey: ['usage-stats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/stats');
      return response.data;
    },
  });

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

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
        Dashboard Overview
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
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
            title="Active Users"
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

      <Grid container spacing={3}>
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
                        bgcolor: 'background.default',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 1,
                        }
                      }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {model.percentage}% of total requests
                    </Typography>
                  </Box>
                ))
              ) : (
                <EmptyState />
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 