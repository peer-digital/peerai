import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Typography
} from '@mui/material';
import { User, Role } from '../types/rbac';
import { rbacApi } from '../api/rbac';
import { toast } from 'react-toastify';
import { LoadingOverlay } from '../components/ui';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real implementation, fetch users from your API
    // For now, using mock data
    setUsers([
      {
        id: 1,
        email: 'user@example.com',
        full_name: 'John Doe',
        is_active: true,
        role: Role.USER,
        created_at: new Date().toISOString(),
        token_limit: 10000
      },
      {
        id: 2,
        email: 'admin@example.com',
        full_name: 'Jane Admin',
        is_active: true,
        role: Role.USER_ADMIN,
        team_id: 1,
        created_at: new Date().toISOString(),
        token_limit: 10000
      }
    ]);
    setLoading(false);
  }, []);

  const handleRoleChange = async (userId: number, newRole: Role) => {
    try {
      const updatedUser = await rbacApi.updateUserRole(userId, newRole);
      setUsers(users.map(user =>
        user.id === userId ? updatedUser : user
      ));
      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  return (
    <Box p={4} position="relative">
      <LoadingOverlay loading={loading} />

      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <FormControl size="small">
                    <Select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                    >
                      {Object.values(Role).map((role) => (
                        <MenuItem key={role} value={role}>
                          {role}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>{user.team_id || 'No team'}</TableCell>
                <TableCell>{user.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserManagement;