import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  CircularProgress,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { Permission } from '../types/rbac';
import PermissionGuard from '../components/PermissionGuard';
import { apiClient } from '../api/client';
import { toast } from 'react-toastify';
import { DataGrid, Column, Action } from '../components/DataGrid';

interface ModelProvider {
  id: number;
  name: string;
  display_name: string;
}

interface ModelRecord {
  id: number;
  name: string;
  display_name: string;
  provider_id: number;
  model_type: string;
  capabilities?: string[];
  context_window?: number;
  status: string;
  is_default: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  config?: any;
}

const ModelManagement: React.FC = () => {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for create/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ModelRecord | null>(null);

  // Form states
  const [formData, setFormData] = useState<Partial<ModelRecord>>({
    capabilities: [],
    config: {},
    is_default: false,
    status: 'active',
  });

  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/admin/models');
      setModels(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching models:', err);
      if (err.response?.status === 401) {
        setError('Authentication error: Please make sure you are logged in as a Super Admin');
        toast.error('Authentication error: Please log in again');
      } else if (err.response?.status === 403) {
        setError('Permission denied: You need Super Admin privileges to access this page');
        toast.error('Permission denied: Super Admin access required');
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to fetch models');
        toast.error('Failed to fetch models');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      // This endpoint needs to be implemented or you can use a mock
      const response = await apiClient.get('/api/v1/admin/providers');
      setProviders(response.data);
    } catch (err: any) {
      console.error('Error fetching providers:', err);
      // Use mock data for now
      setProviders([
        { id: 1, name: 'mistral', display_name: 'Mistral AI' },
        { id: 2, name: 'anthropic', display_name: 'Anthropic' },
        { id: 3, name: 'openai', display_name: 'OpenAI' },
        { id: 4, name: 'hosted', display_name: 'Self-hosted' },
      ]);
      
      // Only show toast for provider fetch error if it's not a 401/403
      // (to avoid duplicate errors with the models fetch)
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        toast.warning('Using mock provider data');
      }
    }
  };

  useEffect(() => {
    fetchModels();
    fetchProviders();
  }, []);

  const handleOpenDialog = (record?: ModelRecord) => {
    if (record) {
      setEditRecord(record);
      setFormData(record);
    } else {
      setEditRecord(null);
      setFormData({
        capabilities: [],
        config: {},
        is_default: false,
        status: 'active',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditRecord(null);
    setFormData({
      capabilities: [],
      config: {},
      is_default: false,
      status: 'active',
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.display_name || !formData.provider_id || !formData.model_type) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (editRecord) {
        // Update
        await apiClient.put(`/api/v1/admin/models/${editRecord.id}`, formData);
        toast.success('Model updated successfully');
      } else {
        // Create
        await apiClient.post('/api/v1/admin/models', formData);
        toast.success('Model created successfully');
      }
      handleCloseDialog();
      fetchModels();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.detail || 'Failed to save model');
    }
  };

  const handleDelete = async (record: ModelRecord) => {
    if (!window.confirm(`Are you sure you want to delete "${record.display_name}"?`)) return;
    try {
      await apiClient.delete(`/api/v1/admin/models/${record.id}`);
      toast.success('Model deleted successfully');
      fetchModels();
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.detail || 'Failed to delete model');
    }
  };

  // Helper to get provider name
  const getProviderName = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    return provider ? provider.display_name : `Provider ${providerId}`;
  };

  // DataGrid columns
  const columns: Column[] = [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'display_name', headerName: 'Display Name', width: 200 },
    { 
      field: 'provider_id', 
      headerName: 'Provider', 
      width: 120,
      renderCell: (params) => getProviderName(params.provider_id)
    },
    { field: 'model_type', headerName: 'Type', width: 120 },
    { 
      field: 'status', 
      headerName: 'Status', 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.status} 
          color={
            params.status === 'active' ? 'success' : 
            params.status === 'beta' ? 'info' : 
            params.status === 'deprecated' ? 'warning' : 'default'
          } 
          size="small" 
        />
      )
    },
    { 
      field: 'is_default', 
      headerName: 'Default', 
      width: 80,
      renderCell: (params) => params.is_default ? 'Yes' : 'No'
    },
    { field: 'cost_per_1k_input_tokens', headerName: 'Cost Input', width: 110 },
    { field: 'cost_per_1k_output_tokens', headerName: 'Cost Output', width: 110 },
    { 
      field: 'context_window', 
      headerName: 'Context', 
      width: 100,
      renderCell: (params) => params.context_window ? `${params.context_window.toLocaleString()}` : 'N/A'
    },
  ];

  // DataGrid actions
  const actions: Action[] = [
    {
      label: 'Edit',
      onClick: (row) => handleOpenDialog(row),
    },
    {
      label: 'Delete',
      onClick: (row) => handleDelete(row),
    },
  ];

  return (
    <PermissionGuard requiredPermissions={[Permission.SYSTEM_CONFIGURATION]}>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Model Management
          </Typography>
          <Box>
            <Tooltip title="Refresh Models" arrow>
              <IconButton onClick={fetchModels} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ ml: 1 }}
            >
              Create Model
            </Button>
          </Box>
        </Box>

        {error && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
            <Box display="flex" alignItems="center">
              <Typography variant="h6" component="div" sx={{ mr: 2 }}>
                Error
              </Typography>
              <Typography variant="body1">{error}</Typography>
            </Box>
            {error.includes('Authentication') && (
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mt: 1 }}
                onClick={() => {
                  // Redirect to login page
                  window.location.href = '/login';
                }}
              >
                Go to Login
              </Button>
            )}
          </Paper>
        )}

        <DataGrid
          data={models}
          columns={columns}
          actions={actions}
          loading={loading}
          pagination
          pageSize={10}
          filterable
          sortable
        />

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{editRecord ? 'Edit Model' : 'Create Model'}</DialogTitle>
          <DialogContent dividers>
            {loading && <CircularProgress />}
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <TextField
                label="Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                size="small"
                fullWidth
                required
                helperText="Technical name (e.g., 'claude-3-sonnet')"
              />
              <TextField
                label="Display Name"
                value={formData.display_name || ''}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                size="small"
                fullWidth
                required
                helperText="Human-readable name (e.g., 'Claude 3 Sonnet')"
              />
              <FormControl fullWidth size="small" required>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={formData.provider_id || ''}
                  onChange={(e) => setFormData({ ...formData, provider_id: e.target.value as number })}
                  label="Provider"
                >
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Model Type"
                value={formData.model_type || ''}
                onChange={(e) => setFormData({ ...formData, model_type: e.target.value })}
                size="small"
                fullWidth
                required
                helperText="E.g., 'text', 'vision', 'audio'"
              />
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="deprecated">Deprecated</MenuItem>
                  <MenuItem value="beta">Beta</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Context Window"
                type="number"
                value={formData.context_window || ''}
                onChange={(e) => setFormData({ ...formData, context_window: Number(e.target.value) })}
                size="small"
                fullWidth
                helperText="Maximum context window size in tokens"
              />
              <TextField
                label="Cost per 1k Input Tokens"
                type="number"
                value={formData.cost_per_1k_input_tokens || ''}
                onChange={(e) => setFormData({ ...formData, cost_per_1k_input_tokens: Number(e.target.value) })}
                size="small"
                fullWidth
                inputProps={{ step: 0.001 }}
              />
              <TextField
                label="Cost per 1k Output Tokens"
                type="number"
                value={formData.cost_per_1k_output_tokens || ''}
                onChange={(e) => setFormData({ ...formData, cost_per_1k_output_tokens: Number(e.target.value) })}
                size="small"
                fullWidth
                inputProps={{ step: 0.001 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_default || false}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  />
                }
                label="Set as default model for its type"
              />
              <TextField
                label="Capabilities (comma-separated)"
                value={formData.capabilities ? formData.capabilities.join(', ') : ''}
                onChange={(e) => {
                  const caps = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                  setFormData({ ...formData, capabilities: caps });
                }}
                size="small"
                fullWidth
                helperText="E.g., 'chat, completion, function_calling'"
              />
              <TextField
                label="Config (JSON)"
                value={formData.config ? JSON.stringify(formData.config, null, 2) : '{}'}
                onChange={(e) => {
                  try {
                    const config = e.target.value ? JSON.parse(e.target.value) : {};
                    setFormData({ ...formData, config });
                  } catch (err) {
                    // Don't update if invalid JSON
                  }
                }}
                size="small"
                fullWidth
                multiline
                rows={4}
                helperText="Model-specific configuration in JSON format"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="contained" disabled={loading}>
              {editRecord ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGuard>
  );
};

export default ModelManagement; 