/**
 * Authentication and Session Types
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'primary_user' | 'admin' | 'guest';
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  expiresAt?: number;
  provider: 'supabase' | 'local_session';
}

export interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  mode: 'supabase' | 'local_storage';
}
