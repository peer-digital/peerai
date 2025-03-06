import React from 'react';
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
} from '@mui/material';
import { ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';

interface ReferralModalProps {
  open: boolean;
  onClose: () => void;
}

const ReferralModal: React.FC<ReferralModalProps> = ({ open, onClose }) => {
  const { showSnackbar } = useSnackbar();

  // Fetch referral code
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['referralStats'],
    queryFn: async () => {
      const response = await api.get('/referrals/stats');
      return response.data;
    },
  });

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
          Share your referral code with friends to earn tokens! When they sign up using your code, both you and your friend will receive 10,000 tokens.
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

        <Typography variant="body2" color="textSecondary" paragraph>
          Share this code with your friends. When they sign up using your code, both you and your friend will receive 10,000 tokens as a welcome bonus!
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReferralModal; 