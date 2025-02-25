import React, { ReactNode } from 'react';
import { Box, BoxProps, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components
const StyledContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    paddingLeft: theme.spacing(3),
    paddingRight: theme.spacing(3),
  },
  [theme.breakpoints.up('md')]: {
    paddingLeft: theme.spacing(4),
    paddingRight: theme.spacing(4),
  },
  [theme.breakpoints.up('lg')]: {
    paddingLeft: theme.spacing(5),
    paddingRight: theme.spacing(5),
    maxWidth: '1200px',
  },
}));

// Custom type for maxWidth
type CustomMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;

// Props interface
export interface ContainerProps extends Omit<BoxProps, 'maxWidth'> {
  children: ReactNode;
  maxWidth?: CustomMaxWidth;
  disableGutters?: boolean;
  fixed?: boolean;
}

// Container component
export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  fixed = false,
  ...rest
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Calculate max width based on the prop
  const getMaxWidth = () => {
    if (maxWidth === false) return '100%';
    
    const maxWidthValues = {
      xs: '444px',
      sm: '600px',
      md: '900px',
      lg: '1200px',
      xl: '1536px',
    };
    
    return maxWidthValues[maxWidth] || '1200px';
  };
  
  return (
    <StyledContainer
      sx={{
        maxWidth: getMaxWidth(),
        paddingLeft: disableGutters ? 0 : undefined,
        paddingRight: disableGutters ? 0 : undefined,
        position: fixed ? 'relative' : undefined,
        ...rest.sx,
      }}
      {...rest}
    >
      {children}
    </StyledContainer>
  );
};

export default Container; 