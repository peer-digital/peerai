import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../api/config';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  status: 'active' | 'revoked';
}

const ApiKeys: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/api-keys');
      return response.data;
    },
  });

  // Create new API key
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/api/v1/admin/api-keys', { name });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKey(data.key);
      toast.success('API key created successfully');
    },
    onError: () => {
      toast.error('Failed to create API key');
    },
  });

  // Revoke API key
  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await api.delete(`/api/v1/admin/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked successfully');
    },
    onError: () => {
      toast.error('Failed to revoke API key');
    },
  });

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }
    await createKeyMutation.mutateAsync(newKeyName);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success('API key copied to clipboard');
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setNewKeyName('');
    setNewKey(null);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">API Keys</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          Create New Key
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Key</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {apiKeys?.map((key) => (
              <TableRow key={key.id}>
                <TableCell>{key.name}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    {key.key.slice(0, 10)}...
                    <IconButton
                      size="small"
                      onClick={() => handleCopyKey(key.key)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  {key.lastUsed
                    ? new Date(key.lastUsed).toLocaleDateString()
                    : 'Never'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={key.status}
                    color={key.status === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {key.status === 'active' && (
                    <IconButton
                      color="error"
                      onClick={() => revokeKeyMutation.mutate(key.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && (!apiKeys || apiKeys.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No API keys found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {newKey ? 'API Key Created' : 'Create New API Key'}
        </DialogTitle>
        <DialogContent>
          {newKey ? (
            <Box mt={2}>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Make sure to copy your API key now. You won't be able to see it again!
              </Alert>
              <TextField
                fullWidth
                value={newKey}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={() => handleCopyKey(newKey)}>
                      <CopyIcon />
                    </IconButton>
                  ),
                }}
              />
            </Box>
          ) : (
            <Box mt={2}>
              <TextField
                fullWidth
                label="Key Name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API Key"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {newKey ? 'Close' : 'Cancel'}
          </Button>
          {!newKey && (
            <Button
              onClick={handleCreateKey}
              variant="contained"
              disabled={!newKeyName.trim()}
            >
              Create
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiKeys; 