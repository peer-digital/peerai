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
import { Role } from '../types/rbac';

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  token_limit: number;
  email_verified: boolean;
  referral_stats?: {
    total_referrals: number;
    successful_referrals: number;
    pending_referrals: number;
    total_tokens_earned: number;
    referral_code: string;
  };
}

interface EditUserData {
  name?: string;
  role?: Role;
  token_limit?: number;
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
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      name: user.full_name,
      role: user.role,
      token_limit: user.token_limit,
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
    const action = user.is_active ? 'block' : 'unblock';
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
                <TableCell>Email Verified</TableCell>
                <TableCell>Token Limit</TableCell>
                <TableCell>Referral Code</TableCell>
                <TableCell>Referrals</TableCell>
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
                      <TableCell>{user.full_name || 'N/A'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.role}
                          color={user.role === Role.SUPER_ADMIN ? 'primary' : 'default'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.email_verified ? 'Verified' : 'Unverified'}
                          color={user.email_verified ? 'success' : 'warning'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.token_limit.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            bgcolor: 'grey.100',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block'
                          }}
                        >
                          {user.referral_stats?.referral_code || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip 
                          title={
                            <Box>
                              <Typography variant="body2">Total: {user.referral_stats?.total_referrals || 0}</Typography>
                              <Typography variant="body2">Successful: {user.referral_stats?.successful_referrals || 0}</Typography>
                              <Typography variant="body2">Tokens Earned: {(user.referral_stats?.total_tokens_earned || 0).toLocaleString()}</Typography>
                            </Box>
                          } 
                          arrow
                        >
                          <Box>
                            <Chip
                              label={`${user.referral_stats?.successful_referrals || 0} referrals`}
                              color={(user.referral_stats?.successful_referrals || 0) > 0 ? 'success' : 'default'}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={formatDate(user.created_at)} arrow>
                          <span>{formatDate(user.created_at)}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={user.last_login ? formatDate(user.last_login) : 'Never logged in'} arrow>
                          <span>{user.last_login ? formatDate(user.last_login) : 'Never'}</span>
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
                        <Tooltip title={user.is_active ? 'Block user' : 'Unblock user'} arrow>
                          <IconButton
                            size="small"
                            color={user.is_active ? 'error' : 'success'}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.is_active ? <BlockIcon /> : <UnblockIcon />}
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
                onChange={(e) => setEditData({ ...editData, role: e.target.value as Role })}
              >
                {Object.values(Role).map((role) => (
                  <MenuItem key={role} value={role}>
                    {role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Token Limit"
              type="number"
              value={editData.token_limit || 10000}
              onChange={(e) => setEditData({ ...editData, token_limit: parseInt(e.target.value) })}
              size="small"
              InputProps={{
                inputProps: { min: 0 }
              }}
            />
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