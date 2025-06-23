/**
 * API Helper utilities for consistent API response handling in React Native
 * Follows best practices for error handling and data validation
 */

import { processImageUrls } from './urlHelpers';

/**
 * Standard API response wrapper with error handling
 * @param {Function} apiCall - The API call function
 * @param {Object} options - Configuration options
 * @returns {Promise} Processed API response
 */
export const withApiErrorHandling = async (apiCall, options = {}) => {
  const {
    defaultValue = null,
    transformData = (data) => data,
    logErrors = true
  } = options;

  try {
    const response = await apiCall();
    return transformData(response.data);
  } catch (error) {
    if (logErrors) {
      console.error('API Error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data
      });
    }
    
    // For authentication errors, throw the error instead of returning default
    if (error.response?.status === 404 || error.response?.status === 401 || error.response?.status === 422) {
      throw new Error(error.response?.data?.detail || error.response?.data?.message || `HTTP ${error.response?.status}: ${error.response?.statusText}`);
    }
    
    // Return default value for other errors
    return defaultValue;
  }
};

/**
 * Ensure API response is an array (for list endpoints)
 * @param {any} data - API response data
 * @param {string} entityName - Name of entity for logging
 * @returns {Array} Always returns an array
 */
export const ensureArray = (data, entityName = 'items') => {
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data && typeof data === 'object') {
    // Handle paginated responses or wrapped data
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.results)) return data.results;
  }
  
  console.warn(`Expected array for ${entityName}, got:`, typeof data, data);
  return [];
};

/**
 * Standard transformer for entities with images
 * @param {Object|Array} data - Entity data
 * @param {string[]} imageFields - Image field names
 * @returns {Object|Array} Data with processed image URLs
 */
export const transformEntityWithImages = (data, imageFields = []) => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => processImageUrls(item, imageFields));
  }
  
  return processImageUrls(data, imageFields);
};

/**
 * Build API endpoint URL with version prefix
 * @param {string} endpoint - API endpoint
 * @param {string} version - API version (default: v1)
 * @returns {string} Full API endpoint
 */
export const buildApiEndpoint = (endpoint, version = 'v1') => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `/api/${version}/${cleanEndpoint}`;
};

/**
 * Standard CRUD operations factory
 * @param {Object} config - Configuration object
 * @returns {Object} CRUD operations
 */
export const createCrudApi = (config) => {
  const {
    endpoint,
    imageFields = [],
    entityName = 'item'
  } = config;

  const apiEndpoint = buildApiEndpoint(endpoint);

  return {
    // Get all items
    getAll: async (params = {}) => {
      return withApiErrorHandling(
        () => {
          const apiClient = require('../config/api').default;
          return apiClient.get(apiEndpoint, { params });
        },
        {
          defaultValue: [],
          transformData: (data) => {
            const items = ensureArray(data, entityName);
            return transformEntityWithImages(items, imageFields);
          }
        }
      );
    },

    // Get item by ID
    getById: async (id) => {
      return withApiErrorHandling(
        () => {
          const apiClient = require('../config/api').default;
          return apiClient.get(`${apiEndpoint}/${id}`);
        },
        {
          defaultValue: null,
          transformData: (data) => transformEntityWithImages(data, imageFields)
        }
      );
    },

    // Create new item
    create: async (data) => {
      return withApiErrorHandling(
        () => {
          const apiClient = require('../config/api').default;
          return apiClient.post(apiEndpoint, data);
        },
        {
          defaultValue: null,
          transformData: (data) => transformEntityWithImages(data, imageFields)
        }
      );
    },

    // Update item
    update: async (id, data) => {
      return withApiErrorHandling(
        () => {
          const apiClient = require('../config/api').default;
          return apiClient.put(`${apiEndpoint}/${id}`, data);
        },
        {
          defaultValue: null,
          transformData: (data) => transformEntityWithImages(data, imageFields)
        }
      );
    },

    // Delete item
    delete: async (id) => {
      return withApiErrorHandling(
        () => {
          const apiClient = require('../config/api').default;
          return apiClient.delete(`${apiEndpoint}/${id}`);
        },
        {
          defaultValue: true,
          transformData: () => true
        }
      );
    }
  };
};