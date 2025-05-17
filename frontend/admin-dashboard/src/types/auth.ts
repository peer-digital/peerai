import { Role, Permission } from './rbac';

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  role: Role;
  name?: string;
  token_limit: number;  // Default is 2500
  permissions?: Permission[];
  default_api_key_id?: number;
  default_api_key?: string;
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
  terms_accepted?: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials, rolePath?: string) => Promise<void>;
  logout: () => void;
}