import axios from 'axios';

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
  (config) => {
    const token = localStorage.getItem('agri_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Extract clean error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred. Please try again.';

    if (error.response?.data) {
      const data = error.response.data;
      if (data.message) {
        message = data.message;
      }
      if (data.meta?.errors && Array.isArray(data.meta.errors) && data.meta.errors.length > 0) {
        message = data.meta.errors.map((e: { field?: string; message: string }) => e.message).join('. ');
      }
    } else if (error.request) {
      message = 'Network error. Could not connect to AgriConnect backend server.';
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
