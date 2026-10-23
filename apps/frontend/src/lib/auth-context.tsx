'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from './api';

export interface Center {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export interface User {
  id: string;
  userName?: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: string;
  center: Center;
  permissions: string[];
  sessionId: string;
  employeeId?: string;
}

export interface InitialSetupData {
  firstName: string;
  lastName: string;
  userName?: string;
  email?: string;
  password: string;
  phone?: string;
  centerName?: string;
}

interface AuthContextType {
  user: User | null;
  activeCenter: Center | null;
  availableCenters: Center[];
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  initialSetup: (data: InitialSetupData) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  switchCenter: (center: Center) => void;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  activeCenter: null,
  availableCenters: [],
  loading: true,
  login: async () => {},
  initialSetup: async () => {},
  changePassword: async () => {},
  logout: async () => {},
  switchCenter: () => {},
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeCenter, setActiveCenter] = useState<Center | null>(null);
  const [availableCenters, setAvailableCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);

  // Load session from localStorage on initial render
  useEffect(() => {
    async function initAuth() {
      const savedUser = localStorage.getItem('aegis_user');
      const savedToken = localStorage.getItem('aegis_token');

      if (savedUser && savedToken) {
        try {
          const parsedUser = JSON.parse(savedUser) as User;
          setUser(parsedUser);

          const savedCenterId = localStorage.getItem('aegis_active_center_id');
          if (savedCenterId && parsedUser.role === 'SUPER_ADMIN') {
            // Super admin can have custom center override
            setActiveCenter({
              id: savedCenterId,
              code: localStorage.getItem('aegis_active_center_code') || '',
              name: localStorage.getItem('aegis_active_center_name') || '',
            });
          } else {
            setActiveCenter(parsedUser.center);
            localStorage.setItem('aegis_active_center_id', parsedUser.center.id);
            localStorage.setItem('aegis_active_center_name', parsedUser.center.name);
          }

          // Fetch centers list for switcher
          try {
            const centers = await apiRequest<Center[]>('/centers');
            setAvailableCenters(centers);
          } catch (e) {
            setAvailableCenters([parsedUser.center]);
          }
        } catch (e) {
          localStorage.removeItem('aegis_user');
          localStorage.removeItem('aegis_token');
        }
      }
      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, userName: username, email: username, password }),
      });

      localStorage.setItem('aegis_token', res.accessToken);
      localStorage.setItem('aegis_user', JSON.stringify(res.user));
      localStorage.setItem('aegis_active_center_id', res.user.center.id);
      localStorage.setItem('aegis_active_center_name', res.user.center.name);
      localStorage.setItem('aegis_active_center_code', res.user.center.code);

      setUser(res.user);
      setActiveCenter(res.user.center);

      // Fetch centers list
      try {
        const centers = await apiRequest<Center[]>('/centers', {
          headers: { Authorization: `Bearer ${res.accessToken}` },
        });
        setAvailableCenters(centers);
      } catch (e) {
        setAvailableCenters([res.user.center]);
      }
    } finally {
      setLoading(false);
    }
  };

  const initialSetup = async (data: InitialSetupData) => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/setup', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      localStorage.setItem('aegis_token', res.accessToken);
      localStorage.setItem('aegis_user', JSON.stringify(res.user));
      localStorage.setItem('aegis_active_center_id', res.user.center.id);
      localStorage.setItem('aegis_active_center_name', res.user.center.name);
      localStorage.setItem('aegis_active_center_code', res.user.center.code);

      setUser(res.user);
      setActiveCenter(res.user.center);

      try {
        const centers = await apiRequest<Center[]>('/centers', {
          headers: { Authorization: `Bearer ${res.accessToken}` },
        });
        setAvailableCenters(centers);
      } catch (e) {
        setAvailableCenters([res.user.center]);
      }
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore error on logout
    } finally {
      localStorage.removeItem('aegis_token');
      localStorage.removeItem('aegis_user');
      localStorage.removeItem('aegis_active_center_id');
      localStorage.removeItem('aegis_active_center_name');
      setUser(null);
      setActiveCenter(null);
      window.location.href = '/login';
    }
  };

  const switchCenter = (center: Center) => {
    setActiveCenter(center);
    localStorage.setItem('aegis_active_center_id', center.id);
    localStorage.setItem('aegis_active_center_name', center.name);
    localStorage.setItem('aegis_active_center_code', center.code);
    // Refresh current view to re-scope tenant data
    window.location.reload();
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.permissions.includes('*')) return true;
    return user.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeCenter,
        availableCenters,
        loading,
        login,
        initialSetup,
        changePassword,
        logout,
        switchCenter,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
