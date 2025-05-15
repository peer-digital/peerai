import React from 'react';
import { Box, useTheme } from '@mui/material';
import { getIconComponent } from '../../utils/iconMapping';

interface AppTemplateIconProps {
  iconType?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'gradient' | 'glass' | 'outlined';
  color?: string;
}

/**
 * A polished, crafted icon component for app templates
 * Provides multiple variants and sizes with consistent styling
 */
const AppTemplateIcon: React.FC<AppTemplateIconProps> = ({
  iconType,
  size = 'medium',
  variant = 'gradient',
  color
}) => {
  const theme = useTheme();
  const IconComponent = getIconComponent(iconType);

  // Determine icon size based on the size prop
  const getIconSize = () => {
    switch (size) {
      case 'small': return 30;
      case 'large': return 50; // Adjusted for app-like square appearance
      default: return 40;
    }
  };

  // Determine container size based on the size prop
  const getContainerSize = () => {
    switch (size) {
      case 'small': return 60;
      case 'large': return 100; // Adjusted for square-like appearance
      default: return 80;
    }
  };

  // Get the primary color to use (from props or theme)
  const primaryColor = color || theme.palette.primary.main;

  // Get the appropriate styles based on the variant
  const getVariantStyles = () => {
    const containerSize = getContainerSize();

    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: containerSize,
      height: containerSize,
      borderRadius: '22%', // Changed from 50% (circle) to 22% (rounded square)
      position: 'relative' as const,
      overflow: 'hidden',
      zIndex: 0
    };

    switch (variant) {
      case 'gradient':
        return {
          ...baseStyles,
          background: `linear-gradient(135deg,
            ${theme.palette.mode === 'dark'
              ? `rgba(${hexToRgb(primaryColor)}, 0.25) 0%, rgba(${hexToRgb(primaryColor)}, 0.15) 100%`
              : `rgba(${hexToRgb(primaryColor)}, 0.18) 0%, rgba(${hexToRgb(primaryColor)}, 0.08) 100%`})`,
          boxShadow: theme.palette.mode === 'dark'
            ? `0 8px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
            : `0 8px 16px rgba(${hexToRgb(primaryColor)}, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)`,
          border: theme.palette.mode === 'dark'
            ? `1px solid rgba(${hexToRgb(primaryColor)}, 0.25)`
            : `1px solid rgba(${hexToRgb(primaryColor)}, 0.15)`,
        };

      case 'glass':
        return {
          ...baseStyles,
          background: theme.palette.mode === 'dark'
            ? `rgba(${hexToRgb(primaryColor)}, 0.12)`
            : `rgba(${hexToRgb(primaryColor)}, 0.06)`,
          backdropFilter: 'blur(10px)',
          boxShadow: theme.palette.mode === 'dark'
            ? `0 8px 20px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
            : `0 8px 20px rgba(${hexToRgb(primaryColor)}, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
          border: theme.palette.mode === 'dark'
            ? `1px solid rgba(${hexToRgb(primaryColor)}, 0.25)`
            : `1px solid rgba(${hexToRgb(primaryColor)}, 0.15)`,
        };

      case 'outlined':
        return {
          ...baseStyles,
          background: 'transparent',
          border: `2px solid ${primaryColor}`,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 12px rgba(0, 0, 0, 0.15)'
            : `0 4px 12px rgba(${hexToRgb(primaryColor)}, 0.08)`,
        };

      default:
        return {
          ...baseStyles,
          background: theme.palette.mode === 'dark'
            ? `rgba(${hexToRgb(primaryColor)}, 0.12)`
            : `rgba(${hexToRgb(primaryColor)}, 0.06)`,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 4px 12px rgba(0, 0, 0, 0.1)'
            : '0 4px 12px rgba(0, 0, 0, 0.05)',
        };
    }
  };

  return (
    <Box sx={getVariantStyles()}>
      {variant === 'gradient' && (
        <Box
          sx={{
            position: 'absolute',
            width: '140%',
            height: '140%',
            top: '-20%',
            left: '-20%',
            background: `radial-gradient(ellipse at center,
              ${theme.palette.mode === 'dark'
                ? `rgba(${hexToRgb(primaryColor)}, 0.15) 0%, rgba(${hexToRgb(primaryColor)}, 0.05) 40%, rgba(0, 0, 0, 0) 70%`
                : `rgba(${hexToRgb(primaryColor)}, 0.08) 0%, rgba(${hexToRgb(primaryColor)}, 0.03) 40%, rgba(255, 255, 255, 0) 70%`})`,
            zIndex: -1
          }}
        />
      )}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 1
        }}
      >
        <IconComponent
          sx={{
            fontSize: getIconSize(),
            color: primaryColor,
            filter: theme.palette.mode === 'dark'
              ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
              : `drop-shadow(0 2px 4px rgba(${hexToRgb(primaryColor)}, 0.2))`,
            position: 'relative',
            top: 0, // Ensure icon is perfectly centered
            transform: 'scale(1.1)' // Slightly larger icon for better app-like appearance
          }}
        />
      </Box>
    </Box>
  );
};

// Helper function to convert hex color to RGB
const hexToRgb = (hex: string): string => {
  // Remove the hash if it exists
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `${r}, ${g}, ${b}`;
};

export default AppTemplateIcon;
