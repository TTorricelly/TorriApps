/**
 * Service Images API Service for App-client
 * 
 * This service provides API methods for fetching service images.
 * Service images are stored in Google Cloud Storage and are publicly accessible.
 */

import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';

/**
 * Service Images API with read-only functionality for App-client
 */
export const serviceImagesApi = {
  /**
   * Get all images for a service
   * @param {string} serviceId - Service ID
   * @returns {Promise<Array>} Array of service images
   */
  getServiceImages: async (serviceId) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images`, 'v1', { isPublic: true });
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => Array.isArray(data) ? data : []
      }
    );
  }
};

export default serviceImagesApi;