import React, { useState, useEffect } from 'react';
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
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { WidgetProps } from '@rjsf/utils';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';



interface UploadedFile {
  id: number;
  filename: string;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  size: number;
}

interface DocumentResponse {
  id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by_id: number;
  storage_path: string;
  is_processed: boolean;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
  team_id: number | null;
}

const FileUploadWidget: React.FC<WidgetProps> = (props) => {
  const { options = {}, id, disabled } = props;
  const accept = options.accept ?? '.pdf,.txt,.docx,.md';
  const multiple = options.multiple ?? true;
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const appSlug = window.location.pathname.split('/').pop() || '';
  const [appId, setAppId] = useState<number | null>(null);
  // We'll use the JWT token from localStorage instead of the API key
  const token = localStorage.getItem('access_token');
  const queryClient = useQueryClient();

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

  // Fetch documents for this app
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    isError: isDocumentsError,
    refetch: refetchDocuments
  } = useQuery({
    queryKey: ['app-documents', appId],
    queryFn: async () => {
      if (!appId || !token) return [];

      const response = await fetch(`${api.defaults.baseURL}/documents/app/${appId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      return response.json() as Promise<DocumentResponse[]>;
    },
    enabled: !!appId && !!token,
  });

  // Mutation for removing a document from the app
  const removeDocumentMutation = useMutation({
    mutationFn: async ({ appId, documentId }: { appId: number, documentId: number }) => {
      const response = await fetch(
        `${api.defaults.baseURL}/documents/app-documents/${appId}/${documentId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to remove document: ${response.status}`);
      }

      return { appId, documentId };
    },
    onSuccess: () => {
      // Invalidate the documents query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['app-documents', appId] });
    },
  });

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

    // Refresh the document list
    refetchDocuments();
  };

  const handleRemoveFile = async (fileId: number) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove) {
      // If the file was successfully uploaded, we need to remove it from the server
      if (fileToRemove.status === 'success') {
        try {
          // We would need the document ID to remove it, but we don't have it here
          // For now, we'll just remove it from the UI
          console.warn('Cannot delete document from server as document ID is not stored in the UI state');
        } catch (err) {
          console.error('Error removing file:', err);
        }
      }

      // Remove file from state
      setFiles(prev => prev.filter(f => f.id !== fileId));
    }
  };

  // Handle removing a document from the app
  const handleRemoveDocument = async (documentId: number) => {
    if (!appId) {
      setError('App ID not available. Please try again later.');
      return;
    }

    try {
      await removeDocumentMutation.mutateAsync({ appId, documentId });
    } catch (err: any) {
      console.error('Error removing document:', err);
      setError(err.message || 'Failed to remove document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          accept={String(accept)}
          style={{ display: 'none' }}
          id={id ?? 'file-upload-input'}
          multiple={Boolean(multiple)}
          type="file"
          onChange={handleFileChange}
          disabled={!!disabled || isUploading}
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
          Supported formats: {String(accept).replace(/\./g, '').toUpperCase()}          </Typography>
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

      {/* Currently uploading files */}
      {files.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
            <Typography variant="subtitle1">Uploading Files</Typography>
          </Box>
          <Divider />
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

      {/* Existing documents */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
          <Typography variant="subtitle1">Document History</Typography>
          <Tooltip title="Refresh document list">
            <IconButton
              size="small"
              onClick={() => refetchDocuments()}
              disabled={isLoadingDocuments}
            >
              {isLoadingDocuments ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        {isLoadingDocuments ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : isDocumentsError ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">
              Error loading documents. Please try refreshing.
            </Alert>
          </Box>
        ) : documents && documents.length > 0 ? (
          <List>
            {documents.map((doc, index) => (
              <React.Fragment key={doc.id}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={doc.filename}
                    secondary={
                      <>
                        {formatFileSize(doc.size_bytes)} • {formatDate(doc.created_at)}
                        {doc.processing_error && (
                          <Typography component="span" color="error" sx={{ ml: 1 }}>
                            - Error: {doc.processing_error}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    {doc.is_processed ? (
                      <Tooltip title="Document processed">
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                      </Tooltip>
                    ) : (
                      <Tooltip title="Processing failed">
                        <ErrorIcon color="error" sx={{ mr: 1 }} />
                      </Tooltip>
                    )}
                    <Tooltip title="Remove document">
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveDocument(doc.id)}
                        disabled={removeDocumentMutation.isPending}
                      >
                        {removeDocumentMutation.isPending ? <CircularProgress size={20} /> : <DeleteIcon />}
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">No documents uploaded yet</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FileUploadWidget;
