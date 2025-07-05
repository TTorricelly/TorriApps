/**
 * API Helper utilities for consistent API response handling in web application
 * Ported from mobile app for consistency
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
 * Build API endpoint URL with version prefix and tenant context
 * @param {string} endpoint - API endpoint
 * @param {string} version - API version (default: v1)
 * @param {Object} options - Options object
 * @param {boolean} options.isPublic - Force public endpoint (no tenant context)
 * @param {string} options.tenantSlug - Tenant slug for tenant-aware endpoints
 * @returns {string} Full API endpoint
 */
export const buildApiEndpoint = (endpoint, version = 'v1', options = {}) => {
  const { isPublic = false, tenantSlug = null } = options;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (isPublic) {
    return `api/${version}/${cleanEndpoint}`;
  }
  
  const currentTenantSlug = tenantSlug || getTenantSlugFromUrl();
  if (!currentTenantSlug) {
    throw new Error('Tenant slug is required for API calls');
  }
  
  return `api/${version}/${currentTenantSlug}/${cleanEndpoint}`;
};

/**
 * Extract tenant slug from current URL
 * @returns {string|null} Tenant slug or null if not found
 */
const getTenantSlugFromUrl = () => {
  const path = window.location.pathname;
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length > 0 && !['login', 'dashboard', 'services', 'appointments', 'profile', 'professional'].includes(segments[0])) {
    return segments[0];
  }
  
  return null;
};

/**
 * Normalize email or phone input for API requests
 * @param {string} input - Email or phone input
 * @returns {string} Normalized input
 */
export const normalizeEmailOrPhone = (input) => {
  if (!input) return input;
  
  // Import here to avoid circular dependencies
  const { normalizeEmailOrPhone: normalize } = import('./phoneUtils');
  return normalize(input);
};

/**
 * Standard error message formatter
 * @param {Error} error - The error object
 * @returns {string} User-friendly error message
 */
export const formatErrorMessage = (error) => {
  if (error.response?.status === 401) {
    return 'Credenciais inválidas';
  } else if (error.response?.status >= 500) {
    return 'Erro no servidor. Tente novamente.';
  } else if (error.code === 'ECONNABORTED') {
    return 'Tempo limite excedido. Verifique sua conexão.';
  }
  
  return error.response?.data?.detail || error.message || 'Erro ao processar solicitação';
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
          const apiClient = import('../config/api').default;
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
          const apiClient = import('../config/api').default;
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
          const apiClient = import('../config/api').default;
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
          const apiClient = import('../config/api').default;
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
          const apiClient = import('../config/api').default;
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