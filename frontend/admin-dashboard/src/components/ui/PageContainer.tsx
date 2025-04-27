import React, { ReactNode } from 'react';
import { Box, BoxProps, Paper, PaperProps } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled container with consistent padding and width
const StyledPageContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  minWidth: '100%',
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

// Styled section container with consistent styling
const StyledSectionContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

// Props interface for PageContainer
export interface PageContainerProps extends BoxProps {
  children: ReactNode;
}

// Props interface for SectionContainer
export interface SectionContainerProps extends PaperProps {
  children: ReactNode;
}

/**
 * PageContainer component that provides consistent padding and width for all pages
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  ...props
}) => {
  return (
    <StyledPageContainer {...props}>
      {children}
    </StyledPageContainer>
  );
};

/**
 * SectionContainer component that provides consistent styling for page sections
 */
export const SectionContainer: React.FC<SectionContainerProps> = ({
  children,
  ...props
}) => {
  return (
    <StyledSectionContainer {...props}>
      {children}
    </StyledSectionContainer>
  );
};
