/**
 * Client Management Service
 * Handles all client-related API operations for salon staff
 */

import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers'
import apiClient from '../config/api'

/**
 * Get all clients with optional search and pagination
 * @param {Object} options - Query options
 * @param {string} options.search - Search term for name/email
 * @param {number} options.skip - Number of records to skip (pagination)
 * @param {number} options.limit - Maximum number of records to return
 * @returns {Promise<Object>} List of clients with pagination info
 */
export const getClients = async (options = {}) => {
  const { search = '', skip = 0, limit = 20 } = options
  const endpoint = buildApiEndpoint('users')
  
  const params = new URLSearchParams({
    role: 'CLIENTE',
    skip: skip.toString(),
    limit: limit.toString()
  })
  
  // Add search parameter if provided
  if (search.trim()) {
    params.append('search', search.trim())
  }
  
  return withApiErrorHandling(
    () => apiClient.get(`${endpoint}?${params.toString()}`),
    {
      defaultValue: { items: [], total: 0, has_more: false },
      transformData: (data) => {
        const items = data.items || data || []
        
        return {
          items: items,
          total: data.total || items.length,
          has_more: data.has_more || (items.length === limit)
        }
      },
      logErrors: true
    }
  )
}

/**
 * Get client by ID
 * @param {string} clientId - Client UUID
 * @returns {Promise<Object|null>} Client data or null
 */
export const getClientById = async (clientId) => {
  const endpoint = buildApiEndpoint(`users/${clientId}`)
  
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: null,
      transformData: (data) => {
        return data
      },
      logErrors: true
    }
  )
}

/**
 * Update client information
 * @param {string} clientId - Client UUID
 * @param {Object} updateData - Client data to update
 * @returns {Promise<Object|null>} Updated client data or null
 */
export const updateClient = async (clientId, updateData) => {
  const endpoint = buildApiEndpoint(`users/${clientId}`)
  
  
  return withApiErrorHandling(
    () => apiClient.put(endpoint, updateData),
    {
      defaultValue: null,
      transformData: (data) => {
        return data
      },
      logErrors: true
    }
  )
}

/**
 * Create new client
 * @param {Object} clientData - Client data
 * @returns {Promise<Object|null>} Created client data or null
 */
export const createClient = async (clientData) => {
  const endpoint = buildApiEndpoint('users')
  
  // Ensure the role is set to CLIENTE
  const dataWithRole = {
    ...clientData,
    role: 'CLIENTE'
  }
  
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, dataWithRole),
    {
      defaultValue: null,
      transformData: (data) => {
        return data
      },
      logErrors: true
    }
  )
}

/**
 * Delete client
 * @param {string} clientId - Client UUID
 * @returns {Promise<boolean>} Success status
 */
export const deleteClient = async (clientId) => {
  const endpoint = buildApiEndpoint(`users/${clientId}`)
  
  
  return withApiErrorHandling(
    () => apiClient.delete(endpoint),
    {
      defaultValue: false,
      transformData: () => {
        return true
      },
      logErrors: true
    }
  )
}

/**
 * Get client appointment history
 * @param {string} clientId - Client UUID
 * @returns {Promise<Array>} Client appointments
 */
export const getClientAppointments = async (clientId) => {
  const endpoint = buildApiEndpoint('appointments')
  const params = new URLSearchParams({
    client_id: clientId,
    include_past: 'true'
  })
  
  
  return withApiErrorHandling(
    () => apiClient.get(`${endpoint}?${params.toString()}`),
    {
      defaultValue: [],
      transformData: (data) => {
        return data.items || data || []
      },
      logErrors: true
    }
  )
}

// Export as service object
export const clientService = {
  getClients,
  getClientById,
  updateClient,
  createClient,
  deleteClient,
  getClientAppointments
}