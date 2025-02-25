import React from 'react';
import { Box, CircularProgress, Typography, Fade, useTheme } from '@mui/material';

/**
 * PageLoader component for displaying a full-page loading state
 * Used primarily for Suspense fallback and initial page loads
 */
const PageLoader: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Fade in={true} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
          position: 'fixed',
          top: 0,
          left: 0,
          backgroundColor: theme.palette.background.default,
          zIndex: 9999,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img 
            src={theme.palette.mode === 'dark' ? '/assets/logo_neg.svg' : '/assets/logo.svg'} 
            alt="PeerAI Logo" 
            style={{ 
              height: 60, 
              marginBottom: theme.spacing(3),
              animation: 'pulse 2s infinite ease-in-out',
            }} 
          />
          
          <CircularProgress 
            size={40} 
            thickness={4} 
            sx={{ 
              color: theme.palette.primary.main,
              mb: 2,
            }} 
          />
          
          <Typography 
            variant="body1" 
            color="textSecondary"
            sx={{ 
              fontWeight: 500,
              letterSpacing: '0.5px',
            }}
          >
            Loading...
          </Typography>
        </Box>
        
        <Box
          component="style"
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
              }
            `,
          }}
        />
      </Box>
    </Fade>
  );
};

export default PageLoader; 