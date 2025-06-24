import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import apiClient from '../config/api';

// Image fields for professional data
const PROFESSIONAL_IMAGE_FIELDS = ['photo_url', 'avatar_url', 'profile_picture_url'];

/**
 * Get all professionals with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} filters.search - Search term for professional name/email
 * @param {string} filters.status - Status filter ('active', 'inactive')
 * @param {string} filters.service_id - Filter by service offered
 * @returns {Promise<Array>} Array of professional objects
 */
export const getAllProfessionals = async (filters = {}) => {
  const endpoint = buildApiEndpoint('professionals');
  
  const params = {};
  if (filters.search) params.search = filters.search;
  if (filters.status) params.status = filters.status;
  if (filters.service_id) params.service_id = filters.service_id;
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, { params }),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS)
    }
  );
};

/**
 * Get a specific professional by ID
 * @param {string} professionalId - Professional ID
 * @returns {Promise<Object>} Professional object
 */
export const getProfessionalById = async (professionalId) => {
  const endpoint = buildApiEndpoint(`professionals/${professionalId}`);
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: null,
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS)
    }
  );
};

// Image fields for service data
const SERVICE_IMAGE_FIELDS = ['image_url', 'liso_image_url', 'ondulado_image_url', 'cacheado_image_url', 'crespo_image_url'];

/**
 * Get services offered by a specific professional
 * @param {string} professionalId - Professional ID
 * @returns {Promise<Array>} Array of service objects
 */
export const getProfessionalServices = async (professionalId) => {
  const endpoint = buildApiEndpoint(`professionals/${professionalId}/services`);
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, SERVICE_IMAGE_FIELDS)
    }
  );
};

/**
 * Get professionals who can perform a specific service
 * This implementation gets all active professionals and filters them based on their services_offered array
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of professional objects who can perform the service
 */
export const getProfessionalsForService = async (serviceId) => {
  return withApiErrorHandling(
    async () => {
      // Get all active professionals first
      const allProfessionals = await getAllProfessionals({ status: 'active' });
      
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
      
      return { data: filteredProfessionals };
    },
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS)
    }
  );
};

/**
 * Get daily schedule for professionals (useful for availability)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Schedule data with professionals and their appointments
 */
export const getDailySchedule = async (date) => {
  const endpoint = buildApiEndpoint(`appointments/daily-schedule/${date}`);
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: { date, professionals: [] },
      transformData: (data) => data
    }
  );
};

/**
 * Create a new professional (admin functionality)
 * @param {Object} professionalData - Professional details
 * @returns {Promise<Object>} Created professional object
 */
export const createProfessional = async (professionalData) => {
  const endpoint = buildApiEndpoint('professionals');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, professionalData),
    {
      defaultValue: null,
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS)
    }
  );
};

/**
 * Update a professional (admin functionality)
 * @param {string} professionalId - Professional ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated professional object
 */
export const updateProfessional = async (professionalId, updateData) => {
  const endpoint = buildApiEndpoint(`professionals/${professionalId}`);
  
  return withApiErrorHandling(
    () => apiClient.put(endpoint, updateData),
    {
      defaultValue: null,
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS)
    }
  );
};