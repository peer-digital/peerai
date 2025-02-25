import React from 'react';
import { Box, CircularProgress, Typography, Fade, styled } from '@mui/material';

// Styled components
const OverlayContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 10,
  borderRadius: theme.shape.borderRadius,
}));

// Props interface
export interface LoadingOverlayProps {
  loading: boolean;
  message?: string;
  transparent?: boolean;
  size?: number;
  position?: 'absolute' | 'fixed';
}

// LoadingOverlay component
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  message = 'Loading...',
  transparent = false,
  size = 40,
  position = 'absolute',
}) => {
  if (!loading) return null;

  return (
    <Fade in={loading} timeout={300}>
      <OverlayContainer
        sx={{
          position,
          backgroundColor: transparent ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <CircularProgress size={size} thickness={4} color="primary" />
        {message && (
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ mt: 2, fontWeight: 500 }}
          >
            {message}
          </Typography>
        )}
      </OverlayContainer>
    </Fade>
  );
};

export default LoadingOverlay; 