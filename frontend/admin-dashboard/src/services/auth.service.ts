import api from '../api/config';
import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth';
import { Role } from '../types/rbac';

// Storage keys
const USER_DATA_KEY = 'user_data';
const ACCESS_TOKEN_KEY = 'access_token';

// @important: Role mapping between backend and frontend
const ROLE_MAPPING = {
  'guest': Role.GUEST,
  'user': Role.USER,
  'user_admin': Role.USER_ADMIN,
  'super_admin': Role.SUPER_ADMIN,
  'GUEST': Role.GUEST,
  'USER': Role.USER,
  'USER_ADMIN': Role.USER_ADMIN,
  'SUPER_ADMIN': Role.SUPER_ADMIN
} as const;

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {
    // Try to restore user from storage on initialization
    const storedUser = this.getUserFromStorage();
    if (storedUser) {
      this.currentUser = storedUser;
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Create form data for OAuth2 token request
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      console.log('Sending login request...'); // Debug log

      const response = await api.post<{
        access_token: string;
        token_type: string;
        user?: {
          id: number;
          email: string;
          role: string;
          is_active: boolean;
          full_name?: string;
          token_limit?: number;
        };
      }>(
        '/auth/login',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      console.log('Login response:', response.data); // Debug log
      console.log('User token limit from login:', response.data.user?.token_limit); // Add detailed token limit log

      // Store the access token
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);

      // If user data is included in login response, use it
      let userData: User;
      if (response.data.user) {
        userData = {
          id: response.data.user.id.toString(),
          email: response.data.user.email,
          is_active: response.data.user.is_active ?? true,
          role: ROLE_MAPPING[response.data.user.role as keyof typeof ROLE_MAPPING] || Role.USER,
          name: response.data.user.full_name,
          token_limit: response.data.user.token_limit ?? 10000
        };
      } else {
        // Otherwise get user data from validation endpoint
        userData = await this.validateToken();
      }

      console.log('Final user data:', userData); // Debug log

      // Store user data in memory and storage
      this.currentUser = userData;
      this.setUser(userData);

      return {
        token: response.data.access_token,
        user: userData
      };
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      if (error.response?.status === 401) {
        throw new Error(error.response.data.detail || 'Incorrect email or password');
      }
      throw this.handleError(error);
    }
  }

  async validateToken(): Promise<User> {
    try {
      const validateResponse = await api.get<{
        id: number;
        email: string;
        is_active: boolean;
        role: string;
        full_name?: string;
        token_limit: number;
      }>('/auth/validate');

      console.log('Token validation response:', {
        rawData: validateResponse.data,
        role: validateResponse.data.role,
        roleType: typeof validateResponse.data.role,
        roleMapping: ROLE_MAPPING,
        mappedRole: ROLE_MAPPING[validateResponse.data.role as keyof typeof ROLE_MAPPING],
        tokenLimit: validateResponse.data.token_limit
      });

      // Ensure we have the required fields
      if (!validateResponse.data?.email || !validateResponse.data?.role) {
        console.error('Missing required fields:', {
          hasEmail: !!validateResponse.data?.email,
          hasRole: !!validateResponse.data?.role,
          data: validateResponse.data
        });
        // Clear invalid auth state without making additional API calls
        this.clearAuthState();
        throw new Error('Invalid user data received from server');
      }

      const userData: User = {
        id: validateResponse.data.id.toString(),
        email: validateResponse.data.email,
        is_active: validateResponse.data.is_active ?? true,
        role: ROLE_MAPPING[validateResponse.data.role as keyof typeof ROLE_MAPPING] || Role.USER,
        name: validateResponse.data.full_name,
        token_limit: validateResponse.data.token_limit
      };

      console.log('Mapped user data:', userData);

      this.currentUser = userData;
      this.setUser(userData);
      return userData;
    } catch (error: any) {
      console.error('Token validation error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
      // Clear invalid auth state without making additional API calls
      this.clearAuthState();
      throw this.handleError(error);
    }
  }

  logout(): void {
    // First clear local state
    this.clearAuthState();
    // Then attempt to clear server session
    api.post('/auth/logout').catch((error) => {
      // Ignore 401 errors as they're expected if token is already invalid
      if (error.response?.status !== 401) {
        console.warn('Error during logout:', error);
      }
    });
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getUser(): User | null {
    return this.currentUser || this.getUserFromStorage();
  }

  private getUserFromStorage(): User | null {
    try {
      const userData = localStorage.getItem(USER_DATA_KEY);
      if (!userData) return null;
      
      const parsedUser = JSON.parse(userData);
      console.log('Retrieved user from storage:', parsedUser); // Add storage retrieval log
      // Map the role string to enum value without assuming case
      return {
        ...parsedUser,
        role: ROLE_MAPPING[parsedUser.role as keyof typeof ROLE_MAPPING] || Role.USER
      };
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }

  private setUser(user: User): void {
    // Store the role as a string for proper serialization
    const userData = {
      ...user,
      role: user.role.toString()
    };
    console.log('Storing user in localStorage:', userData); // Add storage log
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser;
  }

  private handleError(error: any): Error {
    console.error('Auth service error:', error);
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    return error;
  }

  // Helper method to clear auth state without making API calls
  private clearAuthState(): void {
    this.currentUser = null;
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      console.log('Sending registration request...'); // Debug log

      const response = await api.post<{
        access_token: string;
        token_type: string;
        user?: {
          id: number;
          email: string;
          role: string;
          is_active: boolean;
          full_name?: string;
          token_limit?: number;
        };
      }>(
        '/auth/register',
        credentials
      );

      console.log('Registration response:', response.data); // Debug log

      // Store the access token
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);

      // If user data is included in registration response, use it
      let userData: User;
      if (response.data.user) {
        userData = {
          id: response.data.user.id.toString(),
          email: response.data.user.email,
          is_active: response.data.user.is_active ?? true,
          role: ROLE_MAPPING[response.data.user.role as keyof typeof ROLE_MAPPING] || Role.USER,
          name: response.data.user.full_name,
          token_limit: response.data.user.token_limit ?? 10000
        };
      } else {
        // Otherwise get user data from validation endpoint
        userData = await this.validateToken();
      }

      console.log('Final user data:', userData); // Debug log

      // Store user data in memory and storage
      this.currentUser = userData;
      this.setUser(userData);

      return {
        token: response.data.access_token,
        user: userData
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      if (error.response?.status === 400) {
        throw new Error(error.response.data.detail || 'Registration failed');
      }
      throw this.handleError(error);
    }
  }
}

export const authService = AuthService.getInstance(); 