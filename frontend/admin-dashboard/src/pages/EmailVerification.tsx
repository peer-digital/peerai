import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/config';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const EmailVerification: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      if (hasAttemptedVerification) return; // Prevent multiple verification attempts
      
      try {
        const response = await api.get(`/api/auth/verify-email/${token}`);
        setMessage(response.data.message || 'Email verified successfully!');
        setStatus('success');
        setHasAttemptedVerification(true);
        
        // Add a small delay before invalidating the cache to ensure the backend has updated
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          // Force refetch to ensure we get fresh data
          queryClient.refetchQueries({ queryKey: ['users'] });
        }, 1000);
      } catch (error: any) {
        console.error('Verification error:', error);
        setMessage(
          error.response?.data?.detail || 'Failed to verify email. The link may be invalid or expired.'
        );
        setStatus('error');
        setHasAttemptedVerification(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Invalid verification link');
      setHasAttemptedVerification(true);
    }
  }, [token, hasAttemptedVerification, queryClient]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="sm">
        <Paper sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {status === 'loading' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress size={48} sx={{ mb: 2 }} />
              <Typography variant="h6">Verifying your email...</Typography>
            </Box>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Email Verified!
              </Typography>
              <Typography color="text.secondary" paragraph>
                {message}
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                Go to Login
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Verification Failed
              </Typography>
              <Typography color="text.secondary" paragraph>
                {message}
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                Go to Login
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default EmailVerification; 