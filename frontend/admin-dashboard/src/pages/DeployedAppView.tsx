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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
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

const DeployedAppView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [customUiSchema, setCustomUiSchema] = useState<any>(null);
  const [editingSections, setEditingSections] = useState<string[]>([]);

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
      navigate('/my-apps');
    },
  });

  // Set initial form data when app data is loaded
  useEffect(() => {
    if (app) {
      setFormData(app.configuration || {});

      // Check if this is a RAG chatbot template and create a custom UI schema
      if (app.template.slug === 'rag-chatbot' && app.template.template_config?.uiSchema) {
        // Create a deep copy of the original UI schema
        const originalUiSchema = JSON.parse(JSON.stringify(app.template.template_config.uiSchema));

        // Enable the documents section for deployed apps
        if (originalUiSchema.documents) {
          // Enable the documents section
          originalUiSchema.documents['ui:disabled'] = false;

          // Enable the file upload widget
          if (originalUiSchema.documents.file_upload) {
            originalUiSchema.documents.file_upload['ui:disabled'] = false;
            originalUiSchema.documents.file_upload['ui:help'] = 'Upload documents to be used by the chatbot';
          }

          // Update the description
          originalUiSchema.documents['ui:description'] = 'Upload documents to be used by the chatbot';
        }

        setCustomUiSchema(originalUiSchema);
        console.log('Created custom UI schema for RAG app:', originalUiSchema);
      } else {
        // For other templates, use the original UI schema
        setCustomUiSchema(app.template.template_config?.uiSchema || {});
      }
    }
  }, [app]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  // Helper function to get section title from key
  const getSectionTitle = (sectionKey: string): string => {
    if (!app?.template?.template_config?.schema?.properties) return 'Section';

    const property = app.template.template_config.schema.properties[sectionKey];
    if (property && typeof property === 'object' && 'title' in property) {
      return property.title as string;
    }

    return sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1).replace(/_/g, ' ');
  };

  // Handle delete app
  const handleDeleteApp = () => {
    if (!app) return;
    setIsDeleting(true);
    deleteMutation.mutate(app.slug);
  };

  // Preview component
  const PreviewComponent = () => {
    const [previewHtml, setPreviewHtml] = useState('');

    useEffect(() => {
      // Create a preview by replacing placeholders in the template code
      if (app) {
        // Use the helper function to replace all placeholders, including nested ones
        const preview = replacePlaceholders(app.template.template_code, formData);
        setPreviewHtml(preview);
      }
    }, [formData, app]);

    return (
      <DevicePreview html={previewHtml} title="App Preview" />
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
                onClick={handleDeleteApp}
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

        <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
          <TabPanel value={tabValue} index={0}>
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

          <TabPanel value={tabValue} index={1}>
            <PreviewComponent />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

export default DeployedAppView;
