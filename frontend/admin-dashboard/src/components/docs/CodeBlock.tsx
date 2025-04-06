import React, { lazy, Suspense, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// Lazy load the syntax highlighter
const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(module => ({
    default: module.Prism
  }))
);

interface CodeBlockProps {
  title: string;
  curl: string;
  response: string;
  onCopy: (text: string) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ title, curl, response, onCopy }) => {
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
    <Paper sx={{ p: 3, mb: 4, bgcolor: theme.palette.background.paper }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>

      <Box sx={{ position: 'relative' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Request:
        </Typography>
        <Tooltip title="Copy request" placement="top">
          <IconButton
            onClick={() => onCopy(curl)}
            sx={{ position: 'absolute', top: 0, right: 0 }}
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Suspense fallback={<LoadingPlaceholder />}>
          {isHighlighterLoaded && highlighterStyle && (
            <SyntaxHighlighter
              language="bash"
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
              {curl}
            </SyntaxHighlighter>
          )}
        </Suspense>
      </Box>

      <Box sx={{ position: 'relative' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Response:
        </Typography>
        <Tooltip title="Copy response" placement="top">
          <IconButton
            onClick={() => onCopy(response)}
            sx={{ position: 'absolute', top: 0, right: 0 }}
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Suspense fallback={<LoadingPlaceholder />}>
          {isHighlighterLoaded && highlighterStyle && (
            <SyntaxHighlighter
              language="json"
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
              {response}
            </SyntaxHighlighter>
          )}
        </Suspense>
      </Box>
    </Paper>
  );
};

export default CodeBlock;
