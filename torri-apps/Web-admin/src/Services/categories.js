import { api } from '../api/client';
import { buildApiEndpoint, transformEntityWithImages } from '../Utils/apiHelpers';

// Category API service functions
export const categoriesApi = {
  // Get all categories
  getAll: async () => {
    const endpoint = buildApiEndpoint('categories');
    const response = await api.get(endpoint);
    return transformEntityWithImages(response.data, ['icon_url']);
  },

  // Get category by ID
  getById: async (id) => {
    const endpoint = buildApiEndpoint(`categories/${id}`);
    const response = await api.get(endpoint);
    return transformEntityWithImages(response.data, ['icon_url']);
  },

  // Create new category
  create: async (formData) => {
    const endpoint = buildApiEndpoint('categories');
    const response = await api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update category
  update: async (id, formData) => {
    const endpoint = buildApiEndpoint(`categories/${id}`);
    const response = await api.put(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete category
  delete: async (id) => {
    const endpoint = buildApiEndpoint(`categories/${id}`);
    await api.delete(endpoint);
  },
};