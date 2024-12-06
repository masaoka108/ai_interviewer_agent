import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import apiClient from '../api/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const saveUser = (userData: User | null) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('user');
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('Login attempt for:', email);
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      // トークン取得
      const tokenResponse = await apiClient.post('/api/v1/login/access-token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      console.log('Token response:', tokenResponse.data);
      
      if (!tokenResponse.data.access_token) {
        console.error('No access token received');
        throw new Error('認証に失敗しました');
      }

      const { access_token } = tokenResponse.data;
      localStorage.setItem('token', access_token);
      
      // ユーザー情報取得
      const userResponse = await apiClient.get('/api/v1/users/me');
      console.log('User data response:', userResponse.data);
      
      if (!userResponse.data) {
        console.error('No user data received');
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      const userData = userResponse.data;
      saveUser(userData);
      return userData;
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    saveUser(null);
  };

  const checkAuth = async () => {
    try {
      if (typeof window !== 'undefined' && window.location.pathname.includes('/login')) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        saveUser(null);
        setLoading(false);
        return;
      }

      const response = await apiClient.get('/api/v1/users/me');
      saveUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      saveUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 