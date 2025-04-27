import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Apps as AppsIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import appTemplatesApi, { AppTemplate, AppTemplateCreate, AppTemplateUpdate } from '../api/appTemplates';
import { EmptyState, PageContainer } from '../components/ui';
import CodeEditor from '../components/editor/CodeEditor';

interface TemplateFormData {
  slug: string;
  name: string;
  description: string;
  icon_url: string;
  dark_icon_url: string;
  template_code: string;
  template_config: {
    schema: any;
    default_values: any;
  };
  tags: string;
  is_active: boolean;
}

const initialFormData: TemplateFormData = {
  slug: '',
  name: '',
  description: '',
  icon_url: '',
  dark_icon_url: '',
  template_code: '<div class="app-template">{{content}}</div>',
  template_config: {
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          title: 'Content',
          default: 'Hello World'
        }
      }
    },
    default_values: {
      content: 'Hello World'
    }
  },
  tags: '',
  is_active: true,
};

const AppTemplatesManagement: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TemplateFormData, string>>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [configJson, setConfigJson] = useState('');
  const [configJsonError, setConfigJsonError] = useState('');

  // Fetch templates from the API
  const { data: templates, isLoading, error, refetch } = useQuery<AppTemplate[]>({
    queryKey: ['app-templates'],
    queryFn: appTemplatesApi.getTemplates,
    retry: 2,
    retryDelay: 1000,
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: (newTemplate: AppTemplateCreate) => appTemplatesApi.createTemplate(newTemplate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-templates'] });
      handleCloseDialog();
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: ({ slug, template }: { slug: string; template: AppTemplateUpdate }) =>
      appTemplatesApi.updateTemplate(slug, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-templates'] });
      handleCloseDialog();
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (slug: string) => appTemplatesApi.deleteTemplate(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-templates'] });
      setIsDeleteDialogOpen(false);
    },
  });

  // Handle opening the create dialog
  const handleOpenCreateDialog = () => {
    setFormData(initialFormData);
    setConfigJson(JSON.stringify(initialFormData.template_config, null, 2));
    setIsEditing(false);
    setFormErrors({});
    setIsDialogOpen(true);
    setActiveTab(0);
  };

  // Handle opening the edit dialog
  const handleOpenEditDialog = (template: AppTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      slug: template.slug,
      name: template.name,
      description: template.description || '',
      icon_url: template.icon_url || '',
      dark_icon_url: template.dark_icon_url || '',
      template_code: template.template_code,
      template_config: template.template_config,
      tags: template.tags ? template.tags.join(', ') : '',
      is_active: template.is_active,
    });
    setConfigJson(JSON.stringify(template.template_config, null, 2));
    setIsEditing(true);
    setFormErrors({});
    setIsDialogOpen(true);
    setActiveTab(0);
  };

  // Handle opening the delete dialog
  const handleOpenDeleteDialog = (template: AppTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteDialogOpen(true);
  };

  // Handle closing the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setConfigJson(JSON.stringify(initialFormData.template_config, null, 2));
    setIsEditing(false);
    setConfigJsonError('');
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'is_active' ? checked : value,
    }));
  };

  // Handle template code changes
  const handleCodeChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      template_code: value,
    }));
  };

  // Handle config JSON changes
  const handleConfigJsonChange = (value: string) => {
    setConfigJson(value);
    try {
      const parsedConfig = JSON.parse(value);
      setFormData((prev) => ({
        ...prev,
        template_config: parsedConfig,
      }));
      setConfigJsonError('');
    } catch (err) {
      setConfigJsonError('Invalid JSON format');
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof TemplateFormData, string>> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!isEditing && !formData.slug.trim()) {
      errors.slug = 'Slug is required';
    } else if (!isEditing && !/^[a-z0-9-]+$/.test(formData.slug)) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (!formData.template_code.trim()) {
      errors.template_code = 'Template code is required';
    }

    if (configJsonError) {
      errors.template_config = configJsonError;
    }

    if (formData.icon_url && !/^https?:\/\//.test(formData.icon_url)) {
      errors.icon_url = 'Icon URL must start with http:// or https://';
    }

    if (formData.dark_icon_url && !/^https?:\/\//.test(formData.dark_icon_url)) {
      errors.dark_icon_url = 'Dark Icon URL must start with http:// or https://';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!validateForm()) return;

    const templateData = {
      name: formData.name,
      description: formData.description || undefined,
      icon_url: formData.icon_url || undefined,
      dark_icon_url: formData.dark_icon_url || undefined,
      template_code: formData.template_code,
      template_config: formData.template_config,
      tags: formData.tags ? formData.tags.split(',').map((tag) => tag.trim()) : undefined,
      is_active: formData.is_active,
    };

    if (isEditing && selectedTemplate) {
      updateMutation.mutate({
        slug: selectedTemplate.slug,
        template: templateData,
      });
    } else {
      createMutation.mutate({
        ...templateData,
        slug: formData.slug,
      } as AppTemplateCreate);
    }
  };

  // Handle template deletion
  const handleDelete = () => {
    if (selectedTemplate) {
      deleteMutation.mutate(selectedTemplate.slug);
    }
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
    <PageContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenCreateDialog}
        >
          Add Template
        </Button>
      </Box>

      {error ? (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Error loading templates. Please check your connection and try again.
        </Alert>
      ) : null}

      {createMutation.error || updateMutation.error || deleteMutation.error ? (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                createMutation.reset();
                updateMutation.reset();
                deleteMutation.reset();
              }}
            >
              Dismiss
            </Button>
          }
        >
          {createMutation.error ? 'Error creating template: ' :
           updateMutation.error ? 'Error updating template: ' :
           'Error deleting template: '}
          Please check your permissions and try again.
        </Alert>
      ) : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates && templates.length > 0 ? (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>{template.name}</TableCell>
                  <TableCell>{template.slug}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {template.description || 'No description'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {template.tags?.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={template.is_active ? 'Active' : 'Inactive'}
                      color={template.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{formatDate(template.created_at)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex' }}>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenEditDialog(template)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton color="error" onClick={() => handleOpenDeleteDialog(template)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <EmptyState
          icon={AppsIcon}
          title="No templates found"
          description="There are no app templates yet. Click the 'Add Template' button to create your first template."
          actionText="Add Template"
          onAction={handleOpenCreateDialog}
        />
      )}

      {/* Create/Edit Template Dialog */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {isEditing ? 'Edit Template' : 'Add New Template'}
            <IconButton edge="end" color="inherit" onClick={handleCloseDialog} aria-label="close">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Button
              variant={activeTab === 0 ? "contained" : "outlined"}
              onClick={() => setActiveTab(0)}
              sx={{ mr: 1 }}
            >
              Basic Info
            </Button>
            <Button
              variant={activeTab === 1 ? "contained" : "outlined"}
              onClick={() => setActiveTab(1)}
              sx={{ mr: 1 }}
            >
              Template Code
            </Button>
            <Button
              variant={activeTab === 2 ? "contained" : "outlined"}
              onClick={() => setActiveTab(2)}
            >
              Configuration
            </Button>
          </Box>

          {activeTab === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  required
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  required
                  disabled={isEditing}
                  error={!!formErrors.slug}
                  helperText={
                    formErrors.slug ||
                    (isEditing
                      ? 'Slug cannot be changed after creation'
                      : 'Use lowercase letters, numbers, and hyphens only')
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Light Mode Icon URL"
                  name="icon_url"
                  value={formData.icon_url}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  error={!!formErrors.icon_url}
                  helperText={formErrors.icon_url || 'Must start with http:// or https://'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Dark Mode Icon URL"
                  name="dark_icon_url"
                  value={formData.dark_icon_url}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  error={!!formErrors.dark_icon_url}
                  helperText={formErrors.dark_icon_url || 'Must start with http:// or https://'}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  fullWidth
                  margin="normal"
                  helperText="Separate tags with commas"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      name="is_active"
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && (
            <Box sx={{ height: 400 }}>
              <Typography variant="subtitle1" gutterBottom>
                Template Code
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Use double curly braces to reference configuration variables.
              </Typography>
              <CodeEditor
                value={formData.template_code}
                onChange={handleCodeChange}
                language="html"
                height="350px"
              />
              {formErrors.template_code && (
                <Typography color="error" variant="caption">
                  {formErrors.template_code}
                </Typography>
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ height: 400 }}>
              <Typography variant="subtitle1" gutterBottom>
                Configuration Schema
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Define the configuration schema and default values in JSON format.
              </Typography>
              <CodeEditor
                value={configJson}
                onChange={handleConfigJsonChange}
                language="json"
                height="350px"
              />
              {formErrors.template_config && (
                <Typography color="error" variant="caption">
                  {formErrors.template_config}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <CircularProgress size={24} />
            ) : isEditing ? (
              'Update'
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template "{selectedTemplate?.name}"? This action cannot be
            undone.
          </Typography>
          {/* Deployment check removed as it's not available in the current API */}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AppTemplatesManagement;
