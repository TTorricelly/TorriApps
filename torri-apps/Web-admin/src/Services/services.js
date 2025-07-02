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

};