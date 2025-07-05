import { api } from '../api/client';
import { buildApiEndpoint } from '../Utils/apiHelpers';

export const settingsApi = {
  // Get all settings
  getAll: async () => {
    const endpoint = buildApiEndpoint('settings/');
    const response = await api.get(endpoint);
    return response.data;
  },

  // Get all settings as typed values
  getAllValues: async () => {
    const endpoint = buildApiEndpoint('settings/values');
    const response = await api.get(endpoint);
    return response.data;
  },

  // Get specific setting by key
  getByKey: async (key) => {
    const endpoint = buildApiEndpoint(`settings/${key}`);
    const response = await api.get(endpoint);
    return response.data;
  },

  // Create new setting
  create: async (settingData) => {
    const endpoint = buildApiEndpoint('settings/');
    const response = await api.post(endpoint, settingData);
    return response.data;
  },

  // Update existing setting
  update: async (key, settingData) => {
    const endpoint = buildApiEndpoint(`settings/${key}`);
    const response = await api.put(endpoint, settingData);
    return response.data;
  },

  // Delete setting
  delete: async (key) => {
    const endpoint = buildApiEndpoint(`settings/${key}`);
    const response = await api.delete(endpoint);
    return response.data;
  },

  // Batch create/update settings
  batchUpdate: async (settings) => {
    const endpoint = buildApiEndpoint('settings/batch');
    const response = await api.post(endpoint, settings);
    return response.data;
  },

  // Convenience methods for common settings
  getDefaultProssuggested: async () => {
    const endpoint = buildApiEndpoint('settings/pros/default-suggested');
    const response = await api.get(endpoint);
    return response.data;
  },

  setDefaultProsSuggested: async (value) => {
    const endpoint = buildApiEndpoint(`settings/pros/default-suggested?value=${value}`);
    const response = await api.put(endpoint);
    return response.data;
  }
};