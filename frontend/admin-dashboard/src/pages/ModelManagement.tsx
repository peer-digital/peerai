import React, { useEffect, useState, useMemo } from 'react';
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
  Grid,
  InputAdornment,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { DataGrid, Column, Action } from '../components/DataGrid';
import { Permission } from '../types/rbac';
import PermissionGuard from '../components/PermissionGuard';
import { apiClient } from '../api/client';
import { toast } from 'react-toastify';

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
  provider?: {
    id: number;
    name: string;
    display_name: string;
  };
  model_type: string;
  capabilities?: string[];
  context_window?: number;
  status: string;
  is_default: boolean;
  cost_per_1k_input_tokens: number;
  cost_per_1k_output_tokens: number;
  config?: Record<string, unknown>;
}

const ModelManagement: React.FC = () => {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState<number | ''>('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // State for create/edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ModelRecord | null>(null);

  // State for bulk editing
  const [selectedModels, setSelectedModels] = useState<number[]>([]);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkEditFormData, setBulkEditFormData] = useState<{
    status?: string;
    provider_id?: number;
    model_type?: string;
    is_default?: boolean;
    cost_per_1k_input_tokens?: number;
    cost_per_1k_output_tokens?: number;
    context_window?: number;
  }>({});

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

      // Debug logging to see the structure of the API response
      console.log('API response for models:', response.data);

      // Check if any models are missing provider_id but have provider object
      const modelsWithMissingProviderId = response.data.filter(
        (model: ModelRecord) => !model.provider_id && model.provider
      );

      if (modelsWithMissingProviderId.length > 0) {
        console.log('Models missing provider_id but with provider object:', modelsWithMissingProviderId);
      }

      setModels(response.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Error fetching models:', err);
      const error = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      if (error.response?.status === 401) {
        setError('Authentication error: Please make sure you are logged in as a Super Admin');
        toast.error('Authentication error: Please log in again');
      } else if (error.response?.status === 403) {
        setError('Permission denied: You need Super Admin privileges to access this page');
        toast.error('Permission denied: Super Admin access required');
      } else {
        setError(error.response?.data?.detail || error.message || 'Failed to fetch models');
        toast.error('Failed to fetch models');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await apiClient.get('/api/v1/admin/providers');
      setProviders(response.data);
    } catch (err: unknown) {
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
      const error = err as { response?: { status?: number } };
      if (error.response?.status !== 401 && error.response?.status !== 403) {
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
      // Extract provider_id from the nested provider object if it exists
      const formDataWithProviderId = {
        ...record,
        // If provider_id is missing but provider object exists, use provider.id
        provider_id: record.provider_id || (record.provider ? record.provider.id : undefined)
      };

      // Debug logging to help troubleshoot provider_id issues
      console.log('Original record:', record);
      console.log('Modified formData with provider_id:', formDataWithProviderId);

      setFormData(formDataWithProviderId);
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

      // Debug logging to help troubleshoot API requests
      console.log('Saving model with data:', formData);

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
    } catch (err: unknown) {
      console.error('Save error:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to save model');
    }
  };

  const handleDelete = async (record: ModelRecord) => {
    if (!window.confirm(`Are you sure you want to delete "${record.display_name}"?`)) return;
    try {
      await apiClient.delete(`/api/v1/admin/models/${record.id}`);
      toast.success('Model deleted successfully');
      fetchModels();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to delete model');
    }
  };

  // Handle selection changes from the DataGrid
  const handleSelectionChange = (selectedIds: number[]) => {
    setSelectedModels(selectedIds);
  };

  // Open the bulk edit dialog
  const handleOpenBulkEditDialog = () => {
    if (selectedModels.length === 0) {
      toast.warning('Please select at least one model to edit');
      return;
    }
    setBulkEditFormData({});
    setBulkEditDialogOpen(true);
  };

  // Close the bulk edit dialog
  const handleCloseBulkEditDialog = () => {
    setBulkEditDialogOpen(false);
    setBulkEditFormData({});
  };

  // Apply bulk updates to selected models
  const handleBulkUpdate = async () => {
    try {
      // Check if any fields are selected for update
      if (Object.keys(bulkEditFormData).length === 0) {
        toast.warning('Please select at least one field to update');
        return;
      }

      setLoading(true);

      // Create an array of promises for each update
      const updatePromises = selectedModels.map(modelId => {
        return apiClient.put(`/api/v1/admin/models/${modelId}`, bulkEditFormData);
      });

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      toast.success(`Successfully updated ${selectedModels.length} models`);
      handleCloseBulkEditDialog();
      fetchModels();
      setSelectedModels([]);
    } catch (err: unknown) {
      console.error('Bulk update error:', err);
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || 'Failed to update models');
    } finally {
      setLoading(false);
    }
  };

  // Helper to get provider name
  const getProviderName = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    return provider ? provider.display_name : `Provider ${providerId}`;
  };

  return (
    <PermissionGuard requiredPermissions={[Permission.SYSTEM_CONFIGURATION]}>
      <Box p={3} sx={{ width: '100%', minWidth: '100%' }}>
        <Box display="flex" justifyContent="flex-end" alignItems="center" mb={2}>
          <Box>
            <Tooltip title="Refresh Models" arrow>
              <IconButton onClick={fetchModels} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            {selectedModels.length > 0 && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleOpenBulkEditDialog}
                sx={{ ml: 1 }}
              >
                Bulk Edit ({selectedModels.length})
              </Button>
            )}
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

        {/* Filter Bar */}
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Search by Name"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: nameFilter ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setNameFilter('')}>
                          <ClearIcon />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Provider</InputLabel>
                  <Select
                    value={providerFilter}
                    onChange={(e) => {
                      const newValue = e.target.value as number | '';
                      console.log('Setting provider filter to:', newValue);
                      setProviderFilter(newValue);
                    }}
                    label="Provider"
                  >
                    <MenuItem value="">All Providers</MenuItem>
                    {providers.map((provider) => (
                      <MenuItem key={provider.id} value={provider.id}>
                        {provider.display_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    label="Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {Array.from(new Set(models.map(model => model.model_type))).map(type => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="deprecated">Deprecated</MenuItem>
                    <MenuItem value="beta">Beta</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={12} md={2} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Button
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setNameFilter('');
                    setProviderFilter('');
                    setTypeFilter('');
                    setStatusFilter('');
                  }}
                  size="small"
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Paper>
          {/* Define columns for the DataGrid */}
          {(() => {
            // Filter models based on filter criteria
            const filteredModels = useMemo(() => {
              // Log filter values for debugging
              console.log('Filtering with criteria:', {
                nameFilter,
                providerFilter,
                typeFilter,
                statusFilter
              });

              return models.filter(model => {
                const nameMatch = !nameFilter ||
                  model.name.toLowerCase().includes(nameFilter.toLowerCase()) ||
                  model.display_name.toLowerCase().includes(nameFilter.toLowerCase());

                // Check provider_id directly or from the nested provider object
                // Convert both to strings for comparison to handle potential type mismatches
                const modelProviderId = model.provider_id || (model.provider ? model.provider.id : null);
                const providerMatch = !providerFilter ||
                  (modelProviderId !== null && String(modelProviderId) === String(providerFilter));

                // Debug provider matching
                if (providerFilter && !providerMatch) {
                  console.log(
                    `Provider mismatch for model ${model.name}:`,
                    `Expected: ${providerFilter} (${typeof providerFilter}), ` +
                    `Actual: ${modelProviderId} (${typeof modelProviderId}), ` +
                    `String comparison: ${String(providerFilter)} === ${String(modelProviderId)}, ` +
                    `Has provider_id: ${!!model.provider_id}, ` +
                    `Has provider: ${!!model.provider}`
                  );
                }

                const typeMatch = !typeFilter || model.model_type === typeFilter;
                const statusMatch = !statusFilter || model.status === statusFilter;

                return nameMatch && providerMatch && typeMatch && statusMatch;
              });
            }, [models, nameFilter, providerFilter, typeFilter, statusFilter]);

            const columns: Column[] = [
              { field: 'id', headerName: 'ID', width: 70 },
              { field: 'name', headerName: 'Name', width: 150 },
              { field: 'display_name', headerName: 'Display Name', width: 150 },
              {
                field: 'provider_id',
                headerName: 'Provider',
                width: 150,
                renderCell: (params) => (
                  params.provider ? params.provider.display_name : getProviderName(params.provider_id)
                )
              },
              { field: 'model_type', headerName: 'Type', width: 100 },
              {
                field: 'status',
                headerName: 'Status',
                width: 120,
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
                width: 100,
                renderCell: (params) => (params.is_default ? 'Yes' : 'No')
              },
              {
                field: 'cost_per_1k_input_tokens',
                headerName: 'Cost Input',
                width: 120
              },
              {
                field: 'cost_per_1k_output_tokens',
                headerName: 'Cost Output',
                width: 120
              },
              {
                field: 'context_window',
                headerName: 'Context',
                width: 120,
                renderCell: (params) => (
                  params.context_window ? `${params.context_window.toLocaleString()}` : 'N/A'
                )
              },
            ];

            const actions: Action[] = [
              {
                label: 'Edit',
                onClick: (row) => handleOpenDialog(row)
              },
              {
                label: 'Delete',
                onClick: (row) => handleDelete(row)
              }
            ];

            return (
              <DataGrid
                data={filteredModels}
                columns={columns}
                loading={loading}
                sortable={true}
                selectable={true}
                filterable={false} // We're using our custom filter bar instead
                pagination={true}
                pageSize={10}
                actions={actions}
                onSelectionChange={handleSelectionChange}
              />
            );
          })()}
        </Paper>

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
                sx={{
                  mx: 1,
                  '& .MuiSwitch-root': {
                    mx: 1
                  }
                }}
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

        {/* Bulk Edit Dialog */}
        <Dialog open={bulkEditDialogOpen} onClose={handleCloseBulkEditDialog} maxWidth="md" fullWidth>
          <DialogTitle>Bulk Edit {selectedModels.length} Models</DialogTitle>
          <DialogContent dividers>
            {loading && <CircularProgress />}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Select the fields you want to update for all selected models. Only the fields you modify will be updated.
              </Typography>
            </Box>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={bulkEditFormData.status || ''}
                  onChange={(e) => setBulkEditFormData({ ...bulkEditFormData, status: e.target.value || undefined })}
                  label="Status"
                >
                  <MenuItem value=""><em>No change</em></MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="deprecated">Deprecated</MenuItem>
                  <MenuItem value="beta">Beta</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Provider</InputLabel>
                <Select
                  value={bulkEditFormData.provider_id || ''}
                  onChange={(e) => setBulkEditFormData({
                    ...bulkEditFormData,
                    provider_id: e.target.value ? Number(e.target.value) : undefined
                  })}
                  label="Provider"
                >
                  <MenuItem value=""><em>No change</em></MenuItem>
                  {providers.map((provider) => (
                    <MenuItem key={provider.id} value={provider.id}>
                      {provider.display_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Model Type"
                value={bulkEditFormData.model_type || ''}
                onChange={(e) => setBulkEditFormData({
                  ...bulkEditFormData,
                  model_type: e.target.value || undefined
                })}
                size="small"
                fullWidth
                helperText="Leave empty to keep current values"
              />

              <TextField
                label="Context Window"
                type="number"
                value={bulkEditFormData.context_window || ''}
                onChange={(e) => setBulkEditFormData({
                  ...bulkEditFormData,
                  context_window: e.target.value ? Number(e.target.value) : undefined
                })}
                size="small"
                fullWidth
                helperText="Leave empty to keep current values"
              />

              <TextField
                label="Cost per 1k Input Tokens"
                type="number"
                value={bulkEditFormData.cost_per_1k_input_tokens || ''}
                onChange={(e) => setBulkEditFormData({
                  ...bulkEditFormData,
                  cost_per_1k_input_tokens: e.target.value ? Number(e.target.value) : undefined
                })}
                size="small"
                fullWidth
                inputProps={{ step: 0.001 }}
                helperText="Leave empty to keep current values"
              />

              <TextField
                label="Cost per 1k Output Tokens"
                type="number"
                value={bulkEditFormData.cost_per_1k_output_tokens || ''}
                onChange={(e) => setBulkEditFormData({
                  ...bulkEditFormData,
                  cost_per_1k_output_tokens: e.target.value ? Number(e.target.value) : undefined
                })}
                size="small"
                fullWidth
                inputProps={{ step: 0.001 }}
                helperText="Leave empty to keep current values"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={bulkEditFormData.is_default === true}
                    onChange={(e) => setBulkEditFormData({
                      ...bulkEditFormData,
                      is_default: e.target.checked ? true : undefined
                    })}
                  />
                }
                label="Set as default model for its type"
                sx={{
                  mx: 1,
                  '& .MuiSwitch-root': {
                    mx: 1
                  }
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseBulkEditDialog} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              variant="contained"
              disabled={loading || Object.keys(bulkEditFormData).length === 0}
            >
              Update {selectedModels.length} Models
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PermissionGuard>
  );
};

export default ModelManagement;