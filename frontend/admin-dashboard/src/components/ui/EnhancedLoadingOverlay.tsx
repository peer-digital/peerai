import React from 'react';
import { Box, CircularProgress, Typography, Fade, styled, useTheme } from '@mui/material';

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
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(0, 0, 0, 0.7)' 
    : 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(3px)',
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
  showLogo?: boolean;
}

// LoadingOverlay component
export const EnhancedLoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  message = 'Loading...',
  transparent = false,
  size = 40,
  position = 'absolute',
  showLogo = false,
}) => {
  const theme = useTheme();
  
  if (!loading) return null;

  return (
    <Fade in={loading} timeout={300}>
      <OverlayContainer
        sx={{
          position,
          backgroundColor: transparent 
            ? (theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.6)') 
            : (theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)'),
          backdropFilter: 'blur(3px)',
        }}
      >
        {showLogo && (
          <img 
            src={theme.palette.mode === 'dark' ? '/assets/logo_neg.svg' : '/assets/logo.svg'} 
            alt="PeerAI Logo" 
            style={{ 
              height: 40, 
              marginBottom: theme.spacing(2),
              animation: 'pulse 2s infinite ease-in-out',
            }} 
          />
        )}
        
        <CircularProgress 
          size={size} 
          thickness={4} 
          color="primary"
          sx={{
            animation: 'fadeIn 0.5s ease-in-out',
          }}
        />
        
        {message && (
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ 
              mt: 2, 
              fontWeight: 500,
              animation: 'fadeIn 0.5s ease-in-out',
            }}
          >
            {message}
          </Typography>
        )}
        
        <Box
          component="style"
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
              }
              @keyframes fadeIn {
                0% { opacity: 0; }
                100% { opacity: 1; }
              }
            `,
          }}
        />
      </OverlayContainer>
    </Fade>
  );
};

export default EnhancedLoadingOverlay; 