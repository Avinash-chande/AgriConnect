import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  loginApi,
  registerFarmerApi,
  registerWorkerApi,
  logoutApi,
  getCurrentUserApi,
  googleAuthApi,
  verifyOTPApi,
} from '../services/authService';
import type {
  LoginPayload,
  RegisterFarmerPayload,
  RegisterWorkerPayload,
  GoogleAuthPayload,
  PendingOtpResult,
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
  googleLogin: (payload: GoogleAuthPayload) => Promise<UserAccount>;
  registerFarmer: (payload: RegisterFarmerPayload) => Promise<PendingOtpResult>;
  registerWorker: (payload: RegisterWorkerPayload) => Promise<PendingOtpResult>;
  verifyRegistrationOTP: (email: string, otpCode: string) => Promise<UserAccount>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (rawUser: any): UserAccount => {
  if (!rawUser) return rawUser;
  const nameVal = rawUser.name || rawUser.fullName || rawUser.email || 'User';
  const phone = rawUser.phone || rawUser.mobile || '';
  const mobile = rawUser.mobile || rawUser.phone || phone;
  return {
    ...rawUser,
    name: nameVal,
    fullName: nameVal,
    phone,
    mobile,
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSession = (userData: any, tokens?: { accessToken?: string; refreshToken?: string }) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);
    try {
      localStorage.setItem('agri_user', JSON.stringify(normalized));
      if (tokens?.accessToken) {
        localStorage.setItem('accessToken', tokens.accessToken);
      }
      if (tokens?.refreshToken) {
        localStorage.setItem('refreshToken', tokens.refreshToken);
      }
    } catch {
      // Ignore localStorage exceptions in private browsing
    }
  };

  const clearSession = () => {
    setUser(null);
    try {
      localStorage.removeItem('agri_user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } catch {
      // Ignore localStorage exceptions
    }
  };

  const checkSession = async () => {
    try {
      const response = await getCurrentUserApi();
      const rawUser = response.data?.user || response.user;
      if (rawUser) {
        const normalized = normalizeUser(rawUser);
        setUser(normalized);
        localStorage.setItem('agri_user', JSON.stringify(normalized));
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
    const savedUser = localStorage.getItem('agri_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('agri_user');
      }
    }
    checkSession();
  }, []);

  const login = async (payload: LoginPayload): Promise<UserAccount> => {
    setIsLoading(true);
    try {
      const response = await loginApi(payload);
      const data = response.data || response;
      const rawUser = data.user;
      const tokens = data.tokens;

      if (!rawUser) {
        throw new Error(response.message || 'Login failed. Invalid response structure.');
      }

      setSession(rawUser, tokens);
      return normalizeUser(rawUser);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (payload: GoogleAuthPayload): Promise<UserAccount> => {
    setIsLoading(true);
    try {
      const response = await googleAuthApi(payload);
      const data = response.data || response;
      const rawUser = data.user;
      const tokens = data.tokens;

      if (!rawUser) {
        throw new Error(response.message || 'Google Sign-In failed.');
      }

      setSession(rawUser, tokens);
      return normalizeUser(rawUser);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Google Sign-In failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register Farmer — OTP Gated:
   * Returns { requiresOtp: true, email }
   * Does NOT authenticate or create user session.
   */
  const registerFarmer = async (payload: RegisterFarmerPayload): Promise<PendingOtpResult> => {
    setIsLoading(true);
    try {
      const response = await registerFarmerApi(payload);
      const data = response.data || response;
      const email = data.email || payload.email.toLowerCase().trim();

      localStorage.setItem('pending_verification_email', email);
      return {
        requiresOtp: true,
        email,
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Farmer registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register Worker — OTP Gated:
   * Returns { requiresOtp: true, email }
   * Does NOT authenticate or create user session.
   */
  const registerWorker = async (payload: RegisterWorkerPayload): Promise<PendingOtpResult> => {
    setIsLoading(true);
    try {
      const response = await registerWorkerApi(payload);
      const data = response.data || response;
      const email = data.email || payload.email.toLowerCase().trim();

      localStorage.setItem('pending_verification_email', email);
      return {
        requiresOtp: true,
        email,
      };
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'Worker registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify Registration OTP:
   * Called on OTP verification screen.
   * Establishes authentication session ONLY after successful verification.
   */
  const verifyRegistrationOTP = async (email: string, otpCode: string): Promise<UserAccount> => {
    setIsLoading(true);
    try {
      const response = await verifyOTPApi({ email, otpCode });
      const data = response.data || response;
      const rawUser = data.user;
      const tokens = data.tokens;

      if (!rawUser) {
        throw new Error(response.message || 'Verification failed. Could not create account.');
      }

      setSession(rawUser, tokens);
      localStorage.removeItem('pending_verification_email');
      return normalizeUser(rawUser);
    } catch (err: any) {
      throw new Error(err.response?.data?.message || err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutApi();
    } catch {
      // Proceed with local logout regardless of network error
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
        googleLogin,
        registerFarmer,
        registerWorker,
        verifyRegistrationOTP,
        logout,
        checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
