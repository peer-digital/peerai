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
  IconButton,
  Divider,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { WidgetProps } from '@rjsf/utils';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '../../components/ui/StatusBadge';



interface UploadedFile {
  id: number;
  filename: string;
  status: 'uploading' | 'success' | 'error' | 'pending';
  error?: string;
  size: number;
  content?: string; // Base64 encoded file content for pre-deployment storage
  contentType?: string; // MIME type of the file
  sessionId?: string; // Session ID for temporary storage
  tempStoragePath?: string; // Path to the file in temporary storage
  documentId?: number; // ID of the document in the database after successful upload
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
  const { options = {}, id, disabled, onChange, value } = props;
  const accept = options.accept ?? '.pdf,.txt,.docx,.md';
  const multiple = options.multiple ?? true;
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { } = useAuth(); // Auth context is used but we don't need user directly
  const appSlug = window.location.pathname.split('/').pop() || '';
  const [appId, setAppId] = useState<number | null>(null);
  // We'll use the JWT token from localStorage instead of the API key
  const token = localStorage.getItem('access_token');
  const queryClient = useQueryClient();

  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{id: number, isInMemory?: boolean, isDocument?: boolean, documentId?: number, filename?: string} | null>(null);

  // Determine if we're in pre-deployment mode (no appId yet)
  const isPreDeployment = !appId;

  // Store in-memory files for pre-deployment
  // Initialize from form value if available
  const [inMemoryFiles, setInMemoryFiles] = useState<UploadedFile[]>(() => {
    // If we have a value and it's an array, use it
    if (value && Array.isArray(value)) {
      return value;
    }
    return [];
  });

  // Fetch the app ID using the slug
  useEffect(() => {
    const fetchAppId = async () => {
      // If we don't have a slug or token, we're likely in pre-deployment configuration mode
      if (!appSlug || !token) {
        // Clear any existing error that might be related to app fetching
        setError(null);
        return;
      }

      try {
        const response = await fetch(`${api.defaults.baseURL}/deployed-apps/${appSlug}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // If we get a 404, it means the app doesn't exist yet (pre-deployment)
          // This is not an error condition for us
          if (response.status === 404) {
            console.log('App not found - likely in pre-deployment configuration mode');
            return;
          }
          throw new Error(`Failed to fetch app details: ${response.status}`);
        }

        const data = await response.json();
        setAppId(data.id);
      } catch (err) {
        console.error('Error fetching app ID:', err);
        // Don't set error for pre-deployment mode
        if (appSlug) {
          setError('Failed to fetch app details. Please try again later.');
        }
      }
    };

    fetchAppId();
  }, [appSlug, token]);

  // Add a useEffect to check for appId changes and process temporary files if needed
  useEffect(() => {
    // When appId becomes available (app is deployed), process any temporary files
    if (appId && inMemoryFiles.length > 0) {
      console.log(`App ID ${appId} is now available. Processing ${inMemoryFiles.length} temporary files...`);
      uploadInMemoryFilesToServer();
    }
  }, [appId]);

  // Add a useEffect to check for session ID on component mount
  useEffect(() => {
    try {
      // Check if we have a session ID
      const sessionId = localStorage.getItem('rag_chatbot_session_id');

      if (sessionId) {
        console.log(`Found session ID: ${sessionId}`);

        // If we're in post-deployment mode and have an app ID, check if we need to process files
        if (appId) {
          console.log(`App is deployed (ID: ${appId}). Checking for temporary files to process...`);

          // Call the API to check if there are any temporary files for this session
          const checkForTemporaryFiles = async () => {
            try {
              // For now, we'll just check if there are any files in the UI state
              if (inMemoryFiles.length > 0) {
                console.log(`Found ${inMemoryFiles.length} files to process`);
                uploadInMemoryFilesToServer();
              } else {
                console.log('No temporary files found to process');
              }
            } catch (err) {
              console.error('Error checking for temporary files:', err);
            }
          };

          checkForTemporaryFiles();
        }
      }
    } catch (err) {
      console.warn('Error checking for session ID:', err);
    }
  }, [appId]);

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

  // Effect to clear "Recently Uploaded Files" when they appear in the Knowledge Base
  useEffect(() => {
    // Only run this effect when we have both documents and files
    if (documents && documents.length > 0 && files.length > 0) {
      // Get document IDs from the knowledge base
      const knowledgeBaseDocIds = documents.map(doc => doc.id);

      // Check if any of our "Recently Uploaded Files" have matching document IDs
      const hasMatchingFiles = files.some(file =>
        file.status === 'success' &&
        file.documentId &&
        knowledgeBaseDocIds.includes(file.documentId)
      );

      // If we found matching files, clear the "Recently Uploaded Files" list
      if (hasMatchingFiles) {
        console.log('Clearing recently uploaded files as they now appear in the knowledge base');
        setFiles([]);
      }
    }
  }, [documents, files]);

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

  // We no longer need the readFileAsBase64 function as we're using server-side storage

  // Generate a unique session ID for this app configuration
  const getSessionId = () => {
    // Get or create a session ID for this app configuration
    let sessionId = localStorage.getItem('rag_chatbot_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('rag_chatbot_session_id', sessionId);
      console.log(`Created new session ID: ${sessionId}`);
    }
    return sessionId;
  };

  // Function to handle pre-deployment file uploads (upload to temporary storage)
  const handlePreDeploymentUpload = async (fileList: File[]) => {
    setIsUploading(true);
    setError(null);

    const sessionId = getSessionId();
    console.log(`Using session ID for temporary storage: ${sessionId}`);

    const newFiles: UploadedFile[] = [];
    let updatedFiles = [...inMemoryFiles]; // Start with current files

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileId = Date.now() + Math.random();

      try {
        console.log(`Uploading file to temporary storage: ${file.name}`);

        // Add file to UI with pending status
        const pendingFile: UploadedFile = {
          id: fileId,
          filename: file.name,
          status: 'pending',
          size: file.size,
          contentType: file.type,
          sessionId: sessionId, // Store the session ID with the file
        };

        // Update local state and the updatedFiles array
        updatedFiles = [...updatedFiles, pendingFile];
        setInMemoryFiles(updatedFiles);

        // Create form data for the temporary upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);

        // Upload to temporary storage
        const response = await fetch(`${api.defaults.baseURL}/temp-documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Don't set Content-Type header, let the browser set it with the boundary
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload to temporary storage failed: ${response.status}`);
        }

        const data = await response.json();
        console.log(`File uploaded to temporary storage: ${data.filename}`);

        // Update file with server response
        const fileWithMetadata: UploadedFile = {
          ...pendingFile,
          status: 'success',
          tempStoragePath: data.storage_path,
        };

        newFiles.push(fileWithMetadata);

        // Update both local state and the updatedFiles array
        updatedFiles = updatedFiles.map(f => f.id === fileId ? fileWithMetadata : f);
        setInMemoryFiles(updatedFiles);

        console.log(`File processed successfully: ${file.name}`);
      } catch (err: any) {
        console.error('Error uploading file to temporary storage:', err);

        // Update file status with error in both local state and updatedFiles
        updatedFiles = updatedFiles.map(f => f.id === fileId ? {
          ...f,
          status: 'error',
          error: err.message || 'Failed to upload file to temporary storage'
        } : f);

        setInMemoryFiles(updatedFiles);
        setError('One or more files failed to upload. Please check the file list for details.');
      }
    }

    // Update the form value to include metadata about the files
    if (onChange) {
      // We only need to store metadata, not the actual file content
      const metadataOnly = updatedFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        status: file.status,
        size: file.size,
        contentType: file.contentType,
        sessionId: sessionId,
        error: file.error,
      }));

      console.log(`Updating form value with ${metadataOnly.length} files`);
      onChange(metadataOnly);
    }

    setIsUploading(false);
  };

  // Function to process temporary files after deployment
  const uploadInMemoryFilesToServer = async () => {
    if (!appId || !token || inMemoryFiles.length === 0) {
      console.log("Cannot process temporary files: missing appId, token, or no files to process");
      return;
    }

    // Get the session ID
    const sessionId = inMemoryFiles[0]?.sessionId || getSessionId();

    console.log(`Processing temporary files for app ID ${appId} with session ID ${sessionId}`);
    setIsUploading(true);
    setError(null);

    // Add files to UI with uploading status
    const uploadingFiles = inMemoryFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      status: 'uploading' as const,
      size: file.size,
    }));

    setFiles(prev => [...prev, ...uploadingFiles]);

    try {
      // Call the API to process all temporary files at once
      console.log(`Calling API to process temporary files for app ID ${appId}`);
      const response = await fetch(`${api.defaults.baseURL}/temp-documents/process/${appId}?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to process temporary files: ${response.status}`);
      }

      const processedDocuments = await response.json();
      console.log(`Successfully processed ${processedDocuments.length} documents`);

      // Clear the files list completely instead of just updating status
      setFiles([]);

      // Clear in-memory files as well
      setInMemoryFiles([]);

      // Clear the session ID to prevent duplicate processing
      localStorage.removeItem('rag_chatbot_session_id');

      // Show success message
      setError(null);
    } catch (err: any) {
      console.error('Error processing temporary files:', err);
      setError(`Error processing files: ${err.message}`);

      // Update all files to error status
      setFiles(prev => prev.map(f => ({
        ...f,
        status: 'error',
        error: err.message || 'Failed to process temporary files'
      })));
    }

    // Clear in-memory files after processing
    console.log('Clearing in-memory files after processing');
    setInMemoryFiles([]);

    // Update form value to clear files
    if (onChange) {
      onChange([]);
    }

    // Clear session ID
    localStorage.removeItem('rag_chatbot_session_id');

    // Refresh document list
    console.log('Refreshing document list');
    refetchDocuments();

    setIsUploading(false);
    console.log('Temporary file processing completed');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    // Check if JWT token is available
    if (!token) {
      setError('Authentication token not available. Please log in again.');
      return;
    }

    const fileList = Array.from(event.target.files);

    // Handle pre-deployment uploads differently
    if (!appId) {
      await handlePreDeploymentUpload(fileList);
      // Clear the input value so the same file can be uploaded again if needed
      event.target.value = '';
      return;
    }

    // Post-deployment upload flow
    setIsUploading(true);
    setError(null);

    const newFiles: UploadedFile[] = fileList.map(file => ({
      id: Date.now() + Math.random(),
      filename: file.name,
      status: 'uploading',
      size: file.size,
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Store the file IDs for tracking
    const fileIds = newFiles.map(f => f.id);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileId = fileIds[i];

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
        console.log('Upload response:', data);

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

          const associateData = await associateResponse.json();
          console.log('Associate response:', associateData);

          // Update file status by ID instead of index
          setFiles(prev => prev.map(f =>
            f.id === fileId ? {
              ...f,
              status: 'success',
              documentId: data.document_id
            } : f
          ));
        }
      } catch (err: any) {
        console.error('Error uploading file:', err);

        // Update file status with error by ID instead of index
        setFiles(prev => prev.map(f =>
          f.id === fileId ? {
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

    // Clear the "Recently Uploaded Files" list for files that were successfully uploaded
    const successfullyUploadedFiles = files.filter(f => f.status === 'success' && f.documentId);
    if (successfullyUploadedFiles.length > 0) {
      console.log('Clearing successfully uploaded files from the Recently Uploaded Files list');
      setFiles(prev => prev.filter(f => f.status !== 'success'));
    }
  };

  // Show delete confirmation dialog
  const confirmDelete = (id: number, isInMemory: boolean = false, isDocument: boolean = false, documentId?: number, filename?: string) => {
    setFileToDelete({ id, isInMemory, isDocument, documentId, filename });
    setDeleteDialogOpen(true);
  };

  // Handle dialog close
  const handleCloseDialog = () => {
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  // Execute the delete after confirmation
  const executeDelete = async () => {
    if (!fileToDelete) return;

    if (fileToDelete.isDocument) {
      // It's a document from the knowledge base
      await handleRemoveDocument(fileToDelete.id);
    } else {
      // It's a file from the upload lists
      await handleRemoveFile(fileToDelete.id, fileToDelete.isInMemory);
    }

    // Close the dialog
    handleCloseDialog();
  };

  const handleRemoveFile = async (fileId: number, isInMemory: boolean = false) => {
    if (isInMemory) {
      // Remove in-memory file
      const fileToRemove = inMemoryFiles.find(f => f.id === fileId);
      if (fileToRemove) {
        // Update local state
        const updatedFiles = inMemoryFiles.filter(f => f.id !== fileId);
        setInMemoryFiles(updatedFiles);

        // Update form value
        if (onChange) {
          console.log(`Updating form value after removing file: ${fileToRemove.filename}`);
          onChange(updatedFiles);

          // No need to update localStorage as we're using the server-side storage
        }
      }
    } else {
      // Handle regular files (post-deployment)
      const fileToRemove = files.find(f => f.id === fileId);
      if (fileToRemove) {
        console.log('Removing file:', fileToRemove);

        // If the file was successfully uploaded, we need to remove it from the server
        if (fileToRemove.status === 'success' && fileToRemove.documentId && appId) {
          try {
            console.log(`Removing document ${fileToRemove.documentId} from app ${appId}`);

            // Call the removeDocumentMutation to properly remove the document
            await removeDocumentMutation.mutateAsync({
              appId,
              documentId: fileToRemove.documentId
            });

            console.log(`Document ${fileToRemove.documentId} removed successfully`);

            // Refresh the document list
            refetchDocuments();
          } catch (err) {
            console.error('Error removing file:', err);
            setError('Failed to remove document from server. Please try again.');
          }
        }

        // Remove file from state
        setFiles(prev => prev.filter(f => f.id !== fileId));
      }
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
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {fileToDelete?.filename || 'this file'}?
            This action cannot be undone and will permanently remove the file from your knowledge base.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={executeDelete} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
        <label htmlFor={id ?? 'file-upload-input'}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            Upload Documents
          </Typography>

          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            Supported formats: {String(accept).replace(/\./g, '').toUpperCase()}
          </Typography>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            Files will be processed automatically after upload.
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

      {/* In-memory files (pre-deployment) */}
      {inMemoryFiles.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
            <Typography variant="subtitle1">Uploaded Files</Typography>
          </Box>
          <Divider />
          <List>
            {inMemoryFiles.map((file, index) => (
              <React.Fragment key={file.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
                      {file.status === 'pending' ? (
                        <CircularProgress size={24} />
                      ) : (
                        <StatusBadge
                          status={file.status === 'success' ? 'success' : file.status === 'error' ? 'error' : 'default'}
                          label={file.status === 'success' ? 'Uploaded' : file.status === 'error' ? 'Failed' : 'Pending'}
                          size="small"
                        />
                      )}

                      {file.status === 'error' && (
                        <Tooltip title={file.error || 'Upload failed'}>
                          <ErrorIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}

                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => confirmDelete(file.id, true, false, undefined, file.filename)}
                        disabled={file.status === 'pending'}
                        startIcon={<DeleteIcon fontSize="small" />}
                        sx={{
                          ml: 1,
                          borderRadius: '4px',
                          textTransform: 'none',
                          minWidth: 'auto',
                          px: 1.5,
                          height: '24px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={file.filename}
                    secondary={formatFileSize(file.size)}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Currently uploading files (post-deployment) */}
      {files.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
            <Typography variant="subtitle1">Currently training</Typography>
          </Box>
          <Divider />
          <List>
            {files.map((file, index) => (
              <React.Fragment key={file.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
                      {file.status === 'uploading' ? (
                        <CircularProgress size={24} />
                      ) : (
                        <StatusBadge
                          status={file.status === 'success' ? 'success' : file.status === 'error' ? 'error' : 'default'}
                          label={file.status === 'success' ? 'Uploaded' : file.status === 'error' ? 'Failed' : 'Pending'}
                          size="small"
                        />
                      )}

                      {file.status === 'error' && (
                        <Tooltip title={file.error || 'Upload failed'}>
                          <ErrorIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}

                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => confirmDelete(file.id, false, false, file.documentId, file.filename)}
                        disabled={file.status === 'uploading'}
                        startIcon={<DeleteIcon fontSize="small" />}
                        sx={{
                          ml: 1,
                          borderRadius: '4px',
                          textTransform: 'none',
                          minWidth: 'auto',
                          px: 1.5,
                          height: '24px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={file.filename}
                    secondary={formatFileSize(file.size)}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Existing documents */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
          <Typography variant="subtitle1">Knowledge base</Typography>
          {!isPreDeployment && (
            <Tooltip title="Refresh document list">
              <IconButton
                size="small"
                onClick={() => refetchDocuments()}
                disabled={isLoadingDocuments}
              >
                {isLoadingDocuments ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Divider />
        {isPreDeployment ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="textSecondary">
              Document history will be available soon.
            </Typography>
          </Box>
        ) : isLoadingDocuments ? (
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
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
                      <StatusBadge
                        status={doc.is_processed ? 'success' : 'error'}
                        label={doc.is_processed ? 'Processed' : 'Failed'}
                        size="small"
                      />

                      {doc.processing_error && (
                        <Tooltip title={doc.processing_error}>
                          <ErrorIcon color="error" fontSize="small" sx={{ ml: 1 }} />
                        </Tooltip>
                      )}

                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        onClick={() => confirmDelete(doc.id, false, true, undefined, doc.filename)}
                        disabled={removeDocumentMutation.isPending}
                        startIcon={removeDocumentMutation.isPending ?
                          <CircularProgress size={16} color="inherit" /> :
                          <DeleteIcon fontSize="small" />
                        }
                        sx={{
                          ml: 1,
                          borderRadius: '4px',
                          textTransform: 'none',
                          minWidth: 'auto',
                          px: 1.5,
                          height: '24px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={doc.filename}
                    secondary={`${formatFileSize(doc.size_bytes)} • ${formatDate(doc.created_at)}`}
                  />
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
