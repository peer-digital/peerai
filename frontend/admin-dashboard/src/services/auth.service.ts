import api from '../api/config';
import { AuthResponse, LoginCredentials, User } from '../types/auth';

// Storage keys
const USER_DATA_KEY = 'user_data';
const ACCESS_TOKEN_KEY = 'access_token';

class AuthService {
  private static instance: AuthService;
  private currentUser: User | null = null;

  private constructor() {}

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

      const response = await api.post<{access_token: string, token_type: string}>(
        '/api/v1/auth/login',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Store the access token
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);

      // Get user data from validation endpoint
      const userData = await this.validateToken();

      // Store user data in memory and storage
      this.currentUser = userData;
      this.setUser(userData);

      return {
        token: response.data.access_token,
        user: userData
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Incorrect email or password');
      }
      throw this.handleError(error);
    }
  }

  async validateToken(): Promise<User> {
    try {
      const response = await api.get<User>('/api/v1/auth/validate');
      this.currentUser = response.data;
      return response.data;
    } catch (error) {
      this.logout();
      throw this.handleError(error);
    }
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    // Clear session cookie by calling logout endpoint
    api.post('/api/v1/auth/logout').catch(() => {
      // Ignore logout errors
    });
  }

  getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getUser(): User | null {
    return this.currentUser || this.getUserFromStorage();
  }

  private getUserFromStorage(): User | null {
    const userData = localStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  private setUser(user: User): void {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser;
  }

  private handleError(error: any): Error {
    if (error.response) {
      const message = error.response.data?.detail || error.response.data?.message || 'Authentication failed';
      return new Error(message);
    }
    return error instanceof Error ? error : new Error('An unexpected error occurred');
  }
}

export const authService = AuthService.getInstance(); 