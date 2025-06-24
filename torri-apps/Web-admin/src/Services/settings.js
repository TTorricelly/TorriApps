import api from './api';

export const settingsApi = {
  // Get all settings
  getAll: async () => {
    const response = await api.get('/api/v1/settings/');
    return response.data;
  },

  // Get all settings as typed values
  getAllValues: async () => {
    const response = await api.get('/api/v1/settings/values');
    return response.data;
  },

  // Get specific setting by key
  getByKey: async (key) => {
    const response = await api.get(`/api/v1/settings/${key}`);
    return response.data;
  },

  // Create new setting
  create: async (settingData) => {
    const response = await api.post('/api/v1/settings/', settingData);
    return response.data;
  },

  // Update existing setting
  update: async (key, settingData) => {
    const response = await api.put(`/api/v1/settings/${key}`, settingData);
    return response.data;
  },

  // Delete setting
  delete: async (key) => {
    const response = await api.delete(`/api/v1/settings/${key}`);
    return response.data;
  },

  // Batch create/update settings
  batchUpdate: async (settings) => {
    const response = await api.post('/api/v1/settings/batch', settings);
    return response.data;
  },

  // Convenience methods for common settings
  getDefaultProssuggested: async () => {
    const response = await api.get('/api/v1/settings/pros/default-suggested');
    return response.data;
  },

  setDefaultProsSuggested: async (value) => {
    const response = await api.put(`/api/v1/settings/pros/default-suggested?value=${value}`);
    return response.data;
  }
};