import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Paper,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Email as EmailIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';

const Referrals: React.FC = () => {
  const [referralEmail, setReferralEmail] = useState('');
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();

  // Fetch referral stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['referralStats'],
    queryFn: async () => {
      const response = await api.get('/api/v1/referrals/stats');
      return response.data;
    },
  });

  // Fetch user's referrals
  const { data: referrals, isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['referrals'],
    queryFn: async () => {
      const response = await api.get('/api/v1/referrals');
      return response.data;
    },
  });

  // Email referral mutation
  const emailReferralMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post('referrals/invite', { email });
      return response.data;
    },
    onSuccess: () => {
      showSnackbar('Referral invitation sent successfully!', 'success');
      setReferralEmail('');
      queryClient.invalidateQueries({ queryKey: ['referralStats'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
        // Handle unauthorized access
        window.location.href = '/login';
      } else {
        showSnackbar(error.response?.data?.detail || 'Failed to send referral invitation', 'error');
      }
    },
  });

  // Handle email referral submission
  const handleSubmitEmailReferral = (e: React.FormEvent) => {
    e.preventDefault();
    if (referralEmail.trim()) {
      emailReferralMutation.mutate(referralEmail.trim());
    }
  };

  if (isLoadingStats || isLoadingReferrals) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Referrals
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Invite friends to Peer AI and earn tokens for both you and your referrals!
      </Typography>

      <Grid container spacing={3}>
        {/* Email Referral */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Refer by Email
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Send a referral invitation directly to your friend's email address.
              </Typography>
              <form onSubmit={handleSubmitEmailReferral}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="Friend's Email"
                    type="email"
                    value={referralEmail}
                    onChange={(e) => setReferralEmail(e.target.value)}
                    placeholder="friend@example.com"
                    disabled={emailReferralMutation.isPending}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<EmailIcon />}
                    disabled={!referralEmail.trim() || emailReferralMutation.isPending}
                  >
                    {emailReferralMutation.isPending ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Referral Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your Referral Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats?.total_referrals || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Referrals
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats?.successful_referrals || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Successful Referrals
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats?.pending_referrals || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Pending Referrals
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats?.total_tokens_earned?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Tokens Earned
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Referral History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Referral History
              </Typography>
              {referrals?.length > 0 ? (
                referrals.map((referral: any) => (
                  <Box key={referral.id} sx={{ mb: 2 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body1">
                          Email: <strong>{referral.email}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Sent: {new Date(referral.created_at).toLocaleDateString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body1">
                          Status: <strong>{referral.status}</strong>
                        </Typography>
                        {referral.completed_at && (
                          <Typography variant="body2" color="textSecondary">
                            Completed: {new Date(referral.completed_at).toLocaleDateString()}
                          </Typography>
                        )}
                      </Grid>
                    </Grid>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No referral history yet.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Referrals; 