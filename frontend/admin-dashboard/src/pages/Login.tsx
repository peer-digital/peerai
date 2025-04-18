import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useParams } from 'react-router-dom';
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
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { LoginCredentials, RegisterCredentials } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/rbac';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Test users for development mode
const TEST_USERS = [
  { email: 'user@peerai.se', password: 'user123', role: Role.USER },
  { email: 'admin@peerai.se', password: 'admin123', role: Role.USER_ADMIN },
  { email: 'super.admin@peerai.se', password: 'superadmin123', role: Role.SUPER_ADMIN },
];

type AuthMode = 'login' | 'register';

const Login: React.FC = () => {
  const { referralCode: urlReferralCode } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const { register: registerForm, handleSubmit, setValue, formState: { errors } } = useForm<LoginCredentials & { full_name?: string; referral_code?: string }>();
  const [referralCode, setReferralCode] = useState(urlReferralCode || "");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [debouncedReferralCode] = useDebounce(referralCode, 500);
  const [showInvalidCodeDialog, setShowInvalidCodeDialog] = useState(false);

  // Check if we're in development mode
  const isDevelopment = import.meta.env.VITE_DEV_MODE === 'true';

  const validateReferralCode = useCallback(async (code: string) => {
    if (!code) {
      setIsValidCode(null);
      setValidationMessage("");
      return;
    }

    setIsValidatingCode(true);
    try {
      const response = await api.get(`/referrals/validate/${code}`);
      setIsValidCode(response.data.valid);
      setValidationMessage(response.data.message);
    } catch (error) {
      setIsValidCode(false);
      setValidationMessage("Invalid referral code");
    } finally {
      setIsValidatingCode(false);
    }
  }, []);

  // Handle URL referral code
  useEffect(() => {
    if (urlReferralCode) {
      setReferralCode(urlReferralCode);
      setMode('register');
      setValue('referral_code', urlReferralCode);
      validateReferralCode(urlReferralCode);
    }
  }, [urlReferralCode, setValue, validateReferralCode]);

  // Update validation when debounced value changes
  useEffect(() => {
    validateReferralCode(debouncedReferralCode);
  }, [debouncedReferralCode, validateReferralCode]);

  const onSubmit = async (credentials: LoginCredentials & { full_name?: string; referral_code?: string }) => {
    try {
      setError(null);

      // Check for invalid referral code in register mode
      if (mode === 'register' && credentials.referral_code && isValidCode === false) {
        setShowInvalidCodeDialog(true);
        return;
      }

      setIsLoading(true);

      if (mode === 'login') {
        await login(credentials);
      } else {
        await register(credentials);
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || `An error occurred during ${mode}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  const handleModeChange = (event: React.MouseEvent<HTMLElement>, newMode: AuthMode) => {
    if (newMode !== null) {
      setMode(newMode);
      setError(null);
    }
  };

  return (
    <>
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
              color="primary"
              sx={{ mb: 3 }}
            >
              PeerAI Admin {mode === 'login' ? 'Login' : 'Register'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                {error}
              </Alert>
            )}

            {isDevelopment && mode === 'login' && (
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
              {mode === 'register' && (
                <>
                  <TextField
                    margin="normal"
                    fullWidth
                    id="full_name"
                    label="Full Name"
                    autoComplete="name"
                    error={!!errors.full_name}
                    helperText={errors.full_name?.message}
                    {...registerForm('full_name', {
                      required: 'Full name is required',
                    })}
                    inputProps={{
                      'aria-invalid': !!errors.full_name,
                    }}
                  />
                  <TextField
                    margin="normal"
                    fullWidth
                    id="referral_code"
                    label="Referral Code (Optional)"
                    autoComplete="off"
                    error={isValidCode === false}
                    helperText={validationMessage || "Enter a referral code if you have one"}
                    {...registerForm('referral_code', {
                      onChange: (e) => {
                        const code = e.target.value.toUpperCase();
                        setReferralCode(code);
                        registerForm('referral_code').onChange(e);
                      }
                    })}
                    InputProps={{
                      endAdornment: isValidatingCode ? (
                        <CircularProgress size={20} />
                      ) : isValidCode ? (
                        <Box sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CheckCircleIcon fontSize="small" />
                          <Typography variant="body2" color="success.main">Valid</Typography>
                        </Box>
                      ) : null,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: isValidCode ? 'success.main' : undefined,
                          },
                        },
                      }
                    }}
                    inputProps={{
                      'aria-invalid': isValidCode === false,
                    }}
                  />
                </>
              )}
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
                {...registerForm('email', {
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
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                error={!!errors.password}
                helperText={errors.password?.message}
                {...registerForm('password', {
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
                  py: 1.5
                }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : mode === 'login' ? 'Sign In' : 'Register'}
              </Button>
            </Box>

            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              aria-label="auth mode"
              size="small"
              sx={{ mt: 2 }}
            >
              <ToggleButton value="login" aria-label="login mode">
                Login
              </ToggleButton>
              <ToggleButton value="register" aria-label="register mode">
                Register
              </ToggleButton>
            </ToggleButtonGroup>
          </Paper>
        </Box>
      </Container>

      <Dialog
        open={showInvalidCodeDialog}
        onClose={() => setShowInvalidCodeDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Invalid Referral Code</DialogTitle>
        <DialogContent>
          <Typography>
            The referral code is not valid. Please add a valid code or clear the field to register without a referral code.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInvalidCodeDialog(false)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Login;