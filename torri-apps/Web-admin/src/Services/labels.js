/**
 * Labels API Service
 * 
 * This service provides API methods for managing labels in the system.
 * Labels are used for categorizing and organizing various entities.
 */

import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint } from '../Utils/apiHelpers';

/**
 * Labels API with full CRUD functionality
 */
export const labelsApi = {
  /**
   * Get all labels with enhanced filtering and pagination
   * @param {Object} options - Query options
   * @param {number} options.skip - Number of records to skip (pagination)
   * @param {number} options.limit - Maximum number of records to return
   * @param {string} options.search - Search term for name or description
   * @param {boolean} options.is_active - Filter by active status
   * @returns {Promise<Object>} Labels response with pagination info
   */
  getAll: async (options = {}) => {
    const params = {};
    
    // Add pagination parameters
    if (options.skip !== undefined) params.skip = options.skip;
    if (options.limit !== undefined) params.limit = options.limit;
    
    // Add filtering parameters
    if (options.search) params.search = options.search;
    if (options.is_active !== undefined) params.is_active = options.is_active;
    
    const endpoint = buildApiEndpoint('labels');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params }),
      {
        defaultValue: {
          items: [],
          total: 0,
          page: 1,
          size: 0,
          pages: 0
        },
        transformData: (data) => data || {
          items: [],
          total: 0,
          page: 1,
          size: 0,
          pages: 0
        }
      }
    );
  },
  
  /**
   * Create a new label
   * @param {Object} labelData - Label data
   * @param {string} labelData.name - Label name (required)
   * @param {string} labelData.description - Label description (optional)
   * @param {string} labelData.color - Hex color code (optional, defaults to #00BFFF)
   * @returns {Promise<Object>} Created label
   */
  create: async (labelData) => {
    const endpoint = buildApiEndpoint('labels');
    
    return withApiErrorHandling(
      () => api.post(endpoint, labelData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },
  
  /**
   * Update an existing label
   * @param {string} id - Label ID
   * @param {Object} labelData - Updated label data
   * @returns {Promise<Object>} Updated label
   */
  update: async (id, labelData) => {
    const endpoint = buildApiEndpoint(`labels/${id}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, labelData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },
  
  /**
   * Delete a label
   * @param {string} id - Label ID
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    const endpoint = buildApiEndpoint(`labels/${id}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: true,
        transformData: () => true
      }
    );
  },
  
  /**
   * Get a specific label by ID
   * @param {string} id - Label ID
   * @returns {Promise<Object>} Label data
   */
  getById: async (id) => {
    const endpoint = buildApiEndpoint(`labels/${id}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },
  
  /**
   * Toggle the active status of a label
   * @param {string} id - Label ID
   * @returns {Promise<Object>} Updated label
   */
  toggleStatus: async (id) => {
    const endpoint = buildApiEndpoint(`labels/${id}/toggle`);
    
    return withApiErrorHandling(
      () => api.patch(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  }
};

export default labelsApi;