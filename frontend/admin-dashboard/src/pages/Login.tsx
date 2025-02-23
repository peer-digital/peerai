import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { LoginCredentials } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/rbac';

// Test users for development mode
const TEST_USERS = [
  { email: 'user@peerai.se', password: 'user123', role: Role.USER },
  { email: 'admin@peerai.se', password: 'admin123', role: Role.USER_ADMIN },
  { email: 'super.admin@peerai.se', password: 'superadmin123', role: Role.SUPER_ADMIN },
];

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginCredentials>();

  // Check if we're in development mode
  const isDevelopment = import.meta.env.VITE_DEV_MODE === 'true';

  const onSubmit = async (credentials: LoginCredentials) => {
    try {
      setError(null);
      setIsLoading(true);

      await login(credentials);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <Container component="main" maxWidth="xs" sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 4,
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }}>
      <Box sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Typography 
            component="h1" 
            variant="h5" 
            sx={{ 
              mb: 3,
              fontWeight: 600,
              color: 'primary.main',
            }}
          >
            PeerAI Admin Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          {isDevelopment && (
            <>
              <Alert severity="info" sx={{ mb: 3, width: '100%' }}>
                Development mode is active. Click on a test user to prefill credentials:
              </Alert>
              <Stack 
                direction="column" 
                spacing={1} 
                sx={{ width: '100%', mb: 3 }}
              >
                {TEST_USERS.map((user) => (
                  <Button
                    key={user.email}
                    variant="outlined"
                    size="small"
                    onClick={() => handleQuickLogin(user.email, user.password)}
                    sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography variant="body2">{user.role}</Typography>
                      <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                    </Box>
                  </Button>
                ))}
              </Stack>
              <Divider sx={{ width: '100%', mb: 3 }} />
            </>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ width: '100%' }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              inputProps={{
                'aria-invalid': !!errors.email,
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              inputProps={{
                'aria-invalid': !!errors.password,
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 3,
                mb: 2,
                py: 1.5,
                fontWeight: 600,
              }}
              disabled={isLoading}
            >
              {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 