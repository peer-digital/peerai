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
  Stack,
  Tooltip,
  LinearProgress,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Key as KeyIcon,
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

const formatDate = (date: string | null): string => {
  if (!date) return 'Never';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
};

interface EmptyStateProps {
  onCreateClick: () => void;
}

const EmptyState = ({ onCreateClick }: EmptyStateProps) => (
  <Stack alignItems="center" spacing={1} sx={{ py: 8 }}>
    <KeyIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.5 }} />
    <Typography color="text.secondary">
      No API keys found
    </Typography>
    <Button
      variant="outlined"
      startIcon={<AddIcon />}
      onClick={onCreateClick}
      sx={{ mt: 1 }}
    >
      Create your first API key
    </Button>
  </Stack>
);

const ApiKeys: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeys, isLoading, error, refetch } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.get('/api/auth/api-keys');
      return response.data;
    },
  });

  // Create new API key
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/api/auth/api-keys', { name });
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

  // Delete API key
  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await api.delete(`/api/auth/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete API key');
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
    // Check if navigator.clipboard exists before using it
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(key);
      toast.success('API key copied to clipboard');
    } else {
      // Fallback for environments where Clipboard API is not available
      console.warn('Clipboard API not available');
      toast.error('Unable to copy to clipboard. This feature may not be supported in your environment.');
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setNewKeyName('');
    setNewKey(null);
  };

  const handleDeleteKey = (keyId: string, keyName: string) => {
    if (window.confirm(`Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`)) {
      deleteKeyMutation.mutate(keyId);
    }
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error loading API keys. Please try again later.
        </Alert>
      </Box>
    );
  }

  const keys = apiKeys || [];

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            API Keys
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {keys.length} {keys.length === 1 ? 'key' : 'keys'} total
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh API keys" arrow>
            <IconButton onClick={() => refetch()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            Create New Key
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {isLoading && <LinearProgress />}
        
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Used</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && keys.length > 0 ? (
                keys.map((key) => (
                  <TableRow key={key.id} hover>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <KeyIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        <Typography>{key.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontFamily="monospace" sx={{ opacity: 0.7 }}>
                          {key.key.slice(0, 12)}...{key.key.slice(-4)}
                        </Typography>
                        <Tooltip title="Copy API key" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleCopyKey(key.key)}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={formatDate(key.createdAt)} arrow>
                        <span>{formatDate(key.createdAt)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={key.lastUsed ? formatDate(key.lastUsed) : 'Never used'} arrow>
                        <span>{key.lastUsed ? formatDate(key.lastUsed) : 'Never'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={key.status ? key.status.toUpperCase() : 'UNKNOWN'}
                        color={key.status === 'active' ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete API key" arrow>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteKey(key.id, key.name)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {isLoading ? (
                      <Box sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <EmptyState onCreateClick={() => setOpen(true)} />
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog 
        open={open} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          {newKey ? 'API Key Created' : 'Create New API Key'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 2 }}>
          {newKey ? (
            <Box>
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 3,
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Important: Copy your API key now
                </Typography>
                <Typography variant="body2">
                  Make sure to copy your API key now. For security reasons, you won't be able to see it again!
                </Typography>
              </Alert>
              <TextField
                fullWidth
                value={newKey}
                size="small"
                InputProps={{
                  readOnly: true,
                  sx: { fontFamily: 'monospace' },
                  endAdornment: (
                    <Tooltip title="Copy API key" arrow>
                      <IconButton onClick={() => handleCopyKey(newKey)}>
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  ),
                }}
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create a new API key to authenticate your API requests. Give it a descriptive name to help you identify its use later.
              </Typography>
              <TextField
                fullWidth
                label="Key Name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API Key"
                size="small"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button 
            onClick={handleCloseDialog}
            color="inherit"
          >
            {newKey ? 'Close' : 'Cancel'}
          </Button>
          {!newKey && (
            <Button
              onClick={handleCreateKey}
              variant="contained"
              disabled={!newKeyName.trim()}
              sx={{ px: 3 }}
            >
              Create Key
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApiKeys; 