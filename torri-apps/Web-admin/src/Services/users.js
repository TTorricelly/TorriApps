import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint } from '../Utils/apiHelpers';

export const usersApi = {
  // Get all users
  getAllUsers: async () => {
    const endpoint = buildApiEndpoint('users');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params: { limit: 10000 } }),
      {
        defaultValue: [],
        transformData: (data) => {
          return Array.isArray(data) ? data : [];
        }
      }
    );
  },

  // Search users
  searchUsers: async (searchQuery, role = null, limit = 10000) => {
    const endpoint = buildApiEndpoint('users');
    const params = { limit };
    
    if (searchQuery) {
      params.search = searchQuery;
    }
    if (role) {
      params.role = role;
    }
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params }),
      {
        defaultValue: [],
        transformData: (data) => {
          return Array.isArray(data) ? data : [];
        }
      }
    );
  },

  // Search users with flexible parameters (for advanced filtering)
  searchUsersWithParams: async (params = {}) => {
    const endpoint = buildApiEndpoint('users');
    const requestParams = { limit: 10000, ...params };
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params: requestParams }),
      {
        defaultValue: [],
        transformData: (data) => {
          return Array.isArray(data) ? data : [];
        }
      }
    );
  },

  // Get user by ID
  getUserById: async (userId) => {
    const endpoint = buildApiEndpoint(`users/${userId}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null
      }
    );
  },

  // Create new user
  createUser: async (userData) => {
    const endpoint = buildApiEndpoint('users');
    
    return withApiErrorHandling(
      () => api.post(endpoint, userData),
      {
        defaultValue: null
      }
    );
  },

  // Update user
  updateUser: async (userId, userData) => {
    const endpoint = buildApiEndpoint(`users/${userId}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, userData),
      {
        defaultValue: null
      }
    );
  },

  // Delete user
  deleteUser: async (userId) => {
    const endpoint = buildApiEndpoint(`users/${userId}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: null
      }
    );
  },

  // Get user labels
  getUserLabels: async (userId) => {
    const endpoint = buildApiEndpoint(`users/${userId}/labels`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: []
      }
    );
  },

  // Add label to user
  addLabelToUser: async (userId, labelId) => {
    const endpoint = buildApiEndpoint(`users/${userId}/labels/${labelId}`);
    
    return withApiErrorHandling(
      () => api.post(endpoint),
      {
        defaultValue: null
      }
    );
  },

  // Remove label from user
  removeLabelFromUser: async (userId, labelId) => {
    const endpoint = buildApiEndpoint(`users/${userId}/labels/${labelId}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: null
      }
    );
  },

  // Bulk update user labels
  updateUserLabels: async (userId, labelIds) => {
    const endpoint = buildApiEndpoint(`users/${userId}/labels/bulk`);
    
    return withApiErrorHandling(
      () => api.post(endpoint, { label_ids: labelIds }),
      {
        defaultValue: null
      }
    );
  },

  // Get users by label
  getUsersByLabel: async (labelId, params = {}) => {
    const endpoint = buildApiEndpoint(`users/by-label/${labelId}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params }),
      {
        defaultValue: []
      }
    );
  }
};