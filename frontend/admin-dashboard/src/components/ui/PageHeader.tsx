import React, { ReactNode } from 'react';
import { 
  Box, 
  Typography, 
  Breadcrumbs, 
  Link, 
  Divider,
  Skeleton,
  styled
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// Styled components
const HeaderContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
}));

const TitleRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: theme.spacing(2),
  },
}));

const ActionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    justifyContent: 'flex-end',
  },
}));

// Interface for breadcrumb items
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Props interface
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  loading?: boolean;
  divider?: boolean;
}

// PageHeader component
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  loading = false,
  divider = true,
}) => {
  return (
    <HeaderContainer>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs 
          separator={<NavigateNextIcon fontSize="small" />} 
          aria-label="breadcrumb"
          sx={{ mb: 1 }}
        >
          {loading ? (
            <>
              <Skeleton variant="text" width={60} />
              <Skeleton variant="text" width={80} />
              <Skeleton variant="text" width={100} />
            </>
          ) : (
            breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              
              return isLast || !item.href ? (
                <Typography 
                  key={item.label} 
                  color={isLast ? 'text.primary' : 'text.secondary'}
                  variant="body2"
                  fontWeight={isLast ? 500 : 400}
                >
                  {item.label}
                </Typography>
              ) : (
                <Link
                  key={item.label}
                  component={RouterLink}
                  to={item.href}
                  color="text.secondary"
                  variant="body2"
                  underline="hover"
                >
                  {item.label}
                </Link>
              );
            })
          )}
        </Breadcrumbs>
      )}
      
      <TitleRow>
        <Box>
          {loading ? (
            <>
              <Skeleton variant="text" width={200} height={40} />
              {subtitle && <Skeleton variant="text" width={300} />}
            </>
          ) : (
            <>
              <Typography variant="h4" component="h1" fontWeight={600}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body1" color="text.secondary" mt={0.5}>
                  {subtitle}
                </Typography>
              )}
            </>
          )}
        </Box>
        
        {actions && (
          <ActionContainer>
            {loading ? (
              <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
            ) : (
              actions
            )}
          </ActionContainer>
        )}
      </TitleRow>
      
      {divider && <Divider sx={{ mt: 2 }} />}
    </HeaderContainer>
  );
};

export default PageHeader; 