import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../lib/api';
import { getAdminToken, setAdminToken, clearAdminToken } from '../lib/authStorage';

const API_BASE = '/api';

interface AdminAuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

async function adminFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || response.statusText);
  }
  return response.json();
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      adminFetch<User>('/auth/me')
        .then((u) => {
          if (u.role === 'ADMIN' || u.role === 'STAFF') {
            setUser(u);
          } else {
            clearAdminToken();
          }
        })
        .catch(() => {
          clearAdminToken();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await adminFetch<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.user.role !== 'ADMIN' && data.user.role !== 'STAFF') {
      throw new Error('Acceso denegado. Se requiere rol de administrador.');
    }

    setAdminToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
