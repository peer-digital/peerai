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
} from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';
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
      setResponse(formatResponse(data));
      
      if (!response.ok) {
        throw new Error(data.detail || 'Request failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      setResponse(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        API Playground
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Request
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
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
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={selectedModel}
                    label="Model"
                    onChange={handleModelChange}
                  >
                    <MenuItem value="hosted-llm">Hosted LLM (Primary)</MenuItem>
                    <MenuItem value="mistral">Mistral (Fallback)</MenuItem>
                  </Select>
                </FormControl>
              )}

              <TextField
                fullWidth
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                sx={{ mb: 2 }}
              />

              {ENDPOINTS[selectedEndpoint].requiresBody && (
                <>
                  <TextField
                    fullWidth
                    label="Request Body"
                    multiline
                    rows={8}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    sx={{ mb: 2, fontFamily: 'monospace' }}
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={mockMode}
                        onChange={handleMockModeChange}
                      />
                    }
                    label="Mock Mode"
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              <FormControlLabel
                control={
                  <Switch
                    checked={showCurlCommand}
                    onChange={(e) => setShowCurlCommand(e.target.checked)}
                  />
                }
                label="Show cURL command"
              />

              {showCurlCommand && (
                <Paper sx={{ p: 2, mt: 2, bgcolor: theme.palette.grey[900] }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.grey[400], mb: 1 }}>
                      cURL Command
                    </Typography>
                    <Tooltip title="Copy command">
                      <IconButton
                        size="small"
                        onClick={() => handleCopyClick(generateCurlCommand())}
                        sx={{ color: theme.palette.grey[400] }}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <SyntaxHighlighter
                    language="bash"
                    style={atomOneDark}
                    customStyle={{ margin: 0 }}
                  >
                    {generateCurlCommand()}
                  </SyntaxHighlighter>
                </Paper>
              )}

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                sx={{ mt: 2 }}
                fullWidth
              >
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Response
                </Typography>
                {response && (
                  <Tooltip title="Copy response">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyClick(response)}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              
              <Paper sx={{ p: 2, bgcolor: theme.palette.grey[900] }}>
                <SyntaxHighlighter
                  language="json"
                  style={atomOneDark}
                  customStyle={{ margin: 0 }}
                >
                  {response || 'No response yet'}
                </SyntaxHighlighter>
              </Paper>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Playground; 