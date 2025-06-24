import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import { normalizeEmailOrPhone, normalizePhoneNumber } from '../utils/phoneUtils';
import apiClient from '../config/api';

export const login = async (emailOrPhone, password) => {
  const endpoint = buildApiEndpoint('auth/login');
  
  // Normalize the input according to best practices
  const normalizedEmailOrPhone = normalizeEmailOrPhone(emailOrPhone);
  
  console.log('[AuthService] Login attempt:', {
    endpoint,
    original: emailOrPhone,
    normalized: normalizedEmailOrPhone,
    hasPassword: !!password
  });
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, {
      email_or_phone: normalizedEmailOrPhone,
      password,
    }),
    {
      defaultValue: null,
      transformData: (data) => {
        console.log('[AuthService] Login successful');
        return data;
      },
      logErrors: true
    }
  );
};

export const register = async (userData) => {
  const endpoint = buildApiEndpoint('users/register');
  
  // Normalize phone number in registration data as well
  const normalizedUserData = {
    ...userData,
    phone_number: userData.phone_number ? normalizePhoneNumber(userData.phone_number) : userData.phone_number
  };
  
  console.log('[AuthService] Registration attempt:', {
    endpoint,
    email: normalizedUserData.email,
    hasPhone: !!normalizedUserData.phone_number,
    originalPhone: userData.phone_number,
    normalizedPhone: normalizedUserData.phone_number
  });
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, normalizedUserData),
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
