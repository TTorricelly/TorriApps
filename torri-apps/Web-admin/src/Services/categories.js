import { api } from '../api/client';
import { processImageUrls } from '../Utils/urlHelpers';

// Category API service functions
export const categoriesApi = {
  // Get all categories
  getAll: async () => {
    const response = await api.get('/api/v1/categories');
    return processImageUrls(response.data, ['icon_url']);
  },

  // Get category by ID
  getById: async (id) => {
    const response = await api.get(`/api/v1/categories/${id}`);
    return processImageUrls(response.data, ['icon_url']);
  },

  // Create new category
  create: async (formData) => {
    const response = await api.post('/api/v1/categories', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update category
  update: async (id, formData) => {
    const response = await api.put(`/api/v1/categories/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete category
  delete: async (id) => {
    await api.delete(`/api/v1/categories/${id}`);
  },
};