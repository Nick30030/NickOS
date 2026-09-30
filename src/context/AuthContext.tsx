import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState } from '../types/auth';
import { authService } from '../services/auth/AuthService';

interface AuthContextType extends AuthState {
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    mode: 'local_storage',
  });

  const loadSession = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));
      const state = await authService.getCurrentSession();
      setAuthState(state);
    } catch (err) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Auth loading failed',
      }));
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const signOut = async () => {
    await authService.signOut();
    await loadSession();
  };

  return (
    <AuthContext.Provider value={{ ...authState, refreshSession: loadSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
