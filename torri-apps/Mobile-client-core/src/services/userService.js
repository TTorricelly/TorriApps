import apiClient from '../config/api'; // Path to the configured Axios instance
import { API_ENDPOINTS } from '../../../Shared/Constans/Api'; // Corrected import path

/**
 * Fetches the current authenticated user's profile.
 * @returns {Promise<object>} The user profile data.
 * @throws {Error} If the request fails or the server returns an error.
 */
export const getUserProfile = async () => {
  try {
    // The base URL and /api/v1 prefix are handled by the Axios instance.
    // API_ENDPOINTS.USERS is '/users', so '/users' + '/me' gives '/users/me'.
    // However, the backend route is defined as /users/me directly, not /users + /me.
    // So, we should use the direct path. Let's assume API_ENDPOINTS.USERS.ME will be '/users/me'
    // For now, hardcoding '/users/me' is safer if such a constant isn't available.
    // const profilePath = API_ENDPOINTS.USERS ? `${API_ENDPOINTS.USERS}/me` : '/users/me';

    // Use the USERS constant and append /me as per standard practice for a "current user" endpoint.
    // The backend route for /users/me is GET /users/me, and API_ENDPOINTS.USERS is /api/v1/users
    const response = await apiClient.get(`${API_ENDPOINTS.USERS}/me`);
    return response.data; // The backend returns the user profile object directly
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMessage = error.response.data.detail || `Failed to fetch profile: ${error.response.status}`;
      throw new Error(errorMessage);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Failed to fetch profile: No response from server.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }
  }
};

/**
 * Updates the current authenticated user's profile.
 * @param {object} profileData - The profile data to update (fullName, email, phone_number, etc.)
 * @returns {Promise<object>} The updated user profile data.
 * @throws {Error} If the request fails or the server returns an error.
 */
export const updateUserProfile = async (profileData) => {
  try {
    // Make PUT request to update user profile
    const response = await apiClient.put(`${API_ENDPOINTS.USERS}/me`, profileData);
    return response.data; // The backend returns the updated user profile object
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMessage = error.response.data.detail || error.response.data.message || `Failed to update profile: ${error.response.status}`;
      throw new Error(errorMessage);
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Failed to update profile: No response from server.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }
};
