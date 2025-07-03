import apiClient from '../config/api';
import { withApiErrorHandling, buildApiEndpoint, ensureArray } from '../utils/apiHelpers';

const labelService = {
  // Get all labels with optional filtering
  getLabels: async (params = {}) => {
    const endpoint = buildApiEndpoint('labels');
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint, { params }),
      {
        defaultValue: [],
        transformData: (data) => ensureArray(data, 'labels'),
        logErrors: true
      }
    );
  },

  // Get active labels only (for selectors)
  getActiveLabels: async () => {
    const endpoint = buildApiEndpoint('labels');
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint, { 
        params: { is_active: true, limit: 100 } 
      }),
      {
        defaultValue: [],
        transformData: (data) => ensureArray(data, 'labels'),
        logErrors: true
      }
    );
  },

  // Get labels for a specific user
  getUserLabels: async (userId) => {
    const endpoint = buildApiEndpoint(`users/${userId}`);
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => data.labels || [],
        logErrors: true
      }
    );
  },

  // Add a label to a user
  addLabelToUser: async (userId, labelId) => {
    const endpoint = buildApiEndpoint(`users/${userId}/labels/${labelId}`);
    
    return withApiErrorHandling(
      () => apiClient.post(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data,
        logErrors: true
      }
    );
  },

  // Remove a label from a user
  removeLabelFromUser: async (userId, labelId) => {
    const endpoint = buildApiEndpoint(`users/${userId}/labels/${labelId}`);
    
    return withApiErrorHandling(
      () => apiClient.delete(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data,
        logErrors: true
      }
    );
  },

  // Update user labels in bulk (replace all)
  updateUserLabels: async (userId, labelIds) => {
    const endpoint = buildApiEndpoint(`users/${userId}/labels/bulk`);
    
    return withApiErrorHandling(
      () => apiClient.post(endpoint, {
        label_ids: labelIds
      }),
      {
        defaultValue: null,
        transformData: (data) => data,
        logErrors: true
      }
    );
  },

  // Create a new label (GESTOR only)
  createLabel: async (labelData) => {
    const endpoint = buildApiEndpoint('labels');
    
    return withApiErrorHandling(
      () => apiClient.post(endpoint, labelData),
      {
        defaultValue: null,
        transformData: (data) => data,
        logErrors: true
      }
    );
  },

  // Update a label (GESTOR only)
  updateLabel: async (labelId, labelData) => {
    const endpoint = buildApiEndpoint(`labels/${labelId}`);
    
    return withApiErrorHandling(
      () => apiClient.put(endpoint, labelData),
      {
        defaultValue: null,
        transformData: (data) => data,
        logErrors: true
      }
    );
  },

  // Delete a label (GESTOR only)
  deleteLabel: async (labelId) => {
    const endpoint = buildApiEndpoint(`labels/${labelId}`);
    
    return withApiErrorHandling(
      () => apiClient.delete(endpoint),
      {
        defaultValue: false,
        transformData: () => true,
        logErrors: true
      }
    );
  },

  // Toggle label active status (GESTOR only)
  toggleLabelStatus: async (labelId) => {
    const endpoint = buildApiEndpoint(`labels/${labelId}/toggle`);
    
    return withApiErrorHandling(
      () => apiClient.patch(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data,
        logErrors: true
      }
    );
  }
};

export default labelService;