import { api } from '../api/client';
import { createCrudApi, withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../Utils/apiHelpers';

// Create base CRUD operations
const baseCrudApi = createCrudApi({
  endpoint: 'services',
  imageFields: [], // No legacy image fields - using ServiceImage system
  entityName: 'services'
});

// Services API service functions
export const servicesApi = {
  ...baseCrudApi,
  // Override getAll to support category filtering
  getAll: async (categoryId = null) => {
    const params = categoryId ? { category_id: categoryId } : {};
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