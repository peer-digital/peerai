import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Stack,
  Tooltip,
  TablePagination,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as UnblockIcon,
  Edit as EditIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../api/config';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  status: 'active' | 'blocked';
  createdAt: string;
  lastLogin: string | null;
}

interface EditUserData {
  name?: string;
  role?: 'admin' | 'user';
}

const formatDate = (date: string | null): string => {
  if (!date) return 'Never';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

const EmptyState = () => (
  <Box sx={{ textAlign: 'center', py: 8 }}>
    <Typography color="text.secondary" variant="body2">
      No users found
    </Typography>
  </Box>
);

const Users: React.FC = () => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editData, setEditData] = useState<EditUserData>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/api/v1/admin/users');
      return response.data;
    },
  });

  // Filter users based on search query
  const filteredUsers = users?.filter(user => 
    !searchQuery || (
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  ) || [];

  // Update user
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUserData }) => {
      await api.patch(`/api/v1/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
      handleCloseEditDialog();
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  // Toggle user status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'block' | 'unblock' }) => {
      await api.post(`/api/v1/admin/users/${userId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditData({
      name: user.name,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedUser(null);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (!selectedUser || !editData) return;
    await updateUserMutation.mutateAsync({
      userId: selectedUser.id,
      data: editData,
    });
  };

  const handleToggleStatus = async (user: User) => {
    const action = user.status === 'active' ? 'block' : 'unblock';
    await toggleUserStatusMutation.mutateAsync({
      userId: user.id,
      action,
    });
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error loading users. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} total
          </Typography>
        </Box>
        <Box sx={{ width: 300 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            }}
          />
        </Box>
      </Stack>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        {isLoading && <LinearProgress />}
        
        <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && filteredUsers.length > 0 ? (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>{user.name || 'N/A'}</TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={(user.role || 'user').toUpperCase()}
                          color={user.role === 'admin' ? 'primary' : 'default'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={(user.status || 'active').toUpperCase()}
                          color={user.status === 'active' ? 'success' : 'error'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={formatDate(user.createdAt)} arrow>
                          <span>{formatDate(user.createdAt)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={user.lastLogin ? formatDate(user.lastLogin) : 'Never logged in'} arrow>
                          <span>{user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit user" arrow>
                          <IconButton
                            size="small"
                            onClick={() => handleEditUser(user)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.status === 'active' ? 'Block user' : 'Unblock user'} arrow>
                          <IconButton
                            size="small"
                            color={user.status === 'active' ? 'error' : 'success'}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === 'active' ? <BlockIcon /> : <UnblockIcon />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {isLoading ? (
                      <Box sx={{ py: 3 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <Typography color="text.secondary">
                        {searchQuery ? 'No users found matching your search' : 'No users found'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {!isLoading && filteredUsers.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredUsers.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        )}
      </Paper>

      <Dialog 
        open={editDialogOpen} 
        onClose={handleCloseEditDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Edit User
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box mt={2} display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              label="Name"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={editData.role || ''}
                label="Role"
                onChange={(e) => setEditData({ ...editData, role: e.target.value as 'admin' | 'user' })}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
          <Button onClick={handleCloseEditDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEdit} 
            variant="contained"
            sx={{ px: 3 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users; 