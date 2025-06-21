import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';

export const login = async (emailOrPhone, password) => {
  const endpoint = buildApiEndpoint('auth/login');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, {
      email_or_phone: emailOrPhone,
      password,
    }),
    {
      defaultValue: null,
      transformData: (data) => data,
      logErrors: true
    }
  );
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
