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
}

/**
 * ThemeToggle component for switching between light and dark mode
 * Uses the ThemeContext to manage theme state
 */
const ThemeToggle: React.FC<ThemeToggleProps> = ({
  tooltipPlacement = 'bottom',
  size = 'medium',
  color = 'inherit'
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
          '&:hover': {
            transform: 'rotate(12deg)',
          },
        }}
      >
        {isDarkMode ? (
          <Brightness7Icon 
            sx={{ 
              color: theme.palette.grey[100],
            }} 
          />
        ) : (
          <Brightness4Icon 
            sx={{ 
              color: theme.palette.grey[700],
            }} 
          />
        )}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle; 