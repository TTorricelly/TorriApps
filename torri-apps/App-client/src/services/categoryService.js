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

// Legacy image fields for backward compatibility
const LEGACY_SERVICE_IMAGE_FIELDS = ['image_url', 'liso_image_url', 'ondulado_image_url', 'cacheado_image_url', 'crespo_image_url'];

/**
 * Transform service images from new images array structure to format compatible with UI components
 * @param {Object} service - Service object with images array
 * @returns {Object} Service with processed images for UI consumption
 */
const transformServiceImages = (service) => {
  if (!service) return service;
  
  // Create a copy to avoid mutating original data
  const transformedService = { ...service };
  
  // If service has new images array, process it
  if (service.images && Array.isArray(service.images)) {
    // Sort images by display_order
    const sortedImages = [...service.images].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    
    // Store the processed images array for buildServiceImages compatibility
    transformedService._processedImages = sortedImages.map(img => ({
      src: img.file_path, // Already processed by backend
      caption: img.alt_text || 'Imagem do Serviço',
      isPrimary: img.is_primary || false,
      displayOrder: img.display_order || 0
    }));
    
    // For backward compatibility, also populate legacy fields if they don't exist
    // This ensures existing UI components continue to work
    if (!transformedService.image && sortedImages.length > 0) {
      const primaryImage = sortedImages.find(img => img.is_primary) || sortedImages[0];
      transformedService.image = primaryImage.file_path;
      transformedService.image_url = primaryImage.file_path;
    }
  }
  
  return transformedService;
};

/**
 * Enhanced transform function that handles both new images array and legacy static fields
 * @param {Object|Array} data - Service data
 * @returns {Object|Array} Transformed data with processed images
 */
const transformServicesWithImages = (data) => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(service => {
      // First apply new image transformation
      const transformedService = transformServiceImages(service);
      // Then apply legacy field processing for any remaining static fields
      return transformEntityWithImages(transformedService, LEGACY_SERVICE_IMAGE_FIELDS);
    });
  }
  
  // Single service
  const transformedService = transformServiceImages(data);
  return transformEntityWithImages(transformedService, LEGACY_SERVICE_IMAGE_FIELDS);
};

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
      transformData: (data) => transformServicesWithImages(data)
    }
  );
};