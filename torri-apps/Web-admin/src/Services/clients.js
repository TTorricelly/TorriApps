import { api } from '../api/client';
import { ENDPOINTS } from './Endpoints';

export const clientsApi = {
  getAllClients: async () => {
    try {
      const response = await api.get(ENDPOINTS.USERS);
      if (response.data && Array.isArray(response.data)) {
        const clients = response.data.filter(user => user.role === 'CLIENTE');
        return clients;
      } else {
        console.error('Erro ao buscar clientes: Formato de dados inesperado', response.data);
        return [];
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error.response?.data || error.message);
      throw error;
    }
  },

  createClient: async (clientData) => {
    try {
      // Ensure the role is set to CLIENTE
      const dataToCreate = { ...clientData, role: 'CLIENTE' };
      const response = await api.post(ENDPOINTS.USERS, dataToCreate);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar cliente:', error.response?.data || error.message);
      throw error;
    }
  },

  getClientById: async (clientId) => {
    try {
      const response = await api.get(`${ENDPOINTS.USERS}/${clientId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar cliente com ID ${clientId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  updateClient: async (clientId, clientData) => {
    try {
      // Role might not be updatable or should be handled carefully.
      // For now, we pass clientData as is. If role needs to be fixed, it can be added here.
      const response = await api.put(`${ENDPOINTS.USERS}/${clientId}`, clientData);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar cliente com ID ${clientId}:`, error.response?.data || error.message);
      throw error;
    }
  },

  deleteClient: async (clientId) => {
    try {
      const response = await api.delete(`${ENDPOINTS.USERS}/${clientId}`);
      return response.data; // For 204 No Content, response.data will be undefined or null.
    } catch (error) {
      console.error(`Erro ao excluir cliente com ID ${clientId}:`, error.response?.data || error.message);
      throw error;
    }
  },
};
