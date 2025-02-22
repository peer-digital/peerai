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
} from '@mui/material';
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

const Settings: React.FC = () => {
  const { control, handleSubmit, reset } = useForm<SystemSettings>();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<SystemSettings>({
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Rate Limiting */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Rate Limiting
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Controller
                    name="rateLimit.enabled"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} {...field} />}
                        label="Enable Rate Limiting"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="rateLimit.requestsPerMinute"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Requests per Minute"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="rateLimit.tokensPerDay"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Tokens per Day"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Security
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Controller
                    name="security.requireSSL"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} {...field} />}
                        label="Require SSL"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="security.maxTokenLength"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Max Token Length"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="security.allowedOrigins"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Allowed Origins"
                        placeholder="Comma-separated list of domains"
                        helperText="e.g., https://app.peerai.se, https://api.peerai.se"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Model Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Model Configuration
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="models.defaultModel"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Default Model"
                        placeholder="e.g., claude-3-sonnet-20240229"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="models.maxContextLength"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Max Context Length"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="models.temperature"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        inputProps={{ step: 0.1, min: 0, max: 1 }}
                        label="Default Temperature"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Beta Features */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <Typography variant="h6">Beta Features</Typography>
                <Chip label="BETA" color="warning" size="small" />
              </Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                These features are in beta testing. Enable them only if you understand the limitations and potential issues.
              </Alert>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Controller
                    name="betaFeatures.visionEnabled"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} {...field} />}
                        label="Enable Vision API (Beta)"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="betaFeatures.visionModel"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Vision Model"
                        placeholder="e.g., claude-3-opus-20240229"
                        disabled={!control._formValues.betaFeatures?.visionEnabled}
                        helperText="Only Claude 3 Opus supports vision features"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="betaFeatures.audioEnabled"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={field.value} {...field} />}
                        label="Enable Audio API (Beta)"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="betaFeatures.audioModel"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Audio Model"
                        placeholder="e.g., whisper-1"
                        disabled={!control._formValues.betaFeatures?.audioEnabled}
                        helperText="Currently supports Whisper models only"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Monitoring Settings */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Monitoring
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="monitoring.logLevel"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        select
                        label="Log Level"
                        SelectProps={{
                          native: true,
                        }}
                      >
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="monitoring.retentionDays"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Log Retention (days)"
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="monitoring.alertThreshold"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label="Error Alert Threshold (%)"
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Save Changes'
                )}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default Settings; 