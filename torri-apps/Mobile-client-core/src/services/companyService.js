import apiClient from '../config/api';
import { API_ENDPOINTS } from '../../../Shared/Constans/Api';

/**
 * Fetches basic company information for the mobile app.
 * This is a public endpoint that doesn't require authentication.
 * @returns {Promise<object>} The company information (id, name, logo_url).
 * @throws {Error} If the request fails or the server returns an error.
 */
export const getCompanyInfo = async () => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.COMPANY}/info`);
    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(error.response.data.detail || 'Failed to fetch company information');
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Failed to fetch company information: No response from server.');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Failed to fetch company information: ${error.message}`);
    }
  }
};