import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import logger from '../../utils/logger';

const AuthDebug: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <Paper sx={{ p: 2, m: 2, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>
        Authentication Debug
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Is Loading:</strong> {isLoading ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}
        </Typography>
        <Typography variant="body2">
          <strong>Token:</strong> {localStorage.getItem('access_token') ? 'Present' : 'Not found'}
        </Typography>
      </Box>
      {user ? (
        <Box>
          <Typography variant="subtitle1">User Information:</Typography>
          <pre style={{ overflow: 'auto', maxHeight: 300 }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </Box>
      ) : (
        <Typography variant="body2">No user data available</Typography>
      )}
      <Box sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            logger.debug('Auth Debug', {
              user,
              isAuthenticated,
              isLoading,
              hasToken: !!localStorage.getItem('access_token'),
            });
          }}
        >
          Log to Console
        </Button>
      </Box>
    </Paper>
  );
};

export default AuthDebug;
