/**
 * Service Images API Service
 * 
 * This service provides API methods for managing service images with label support.
 * Handles file uploads, image metadata, and label assignments.
 */

import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint } from '../Utils/apiHelpers';

/**
 * Service Images API with full CRUD functionality
 */
export const serviceImagesApi = {
  /**
   * Upload a new image for a service
   * @param {string} serviceId - Service ID
   * @param {File} file - Image file to upload
   * @param {Object} options - Upload options
   * @param {string} options.altText - Alternative text for accessibility
   * @param {boolean} options.isPrimary - Whether this should be the primary image
   * @param {string[]} options.labelIds - Array of label IDs to assign
   * @returns {Promise<Object>} Uploaded image data
   */
  uploadImage: async (serviceId, file, options = {}) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images`, 'v1');
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', file);
    
    if (options.altText) {
      formData.append('alt_text', options.altText);
    }
    
    if (options.isPrimary !== undefined) {
      formData.append('is_primary', options.isPrimary);
    }
    
    if (options.labelIds && options.labelIds.length > 0) {
      formData.append('label_ids', options.labelIds.join(','));
    }
    
    return withApiErrorHandling(
      () => api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },
  
  /**
   * Get all images for a service
   * @param {string} serviceId - Service ID
   * @returns {Promise<Array>} Array of service images
   */
  getServiceImages: async (serviceId) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images`, 'v1');
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => Array.isArray(data) ? data : []
      }
    );
  },
  
  /**
   * Update image metadata
   * @param {string} serviceId - Service ID
   * @param {string} imageId - Image ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated image data
   */
  updateImage: async (serviceId, imageId, updateData) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images/${imageId}`, 'v1');
    
    return withApiErrorHandling(
      () => api.put(endpoint, updateData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },
  
  /**
   * Delete an image
   * @param {string} serviceId - Service ID
   * @param {string} imageId - Image ID
   * @returns {Promise<boolean>} Success status
   */
  deleteImage: async (serviceId, imageId) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images/${imageId}`, 'v1');
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },
  
  /**
   * Assign a label to an image
   * @param {string} serviceId - Service ID
   * @param {string} imageId - Image ID
   * @param {string} labelId - Label ID
   * @returns {Promise<boolean>} Success status
   */
  assignLabel: async (serviceId, imageId, labelId) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images/${imageId}/labels`, 'v1');
    
    return withApiErrorHandling(
      () => api.post(endpoint, {}, { params: { label_id: labelId } }),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },
  
  /**
   * Remove a label from an image
   * @param {string} serviceId - Service ID
   * @param {string} imageId - Image ID
   * @param {string} labelId - Label ID
   * @returns {Promise<boolean>} Success status
   */
  removeLabel: async (serviceId, imageId, labelId) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images/${imageId}/labels/${labelId}`, 'v1');
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },
  
  /**
   * Reorder service images
   * @param {string} serviceId - Service ID
   * @param {Array} imageOrders - Array of {image_id, display_order} objects
   * @returns {Promise<boolean>} Success status
   */
  reorderImages: async (serviceId, imageOrders) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images/reorder`, 'v1');
    
    return withApiErrorHandling(
      () => api.put(endpoint, imageOrders),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  }
};

export default serviceImagesApi;