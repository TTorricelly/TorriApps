import axios from 'axios';
import { API_ENDPOINTS } from '../../../Shared/Constans/Api'; // Adjust path as needed
import AsyncStorage from '@react-native-async-storage/async-storage'; // Or your preferred storage

const apiClient = axios.create({
  baseURL: API_ENDPOINTS.BASE_URL,
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
      // Avoid retry loops for token refresh if that's ever implemented here
      // For now, just logout
      if (!originalRequest._retry) { // originalRequest._retry is a common flag for retry attempts
        originalRequest._retry = true;

        try {
          // Dynamically import the store to avoid circular dependencies if store imports apiClient
          // Or ensure store is initialized and accessible.
          // This is a common pattern: get the store's logout function.
          const useAuthStore = (await import('../store/authStore')).default;
          console.log('Interceptor: Detected 401, attempting logout.');
          await useAuthStore.getState().logout();
          // Optionally, navigate to login screen or show a message
          // This might be better handled by a navigation listener reacting to isAuthenticated changing.
        } catch (e) {
          console.error('Interceptor: Error during logout on 401:', e);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
