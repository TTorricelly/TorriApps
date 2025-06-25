/**
 * Category Service for handling service categories and related services
 * Maintains identical API endpoints and logic from Mobile-client-core
 */

import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import apiClient from '../config/api';

// Image fields for category data
const CATEGORY_IMAGE_FIELDS = ['icon_url', 'image_url', 'banner_url', 'photo_url'];

/**
 * Fetches the list of service categories.
 * @returns {Promise<Array>} A list of category objects.
 */
export const getCategories = async () => {
  const endpoint = buildApiEndpoint('categories');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, CATEGORY_IMAGE_FIELDS)
    }
  );
};

// Image fields for service data
const SERVICE_IMAGE_FIELDS = ['image_url', 'liso_image_url', 'ondulado_image_url', 'cacheado_image_url', 'crespo_image_url'];

/**
 * Fetches the list of services for a given category.
 * @param {string} categoryId - The ID of the category.
 * @returns {Promise<Array>} A list of service objects.
 */
export const getServicesByCategory = async (categoryId) => {
  if (!categoryId) {
    throw new Error('Category ID is required to fetch services.');
  }
  
  const endpoint = buildApiEndpoint('services');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, { params: { category_id: categoryId } }),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, SERVICE_IMAGE_FIELDS)
    }
  );
};