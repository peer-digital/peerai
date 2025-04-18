import React, { lazy, Suspense, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { chatAppExample } from '../../data/examples/chatAppExample';

// Lazy load the syntax highlighter
const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(module => ({
    default: module.Prism
  }))
);

interface CookbookSectionProps {
  onCopy: (text: string) => void;
}

const CookbookSection: React.FC<CookbookSectionProps> = ({ onCopy }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [isHighlighterLoaded, setIsHighlighterLoaded] = useState(false);
  const [highlighterStyle, setHighlighterStyle] = useState<any>(null);

  // Load the appropriate style based on theme mode
  useEffect(() => {
    const loadStyle = async () => {
      try {
        if (isDarkMode) {
          // Use vsc-dark-plus for dark mode - better visibility
          const style = await import('react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus');
          setHighlighterStyle(style.default);
        } else {
          // Use prism for light mode
          const style = await import('react-syntax-highlighter/dist/esm/styles/prism/prism');
          setHighlighterStyle(style.default);
        }
      } catch (error) {
        console.error('Failed to load syntax highlighter style:', error);
      }
    };

    loadStyle();
  }, [isDarkMode]);

  // Handle when the syntax highlighter and style are loaded
  useEffect(() => {
    // Set a flag to track if the component is still mounted
    let isMounted = true;

    // Use a timeout to simulate the loading of the syntax highlighter
    // This ensures we show the loading state for at least a short time
    const timer = setTimeout(() => {
      if (isMounted && highlighterStyle) {
        setIsHighlighterLoaded(true);
      }
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [highlighterStyle]);

  // Loading placeholder
  const LoadingPlaceholder = () => (
    <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: 100,
      bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
      borderRadius: 1
    }}>
      <CircularProgress size={24} />
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Building a Simple Chat Demo
      </Typography>
      <Typography paragraph>
        Follow this guide to create a basic chat demo using PeerAI's API. This example demonstrates how to build
        a simple web interface that lets users send a message to the AI and view its response, along with detailed
        information about the API call including token usage, latency, and model details.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Step 1: Create the Chat Interface
      </Typography>
      <Typography paragraph>
        Create an HTML file with the complete chat interface and functionality:
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <Tooltip title="Copy HTML" placement="top">
          <IconButton
            onClick={() => onCopy(chatAppExample.html)}
            sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Suspense fallback={<LoadingPlaceholder />}>
          {isHighlighterLoaded && highlighterStyle && (
            <SyntaxHighlighter
              language="html"
              style={highlighterStyle}
              customStyle={{
                fontSize: '0.875rem',
                maxWidth: '100%',
                overflowX: 'auto',
                maxHeight: '300px',
                borderRadius: '4px',
                backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                color: isDarkMode ? '#d4d4d4' : '#333333',
              }}
              wrapLongLines={true}
            >
              {chatAppExample.html}
            </SyntaxHighlighter>
          )}
        </Suspense>
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Step 2: Test Your Application
      </Typography>
      <Typography paragraph>
        Open the HTML file in your browser and test the chat functionality. Make sure to replace 'YOUR_API_KEY' with your actual API key.
        For production applications, you should never expose your API key in client-side code. Instead, proxy the requests through your backend.
      </Typography>

      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Step 3: Customize and Extend
      </Typography>
      <Typography paragraph>
        This basic example can be extended in many ways:
      </Typography>
      <ul>
        <li>Add support for streaming responses</li>
        <li>Implement chat history persistence</li>
        <li>Add user authentication</li>
        <li>Enhance the UI with typing indicators and animations</li>
        <li>Add support for image and audio inputs</li>
      </ul>
    </Box>
  );
};

export default CookbookSection;
