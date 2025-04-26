import React, { lazy, Suspense } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  useTheme,
  Tabs,
  Tab,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { toast } from 'react-toastify';

// Import code examples from separate files
import { completionsExample, visionExample, audioExample } from '../data/examples/codeExamples';

// Lazy load components
const CodeBlock = lazy(() => import('../components/docs/CodeBlock'));
const CookbookSection = lazy(() => import('../components/docs/CookbookSection'));

const DeveloperDocs: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = React.useState(0);

  // Loading placeholder component
  const LoadingPlaceholder = () => (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 200,
      width: '100%',
      bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.03)',
      borderRadius: 1,
      my: 2
    }}>
      <CircularProgress size={30} />
    </Box>
  );

  const handleCopy = async (text: string) => {
    try {
      // Use the Clipboard API with fallback for better mobile support
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback method for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  return (
    <Box sx={{
      p: { xs: 2, sm: 3 },
      width: '100%',
      minWidth: '100%',
      maxWidth: '100%',
      margin: '0 auto',
      height: 'auto',
      position: 'relative',
      touchAction: 'manipulation', // Ensure touch scrolling works on mobile
      '& *': {
        touchAction: 'manipulation' // Apply to all children
      }
    }}>
      <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' } }} gutterBottom>
        PeerAI API Documentation
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Get started with PeerAI's powerful AI APIs. Below you'll find examples of how to interact with our endpoints using cURL.
      </Typography>

      <Tabs
        value={selectedTab}
        onChange={handleTabChange}
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="API Reference" />
        <Tab label="Cookbook" />
      </Tabs>

      {selectedTab === 0 ? (
        <>
          <Typography variant="h5" gutterBottom>
            Authentication
          </Typography>
          <Typography paragraph>
            All API requests require an API key sent in the X-API-Key header. You can generate an API key from your dashboard.
          </Typography>
          <Paper sx={{ p: 2, mb: 4, bgcolor: theme.palette.error.main + '10' }}>
            <Typography variant="body2" color="error">
              🔒 Security Best Practices:
              <ul>
                <li>Never hardcode API keys in your code or commit them to version control</li>
                <li>Use environment variables or secure secrets management in production</li>
                <li>For frontend applications, proxy API calls through your backend to keep keys secure</li>
                <li>Regularly rotate your API keys and monitor usage for any suspicious activity</li>
              </ul>
            </Typography>
          </Paper>

          <Typography variant="h5" gutterBottom>
            Quick Start Examples
          </Typography>

          <Suspense fallback={<LoadingPlaceholder />}>
            <CodeBlock
              title="Text Generation"
              curl={completionsExample.curl}
              response={completionsExample.response}
              onCopy={handleCopy}
            />
          </Suspense>

          <Suspense fallback={<LoadingPlaceholder />}>
            <CodeBlock
              title="Vision Analysis"
              curl={visionExample.curl}
              response={visionExample.response}
              onCopy={handleCopy}
            />
          </Suspense>

          <Suspense fallback={<LoadingPlaceholder />}>
            <CodeBlock
              title="Audio Processing"
              curl={audioExample.curl}
              response={audioExample.response}
              onCopy={handleCopy}
            />
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<LoadingPlaceholder />}>
          <CookbookSection onCopy={handleCopy} />
        </Suspense>
      )}

      <Divider sx={{ my: 3 }} />

      <Typography variant="h5" gutterBottom>
        Try it yourself
      </Typography>
      <Typography paragraph>
        Head over to our API Playground to test these endpoints interactively and generate cURL commands automatically.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        component={RouterLink}
        to="/playground"
        sx={{ mt: 2 }}
      >
        Open API Playground
      </Button>
    </Box>
  );
};

export default DeveloperDocs;
