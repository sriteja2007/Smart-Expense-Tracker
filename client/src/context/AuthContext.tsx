import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  UserProfile,
  RegisterInput,
  LoginInput,
  UpdateProfileInput
} from '@lumaspend/shared';
import { ApiClient } from '@/lib/api';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (credentials: LoginInput) => Promise<boolean>;
  register: (data: RegisterInput) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: UpdateProfileInput) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session from cookie on mount
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiClient.request<UserProfile>('/auth/me', {
        method: 'GET',
        credentials: 'include'
      });

      if (res.success) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (credentials: LoginInput): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiClient.request<{ user: UserProfile; token: string }>('/auth/login', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(credentials)
      });

      if (res.success) {
        setUser(res.data.user);
        return true;
      } else {
        setError(res.error.message || 'Login failed');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to server');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterInput): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiClient.request<{ user: UserProfile; token: string }>('/auth/register', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (res.success) {
        setUser(res.data.user);
        return true;
      } else {
        setError(res.error.message || 'Registration failed');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to server');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ApiClient.request<{ user: UserProfile; token: string }>('/auth/google', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ idToken })
      });

      if (res.success) {
        setUser(res.data.user);
        return true;
      } else {
        setError(res.error.message || 'Google sign-in failed');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to server');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await ApiClient.request('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (data: UpdateProfileInput): Promise<boolean> => {
    try {
      const res = await ApiClient.request<UserProfile>('/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (res.success && res.data) {
        setUser(res.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        loginWithGoogle,
        logout,
        updateProfile,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
