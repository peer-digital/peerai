import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Paper,
  useTheme,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { AppTemplateIcon } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, PageContainer } from '../components/ui';
import appTemplatesApi, { AppTemplate } from '../api/appTemplates';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasPermission } from '../utils/permissions';
import { useNavigate, Link } from 'react-router-dom';

const AppLibrary: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Check if user has permission to deploy apps
  const canDeployApps = user && hasPermission(user.permissions, Permission.DEPLOY_APPS);

  // Fetch templates
  const { data: templates, isLoading: isLoadingTemplates, error: templateError, refetch: refetchTemplates } = useQuery({
    queryKey: ['app-templates'],
    queryFn: appTemplatesApi.getTemplates,
    retry: false // Don't retry on failure
  });

  // Handle template selection
  const handleSelectTemplate = (template: AppTemplate) => {
    console.log('Selected template:', template);
    // Navigate to the deploy app page with the template slug
    navigate(`/deploy-app/${template.slug}`);
  };

  // Filter templates to only show active templates
  const filteredTemplates = templates?.filter((template) => template.is_active);

  return (
    <PageContainer>

      {/* Simplified Instructions */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: theme.shadows[2] }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          Select a Template to Begin
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          Choose from the templates below to create your new application. The setup process takes just minutes to complete.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Need help? Visit the <Link to="/content-manager" style={{ color: theme.palette.primary.main }}>Get Started</Link> page for detailed instructions and information.
        </Typography>
      </Paper>

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
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8],
                  },
                }}>
                <Box
                  sx={{
                    height: 150, // Increased from 140 to provide more space
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme.palette.mode === 'dark'
                      ? 'rgba(69, 137, 255, 0.08)'
                      : 'rgba(15, 98, 254, 0.04)',
                    p: 3, // Increased padding from 2 to 3
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <AppTemplateIcon
                    iconType={template.icon_type}
                    size="large"
                    variant="gradient"
                  />
                </Box>
                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: theme.palette.text.primary,
                      mb: 2,
                      textAlign: 'center'
                    }}
                  >
                    {template.name}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{
                      mb: 3,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      height: '4.5em',
                      lineHeight: 1.6
                    }}
                  >
                    {template.description || 'No description available.'}
                  </Typography>
                </CardContent>
                <Box sx={{ px: 3, pb: 1 }}>
                  <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, pt: 2, pb: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      disabled={!canDeployApps}
                      onClick={() => handleSelectTemplate(template)}
                      sx={{
                        py: 1.2,
                        fontWeight: 600,
                        borderRadius: '6px',
                        boxShadow: theme.shadows[2],
                        '&:hover': {
                          boxShadow: theme.shadows[4],
                          color: 'white'
                        }
                      }}
                    >
                      Configure & Deploy
                    </Button>
                  </Box>
                </Box>
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
    </PageContainer>
  );
};

export default AppLibrary;
