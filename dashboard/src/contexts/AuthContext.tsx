'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { AuthData, AuthResponse } from '@/types/api';

interface User {
  id: string;
  alias?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (authData: AuthData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load tokens and verify session on mount
    apiClient.loadTokens();
    verifySession();
  }, []);

  const verifySession = async () => {
    try {
      // Check if tokens exist in localStorage before making request
      if (typeof window !== 'undefined') {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setLoading(false);
          return;
        }
      }

      const response = await apiClient.get<User>('/auth/me');
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error: any) {
      // Silently ignore 401 errors (not authenticated)
      if (error.response?.status !== 401) {
        console.error('Session verification failed:', error);
      }
      apiClient.clearTokens();
    } finally {
      setLoading(false);
    }
  };

  const login = async (authData: AuthData) => {
    setLoading(true);
    try {
      const response = await apiClient.post<AuthResponse['data']>('/auth/telegram', authData);

      if (response.success && response.data) {
        const { user: userData, accessToken, refreshToken } = response.data;
        apiClient.setTokens(accessToken, refreshToken);
        setUser(userData);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      apiClient.clearTokens();
      setUser(null);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
