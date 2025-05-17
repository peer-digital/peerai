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
  IconButton,
  TextField,
  Grid,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
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
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  OpenInNew as OpenInNewIcon,
  Fullscreen as FullscreenIcon,
  Close as CloseIcon,
  DesktopWindows as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Tablet as TabletIcon,
} from '@mui/icons-material';
import { useQuery, useMutation } from '@tanstack/react-query';
import appTemplatesApi, { AppTemplate } from '../api/appTemplates';
import deployedAppsApi, { DeployedAppCreate } from '../api/deployedApps';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasPermission } from '../utils/permissions';
import { JSONSchema7 } from 'json-schema';
import { replacePlaceholders } from '../utils/templateHelpers';
import DevicePreview from '../components/preview/DevicePreview';
import EnhancedConfigForm from '../components/config/EnhancedConfigForm';
import ApiKeySelector from '../components/common/ApiKeySelector';
import { showToast } from '../components/ui/Toast';
import { useBreadcrumbs } from '../contexts/BreadcrumbContext';

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

const DeployAppView: React.FC = () => {
  const { templateSlug } = useParams<{ templateSlug: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Check if screen is desktop size (md and up)
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  // Initialize tab value from localStorage if available, otherwise default to 0
  const [tabValue, setTabValue] = useState(() => {
    if (templateSlug) {
      const savedTabValue = localStorage.getItem(`rag_app_${templateSlug}_tab_value`);
      return savedTabValue ? parseInt(savedTabValue, 10) : 0;
    }
    return 0;
  });
  const [formData, setFormData] = useState<any>({});
  const [deploymentData, setDeploymentData] = useState({
    name: '',
    slug: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [deployError, setDeployError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [deployedAppData, setDeployedAppData] = useState<{slug: string, name: string, public_url: string} | null>(null);

  // Check if user has permission to deploy apps
  const canDeployApps = user && hasPermission(user.permissions, Permission.DEPLOY_APPS);

  // Fetch template details
  const { data: template, isLoading, error } = useQuery<AppTemplate>({
    queryKey: ['app-template', templateSlug],
    queryFn: () => appTemplatesApi.getTemplate(templateSlug || ''),
    enabled: !!templateSlug,
  });

  // Set initial breadcrumbs
  const { setBreadcrumbs } = useBreadcrumbs();

  // Update breadcrumbs when template changes
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Apps', href: '/my-apps' },
      { label: 'App Library', href: '/app-library' },
      { label: template ? `Deploy: ${template.name}` : 'Deploy App' }
    ]);
  }, [template, setBreadcrumbs]);

  // Function to process temporary files after deployment
  const processTemporaryFiles = async (appId: number) => {
    try {
      // Get the session ID from localStorage
      const sessionId = localStorage.getItem('rag_chatbot_session_id');
      if (!sessionId) {
        console.log('No session ID found, no temporary files to process');
        return;
      }

      console.log(`Processing temporary files for app ID ${appId} with session ID ${sessionId}`);

      // Call the API to process temporary files
      const token = localStorage.getItem('access_token');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/v1/temp-documents/process/${appId}?session_id=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If we get a 404, it means the files have already been processed
        if (response.status === 404) {
          console.log('No temporary files found. They may have already been processed.');
          return;
        }

        console.error(`Failed to process temporary files: ${response.status}`);
        return;
      }

      const processedDocuments = await response.json();
      console.log(`Successfully processed ${processedDocuments.length} temporary documents`);

      // Clear the session ID to prevent duplicate processing
      localStorage.removeItem('rag_chatbot_session_id');
    } catch (err) {
      console.error('Error processing temporary files:', err);
    }
  };

  // Deploy app mutation
  const deployMutation = useMutation({
    mutationFn: (app: DeployedAppCreate) => deployedAppsApi.deployApp(app),
    onSuccess: (data) => {
      // Show success modal with link to the deployed app
      setIsDeploying(false);
      setDeployedAppData({
        slug: data.slug,
        name: data.name,
        public_url: data.public_url || `/apps/${data.slug}`
      });

      // Process any temporary files that were uploaded before deployment
      if (data.id) {
        processTemporaryFiles(data.id);
      }

      // Reset wizard page tracking in localStorage after successful deployment
      if (templateSlug) {
        // Clear all wizard-related localStorage items for this template
        localStorage.removeItem(`rag_app_${templateSlug}_tab_value`);
        localStorage.removeItem(`rag_app_${templateSlug}_active_section`);
        localStorage.removeItem(`rag_app_${templateSlug}_show_completion`);
        localStorage.removeItem(`rag_app_${templateSlug}_show_deployment`);
        console.log('Wizard page tracking reset after successful app deployment');
      }

      setSuccessModalOpen(true);
      showToast(`App "${data.name}" successfully deployed!`, 'success');
    },
    onError: (error) => {
      setDeployError((error as Error).message || 'Failed to deploy app');
      setIsDeploying(false);
    },
  });

  // Set initial form data when template data is loaded
  useEffect(() => {
    if (template) {
      setFormData(template.template_config.default_values || {});
      setDeploymentData({
        name: template.name,
        slug: `${template.slug}-${Math.floor(Math.random() * 1000)}`,
      });
    }
  }, [template]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);

    // Save the tab value to localStorage
    if (templateSlug) {
      localStorage.setItem(`rag_app_${templateSlug}_tab_value`, newValue.toString());
    }
  };

  // Handle form data change
  const handleFormChange = ({ formData }: { formData: any }) => {
    setFormData(formData);
  };

  // Handle deployment data change
  const handleDeploymentDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeploymentData({
      ...deploymentData,
      [name]: value,
    });

    // Validate
    if (name === 'name' && !value.trim()) {
      setFormErrors({ ...formErrors, name: 'App name is required' });
    } else if (name === 'slug') {
      if (!value.trim()) {
        setFormErrors({ ...formErrors, slug: 'App slug is required' });
      } else if (!/^[a-z0-9-]+$/.test(value)) {
        setFormErrors({
          ...formErrors,
          slug: 'Slug can only contain lowercase letters, numbers, and hyphens',
        });
      } else {
        const newErrors = { ...formErrors };
        delete newErrors.slug;
        setFormErrors(newErrors);
      }
    } else {
      const newErrors = { ...formErrors };
      delete newErrors[name];
      setFormErrors(newErrors);
    }
  };

  // Handle API key change
  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
  };

  // Validate form before deployment
  const validateForm = () => {
    const errors: Record<string, string> = {};

    // For RAG chatbot template, only validate API key
    if (templateSlug === 'rag-chatbot') {
      if (!apiKey.trim()) {
        errors.apiKey = 'API key is required for RAG chatbot deployment';
        setFormErrors(errors);
        return false;
      }
      return true;
    }

    // For other templates, validate all fields
    if (!deploymentData.name.trim()) {
      errors.name = 'App name is required';
    }

    if (!deploymentData.slug.trim()) {
      errors.slug = 'App slug is required';
    } else if (!/^[a-z0-9-]+$/.test(deploymentData.slug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (!apiKey.trim()) {
      errors.apiKey = 'API key is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle deploy
  const handleDeploy = async () => {
    if (!template || !canDeployApps || !validateForm()) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      // For RAG chatbot template, use default values if not provided
      let appName = deploymentData.name;
      let appSlug = deploymentData.slug;
      let appApiKey = apiKey;

      // If this is the RAG chatbot template and values are missing, use defaults
      if (templateSlug === 'rag-chatbot') {
        // Use default name if not provided
        if (!appName.trim()) {
          appName = `RAG Chatbot ${Math.floor(Math.random() * 1000)}`;
        }

        // Use default slug if not provided or invalid
        if (!appSlug.trim() || !/^[a-z0-9-]+$/.test(appSlug)) {
          appSlug = `rag-chatbot-${Math.floor(Math.random() * 10000)}`;
        }

        // Use default API key if not provided (this should be a valid API key from your system)
        if (!appApiKey.trim()) {
          // Try to get a default API key from localStorage or use a placeholder
          const savedApiKeys = localStorage.getItem('saved_api_keys');
          if (savedApiKeys) {
            try {
              const keys = JSON.parse(savedApiKeys);
              if (keys.length > 0) {
                appApiKey = keys[0].key;
              } else {
                // If no saved keys, use a placeholder (this will likely cause issues in production)
                appApiKey = '';
              }
            } catch (e) {
              appApiKey = '';
            }
          } else {
            appApiKey = '';
          }
        }
      }

      // Ensure the API key is valid and properly formatted
      if (!appApiKey || !appApiKey.startsWith('pk_')) {
        console.warn('Invalid API key format. API key should start with pk_');

        // Try to get a valid API key from localStorage as a fallback
        const savedApiKeys = localStorage.getItem('saved_api_keys');
        if (savedApiKeys) {
          try {
            const keys = JSON.parse(savedApiKeys);
            if (keys.length > 0 && keys[0].key && keys[0].key.startsWith('pk_')) {
              console.log('Using API key from localStorage:', keys[0].key.slice(0, 4) + '...');
              appApiKey = keys[0].key;
            }
          } catch (e) {
            console.error('Error parsing saved API keys:', e);
          }
        }

        // If we still don't have a valid key, use a test key
        if (!appApiKey || !appApiKey.startsWith('pk_')) {
          console.warn('Using test_key_123 as fallback');
          appApiKey = 'test_key_123'; // This is accepted by the backend for testing
        }
      }

      // Include the API key in the configuration
      const updatedFormData = {
        ...formData,
        api_key: appApiKey // This matches the {{api_key}} placeholder in the templates
      };

      const deployData: DeployedAppCreate = {
        template_id: template.id,
        name: appName,
        slug: appSlug,
        configuration: updatedFormData,
        custom_code: template.template_code,
      };

      deployMutation.mutate(deployData);
    } catch (error) {
      setDeployError((error as Error).message || 'Failed to deploy app');
      setIsDeploying(false);
    }
  };

  // Preview component
  const PreviewComponent = () => {
    const [previewHtml, setPreviewHtml] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    useEffect(() => {
      // Create a preview by replacing placeholders in the template code
      if (template) {
        // Ensure we have a valid API key for preview
        let previewApiKey = apiKey;

        // If the API key is missing or invalid, try to get one from localStorage
        if (!previewApiKey || !previewApiKey.startsWith('pk_')) {
          console.warn('Invalid API key for preview. Trying to get one from localStorage.');

          const savedApiKeys = localStorage.getItem('saved_api_keys');
          if (savedApiKeys) {
            try {
              const keys = JSON.parse(savedApiKeys);
              if (keys.length > 0 && keys[0].key && keys[0].key.startsWith('pk_')) {
                console.log('Using API key from localStorage for preview:', keys[0].key.slice(0, 4) + '...');
                previewApiKey = keys[0].key;
              }
            } catch (e) {
              console.error('Error parsing saved API keys:', e);
            }
          }

          // If we still don't have a valid key, use a test key
          if (!previewApiKey || !previewApiKey.startsWith('pk_')) {
            console.warn('Using test_key_123 as fallback for preview');
            previewApiKey = 'test_key_123'; // This is accepted by the backend for testing
          }
        }

        // Include the API key in the configuration for preview
        const previewConfig = {
          ...formData,
          api_key: previewApiKey
        };

        // Use the helper function to replace all placeholders, including nested ones
        const preview = replacePlaceholders(template.template_code, previewConfig);
        setPreviewHtml(preview);
      }
    }, [formData, template, apiKey]);

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

  // Deployment settings component
  const DeploymentSettingsComponent = () => {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="App Name"
            name="name"
            value={deploymentData.name}
            onChange={handleDeploymentDataChange}
            fullWidth
            required
            error={!!formErrors.name}
            helperText={formErrors.name}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="App Slug"
            name="slug"
            value={deploymentData.slug}
            onChange={handleDeploymentDataChange}
            fullWidth
            required
            error={!!formErrors.slug}
            helperText={
              formErrors.slug || 'Use lowercase letters, numbers, and hyphens only'
            }
          />
        </Grid>
        <Grid item xs={12}>
          <ApiKeySelector
            value={apiKey}
            onChange={handleApiKeyChange}
            error={!!formErrors.apiKey}
            helperText={formErrors.apiKey || 'Your API key for the AI service'}
            required
            fullWidth
            size="small"
          />
        </Grid>
      </Grid>
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !template) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Error loading template details. Please check your connection and try again.
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app-library')}>
          Back to App Library
        </Button>
      </Box>
    );
  }

  if (!canDeployApps) {
    return (
      <Box p={3}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          You don't have permission to deploy apps.
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app-library')}>
          Back to App Library
        </Button>
      </Box>
    );
  }

  return (
    <Box p={0} sx={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden' // Prevent double scrollbars
    }}>
      {deployError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {deployError}
        </Alert>
      )}



      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Only show tabs on mobile */}
        {!isDesktop && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="app configuration tabs">
              <Tab icon={<SettingsIcon />} label="Configuration" id="tab-0" aria-controls="tabpanel-0" />
              <Tab icon={<PreviewIcon />} label="Preview" id="tab-1" aria-controls="tabpanel-1" />
            </Tabs>
          </Box>
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
              {template.template_config?.schema && (
                <EnhancedConfigForm
                  schema={template.template_config.schema as JSONSchema7}
                  formData={formData}
                  onChange={handleFormChange}
                  uiSchema={template.template_config.uiSchema}
                  onDeploy={handleDeploy}
                  deploymentSettingsComponent={<DeploymentSettingsComponent />}
                  isDeploying={isDeploying}
                  wizardMode={true}
                  apiKey={apiKey}
                  onApiKeyChange={setApiKey}
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

      {/* Success Modal */}
      <Dialog
        open={successModalOpen}
        onClose={() => {
          setSuccessModalOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
          App Successfully Deployed
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Your RAG chatbot "{deployedAppData?.name}" has been successfully deployed and is now live!
          </Typography>
          <Typography variant="body2" paragraph>
            You can access your app at:
          </Typography>
          <Box sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Link
              href={deployedAppData?.public_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ wordBreak: 'break-all' }}
            >
              {deployedAppData?.public_url}
            </Link>
            <IconButton
              color="primary"
              onClick={() => window.open(deployedAppData?.public_url, '_blank')}
              size="small"
            >
              <OpenInNewIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>
            You can manage your app, upload documents, and make changes in the "Apps" section.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              // Navigate to app settings
              navigate(`/my-apps/${deployedAppData?.slug}`);
            }}
            color="primary"
          >
            Go to App Settings
          </Button>
          <Button
            onClick={() => {
              // Open app in new tab
              window.open(deployedAppData?.public_url, '_blank');
            }}
            variant="contained"
            color="primary"
            endIcon={<OpenInNewIcon />}
          >
            Open App
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeployAppView;
