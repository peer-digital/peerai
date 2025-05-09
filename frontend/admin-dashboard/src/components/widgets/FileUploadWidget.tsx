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
  Info as InfoIcon,
} from '@mui/icons-material';
import { WidgetProps } from '@rjsf/utils';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StatusBadge } from '../../components/ui/StatusBadge';



interface UploadedFile {
  id: number;
  filename: string;
  status: 'uploading' | 'success' | 'error' | 'pending' | 'processing';
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

  // Store in-memory files for pre-deployment
  // Initialize from form value if available
  const [inMemoryFiles, setInMemoryFiles] = useState<UploadedFile[]>(() => {
    // If we have a value and it's an array, use it
    if (value && Array.isArray(value)) {
      return value;
    }
    return [];
  });

  // Determine if we're in pre-deployment mode (no appId yet)
  const isPreDeployment = !appId;

  // Check if any files are in processing state
  const hasProcessingFiles = inMemoryFiles.some(file => file.status === 'processing');

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
        console.log(`Fetching app details for slug: ${appSlug}`);
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
        console.log(`Successfully fetched app details. App ID: ${data.id}`);

        // Store the app ID in the component state
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



  // Fetch documents for this app
  const {
    data: documents = [], // Provide default empty array to avoid TypeScript errors
    isLoading: isLoadingDocuments,
    isError: isDocumentsError,
    refetch: refetchDocuments
  } = useQuery({
    queryKey: ['app-documents', appId],
    queryFn: async () => {
      if (!appId || !token) return [] as DocumentResponse[];

      // Extremely reduced logging to avoid console spam
      if (Math.random() < 0.01) { // Only log ~1% of the time
        console.log(`Fetching documents for app ID: ${appId}`);
      }
      const response = await fetch(`${api.defaults.baseURL}/documents/app/${appId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If we get a 404, it might mean the app ID is incorrect
        if (response.status === 404) {
          console.error(`App ID ${appId} not found. This might be because the app was recreated with the same slug.`);
          // Return an empty array instead of throwing an error
          return [] as DocumentResponse[];
        }
        throw new Error(`Failed to fetch documents: ${response.status}`);
      }

      const data = await response.json();
      // Extremely reduced logging to avoid console spam
      if (Math.random() < 0.01) { // Only log ~1% of the time
        console.log(`Successfully fetched ${data.length} documents for app ID: ${appId}`);
      }
      return data as DocumentResponse[];
    },
    enabled: !!appId && !!token,
    // Retry up to 3 times with exponential backoff
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Add a useEffect to check for appId changes and refresh documents
  useEffect(() => {
    // When appId becomes available (app is deployed), refresh the document list
    if (appId) {
      console.log(`App ID ${appId} is now available.`);
      // Refresh the document list to ensure we have the latest data
      refetchDocuments();
    }
  }, [appId, refetchDocuments]);

  // Effect to ensure files persist across page refreshes
  useEffect(() => {
    if (documents && documents.length > 0) {
      // Show all documents
      const docsToShow = documents;

      // Always update the files list with the latest documents
      // This ensures files appear in the Knowledge Base immediately after upload
      // Create file entries for all documents
      const allFiles = docsToShow.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        status: doc.is_processed ? 'success' as const : (doc.processing_error ? 'error' as const : 'processing' as const),
        size: doc.size_bytes,
        documentId: doc.id,
        error: doc.processing_error || undefined
      }));

      // Merge with existing files that might not be in the documents list yet
      // (like files that were just uploaded and are still being processed)
      const existingProcessingFiles = files.filter(file =>
        file.status === 'processing' &&
        !allFiles.some(docFile => docFile.filename === file.filename)
      );

      const mergedFiles = [...allFiles, ...existingProcessingFiles];

      console.log(`Updating UI with ${mergedFiles.length} files from database and local state`);
      setFiles(mergedFiles);
    }
  }, [documents]); // Removed files from dependencies to prevent infinite loop

  // Modified effect to update file status when they appear in the Knowledge Base
  // instead of clearing them completely
  useEffect(() => {
    // Only run this effect when we have both documents and files
    if (documents && documents.length > 0 && files.length > 0) {
      // Get document IDs and their processing status from the knowledge base
      const knowledgeBaseDocInfo = documents.reduce((acc, doc) => {
        acc[doc.id] = { isProcessed: doc.is_processed, error: doc.processing_error };
        return acc;
      }, {} as Record<number, { isProcessed: boolean, error: string | null }>);

      // Check if any of our files have matching document IDs and update their status
      let updatedFiles = false;
      const newFiles = files.map(file => {
        if (file.documentId && knowledgeBaseDocInfo[file.documentId]) {
          const docInfo = knowledgeBaseDocInfo[file.documentId];

          // Only update if the status would change
          if ((docInfo.isProcessed && file.status !== 'success') ||
              (!docInfo.isProcessed && docInfo.error && file.status !== 'error')) {
            updatedFiles = true;

            // Update status based on document processing status
            return {
              ...file,
              status: docInfo.isProcessed ? 'success' : (docInfo.error ? 'error' : file.status),
              error: docInfo.error || file.error
            };
          }
        }
        return file;
      });

      // If we updated any files, update the state
      if (updatedFiles) {
        console.log('Updating file status based on knowledge base information');
        setFiles(newFiles);
      }
    }
  }, [documents]); // Removed files from dependencies to prevent infinite loop

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

    // In edit mode, immediately add files to the Knowledge Base with uploading status
    // This ensures they appear right away without waiting for the API response
    if (!isPreDeployment && appId) {
      const tempFiles = fileList.map(file => ({
        id: Date.now() + Math.random(),
        filename: file.name,
        status: 'uploading' as const,
        size: file.size,
        documentId: undefined
      }));

      console.log(`Edit mode: Adding ${tempFiles.length} temporary files to Knowledge Base`);
      setFiles(prev => {
        // Filter out any existing files with the same filename
        const filteredPrev = prev.filter(f =>
          !tempFiles.some(tempFile => tempFile.filename === f.filename)
        );
        return [...filteredPrev, ...tempFiles];
      });
    }

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const fileId = Date.now() + Math.random();

      try {
        console.log(`Uploading file to temporary storage: ${file.name}`);

        // Add file to UI with uploading status (not pending)
        const pendingFile: UploadedFile = {
          id: fileId,
          filename: file.name,
          status: 'uploading', // Changed from 'pending' to 'uploading' for consistency
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

        // Update file with server response - set to processing instead of success
        const fileWithMetadata: UploadedFile = {
          ...pendingFile,
          status: 'processing', // Changed from 'success' to 'processing' for consistency with post-deployment
          tempStoragePath: data.storage_path,
        };

        newFiles.push(fileWithMetadata);

        // Update both local state and the updatedFiles array
        updatedFiles = updatedFiles.map(f => f.id === fileId ? fileWithMetadata : f);
        setInMemoryFiles(updatedFiles);

        // In edit mode, update the file status in the Knowledge Base
        if (!isPreDeployment && appId) {
          setFiles(prev => prev.map(f =>
            f.filename === file.name ? { ...f, status: 'processing' as const } : f
          ));
        }

        console.log(`File uploaded successfully and marked as processing: ${file.name}`);
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
        tempStoragePath: file.tempStoragePath,
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

    // In edit mode, we don't want to add files to the UI state immediately
    // This prevents duplicate entries in the Knowledge Base section
    if (isPreDeployment) {
      // Only in pre-deployment mode, add files to UI with uploading status
      const uploadingFiles = inMemoryFiles.map(file => ({
        id: file.id,
        filename: file.filename,
        status: 'uploading' as const,
        size: file.size,
        sessionId: sessionId, // Make sure to include the sessionId
      }));

      setFiles(prev => [...prev, ...uploadingFiles]);
    }

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

      // In pre-deployment mode, update existing files
      if (isPreDeployment) {
        // Update file status to processing and add document IDs
        setFiles(prev => prev.map(f => {
          const matchingDoc = processedDocuments.find((doc: any) => doc.filename === f.filename);
          return {
            ...f,
            status: 'processing',
            documentId: matchingDoc?.id
          };
        }));
      } else {
        // In edit mode, manually add the files to the files array with processing status
        // This ensures they appear in the Knowledge Base immediately
        const newProcessingFiles = processedDocuments.map((doc: any) => ({
          id: doc.id,
          filename: doc.filename,
          status: 'processing' as const,
          size: doc.size_bytes || 0,
          documentId: doc.id
        }));

        console.log(`Adding ${newProcessingFiles.length} processing files to Knowledge Base`);

        // First, directly update the files state to show the processing files immediately
        setFiles(prev => {
          // Filter out any existing files with the same filename to avoid duplicates
          const filteredPrev = prev.filter(f =>
            !newProcessingFiles.some((newFile: UploadedFile) => newFile.filename === f.filename)
          );
          return [...filteredPrev, ...newProcessingFiles];
        });

        // Force a document list refresh to ensure the UI is updated
        setTimeout(() => {
          console.log('Forcing document list refresh to update UI');
          refetchDocuments();
        }, 500);
      }

      // Clear in-memory files as they're now in the database
      setInMemoryFiles([]);

      // Don't clear the session ID yet - we'll keep it for this edit session
      // This ensures files are properly tracked across page refreshes

      // Show success message
      setError(null);

      // In edit mode, immediately refresh the document list to show the new files
      if (!isPreDeployment) {
        console.log('Edit mode: Refreshing document list to show newly processed files');
        refetchDocuments();
      }
    } catch (err: any) {
      console.error('Error processing temporary files:', err);
      setError(`Error processing files: ${err.message}`);

      // Update files to error status only in pre-deployment mode
      if (isPreDeployment) {
        setFiles(prev => prev.map(f => ({
          ...f,
          status: 'error',
          error: err.message || 'Failed to process temporary files'
        })));
      }
    }

    // Clear in-memory files after processing
    console.log('Clearing in-memory files after processing');
    setInMemoryFiles([]);

    // Update form value to clear files
    if (onChange) {
      onChange([]);
    }

    // Refresh document list
    console.log('Refreshing document list');
    refetchDocuments();

    // Set up a timer to periodically refresh the document list to update processing status
    const checkProcessingInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        // Only check if we have files that are still processing
        if (files.some(file => file.status === 'processing')) {
          // Only log once every few refreshes to reduce console spam
          if (Math.random() < 0.05) { // Reduced to ~5% chance to log
            console.log('Checking processing status of uploaded files');
          }
          refetchDocuments();
        } else {
          // If no files are processing, clear the interval early
          clearInterval(checkProcessingInterval);
          console.log('No more files processing, stopping automatic refresh');
        }
      }
    }, 5000); // Check every 5 seconds as requested

    // Clear the interval after 2 minutes (by then most files should be processed)
    setTimeout(() => {
      clearInterval(checkProcessingInterval);
      // Only clear the session ID after we're done checking for updates
      localStorage.removeItem('rag_chatbot_session_id');
      console.log('Automatic refresh stopped after timeout');
    }, 120000); // 2 minutes

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

    // Use the same temporary storage approach for both pre-deployment and post-deployment
    // This ensures consistent behavior between wizard and edit mode
    await handlePreDeploymentUpload(fileList);

    // If we have an appId (edit mode), immediately process the temporary files
    if (appId) {
      console.log(`App ID available (${appId}). Processing temporary files immediately...`);

      try {
        // In edit mode, we want to process files immediately and show them in the Knowledge Base
        // without showing duplicate entries in the Uploading Files section
        await uploadInMemoryFilesToServer();

        // In edit mode, we're now manually adding files to the UI and forcing a refresh
        // in uploadInMemoryFilesToServer, but let's add an additional refresh here
        // with a slight delay to ensure the UI is updated
        if (!isPreDeployment) {
          console.log('Edit mode: Files should now appear in Knowledge Base');

          // Add a second refresh with a longer delay as a backup
          setTimeout(() => {
            console.log('Additional document list refresh to ensure UI update');
            refetchDocuments();

            // Create temporary files in the UI directly from the uploaded files
            // This ensures they appear even if the API response doesn't include them yet
            const tempFiles = fileList.map(file => ({
              id: Date.now() + Math.random(),
              filename: file.name,
              status: 'processing' as const,
              size: file.size,
              documentId: undefined
            }));

            // Add these temporary files to the UI
            setFiles(prev => {
              // Filter out any existing files with the same filename
              const filteredPrev = prev.filter(f =>
                !tempFiles.some(tempFile => tempFile.filename === f.filename)
              );
              return [...filteredPrev, ...tempFiles];
            });
          }, 1000);
        }
      } catch (err) {
        console.error('Error processing files:', err);
        // If there was an error, try to refresh the document list anyway
        if (!isPreDeployment) {
          console.log('Attempting to refresh document list after error');
          await refetchDocuments();
        }
      }
    }

    // Clear the input value so the same file can be uploaded again if needed
    event.target.value = '';
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

  // Add a useEffect to check for session ID on component mount
  useEffect(() => {
    try {
      // Check if we have a session ID
      const sessionId = localStorage.getItem('rag_chatbot_session_id');

      if (sessionId) {
        // Reduce logging frequency
        console.log(`Found session ID: ${sessionId}`);

        // If we're in post-deployment mode and have an app ID, check if we need to process files
        if (appId) {
          // Reduce logging frequency
          console.log(`App is deployed (ID: ${appId}). Checking for temporary files to process...`);

          // Call the API to check if there are any temporary files for this session
          const checkForTemporaryFiles = async () => {
            try {
              // For now, we'll just check if there are any files in the UI state
              if (inMemoryFiles.length > 0) {
                console.log(`Found ${inMemoryFiles.length} files to process`);
                uploadInMemoryFilesToServer();
              } else {
                // Reduce logging frequency
                console.log('No temporary files found to process');
              }
            } catch (err) {
              console.error('Error checking for temporary files:', err);
            }
          };

          // Only check once on mount, not on every render
          checkForTemporaryFiles();
        }
      }
    } catch (err) {
      console.warn('Error checking for session ID:', err);
    }
  }, [appId]); // Remove inMemoryFiles and uploadInMemoryFilesToServer from dependencies to prevent frequent re-runs

  // Add a useEffect to process files when appId and functions are available
  useEffect(() => {
    if (appId && inMemoryFiles.length > 0) {
      console.log(`Processing ${inMemoryFiles.length} temporary files for app ID ${appId}...`);
      uploadInMemoryFilesToServer();
    }
  }, [appId, inMemoryFiles.length]); // Only depend on inMemoryFiles.length, not the entire array

  // Add a useEffect to refresh documents when appId is available
  useEffect(() => {
    if (appId && refetchDocuments) {
      // Initial fetch when appId becomes available
      refetchDocuments();
    }
  }, [appId, refetchDocuments]);

  // Add a useEffect to periodically refresh the document list to update file status
  useEffect(() => {
    if (appId && refetchDocuments) {
      // Set up a periodic refresh every 5 seconds
      const intervalId = setInterval(() => {
        // Only refresh if there are files that might be processing and the page is visible
        if (files.some(file => file.status === 'processing') && document.visibilityState === 'visible') {
          // Only log once every few refreshes to reduce console spam
          if (Math.random() < 0.05) { // Reduced to ~5% chance to log
            console.log('Refreshing document list to update file status');
          }
          refetchDocuments();
        }
      }, 5000); // Check every 5 seconds as requested

      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    }
  }, [appId, refetchDocuments, files.length]); // Only depend on files.length, not the entire files array

  // Add a useEffect to clean up files that have been processed and are now in the documents list
  useEffect(() => {
    if (documents && documents.length > 0 && files && files.length > 0) {
      // Create a map of filenames to document info
      const filenameToDocInfo = new Map<string, { id: number, isProcessed: boolean, error: string | null }>();

      // Populate the map with document info
      documents.forEach(doc => {
        filenameToDocInfo.set(doc.filename, {
          id: doc.id,
          isProcessed: doc.is_processed,
          error: doc.processing_error
        });
      });

      // Filter out files that have a matching filename in the documents array and are not still uploading
      const filesToKeep = files.filter(file => {
        // Always keep files that are still uploading
        if (file.status === 'uploading') {
          return true;
        }

        // Check if there's a document with the same filename
        const docInfo = filenameToDocInfo.get(file.filename);

        // If there's no document with this filename, keep the file
        if (!docInfo) {
          return true;
        }

        // If the document is still processing (not processed and no error), keep the file
        if (!docInfo.isProcessed && !docInfo.error) {
          return true;
        }

        // If the document is processed or has an error, remove the file from the files array
        // as it will be shown in the documents list
        return false;
      });

      // If we filtered out any files, update the state
      if (filesToKeep.length < files.length) {
        console.log(`Removing ${files.length - filesToKeep.length} processed files that are now in the documents list`);
        setFiles(filesToKeep);
      }
    }
  }, [documents]); // Removed files from dependencies to prevent infinite loop

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

      {/* In-memory files (pre-deployment) - Only show in pre-deployment mode */}
      {isPreDeployment && inMemoryFiles.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1 }}>
            <Typography variant="subtitle1">Uploading Files</Typography>
          </Box>
          <Divider />
          <List>
            {inMemoryFiles.map((file, index) => (
              <React.Fragment key={file.id}>
                {index > 0 && <Divider />}
                <ListItem
                  secondaryAction={
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
                      {file.status === 'uploading' ? (
                        <CircularProgress size={24} />
                      ) : (
                        <StatusBadge
                          status={
                            file.status === 'success' ? 'success' :
                            file.status === 'error' ? 'error' :
                            file.status === 'processing' ? 'warning' :
                            'default'
                          }
                          label={
                            file.status === 'success' ? 'Uploaded' :
                            file.status === 'error' ? 'Failed' :
                            file.status === 'processing' ? 'Processing' :
                            'Pending'
                          }
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

          {/* Message for wizard mode when files are processing */}
          {inMemoryFiles.some(file => file.status === 'processing') && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                backgroundColor: 'info.light',
                color: 'info.contrastText',
                borderTop: 1,
                borderColor: 'divider'
              }}
            >
              <InfoIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                You can proceed to the next step while your files are being processed in the background.
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* We've removed the "Currently training" section as it's now merged with the Knowledge base */}

      {/* Knowledge base - showing all files (both processing and processed) */}
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
        ) : isLoadingDocuments && (!documents || documents.length === 0) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : isDocumentsError ? (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">
              Error loading documents. Please try refreshing.
            </Alert>
          </Box>
        ) : ((files && files.length > 0) || (documents && documents.length > 0)) ? (
          <List>
            {/* Create a map of filenames to determine which files to show */}
            {(() => {
              // Create a map to track which filenames are being processed
              const processingFiles = new Map<string, UploadedFile>();
              const failedOrSuccessFiles = new Map<string, DocumentResponse>();

              // First, add all processing files to the map
              if (files) {
                files.filter(file => file.status === 'uploading' || file.status === 'processing')
                  .forEach(file => {
                    processingFiles.set(file.filename, file);
                  });
              }

              // Then, add all documents to the map, but don't overwrite processing files
              if (documents) {
                documents.forEach(doc => {
                  // Only add the document if there's no processing file with the same name
                  if (!processingFiles.has(doc.filename)) {
                    failedOrSuccessFiles.set(doc.filename, doc);
                  }
                });
              }

              // Now render the processing files first
              const processingFileElements = Array.from(processingFiles.values()).map((file, index) => (
                <React.Fragment key={`file-${file.id}`}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center', minWidth: '120px' }}>
                        {file.status === 'uploading' ? (
                          <CircularProgress size={24} />
                        ) : (
                          <StatusBadge
                            status={file.status === 'processing' ? 'warning' : 'default'}
                            label={file.status === 'processing' ? 'Processing' : 'Pending'}
                            size="small"
                          />
                        )}

                        {/* In edit mode, only show delete button for files that are not processing */}
                        {(isPreDeployment || file.status !== 'processing') && (
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
                        )}
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={file.filename}
                      secondary={formatFileSize(file.size)}
                    />
                  </ListItem>
                </React.Fragment>
              ));

              // Then render the failed or success files
              const documentElements = Array.from(failedOrSuccessFiles.values()).map((doc, index) => (
                <React.Fragment key={`doc-${doc.id}`}>
                  {(index > 0 || processingFileElements.length > 0) && <Divider />}
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

                        {/* In edit mode, only show delete button for documents that are fully processed or have errors */}
                        {(isPreDeployment || doc.is_processed || doc.processing_error) && (
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
                        )}
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={doc.filename}
                      secondary={`${formatFileSize(doc.size_bytes)} • ${formatDate(doc.created_at)}`}
                    />
                  </ListItem>
                </React.Fragment>
              ));

              // Return all elements
              return [...processingFileElements, ...documentElements];
            })()}
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
