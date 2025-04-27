import { createTheme, Theme, ThemeOptions } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

// Define color palette for light mode
const lightPalette = {
  primary: {
    main: '#0F62FE', // IBM Carbon Design System blue
    light: '#4589FF',
    dark: '#0043CE',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#6929C4', // Rich purple for secondary actions
    light: '#8A3FFC',
    dark: '#491D8B',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#DA1E28', // Vibrant red for errors
    light: '#FA4D56',
    dark: '#A2191F',
  },
  warning: {
    main: '#F1C21B', // Clear yellow for warnings
    light: '#FDDC69',
    dark: '#B28600',
  },
  info: {
    main: '#0072C3', // Information blue
    light: '#4589FF',
    dark: '#00539A',
  },
  success: {
    main: '#24A148', // Success green
    light: '#42BE65',
    dark: '#0E8A2E',
  },
  grey: {
    50: '#F4F4F4',
    100: '#E0E0E0',
    200: '#C6C6C6',
    300: '#A8A8A8',
    400: '#8D8D8D',
    500: '#6F6F6F',
    600: '#525252',
    700: '#393939',
    800: '#262626',
    900: '#161616',
  },
  background: {
    default: '#F4F4F4', // Light gray background
    paper: '#FFFFFF',
  },
  text: {
    primary: '#161616',
    secondary: '#525252',
    disabled: '#8D8D8D',
  },
};

// Define color palette for dark mode
const darkPalette = {
  primary: {
    main: '#4589FF', // Lighter blue for dark mode
    light: '#78A9FF',
    dark: '#0043CE',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#8A3FFC', // Lighter purple for dark mode
    light: '#A56EFF',
    dark: '#6929C4',
    contrastText: '#FFFFFF',
  },
  error: {
    main: '#FA4D56', // Brighter red for dark mode
    light: '#FF8389',
    dark: '#DA1E28',
  },
  warning: {
    main: '#FDDC69', // Brighter yellow for dark mode
    light: '#FFF1C2',
    dark: '#F1C21B',
  },
  info: {
    main: '#4589FF', // Brighter blue for dark mode
    light: '#78A9FF',
    dark: '#0072C3',
  },
  success: {
    main: '#42BE65', // Brighter green for dark mode
    light: '#6FDC8C',
    dark: '#24A148',
  },
  grey: {
    50: '#161616',
    100: '#262626',
    200: '#393939',
    300: '#525252',
    400: '#6F6F6F',
    500: '#8D8D8D',
    600: '#A8A8A8',
    700: '#C6C6C6',
    800: '#E0E0E0',
    900: '#F4F4F4',
  },
  background: {
    default: '#161616', // Dark background
    paper: '#262626',
  },
  text: {
    primary: '#F4F4F4',
    secondary: '#C6C6C6',
    disabled: '#6F6F6F',
  },
};

// Get palette based on mode
const getPalette = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === 'light' ? lightPalette : darkPalette),
  },
});

// Typography settings (shared between modes)
const getTypography = (): ThemeOptions => ({
  typography: {
    fontFamily: '"Inter", "IBM Plex Sans", "Helvetica Neue", "Arial", sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.25,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.35,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '0.875rem',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    subtitle2: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      letterSpacing: '0.01em',
    },
    body1: {
      fontSize: '0.875rem',
      letterSpacing: '0.01em',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem',
      letterSpacing: '0.01em',
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      letterSpacing: '0.01em',
      textTransform: 'none' as const,
    },
    caption: {
      fontSize: '0.75rem',
      letterSpacing: '0.01em',
    },
    overline: {
      fontSize: '0.6875rem',
      fontWeight: 500,
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
    },
  },
});

// Component overrides (with mode-specific adjustments)
const getComponents = (mode: PaletteMode): ThemeOptions => ({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '0.25rem',
          fontWeight: 500,
          padding: '0.375rem 0.75rem',
          boxShadow: 'none',
          minHeight: '32px',
          '&:hover': {
            boxShadow: mode === 'light'
              ? '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)'
              : '0 1px 3px 0 rgba(255,255,255,0.05), 0 1px 2px 0 rgba(255,255,255,0.03)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: mode === 'light'
              ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
              : '0 4px 6px -1px rgba(255,255,255,0.05), 0 2px 4px -1px rgba(255,255,255,0.03)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: mode === 'light' ? '#0043CE' : '#78A9FF',
          },
        },
        outlined: {
          borderWidth: '1px',
          '&:hover': {
            borderWidth: '1px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0.375rem',
          boxShadow: mode === 'light'
            ? '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.06)'
            : '0 1px 2px 0 rgba(255,255,255,0.05), 0 1px 1px -1px rgba(255,255,255,0.03)',
          overflow: 'hidden',
          transition: 'box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out',
          '&:hover': {
            boxShadow: mode === 'light'
              ? '0 6px 10px -3px rgba(0,0,0,0.1), 0 3px 4px -2px rgba(0,0,0,0.05)'
              : '0 6px 10px -3px rgba(255,255,255,0.05), 0 3px 4px -2px rgba(255,255,255,0.03)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12px',
          '&:last-child': {
            paddingBottom: '12px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          fontSize: '0.875rem',
        },
        elevation1: {
          boxShadow: mode === 'light'
            ? '0 1px 2px 0 rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.05)'
            : '0 1px 2px 0 rgba(255,255,255,0.05), 0 1px 1px -1px rgba(255,255,255,0.02)',
        },
        elevation2: {
          boxShadow: mode === 'light'
            ? '0 3px 5px -1px rgba(0,0,0,0.1), 0 1px 3px -1px rgba(0,0,0,0.05)'
            : '0 3px 5px -1px rgba(255,255,255,0.05), 0 1px 3px -1px rgba(255,255,255,0.02)',
        },
        elevation3: {
          boxShadow: mode === 'light'
            ? '0 8px 12px -3px rgba(0,0,0,0.1), 0 3px 5px -2px rgba(0,0,0,0.05)'
            : '0 8px 12px -3px rgba(255,255,255,0.05), 0 3px 5px -2px rgba(255,255,255,0.02)',
        },
        elevation4: {
          boxShadow: mode === 'light'
            ? '0 16px 20px -5px rgba(0,0,0,0.1), 0 8px 8px -5px rgba(0,0,0,0.04)'
            : '0 16px 20px -5px rgba(255,255,255,0.05), 0 8px 8px -5px rgba(255,255,255,0.02)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.25rem',
            fontSize: '0.875rem',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: mode === 'light' ? '#0F62FE' : '#4589FF',
            },
          },
          '& .MuiInputBase-root': {
            '& input': {
              padding: '8px 12px',
            },
            '& textarea': {
              padding: '8px 12px',
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.875rem',
            transform: 'translate(12px, 9px) scale(1)',
            '&.MuiInputLabel-shrink': {
              transform: 'translate(12px, -6px) scale(0.75)',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: mode === 'light' ? '1px solid #E0E0E0' : '1px solid #393939',
          padding: '0.5rem 0.75rem',
          fontSize: '0.8125rem',
        },
        head: {
          fontWeight: 600,
          backgroundColor: mode === 'light' ? '#F4F4F4' : '#262626',
          padding: '0.5rem 0.75rem',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(15, 98, 254, 0.04)' : 'rgba(69, 137, 255, 0.08)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '0.25rem',
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minWidth: 'auto',
          padding: '0.5rem 1rem',
          minHeight: '40px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          marginLeft: 8,
          marginRight: 8,
          '& .MuiSwitch-root': {
            marginRight: 8
          }
        }
      }
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          '& .MuiSwitch-switchBase': {
            padding: 0,
            margin: 2,
            transitionDuration: '300ms',
            '&.Mui-checked': {
              transform: 'translateX(16px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                backgroundColor: mode === 'light' ? '#0F62FE' : '#4589FF',
                opacity: 1,
                border: 0,
              },
              '&.Mui-disabled + .MuiSwitch-track': {
                opacity: 0.5,
              },
            },
            '&.Mui-focusVisible .MuiSwitch-thumb': {
              color: '#33cf4d',
              border: '6px solid #fff',
            },
            '&.Mui-disabled .MuiSwitch-thumb': {
              color: mode === 'light' ? '#E0E0E0' : '#393939',
            },
            '&.Mui-disabled + .MuiSwitch-track': {
              opacity: mode === 'light' ? 0.7 : 0.3,
            },
          },
          '& .MuiSwitch-thumb': {
            boxSizing: 'border-box',
            width: 22,
            height: 22,
          },
          '& .MuiSwitch-track': {
            borderRadius: 26 / 2,
            backgroundColor: mode === 'light' ? '#E0E0E0' : '#393939',
            opacity: 1,
          },
        },
      },
    },
    // Fix for the drawer overlay issue
    MuiDrawer: {
      styleOverrides: {
        root: {
          // Fix for the css-1so0oxj class
          '&.MuiDrawer-root.MuiDrawer-modal.MuiModal-root.css-1so0oxj-MuiModal-root-MuiDrawer-root': {
            position: 'fixed',
            zIndex: 1200, // Use a fixed value instead of theme.zIndex.drawer (which is 1200)
            '&[aria-hidden="true"]': {
              display: 'none',
              zIndex: -1,
            },
          },
        },
        paper: {
          boxShadow: mode === 'light'
            ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
            : '0 4px 6px -1px rgba(255,255,255,0.05), 0 2px 4px -1px rgba(255,255,255,0.03)',
        },
      },
    },
    // Fix for the modal backdrop
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.7)',
          '&.MuiBackdrop-invisible': {
            backgroundColor: 'transparent',
          },
          '&[aria-hidden="true"]': {
            display: 'none',
          },
        },
      },
    },
    // Fix for menu and popover components
    MuiPopover: {
      defaultProps: {
        disableScrollLock: true,
        keepMounted: false,
      },
      styleOverrides: {
        root: {
          '&[aria-hidden="true"]': {
            display: 'none',
            zIndex: -1,
          },
        },
        paper: {
          boxShadow: mode === 'light'
            ? '0 3px 16px rgba(0, 0, 0, 0.12)'
            : '0 3px 16px rgba(0, 0, 0, 0.4)',
          borderRadius: '6px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
        keepMounted: false,
      },
      styleOverrides: {
        root: {
          '& .MuiBackdrop-root': {
            cursor: 'pointer',
          },
        },
        paper: {
          marginTop: '6px',
        },
        list: {
          padding: '4px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          minHeight: '32px',
          padding: '4px 12px',
        },
      },
    },
    // Global scrollbar styling based on theme mode
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': {
          width: '6px',
          height: '6px',
          backgroundColor: 'transparent',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
          borderRadius: '8px',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          transition: 'background-color 0.3s ease',
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.25)',
          },
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: `${mode === 'light' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.15)'} transparent`,
        },
        // Auto-hide scrollbars for elements with overflow
        'div, section, article, aside, nav, main': {
          scrollbarWidth: 'thin',
          transition: 'scrollbar-width 0.3s ease',
        },
        'div:not(:hover):not(:focus-within):not(.always-show-scrollbar), section:not(:hover):not(:focus-within):not(.always-show-scrollbar), article:not(:hover):not(:focus-within):not(.always-show-scrollbar), aside:not(:hover):not(:focus-within):not(.always-show-scrollbar), nav:not(:hover):not(:focus-within):not(.always-show-scrollbar), main:not(:hover):not(:focus-within):not(.always-show-scrollbar)': {
          scrollbarWidth: 'none',
        },
        'div:not(:hover):not(:focus-within):not(.always-show-scrollbar)::-webkit-scrollbar, section:not(:hover):not(:focus-within):not(.always-show-scrollbar)::-webkit-scrollbar, article:not(:hover):not(:focus-within):not(.always-show-scrollbar)::-webkit-scrollbar, aside:not(:hover):not(:focus-within):not(.always-show-scrollbar)::-webkit-scrollbar, nav:not(:hover):not(:focus-within):not(.always-show-scrollbar)::-webkit-scrollbar, main:not(:hover):not(:focus-within):not(.always-show-scrollbar)::-webkit-scrollbar': {
          width: '0',
          height: '0',
          background: 'transparent',
        },
      },
    },
  },
});

// Create theme function that accepts a mode parameter
export const createAppTheme = (mode: PaletteMode): Theme => {
  // Create the base theme
  const baseTheme = createTheme({
    ...getPalette(mode),
    ...getTypography(),
    shape: {
      borderRadius: 4,
    },
    ...getComponents(mode),
  });

  // Apply global styles
  // Add custom overrides for MuiToolbar to make it more compact
  const updatedTheme = {
    ...baseTheme,
    components: {
      ...baseTheme.components,
      MuiToolbar: {
        ...baseTheme.components?.MuiToolbar,
        styleOverrides: {
          ...baseTheme.components?.MuiToolbar?.styleOverrides,
          root: {
            minHeight: '56px',
            '@media (min-width:600px)': {
              minHeight: '56px',
            },
          },
          dense: {
            minHeight: '48px',
            '@media (min-width:600px)': {
              minHeight: '48px',
            },
          },
        },
      },
    },
  };

  return updatedTheme;
};

// Default theme (light mode)
const theme = createAppTheme('light');

export default theme;