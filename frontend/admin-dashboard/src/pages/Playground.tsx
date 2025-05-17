import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  SelectChangeEvent,
  Stack,
  CircularProgress,
  Divider,
  Alert,
  Link,
} from '@mui/material';
import { PageContainer } from '../components/ui';
import {
  ContentCopy as ContentCopyIcon,
  Send as SendIcon,
  Code as CodeIcon,
  Api as ApiIcon,
  Key as KeyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import AdvancedParameters from '../components/playground/AdvancedParameters';
import { toast } from 'react-toastify';
import { useTheme } from '@mui/material/styles';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { apiClient } from '../api/client';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import api from '../api/config';
import ApiKeySelector from '../components/common/ApiKeySelector';
import { useBreadcrumbsUpdate } from '../hooks/useBreadcrumbsUpdate';

// @important: Import API base URL from config
import { API_BASE_URL } from '../config';

interface EndpointConfig {
  method: string;
  path: string;
  requiresBody: boolean;
  defaultBody: string;
  supportedModels?: string[];
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
  is_active: boolean;
}

interface CompletionResponse {
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: any;
        };
        index: number;
      }>;
    };
    finish_reason: string;
  }>;
  provider: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  latency_ms: number;
  additional_data?: {
    confidence?: number;
    detected_objects?: string[];
    language?: string;
    speakers?: number;
  };
}

const ENDPOINTS: Record<string, EndpointConfig> = {
  health: {
    method: 'GET',
    path: '/api/v1/health',
    requiresBody: false,
    defaultBody: '',
  },
  completions: {
    method: 'POST',
    path: '/api/v1/llm/completions',
    requiresBody: true,
    supportedModels: ['hosted-llm', 'mistral-tiny', 'mistral-small', 'mistral-medium'],
    defaultBody: JSON.stringify({
      prompt: "Explain quantum computing",
      max_tokens: 100,
      temperature: 0.7,
      top_p: 1.0,
      model: "mistral-tiny"  // Default to Mistral's model
    }, null, 2),
  },
  vision: {
    method: 'POST',
    path: '/api/v1/llm/vision',
    requiresBody: true,
    defaultBody: JSON.stringify({
      image_url: "https://example.com/image.jpg",
      prompt: "Describe this image",
      mock_mode: true
    }, null, 2),
  },
  audio: {
    method: 'POST',
    path: '/api/v1/llm/audio',
    requiresBody: true,
    defaultBody: JSON.stringify({
      audio_url: "https://example.com/audio.mp3",
      task: "transcribe",
      mock_mode: true
    }, null, 2),
  },
  models: {
    method: 'GET',
    path: '/api/v1/llm/models',
    requiresBody: false,
    defaultBody: '',
  },
};

function Playground() {
  const theme = useTheme();
  const [selectedEndpoint, setSelectedEndpoint] = useState('completions');
  const [selectedModel, setSelectedModel] = useState('mistral-tiny');
  const [apiKey, setApiKey] = useState('');
  const [requestBody, setRequestBody] = useState(ENDPOINTS.completions.defaultBody);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurlCommand, setShowCurlCommand] = useState(true);
  const [mockMode, setMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointConfigs, setEndpointConfigs] = useState<Record<string, EndpointConfig>>(ENDPOINTS);
  const [availableModels, setAvailableModels] = useState<Array<{id: number, name: string, display_name: string}>>([]);
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(true);

  // Set breadcrumbs for this page
  useBreadcrumbsUpdate([
    { label: 'API Playground' }
  ]);

  // We'll use the ApiKeySelector component instead of fetching API keys directly

  const formatResponse = (data: any) => {
    // For health check and error responses, just return as is
    if (data.status === 'ok' || data.detail) {
      return JSON.stringify(data, null, 2);
    }

    // For completion responses, format nicely
    const response = data as CompletionResponse;
    // Add null check for choices array
    const content = response.choices && response.choices.length > 0
      ? response.choices[0]?.message?.content || ''
      : '';
    const usage = response.usage || { total_tokens: 0 };
    const confidence = response.additional_data?.confidence;
    const detectedObjects = response.additional_data?.detected_objects;
    const language = response.additional_data?.language;
    const speakers = response.additional_data?.speakers;

    const formattedResponse = {
      content,
      model: response.model || 'unknown',
      provider: response.provider || 'unknown',
      usage,
      latency_ms: response.latency_ms || 0,
      ...(confidence !== undefined && { confidence }),
      ...(detectedObjects && { detected_objects: detectedObjects }),
      ...(language && { language }),
      ...(speakers !== undefined && { speakers })
    };

    return JSON.stringify(formattedResponse, null, 2);
  };

  const updateRequestBody = (model: string, mock: boolean) => {
    if (selectedEndpoint === 'completions') {
      try {
        let currentBody = {};
        try {
          currentBody = JSON.parse(requestBody);
        } catch (e) {
          console.error('Failed to parse request body:', e);
          // If parsing fails, start with a default body
          currentBody = {
            prompt: "Explain quantum computing",
            max_tokens: 100,
            temperature: 0.7,
            top_p: 1.0,
          };
        }

        const newBody: Record<string, any> = {
          ...currentBody,
          model: model,
        };

        // Only include mock_mode in development environment
        if (import.meta.env.DEV) {
          newBody.mock_mode = mock;
        }

        setRequestBody(JSON.stringify(newBody, null, 2));
      } catch (e) {
        console.error('Failed to update request body:', e);
        toast.error(`Failed to update request body: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  };

  const handleEndpointChange = (event: SelectChangeEvent) => {
    const newEndpoint = event.target.value;
    setSelectedEndpoint(newEndpoint);
    setRequestBody(ENDPOINTS[newEndpoint].defaultBody);

    // Reset model selection when changing endpoints
    if (newEndpoint === 'completions') {
      setSelectedModel('mistral-tiny');
      setMockMode(false);
    } else {
      setMockMode(true);
    }
  };

  const handleModelChange = (event: SelectChangeEvent) => {
    const newModel = event.target.value;
    setSelectedModel(newModel);
    updateRequestBody(newModel, mockMode);
  };

  const handleMockModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMockMode = event.target.checked;
    setMockMode(newMockMode);
    updateRequestBody(selectedModel, newMockMode);
  };

  const generateCurlCommand = () => {
    const endpoint = endpointConfigs[selectedEndpoint];
    let command = `curl -X ${endpoint.method} ${API_BASE_URL}${endpoint.path}`;

    if (apiKey && /^[a-zA-Z0-9_-]+$/.test(apiKey)) {
      command += ` \\\n  -H "X-API-Key: ${apiKey}"`;
    } else {
      command += ` \\\n  -H "X-API-Key: YOUR_API_KEY"`;
    }

    if (endpoint.requiresBody) {
      command += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody.replace(/\n/g, '')}'`;
    }

    return command;
  };

  const handleCopyClick = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const fetchAvailableModels = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate API key
      if (!apiKey) {
        setIsApiKeyValid(false);
        throw new Error('API key is required');
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
        setIsApiKeyValid(false);
        throw new Error('Invalid API key format. API keys should only contain letters, numbers, hyphens, and underscores.');
      }

      try {
        const response = await apiClient.get('/api/v1/llm/models', {
          headers: {
            'X-API-Key': apiKey,
          },
        });

        const models = response.data;

        if (!Array.isArray(models)) {
          throw new Error('Invalid response format: models data is not an array');
        }

        // API key is valid if we got a successful response
        setIsApiKeyValid(true);
        setAvailableModels(models);

        // Update the supportedModels for the completions endpoint
        const modelNames = models.map((model: any) => model.name);
        setEndpointConfigs({
          ...endpointConfigs,
          completions: {
            ...endpointConfigs.completions,
            supportedModels: modelNames,
          },
        });

        // If the current selected model is not in the list, select the first available model
        if (modelNames.length > 0 && !modelNames.includes(selectedModel)) {
          setSelectedModel(modelNames[0]);
          updateRequestBody(modelNames[0], mockMode);
        }
      } catch (error: any) {
        console.error('API error:', error);

        // Check if this is an authentication error (401)
        if (error.response && error.response.status === 401) {
          setIsApiKeyValid(false);
          throw new Error('Invalid API key. Please use a valid API key from your account.');
        } else {
          // For other errors, the API key might still be valid
          setIsApiKeyValid(true);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setAvailableModels([]);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to fetch available models: ${errorMessage}`);
      toast.error(`Failed to fetch available models: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // The ApiKeySelector component handles validation internally

  // Fetch models when API key changes
  useEffect(() => {
    if (apiKey && /^[a-zA-Z0-9_-]+$/.test(apiKey)) {
      console.log('API key changed, fetching models with key:', apiKey);
      fetchAvailableModels();
    } else if (apiKey) {
      console.warn('Invalid API key format:', apiKey);
      setIsApiKeyValid(false);
    }
  }, [apiKey]);

  // Initialize with empty model if no models are available
  useEffect(() => {
    if (availableModels.length === 0 && selectedEndpoint === 'completions') {
      setSelectedModel('');
    }
  }, [availableModels, selectedEndpoint]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse('');
    const endpoint = endpointConfigs[selectedEndpoint];

    try {
      // Validate API key
      if (!apiKey) {
        setIsApiKeyValid(false);
        throw new Error('API key is required');
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
        setIsApiKeyValid(false);
        throw new Error('Invalid API key format. API keys should only contain letters, numbers, hyphens, and underscores.');
      }

      const headers: Record<string, string> = {
        'X-API-Key': apiKey,
      };

      if (endpoint.requiresBody) {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const response = await apiClient({
          method: endpoint.method,
          url: endpoint.path,
          headers,
          data: endpoint.requiresBody ? JSON.parse(requestBody) : undefined,
        });

        // If we get here, the API key is valid
        setIsApiKeyValid(true);
        setResponse(formatResponse(response.data));
      } catch (error: any) {
        console.error('API error:', error);

        // Check if this is an authentication error (401)
        if (error.response && error.response.status === 401) {
          setIsApiKeyValid(false);
          throw new Error('Invalid API key. Please use a valid API key from your account.');
        } else {
          // For other errors, the API key might still be valid
          setIsApiKeyValid(true);
          throw error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Add an effect to fix touch events on mobile
  React.useEffect(() => {
    // Force a reflow to fix touch events
    const fixTouchEvents = () => {
      document.body.style.touchAction = 'manipulation';
      // @ts-ignore - webkit property
      document.body.style.webkitOverflowScrolling = 'touch';

      // Force a reflow
      document.body.offsetHeight;

      // Add a small delay to ensure everything is properly initialized
      setTimeout(() => {
        window.scrollTo(0, 1);
        window.scrollTo(0, 0);
      }, 100);
    };

    fixTouchEvents();

    // Clean up
    return () => {
      document.body.style.touchAction = '';
      // @ts-ignore - webkit property
      document.body.style.webkitOverflowScrolling = '';
    };
  }, []);

  return (
    <PageContainer sx={{
      height: { xs: 'auto', sm: 'calc(100vh - 88px)' },
      display: 'flex',
      flexDirection: 'column',
      mb: { xs: 4, sm: 0 }, // Add bottom margin on mobile
      overflow: 'hidden', // Prevent overflow
      maxWidth: '100vw', // Limit width to viewport
      boxSizing: 'border-box', // Include padding in width calculation
      touchAction: 'manipulation', // Ensure touch scrolling works on mobile
      WebkitOverflowScrolling: 'touch', // Enable momentum scrolling on iOS
      '& *': {
        touchAction: 'manipulation' // Apply to all children
      }
    }}>

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, sm: 3 },
        flexGrow: 1,
        minHeight: 0,
        height: '100%'
      }}>
        <Box sx={{
          flex: { xs: '1 0 100%', md: '1 0 50%' },
          maxWidth: { xs: '100%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          height: { xs: 'auto', md: '100%' }
        }}>
          <Card sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            mb: { xs: 2, md: 0 }
          }}>
            <CardContent sx={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, sm: 3 },
              width: '100%',
              height: '100%',
              '&.MuiCardContent-root': {
                padding: { xs: 2, sm: 3 },
                height: '100%',
                maxHeight: { xs: 'auto', md: '100%' }
              }
            }}>
              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}
                >
                  <ApiIcon fontSize="small" />
                  Request
                </Typography>
                <Divider />
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel>Endpoint</InputLabel>
                <Select
                  value={selectedEndpoint}
                  label="Endpoint"
                  onChange={handleEndpointChange}
                >
                  {Object.entries(endpointConfigs).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.method} {config.path}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedEndpoint === 'completions' && (
                <FormControl fullWidth size="small">
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={availableModels.length > 0 ? selectedModel : ''}
                    label="Model"
                    onChange={handleModelChange}
                    disabled={availableModels.length === 0}
                  >
                    {availableModels.length === 0 ? (
                      <MenuItem value="">
                        <em>No models available</em>
                      </MenuItem>
                    ) : (
                      availableModels.map((model) => (
                        <MenuItem key={model.name} value={model.name}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography component="span" sx={{ fontWeight: 'bold' }}>
                              {model.display_name}
                            </Typography>
                            <Typography component="span" color="text.secondary" variant="body2">
                              {model.name}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              )}

              {error && selectedEndpoint === 'completions' && (
                <Alert severity="error" variant="outlined" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}

              <ApiKeySelector
                value={apiKey}
                onChange={setApiKey}
                error={!isApiKeyValid || (apiKey !== '' && !/^[a-zA-Z0-9_-]+$/.test(apiKey))}
                helperText={!isApiKeyValid ? "Invalid API key. Please select a valid API key." : null}
                required
                fullWidth
                size="small"
              />

              {endpointConfigs[selectedEndpoint].requiresBody && selectedEndpoint === 'completions' && (
                <AdvancedParameters
                  requestBody={requestBody}
                  setRequestBody={setRequestBody}
                />
              )}

              {endpointConfigs[selectedEndpoint].requiresBody && (
                <TextField
                  fullWidth
                  multiline
                  minRows={6}
                  maxRows={10}
                  label="Request Body"
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  sx={{
                    fontFamily: 'monospace',
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      fontSize: { xs: '0.8rem', sm: '0.9rem' }
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }
                  }}
                />
              )}

              <Box>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                >
                  <Tooltip
                    title={!apiKey ? "Please enter an API key" : isApiKeyValid === false ? "Please enter a valid API key" : ""}
                    arrow
                    placement="top"
                    disableHoverListener={!(!apiKey || isApiKeyValid === false)}
                  >
                    <span> {/* Wrapper needed for disabled buttons */}
                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading || !apiKey || isApiKeyValid === false}
                        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                        fullWidth={false}
                        sx={{ minWidth: '140px' }}
                      >
                        {loading ? 'Sending...' : 'Send Request'}
                      </Button>
                    </span>
                  </Tooltip>

                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      mt: 2,
                      mb: 1
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={showCurlCommand}
                          onChange={(e) => setShowCurlCommand(e.target.checked)}
                          size="small"
                        />
                      }
                      label="Show cURL"
                      sx={{
                        mr: 1,
                        minWidth: '120px',
                        ml: 1,
                        '& .MuiSwitch-root': {
                          mr: 1
                        }
                      }}
                    />

                    {endpointConfigs[selectedEndpoint].requiresBody && import.meta.env.DEV && (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={mockMode}
                            onChange={handleMockModeChange}
                            size="small"
                          />
                        }
                        label="Mock Mode (Dev Only)"
                        sx={{
                          minWidth: '150px',
                          ml: 1,
                          '& .MuiSwitch-root': {
                            mr: 1
                          }
                        }}
                      />
                    )}
                  </Stack>
                </Stack>
              </Box>

              {showCurlCommand && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: theme.palette.grey[900],
                    position: 'relative',
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CodeIcon fontSize="small" />
                      cURL Command
                    </Typography>
                    <Tooltip title="Copy command" arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyClick(generateCurlCommand())}
                        sx={{ color: 'text.secondary' }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <SyntaxHighlighter
                    language="bash"
                    style={atomOneDark}
                    customStyle={{
                      margin: 0,
                      padding: theme.spacing(1),
                      borderRadius: theme.shape.borderRadius,
                      maxHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      fontSize: '0.75rem',
                      maxWidth: '100%'
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                  >
                    {generateCurlCommand()}
                  </SyntaxHighlighter>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box sx={{
          flex: { xs: '1 0 100%', md: '1 0 50%' },
          maxWidth: { xs: '100%', md: '50%' },
          display: 'flex',
          flexDirection: 'column',
          height: { xs: 'auto', md: '100%' }
        }}>
          <Card sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            mb: { xs: 2, md: 0 }
          }}>
            <CardContent sx={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 1.5, sm: 2 },
              width: '100%',
              height: '100%',
              '&.MuiCardContent-root': {
                padding: { xs: 2, sm: 3 },
                height: '100%',
                maxHeight: { xs: '400px', md: '100%' } // Limit height on mobile
              }
            }}>
              <Box>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}
                >
                  <ApiIcon fontSize="small" />
                  Response
                </Typography>
                <Divider />
              </Box>

              {error && (
                <Alert severity="error" variant="outlined">
                  {error}
                </Alert>
              )}

              {loading && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <CircularProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Waiting for response...
                  </Typography>
                </Box>
              )}

              {!loading && !error && response && (
                <Paper
                  variant="outlined"
                  sx={{
                    bgcolor: theme.palette.grey[900],
                    position: 'relative',
                    flex: 1,
                    width: '100%',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                    <Tooltip title="Copy response" arrow>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyClick(response)}
                        sx={{ color: 'text.secondary' }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <SyntaxHighlighter
                    language="json"
                    style={atomOneDark}
                    customStyle={{
                      margin: 0,
                      padding: theme.spacing(1.5),
                      borderRadius: theme.shape.borderRadius,
                      height: '100%',
                      minHeight: '150px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      width: '100%',
                      minWidth: 0,
                      maxWidth: '100%',
                      fontSize: '0.75rem',
                      flex: 1,
                      display: 'block'
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                  >
                    {response}
                  </SyntaxHighlighter>
                </Paper>
              )}

              {!loading && !error && !response && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Send a request to see the response
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
}

export default Playground;