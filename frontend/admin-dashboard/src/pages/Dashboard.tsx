import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/config';

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  activeUsers: number;
  averageLatency: number;
  dailyStats: {
    date: string;
    requests: number;
    tokens: number;
  }[];
}

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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">
          Error loading dashboard data. Please try again later.
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Total Requests
            </Typography>
            <Typography variant="h4">
              {stats?.totalRequests.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Total Tokens
            </Typography>
            <Typography variant="h4">
              {stats?.totalTokens.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Active Users
            </Typography>
            <Typography variant="h4">
              {stats?.activeUsers.toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" color="textSecondary">
              Avg. Latency
            </Typography>
            <Typography variant="h4">
              {stats?.averageLatency.toFixed(2)}ms
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Usage Chart */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Daily Usage Statistics
        </Typography>
        <Box sx={{ width: '100%', height: 400 }}>
          <ResponsiveContainer>
            <BarChart
              data={stats?.dailyStats}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="requests" fill="#2563eb" name="Requests" />
              <Bar yAxisId="right" dataKey="tokens" fill="#4f46e5" name="Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Box>
  );
};

export default Dashboard; 