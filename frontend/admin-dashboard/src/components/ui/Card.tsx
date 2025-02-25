import React, { ReactNode } from 'react';
import { 
  Card as MuiCard, 
  CardContent, 
  CardHeader, 
  CardProps as MuiCardProps, 
  Typography, 
  Box,
  Divider,
  IconButton,
  Skeleton,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled components
const StyledCard = styled(MuiCard)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: theme.shape.borderRadius * 2,
  transition: 'box-shadow 0.3s ease-in-out, transform 0.2s ease-in-out',
  '&:hover': {
    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
  },
}));

const StyledCardHeader = styled(CardHeader)(({ theme }) => ({
  padding: theme.spacing(2, 3),
}));

const StyledCardContent = styled(CardContent)(({ theme }) => ({
  padding: theme.spacing(2, 3),
  flexGrow: 1,
  '&:last-child': {
    paddingBottom: theme.spacing(3),
  },
}));

// Props interface
export interface CardProps extends Omit<MuiCardProps, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  noPadding?: boolean;
  headerDivider?: boolean;
  minHeight?: number | string;
  children: ReactNode;
}

// Card component
export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  loading = false,
  noPadding = false,
  headerDivider = false,
  minHeight,
  children,
  ...rest
}) => {
  const theme = useTheme();

  // Loading state
  if (loading) {
    return (
      <StyledCard {...rest} sx={{ minHeight, ...rest.sx }}>
        {(title || subtitle || action) && (
          <>
            <StyledCardHeader
              title={<Skeleton variant="text" width="60%" height={28} />}
              subheader={subtitle && <Skeleton variant="text" width="40%" height={20} />}
              action={action && <Skeleton variant="circular" width={32} height={32} />}
            />
            {headerDivider && <Divider />}
          </>
        )}
        <StyledCardContent sx={{ padding: noPadding ? 0 : undefined }}>
          <Box sx={{ p: noPadding ? 0 : 2 }}>
            <Skeleton variant="rectangular" height={100} />
            <Box sx={{ mt: 2 }}>
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
            </Box>
          </Box>
        </StyledCardContent>
      </StyledCard>
    );
  }

  return (
    <StyledCard {...rest} sx={{ minHeight, ...rest.sx }}>
      {(title || subtitle || action) && (
        <>
          <StyledCardHeader
            title={
              typeof title === 'string' ? (
                <Typography variant="h6" color="textPrimary" fontWeight={600}>
                  {title}
                </Typography>
              ) : (
                title
              )
            }
            subheader={
              typeof subtitle === 'string' ? (
                <Typography variant="body2" color="textSecondary">
                  {subtitle}
                </Typography>
              ) : (
                subtitle
              )
            }
            action={action}
          />
          {headerDivider && <Divider />}
        </>
      )}
      <StyledCardContent sx={{ padding: noPadding ? 0 : undefined }}>
        {children}
      </StyledCardContent>
    </StyledCard>
  );
};

export default Card; 