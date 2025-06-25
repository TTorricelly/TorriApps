/**
 * User Service for handling user profile and account operations
 * Maintains identical API endpoints and logic from Mobile-client-core
 */

import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';

/**
 * Fetches the current user's profile information.
 * @returns {Promise<Object>} User profile data.
 */
export const getUserProfile = async () => {
  const endpoint = buildApiEndpoint('users/me');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: null,
      transformData: (data) => data,
      logErrors: true
    }
  );
};

/**
 * Updates the current user's profile information.
 * @param {Object} profileData - Updated profile data.
 * @returns {Promise<Object>} Updated user profile data.
 */
export const updateUserProfile = async (profileData) => {
  const endpoint = buildApiEndpoint('users/me');
  
  return withApiErrorHandling(
    () => apiClient.put(endpoint, profileData),
    {
      defaultValue: null,
      transformData: (data) => data,
      logErrors: true
    }
  );
};