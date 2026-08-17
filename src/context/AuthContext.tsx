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
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  mobile?: string;
  role: 'farmer' | 'worker' | 'admin' | 'Farmer' | 'Worker' | 'Admin' | string;
  isVerified?: boolean;
  isPhoneVerified?: boolean;
  isPremium?: boolean;
  isActive?: boolean;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string | Date | null;
  farmerProfile?: any;
  workerProfile?: any;
  adminRole?: any;
  identityVerified?: boolean;
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

const normalizeUser = (rawUser: any): UserAccount => {
  if (!rawUser) return rawUser;
  const name = rawUser.name || rawUser.fullName || rawUser.email || 'User';
  const fullName = rawUser.fullName || rawUser.name || name;
  const phone = rawUser.phone || rawUser.mobile || '';
  const mobile = rawUser.mobile || rawUser.phone || phone;
  return {
    ...rawUser,
    name,
    fullName,
    phone,
    mobile,
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

<<<<<<< Updated upstream
  const normalizeUser = (userData: any): UserAccount => {
    const nameVal = userData.fullName || userData.name || 'User';
    return {
      ...userData,
      fullName: nameVal,
      role: userData.role || 'farmer',
    };
  };

  const setSession = (userData: UserAccount, token?: string) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    localStorage.setItem('agri_user', JSON.stringify(normalized));
=======
  const setSession = (userData: any, token?: string) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
>>>>>>> Stashed changes
    if (token) {
      localStorage.setItem('agri_access_token', token);
    }
  };

  const clearSession = () => {
    setUser(null);
    localStorage.removeItem('agri_access_token');
    localStorage.removeItem('agri_user');
  };

  const checkSession = async () => {
    const token = localStorage.getItem('agri_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getCurrentUserApi();
      if (data.data && data.data.user) {
<<<<<<< Updated upstream
        const normalized = normalizeUser(data.data.user);
        setUser(normalized);
        localStorage.setItem('agri_user', JSON.stringify(normalized));
=======
        setUser(normalizeUser(data.data.user));
>>>>>>> Stashed changes
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
    return normalizeUser(loggedInUser);
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

    return normalizeUser(registeredUser);
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

    return normalizeUser(registeredUser);
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
