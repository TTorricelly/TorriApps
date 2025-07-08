/**
 * API Client Configuration
 * Matches mobile app's api.js patterns exactly
 */

import axios from 'axios';
import { API_BASE_URL } from './environment';

// Token storage key - standardize with mobile app
const AUTH_TOKEN_KEY = 'authToken';

// Create API client with same configuration as mobile app
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // FastAPI-compatible parameter serialization (matches mobile app)
  paramsSerializer: function (params) {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        // FastAPI expects array parameters to be sent as multiple parameters with the same key
        value.forEach(item => {
          if (item !== null && item !== undefined) {
            searchParams.append(key, item);
          }
        });
      } else if (value !== null && value !== undefined) {
        searchParams.append(key, value);
      }
    });
    
    return searchParams.toString();
  }
});

// Request interceptor for auth token (matches mobile app)
apiClient.interceptors.request.use(
  (config) => {
    try {
      // First check the standardized auth token key
      let token = localStorage.getItem(AUTH_TOKEN_KEY);
      
      // Fallback to existing web app storage format for backward compatibility
      if (!token) {
        const authStorage = localStorage.getItem('torri-auth-storage');
        if (authStorage) {
          const parsedStorage = JSON.parse(authStorage);
          token = parsedStorage.state?.token;
        }
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Ignore auth token retrieval errors - request will proceed without auth
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling (matches mobile app)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Log 401 errors but don't auto-logout for persistent login
      // Users will only be logged out when they manually logout
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;