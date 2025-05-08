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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  OpenInNew as OpenInNewIcon,
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3, width: '100%', height: '100%', boxSizing: 'border-box' }}>
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
  const [tabValue, setTabValue] = useState(0);
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
  const handleDeploy = () => {
    if (!template || !canDeployApps || !validateForm()) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      // Include the API key in the configuration
      const updatedFormData = {
        ...formData,
        api_key: apiKey // This matches the {{api_key}} placeholder in the templates
      };

      const deployData: DeployedAppCreate = {
        template_id: template.id,
        name: deploymentData.name,
        slug: deploymentData.slug,
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

    useEffect(() => {
      // Create a preview by replacing placeholders in the template code
      if (template) {
        // Include the API key in the configuration for preview
        const previewConfig = {
          ...formData,
          api_key: apiKey || 'preview-api-key' // Use the current API key or a placeholder
        };

        // Use the helper function to replace all placeholders, including nested ones
        const preview = replacePlaceholders(template.template_code, previewConfig);
        setPreviewHtml(preview);
      }
    }, [formData, template, apiKey]);

    return (
      <DevicePreview html={previewHtml} title="App Preview" />
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
    <Box p={3} sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton
          onClick={() => navigate('/app-library')}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          Deploy: {template.name}
        </Typography>
      </Box>

      {deployError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {deployError}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Template Information
        </Typography>
        <Typography variant="body2" paragraph>
          {template.description || 'No description available.'}
        </Typography>
        {template.tags && template.tags.length > 0 && (
          <Typography variant="body2">
            <strong>Tags:</strong> {template.tags.join(', ')}
          </Typography>
        )}
      </Paper>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="app configuration tabs">
            <Tab icon={<SettingsIcon />} label="Configuration" id="tab-0" aria-controls="tabpanel-0" />
            <Tab icon={<PreviewIcon />} label="Preview" id="tab-1" aria-controls="tabpanel-1" />
          </Tabs>
        </Box>

        <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
          <TabPanel value={tabValue} index={0}>
            {template.template_config?.schema && (
              <EnhancedConfigForm
                schema={template.template_config.schema as JSONSchema7}
                formData={formData}
                onChange={handleFormChange}
                uiSchema={template.template_config.uiSchema}
                onDeploy={handleDeploy}
                deploymentSettingsComponent={<DeploymentSettingsComponent />}
                isDeploying={isDeploying}
              />
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <PreviewComponent />
          </TabPanel>
        </Box>
      </Box>

      {/* Success Modal */}
      <Dialog
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
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
            You can manage your app, upload documents, and make changes in the "My Apps" section.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => navigate(`/my-apps/${deployedAppData?.slug}`)}
            color="primary"
          >
            Go to App Settings
          </Button>
          <Button
            onClick={() => window.open(deployedAppData?.public_url, '_blank')}
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
