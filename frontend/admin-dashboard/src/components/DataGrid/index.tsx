import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  TablePagination,
  TableSortLabel,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
} from '@mui/icons-material';

export interface Column {
  field: string;
  headerName: string;
  width: number;
  renderCell?: (params: any) => React.ReactNode;
}

export interface Action {
  label: string;
  onClick: (row: any) => void;
}

interface DataGridProps {
  data: any[];
  columns: Column[];
  loading?: boolean;
  selectable?: boolean;
  sortable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  actions?: Action[];
  onSelectionChange?: (selectedIds: number[]) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({
  data,
  columns,
  loading = false,
  selectable = false,
  sortable = false,
  filterable = false,
  pagination = false,
  pageSize = 10,
  actions,
  onSelectionChange,
}) => {
  // State
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [orderBy, setOrderBy] = useState<string>('');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<any>(null);

  // Handlers
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = data.map(row => row.id);
      setSelected(newSelected);
      onSelectionChange?.(newSelected);
    } else {
      setSelected([]);
      onSelectionChange?.([]);
    }
  };

  const handleClick = (id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const handleSort = (field: string) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setAnchorEl(event.currentTarget);
    setActiveRow(row);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveRow(null);
  };

  const handleAction = (action: Action) => {
    action.onClick(activeRow);
    handleCloseMenu();
  };

  const handleOpenFilter = () => {
    setFilterDialogOpen(true);
  };

  const handleCloseFilter = () => {
    setFilterDialogOpen(false);
  };

  const handleApplyFilter = () => {
    setFilterDialogOpen(false);
    setPage(0);
  };

  // Computed values
  const filteredData = useMemo(() => {
    if (!filterField || !filterValue) return data;
    return data.filter(row => {
      const value = row[filterField];
      return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
    });
  }, [data, filterField, filterValue]);

  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];
      if (order === 'asc') {
        return aValue < bValue ? -1 : 1;
      } else {
        return bValue < aValue ? -1 : 1;
      }
    });
  }, [filteredData, orderBy, order]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize, pagination]);

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  // Render
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data.length) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>No data to display</Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < data.length}
                    checked={data.length > 0 && selected.length === data.length}
                    onChange={handleSelectAllClick}
                  />
                </TableCell>
              )}
              {columns.map(column => (
                <TableCell
                  key={column.field}
                  style={{ width: column.width }}
                >
                  {sortable ? (
                    <TableSortLabel
                      active={orderBy === column.field}
                      direction={orderBy === column.field ? order : 'asc'}
                      onClick={() => handleSort(column.field)}
                    >
                      {column.headerName}
                    </TableSortLabel>
                  ) : (
                    column.headerName
                  )}
                </TableCell>
              ))}
              {actions && <TableCell align="right">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row: any) => {
              const isItemSelected = isSelected(row.id);
              return (
                <TableRow
                  hover
                  key={row.id}
                  selected={isItemSelected}
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isItemSelected}
                        onChange={() => handleClick(row.id)}
                      />
                    </TableCell>
                  )}
                  {columns.map(column => (
                    <TableCell key={column.field}>
                      {column.renderCell ? column.renderCell(row) : row[column.field]}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell align="right">
                      <IconButton onClick={(e) => handleOpenMenu(e, row)}>
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination && (
        <TablePagination
          component="div"
          count={sortedData.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
        />
      )}

      {filterable && (
        <>
          <Box display="flex" justifyContent="flex-end" p={1}>
            <Button
              startIcon={<FilterListIcon />}
              onClick={handleOpenFilter}
            >
              Filter
            </Button>
          </Box>

          <Dialog open={filterDialogOpen} onClose={handleCloseFilter}>
            <DialogTitle>Filter Data</DialogTitle>
            <DialogContent>
              <Box p={2}>
                <TextField
                  select
                  fullWidth
                  label="Field"
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                  margin="normal"
                >
                  {columns.map(column => (
                    <MenuItem key={column.field} value={column.field}>
                      {column.headerName}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  label="Value"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  margin="normal"
                  placeholder="Filter value"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseFilter}>Cancel</Button>
              <Button onClick={handleApplyFilter} color="primary">
                Apply
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        {actions?.map(action => (
          <MenuItem
            key={action.label}
            onClick={() => handleAction(action)}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}; 