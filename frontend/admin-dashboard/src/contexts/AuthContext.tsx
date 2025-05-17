import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthContextType, LoginCredentials, RegisterCredentials, User } from '../types/auth';
import { authService } from '../services/auth.service';
import { MobileLoadingIndicator } from '../components/ui';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getUser());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if we have a stored token
        if (authService.getToken()) {
          // Validate the token and get user data
          const userData = await authService.validateToken();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Clear invalid auth state
        authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const { user } = await authService.login(credentials);
      setUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials, rolePath?: string) => {
    try {
      const { user } = await authService.register(credentials, rolePath);
      setUser(user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  if (isLoading) {
    return <MobileLoadingIndicator />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};