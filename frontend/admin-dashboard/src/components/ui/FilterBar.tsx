import React, { ReactNode } from 'react';
import {
  Box,
  Paper,
  Grid,
  Button,
  Stack,
  Chip,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearAllIcon from '@mui/icons-material/ClearAll';

export interface FilterBarProps {
  children: ReactNode;
  onClearAll?: () => void;
  activeFiltersCount?: number;
  showClearButton?: boolean;
  title?: string;
}

/**
 * Consistent filter bar component for all pages
 */
const FilterBar: React.FC<FilterBarProps> = ({
  children,
  onClearAll,
  activeFiltersCount = 0,
  showClearButton = true,
  title = 'Filters',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterListIcon color="action" fontSize="small" />
          <Typography variant="subtitle2">{title}</Typography>
          {activeFiltersCount > 0 && (
            <Chip
              label={activeFiltersCount}
              color="primary"
              size="small"
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
        </Stack>
        {showClearButton && onClearAll && (
          <Button
            startIcon={<ClearAllIcon />}
            onClick={onClearAll}
            size="small"
            disabled={activeFiltersCount === 0}
            variant="text"
            sx={{ minWidth: 'auto', py: 0.5 }}
          >
            Clear All
          </Button>
        )}
      </Stack>
      <Box>
        <Grid container spacing={1.5} alignItems="center">
          {children}
        </Grid>
      </Box>
    </Box>
  );
};

export default FilterBar;
