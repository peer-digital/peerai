import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const TestConfigForm: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Test Configuration Form
        </Typography>
        <Typography variant="body1">
          This is a placeholder for the test configuration form.
        </Typography>
      </Paper>
    </Box>
  );
};

export default TestConfigForm;
