import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Divider,
  useTheme,
} from '@mui/material';

import {
  Search as SearchIcon,
  Apps as AppsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import deployedAppsApi, { DeployedApp, DeployedAppDetail } from '../api/deployedApps';
import { EmptyState, PageTitle, SearchField } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { Permission, hasPermission } from '../utils/permissions';
import { useNavigate, Link } from 'react-router-dom';
import { useBreadcrumbsUpdate } from '../hooks/useBreadcrumbsUpdate';

const MyApps: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<DeployedAppDetail | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Set breadcrumbs for this page
  useBreadcrumbsUpdate([
    { label: 'Apps' }
  ]);

  // Check if user has permission to configure apps
  const canConfigureApps = user && hasPermission(user.permissions, Permission.CONFIGURE_APPS);

  // Check if user has permission to deploy apps (needed for Content Manager access)
  const canDeployApps = user && hasPermission(user.permissions, Permission.DEPLOY_APPS);

  // Fetch deployed apps
  const { data: deployedApps, isLoading, error, refetch } = useQuery({
    queryKey: ['deployed-apps'],
    queryFn: () => deployedAppsApi.getDeployedApps(),
  });

  // Delete app mutation
  const deleteMutation = useMutation({
    mutationFn: (slug: string) => deployedAppsApi.deleteDeployedApp(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployed-apps'] });
      setIsDeleteModalOpen(false);
    },
  });

  // Handle opening the delete modal
  const handleOpenDeleteModal = async (app: DeployedApp) => {
    try {
      // Fetch detailed app info
      const appDetail = await deployedAppsApi.getDeployedApp(app.slug);
      setSelectedApp(appDetail);
      setIsDeleteModalOpen(true);
    } catch (error) {
      console.error('Error fetching app details:', error);
    }
  };

  // Handle app deletion
  const handleDeleteApp = () => {
    if (!selectedApp) return;

    deleteMutation.mutate(selectedApp.slug);
  };

  // Filter apps based on search query
  const filteredApps = deployedApps?.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <Box p={0} sx={{ width: '100%', minWidth: '100%' }}>

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
          Error loading your apps. Please check your connection and try again.
        </Alert>
      ) : null}

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1, mr: 2 }}>
          <SearchField
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />
        </Box>
        {canConfigureApps && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app-library')}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Create New App
          </Button>
        )}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredApps && filteredApps.length > 0 ? (
        <Grid container spacing={2}>
          {filteredApps.map((app) => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={app.id}>
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
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography gutterBottom variant="h6" component="div">
                      {app.name}
                    </Typography>
                    <Chip
                      label={app.is_active ? 'Active' : 'Inactive'}
                      color={app.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Deployed on {formatDate(app.created_at)}
                  </Typography>

                  {app.team_id ? (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Team-specific deployment
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Organization-wide deployment
                    </Typography>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                  <Button
                    size="small"
                    color="primary"
                    onClick={() => window.open(app.public_url || '', '_blank')}
                    endIcon={<OpenInNewIcon />}
                  >
                    Open
                  </Button>
                  <Box>
                    {canConfigureApps && (
                      <>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/my-apps/${app.slug}`)}
                          title="Settings"
                        >
                          <SettingsIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteModal(app)}
                          title="Delete"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon={AppsIcon}
          title="No apps found"
          description={
            searchQuery
              ? "No apps match your search criteria."
              : "You haven't deployed any apps yet. Create your first app to get started."
          }
          actionText="Create your first app"
          onAction={() => navigate('/app-library')}
        />
      )}



      {/* Delete Confirmation Modal */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '0.375rem',
            boxShadow: (theme) => theme.palette.mode === 'light'
              ? '0 8px 12px -3px rgba(0,0,0,0.1), 0 3px 5px -2px rgba(0,0,0,0.05)'
              : '0 8px 12px -3px rgba(255,255,255,0.05), 0 3px 5px -2px rgba(255,255,255,0.02)',
            overflow: 'hidden',
            maxWidth: '450px',
            width: '100%'
          }
        }}
      >
        <DialogTitle
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
          <Typography sx={{ color: 'text.primary' }}>
            Are you sure you want to delete the app <strong>"{selectedApp?.name}"</strong>? This action cannot be
            undone.
          </Typography>
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
              Warning: This will permanently delete all app configuration and data.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={() => setIsDeleteModalOpen(false)}
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
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyApps;
