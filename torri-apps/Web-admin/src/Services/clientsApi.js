import { api as apiClient } from '../api/client';

/**
 * Creates a new client user.
 * @param {object} clientData - The client data to create.
 * @returns {Promise<object>} The created client data.
 * @throws {Error} If the API call fails.
 */
export const createClient = async (clientData) => {
  try {
    const response = await apiClient.post('/users', clientData);
    return response.data;
  } catch (error) {
    console.error("Error creating client:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao criar cliente. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Gets all clients for the current tenant.
 * @returns {Promise<Array>} Array of client users.
 * @throws {Error} If the API call fails.
 */
export const getClients = async () => {
  try {
    const response = await apiClient.get('/api/v1/users/?role=CLIENTE&limit=10000');
    return response.data;
  } catch (error) {
    console.error("Error fetching clients:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao buscar clientes. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Searches for clients by name or email.
 * @param {string} searchTerm - The search term to filter clients.
 * @returns {Promise<Array>} Array of matching clients.
 * @throws {Error} If the API call fails.
 */
export const searchClients = async (searchTerm) => {
  try {
    const response = await apiClient.get(`/api/v1/users/?role=CLIENTE&search=${encodeURIComponent(searchTerm)}&limit=10000`);
    return response.data;
  } catch (error) {
    console.error("Error searching clients:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao buscar clientes. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Gets a client by ID.
 * @param {string} clientId - The ID of the client to fetch.
 * @returns {Promise<object>} The client data.
 * @throws {Error} If the API call fails.
 */
export const getClientById = async (clientId) => {
  try {
    const response = await apiClient.get(`/users/${clientId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching client:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao buscar cliente. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Updates a client.
 * @param {string} clientId - The ID of the client to update.
 * @param {object} clientData - The updated client data.
 * @returns {Promise<object>} The updated client data.
 * @throws {Error} If the API call fails.
 */
export const updateClient = async (clientId, clientData) => {
  try {
    const response = await apiClient.put(`/users/${clientId}`, clientData);
    return response.data;
  } catch (error) {
    console.error("Error updating client:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao atualizar cliente. Tente novamente.";
    throw new Error(errorMessage);
  }
};