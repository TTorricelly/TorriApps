import { api } from '../api/client';

// Services API service functions
export const servicesApi = {
  // Get all services (optionally filtered by category)
  getAll: async (categoryId = null) => {
    const params = categoryId ? { category_id: categoryId } : {};
    const response = await api.get('/services', { params });
    return response.data;
  },

  // Get all services from all categories
  getAllServices: async () => {
    // Since there's no /services/all endpoint, we get services without category filter
    const response = await api.get('/services');
    return response.data;
  },

  // Get service by ID
  getById: async (id) => {
    const response = await api.get(`/services/${id}`);
    return response.data;
  },

  // Create new service
  create: async (serviceData) => {
    const response = await api.post('/services', serviceData);
    return response.data;
  },

  // Update service
  update: async (id, serviceData) => {
    const response = await api.put(`/services/${id}`, serviceData);
    return response.data;
  },

  // Delete service
  delete: async (id) => {
    await api.delete(`/services/${id}`);
  },

  // Upload service images
  uploadImages: async (serviceId, imageFiles) => {
    const formData = new FormData();
    
    // Add images for each hair type
    if (imageFiles.liso) formData.append('liso', imageFiles.liso);
    if (imageFiles.ondulado) formData.append('ondulado', imageFiles.ondulado);
    if (imageFiles.cacheado) formData.append('cacheado', imageFiles.cacheado);
    if (imageFiles.crespo) formData.append('crespo', imageFiles.crespo);
    
    const response = await api.post(`/services/${serviceId}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};