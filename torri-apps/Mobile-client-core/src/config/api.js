import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './environment';

const apiClient = axios.create({
  baseURL: API_BASE_URL, // Use environment config instead of shared constants
  headers: {
    'Content-Type': 'application/json',
  },
  // Configure parameter serialization for FastAPI compatibility
  paramsSerializer: function (params) {
    const searchParams = new URLSearchParams();
    for (const key in params) {
      const value = params[key];
      if (Array.isArray(value)) {
        // Send arrays as multiple parameters with the same key (FastAPI format)
        value.forEach(item => searchParams.append(key, item));
      } else if (value !== null && value !== undefined) {
        searchParams.append(key, value);
      }
    }
    return searchParams.toString();
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken'); // Key for storing token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors, e.g., 401 for logout
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  async (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    const originalRequest = error.config;

    // Check for 401 Unauthorized
    if (error.response?.status === 401) {
      // Don't auto-logout for appointment availability endpoint (expected 401 with fallback)
      const isAppointmentAvailabilityEndpoint = originalRequest.url?.includes('/appointments/professional/') && originalRequest.url?.includes('/availability');
      
      if (!isAppointmentAvailabilityEndpoint && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const useAuthStore = (await import('../store/authStore')).default;
          await useAuthStore.getState().logout();
        } catch (e) {
          console.error('Interceptor: Error during logout on 401:', e);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
