import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import api from '../api/config';
import { useAuth } from '../contexts/AuthContext';
import { Permission, Role, hasPermission } from '../types/rbac';

interface AnalyticsData {
  timeSeriesData: {
    date: string;
    requests: number;
    tokens: number;
    latency: number;
  }[];
  modelDistribution: {
    model: string;
    requests: number;
    tokens: number;
  }[];
  topEndpoints: {
    endpoint: string;
    requests: number;
    avgLatency: number;
  }[];
}

// Fallback data to use when API endpoints are not available
const fallbackData: AnalyticsData = {
  timeSeriesData: [
    { date: '2023-07-01', requests: 120, tokens: 15000, latency: 250 },
    { date: '2023-07-02', requests: 150, tokens: 18000, latency: 245 },
    { date: '2023-07-03', requests: 180, tokens: 22000, latency: 260 },
    { date: '2023-07-04', requests: 210, tokens: 25000, latency: 240 },
    { date: '2023-07-05', requests: 190, tokens: 23000, latency: 255 },
    { date: '2023-07-06', requests: 220, tokens: 27000, latency: 235 },
    { date: '2023-07-07', requests: 250, tokens: 30000, latency: 230 },
  ],
  modelDistribution: [
    { model: 'GPT-4', requests: 450, tokens: 60000 },
    { model: 'Claude 3', requests: 350, tokens: 45000 },
    { model: 'Llama 3', requests: 250, tokens: 35000 },
    { model: 'Mistral', requests: 150, tokens: 20000 },
  ],
  topEndpoints: [
    { endpoint: '/api/v1/completions', requests: 600, avgLatency: 240 },
    { endpoint: '/api/v1/chat', requests: 450, avgLatency: 260 },
    { endpoint: '/api/v1/embeddings', requests: 300, avgLatency: 180 },
    { endpoint: '/api/v1/models', requests: 150, avgLatency: 120 },
  ]
};

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

// Helper function to calculate percentages for pie charts
const calculatePercentages = (data: AnalyticsData['modelDistribution'] | undefined, key: 'requests' | 'tokens'): (AnalyticsData['modelDistribution']) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    // Return empty array or default data if input is undefined or empty
    return fallbackData.modelDistribution.map(item => ({
      ...item,
      percent: 0
    }));
  }
  
  const total = data.reduce((sum, item) => sum + item[key], 0);
  return data.map(item => ({
    ...item,
    percent: total > 0 ? item[key] / total : 0
  }));
};

// Helper function to normalize API response data
const normalizeAnalyticsData = (apiData: any): AnalyticsData => {
  // If the data is already in the correct format, return it
  if (
    apiData &&
    Array.isArray(apiData.timeSeriesData) &&
    Array.isArray(apiData.modelDistribution) &&
    Array.isArray(apiData.topEndpoints)
  ) {
    return apiData as AnalyticsData;
  }

  // Otherwise, try to extract data or use fallback
  const result: AnalyticsData = {
    timeSeriesData: Array.isArray(apiData?.timeSeriesData) 
      ? apiData.timeSeriesData 
      : fallbackData.timeSeriesData,
    
    modelDistribution: Array.isArray(apiData?.modelDistribution) 
      ? apiData.modelDistribution 
      : fallbackData.modelDistribution,
    
    topEndpoints: Array.isArray(apiData?.topEndpoints) 
      ? apiData.topEndpoints 
      : fallbackData.topEndpoints
  };

  return result;
};

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [viewType, setViewType] = useState<'personal' | 'team' | 'all'>('personal');
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>(fallbackData);
  const [showFallbackAlert, setShowFallbackAlert] = useState(false);

  // Determine the view type based on user role
  useEffect(() => {
    if (hasPermission(user?.role || Role.USER, Permission.VIEW_ALL_USAGE)) {
      setViewType('all');
    } else if (hasPermission(user?.role || Role.USER, Permission.VIEW_TEAM_USAGE)) {
      setViewType('team');
    } else {
      setViewType('personal');
    }
  }, [user]);

  // Query for the appropriate data based on view type
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics', viewType, timeRange, selectedTeam, selectedUser],
    queryFn: async () => {
      let endpoint = '/admin/analytics/personal';
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      
      if (viewType === 'team') {
        endpoint = '/admin/analytics/team';
      } else if (viewType === 'all') {
        endpoint = '/admin/analytics';
        
        if (selectedTeam) {
          params.append('teamId', selectedTeam);
        }
        
        if (selectedUser) {
          params.append('userId', selectedUser);
        }
      }
      
      try {
        const response = await api.get(`${endpoint}?${params.toString()}`);
        return response.data;
      } catch (error) {
        console.warn(`Error fetching analytics data from ${endpoint}: `, error);
        // If the personal or team endpoint fails, try the admin endpoint as fallback
        if (endpoint !== '/admin/analytics' && hasPermission(user?.role || Role.USER, Permission.VIEW_ALL_USAGE)) {
          try {
            const adminResponse = await api.get(`/admin/analytics?${params.toString()}`);
            return adminResponse.data;
          } catch (adminError) {
            console.error('Admin endpoint also failed: ', adminError);
            setShowFallbackAlert(true);
            return fallbackData;
          }
        }
        setShowFallbackAlert(true);
        return fallbackData;
      }
    },
  });

  // Update local state when query data changes
  useEffect(() => {
    if (data) {
      const normalizedData = normalizeAnalyticsData(data);
      setAnalyticsData(normalizedData);
      setShowFallbackAlert(false);
    } else if (error) {
      console.log('Setting fallback data due to error:', error);
      setAnalyticsData(fallbackData);
      setShowFallbackAlert(true);
    }
  }, [data, error]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };

  const handleTeamChange = (event: SelectChangeEvent) => {
    setSelectedTeam(event.target.value);
    setSelectedUser(''); // Reset user selection when team changes
  };

  const handleUserChange = (event: SelectChangeEvent) => {
    setSelectedUser(event.target.value);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Analytics title based on view type
  const getAnalyticsTitle = () => {
    switch (viewType) {
      case 'all':
        return 'System-wide Analytics';
      case 'team':
        return 'Team Analytics';
      default:
        return 'Personal Analytics';
    }
  };

  // Prepare data for pie charts with percentages
  const requestsData = calculatePercentages(analyticsData?.modelDistribution, 'requests');
  const tokensData = calculatePercentages(analyticsData?.modelDistribution, 'tokens');

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        {getAnalyticsTitle()}
      </Typography>

      {showFallbackAlert && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Some analytics endpoints are not available. Showing sample data for demonstration purposes.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading analytics data. Using sample data instead.
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        {/* Time range selector */}
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel id="time-range-label">Time Range</InputLabel>
          <Select
            labelId="time-range-label"
            id="time-range-select"
            value={timeRange}
            label="Time Range"
            onChange={handleTimeRangeChange}
          >
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
          </Select>
        </FormControl>

        {/* Team selector - only for super admins */}
        {viewType === 'all' && (
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="team-label">Team</InputLabel>
            <Select
              labelId="team-label"
              id="team-select"
              value={selectedTeam}
              label="Team"
              onChange={handleTeamChange}
            >
              <MenuItem value="">All Teams</MenuItem>
              <MenuItem value="team1">Engineering</MenuItem>
              <MenuItem value="team2">Product</MenuItem>
              <MenuItem value="team3">Marketing</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* User selector - only for super admins and when a team is selected */}
        {viewType === 'all' && selectedTeam && (
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel id="user-label">User</InputLabel>
            <Select
              labelId="user-label"
              id="user-select"
              value={selectedUser}
              label="User"
              onChange={handleUserChange}
            >
              <MenuItem value="">All Users</MenuItem>
              <MenuItem value="user1">John Doe</MenuItem>
              <MenuItem value="user2">Jane Smith</MenuItem>
              <MenuItem value="user3">Bob Johnson</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Tabs - for all view types */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
          <Tab label="Usage Trends" />
          <Tab label="Model Distribution" />
          <Tab label="Top Endpoints" />
        </Tabs>
      </Box>

      {/* Usage Trends Tab */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Usage Trends
          </Typography>
          <Box sx={{ height: 400, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={analyticsData.timeSeriesData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  name="Tokens (thousands)"
                  stroke="#82ca9d"
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  name="Avg. Latency (ms)"
                  stroke="#ffc658"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </TabPanel>

      {/* Model Distribution Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Model Distribution
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" align="center" gutterBottom>
                Requests by Model
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={requestsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="requests"
                      nameKey="model"
                    >
                      {requestsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} requests`, 'Requests']} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" align="center" gutterBottom>
                Tokens by Model
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tokensData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="tokens"
                      nameKey="model"
                    >
                      {tokensData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} tokens`, 'Tokens']} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>

      {/* Top Endpoints Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Top Endpoints
          </Typography>
          <Box sx={{ height: 400, mt: 2 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.topEndpoints}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="endpoint" type="category" width={150} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="requests"
                  name="Requests"
                  fill="#8884d8"
                />
                <Bar
                  dataKey="avgLatency"
                  name="Avg. Latency (ms)"
                  fill="#82ca9d"
                />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default Analytics; 