import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Paper,
  Tabs,
  Tab,
  Divider,
  IconButton,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  useMediaQuery,
  AppBar,
  Toolbar,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  DesktopWindows as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import deployedAppsApi, { DeployedAppDetail } from '../api/deployedApps';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasPermission } from '../utils/permissions';
import { JSONSchema7 } from 'json-schema';
import validator from '@rjsf/validator-ajv8';
import { replacePlaceholders } from '../utils/templateHelpers';
import DevicePreview from '../components/preview/DevicePreview';
import EnhancedConfigForm from '../components/config/EnhancedConfigForm';
import ApiKeySelector from '../components/common/ApiKeySelector';
import { showToast } from '../components/ui/Toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  // New prop for side-by-side mode
  sideBySide?: boolean;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, sideBySide = false, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={!sideBySide && value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{
        width: '100%',
        display: sideBySide ? 'block' : (value === index ? 'block' : 'none'),
        height: '100%'
      }}
    >
      {(sideBySide || value === index) && (
        <Box sx={{
          p: { xs: 2, md: 3 },
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'auto',
          // Add some space at the bottom for better scrolling experience
          pb: { xs: 4, md: 6 }
        }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DeployedAppView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Check if screen is desktop size (md and up)
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  // Initialize tab value from localStorage if available, otherwise default to 0
  const [tabValue, setTabValue] = useState(() => {
    if (slug) {
      const savedTabValue = localStorage.getItem(`rag_app_${slug}_tab_value`);
      return savedTabValue ? parseInt(savedTabValue, 10) : 0;
    }
    return 0;
  });
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customUiSchema, setCustomUiSchema] = useState<any>(null);
  const [editingSections, setEditingSections] = useState<string[]>([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [appSettings, setAppSettings] = useState({
    name: '',
    is_active: true,
    api_key: ''
  });
  const [isEditingAppSettings, setIsEditingAppSettings] = useState(false);

  // Check if user has permission to configure apps
  const canConfigureApps = user && hasPermission(user.permissions, Permission.CONFIGURE_APPS);

  // Fetch deployed app details
  const { data: app, isLoading, error, refetch } = useQuery({
    queryKey: ['deployed-app', slug],
    queryFn: () => deployedAppsApi.getDeployedApp(slug || ''),
    enabled: !!slug,
  });

  // Update app mutation
  const updateMutation = useMutation({
    mutationFn: (data: { slug: string; updates: any }) =>
      deployedAppsApi.updateDeployedApp(data.slug, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployed-app', slug] });
      setIsEditing(false);
      setEditingSections([]);
    },
  });

  // Delete app mutation
  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deployedAppsApi.deleteDeployedApp(slug),
    onSuccess: () => {
      showToast(`App "${app?.name}" has been deleted`, 'success');
      navigate('/my-apps');
    },
    onError: (error) => {
      showToast(`Failed to delete app: ${(error as Error).message}`, 'error');
      setIsDeleting(false);
    },
  });

  // Set initial form data when app data is loaded
  useEffect(() => {
    if (app) {
      setFormData(app.configuration || {});

      // Initialize app settings
      setAppSettings({
        name: app.name,
        is_active: app.is_active,
        api_key: app.configuration?.api_key || ''
      });

      // Check if this is a RAG chatbot template and create a custom UI schema
      if (app.template.slug === 'rag-chatbot' && app.template.template_config?.uiSchema) {
        // Create a deep copy of the original UI schema
        const originalUiSchema = JSON.parse(JSON.stringify(app.template.template_config.uiSchema));

        // Enable all sections that might have been disabled in the wizard
        const sectionsToEnable = ['documents', 'quick_actions', 'ai_settings', 'styling'];

        sectionsToEnable.forEach(section => {
          if (originalUiSchema[section]) {
            // Enable the section
            originalUiSchema[section]['ui:disabled'] = false;

            // For documents section, also enable the file upload widget
            if (section === 'documents' && originalUiSchema.documents.file_upload) {
              originalUiSchema.documents.file_upload['ui:disabled'] = false;
              originalUiSchema.documents.file_upload['ui:help'] = 'Upload files in supported formats to enable document-based answers';
            }
          }
        });

        setCustomUiSchema(originalUiSchema);
        console.log('Created custom UI schema for RAG app:', originalUiSchema);

        // Ensure the documents section has the correct title "Knowledge Base"
        if (app.template.template_config?.schema?.properties?.documents) {
          const schemaConfig = JSON.parse(JSON.stringify(app.template.template_config.schema));
          if (schemaConfig.properties.documents.title !== 'Knowledge Base') {
            schemaConfig.properties.documents.title = 'Knowledge Base';
            app.template.template_config.schema = schemaConfig;
          }
        }
      } else {
        // For other templates, use the original UI schema
        setCustomUiSchema(app.template.template_config?.uiSchema || {});
      }
    }
  }, [app]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // Save the tab value to localStorage
    if (slug) {
      localStorage.setItem(`rag_app_${slug}_tab_value`, newValue.toString());
    }
  };

  // Handle form data change
  const handleFormChange = ({ formData }: { formData: any }) => {
    setFormData(formData);
  };

  // Handle save changes for all sections
  const handleSaveChanges = () => {
    if (!app) return;

    updateMutation.mutate({
      slug: app.slug,
      updates: {
        configuration: formData,
        custom_code: app.template.template_code,
      },
    });
  };

  // Handle edit for a specific section
  const handleSectionEdit = (sectionKey: string) => {
    setEditingSections([...editingSections, sectionKey]);
  };

  // Handle save for a specific section
  const handleSectionSave = (sectionKey: string) => {
    if (!app) return;

    // Remove the section from editing sections
    setEditingSections(editingSections.filter(key => key !== sectionKey));

    // Save the changes
    updateMutation.mutate({
      slug: app.slug,
      updates: {
        configuration: formData,
        custom_code: app.template.template_code,
      },
    }, {
      onSuccess: () => {
        // Show success toast
        showToast(`${getSectionTitle(sectionKey)} settings saved successfully`, 'success');
      }
    });
  };

  // Handle app settings input changes
  const handleAppSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setAppSettings((prev) => ({
      ...prev,
      [name]: name === 'is_active' ? checked : value,
    }));
  };

  // Handle app settings edit toggle
  const toggleAppSettingsEdit = () => {
    setIsEditingAppSettings(!isEditingAppSettings);

    // If we're canceling the edit, reset to original values
    if (isEditingAppSettings && app) {
      setAppSettings({
        name: app.name,
        is_active: app.is_active,
        api_key: app.configuration?.api_key || ''
      });
    }
  };

  // Handle app settings save
  const saveAppSettings = () => {
    if (!app) return;

    // Validate API key
    if (!appSettings.api_key.trim()) {
      showToast('Please select a valid API key', 'error');
      return;
    }

    // Create a copy of the current configuration with the updated API key
    const updatedConfiguration = {
      ...app.configuration,
      api_key: appSettings.api_key
    };

    // Log the update for debugging
    console.log('Updating app settings with API key:', appSettings.api_key);

    updateMutation.mutate({
      slug: app.slug,
      updates: {
        name: appSettings.name,
        is_active: appSettings.is_active,
        configuration: updatedConfiguration,
      },
    }, {
      onSuccess: () => {
        setIsEditingAppSettings(false);
        showToast('App settings saved successfully', 'success');

        // Force a refresh of the form data to ensure the API key is updated
        setFormData({
          ...formData,
          api_key: appSettings.api_key
        });
      },
      onError: (error) => {
        showToast(`Failed to save settings: ${(error as Error).message}`, 'error');
      }
    });
  };

  // Helper function to get section title from key
  const getSectionTitle = (sectionKey: string): string => {
    if (!app?.template?.template_config?.schema?.properties) return 'Section';

    const property = app.template.template_config.schema.properties[sectionKey];
    if (property && typeof property === 'object' && 'title' in property) {
      return property.title as string;
    }

    return sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/_/g, ' ');
  };

  // Open delete confirmation dialog
  const handleOpenDeleteConfirm = () => {
    setDeleteConfirmOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
  };

  // Handle delete app
  const handleDeleteApp = () => {
    if (!app) return;
    setIsDeleting(true);
    setDeleteConfirmOpen(false);
    deleteMutation.mutate(app.slug);
  };

  // Preview component
  const PreviewComponent = () => {
    const [previewHtml, setPreviewHtml] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    useEffect(() => {
      // Create a preview by replacing placeholders in the template code
      if (app) {
        // Use the helper function to replace all placeholders, including nested ones
        const preview = replacePlaceholders(app.template.template_code, formData);
        setPreviewHtml(preview);
      }
    }, [formData, app]);

    const handleFullscreen = () => {
      setIsFullscreen(true);
    };

    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Hidden button for external control */}
        <button
          id="preview-fullscreen-button"
          onClick={handleFullscreen}
          style={{ display: 'none' }}
        />

        <DevicePreview
          html={previewHtml}
          hideDeviceOptions={true} // Always hide device options in regular view
          hideFullscreenButton={true} // Hide the internal fullscreen button
          externalFullscreenControl={true}
          onFullscreen={handleFullscreen}
        />

        {/* Fullscreen Dialog */}
        <Dialog
          fullScreen
          open={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          sx={{
            '& .MuiDialog-paper': {
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.95)'
            }
          }}
        >
          <AppBar position="static" color="default" elevation={0}>
            <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="h6" component="div">
                Preview
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ToggleButtonGroup
                  value={device}
                  exclusive
                  onChange={(e, newDevice) => {
                    if (newDevice !== null) {
                      setDevice(newDevice);
                    }
                  }}
                  aria-label="device preview"
                  size="small"
                >
                  <Tooltip title="Desktop View">
                    <ToggleButton value="desktop" aria-label="desktop view">
                      <DesktopIcon />
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip title="Tablet View">
                    <ToggleButton value="tablet" aria-label="tablet view">
                      <TabletIcon />
                    </ToggleButton>
                  </Tooltip>
                  <Tooltip title="Mobile View">
                    <ToggleButton value="mobile" aria-label="mobile view">
                      <MobileIcon />
                    </ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>
                <IconButton
                  color="inherit"
                  onClick={() => setIsFullscreen(false)}
                  aria-label="close fullscreen"
                  sx={{ ml: 2 }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>
          <DialogContent sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
            height: 'calc(100vh - 64px)' // Subtract the AppBar height
          }}>
            <Paper
              elevation={0}
              sx={{
                width: device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '1000px',
                height: device === 'mobile' ? '667px' : device === 'tablet' ? '1024px' : '800px',
                maxHeight: '80vh', // Limit height on smaller screens
                maxWidth: '100%', // Prevent overflow
                borderRadius: device === 'mobile' ? '20px' : device === 'tablet' ? '12px' : '4px',
                border: device === 'mobile'
                  ? `12px solid ${theme.palette.mode === 'dark' ? '#333' : '#ddd'}`
                  : device === 'tablet'
                    ? `8px solid ${theme.palette.mode === 'dark' ? '#333' : '#ddd'}`
                    : `1px solid ${theme.palette.divider}`,
                boxShadow: device !== 'desktop' ? theme.shadows[4] : 'none',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <iframe
                srcDoc={previewHtml}
                title="App Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </Paper>
          </DialogContent>
        </Dialog>
      </Box>
    );
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Error loading app details. Please check your connection and try again.
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/my-apps')}>
          Back to My Apps
        </Button>
      </Box>
    );
  }

  if (!app) {
    return (
      <Box p={3}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          App not found.
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/my-apps')}>
          Back to My Apps
        </Button>
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ width: '100%', minWidth: '100%', height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => navigate('/my-apps')}
            sx={{ mr: 1 }}
            aria-label="back"
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            {app.name}
          </Typography>
          <Chip
            label={app.is_active ? 'Active' : 'Inactive'}
            color={app.is_active ? 'success' : 'default'}
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>
        <Box>
          {canConfigureApps && (
            <>
              {/* Edit button removed - using section-specific edit buttons instead */}
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleOpenDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <CircularProgress size={24} /> : 'Delete'}
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Template:</strong> {app.template.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Deployed on:</strong> {formatDate(app.created_at)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Deployed by:</strong> {app.deployed_by.email}
        </Typography>
        {app.team && (
          <Typography variant="body2" color="text.secondary">
            <strong>Team:</strong> {app.team.name}
          </Typography>
        )}
        {app.public_url && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Public URL:</strong>{' '}
              <a href={app.public_url} target="_blank" rel="noopener noreferrer">
                {app.public_url}
              </a>
            </Typography>
            <Button
              size="small"
              variant="outlined"
              sx={{ ml: 2 }}
              onClick={() => {
                navigator.clipboard.writeText(app.public_url || '');
                // Show a toast or some feedback
                alert('Public URL copied to clipboard!');
              }}
            >
              Copy URL
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ ml: 1 }}
              onClick={() => window.open(app.public_url || '', '_blank')}
            >
              Open
            </Button>
          </Box>
        )}
      </Paper>

      {updateMutation.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(updateMutation.error as Error).message}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', mt: 3, overflow: 'hidden' }}>
        {/* Only show tabs on mobile */}
        {!isDesktop && (
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="app tabs"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              bgcolor: theme.palette.background.paper,
            }}
          >
            <Tab icon={<SettingsIcon />} label="Configuration" id="tab-0" aria-controls="tabpanel-0" />
            <Tab icon={<PreviewIcon />} label="Preview" id="tab-1" aria-controls="tabpanel-1" />
          </Tabs>
        )}

        {/* Side-by-side layout on desktop, tab-based on mobile */}
        <Box sx={{
          flexGrow: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: isDesktop ? 'row' : 'column',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Configuration Panel */}
          <Box sx={{
            width: isDesktop ? '50%' : '100%',
            height: isDesktop ? '100%' : 'auto',
            borderRight: isDesktop ? `1px solid ${theme.palette.divider}` : 'none',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {isDesktop && (
              <Box sx={{
                py: 1.5,
                px: 2,
                height: 48, // Fixed height to ensure consistency
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center'
              }}>
                <SettingsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Configuration</Typography>
              </Box>
            )}
            <TabPanel value={tabValue} index={0} sideBySide={isDesktop}>
              {/* App Settings Section */}
              <Paper sx={{ p: 3, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">App Settings</Typography>
                  {canConfigureApps && (
                    <Button
                      variant="outlined"
                      color={isEditingAppSettings ? "primary" : "inherit"}
                      onClick={toggleAppSettingsEdit}
                    >
                      {isEditingAppSettings ? "Cancel" : "Edit"}
                    </Button>
                  )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                {isEditingAppSettings ? (
                  <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      label="App Name"
                      name="name"
                      value={appSettings.name}
                      onChange={handleAppSettingsChange}
                      fullWidth
                      required
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={appSettings.is_active}
                          onChange={handleAppSettingsChange}
                          name="is_active"
                          color="primary"
                        />
                      }
                      label="Active"
                    />

                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>API Key</Typography>
                      <ApiKeySelector
                        value={appSettings.api_key}
                        onChange={(value) => setAppSettings(prev => ({ ...prev, api_key: value }))}
                        helperText="Select an API key for this application"
                        fullWidth
                      />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={saveAppSettings}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography><strong>App Name:</strong> {app.name}</Typography>
                    <Typography>
                      <strong>Status:</strong> {app.is_active ? 'Active' : 'Inactive'}
                    </Typography>
                    <Typography>
                      <strong>API Key:</strong> {app.configuration?.api_key ?
                        `${app.configuration.api_key.slice(0, 4)}•••••${app.configuration.api_key.slice(-4)}` :
                        'Not set'}
                    </Typography>
                  </Box>
                )}
              </Paper>

              {/* App Configuration */}
              {app.template.template_config?.schema && (
                <EnhancedConfigForm
                  schema={app.template.template_config.schema as JSONSchema7}
                  formData={formData}
                  onChange={handleFormChange}
                  disabled={false} // Always allow section editing
                  uiSchema={customUiSchema || app.template.template_config.uiSchema || {}}
                  onDeploy={handleSaveChanges}
                  onSectionEdit={handleSectionEdit}
                  onSectionSave={handleSectionSave}
                  editingSections={editingSections}
                />
              )}
            </TabPanel>
          </Box>

          {/* Preview Panel */}
          <Box sx={{
            width: isDesktop ? '50%' : '100%',
            height: isDesktop ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {isDesktop && (
              <Box sx={{
                py: 1.5,
                px: 2,
                height: 48, // Fixed height to match the Configuration panel
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PreviewIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Preview</Typography>
                </Box>
                <Tooltip title="Fullscreen Mode">
                  <IconButton
                    onClick={() => {
                      // Find the PreviewComponent's handleFullscreen function and call it
                      const previewComponent = document.getElementById('preview-fullscreen-button');
                      if (previewComponent) {
                        previewComponent.click();
                      }
                    }}
                    size="small"
                    aria-label="fullscreen mode"
                    sx={{ p: 0.5 }} // Reduced padding on the icon button
                  >
                    <FullscreenIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
            <TabPanel value={tabValue} index={1} sideBySide={isDesktop}>
              <PreviewComponent />
            </TabPanel>
          </Box>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCloseDeleteConfirm}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: '0.375rem',
            boxShadow: (theme) => theme.palette.mode === 'light'
              ? '0 8px 12px -3px rgba(0,0,0,0.1), 0 3px 5px -2px rgba(0,0,0,0.05)'
              : '0 8px 12px -3px rgba(255,255,255,0.05), 0 3px 5px -2px rgba(255,255,255,0.02)',
            overflow: 'hidden',
            maxWidth: '500px',
            width: '100%'
          }
        }}
      >
        <DialogTitle
          id="delete-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 2,
            px: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            color: 'error.main'
          }}
        >
          <DeleteIcon color="error" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            Confirm Deletion
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: 3 }}>
          <DialogContentText id="delete-dialog-description" sx={{ color: 'text.primary' }}>
            Are you sure you want to delete <strong>{app?.name}</strong>? This action cannot be undone.
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: '0.25rem',
                border: '1px solid',
                borderColor: 'error.main'
              }}
            >
              <Typography variant="body2" fontWeight="medium" color="error.main">
                Warning: This will permanently delete:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>All app configuration</li>
                <li>All uploaded documents</li>
              </ul>
              <Typography variant="body2">
                Users will no longer be able to access this app.
              </Typography>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={handleCloseDeleteConfirm}
            color="primary"
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '0.25rem'
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteApp}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: '0.25rem'
            }}
          >
            {deleteMutation.isPending ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeployedAppView;
