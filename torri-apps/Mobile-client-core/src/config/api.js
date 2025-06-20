import axios from 'axios';
import { API_ENDPOINTS } from '../../../Shared/Constans/Api'; // Adjust path as needed
import AsyncStorage from '@react-native-async-storage/async-storage'; // Or your preferred storage
import { API_BASE_URL } from './environment'; // Use environment-specific base URL

const apiClient = axios.create({
  baseURL: API_BASE_URL, // Use environment config instead of shared constants
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken'); // Key for storing token
    console.log('API Request Interceptor - Token:', token ? 'Present' : 'Missing');
    console.log('API Request Interceptor - URL:', config.url);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API Request Interceptor - Authorization header set');
    } else {
      console.log('API Request Interceptor - No token found in AsyncStorage');
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
