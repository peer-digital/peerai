import React, { useState } from 'react';
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
  Stack,
  Paper,
  useTheme,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Code as CodeIcon,
  DesignServices as DesignServicesIcon,
  Rocket as RocketIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, PageContainer, SearchField } from '../components/ui';
import appTemplatesApi, { AppTemplate } from '../api/appTemplates';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasPermission } from '../utils/permissions';
import { useNavigate } from 'react-router-dom';

const AppLibrary: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

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

  return (
    <PageContainer>
      <Box sx={{ mb: 4 }}>
        <SearchField
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
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

      {/* App Creation Timeline */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: theme.shadows[2] }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Create Your App in Minutes
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Step 1 */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1,
            mb: { xs: 3, md: 0 }
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 2
            }}>
              <CodeIcon fontSize="large" />
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>1. Select Template</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }}>
              Choose from our pre-built templates to get started quickly
            </Typography>
          </Box>

          {/* Connector Line - Desktop */}
          <Box sx={{
            flex: 0.5,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: '60px'
          }}>
            <Box sx={{ height: '2px', width: '100%', bgcolor: 'divider' }} />
            <CheckCircleIcon sx={{
              position: 'absolute',
              color: 'primary.main',
              bgcolor: theme.palette.background.paper,
              borderRadius: '50%'
            }} />
          </Box>

          {/* Step 2 */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1,
            mb: { xs: 3, md: 0 }
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 2
            }}>
              <DesignServicesIcon fontSize="large" />
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>2. Style & Configure</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }}>
              Customize your app's appearance and functionality
            </Typography>
          </Box>

          {/* Connector Line - Desktop */}
          <Box sx={{
            flex: 0.5,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            height: '60px'
          }}>
            <Box sx={{ height: '2px', width: '100%', bgcolor: 'divider' }} />
            <CheckCircleIcon sx={{
              position: 'absolute',
              color: 'primary.main',
              bgcolor: theme.palette.background.paper,
              borderRadius: '50%'
            }} />
          </Box>

          {/* Step 3 */}
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            flex: 1
          }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 2
            }}>
              <RocketIcon fontSize="large" />
            </Box>
            <Typography variant="h6" sx={{ mb: 1 }}>3. Deploy</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 220 }}>
              Launch your app and share it with your team or organization
            </Typography>
          </Box>
        </Box>
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
    </PageContainer>
  );
};

export default AppLibrary;
