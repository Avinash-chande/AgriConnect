import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  loginApi,
  registerFarmerApi,
  registerWorkerApi,
  logoutApi,
  getCurrentUserApi,
} from '../services/authService';
import type {
  LoginPayload,
  RegisterFarmerPayload,
  RegisterWorkerPayload,
} from '../services/authService';

export interface UserAccount {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'farmer' | 'worker' | 'admin';
  isVerified: boolean;
  isPhoneVerified: boolean;
  farmerProfile?: any;
  workerProfile?: any;
}

interface AuthContextType {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<UserAccount>;
  registerFarmer: (payload: RegisterFarmerPayload) => Promise<UserAccount>;
  registerWorker: (payload: RegisterWorkerPayload) => Promise<UserAccount>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSession = (userData: UserAccount, token?: string) => {
    setUser(userData);
    if (token) {
      localStorage.setItem('agri_access_token', token);
    }
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('agri_access_token');
  };

  const checkSession = async () => {
    const token = localStorage.getItem('agri_access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getCurrentUserApi();
      if (data.data && data.data.user) {
        setUser(data.data.user);
      } else {
        clearSession();
      }
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (payload: LoginPayload): Promise<UserAccount> => {
    const data = await loginApi(payload);
    const loggedInUser = data.data.user;
    const token = data.data.tokens?.accessToken;
    setSession(loggedInUser, token);
    return loggedInUser;
  };

  const registerFarmer = async (
    payload: RegisterFarmerPayload
  ): Promise<UserAccount> => {
    const data = await registerFarmerApi(payload);

    const registeredUser = data.data.user;
    const token = data.data.tokens?.accessToken;

    setSession(registeredUser, token);

    localStorage.setItem(
      'pending_verification_email',
      registeredUser.email
    );

    return registeredUser;
  };

  const registerWorker = async (
    payload: RegisterWorkerPayload
  ): Promise<UserAccount> => {
    const data = await registerWorkerApi(payload);

    const registeredUser = data.data.user;
    const token = data.data.tokens?.accessToken;

    setSession(registeredUser, token);

    localStorage.setItem(
      'pending_verification_email',
      registeredUser.email
    );

    return registeredUser;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        registerFarmer,
        registerWorker,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
