import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import apiClient from '../config/api';

// Image fields for user data
const USER_IMAGE_FIELDS = ['photo_url', 'avatar_url', 'profile_picture_url'];

/**
 * Fetches the current authenticated user's profile.
 * @returns {Promise<object>} The user profile data.
 */
export const getUserProfile = async () => {
  const endpoint = buildApiEndpoint('users/me');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: null,
      transformData: (data) => transformEntityWithImages(data, USER_IMAGE_FIELDS)
    }
  );
};

/**
 * Updates the current authenticated user's profile.
 * @param {object} profileData - The profile data to update (fullName, email, phone_number, etc.)
 * @returns {Promise<object>} The updated user profile data.
 */
export const updateUserProfile = async (profileData) => {
  const endpoint = buildApiEndpoint('users/me');
  
  return withApiErrorHandling(
    () => apiClient.put(endpoint, profileData),
    {
      defaultValue: null,
      transformData: (data) => transformEntityWithImages(data, USER_IMAGE_FIELDS)
    }
  );
};
