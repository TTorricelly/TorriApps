import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint } from '../Utils/apiHelpers';

export const usersApi = {
  // Get all users
  getAllUsers: async () => {
    const endpoint = buildApiEndpoint('users/');
    
    return withApiErrorHandling(
      () => api.get(endpoint),
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
    const endpoint = buildApiEndpoint('users/');
    
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
  }
};