/**
 * Professional Service for handling professional operations
 * Maintains identical API endpoints and logic from Mobile-client-core
 */

import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import apiClient from '../config/api';

// Image fields for professional data
const PROFESSIONAL_IMAGE_FIELDS = ['photo_url', 'avatar_url'];

/**
 * Fetches professionals available for a specific service.
 * @param {string} serviceId - The ID of the service.
 * @returns {Promise<Array>} Array of professionals.
 */
export const getProfessionalsForService = async (serviceId) => {
  const endpoint = buildApiEndpoint('professionals/');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, {
      params: {
        service_id: serviceId
      }
    }),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS),
      logErrors: true
    }
  );
};

/**
 * Fetches all professionals.
 * @returns {Promise<Array>} Array of all professionals.
 */
export const getAllProfessionals = async () => {
  const endpoint = buildApiEndpoint('professionals/');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS),
      logErrors: true
    }
  );
};