import { api } from '../api/client';
import { ENDPOINTS } from './Endpoints'; // It's good practice to use defined endpoints

export const clientsApi = {
  getAllClients: async () => {
    try {
      const response = await api.get(ENDPOINTS.USERS); // Using the /users endpoint
      if (response.data && Array.isArray(response.data)) {
        const clients = response.data.filter(user => user.role === 'CLIENTE');
        return clients;
      } else {
        // Handle cases where response.data is not as expected
        console.error('Erro ao buscar clientes: Formato de dados inesperado', response.data);
        return []; // Return an empty array or throw an error
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      // Rethrow the error or handle it as per application's error handling strategy
      throw error;
    }
  },
};
