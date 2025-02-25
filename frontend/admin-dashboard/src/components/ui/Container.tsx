import React, { ReactNode } from 'react';
import { Box, BoxProps, useTheme, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

// Custom type for maxWidth property
type CustomMaxWidth = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;

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
    padding: theme.spacing(4),
  },
}));

// Props interface for Container component
interface ContainerProps extends Omit<BoxProps, 'maxWidth'> {
  children: ReactNode;
  maxWidth?: CustomMaxWidth;
  disableGutters?: boolean;
  fixed?: boolean;
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
  ...props
}) => {
  const theme = useTheme();
  // Calculate the max width based on the provided prop
  const getMaxWidth = () => {
    if (maxWidth === false) return '100%';
    return theme.breakpoints.values[maxWidth];
  };

  return (
    <StyledContainer
      maxWidth={getMaxWidth()}
      sx={{
        maxWidth: getMaxWidth(),
        padding: disableGutters ? 0 : undefined,
        ...(fixed && {
          [theme.breakpoints.up('sm')]: {
            maxWidth: `${theme.breakpoints.values[maxWidth as Exclude<CustomMaxWidth, false>]}px`,
          },
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