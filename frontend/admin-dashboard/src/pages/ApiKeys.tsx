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
import { PageContainer } from '../components/ui';
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
  is_active: boolean;
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
      const response = await api.get('/auth/api-keys');
      return response.data;
    },
  });

  // Create new API key
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await api.post('/auth/api-keys', { name });
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
      await api.delete(`/auth/api-keys/${keyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      // Also invalidate default API key if it might have changed
      queryClient.invalidateQueries({ queryKey: ['default-api-key'] });
      toast.success('API key deleted successfully');
    },
    onError: (error: any) => {
      console.error('Error deleting API key:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete API key';
      toast.error(errorMessage);
    },
  });

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }
    await createKeyMutation.mutateAsync(newKeyName);
  };

  const handleCopyKey = async (key: string) => {
    try {
      // Use the Clipboard API with fallback for better mobile support
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        // Fallback method for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = key;
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.style.opacity = '0';
        textArea.style.zIndex = '-1';
        document.body.appendChild(textArea);

        // For iOS Safari
        if (navigator.userAgent.match(/ipad|iphone/i)) {
          textArea.contentEditable = 'true';
          textArea.readOnly = false;
          const range = document.createRange();
          range.selectNodeContents(textArea);
          const selection = window.getSelection();
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
          }
          textArea.setSelectionRange(0, 999999);
        } else {
          textArea.select();
        }

        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // Show success toast notification
      toast.success('API key copied to clipboard', {
        position: 'top-right',
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    } catch (err) {
      console.error('Failed to copy API key', err);
      toast.error('Failed to copy API key to clipboard');
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
      <PageContainer>
        <Alert severity="error">
          Error loading API keys. Please try again later.
        </Alert>
      </PageContainer>
    );
  }

  const keys = apiKeys || [];

  return (
    <PageContainer>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={{ xs: 2, sm: 0 }}
        mb={3}
      >
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {keys.length} {keys.length === 1 ? 'key' : 'keys'} total
        </Typography>
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
            size="medium"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Create New Key
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {isLoading && <LinearProgress />}

        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)', overflowX: 'auto' }}>
          <Table stickyHeader size="small">
            {/* Responsive table that works better on mobile */}
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Key</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Created</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Last Used</TableCell>
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
                        <Box>
                          <Typography>{key.name}</Typography>
                          {/* Show key info on mobile only */}
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                            sx={{
                              display: { xs: 'flex', sm: 'none' },
                              mt: 0.5
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontFamily="monospace"
                              sx={{ opacity: 0.7 }}
                            >
                              {key.key.slice(0, 8)}...{key.key.slice(-4)}
                            </Typography>
                            <Tooltip title="Copy API key" arrow>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyKey(key.key);
                                }}
                                sx={{
                                  padding: '8px', // Larger touch target
                                  touchAction: 'manipulation', // Improve touch behavior
                                  '&:active': { // Visual feedback on touch
                                    backgroundColor: 'rgba(0, 0, 0, 0.1)'
                                  }
                                }}
                                disableRipple // Disable ripple for faster response
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontFamily="monospace" sx={{ opacity: 0.7 }}>
                          {key.key.slice(0, 12)}...{key.key.slice(-4)}
                        </Typography>
                        <Tooltip title="Copy API key" arrow>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyKey(key.key);
                            }}
                            sx={{
                              padding: '8px', // Larger touch target
                              touchAction: 'manipulation', // Improve touch behavior
                              '&:active': { // Visual feedback on touch
                                backgroundColor: 'rgba(0, 0, 0, 0.1)'
                              }
                            }}
                            disableRipple // Disable ripple for faster response
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Tooltip title={formatDate(key.createdAt)} arrow>
                        <span>{formatDate(key.createdAt)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Tooltip title={key.lastUsed ? formatDate(key.lastUsed) : 'Never used'} arrow>
                        <span>{key.lastUsed ? formatDate(key.lastUsed) : 'Never'}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={key.is_active ? 'ACTIVE' : 'INACTIVE'}
                        color={key.is_active ? 'success' : 'error'}
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
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          if (newKey) {
                            handleCopyKey(newKey);
                          }
                        }}
                        sx={{
                          padding: '10px', // Even larger touch target for dialog
                          touchAction: 'manipulation', // Improve touch behavior
                          '&:active': { // Visual feedback on touch
                            backgroundColor: 'rgba(0, 0, 0, 0.1)'
                          }
                        }}
                        disableRipple // Disable ripple for faster response
                      >
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
    </PageContainer>
  );
};

export default ApiKeys;