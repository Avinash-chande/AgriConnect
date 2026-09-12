import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if present in localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('agri_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 Token Refresh & Error Formatting
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Check if error is 401 and request has not been retried yet
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = localStorage.getItem('agri_refresh_token');
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          storedRefreshToken ? { refreshToken: storedRefreshToken } : {},
          { withCredentials: true }
        );

        const newAccessToken =
          refreshResponse.data?.data?.tokens?.accessToken ||
          refreshResponse.data?.data?.accessToken ||
          refreshResponse.data?.tokens?.accessToken ||
          refreshResponse.data?.accessToken;

        const newRefreshToken =
          refreshResponse.data?.data?.tokens?.refreshToken ||
          refreshResponse.data?.data?.refreshToken ||
          refreshResponse.data?.tokens?.refreshToken ||
          refreshResponse.data?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('agri_access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('agri_refresh_token', newRefreshToken);
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          processQueue(null, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error('No access token returned from refresh');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('agri_access_token');
        localStorage.removeItem('agri_refresh_token');
        localStorage.removeItem('agri_user');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Format clean user-friendly error message
    let message = 'An unexpected error occurred. Please try again.';

    if (error.response?.data) {
      const data = error.response.data as any;
      if (data.message) {
        message = data.message;
      }
      if (data.meta?.errors && Array.isArray(data.meta.errors) && data.meta.errors.length > 0) {
        message = data.meta.errors.map((e: { field?: string; message: string }) => e.message).join('. ');
      }
    } else if (error.request) {
      message = 'Network error. Could not connect to AgriConnect backend server.';
    }

    const enhancedError: any = new Error(message);
    enhancedError.response = error.response;
    enhancedError.status = error.response?.status;
    enhancedError.isAxiosError = true;

    return Promise.reject(enhancedError);
  }
);

export default api;
