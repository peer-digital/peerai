import React from 'react';
import { Box, CircularProgress, Typography, Fade, useTheme } from '@mui/material';

/**
 * MobileLoadingIndicator component for displaying a centered loading state
 * Optimized for mobile devices with proper positioning and styling
 */
const MobileLoadingIndicator: React.FC = () => {
  const theme = useTheme();
  
  return (
    <Fade in={true} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
            padding: theme.spacing(2),
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(38, 38, 38, 0.9)' 
              : 'rgba(255, 255, 255, 0.9)',
            boxShadow: theme.shadows[4],
            maxWidth: '90%',
            width: 'auto',
          }}
        >
          <CircularProgress 
            size={36} 
            thickness={4} 
            sx={{ 
              color: theme.palette.primary.main,
              mb: 2,
            }} 
          />
          
          <Typography 
            variant="body2" 
            color="textSecondary"
            sx={{ 
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Loading...
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
};

export default MobileLoadingIndicator;
