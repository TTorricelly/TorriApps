/**
 * Authentication Service
 * Matches mobile app's authService.js patterns exactly
 */

import { normalizeEmailOrPhone } from '../utils/phoneUtils'
import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers'
import apiClient from '../config/api'

// Login function - matches mobile app exactly
export const login = async (emailOrPhone, password) => {
  const endpoint = buildApiEndpoint('auth/login');
  
  // Normalize the input according to mobile app standards
  const normalizedEmailOrPhone = normalizeEmailOrPhone(emailOrPhone);
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, {
      email_or_phone: normalizedEmailOrPhone,
      password,
    }),
    {
      defaultValue: null,
      transformData: (data) => {
        return data;
      },
      logErrors: true
    }
  );
};

// Logout function - matches mobile app
export const logout = async () => {
  const endpoint = buildApiEndpoint('auth/logout');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint),
    {
      defaultValue: true,
      transformData: () => {
        return true;
      },
      logErrors: false // Don't log logout errors
    }
  );
};

// Refresh token function - matches mobile app structure  
export const refreshToken = async () => {
  const endpoint = buildApiEndpoint('auth/refresh');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint),
    {
      defaultValue: null,
      transformData: (data) => {
        return data;
      },
      logErrors: true
    }
  );
};

// Validate token function
export const validateToken = async () => {
  const endpoint = buildApiEndpoint('auth/me');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: null,
      transformData: (data) => data,
      logErrors: true
    }
  );
};

// Export as service object (for backward compatibility with existing web app)
export const authService = {
  login,
  logout,
  refreshToken,
  validateToken
};