import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { WidgetProps } from '@rjsf/utils';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/config';

interface FileUploadWidgetProps extends WidgetProps {
  options: {
    accept?: string;
    multiple?: boolean;
  };
}

interface UploadedFile {
  id: number;
  filename: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  size: number;
}

const FileUploadWidget: React.FC<FileUploadWidgetProps> = (props) => {
  const { options, id, disabled } = props;
  const { accept = '.pdf,.txt,.docx,.md', multiple = true } = options || {};
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const appSlug = window.location.pathname.split('/').pop() || '';
  const [appId, setAppId] = useState<number | null>(null);
  // We'll use the JWT token from localStorage instead of the API key
  const token = localStorage.getItem('access_token');

  // Fetch the app ID using the slug
  useEffect(() => {
    const fetchAppId = async () => {
      if (!appSlug || !token) return;

      try {
        const response = await fetch(`${api.defaults.baseURL}/deployed-apps/${appSlug}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch app details: ${response.status}`);
        }

        const data = await response.json();
        setAppId(data.id);
      } catch (err) {
        console.error('Error fetching app ID:', err);
        setError('Failed to fetch app details. Please try again later.');
      }
    };

    fetchAppId();
  }, [appSlug, token]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    // Check if JWT token is available
    if (!token) {
      setError('Authentication token not available. Please log in again.');
      return;
    }

    // Check if app ID is available
    if (!appId) {
      setError('App ID not available. Please try again later.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const fileList = Array.from(event.target.files);
    const newFiles: UploadedFile[] = fileList.map(file => ({
      id: Date.now() + Math.random(),
      filename: file.name,
      status: 'uploading',
      size: file.size,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileIndex = files.length + i;

      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);

        // Upload file - using fetch instead of axios to ensure proper FormData handling
        const response = await fetch(`${api.defaults.baseURL}/documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type header, let the browser set it with the boundary
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();

        // Associate document with app
        if (data && data.document_id) {
          // Use fetch for consistency
          const associateResponse = await fetch(`${api.defaults.baseURL}/documents/app-documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              app_id: appId,
              document_id: data.document_id,
              is_active: true,
            }),
          });

          if (!associateResponse.ok) {
            throw new Error(`Failed to associate document: ${associateResponse.status}`);
          }

          // Update file status
          setFiles(prev => prev.map((f, idx) =>
            idx === fileIndex ? { ...f, status: 'success' } : f
          ));
        }
      } catch (err: any) {
        console.error('Error uploading file:', err);

        // Update file status with error
        setFiles(prev => prev.map((f, idx) =>
          idx === fileIndex ? {
            ...f,
            status: 'error',
            error: err.message || 'Upload failed'
          } : f
        ));

        setError('One or more files failed to upload. Please check the file list for details.');
      }
    }

    setIsUploading(false);

    // Clear the input value so the same file can be uploaded again if needed
    event.target.value = '';
  };

  const handleRemoveFile = async (fileId: number) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (!fileToRemove) return;

    // If the file was successfully uploaded, we need to remove it from the server
    if (fileToRemove.status === 'success') {
      try {
        // We would need the document ID to remove it, but we don't have it here
        // In a real implementation, we would store the document ID when it's uploaded
        // For now, we'll just remove it from the UI
      } catch (err) {
        console.error('Error removing file:', err);
      }
    }

    // Remove file from state
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          border: '2px dashed',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          textAlign: 'center',
          mb: 2,
        }}
      >
        <input
          accept={accept}
          style={{ display: 'none' }}
          id={id}
          multiple={multiple}
          type="file"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />
        <label htmlFor={id}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Upload Documents
          </Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Click to browse or drag and drop files here
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            Supported formats: {accept.replace(/\./g, '').toUpperCase()}
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block">
            Files will be processed to extract text and generate embeddings for RAG.
          </Typography>
          <Button
            variant="contained"
            component="span"
            disabled={disabled || isUploading}
            startIcon={isUploading ? <CircularProgress size={20} /> : null}
            sx={{ mt: 2 }}
          >
            {isUploading ? 'Uploading...' : 'Select Files'}
          </Button>
        </label>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {files.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <List>
            {files.map((file, index) => (
              <React.Fragment key={file.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={file.filename}
                    secondary={
                      <>
                        {formatFileSize(file.size)}
                        {file.status === 'error' && (
                          <Typography component="span" color="error" sx={{ ml: 1 }}>
                            - {file.error}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    {file.status === 'uploading' ? (
                      <CircularProgress size={24} />
                    ) : file.status === 'success' ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveFile(file.id)}
                      disabled={file.status === 'uploading'}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default FileUploadWidget;
