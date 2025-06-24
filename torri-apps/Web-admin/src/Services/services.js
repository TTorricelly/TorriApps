import { api } from '../api/client';
import { createCrudApi, withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../Utils/apiHelpers';

// Define service image fields for consistent processing
const SERVICE_IMAGE_FIELDS = [
  'image_url', 
  'liso_image_url', 
  'ondulado_image_url', 
  'cacheado_image_url', 
  'crespo_image_url'
];

// Create base CRUD operations
const baseCrudApi = createCrudApi({
  endpoint: 'services',
  imageFields: SERVICE_IMAGE_FIELDS,
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
          return transformEntityWithImages(services, SERVICE_IMAGE_FIELDS);
        }
      }
    );
  },

  // Get all services from all categories (alias for getAll without filters)
  getAllServices: async () => {
    return servicesApi.getAll();
  },

  // Upload general service image
  uploadImage: async (serviceId, imageFile) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/image`);
    
    return withApiErrorHandling(
      () => {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        return api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      },
      {
        defaultValue: null,
        transformData: (data) => transformEntityWithImages(data, ['image_url'])
      }
    );
  },

  // Upload service images for different hair types
  uploadImages: async (serviceId, imageFiles) => {
    const endpoint = buildApiEndpoint(`services/${serviceId}/images`);
    
    return withApiErrorHandling(
      () => {
        const formData = new FormData();
        
        // Add images for each hair type
        Object.entries(imageFiles).forEach(([hairType, file]) => {
          if (file && ['liso', 'ondulado', 'cacheado', 'crespo'].includes(hairType)) {
            formData.append(hairType, file);
          }
        });
        
        return api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      },
      {
        defaultValue: null,
        transformData: (data) => transformEntityWithImages(data, SERVICE_IMAGE_FIELDS)
      }
    );
  },
};