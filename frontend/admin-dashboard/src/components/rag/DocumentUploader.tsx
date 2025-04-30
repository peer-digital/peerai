import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import DescriptionIcon from '@mui/icons-material/Description';
import api from '../../api/config';

interface Document {
  id: number;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface DocumentUploaderProps {
  appSlug: string;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ appSlug }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, [appSlug]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    // Get the access token from localStorage
    const token = localStorage.getItem('access_token');

    // Use XMLHttpRequest for consistency
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/v1/rag/admin/app/${appSlug}/documents`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    // Set up event handlers
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          setDocuments(data);
        } catch (err) {
          console.error('Error parsing document list:', err);
          setError('Failed to parse document list. Please try again.');
        }
      } else {
        console.error('Fetch failed:', xhr.status, xhr.statusText, xhr.responseText);
        setError(`Failed to load documents: ${xhr.status} ${xhr.statusText}`);
      }
      setLoading(false);
    };

    xhr.onerror = function() {
      console.error('Fetch error:', xhr.statusText);
      setError('Network error while loading documents. Please try again.');
      setLoading(false);
    };

    // Send the request
    xhr.send();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    // Create a FormData object
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      // Get the access token from localStorage
      const token = localStorage.getItem('access_token');

      // Log the request details for debugging
      console.log('Uploading file:', files[0].name);
      console.log('File size:', files[0].size);
      console.log('File type:', files[0].type);
      console.log('App slug:', appSlug);

      // Use XMLHttpRequest for more control over the request
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/v1/rag/admin/app/${appSlug}/documents`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Set up event handlers
      xhr.onload = function() {
        if (xhr.status === 200) {
          console.log('Upload successful:', xhr.responseText);
          setSuccess(`Successfully uploaded ${files[0].name}`);
          fetchDocuments(); // Refresh the document list
        } else {
          console.error('Upload failed:', xhr.status, xhr.statusText, xhr.responseText);
          setError(`Upload failed: ${xhr.status} ${xhr.statusText}`);
        }
        setUploading(false);
        // Clear the file input
        event.target.value = '';
      };

      xhr.onerror = function() {
        console.error('Upload error:', xhr.statusText);
        setError('Network error during upload. Please try again.');
        setUploading(false);
        // Clear the file input
        event.target.value = '';
      };

      // Send the request
      xhr.send(formData);
    } catch (err) {
      console.error('Error setting up file upload:', err);
      setError('Failed to upload file. Please try again.');
      setUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    setError(null);
    setSuccess(null);

    // Get the access token from localStorage
    const token = localStorage.getItem('access_token');

    // Use XMLHttpRequest for consistency
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', `/api/v1/rag/admin/app/${appSlug}/documents/${documentId}`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    // Set up event handlers
    xhr.onload = function() {
      if (xhr.status === 204 || xhr.status === 200) {
        setSuccess('Document deleted successfully');
        // Update the documents list
        setDocuments(documents.filter(doc => doc.id !== documentId));
      } else {
        console.error('Delete failed:', xhr.status, xhr.statusText, xhr.responseText);
        setError(`Failed to delete document: ${xhr.status} ${xhr.statusText}`);
      }
    };

    xhr.onerror = function() {
      console.error('Delete error:', xhr.statusText);
      setError('Network error while deleting document. Please try again.');
    };

    // Send the request
    xhr.send();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Knowledge Base Documents
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload documents to enhance your chatbot with domain-specific knowledge.
        Supported formats: PDF, TXT, DOCX, MD
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <input
          accept=".pdf,.txt,.docx,.md"
          style={{ display: 'none' }}
          id="raised-button-file"
          type="file"
          onChange={handleFileUpload}
          disabled={uploading}
        />
        <label htmlFor="raised-button-file">
          <Button
            variant="contained"
            component="span"
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </label>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle1" gutterBottom>
        Uploaded Documents
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            No documents uploaded yet
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined">
          <List>
            {documents.map((doc) => (
              <ListItem key={doc.id}>
                <DescriptionIcon sx={{ mr: 2, color: 'primary.main' }} />
                <ListItemText
                  primary={doc.filename}
                  secondary={`${doc.file_type.toUpperCase()} • ${formatFileSize(doc.file_size)} • Uploaded: ${formatDate(doc.created_at)}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleDeleteDocument(doc.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default DocumentUploader;
