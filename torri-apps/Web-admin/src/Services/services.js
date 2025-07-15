import { api } from '../api/client';
import { createCrudApi, withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../Utils/apiHelpers';

// Create base CRUD operations with error throwing for better error handling
const baseCrudApi = createCrudApi({
  endpoint: 'services',
  imageFields: [], // No legacy image fields - using ServiceImage system
  entityName: 'services',
  throwOnError: true // Enable error throwing for detailed error handling
});

// Services API service functions
export const servicesApi = {
  ...baseCrudApi,
  // Override getAll to support category filtering
  getAll: async (categoryId = null) => {
    const params = categoryId ? { category_id: categoryId } : {};
    // Add ordering by display_order
    params.order_by = 'display_order';
    const endpoint = buildApiEndpoint('services');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params }),
      {
        defaultValue: [],
        transformData: (data) => {
          const services = Array.isArray(data) ? data : [];
          return transformEntityWithImages(services, []); // No legacy image fields
        }
      }
    );
  },

  // Get all services from all categories (alias for getAll without filters)
  getAllServices: async () => {
    return servicesApi.getAll();
  },

  // Get complete services data optimized for modals (categories + services + variations)
  getCompleteServicesData: async () => {
    const endpoint = buildApiEndpoint('services/complete');
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => {
          const categories = Array.isArray(data) ? data : [];
          return transformEntityWithImages(categories, []);
        }
      }
    );
  },

  // Get service with variations
  getServiceWithVariations: async (serviceId) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/variations`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => {
          if (!data) return null;
          return transformEntityWithImages(data, []);
        }
      }
    );
  },

  // Reorder services
  reorder: async (reorderData) => {
    const endpoint = buildApiEndpoint('services/reorder');
    
    return withApiErrorHandling(
      () => api.put(endpoint, { services: reorderData }),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },

  // Service Compatibility and Execution Order API functions
  
  // Get compatibility matrix
  getCompatibilityMatrix: async () => {
    const endpoint = buildApiEndpoint('services/compatibility/matrix');
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: { matrix: {}, services: [] },
        transformData: (data) => data
      }
    );
  },

  // Update compatibility matrix
  updateCompatibilityMatrix: async (compatibilities) => {
    const endpoint = buildApiEndpoint('services/compatibility/matrix');
    
    return withApiErrorHandling(
      () => api.put(endpoint, { compatibilities }),
      {
        defaultValue: { message: 'Updated successfully' },
        transformData: (data) => data
      }
    );
  },

  // Create service compatibility rule
  createCompatibility: async (compatibilityData) => {
    const endpoint = buildApiEndpoint('services/compatibility');
    
    return withApiErrorHandling(
      () => api.post(endpoint, compatibilityData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update specific service compatibility
  updateCompatibility: async (serviceAId, serviceBId, compatibilityData) => {
    const endpoint = buildApiEndpoint(`services/compatibility/${serviceAId}/${serviceBId}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, compatibilityData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update service execution order
  updateExecutionOrder: async (updates) => {
    const endpoint = buildApiEndpoint('services/compatibility/execution-order');
    
    return withApiErrorHandling(
      () => api.put(endpoint, { updates }),
      {
        defaultValue: { message: 'Updated successfully' },
        transformData: (data) => data
      }
    );
  },

};

// Service Variation Groups API
export const serviceVariationGroupsApi = {
  // Get all variation groups for a service
  getByServiceId: async (serviceId) => {
    const endpoint = buildApiEndpoint('variation-groups');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params: { service_id: serviceId } }),
      {
        defaultValue: [],
        transformData: (data) => {
          const groups = Array.isArray(data) ? data : [];
          return groups;
        }
      }
    );
  },

  // Get all variation groups with variations for a service (optimized)
  getFullByServiceId: async (serviceId) => {
    const endpoint = buildApiEndpoint(`variation-groups/service/${serviceId}/full`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => {
          const groups = Array.isArray(data) ? data : [];
          return groups;
        }
      }
    );
  },

  // Get single variation group by ID
  getById: async (groupId) => {
    const endpoint = buildApiEndpoint(`variation-groups/${groupId}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Create new variation group
  create: async (groupData) => {
    const endpoint = buildApiEndpoint('variation-groups');
    
    return withApiErrorHandling(
      () => api.post(endpoint, groupData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update variation group
  update: async (groupId, groupData) => {
    const endpoint = buildApiEndpoint(`variation-groups/${groupId}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, groupData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Delete variation group
  delete: async (groupId) => {
    const endpoint = buildApiEndpoint(`variation-groups/${groupId}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },
};

// Service Variations API
export const serviceVariationsApi = {
  // Get all variations for a variation group
  getByGroupId: async (groupId) => {
    const endpoint = buildApiEndpoint('variations');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params: { group_id: groupId } }),
      {
        defaultValue: [],
        transformData: (data) => {
          const variations = Array.isArray(data) ? data : [];
          return variations;
        }
      }
    );
  },

  // Get single variation by ID
  getById: async (variationId) => {
    const endpoint = buildApiEndpoint(`variations/${variationId}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Create new variation
  create: async (variationData) => {
    const endpoint = buildApiEndpoint('variations');
    
    return withApiErrorHandling(
      () => api.post(endpoint, variationData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update variation
  update: async (variationId, variationData) => {
    const endpoint = buildApiEndpoint(`variations/${variationId}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, variationData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Delete variation
  delete: async (variationId) => {
    const endpoint = buildApiEndpoint(`variations/${variationId}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },

  // Reorder variations
  reorder: async (reorderData) => {
    const endpoint = buildApiEndpoint('variations/reorder');
    
    return withApiErrorHandling(
      () => api.put(endpoint, reorderData),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },

  // Batch update variations
  batchUpdate: async (variationIds, updates) => {
    const endpoint = buildApiEndpoint('variations/batch-update');
    
    return withApiErrorHandling(
      () => api.put(endpoint, {
        variation_ids: variationIds,
        updates: updates
      }),
      {
        defaultValue: { success_count: 0, failed_count: 0, errors: [] },
        transformData: (data) => data
      }
    );
  },

  // Batch delete variations
  batchDelete: async (variationIds) => {
    const endpoint = buildApiEndpoint('variations/batch-delete');
    
    return withApiErrorHandling(
      () => api.delete(endpoint, {
        data: { variation_ids: variationIds }
      }),
      {
        defaultValue: { success_count: 0, failed_count: 0, errors: [] },
        transformData: (data) => data
      }
    );
  },
};