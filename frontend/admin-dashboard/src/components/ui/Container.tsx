import React, { ReactNode } from 'react';
import { Box, BoxProps, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

// Custom type for maxWidth property
type CustomMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | false;

// Extended breakpoint values including xxl
const extendedBreakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1536,
  xxl: 1920,
};

// Styled container component with responsive padding
const StyledContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  marginLeft: 'auto',
  marginRight: 'auto',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(3),
  },
  [theme.breakpoints.up('lg')]: {
    padding: theme.spacing(4),
  },
}));

// Props interface for Container component
interface ContainerProps extends Omit<BoxProps, 'maxWidth'> {
  children: ReactNode;
  maxWidth?: CustomMaxWidth;
  disableGutters?: boolean;
  fixed?: boolean;
  fullHeight?: boolean;
}

/**
 * Container component that provides consistent padding and max-width
 * Adapts to different screen sizes for responsive layouts
 */
const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'lg',
  disableGutters = false,
  fixed = false,
  fullHeight = false,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Calculate the max width based on the provided prop
  const getMaxWidth = () => {
    if (maxWidth === false) return '100%';
    
    // Use extended breakpoints for xxl
    if (maxWidth === 'xxl') return `${extendedBreakpoints.xxl}px`;
    
    return theme.breakpoints.values[maxWidth as keyof typeof theme.breakpoints.values];
  };

  return (
    <StyledContainer
      maxWidth={getMaxWidth()}
      sx={{
        maxWidth: getMaxWidth(),
        padding: disableGutters ? 0 : undefined,
        height: fullHeight ? '100%' : 'auto',
        ...(fixed && {
          [theme.breakpoints.up('sm')]: {
            maxWidth: maxWidth === 'xxl' 
              ? `${extendedBreakpoints.xxl}px` 
              : `${theme.breakpoints.values[maxWidth as Exclude<CustomMaxWidth, 'xxl' | false>]}px`,
          },
        }),
        // Adjust padding for better mobile experience
        ...(isMobile && !disableGutters && {
          px: 2,
          py: 2,
        }),
        ...props.sx,
      }}
      {...props}
    >
      {children}
    </StyledContainer>
  );
};

export default Container;
export type { ContainerProps, CustomMaxWidth }; 