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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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

  // Helper to get provider name
  const getProviderName = (providerId: number) => {
    const provider = providers.find(p => p.id === providerId);
    return provider ? provider.display_name : `Provider ${providerId}`;
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Calculate displayed rows based on pagination
  const displayedRows = models.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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

        <TableContainer component={Paper}>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width="5%">ID</TableCell>
                    <TableCell width="12%">Name</TableCell>
                    <TableCell width="12%">Display Name</TableCell>
                    <TableCell width="12%">Provider</TableCell>
                    <TableCell width="8%">Type</TableCell>
                    <TableCell width="8%">Status</TableCell>
                    <TableCell width="8%">Default</TableCell>
                    <TableCell width="8%">Cost Input</TableCell>
                    <TableCell width="8%">Cost Output</TableCell>
                    <TableCell width="10%">Context</TableCell>
                    <TableCell width="9%" align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayedRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.display_name}</TableCell>
                      <TableCell>{row.provider ? row.provider.display_name : getProviderName(row.provider_id)}</TableCell>
                      <TableCell>{row.model_type}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          color={
                            row.status === 'active' ? 'success' :
                            row.status === 'beta' ? 'info' :
                            row.status === 'deprecated' ? 'warning' : 'default'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{row.is_default ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{row.cost_per_1k_input_tokens}</TableCell>
                      <TableCell>{row.cost_per_1k_output_tokens}</TableCell>
                      <TableCell>{row.context_window ? `${row.context_window.toLocaleString()}` : 'N/A'}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <IconButton size="small" onClick={() => handleOpenDialog(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(row)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={models.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </TableContainer>

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
      </Box>
    </PermissionGuard>
  );
};

export default ModelManagement;