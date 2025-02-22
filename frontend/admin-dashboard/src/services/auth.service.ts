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
      // @ts-ignore - Backend expects 'username' for OAuth2 form
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);

      const response = await api.post<{access_token: string, token_type: string}>(
        // @ts-ignore - URL is correct, matches FastAPI OAuth2 endpoint
        '/api/v1/token',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Store the access token
      localStorage.setItem(ACCESS_TOKEN_KEY, response.data.access_token);

      // Create user object from successful login
      const user = {
        id: '1', // Will be replaced with real ID from validateToken
        email: credentials.email,
        name: '',
        role: 'admin' as const
      };

      // Store user data in memory
      this.currentUser = user;
      this.setUser(user);

      return {
        token: response.data.access_token,
        user
      };
    } catch (error) {
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
    return !!this.currentUser;
  }

  private handleError(error: any): Error {
    if (error.response) {
      const message = error.response.data?.message || 'Authentication failed';
      return new Error(message);
    }
    return error;
  }
}

export const authService = AuthService.getInstance(); 