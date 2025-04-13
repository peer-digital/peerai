import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TeamManagement: React.FC = () => {
  return (
    <Box p={3} sx={{ width: '100%', minWidth: '100%' }}>
      <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.5rem', sm: '2rem' }, mb: 3 }}>
        Team Management
      </Typography>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="body1">
          Team management functionality will be implemented here.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TeamManagement;