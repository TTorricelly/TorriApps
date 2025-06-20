import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint } from '../Utils/apiHelpers';

export const clientsApi = {
  // Get all clients (users with CLIENTE role)
  getAllClients: async () => {
    const endpoint = buildApiEndpoint('users/'); // Add trailing slash to match FastAPI route
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => {
          const users = Array.isArray(data) ? data : [];
          // Filter to only return clients
          return users.filter(user => user.role === 'CLIENTE');
        }
      }
    );
  },

  // Create new client
  createClient: async (clientData) => {
    const endpoint = buildApiEndpoint('users/'); // Add trailing slash to match FastAPI route
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
