import apiClient from '../config/api';

/**
 * Get all professionals with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} filters.search - Search term for professional name/email
 * @param {string} filters.status - Status filter ('active', 'inactive')
 * @param {string} filters.service_id - Filter by service offered
 * @returns {Promise<Array>} Array of professional objects
 */
export const getAllProfessionals = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.service_id) params.append('service_id', filters.service_id);
    
    const queryString = params.toString();
    const url = queryString ? `/professionals/?${queryString}` : '/professionals/';
    
    const response = await apiClient.get(`/api/v1${url}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch professionals');
    } else if (error.request) {
      throw new Error('Failed to fetch professionals: No response from server');
    } else {
      throw new Error(`Failed to fetch professionals: ${error.message}`);
    }
  }
};

/**
 * Get a specific professional by ID
 * @param {string} professionalId - Professional ID
 * @returns {Promise<Object>} Professional object
 */
export const getProfessionalById = async (professionalId) => {
  try {
    const response = await apiClient.get(`/api/v1/professionals/${professionalId}/`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch professional details');
    } else if (error.request) {
      throw new Error('Failed to fetch professional: No response from server');
    } else {
      throw new Error(`Failed to fetch professional: ${error.message}`);
    }
  }
};

/**
 * Get services offered by a specific professional
 * @param {string} professionalId - Professional ID
 * @returns {Promise<Array>} Array of service objects
 */
export const getProfessionalServices = async (professionalId) => {
  try {
    const response = await apiClient.get(`/api/v1/professionals/${professionalId}/services/`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch professional services');
    } else if (error.request) {
      throw new Error('Failed to fetch services: No response from server');
    } else {
      throw new Error(`Failed to fetch services: ${error.message}`);
    }
  }
};

/**
 * Get professionals who can perform a specific service
 * This is a temporary implementation that gets all active professionals
 * and filters them based on their services_offered array
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of professional objects who can perform the service
 */
export const getProfessionalsForService = async (serviceId) => {
  try {
    // Get all active professionals first (note the trailing slash to avoid 307 redirect)
    const response = await apiClient.get(`/api/v1/professionals/`);
    const allProfessionals = response.data;
    
    if (!Array.isArray(allProfessionals)) {
      return [];
    }
    
    // Filter professionals who can perform this service
    const filteredProfessionals = allProfessionals.filter(professional => {
      // Check if the professional has services_offered and if it includes our serviceId
      return professional.services_offered && 
             Array.isArray(professional.services_offered) &&
             professional.services_offered.some(service => service.id === serviceId);
    });
    
    return filteredProfessionals;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch professionals for service');
    } else if (error.request) {
      throw new Error('Failed to fetch professionals: No response from server');
    } else {
      throw new Error(`Failed to fetch professionals: ${error.message}`);
    }
  }
};

/**
 * Get daily schedule for professionals (useful for availability)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Schedule data with professionals and their appointments
 */
export const getDailySchedule = async (date) => {
  try {
    const response = await apiClient.get(`/api/v1/appointments/daily-schedule/${date}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch daily schedule');
    } else if (error.request) {
      throw new Error('Failed to fetch schedule: No response from server');
    } else {
      throw new Error(`Failed to fetch schedule: ${error.message}`);
    }
  }
};

/**
 * Create a new professional (admin functionality)
 * @param {Object} professionalData - Professional details
 * @returns {Promise<Object>} Created professional object
 */
export const createProfessional = async (professionalData) => {
  try {
    const response = await apiClient.post('/api/v1/professionals', professionalData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to create professional');
    } else if (error.request) {
      throw new Error('Failed to create professional: No response from server');
    } else {
      throw new Error(`Failed to create professional: ${error.message}`);
    }
  }
};

/**
 * Update a professional (admin functionality)
 * @param {string} professionalId - Professional ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated professional object
 */
export const updateProfessional = async (professionalId, updateData) => {
  try {
    const response = await apiClient.put(`/api/v1/professionals/${professionalId}`, updateData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to update professional');
    } else if (error.request) {
      throw new Error('Failed to update professional: No response from server');
    } else {
      throw new Error(`Failed to update professional: ${error.message}`);
    }
  }
};