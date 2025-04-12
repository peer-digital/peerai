import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useThemeContext } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  /**
   * Optional tooltip position
   */
  tooltipPlacement?: 'top' | 'right' | 'bottom' | 'left';

  /**
   * Optional size for the icon button
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Optional color for the icon
   */
  color?: 'inherit' | 'primary' | 'secondary' | 'default' | 'error' | 'info' | 'success' | 'warning';

  /**
   * Optional margin right for spacing
   */
  marginRight?: number | string;
}

/**
 * ThemeToggle component for switching between light and dark mode
 * Uses the ThemeContext to manage theme state
 */
const ThemeToggle: React.FC<ThemeToggleProps> = ({
  tooltipPlacement = 'bottom',
  size = 'medium',
  color = 'inherit',
  marginRight = 2
}) => {
  const { toggleColorMode, isDarkMode } = useThemeContext();
  const theme = useTheme();

  return (
    <Tooltip
      title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      placement={tooltipPlacement}
      arrow
    >
      <IconButton
        onClick={toggleColorMode}
        color={color}
        size={size}
        aria-label="toggle theme"
        sx={{
          transition: 'transform 0.3s ease-in-out',
          marginRight: marginRight,
          '&:hover': {
            transform: 'rotate(12deg)',
          },
          // Add a subtle background in dark mode for better visibility
          ...(isDarkMode && {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              transform: 'rotate(12deg)',
            },
          }),
        }}
      >
        {isDarkMode ? (
          <Brightness7Icon
            sx={{
              // Use a light color in dark mode for better contrast
              color: '#FFFFFF',
            }}
          />
        ) : (
          <Brightness4Icon
            sx={{
              // Use a dark color in light mode for better contrast
              color: theme.palette.grey[700],
            }}
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;