import React, { useEffect, useState } from 'react';
import { 
  CircularProgress, 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Container,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Alert,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import { RedocStandalone } from 'redoc';
import { styled } from '@mui/material/styles';

// @url: /api/v1/openapi.json - FastAPI OpenAPI specification endpoint
// @note: This path matches the FastAPI configuration in backend/main.py
const API_DOCS_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/openapi.json`;

// Styled components for documentation
const DocSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  '& h2': {
    marginBottom: theme.spacing(2),
  },
  '& h3': {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  '& p': {
    marginBottom: theme.spacing(2),
  },
}));

const CodeBlock = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(2, 0),
  backgroundColor: theme.palette.grey[900],
  color: theme.palette.common.white,
  fontFamily: 'monospace',
  overflow: 'auto',
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`doc-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const IntroContent = () => (
  <DocSection>
    <Box sx={{ mb: 4, textAlign: 'center' }}>
      <Typography variant="h2" gutterBottom>
        PeerAI - Swedish AI API
      </Typography>
      <Typography variant="h5" color="text.secondary" sx={{ mb: 3 }}>
        Secure, Compliant AI Processing within Sweden
      </Typography>
      <Alert severity="info" sx={{ mb: 3, maxWidth: 800, mx: 'auto' }}>
        All data is securely processed within Swedish data centers (Bahnhof Cloud) to ensure local data residency and GDPR compliance.
      </Alert>
    </Box>

    <Grid container spacing={4}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Available Services</Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary={<Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Text Completions
                  <Chip size="small" label="STABLE" color="success" sx={{ ml: 1 }} />
                </Box>}
                secondary="Generate or transform text using advanced LLMs"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary={<Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Vision Analysis
                  <Chip size="small" label="BETA" color="warning" sx={{ ml: 1 }} />
                </Box>}
                secondary="Get AI-driven descriptions or object analysis from images"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary={<Box sx={{ display: 'flex', alignItems: 'center' }}>
                  Audio Processing
                  <Chip size="small" label="BETA" color="warning" sx={{ ml: 1 }} />
                </Box>}
                secondary="Transcribe or analyze audio content"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <Typography variant="h6" gutterBottom>Key Benefits</Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Swedish Data Residency" 
                secondary="All processing happens within Swedish borders"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="High Performance" 
                secondary="Low-latency inference with built-in rate limiting"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Simple Integration" 
                secondary="RESTful API with comprehensive documentation"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>
  </DocSection>
);

const QuickstartContent = () => (
  <DocSection>
    <Typography variant="h2">Quick Start Guide</Typography>
    
    <Typography variant="h3">1. Get Your API Key</Typography>
    <Typography>
      Sign up on the <Link href="https://app.peerdigital.se" target="_blank">PeerAI Dashboard</Link> and create a new API key under API Keys.
    </Typography>
    <Alert severity="warning" sx={{ my: 2 }}>
      Keep your API key secure and never share it publicly.
    </Alert>

    <Typography variant="h3">2. Authentication</Typography>
    <Typography paragraph>
      All requests must include:
    </Typography>
    <List>
      <ListItem>
        <ListItemText 
          primary="X-API-Key header" 
          secondary="Your API key for authentication"
        />
      </ListItem>
      <ListItem>
        <ListItemText 
          primary="Content-Type: application/json" 
          secondary="Required for POST requests with JSON body"
        />
      </ListItem>
    </List>

    <Typography variant="h3">3. Make Your First API Call</Typography>
    <Typography>Using curl:</Typography>
    <CodeBlock>
      <pre>{`curl -X POST "https://api.peerdigital.se/api/v1/completions" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
    "prompt": "Hello from Sweden!",
    "max_tokens": 50,
    "temperature": 0.7
  }'`}</pre>
    </CodeBlock>

    <Typography variant="h3">4. Python Integration</Typography>
    <CodeBlock>
      <pre>{`import requests

API_KEY = "YOUR_API_KEY"
BASE_URL = "https://api.peerdigital.se/api/v1"

def complete_text(prompt: str):
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    }
    data = {
        "prompt": prompt,
        "max_tokens": 50,
        "temperature": 0.7
    }
    response = requests.post(f"{BASE_URL}/completions", 
                           headers=headers, 
                           json=data)
    response.raise_for_status()
    return response.json()

print(complete_text("Hej, berätta om svenska AI-företag."))`}</pre>
    </CodeBlock>
  </DocSection>
);

const EndpointsContent = () => (
  <DocSection>
    <Typography variant="h2">Available Endpoints</Typography>
    
    <Typography variant="h3">1. Text Completions</Typography>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      POST /api/v1/completions
    </Typography>
    <Typography paragraph>
      Generate or transform text using our Swedish-based LLM.
    </Typography>
    
    <Typography variant="subtitle1" gutterBottom>Request Parameters:</Typography>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Field</TableCell>
          <TableCell>Type</TableCell>
          <TableCell>Required</TableCell>
          <TableCell>Description</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableCell>prompt</TableCell>
          <TableCell>string</TableCell>
          <TableCell>Yes</TableCell>
          <TableCell>Input text or question</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>max_tokens</TableCell>
          <TableCell>integer</TableCell>
          <TableCell>No</TableCell>
          <TableCell>Up to 2048 tokens (default: 100)</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>temperature</TableCell>
          <TableCell>float</TableCell>
          <TableCell>No</TableCell>
          <TableCell>Range [0.0 - 1.0] (default: 0.7)</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>mock_mode</TableCell>
          <TableCell>boolean</TableCell>
          <TableCell>No</TableCell>
          <TableCell>Returns test response if true</TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <Typography variant="h3" sx={{ mt: 4 }}>2. Vision Analysis (BETA)</Typography>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      POST /api/v1/vision
    </Typography>
    <Typography paragraph>
      Analyze images and get AI-driven descriptions or object detection.
    </Typography>
    <Alert severity="info" sx={{ mb: 2 }}>
      Currently in mock mode by default. Real image analysis available upon request.
    </Alert>
    <CodeBlock>
      <pre>{`{
  "image_url": "https://example.com/myimage.jpg",
  "prompt": "Describe the objects in this photo",
  "max_tokens": 100,
  "mock_mode": true
}`}</pre>
    </CodeBlock>

    <Typography variant="h3">3. Audio Processing (BETA)</Typography>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      POST /api/v1/audio
    </Typography>
    <Typography paragraph>
      Transcribe or analyze audio content with support for Swedish and English.
    </Typography>
    <CodeBlock>
      <pre>{`{
  "audio_url": "https://example.com/audio.mp3",
  "task": "transcribe",
  "language": "sv",  // optional, default 'en'
  "mock_mode": true
}`}</pre>
    </CodeBlock>
  </DocSection>
);

const SecurityContent = () => (
  <DocSection>
    <Typography variant="h2">Security & Compliance</Typography>
    
    <Grid container spacing={4}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Rate Limiting</Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Minute Limit" 
                secondary="Default: 60 requests/minute"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Daily Limit" 
                secondary="Default: 1000 requests/day"
              />
            </ListItem>
          </List>
          <Typography variant="body2" color="text.secondary">
            Configure custom limits in the PeerAI Dashboard.
          </Typography>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Error Handling</Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="400 Bad Request" 
                secondary="Invalid JSON or parameters"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="401 Unauthorized" 
                secondary="Missing or invalid API key"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="429 Too Many Requests" 
                secondary="Rate limit exceeded"
              />
            </ListItem>
          </List>
        </Paper>
      </Grid>
    </Grid>

    <Typography variant="h3" sx={{ mt: 4 }}>Data Processing</Typography>
    <List>
      <ListItem>
        <ListItemText 
          primary="Swedish Data Centers" 
          secondary="All processing happens in Bahnhof Cloud facilities within Sweden"
        />
      </ListItem>
      <ListItem>
        <ListItemText 
          primary="GDPR Compliance" 
          secondary="Data handling follows EU and Swedish regulations"
        />
      </ListItem>
      <ListItem>
        <ListItemText 
          primary="Encryption" 
          secondary="All API requests must use HTTPS/TLS"
        />
      </ListItem>
    </List>

    <Typography variant="h3">Support</Typography>
    <Typography paragraph>
      For assistance or feature requests:
    </Typography>
    <List>
      <ListItem>
        <ListItemText 
          primary="Email" 
          secondary={<Link href="mailto:support@peerdigital.se">support@peerdigital.se</Link>}
        />
      </ListItem>
      <ListItem>
        <ListItemText 
          primary="Support Portal" 
          secondary={<Link href="https://support.peerdigital.se" target="_blank">https://support.peerdigital.se</Link>}
        />
      </ListItem>
    </List>
  </DocSection>
);

const APIReferenceContent: React.FC<{ spec: any }> = ({ spec }) => (
  <Box sx={{ height: 'calc(100vh - 180px)', overflow: 'hidden' }}>
    <RedocStandalone
      spec={spec}
      options={{
        scrollYOffset: 50,
        hideDownloadButton: false,
        theme: {
          typography: { fontFamily: 'Inter, system-ui, sans-serif' },
          colors: { primary: { main: '#2196f3' } },
        },
      }}
    />
  </Box>
);

const DeveloperDocs: React.FC = () => {
  const [spec, setSpec] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchOpenApiSpec = async () => {
      try {
        setLoading(true);
        const response = await fetch(API_DOCS_URL);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: errorText
          });
          throw new Error(`Failed to fetch API documentation: ${response.status} ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          console.error('Unexpected content type:', contentType);
          throw new Error(`Expected JSON but got ${contentType}`);
        }
        
        const data = await response.json();
        setSpec(data);
      } catch (err: any) {
        console.error('Error details:', err);
        setError(err.message || 'Failed to load documentation');
      } finally {
        setLoading(false);
      }
    };
    fetchOpenApiSpec();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error" variant="h6">
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth={false}>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            aria-label="documentation sections"
          >
            <Tab label="Overview" />
            <Tab label="Quick Start" />
            <Tab label="Endpoints" />
            <Tab label="Security" />
            <Tab label="API Reference" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <IntroContent />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <QuickstartContent />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <EndpointsContent />
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <SecurityContent />
        </TabPanel>
        <TabPanel value={tabValue} index={4}>
          {spec && <APIReferenceContent spec={spec} />}
        </TabPanel>
      </Box>
    </Container>
  );
};

export default DeveloperDocs; 