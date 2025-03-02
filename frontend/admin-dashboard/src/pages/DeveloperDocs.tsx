import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  Link,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ApiIcon from '@mui/icons-material/Api';
import SecurityIcon from '@mui/icons-material/Security';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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
      id={`docs-tabpanel-${index}`}
      aria-labelledby={`docs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, md: 3 } }}>{children}</Box>}
    </div>
  );
}

// OpenAPI specification endpoint
const OPENAPI_SPEC_URL = '/api/v1/openapi.json'; // URL to your OpenAPI specification

const IntroContent = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Welcome to PeerAI API Documentation
      </Typography>
      <Typography paragraph>
        PeerAI provides a powerful API for integrating AI capabilities into your applications.
        Our platform offers state-of-the-art language models and tools to help you build
        intelligent features with minimal effort.
      </Typography>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Key Features
      </Typography>
      
      <List>
        <ListItem>
          <ListItemIcon>
            <ApiIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="RESTful API" 
            secondary="Simple and consistent API design following REST principles"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <SecurityIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Secure Authentication" 
            secondary="API key authentication with role-based access control"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <CodeIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Multiple SDKs" 
            secondary="Official client libraries for Python, JavaScript, and more"
          />
        </ListItem>
      </List>
      
      <Divider sx={{ my: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Getting Started
      </Typography>
      <Typography paragraph>
        To get started with the PeerAI API, you'll need to:
      </Typography>
      <ol>
        <li>
          <Typography paragraph>
            <strong>Create an account</strong> - Sign up for PeerAI to get access to the dashboard
          </Typography>
        </li>
        <li>
          <Typography paragraph>
            <strong>Generate an API key</strong> - Create an API key in the dashboard
          </Typography>
        </li>
        <li>
          <Typography paragraph>
            <strong>Install the SDK</strong> - Use our client libraries for your preferred language
          </Typography>
        </li>
        <li>
          <Typography paragraph>
            <strong>Make your first API call</strong> - Follow our quickstart guide to make your first request
          </Typography>
        </li>
      </ol>
      
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => window.open('https://github.com/peerai/api-examples', '_blank')}
          startIcon={<CodeIcon />}
        >
          View Sample Projects
        </Button>
        {!isAuthenticated && (
          <Button 
            variant="outlined" 
            color="primary" 
            component={RouterLink} 
            to="/login"
          >
            Sign Up for API Access
          </Button>
        )}
      </Box>
    </Box>
  );
};

const QuickstartContent = () => (
  <Box>
    <Typography variant="h5" gutterBottom>
      Quickstart Guide
    </Typography>
    <Typography paragraph>
      Follow these steps to quickly integrate PeerAI into your application.
    </Typography>
    
    <Divider sx={{ my: 3 }} />
    
    <Typography variant="h6" gutterBottom>
      Step 1: Install the SDK
    </Typography>
    <Typography paragraph>
      Choose your preferred language and install our client library:
    </Typography>
    
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Python
      </Typography>
      <SyntaxHighlighter language="bash" style={atomDark}>
        pip install peerai-python
      </SyntaxHighlighter>
      
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
        JavaScript
      </Typography>
      <SyntaxHighlighter language="bash" style={atomDark}>
        npm install peerai-js
      </SyntaxHighlighter>
    </Box>
    
    <Typography variant="h6" gutterBottom>
      Step 2: Initialize the Client
    </Typography>
    <Typography paragraph>
      Set up the client with your API key:
    </Typography>
    
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Python
      </Typography>
      <SyntaxHighlighter language="python" style={atomDark}>
{`from peerai import PeerAI

# Initialize the client with your API key
client = PeerAI(api_key="your_api_key_here")

# Now you can use the client to make API calls
response = client.generate_text(
    prompt="Explain quantum computing in simple terms",
    model="gpt-4"
)

print(response.text)`}
      </SyntaxHighlighter>
      
      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
        JavaScript
      </Typography>
      <SyntaxHighlighter language="javascript" style={atomDark}>
{`import { PeerAI } from 'peerai-js';

// Initialize the client with your API key
const client = new PeerAI('your_api_key_here');

// Make an API call
async function generateText() {
  const response = await client.generateText({
    prompt: 'Explain quantum computing in simple terms',
    model: 'gpt-4'
  });
  
  console.log(response.text);
}

generateText();`}
      </SyntaxHighlighter>
    </Box>
    
    <Typography variant="h6" gutterBottom>
      Step 3: Explore Available Models
    </Typography>
    <Typography paragraph>
      PeerAI offers access to various models with different capabilities:
    </Typography>
    
    <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      <Chip label="GPT-4" color="primary" />
      <Chip label="Claude 3" color="primary" />
      <Chip label="Llama 3" color="primary" />
      <Chip label="Mistral" color="primary" />
      <Chip label="PaLM 2" color="primary" />
    </Box>
    
    <Typography variant="h6" gutterBottom>
      Next Steps
    </Typography>
    <Typography paragraph>
      Now that you've made your first API call, you can:
    </Typography>
    
    <List>
      <ListItem>
        <ListItemIcon>
          <ApiIcon color="primary" />
        </ListItemIcon>
        <ListItemText 
          primary="Explore the API Reference" 
          secondary="Learn about all available endpoints and parameters"
        />
      </ListItem>
      <ListItem>
        <ListItemIcon>
          <CodeIcon color="primary" />
        </ListItemIcon>
        <ListItemText 
          primary="Check out code examples" 
          secondary="See examples for common use cases"
        />
      </ListItem>
    </List>
  </Box>
);

const CodeExamplesContent = () => (
  <Box>
    <Typography variant="h5" gutterBottom>
      Code Examples
    </Typography>
    <Typography paragraph>
      Learn how to use PeerAI with these code examples.
    </Typography>
    
    <Divider sx={{ my: 3 }} />
    
    <Typography variant="h6" gutterBottom>
      Text Generation
    </Typography>
    <Typography paragraph>
      Generate text based on a prompt:
    </Typography>
    
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle2" gutterBottom>
        Python
      </Typography>
      <SyntaxHighlighter language="python" style={atomDark}>
{`from peerai import PeerAI

client = PeerAI(api_key="your_api_key_here")

response = client.generate_text(
    prompt="Write a short story about a robot learning to paint",
    model="gpt-4",
    max_tokens=500,
    temperature=0.7
)

print(response.text)`}
      </SyntaxHighlighter>
    </Box>
    
    <Typography variant="h6" gutterBottom>
      Chat Completion
    </Typography>
    <Typography paragraph>
      Create a conversational AI experience:
    </Typography>
    
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle2" gutterBottom>
        JavaScript
      </Typography>
      <SyntaxHighlighter language="javascript" style={atomDark}>
{`import { PeerAI } from 'peerai-js';

const client = new PeerAI('your_api_key_here');

async function chatExample() {
  const chatHistory = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Hello! Can you help me understand how neural networks work?' }
  ];
  
  const response = await client.createChatCompletion({
    messages: chatHistory,
    model: 'claude-3-opus',
    temperature: 0.5
  });
  
  console.log(response.message.content);
  
  // Continue the conversation
  chatHistory.push(response.message);
  chatHistory.push({ role: 'user', content: 'Can you give me a simple example?' });
  
  const followUpResponse = await client.createChatCompletion({
    messages: chatHistory,
    model: 'claude-3-opus',
    temperature: 0.5
  });
  
  console.log(followUpResponse.message.content);
}

chatExample();`}
      </SyntaxHighlighter>
    </Box>
    
    <Typography variant="h6" gutterBottom>
      Error Handling
    </Typography>
    <Typography paragraph>
      Properly handle API errors:
    </Typography>
    
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Python
      </Typography>
      <SyntaxHighlighter language="python" style={atomDark}>
{`from peerai import PeerAI, PeerAIError

client = PeerAI(api_key="your_api_key_here")

try:
    response = client.generate_text(
        prompt="Explain the theory of relativity",
        model="gpt-4"
    )
    print(response.text)
except PeerAIError as e:
    print(f"Error: {e.status_code} - {e.message}")
    if e.status_code == 401:
        print("Authentication failed. Check your API key.")
    elif e.status_code == 429:
        print("Rate limit exceeded. Please try again later.")`}
      </SyntaxHighlighter>
    </Box>
  </Box>
);

const AuthenticationContent = () => (
  <Box>
    <Typography variant="h5" gutterBottom>
      Authentication
    </Typography>
    <Typography paragraph>
      Learn how to authenticate with the PeerAI API.
    </Typography>
    
    <Divider sx={{ my: 3 }} />
    
    <Typography variant="h6" gutterBottom>
      API Keys
    </Typography>
    <Typography paragraph>
      All requests to the PeerAI API require authentication using API keys. 
      You can generate API keys from your dashboard.
    </Typography>
    
    <Box sx={{ mb: 4, p: 2, bgcolor: 'background.paper', border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1 }}>
      <Typography variant="subtitle2" color="error">
        Security Notice
      </Typography>
      <Typography variant="body2">
        Keep your API keys secure and never expose them in client-side code. 
        If you suspect your API key has been compromised, you should immediately 
        revoke it and generate a new one.
      </Typography>
    </Box>
    
    <Typography variant="h6" gutterBottom>
      Authentication Methods
    </Typography>
    <Typography paragraph>
      There are two ways to authenticate your API requests:
    </Typography>
    
    <Typography variant="subtitle1" gutterBottom>
      1. Authorization Header (Recommended)
    </Typography>
    <Typography paragraph>
      Include your API key in the Authorization header:
    </Typography>
    
    <SyntaxHighlighter language="bash" style={atomDark}>
      Authorization: Bearer your_api_key_here
    </SyntaxHighlighter>
    
    <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
      2. Query Parameter
    </Typography>
    <Typography paragraph>
      Include your API key as a query parameter (less secure, not recommended for production):
    </Typography>
    
    <SyntaxHighlighter language="bash" style={atomDark}>
      https://api.peerai.com/v1/generate?api_key=your_api_key_here
    </SyntaxHighlighter>
    
    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
      API Key Management
    </Typography>
    <Typography paragraph>
      Best practices for managing your API keys:
    </Typography>
    
    <List>
      <ListItem>
        <ListItemIcon>
          <SecurityIcon color="primary" />
        </ListItemIcon>
        <ListItemText 
          primary="Use environment variables" 
          secondary="Store API keys in environment variables, not in your code"
        />
      </ListItem>
      <ListItem>
        <ListItemIcon>
          <SecurityIcon color="primary" />
        </ListItemIcon>
        <ListItemText 
          primary="Rotate keys regularly" 
          secondary="Periodically generate new API keys and update your applications"
        />
      </ListItem>
      <ListItem>
        <ListItemIcon>
          <SecurityIcon color="primary" />
        </ListItemIcon>
        <ListItemText 
          primary="Use different keys for different environments" 
          secondary="Use separate keys for development, testing, and production"
        />
      </ListItem>
    </List>
    
    <Box sx={{ mt: 4 }}>
      <Button 
        variant="contained" 
        color="primary" 
        component={RouterLink} 
        to="/login"
        startIcon={<SecurityIcon />}
      >
        Manage API Keys
      </Button>
    </Box>
  </Box>
);

const DeveloperDocs: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated } = useAuth();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Remove custom header for non-authenticated users since we're using DashboardLayout */}
      
      {/* Page title for all users */}
      <Box sx={{ mb: 3, mt: 1 }}>
        <Typography variant="h4" gutterBottom>
          Developer Documentation
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Comprehensive guides and references for integrating with the PeerAI API
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant={isMobile ? "scrollable" : "fullWidth"}
          scrollButtons={isMobile ? "auto" : undefined}
          aria-label="developer documentation tabs"
        >
          <Tab icon={<DescriptionIcon />} label="Introduction" iconPosition="start" />
          <Tab icon={<PlayArrowIcon />} label="Quickstart" iconPosition="start" />
          <Tab icon={<ApiIcon />} label="API Reference" iconPosition="start" />
          <Tab icon={<CodeIcon />} label="Code Examples" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="Authentication" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Introduction Tab */}
      <TabPanel value={tabValue} index={0}>
        <IntroContent />
      </TabPanel>

      {/* Quickstart Tab */}
      <TabPanel value={tabValue} index={1}>
        <QuickstartContent />
      </TabPanel>

      {/* API Reference Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h5" gutterBottom>
          API Reference
        </Typography>
        <Typography paragraph>
          Explore our API endpoints using the interactive documentation below.
        </Typography>
        <Box sx={{ mt: 3, border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1 }}>
          <SwaggerUI url={OPENAPI_SPEC_URL} />
        </Box>
      </TabPanel>

      {/* Code Examples Tab */}
      <TabPanel value={tabValue} index={3}>
        <CodeExamplesContent />
      </TabPanel>

      {/* Authentication Tab */}
      <TabPanel value={tabValue} index={4}>
        <AuthenticationContent />
      </TabPanel>
    </Box>
  );
};

export default DeveloperDocs; 