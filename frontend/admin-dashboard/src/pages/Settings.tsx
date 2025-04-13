import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  ModelTraining as ModelTrainingIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import api from '../api/config';

interface SystemSettings {
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    tokensPerDay: number;
  };
  security: {
    requireSSL: boolean;
    maxTokenLength: number;
    allowedOrigins: string;
  };
  models: {
    defaultModel: string;
    maxContextLength: number;
    temperature: number;
  };
  monitoring: {
    logLevel: string;
    retentionDays: number;
    alertThreshold: number;
  };
  betaFeatures: {
    visionEnabled: boolean;
    audioEnabled: boolean;
    visionModel: string;
    audioModel: string;
  };
}

const SettingSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  description?: string;
}> = ({ title, icon, children, description }) => (
  <Paper sx={{ p: 3 }}>
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          {icon}
          <Typography variant="h6">{title}</Typography>
        </Stack>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      <Divider />
      <Box>{children}</Box>
    </Stack>
  </Paper>
);

const Settings: React.FC = () => {
  // Initialize form with default values
  const defaultValues: SystemSettings = {
    rateLimit: {
      enabled: false,
      requestsPerMinute: 60,
      tokensPerDay: 1000,
    },
    security: {
      requireSSL: true,
      maxTokenLength: 4096,
      allowedOrigins: '',
    },
    models: {
      defaultModel: 'claude-3-sonnet-20240229', // @important: Default model
      maxContextLength: 200000,
      temperature: 0.7,
    },
    monitoring: {
      logLevel: 'info',
      retentionDays: 30,
      alertThreshold: 90,
    },
    betaFeatures: {
      visionEnabled: false,
      audioEnabled: false,
      visionModel: '',
      audioModel: '',
    },
  };

  const { control, handleSubmit, reset, formState: { isDirty } } = useForm<SystemSettings>({
    defaultValues,
  });

  // Fetch current settings
  const { data: settings, isLoading, error, refetch } = useQuery<SystemSettings>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/settings');
      return response.data;
    },
  });

  // Reset form when settings are loaded
  React.useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  // Update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SystemSettings) => {
      await api.put('/api/v1/admin/settings', data);
    },
    onSuccess: () => {
      toast.success('Settings updated successfully');
      refetch();
    },
    onError: () => {
      toast.error('Failed to update settings');
    },
  });

  const onSubmit = async (data: SystemSettings) => {
    await updateSettingsMutation.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          Loading settings...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error loading settings. Please try again later.
        </Alert>
      </Box>
    );
  }

  if (!settings) {
    return (
      <Box p={3}>
        <Alert severity="warning">
          No settings data available
        </Alert>
      </Box>
    );
  }

  const isSaving = updateSettingsMutation.isPending;

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
            System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Configure system-wide settings and parameters
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh settings" arrow>
            <IconButton onClick={() => refetch()} disabled={isSaving}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSubmit(onSubmit)}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Stack>

      {updateSettingsMutation.isError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to save settings. Please try again.
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Rate Limiting */}
          <Grid item xs={12} lg={6}>
            <SettingSection
              title="Rate Limiting"
              icon={<SpeedIcon color="primary" />}
              description="Configure API rate limits and usage quotas"
            >
              <Stack spacing={3}>
                <Controller
                  name="rateLimit.enabled"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} {...field} />}
                      label="Enable Rate Limiting"
                    />
                  )}
                />
                <Controller
                  name="rateLimit.requestsPerMinute"
                  control={control}
                  defaultValue={60}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Requests per Minute"
                      size="small"
                    />
                  )}
                />
                <Controller
                  name="rateLimit.tokensPerDay"
                  control={control}
                  defaultValue={1000}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Tokens per Day"
                      size="small"
                    />
                  )}
                />
              </Stack>
            </SettingSection>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} lg={6}>
            <SettingSection
              title="Security"
              icon={<SecurityIcon color="primary" />}
              description="Configure security settings and access controls"
            >
              <Stack spacing={3}>
                <Controller
                  name="security.requireSSL"
                  control={control}
                  defaultValue={true}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch checked={field.value} {...field} />}
                      label="Require SSL"
                    />
                  )}
                />
                <Controller
                  name="security.maxTokenLength"
                  control={control}
                  defaultValue={4096}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Max Token Length"
                      size="small"
                    />
                  )}
                />
                <Controller
                  name="security.allowedOrigins"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Allowed Origins"
                      placeholder="Comma-separated list of domains"
                      helperText="e.g., https://app.peerai.se, https://api.peerai.se"
                      size="small"
                    />
                  )}
                />
              </Stack>
            </SettingSection>
          </Grid>

          {/* Model Settings */}
          <Grid item xs={12} lg={6}>
            <SettingSection
              title="Model Configuration"
              icon={<ModelTrainingIcon color="primary" />}
              description="Configure default model settings and parameters"
            >
              <Stack spacing={3}>
                <Controller
                  name="models.defaultModel"
                  control={control}
                  defaultValue="claude-3-sonnet-20240229"
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Default Model"
                      placeholder="e.g., claude-3-sonnet-20240229"
                      size="small"
                    />
                  )}
                />
                <Controller
                  name="models.maxContextLength"
                  control={control}
                  defaultValue={200000}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      label="Max Context Length"
                      size="small"
                    />
                  )}
                />
                <Controller
                  name="models.temperature"
                  control={control}
                  defaultValue={0.7}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      type="number"
                      inputProps={{ step: 0.1, min: 0, max: 1 }}
                      label="Default Temperature"
                      size="small"
                    />
                  )}
                />
              </Stack>
            </SettingSection>
          </Grid>

          {/* Beta Features */}
          <Grid item xs={12} lg={6}>
            <SettingSection
              title="Beta Features"
              icon={<ScienceIcon color="primary" />}
              description="Enable and configure experimental features"
            >
              <Stack spacing={3}>
                <Alert severity="info" variant="outlined">
                  These features are in beta testing. Enable them only if you understand the limitations and potential issues.
                </Alert>
                <Stack spacing={2}>
                  <Controller
                    name="betaFeatures.visionEnabled"
                    control={control}
                    defaultValue={false}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} {...field} />}
                        label={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span>Enable Vision API</span>
                            <Chip label="Beta" color="warning" size="small" />
                          </Stack>
                        }
                      />
                    )}
                  />
                  <Controller
                    name="betaFeatures.visionModel"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Vision Model"
                        size="small"
                        disabled={!control._formValues.betaFeatures?.visionEnabled}
                      />
                    )}
                  />
                </Stack>
                <Stack spacing={2}>
                  <Controller
                    name="betaFeatures.audioEnabled"
                    control={control}
                    defaultValue={false}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} {...field} />}
                        label={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <span>Enable Audio API</span>
                            <Chip label="Beta" color="warning" size="small" />
                          </Stack>
                        }
                      />
                    )}
                  />
                  <Controller
                    name="betaFeatures.audioModel"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Audio Model"
                        size="small"
                        disabled={!control._formValues.betaFeatures?.audioEnabled}
                      />
                    )}
                  />
                </Stack>
              </Stack>
            </SettingSection>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default Settings;