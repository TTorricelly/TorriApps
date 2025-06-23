import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';

export const login = async (emailOrPhone, password) => {
  // Try different possible endpoints
  const endpoints = [
    buildApiEndpoint('auth/login'),      // /api/v1/auth/login
    '/api/auth/login',                   // /api/auth/login (no version)
    '/auth/login',                       // /auth/login (no api prefix)
    '/login'                             // /login (simple)
  ];
  
  const loginData = {
    email_or_phone: emailOrPhone,
    password,
  };
  
  console.log('[AuthService] Login attempt:', {
    emailOrPhone: emailOrPhone?.substring(0, 3) + '***',
    hasPassword: !!password
  });
  
  // Try each endpoint until one works
  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    console.log(`[AuthService] Trying endpoint ${i + 1}/${endpoints.length}:`, endpoint);
    
    try {
      const response = await apiClient.post(endpoint, loginData);
      console.log('[AuthService] Login successful with endpoint:', endpoint);
      return response.data;
    } catch (error) {
      console.log(`[AuthService] Endpoint ${endpoint} failed:`, error.response?.status);
      
      // If this is the last endpoint, throw the error
      if (i === endpoints.length - 1) {
        throw new Error(
          error.response?.data?.detail || 
          error.response?.data?.message || 
          `Login failed: HTTP ${error.response?.status}`
        );
      }
      // Continue to next endpoint
    }
  }
};

export const register = async (userData) => {
  const endpoint = buildApiEndpoint('users/register');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, userData),
    {
      defaultValue: null,
      transformData: (data) => data,
      logErrors: true
    }
  );
};

// Example for a potential future function:
// export const refreshToken = async (currentToken) => {
//   try {
//     const response = await apiClient.post(API_ENDPOINTS.AUTH.REFRESH, { token: currentToken });
//     return response.data;
//   } catch (error) {
//     throw new Error(error.response?.data?.detail || 'Token refresh failed');
//   }
// };
