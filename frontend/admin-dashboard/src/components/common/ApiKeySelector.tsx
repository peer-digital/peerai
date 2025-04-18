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
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/config';
import { toast } from 'react-toastify';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  is_active: boolean;
  is_default?: boolean;
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
  const queryClient = useQueryClient();
  const [isDefaultKey, setIsDefaultKey] = useState<boolean>(false);

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

  // Fetch user's default API key
  const { data: defaultKeyData } = useQuery<{ default_key_id: string | null }>({
    queryKey: ['default-api-key'],
    queryFn: async () => {
      try {
        const response = await api.get('/auth/default-api-key');
        return response.data;
      } catch (error) {
        console.error('Error fetching default API key:', error);
        return { default_key_id: null };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Set default key mutation
  const setDefaultKeyMutation = useMutation({
    mutationFn: async (keyId: number) => {
      console.log('Setting default key ID:', keyId);
      const response = await api.post('/auth/default-api-key', { key_id: keyId });
      console.log('Response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Default key set successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['default-api-key'] });
      toast.success('Default API key updated');
    },
    onError: (error) => {
      console.error('Error setting default key:', error);
      toast.error('Failed to update default API key');
    },
  });

  // Find the selected key object
  const selectedKey = apiKeys?.find(k => k.key === value);

  // Check if the selected key is the default key
  useEffect(() => {
    if (selectedKey && defaultKeyData) {
      setIsDefaultKey(selectedKey.id === defaultKeyData.default_key_id);
    } else {
      setIsDefaultKey(false);
    }
  }, [selectedKey, defaultKeyData]);

  // Load default key on component mount if no key is selected
  useEffect(() => {
    if (!value && apiKeys && apiKeys.length > 0 && defaultKeyData) {
      const defaultKey = apiKeys.find(k => k.id === defaultKeyData.default_key_id);
      if (defaultKey) {
        onChange(defaultKey.key);
      } else {
        // If no default key is set, use the first active key
        const firstActiveKey = apiKeys.find(k => k.is_active);
        if (firstActiveKey) {
          onChange(firstActiveKey.key);
        }
      }
    }
  }, [apiKeys, defaultKeyData, value, onChange]);

  // Handle key change
  const handleKeyChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  // Handle setting default key
  const handleSetDefaultKey = (keyId: number) => {
    setDefaultKeyMutation.mutate(keyId);
  };

  // Load API key from localStorage on component mount
  useEffect(() => {
    if (!value) {
      const storedApiKey = localStorage.getItem('apiKey');
      if (storedApiKey && /^[a-zA-Z0-9_-]+$/.test(storedApiKey)) {
        onChange(storedApiKey);
      }
    }
  }, [value, onChange]);

  // Save API key to localStorage when it changes
  // We're not storing the actual API key for security reasons
  // Instead, we store a reference to the key ID if available
  useEffect(() => {
    if (value && /^[a-zA-Z0-9_-]+$/.test(value)) {
      // Find the key object to get its ID
      const keyObj = apiKeys?.find(k => k.key === value);
      if (keyObj) {
        // Store the key ID and a masked version of the key
        localStorage.setItem('apiKeyId', keyObj.id.toString());
        localStorage.setItem('apiKey', value); // Still need to store the actual key for functionality
      } else {
        localStorage.setItem('apiKey', value);
      }
    }
  }, [value, apiKeys]);

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
                <Typography fontFamily="monospace" sx={{ opacity: 0.7 }}>
                  {selected.slice(0, 4)}•••••{selected.slice(-4)}
                </Typography>
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
              {isDefaultKey && (
                <Chip
                  label="Default"
                  size="small"
                  color="primary"
                  variant="outlined"
                  icon={<StarIcon fontSize="small" />}
                  sx={{ ml: 1, height: 20 }}
                />
              )}
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
          apiKeys.map((key) => {
            const isDefault = key.id === defaultKeyData?.default_key_id;
            return (
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
                <Tooltip title={isDefault ? "Default key" : "Set as default"}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDefault && key.is_active) {
                        handleSetDefaultKey(key.id);
                      }
                    }}
                    color={isDefault ? "primary" : "default"}
                    disabled={!key.is_active}
                  >
                    {isDefault ? <StarIcon /> : <StarBorderIcon />}
                  </IconButton>
                </Tooltip>
              </MenuItem>
            );
          })
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
