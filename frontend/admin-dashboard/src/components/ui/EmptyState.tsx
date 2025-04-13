import React, { ReactNode } from 'react';
import { Box, Typography, Button, styled } from '@mui/material';
import { SvgIconComponent } from '@mui/icons-material';

// Styled components
const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  textAlign: 'center',
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius * 2,
  minHeight: 200,
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  color: theme.palette.grey[400],
  '& svg': {
    fontSize: 64,
  },
}));

// Props interface
export interface EmptyStateProps {
  icon?: ReactNode | SvgIconComponent;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  compact?: boolean;
}

// EmptyState component
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  compact = false,
}) => {
  const Icon = icon as SvgIconComponent;

  return (
    <EmptyStateContainer sx={{ py: compact ? 3 : 6 }}>
      {icon && (
        <IconWrapper>
          {React.isValidElement(icon) ? (
            icon
          ) : Icon ? (
            <Icon fontSize="inherit" />
          ) : null}
        </IconWrapper>
      )}

      <Typography
        variant={compact ? "h6" : "h5"}
        component="h3"
        color="textPrimary"
        gutterBottom
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ maxWidth: 400, mb: actionText ? 3 : 0 }}
        >
          {description}
        </Typography>
      )}

      {actionText && onAction && (
        <Button
          variant="contained"
          color="primary"
          onClick={onAction}
          size={compact ? "small" : "medium"}
        >
          {actionText}
        </Button>
      )}
    </EmptyStateContainer>
  );
};

export default EmptyState;