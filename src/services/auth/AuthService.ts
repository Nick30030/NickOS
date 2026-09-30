import { AuthState, AuthUser } from '../../types/auth';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import { APP_CONFIG } from '../../config/app.config';

export class AuthService {
  private client = getSupabaseClient();

  async getCurrentSession(): Promise<AuthState> {
    if (isSupabaseConfigured && this.client) {
      try {
        const { data: { session }, error } = await this.client.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          const user: AuthUser = {
            id: session.user.id,
            email: session.user.email || APP_CONFIG.defaultUser.email,
            name: (session.user.user_metadata?.name as string) || APP_CONFIG.defaultUser.name,
            role: 'primary_user',
            createdAt: session.user.created_at,
          };
          return {
            session: {
              user,
              accessToken: session.access_token,
              expiresAt: session.expires_at,
              provider: 'supabase',
            },
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            mode: 'supabase',
          };
        }
      } catch (err) {
        console.warn('Supabase session fetch error, using local mode:', err);
      }
    }

    // Default Local Session for Nick
    const localUser: AuthUser = {
      id: APP_CONFIG.defaultUser.id,
      name: APP_CONFIG.defaultUser.name,
      email: APP_CONFIG.defaultUser.email,
      role: 'primary_user',
      createdAt: new Date().toISOString(),
    };

    return {
      session: {
        user: localUser,
        provider: 'local_session',
      },
      user: localUser,
      isAuthenticated: true,
      isLoading: false,
      error: null,
      mode: 'local_storage',
    };
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && this.client) {
      await this.client.auth.signOut();
    }
  }
}

export const authService = new AuthService();
