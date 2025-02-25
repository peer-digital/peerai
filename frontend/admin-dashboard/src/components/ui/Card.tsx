import React, { ReactNode } from 'react';
import {
  Card as MuiCard,
  CardProps as MuiCardProps,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Divider,
  Box,
  useTheme,
  useMediaQuery
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
  [theme.breakpoints.up('md')]: {
    borderRadius: theme.shape.borderRadius * 1.5,
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
  compact?: boolean;
  hoverable?: boolean;
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
  compact = false,
  hoverable = true,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const hasHeader = title || subtitle || headerAction;
  const hasFooter = footer !== undefined;

  return (
    <StyledCard
      elevation={variant === 'outlined' ? 0 : elevation}
      variant={variant}
      sx={{
        height: fullHeight ? '100%' : 'auto',
        boxShadow: theme.shadows[elevation],
        '&:hover': hoverable ? {
          boxShadow: theme.shadows[elevation + 2],
          transform: 'translateY(-2px)',
        } : undefined,
        ...props.sx,
      }}
      {...props}
    >
      {hasHeader && (
        <>
          <CardHeader
            title={title && (
              <Typography 
                variant={compact ? "subtitle1" : "h6"} 
                fontWeight={compact ? 500 : 600}
                sx={{ 
                  fontSize: compact ? '1rem' : undefined,
                  lineHeight: compact ? 1.4 : undefined,
                }}
              >
                {title}
              </Typography>
            )}
            subheader={subtitle && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: compact ? '0.75rem' : '0.875rem',
                  mt: compact ? 0.5 : 1,
                }}
              >
                {subtitle}
              </Typography>
            )}
            action={headerAction}
            sx={{ 
              pb: subtitle ? 1 : 0,
              pt: compact ? 1.5 : 2,
              px: compact ? 2 : (isMobile ? 2 : 3),
            }}
          />
          <Divider />
        </>
      )}

      <CardContent
        sx={{
          flexGrow: 1,
          padding: noPadding ? '0 !important' : (compact ? '12px !important' : (isMobile ? '16px !important' : '24px !important')),
          '&:last-child': { paddingBottom: noPadding ? '0 !important' : (compact ? '12px !important' : (isMobile ? '16px !important' : '24px !important')) },
          ...contentSx,
        }}
      >
        {children}
      </CardContent>

      {hasFooter && (
        <>
          <Divider />
          <CardActions sx={{ 
            padding: compact ? '8px 12px' : (isMobile ? '8px 16px' : '12px 24px'),
          }}>
            <Box sx={{ width: '100%' }}>{footer}</Box>
          </CardActions>
        </>
      )}
    </StyledCard>
  );
};

export default Card; 