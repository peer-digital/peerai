import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Alert,
} from '@mui/material';
import { ContentCopy as ContentCopyIcon, Email as EmailIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ open, onClose }) => {
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [emailAddress, setEmailAddress] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Fetch referral code
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['referralStats'],
    queryFn: async () => {
      const response = await api.get('/referrals/stats');
      return response.data;
    },
  });

  // Get the base URL for the referral link
  const baseUrl = window.location.origin;
  const referralUrl = stats?.referral_code ? `${baseUrl}/referral/${stats.referral_code}` : '';

  // Handle copying referral URL
  const handleCopyUrl = () => {
    if (referralUrl) {
      navigator.clipboard.writeText(referralUrl);
      showSnackbar('Referral link copied to clipboard!', 'success');
    }
  };

  // Handle sending referral email
  const handleSendEmail = async () => {
    if (!emailAddress || !stats?.referral_code || !user?.name) return;

    setIsSendingEmail(true);
    setEmailError(null);

    try {
      await api.post('/referrals/send-invitation', {
        referee_email: emailAddress,
        referral_code: stats.referral_code,
        referrer_name: user.name,
      });
      showSnackbar('Referral invitation sent successfully!', 'success');
      setEmailAddress('');
    } catch (error: any) {
      setEmailError(error.response?.data?.detail || 'Failed to send invitation email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Refer a Friend</DialogTitle>
      <DialogContent>
        <Typography variant="body1" color="textSecondary" paragraph>
          Share your referral link with friends to earn tokens! When they sign up using your link, both you and your friend will receive 10,000 tokens.
        </Typography>

        {/* Referral URL Box */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Your Referral Link
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'background.paper',
                px: 2,
                py: 1,
                borderRadius: 1,
                flex: 1,
                wordBreak: 'break-all',
              }}
            >
              {isLoadingStats ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <span>Loading...</span>
                </Box>
              ) : (
                referralUrl || 'Error loading URL'
              )}
            </Typography>
            <Button
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyUrl}
              variant="outlined"
              size="small"
              disabled={isLoadingStats}
            >
              Copy
            </Button>
          </Box>
        </Paper>

        {/* Email Invitation Box */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Send Invitation via Email
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Friend's Email"
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              error={!!emailError}
              helperText={emailError}
              disabled={isSendingEmail}
            />
            <Button
              startIcon={<EmailIcon />}
              onClick={handleSendEmail}
              variant="contained"
              disabled={!emailAddress || isSendingEmail}
            >
              {isSendingEmail ? <CircularProgress size={24} /> : 'Send Invitation'}
            </Button>
          </Box>
        </Paper>

        <Typography variant="body2" color="textSecondary" paragraph>
          Share this link with your friends. When they sign up using your link, both you and your friend will receive 10,000 tokens as a welcome bonus!
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReferralModal;