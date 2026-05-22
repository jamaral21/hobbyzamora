import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, User } from '../lib/api';
import { clearCustomerToken, getCustomerToken } from '../lib/authStorage';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; phone?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const token = getCustomerToken();
    if (token) {
      authAPI.getMe()
        .then(setUser)
        .catch(() => {
          clearCustomerToken();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await authAPI.login(email, password);
    setUser(user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    const { user } = await authAPI.register(email, password, name, phone);
    setUser(user);
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const { user } = await authAPI.googleLogin(credential);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    authAPI.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: { name?: string; phone?: string }) => {
    const updated = await authAPI.updateProfile(data);
    setUser(updated);
  }, []);

  const uploadAvatar = useCallback(async (file: File) => {
    const updated = await authAPI.uploadAvatar(file);
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        googleLogin,
        logout,
        updateProfile,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to check if user has required role
export function useRequireRole(...roles: string[]) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return { allowed: false, isLoading: true };
  if (!user) return { allowed: false, isLoading: false };
  if (roles.length === 0) return { allowed: true, isLoading: false };
  
  return { 
    allowed: roles.includes(user.role), 
    isLoading: false 
  };
}
