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
  Code as CodeIcon,
  Preview as PreviewIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import deployedAppsApi, { DeployedAppDetail } from '../api/deployedApps';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasPermission } from '../utils/permissions';
import CodeEditor from '../components/editor/CodeEditor';
import { JSONSchema7 } from 'json-schema';
import Form from '@rjsf/mui';
import validator from '@rjsf/validator-ajv8';
import { replacePlaceholders } from '../utils/templateHelpers';

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
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ p: 3, height: '100%' }}>
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
  const [customCode, setCustomCode] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    },
  });

  // Delete app mutation
  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deployedAppsApi.deleteDeployedApp(slug),
    onSuccess: () => {
      navigate('/my-apps');
    },
  });

  // Set initial form data and code when app data is loaded
  useEffect(() => {
    if (app) {
      setFormData(app.configuration || {});
      setCustomCode(app.custom_code || app.template.template_code);
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

  // Handle code change
  const handleCodeChange = (value: string) => {
    setCustomCode(value);
  };

  // Handle save changes
  const handleSaveChanges = () => {
    if (!app) return;

    updateMutation.mutate({
      slug: app.slug,
      updates: {
        configuration: formData,
        custom_code: customCode,
      },
    });
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
        const preview = replacePlaceholders(customCode, formData);
        setPreviewHtml(preview);
      }
    }, [customCode, formData]);

    return (
      <Box sx={{ height: '100%', overflow: 'auto' }}>
        <iframe
          srcDoc={previewHtml}
          title="App Preview"
          style={{
            width: '100%',
            height: '100%',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
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
    <Box p={3} sx={{ width: '100%', minWidth: '100%', height: 'calc(100vh - 64px)' }}>
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
              {isEditing ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveChanges}
                  disabled={updateMutation.isPending}
                  sx={{ mr: 1 }}
                >
                  {updateMutation.isPending ? <CircularProgress size={24} /> : 'Save Changes'}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setIsEditing(true)}
                  sx={{ mr: 1 }}
                >
                  Edit App
                </Button>
              )}
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

      <Box sx={{ height: 'calc(100% - 200px)', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="app tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SettingsIcon />} label="Configuration" id="tab-0" aria-controls="tabpanel-0" />
          <Tab icon={<CodeIcon />} label="Code" id="tab-1" aria-controls="tabpanel-1" />
          <Tab icon={<PreviewIcon />} label="Preview" id="tab-2" aria-controls="tabpanel-2" />
        </Tabs>

        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            {app.template.template_config?.schema && (
              <Form
                schema={app.template.template_config.schema as JSONSchema7}
                formData={formData}
                onChange={handleFormChange}
                validator={validator}
                disabled={!isEditing}
                uiSchema={app.template.template_config.uiSchema || {
                  'ui:submitButtonOptions': {
                    norender: true,
                  },
                }}
              />
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ height: '100%' }}>
              <CodeEditor
                value={customCode}
                onChange={handleCodeChange}
                language="html"
                height="100%"
                readOnly={!isEditing}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <PreviewComponent />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

export default DeployedAppView;
