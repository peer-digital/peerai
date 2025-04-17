import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, useTheme } from '@mui/material';
import MonacoEditor from 'react-monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'html',
  height = '100%',
  readOnly = false,
}) => {
  const theme = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [editorValue, setEditorValue] = useState(value);

  useEffect(() => {
    setEditorValue(value);
  }, [value]);

  const handleEditorChange = (newValue: string) => {
    setEditorValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handleEditorDidMount = () => {
    setIsLoaded(true);
  };

  return (
    <Box sx={{ height, position: 'relative' }}>
      {!isLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.background.paper,
            zIndex: 1,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <MonacoEditor
        width="100%"
        height={height}
        language={language}
        theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs-light'}
        value={editorValue}
        onChange={handleEditorChange}
        editorDidMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          fontSize: 14,
          wordWrap: 'on',
          lineNumbers: 'on',
          folding: true,
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </Box>
  );
};

export default CodeEditor;
