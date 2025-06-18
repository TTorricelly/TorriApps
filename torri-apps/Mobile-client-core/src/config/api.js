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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
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
      // Temporarily disable automatic logout for debugging
      console.log('Interceptor: Detected 401, but NOT logging out for debugging');
      console.log('Request URL:', originalRequest.url);
      console.log('Request headers:', originalRequest.headers);
      console.log('Error response:', error.response.data);
      
      // TODO: Re-enable automatic logout after debugging
      // if (!originalRequest._retry) {
      //   originalRequest._retry = true;
      //   try {
      //     const useAuthStore = (await import('../store/authStore')).default;
      //     console.log('Interceptor: Detected 401, attempting logout.');
      //     await useAuthStore.getState().logout();
      //   } catch (e) {
      //     console.error('Interceptor: Error during logout on 401:', e);
      //   }
      // }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
