import React, { ReactNode } from 'react';
import { Grid, GridProps, Box, useTheme, useMediaQuery } from '@mui/material';

// Props interface
export interface ResponsiveGridProps extends Omit<GridProps, 'container' | 'spacing'> {
  children: ReactNode;
  spacing?: number;
  mdSpacing?: number;
  smSpacing?: number;
  xsSpacing?: number;
  minChildWidth?: number | string;
  childWidth?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

// ResponsiveGrid component
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  spacing = 3,
  mdSpacing,
  smSpacing,
  xsSpacing,
  minChildWidth,
  childWidth,
  ...rest
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Calculate responsive spacing
  const responsiveSpacing = {
    xs: xsSpacing !== undefined ? xsSpacing : isMobile ? Math.max(1, spacing - 2) : spacing,
    sm: smSpacing !== undefined ? smSpacing : Math.max(1, spacing - 1),
    md: mdSpacing !== undefined ? mdSpacing : spacing,
  };
  
  // Calculate responsive column widths
  const getResponsiveWidth = () => {
    if (childWidth) {
      return childWidth;
    }
    
    if (minChildWidth) {
      // Convert minChildWidth to a number if it's a string with px
      const minWidth = typeof minChildWidth === 'string' && minChildWidth.endsWith('px')
        ? parseInt(minChildWidth, 10)
        : minChildWidth;
        
      // Calculate columns based on minChildWidth
      if (typeof minWidth === 'number') {
        return {
          xs: 12,
          sm: minWidth <= 200 ? 6 : 12,
          md: minWidth <= 300 ? 4 : minWidth <= 400 ? 6 : 12,
          lg: minWidth <= 200 ? 3 : minWidth <= 300 ? 4 : minWidth <= 400 ? 6 : 12,
        };
      }
    }
    
    // Default responsive widths
    return {
      xs: 12,
      sm: 6,
      md: 4,
      lg: 3,
    };
  };
  
  const responsiveWidth = getResponsiveWidth();
  
  return (
    <Grid container spacing={responsiveSpacing} {...rest}>
      {React.Children.map(children, (child) => (
        <Grid
          item
          xs={responsiveWidth.xs}
          sm={responsiveWidth.sm}
          md={responsiveWidth.md}
          lg={responsiveWidth.lg}
          xl={responsiveWidth.xl}
        >
          {child}
        </Grid>
      ))}
    </Grid>
  );
};

export default ResponsiveGrid; 