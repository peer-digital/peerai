import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  useTheme,
  Tooltip,
  Link,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
  Apps as AppsIcon,
  Code as CodeIcon,
  Key as KeyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../components/ui';
import appTemplatesApi, { AppTemplate } from '../api/appTemplates';
// Using App Templates only
import deployedAppsApi, { DeployedAppCreate } from '../api/deployedApps';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasPermission } from '../utils/permissions';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import ApiKeySelector from '../components/common/ApiKeySelector';
import { JSONSchema7 } from 'json-schema';
import validator from '@rjsf/validator-ajv8';
import { replacePlaceholders } from '../utils/templateHelpers';
import api from '../api/config';
import DevicePreview from '../components/preview/DevicePreview';
import EnhancedConfigForm from '../components/config/EnhancedConfigForm';

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
      style={{
        height: '100%',
        overflow: 'auto',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {value === index && (
        <Box sx={{ p: 3, height: 'auto', minHeight: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AppLibrary: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);
  // App Store concept replaced with App Templates
  const [isDeployDialogOpen, setIsDeployDialogOpen] = useState(false);
  // Detail modal removed as App Store concept is replaced with App Templates
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [deploymentData, setDeploymentData] = useState({
    name: '',
    slug: '',
  });
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);

  // Check if user has permission to deploy apps
  const canDeployApps = user && hasPermission(user.permissions, Permission.DEPLOY_APPS);

  // Fetch templates
  const { data: templates, isLoading: isLoadingTemplates, error: templateError, refetch: refetchTemplates } = useQuery({
    queryKey: ['app-templates'],
    queryFn: appTemplatesApi.getTemplates,
    retry: false // Don't retry on failure
  });

  // We'll use the ApiKeySelector component instead of fetching API keys directly

  // App Store concept replaced with App Templates

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle template selection
  const handleSelectTemplate = (template: AppTemplate) => {
    setSelectedTemplate(template);
    setFormData(template.template_config.default_values || {});
    setDeploymentData({
      name: template.name,
      slug: `${template.slug}-${Math.floor(Math.random() * 1000)}`,
    });
    setIsDeployDialogOpen(true);
    setShowTemplates(false);
  };

  // App Store concept replaced with App Templates

  // Handle tag selection
  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  // Extract all unique tags from templates
  const allTags = templates
    ? Array.from(
        new Set(
          templates.flatMap((template) => template.tags || [])
        )
      ).sort()
    : [];

  // Filter templates based on search query, selected tag, and active status
  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag =
      selectedTag === null || (template.tags && template.tags.includes(selectedTag));

    // Only show active templates
    const isActive = template.is_active;

    return matchesSearch && matchesTag && isActive;
  });

  // Handle form data change
  const handleFormChange = ({ formData }: { formData: any }) => {
    setFormData(formData);
  };

  // Handle deployment data change
  const handleDeploymentDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDeploymentData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!deploymentData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!deploymentData.slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(deploymentData.slug)) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (!apiKey) {
      errors.apiKey = 'API key is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(apiKey)) {
      errors.apiKey = 'Invalid API key format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle deploy
  const handleDeploy = async () => {
    if (!selectedTemplate || !validateForm()) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      // Make sure the API key is provided
      if (!apiKey) {
        throw new Error('API key is required.');
      }

      // Include the API key in the configuration
      const updatedFormData = {
        ...formData,
        api_key: apiKey // This matches the {{api_key}} placeholder in the templates
      };

      const deployData: DeployedAppCreate = {
        template_id: selectedTemplate.id,
        name: deploymentData.name,
        slug: deploymentData.slug,
        configuration: updatedFormData,
        custom_code: selectedTemplate.template_code,
      };

      await deployedAppsApi.deployApp(deployData);
      setIsDeployDialogOpen(false);
      navigate('/my-apps');
    } catch (error) {
      setDeployError((error as Error).message || 'Failed to deploy app');
    } finally {
      setIsDeploying(false);
    }
  };

  // Handle back to templates
  const handleBackToTemplates = () => {
    setShowTemplates(true);
  };

  // Preview component
  const PreviewComponent = () => {
    const [previewHtml, setPreviewHtml] = useState('');

    useEffect(() => {
      // Create a preview by replacing placeholders in the template code
      if (selectedTemplate) {
        // Include the API key in the configuration for preview
        const previewConfig = {
          ...formData,
          api_key: apiKey || 'preview-api-key' // Use the current API key or a placeholder
        };

        // Use the helper function to replace all placeholders, including nested ones
        const preview = replacePlaceholders(selectedTemplate.template_code, previewConfig);
        setPreviewHtml(preview);
      }
    }, [formData, selectedTemplate, apiKey]);

    return (
      <DevicePreview html={previewHtml} title="App Preview" />
    );
  };

  return (
    <Box p={3} sx={{ width: '100%', minWidth: '100%' }}>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          App Library
        </Typography>
      </Box>

      {/* Debug component removed */}

      {!showTemplates && (
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBackToTemplates}
          sx={{ mb: 3 }}
        >
          Back to Templates
        </Button>
      )}

      {/* We don't show global errors here since we handle them per section */}

      {showTemplates ? (
        <>
          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {allTags.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {allTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagClick(tag)}
                    color={selectedTag === tag ? 'primary' : 'default'}
                    variant={selectedTag === tag ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Typography variant="h5" sx={{ mb: 2, mt: 4 }}>
            App Templates
          </Typography>

          {isLoadingTemplates ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : templateError ? (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Unable to load app templates. You may not have the required permissions.
            </Alert>
          ) : filteredTemplates && filteredTemplates.length > 0 ? (
            <Grid container spacing={3}>
              {filteredTemplates.map((template) => (
                <Grid item xs={12} sm={6} md={4} key={template.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8],
                      },
                    }}>
                    <CardMedia
                      component="img"
                      height="140"
                      image={
                        theme.palette.mode === 'dark' && template.dark_icon_url
                          ? template.dark_icon_url
                          : template.icon_url || 'https://via.placeholder.com/300x150?text=App+Template'
                      }
                      alt={template.name}
                      sx={{ objectFit: 'contain', bgcolor: theme.palette.background.paper, p: 2 }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="div" noWrap>
                        {template.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          height: '4.5em',
                        }}
                      >
                        {template.description || 'No description available.'}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 'auto' }}>
                        {template.tags?.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            sx={{
                              bgcolor:
                                theme.palette.mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.05)',
                            }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ p: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudUploadIcon />}
                        fullWidth
                        disabled={!canDeployApps}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        Configure & Deploy
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={CodeIcon}
              title="No templates available"
              description="There are no app templates available yet. This could be due to an authentication issue or because no templates have been created."
              actionText="Refresh"
              onAction={() => refetchTemplates()}
            />
          )}

          {/* App Store section removed - functionality replaced with App Templates */}
        </>
      ) : null}

      {/* App Detail Modal removed - App Store concept replaced with App Templates */}

      {/* Deploy Dialog */}
      <Dialog
        open={isDeployDialogOpen}
        onClose={() => !isDeploying && setIsDeployDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: '90vw',
          },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Configure & Deploy: {selectedTemplate?.name}</Typography>
            <IconButton
              edge="end"
              color="inherit"
              onClick={() => !isDeploying && setIsDeployDialogOpen(false)}
              disabled={isDeploying}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="app configuration tabs"
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

        <DialogContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0, overflow: 'hidden' }}>
          {deployError && (
            <Alert severity="error" sx={{ m: 2 }}>
              {deployError}
            </Alert>
          )}

          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Deployment Settings
                </Typography>
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
                      onChange={setApiKey}
                      error={!!formErrors.apiKey}
                      helperText={formErrors.apiKey}
                      required
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                App Configuration
              </Typography>

              {selectedTemplate && (
                <EnhancedConfigForm
                  schema={selectedTemplate.template_config.schema as JSONSchema7}
                  formData={formData}
                  onChange={handleFormChange}
                  uiSchema={selectedTemplate.template_config.uiSchema}
                />
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <PreviewComponent />
            </TabPanel>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => !isDeploying && setIsDeployDialogOpen(false)}
            disabled={isDeploying}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDeploy}
            disabled={isDeploying}
            startIcon={isDeploying ? <CircularProgress size={20} /> : <CloudUploadIcon />}
          >
            {isDeploying ? 'Deploying...' : 'Deploy App'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppLibrary;
