import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  Link,
  Tooltip,
  IconButton,
  Stack,
  Chip,
  SelectChangeEvent,
} from '@mui/material';
import {
  Key as KeyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../api/config';

interface ApiKey {
  id: number;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  is_active: boolean;
}

interface ApiKeySelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  helperText?: React.ReactNode;
  required?: boolean;
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({
  value,
  onChange,
  error = false,
  helperText,
  required = false,
  label = 'API Key',
  fullWidth = true,
  size = 'small',
}) => {
  // Fetch user's API keys
  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: async () => {
      try {
        const response = await api.get('/auth/api-keys');
        return response.data;
      } catch (error) {
        console.error('Error fetching API keys:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // We no longer need to fetch the default API key

  // Find the selected key object
  const selectedKey = apiKeys?.find(k => k.key === value);

  // Handle key change
  const handleKeyChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  // Always ensure a valid API key is selected
  useEffect(() => {
    // Only proceed if we have API keys
    if (apiKeys && apiKeys.length > 0) {
      // First, check if current value is valid
      const isCurrentValueValid = value && apiKeys.some(k => k.key === value && k.is_active);
      if (isCurrentValueValid) {
        console.log('Current API key is valid, keeping it:', value?.slice(0, 4) + '...');
        return;
      }

      // If no valid key is selected, use the first active key
      const firstActiveKey = apiKeys.find(k => k.is_active);
      if (firstActiveKey) {
        console.log('Setting first active API key:', firstActiveKey.key.slice(0, 4) + '...');
        onChange(firstActiveKey.key);

        // Also save to localStorage for backup
        try {
          const savedKeys = JSON.stringify([{
            id: firstActiveKey.id,
            key: firstActiveKey.key,
            name: firstActiveKey.name
          }]);
          localStorage.setItem('saved_api_keys', savedKeys);
          console.log('Saved API key to localStorage');
        } catch (e) {
          console.error('Error saving API key to localStorage:', e);
        }
      }
    }
    // Only include value in the dependency array for the initial check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeys, onChange]);

  // No localStorage handling - we'll rely entirely on the server-side default key

  return (
    <FormControl fullWidth={fullWidth} size={size} error={error} required={required}>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={handleKeyChange}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return <Typography color="text.secondary">Select an API key</Typography>;
          }

          const key = apiKeys?.find(k => k.key === selected);
          if (!key) {
            // If we have a raw key string but no key object, mask it for security
            if (typeof selected === 'string' && selected.length > 8) {
              return (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <KeyIcon fontSize="small" color="error" />
                  <Box>
                    <Typography color="error.main">Unknown API Key</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: 'monospace', display: 'block' }}>
                      {selected.slice(0, 4)}•••••{selected.slice(-4)}
                    </Typography>
                  </Box>
                  <Chip
                    label="Invalid"
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{ ml: 1, height: 20 }}
                  />
                </Stack>
              );
            }
            return selected;
          }

          return (
            <Stack direction="row" alignItems="center" spacing={1}>
              <KeyIcon fontSize="small" />
              <Box>
                <Typography>{key.name}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: 'monospace', display: 'block' }}>
                  {key.key.slice(0, 4)}•••••{key.key.slice(-4)}
                </Typography>
              </Box>
              {!key.is_active && (
                <Chip
                  label="Inactive"
                  size="small"
                  color="error"
                  variant="outlined"
                  sx={{ ml: 1, height: 20 }}
                />
              )}
            </Stack>
          );
        }}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 300,
            },
          },
        }}
      >
        {isLoading ? (
          <MenuItem disabled>
            <Typography>Loading API keys...</Typography>
          </MenuItem>
        ) : apiKeys && apiKeys.length > 0 ? (
          apiKeys.map((key) => (
              <MenuItem
                key={key.id}
                value={key.key}
                disabled={!key.is_active}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
                  <KeyIcon fontSize="small" color={key.is_active ? 'primary' : 'disabled'} />
                  <Box>
                    <Typography variant="body2">{key.name}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontFamily: 'monospace' }}>
                      {key.key.slice(0, 4)}•••••{key.key.slice(-4)}
                    </Typography>
                  </Box>
                  {!key.is_active && (
                    <Chip
                      label="Inactive"
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </Stack>
              </MenuItem>
            ))
        ) : (
          <MenuItem disabled>
            <Typography>No API keys available</Typography>
          </MenuItem>
        )}
        <MenuItem
          component={RouterLink}
          to="/api-keys"
          sx={{
            borderTop: '1px solid',
            borderTopColor: 'divider',
            color: 'primary.main',
            fontWeight: 500,
            mt: 1
          }}
        >
          Manage API Keys
        </MenuItem>
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export default ApiKeySelector;
