import React from 'react';
import { Box, Typography } from '@mui/material';
import { PageContainer, SectionContainer } from '../components/ui';
import { useBreadcrumbsUpdate } from '../hooks/useBreadcrumbsUpdate';

const TeamManagement: React.FC = () => {
  // Set breadcrumbs for this page
  useBreadcrumbsUpdate([
    { label: 'Team Management' }
  ]);

  return (
    <PageContainer>
      <SectionContainer>
        <Typography variant="body1">
          Team management functionality will be implemented here.
        </Typography>
      </SectionContainer>
    </PageContainer>
  );
};

export default TeamManagement;