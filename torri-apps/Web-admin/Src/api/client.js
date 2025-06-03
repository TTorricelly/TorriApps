import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const getAuthToken = () => {
  return useAuthStore.getState().accessToken;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  withCredentials: true,
});

// Request interceptor to add Authorization header
api.interceptors.request.use(
  config => {
    const token = getAuthToken();
    
    // Add Authorization header for all authenticated requests
    // The JWT token contains tenant information, handled by TenantMiddleware
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling authentication errors
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Clear auth state and redirect to login
      useAuthStore.getState().clearAuth();
      
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);
