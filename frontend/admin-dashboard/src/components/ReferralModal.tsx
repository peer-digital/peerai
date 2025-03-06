import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Email as EmailIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ open, onClose }) => {
  const [referralEmail, setReferralEmail] = useState('');
  const queryClient = useQueryClient();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  // Fetch referral code
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['referralStats'],
    queryFn: async () => {
      const response = await api.get('/referrals/stats');
      return response.data;
    },
  });

  // Email referral mutation
  const emailReferralMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await api.post('/referrals/invite', { email });
      return response.data;
    },
    onSuccess: () => {
      showSnackbar('Referral invitation sent successfully!', 'success');
      setReferralEmail('');
      queryClient.invalidateQueries({ queryKey: ['referralStats'] });
    },
    onError: (error: any) => {
      if (error.response?.status === 401) {
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

  // Handle copying referral code
  const handleCopyCode = () => {
    if (stats?.referral_code) {
      navigator.clipboard.writeText(stats.referral_code);
      showSnackbar('Referral code copied to clipboard!', 'success');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Refer a Friend</DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="textSecondary" paragraph>
          Invite friends to Peer AI and earn tokens for both you and your referrals!
        </Typography>

        {/* Referral Code Box */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Your Referral Code
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'background.paper',
                px: 2,
                py: 1,
                borderRadius: 1,
                flex: 1,
              }}
            >
              {isLoadingStats ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <span>Loading...</span>
                </Box>
              ) : (
                stats?.referral_code || 'Error loading code'
              )}
            </Typography>
            <Button
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyCode}
              variant="outlined"
              size="small"
              disabled={isLoadingStats}
            >
              Copy
            </Button>
          </Box>
        </Paper>

        {/* Email Referral Form */}
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
              {emailReferralMutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReferralModal; 