import { Role, Permission } from './rbac';

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  role: Role;
  name?: string;
  token_limit: number;  // Default is 2500
  permissions?: Permission[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  full_name?: string;
  referral_code?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
}