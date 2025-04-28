import React from 'react';
import { Typography, Box, SxProps, Theme } from '@mui/material';

interface PageTitleProps {
  title: string;
  subtitle?: string;
  sx?: SxProps<Theme>;
}

const PageTitle: React.FC<PageTitleProps> = ({ title, subtitle, sx }) => {
  return (
    <Box sx={{ mb: 3, ...sx }}>
      <Typography 
        variant="h5" 
        component="h1" 
        sx={{ 
          fontWeight: 600, 
          fontSize: '1.25rem',
          lineHeight: 1.3,
          letterSpacing: '0.01em'
        }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mt: 0.5,
            fontSize: '0.875rem'
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default PageTitle;
