import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link as RouterLink, useParams, useLocation } from 'react-router-dom';
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
  FormControlLabel,
  Checkbox,
  Link,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { LoginCredentials } from '../types/auth';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/rbac';
import { api } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { AnnouncementBanner } from '../components/ui';

// Test users for development mode
const TEST_USERS = [
  { email: 'user@peerai.se', password: 'user123', role: Role.USER },
  { email: 'admin@peerai.se', password: 'admin123', role: Role.USER_ADMIN },
  { email: 'super.admin@peerai.se', password: 'superadmin123', role: Role.SUPER_ADMIN },
];

type AuthMode = 'login' | 'register';

interface LoginProps {
  initialMode?: AuthMode;
  rolePath?: string;
}

const Login: React.FC<LoginProps> = ({ initialMode = 'login', rolePath: propRolePath }) => {
  const { referralCode: urlReferralCode, rolePath: paramRolePath } = useParams();
  // Use the prop rolePath if provided, otherwise use the URL parameter
  const rolePath = propRolePath || paramRolePath;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const { register: registerForm, handleSubmit, setValue, formState: { errors } } = useForm<LoginCredentials & { full_name?: string; referral_code?: string; terms_accepted?: boolean }>();
  const [referralCode, setReferralCode] = useState(urlReferralCode || "");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [isValidCode, setIsValidCode] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [debouncedReferralCode] = useDebounce(referralCode, 500);
  const [showInvalidCodeDialog, setShowInvalidCodeDialog] = useState(false);
  const [roleFromPath, setRoleFromPath] = useState<string | null>(null);

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
    // Only treat as referral code if it's not a valid role path
    const validRoles = ["app_manager"]; // Keep in sync with the backend role_mapping

    if (urlReferralCode && !validRoles.includes(urlReferralCode)) {
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

  // Update mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Handle role path parameter
  useEffect(() => {
    if (rolePath) {
      // Set registration mode if we have a role path
      setMode('register');

      // Validate the role path - only allow specific valid roles
      const validRoles = ["app_manager"]; // Keep in sync with the backend role_mapping

      if (validRoles.includes(rolePath)) {
        // Store the role path for use during registration
        setRoleFromPath(rolePath);
        console.log(`Registration with role path: ${rolePath}`);
      } else {
        // Check if this might be a referral code that was mistakenly parsed as a role path
        // This happens when the URL is /register/XXXX without a role path
        if (!urlReferralCode) {
          // If we don't already have a referral code from the URL, treat this as a referral code
          setReferralCode(rolePath);
          setValue('referral_code', rolePath);
          validateReferralCode(rolePath);
          console.log(`Treating ${rolePath} as a referral code instead of a role path`);
        } else {
          // If we already have a referral code, this is truly an invalid role path
          console.error(`Invalid role path: ${rolePath}`);
          setError(`Invalid role path: ${rolePath}. Registration will proceed with default role.`);
        }
      }
    }
  }, [rolePath, urlReferralCode, setValue, validateReferralCode]);

  const onSubmit = async (credentials: LoginCredentials & { full_name?: string; referral_code?: string; terms_accepted?: boolean }) => {
    try {
      setError(null);

      // Check for invalid referral code in register mode
      if (mode === 'register' && credentials.referral_code && isValidCode === false) {
        setShowInvalidCodeDialog(true);
        return;
      }

      setIsLoading(true);

      if (mode === 'login') {
        const result = await login(credentials);
        console.log('Login successful:', result);
        console.log('Token:', localStorage.getItem('access_token'));
      } else {
        // If we have a role path, use the role-specific registration endpoint
        if (roleFromPath) {
          // Validate the role path again for security
          const validRoles = ["app_manager"]; // Keep in sync with the backend role_mapping

          if (validRoles.includes(roleFromPath)) {
            console.log(`Registering with role path: ${roleFromPath}`);
            // Use the auth service to register with the role path
            const result = await register(credentials, roleFromPath);
            console.log('Role-specific registration successful:', result);
            console.log('Token:', localStorage.getItem('access_token'));
          } else {
            // If invalid role path, use standard registration
            console.error(`Invalid role path detected during submission: ${roleFromPath}`);
            setError(`Invalid role path. Registration will proceed with default role.`);
            const result = await register(credentials);
            console.log('Standard registration used due to invalid role path:', result);
            console.log('Token:', localStorage.getItem('access_token'));
          }
        } else {
          // Standard registration
          const result = await register(credentials);
          console.log('Registration successful:', result);
          console.log('Token:', localStorage.getItem('access_token'));
        }
      }

      // Pass the current path as state so PrivateRoute knows we're coming from login/registration
      navigate('/dashboard', { state: { from: location.pathname } });
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

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: AuthMode) => {
    if (newMode !== null) {
      setMode(newMode);
      setError(null);

      // Update the URL to match the selected mode
      if (newMode === 'login') {
        // If there's a referral code, include it in the URL
        if (urlReferralCode) {
          navigate(`/login/${urlReferralCode}`, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } else {
        // For register mode, consider both role path and referral code
        if (roleFromPath && urlReferralCode) {
          // Both role path and referral code
          navigate(`/register/${roleFromPath}/${urlReferralCode}`, { replace: true });
        } else if (roleFromPath) {
          // Only role path
          navigate(`/register/${roleFromPath}`, { replace: true });
        } else if (urlReferralCode) {
          // Only referral code
          navigate(`/register/${urlReferralCode}`, { replace: true });
        } else {
          // Neither
          navigate('/register', { replace: true });
        }
      }
    }
  };

  return (
    <>
      {/* Beta Banner - Only shown on screens larger than 'sm' breakpoint */}
      <Box sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: 2,
        maxHeight: '70px',
        overflow: 'visible',
        display: { xs: 'none', sm: 'block' } // Hide on mobile screens
      }}>
        <AnnouncementBanner
          message={<>
            Welcome to our Beta! Register now to try our platform, but please note that some features are still in development. <Link
              href="mailto:info@peerdigital.se?subject=Peer%20AI%20Beta%20Registration"
              target="_blank"
              rel="noopener"
              sx={{
                color: 'inherit',
                textDecoration: 'underline',
                '&:hover': { textDecoration: 'underline' }
              }}
            >
              Contact us
            </Link> with any questions.
          </>}
          bannerId="welcome-beta-2024-login-en"
        />
      </Box>

      <Container component="main" maxWidth="sm" sx={{
        minHeight: { xs: '100vh', sm: 'calc(100vh - 70px)' }, // Full height on mobile, subtract banner height on desktop
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        position: 'fixed',
        left: '50%',
        top: '50%', // Center on mobile, adjust for desktop
        transform: 'translate(-50%, -50%)',
        pt: { xs: 2, sm: 8 }, // Less padding on mobile
        mt: { xs: 0, sm: '30px' } // No margin on mobile, add for desktop
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
              p: { xs: 3, sm: 4 },
              width: '100%',
              maxWidth: '500px',
              mx: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 2,
            }}
          >
            <Typography
              component="h1"
              variant="h4"
              color="primary"
              sx={{ mb: 3, fontWeight: 600 }}
            >
              PeerAI {mode === 'login' ? 'Login' : 'Register'}
            </Typography>

            {roleFromPath && (
              <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
                You are registering for a {roleFromPath.replace('_', ' ')} account.
              </Alert>
            )}

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
              sx={{ width: '100%', mt: 2 }}
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
                sx={{ mt: 2 }}
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
                sx={{ mt: 2 }}
              />
              {mode === 'register' && (
                <Box sx={{ mt: 3 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...registerForm('terms_accepted', {
                          required: 'You must accept the Terms of Use to register',
                        })}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        I accept the <Link component={RouterLink} to="/policy" target="_blank">Terms of Use</Link> and <Link component={RouterLink} to="/policy?tab=1" target="_blank">Privacy Policy</Link>
                      </Typography>
                    }
                    sx={{ alignItems: 'center' }}
                  />
                  {errors.terms_accepted && (
                    <Typography color="error" variant="caption" sx={{ display: 'block', ml: 2 }}>
                      {errors.terms_accepted.message}
                    </Typography>
                  )}
                </Box>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: mode === 'register' ? 2 : 4,
                  mb: 2,
                  py: 1.5,
                  fontSize: '1rem'
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
              sx={{ mt: 3 }}
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