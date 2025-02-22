import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/';

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      textAlign="center"
      p={3}
    >
      <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
      <Typography variant="h4" gutterBottom>
        Access Denied
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        You don't have permission to access this page.
        Please contact your administrator if you believe this is a mistake.
      </Typography>
      <Box mt={3}>
        <Button
          variant="contained"
          onClick={() => navigate(from === '/unauthorized' ? '/' : from, { replace: true })}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
}; 