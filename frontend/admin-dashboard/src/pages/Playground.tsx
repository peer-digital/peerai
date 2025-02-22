import React, { useState } from 'react';
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
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  Send as SendIcon,
  Code as CodeIcon,
  Api as ApiIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useTheme } from '@mui/material/styles';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface EndpointConfig {
  method: string;
  path: string;
  requiresBody: boolean;
  defaultBody: string;
  supportedModels?: string[];
}

interface CompletionResponse {
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
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
    path: '/health',
    requiresBody: false,
    defaultBody: '',
  },
  completions: {
    method: 'POST',
    path: '/api/v1/completions',
    requiresBody: true,
    supportedModels: ['hosted-llm', 'mistral'],
    defaultBody: JSON.stringify({
      prompt: "Explain quantum computing",
      max_tokens: 100,
      temperature: 0.7,
      mock_mode: false,
      provider: "hosted-llm"  // @important: Default to hosted LLM
    }, null, 2),
  },
  vision: {
    method: 'POST',
    path: '/api/v1/vision',
    requiresBody: true,
    defaultBody: JSON.stringify({
      image_url: "https://example.com/image.jpg",
      prompt: "Describe this image",
      mock_mode: true
    }, null, 2),
  },
  audio: {
    method: 'POST',
    path: '/api/v1/audio',
    requiresBody: true,
    defaultBody: JSON.stringify({
      audio_url: "https://example.com/audio.mp3",
      task: "transcribe",
      mock_mode: true
    }, null, 2),
  },
};

function Playground() {
  const theme = useTheme();
  const [selectedEndpoint, setSelectedEndpoint] = useState('health');
  const [selectedModel, setSelectedModel] = useState('hosted-llm');
  const [apiKey, setApiKey] = useState('test_key_123');
  const [requestBody, setRequestBody] = useState(ENDPOINTS.health.defaultBody);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurlCommand, setShowCurlCommand] = useState(true);
  const [mockMode, setMockMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatResponse = (data: any) => {
    // For health check and error responses, just return as is
    if (data.status === 'ok' || data.detail) {
      return JSON.stringify(data, null, 2);
    }

    // For completion responses, format nicely
    const response = data as CompletionResponse;
    const content = response.choices[0]?.message?.content || '';
    const usage = response.usage;
    const confidence = response.additional_data?.confidence;
    const detectedObjects = response.additional_data?.detected_objects;
    const language = response.additional_data?.language;
    const speakers = response.additional_data?.speakers;

    const formattedResponse = {
      content,
      model: response.model,
      provider: response.provider,
      usage,
      latency_ms: response.latency_ms,
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
        const currentBody = JSON.parse(requestBody);
        const newBody = {
          ...currentBody,
          provider: model,
          mock_mode: mock
        };
        setRequestBody(JSON.stringify(newBody, null, 2));
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }
  };

  const handleEndpointChange = (event: SelectChangeEvent) => {
    const newEndpoint = event.target.value;
    setSelectedEndpoint(newEndpoint);
    setRequestBody(ENDPOINTS[newEndpoint].defaultBody);
    
    // Reset model selection when changing endpoints
    if (newEndpoint === 'completions') {
      setSelectedModel('hosted-llm');
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
    const endpoint = ENDPOINTS[selectedEndpoint];
    let command = `curl -X ${endpoint.method} http://localhost:8000${endpoint.path}`;
    
    if (apiKey) {
      command += ` \\\n  -H "X-API-Key: ${apiKey}"`;
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

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResponse('');
    const endpoint = ENDPOINTS[selectedEndpoint];
    
    try {
      const headers: Record<string, string> = {
        'X-API-Key': apiKey,
      };
      
      if (endpoint.requiresBody) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`http://localhost:8000${endpoint.path}`, {
        method: endpoint.method,
        headers,
        body: endpoint.requiresBody ? requestBody : undefined,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Request failed');
      }

      setResponse(formatResponse(data));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, height: 'calc(100vh - 88px)', display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            API Playground
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Test and explore the PeerAI API endpoints
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: 3,
        flexGrow: 1,
        minHeight: 0,
        '@media (max-width: 900px)': {
          flexDirection: 'column'
        }
      }}>
        <Box sx={{ 
          flex: '1 0 50%',
          maxWidth: '50%',
          '@media (max-width: 900px)': {
            maxWidth: '100%'
          }
        }}>
          <Card sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
          }}>
            <CardContent sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 3,
              width: '100%',
              '&.MuiCardContent-root': {
                padding: 3,
              }
            }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  {Object.entries(ENDPOINTS).map(([key, config]) => (
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
                    value={selectedModel}
                    label="Model"
                    onChange={handleModelChange}
                  >
                    {ENDPOINTS.completions.supportedModels?.map((model) => (
                      <MenuItem key={model} value={model}>{model}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <TextField
                fullWidth
                size="small"
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />

              {ENDPOINTS[selectedEndpoint].requiresBody && (
                <TextField
                  fullWidth
                  multiline
                  minRows={8}
                  maxRows={12}
                  label="Request Body"
                  value={requestBody}
                  onChange={(e) => setRequestBody(e.target.value)}
                  sx={{
                    fontFamily: 'monospace',
                    '& .MuiInputBase-input': {
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                    },
                  }}
                />
              )}

              <Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  >
                    {loading ? 'Sending...' : 'Send Request'}
                  </Button>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={showCurlCommand}
                        onChange={(e) => setShowCurlCommand(e.target.checked)}
                      />
                    }
                    label="Show cURL"
                  />

                  {selectedEndpoint !== 'health' && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={mockMode}
                          onChange={handleMockModeChange}
                        />
                      }
                      label="Mock Mode"
                    />
                  )}
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
                      maxHeight: '200px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
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
          flex: '1 0 50%',
          maxWidth: '50%',
          '@media (max-width: 900px)': {
            maxWidth: '100%'
          }
        }}>
          <Card sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            height: '100%',
          }}>
            <CardContent sx={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2,
              width: '100%',
              '&.MuiCardContent-root': {
                padding: 3,
              }
            }}>
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                      padding: theme.spacing(2),
                      borderRadius: theme.shape.borderRadius,
                      height: '100%',
                      minHeight: '200px',
                      maxHeight: 'calc(100vh - 300px)',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordWrap: 'break-word',
                      width: '100%',
                      minWidth: 0,
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
    </Box>
  );
}

export default Playground; 