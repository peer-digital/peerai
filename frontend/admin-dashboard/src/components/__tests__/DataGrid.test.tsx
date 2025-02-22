import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataGrid } from '../DataGrid';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme/theme';

// Mock data for testing
const testData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'manager' },
];

const columns = [
  { field: 'name', headerName: 'Name', width: 200 },
  { field: 'email', headerName: 'Email', width: 250 },
  { field: 'role', headerName: 'Role', width: 150 },
];

// Wrap component with necessary providers
const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DataGrid Component', () => {
  beforeEach(() => {
    // Reset any mocks or state before each test
  });

  it('renders data grid with correct columns', () => {
    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
      />
    );

    // Check if column headers are rendered
    columns.forEach(column => {
      expect(screen.getByText(column.headerName)).toBeInTheDocument();
    });
  });

  it('displays data rows correctly', () => {
    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
      />
    );

    // Check if data is displayed
    testData.forEach(row => {
      expect(screen.getByText(row.name)).toBeInTheDocument();
      expect(screen.getByText(row.email)).toBeInTheDocument();
      expect(screen.getByText(row.role)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    renderWithProviders(
      <DataGrid
        data={[]}
        columns={columns}
        loading={true}
      />
    );

    // Check if loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles empty data state', () => {
    renderWithProviders(
      <DataGrid
        data={[]}
        columns={columns}
        loading={false}
      />
    );

    // Check if empty state message is shown
    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });

  it('handles row selection', async () => {
    const onSelectionChange = vi.fn();
    
    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
        onSelectionChange={onSelectionChange}
        selectable
      />
    );

    // Test select all functionality
    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await userEvent.click(selectAllCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith(testData.map(row => row.id));

    // Test individual row selection
    await userEvent.click(selectAllCheckbox); // Deselect all first
    const firstRow = screen.getByRole('row', { name: new RegExp(testData[0].name) });
    const checkbox = within(firstRow).getByRole('checkbox');
    await userEvent.click(checkbox);
    expect(onSelectionChange).toHaveBeenCalledWith([testData[0].id]);
  });

  it('handles sorting', async () => {
    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
        sortable
      />
    );

    // Click name column header to sort
    const nameHeader = screen.getByText('Name');
    await userEvent.click(nameHeader);

    // Check if rows are sorted alphabetically
    const rows = screen.getAllByRole('row');
    const firstCell = within(rows[1]).getByRole('cell', { name: /Bob Wilson/i });
    expect(firstCell).toBeInTheDocument();
  });

  it('handles sorting with multiple clicks', async () => {
    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
        sortable
      />
    );

    const nameHeader = screen.getByText('Name');
    
    // First click - ascending order
    await userEvent.click(nameHeader);
    let rows = screen.getAllByRole('row');
    let firstCell = within(rows[1]).getByRole('cell', { name: /Bob Wilson/i });
    expect(firstCell).toBeInTheDocument();

    // Second click - descending order
    await userEvent.click(nameHeader);
    rows = screen.getAllByRole('row');
    firstCell = within(rows[1]).getByRole('cell', { name: /John Doe/i });
    expect(firstCell).toBeInTheDocument();
  });

  it('handles filtering', async () => {
    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
        filterable
      />
    );

    // Open filter menu
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await userEvent.click(filterButton);

    // Enter filter value
    const filterInput = screen.getByPlaceholderText('Filter value');
    await userEvent.type(filterInput, 'john');

    // Apply filter
    const applyButton = screen.getByRole('button', { name: /apply/i });
    await userEvent.click(applyButton);

    // Check if only filtered data is shown
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('handles filtering with field selection', async () => {
    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
        filterable
      />
    );

    // Open filter menu
    const filterButton = screen.getByRole('button', { name: /filter/i });
    await userEvent.click(filterButton);

    // Select field to filter
    const fieldSelect = screen.getByLabelText(/field/i);
    await userEvent.click(fieldSelect);
    const nameOption = screen.getByText('Name');
    await userEvent.click(nameOption);

    // Enter filter value
    const filterInput = screen.getByPlaceholderText('Filter value');
    await userEvent.type(filterInput, 'john');

    // Apply filter
    const applyButton = screen.getByRole('button', { name: /apply/i });
    await userEvent.click(applyButton);

    // Check if only filtered data is shown
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();

    // Clear filter
    await userEvent.click(filterButton);
    await userEvent.clear(filterInput);
    await userEvent.click(applyButton);

    // Check if all data is shown again
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('handles pagination', async () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: 'user'
    }));

    renderWithProviders(
      <DataGrid
        data={manyRows}
        columns={columns}
        loading={false}
        pagination
        pageSize={10}
      />
    );

    // Check if pagination controls are shown
    const paginationToolbar = screen.getByRole('toolbar');
    expect(paginationToolbar).toBeInTheDocument();

    // Go to next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);

    // Check if page 2 data is shown
    expect(screen.getByText('User 11')).toBeInTheDocument();
    expect(screen.queryByText('User 1')).not.toBeInTheDocument();
  });

  it('handles pagination with row count display', async () => {
    const manyRows = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: 'user'
    }));

    renderWithProviders(
      <DataGrid
        data={manyRows}
        columns={columns}
        loading={false}
        pagination
        pageSize={10}
      />
    );

    // Check if pagination info is shown
    expect(screen.getByText(/1-10 of 25/i)).toBeInTheDocument();

    // Go to next page
    const nextButton = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextButton);

    // Check if page 2 data and info is shown
    expect(screen.getByText(/11-20 of 25/i)).toBeInTheDocument();
    expect(screen.getByText('User 11')).toBeInTheDocument();
    expect(screen.queryByText('User 1')).not.toBeInTheDocument();

    // Go to last page
    await userEvent.click(nextButton);
    expect(screen.getByText(/21-25 of 25/i)).toBeInTheDocument();

    // Check if previous page button works
    const prevButton = screen.getByRole('button', { name: /previous/i });
    await userEvent.click(prevButton);
    expect(screen.getByText(/11-20 of 25/i)).toBeInTheDocument();
  });

  it('handles row actions', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
        actions={[
          { label: 'Edit', onClick: onEdit },
          { label: 'Delete', onClick: onDelete }
        ]}
      />
    );

    // Open actions menu for first row
    const actionButtons = screen.getAllByRole('button', { name: /more/i });
    await userEvent.click(actionButtons[0]);

    // Click edit action
    const editMenuItem = screen.getByRole('menuitem', { name: /edit/i });
    await userEvent.click(editMenuItem);

    // Check if edit callback was called
    expect(onEdit).toHaveBeenCalledWith(testData[0]);

    // Open actions menu again
    await userEvent.click(actionButtons[0]);

    // Click delete action
    const deleteMenuItem = screen.getByRole('menuitem', { name: /delete/i });
    await userEvent.click(deleteMenuItem);

    // Check if delete callback was called
    expect(onDelete).toHaveBeenCalledWith(testData[0]);
  });

  it('handles row actions with keyboard navigation', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <DataGrid
        data={testData}
        columns={columns}
        loading={false}
        actions={[
          { label: 'Edit', onClick: onEdit },
          { label: 'Delete', onClick: onDelete }
        ]}
      />
    );

    // Open actions menu for first row using keyboard
    const actionButton = screen.getAllByRole('button', { name: /more/i })[0];
    actionButton.focus();
    await userEvent.keyboard('{Enter}');

    // Navigate to edit action using keyboard
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    // Check if edit callback was called
    expect(onEdit).toHaveBeenCalledWith(testData[0]);

    // Open menu again and test delete action
    await userEvent.click(actionButton);
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Enter}');

    // Check if delete callback was called
    expect(onDelete).toHaveBeenCalledWith(testData[0]);
  });

  it('handles custom cell rendering', () => {
    const customColumns = [
      ...columns,
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        renderCell: (params: any) => (
          <div data-testid="custom-cell">
            {params.value ? 'Active' : 'Inactive'}
          </div>
        )
      }
    ];

    const dataWithStatus = testData.map(row => ({ ...row, status: true }));

    renderWithProviders(
      <DataGrid
        data={dataWithStatus}
        columns={customColumns}
        loading={false}
      />
    );

    // Check if custom cells are rendered
    const customCells = screen.getAllByTestId('custom-cell');
    expect(customCells).toHaveLength(dataWithStatus.length);
    expect(customCells[0]).toHaveTextContent('Active');
  });
}); 