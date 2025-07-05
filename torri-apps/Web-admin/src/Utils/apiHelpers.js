/**
 * API Helper utilities for consistent API response handling
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
    }
    
    // Return default value on error
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
 * Extract tenant slug from current URL path
 * @returns {string|null} Tenant slug or null if not found
 */
export const getTenantSlugFromUrl = () => {
  const path = window.location.pathname;
  // Match patterns like /tenant-slug/... or /tenant-slug (but not /login, /register, etc.)
  const match = path.match(/^\/([a-z0-9_-]+)(?:\/|$)/);
  
  // Exclude common non-tenant paths
  const excludedPaths = ['login', 'register', 'auth', 'admin', 'api', 'docs'];
  if (match && !excludedPaths.includes(match[1])) {
    console.log(`DEBUG: Detected tenant slug '${match[1]}' from URL: ${path}`);
    return match[1];
  }
  
  console.log(`DEBUG: No tenant slug detected from URL: ${path}`);
  return null;
};

/**
 * Build API endpoint URL with version prefix and tenant context
 * @param {string} endpoint - API endpoint
 * @param {string} version - API version (default: v1)
 * @param {Object} options - Options object
 * @param {string|null} options.tenantSlug - Override tenant slug (auto-detected if not provided)
 * @param {boolean} options.isPublic - Force public endpoint (no tenant context)
 * @returns {string} Full API endpoint
 */
export const buildApiEndpoint = (endpoint, version = 'v1', options = {}) => {
  const { tenantSlug = null, isPublic = false } = options;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  if (isPublic) {
    // Force public endpoint - no tenant context
    return `/api/${version}/${cleanEndpoint}`;
  }
  
  const tenant = tenantSlug || getTenantSlugFromUrl();
  
  if (tenant) {
    return `/api/${version}/${tenant}/${cleanEndpoint}`;
  } else {
    // Fallback to non-tenant endpoint for public routes
    return `/api/${version}/${cleanEndpoint}`;
  }
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
        () => import('../api/client').then(({ api }) => api.get(apiEndpoint, { params })),
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
        () => import('../api/client').then(({ api }) => api.get(`${apiEndpoint}/${id}`)),
        {
          defaultValue: null,
          transformData: (data) => transformEntityWithImages(data, imageFields)
        }
      );
    },

    // Create new item
    create: async (data) => {
      return withApiErrorHandling(
        () => import('../api/client').then(({ api }) => api.post(apiEndpoint, data)),
        {
          defaultValue: null,
          transformData: (data) => transformEntityWithImages(data, imageFields)
        }
      );
    },

    // Update item
    update: async (id, data) => {
      return withApiErrorHandling(
        () => import('../api/client').then(({ api }) => api.put(`${apiEndpoint}/${id}`, data)),
        {
          defaultValue: null,
          transformData: (data) => transformEntityWithImages(data, imageFields)
        }
      );
    },

    // Delete item
    delete: async (id) => {
      return withApiErrorHandling(
        () => import('../api/client').then(({ api }) => api.delete(`${apiEndpoint}/${id}`)),
        {
          defaultValue: true,
          transformData: () => true
        }
      );
    }
  };
};