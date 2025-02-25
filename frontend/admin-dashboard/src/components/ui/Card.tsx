import React, { ReactNode } from 'react';
import {
  Card as MuiCard,
  CardProps as MuiCardProps,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Divider,
  Box
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled Card component with consistent styling
const StyledCard = styled(MuiCard)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out',
  overflow: 'hidden',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

// Props interface for Card component
interface CardProps extends MuiCardProps {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  elevation?: number;
  noPadding?: boolean;
  fullHeight?: boolean;
  variant?: 'outlined' | 'elevation';
  contentSx?: React.CSSProperties;
}

/**
 * Card component with consistent styling and flexible layout options
 * Provides header, content, and footer sections
 */
const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerAction,
  children,
  footer,
  elevation = 1,
  noPadding = false,
  fullHeight = true,
  variant = 'elevation',
  contentSx,
  ...props
}) => {
  const hasHeader = title || subtitle || headerAction;
  const hasFooter = footer !== undefined;

  return (
    <StyledCard
      elevation={variant === 'outlined' ? 0 : elevation}
      variant={variant}
      sx={{
        height: fullHeight ? '100%' : 'auto',
        ...props.sx,
      }}
      {...props}
    >
      {hasHeader && (
        <>
          <CardHeader
            title={title && <Typography variant="h6">{title}</Typography>}
            subheader={subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            action={headerAction}
            sx={{ pb: subtitle ? 1 : 0 }}
          />
          <Divider />
        </>
      )}

      <CardContent
        sx={{
          flexGrow: 1,
          padding: noPadding ? '0 !important' : undefined,
          '&:last-child': { paddingBottom: noPadding ? '0 !important' : undefined },
          ...contentSx,
        }}
      >
        {children}
      </CardContent>

      {hasFooter && (
        <>
          <Divider />
          <CardActions>
            <Box sx={{ width: '100%' }}>{footer}</Box>
          </CardActions>
        </>
      )}
    </StyledCard>
  );
};

export default Card; 