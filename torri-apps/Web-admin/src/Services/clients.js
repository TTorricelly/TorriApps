import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint } from '../Utils/apiHelpers';

export const clientsApi = {
  // Get all clients (users with CLIENTE role)
  getAllClients: async () => {
    const endpoint = buildApiEndpoint('users'); // No trailing slash for consistency
    
    return withApiErrorHandling(
      () => api.get(endpoint, { 
        params: { 
          role: 'CLIENTE',  // Filter by CLIENTE role on backend
          limit: 10000      // High limit to get all clients
        }
      }),
      {
        defaultValue: [],
        transformData: (data) => {
          const users = Array.isArray(data) ? data : [];
          // Backend already filters by role, but keep as backup
          return users.filter(user => user.role === 'CLIENTE');
        }
      }
    );
  },

  // Search clients by query
  searchClients: async (searchQuery) => {
    const endpoint = buildApiEndpoint('users');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { 
        params: { 
          role: 'CLIENTE',
          search: searchQuery,
          limit: 10000
        }
      }),
      {
        defaultValue: [],
        transformData: (data) => {
          const users = Array.isArray(data) ? data : [];
          return users.filter(user => user.role === 'CLIENTE');
        }
      }
    );
  },

  // Create new client
  createClient: async (clientData) => {
    const endpoint = buildApiEndpoint('users'); // No trailing slash for consistency
    // Ensure the role is set to CLIENTE
    const dataToCreate = { ...clientData, role: 'CLIENTE' };
    
    return withApiErrorHandling(
      () => api.post(endpoint, dataToCreate),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Get client by ID
  getClientById: async (clientId) => {
    const endpoint = buildApiEndpoint(`users/${clientId}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update client
  updateClient: async (clientId, clientData) => {
    const endpoint = buildApiEndpoint(`users/${clientId}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, clientData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Delete client
  deleteClient: async (clientId) => {
    const endpoint = buildApiEndpoint(`users/${clientId}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: true,
        transformData: () => true
      }
    );
  },
};
