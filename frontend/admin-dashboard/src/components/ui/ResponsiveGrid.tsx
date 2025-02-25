import React, { ReactNode } from 'react';
import { Grid, GridProps } from '@mui/material';

// Props interface
interface ResponsiveGridProps extends Omit<GridProps, 'container'> {
  children: ReactNode;
  spacing?: number | { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  columns?: number;
}

/**
 * ResponsiveGrid component for creating responsive grid layouts
 * Automatically adjusts item sizes based on screen size
 */
const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  spacing = { xs: 2, sm: 3, md: 4 },
  columns = 12,
  ...props
}) => {
  // Calculate responsive spacing
  const getSpacing = () => {
    if (typeof spacing === 'number') {
      return spacing;
    }
    
    return {
      xs: spacing.xs || 2,
      sm: spacing.sm || 3,
      md: spacing.md || 4,
      lg: spacing.lg || 4,
      xl: spacing.xl || 4,
    };
  };

  return (
    <Grid 
      container 
      spacing={getSpacing()}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        
        // Default responsive column sizes
        const defaultItemProps = {
          xs: 12,
          sm: 6,
          md: 4,
          lg: 3,
        };
        
        // Merge default props with any existing props on the child
        return React.cloneElement(child, {
          item: true,
          ...defaultItemProps,
          ...child.props,
        });
      })}
    </Grid>
  );
};

export default ResponsiveGrid; 