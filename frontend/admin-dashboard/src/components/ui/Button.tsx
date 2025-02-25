import React from 'react';
import { 
  Button as MuiButton, 
  ButtonProps as MuiButtonProps, 
  CircularProgress,
  styled
} from '@mui/material';

// Styled components
const StyledButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  fontWeight: 500,
  boxShadow: 'none',
  textTransform: 'none',
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  },
  '&:active': {
    transform: 'translateY(0)',
  },
  '&.MuiButton-contained': {
    '&.Mui-disabled': {
      backgroundColor: theme.palette.action.disabledBackground,
      color: theme.palette.action.disabled,
    },
  },
}));

// Props interface
export interface ButtonProps extends MuiButtonProps {
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
}

// Button component
export const Button: React.FC<ButtonProps> = ({
  children,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'start',
  startIcon,
  endIcon,
  ...rest
}) => {
  // Determine which icon props to use
  const finalStartIcon = iconPosition === 'start' ? icon || startIcon : startIcon;
  const finalEndIcon = iconPosition === 'end' ? icon || endIcon : endIcon;

  return (
    <StyledButton
      disabled={disabled || loading}
      startIcon={!loading && finalStartIcon}
      endIcon={!loading && finalEndIcon}
      {...rest}
    >
      {loading ? (
        <>
          <CircularProgress
            size={24}
            thickness={4}
            sx={{
              color: 'inherit',
              position: 'absolute',
              left: '50%',
              marginLeft: '-12px',
            }}
          />
          <span style={{ visibility: 'hidden' }}>{children}</span>
        </>
      ) : (
        children
      )}
    </StyledButton>
  );
};

export default Button; 