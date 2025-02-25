import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';
import { createAppTheme } from '../theme/theme';

// Define the context type
interface ThemeContextType {
  mode: PaletteMode;
  toggleColorMode: () => void;
  isDarkMode: boolean;
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  isDarkMode: false,
});

// Custom hook to use the theme context
export const useThemeContext = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Try to get the saved theme mode from localStorage
  const getSavedMode = (): PaletteMode => {
    try {
      const savedMode = localStorage.getItem('themeMode');
      return (savedMode === 'dark' || savedMode === 'light') ? savedMode : 'light';
    } catch (error) {
      // In case of any issues with localStorage
      console.error('Error accessing localStorage:', error);
      return 'light';
    }
  };

  // State to track the current theme mode
  const [mode, setMode] = useState<PaletteMode>(getSavedMode);
  
  // Create the theme based on the current mode
  const theme = createAppTheme(mode);
  
  // Function to toggle between light and dark mode
  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      // Save the new mode to localStorage
      try {
        localStorage.setItem('themeMode', newMode);
      } catch (error) {
        console.error('Error saving theme mode to localStorage:', error);
      }
      return newMode;
    });
  };

  // Effect to handle system preference changes
  useEffect(() => {
    // Check if user has a saved preference
    const savedMode = localStorage.getItem('themeMode');
    
    // If no saved preference, listen for system preference changes
    if (!savedMode) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Set initial mode based on system preference
      if (mediaQuery.matches) {
        setMode('dark');
      }
      
      // Update mode when system preference changes
      const handleChange = (e: MediaQueryListEvent) => {
        setMode(e.matches ? 'dark' : 'light');
      };
      
      // Add event listener
      mediaQuery.addEventListener('change', handleChange);
      
      // Clean up
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, []);

  // Context value
  const contextValue: ThemeContextType = {
    mode,
    toggleColorMode,
    isDarkMode: mode === 'dark',
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 