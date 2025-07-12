import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint, ensureArray } from '../Utils/apiHelpers';

export const professionalsApi = {
  // Get all professionals (users with role PROFISSIONAL)
  getAll: async (filters = {}) => {
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.services && filters.services.length > 0) {
      params.services = filters.services.join(',');
    }
    
    // Use buildApiEndpoint to respect base URL configuration
    const endpoint = buildApiEndpoint('professionals');
    
    try {
      const response = await api.get(endpoint, { params });
      return ensureArray(response.data, 'professionals');
    } catch (error) {
      console.error('API call failed:', error);
      return [];
    }
  },

  // Get professional by ID
  getById: async (professionalId) => {
    const endpoint = buildApiEndpoint(`professionals/${professionalId}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Create new professional
  create: async (professionalData) => {
    const endpoint = buildApiEndpoint('professionals');
    
    return withApiErrorHandling(
      () => api.post(endpoint, professionalData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update professional
  update: async (professionalId, professionalData) => {
    const endpoint = buildApiEndpoint(`professionals/${professionalId}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, professionalData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Delete professional
  delete: async (professionalId) => {
    const endpoint = buildApiEndpoint(`professionals/${professionalId}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: false,
        transformData: () => true
      }
    );
  },

  // Upload professional profile photo
  uploadPhoto: async (professionalId, photoFile) => {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);

      const endpoint = buildApiEndpoint(`professionals/${professionalId}/photo`);
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      throw error;
    }
  },

  // Get professional availability slots
  getAvailability: async (professionalId) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/slots`);
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error);
      throw error;
    }
  },

  // Create availability slot
  createAvailabilitySlot: async (professionalId, slotData) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/slots`);
      const response = await api.post(endpoint, slotData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar slot de disponibilidade:', error);
      throw error;
    }
  },

  // Delete availability slot
  deleteAvailabilitySlot: async (professionalId, slotId) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/slots/${slotId}`);
      await api.delete(endpoint);
      return true;
    } catch (error) {
      console.error('Erro ao excluir slot de disponibilidade:', error);
      throw error;
    }
  },

  // Update professional availability (optimized with batch operations)
  updateAvailability: async (professionalId, availabilityData) => {
    try {
      // Convert availabilityData to flat array for operations
      const slots = [];
      for (const [dayOfWeek, periods] of Object.entries(availabilityData)) {
        for (const period of periods) {
          slots.push({
            day_of_week: dayOfWeek,
            start_time: period.start_time,
            end_time: period.end_time
          });
        }
      }
      
      // Try bulk update endpoint first (preferred - will be added to backend later)
      try {
        const bulkEndpoint = buildApiEndpoint(`availability/professional/${professionalId}/bulk-update`);
        const response = await api.put(bulkEndpoint, { slots });
        return response.data;
      } catch (bulkError) {
        // Check if it's a 404 (endpoint doesn't exist) or other error
        if (bulkError.response?.status === 404) {
          console.log('Using individual operations for availability update');
        } else {
          console.warn('Bulk update failed, falling back to individual operations:', bulkError.message);
        }
        
        // Optimized fallback: Batch operations in smaller chunks
        const slotsEndpoint = buildApiEndpoint(`availability/professional/${professionalId}/slots`);
        
        // Get current slots
        const currentSlots = await api.get(slotsEndpoint);
        
        // Delete existing slots in batches of 10 for better performance
        const deletePromises = [];
        const batchSize = 10;
        
        for (let i = 0; i < currentSlots.data.length; i += batchSize) {
          const batch = currentSlots.data.slice(i, i + batchSize);
          const batchPromises = batch.map(slot => {
            const deleteEndpoint = buildApiEndpoint(`availability/professional/${professionalId}/slots/${slot.id}`);
            return api.delete(deleteEndpoint).catch(err => {
              console.warn(`Failed to delete slot ${slot.id}:`, err.message);
              return null; // Don't fail the entire operation
            });
          });
          deletePromises.push(Promise.all(batchPromises));
        }
        
        // Execute delete batches
        await Promise.all(deletePromises);
        
        // Create new slots in batches
        const createPromises = [];
        for (let i = 0; i < slots.length; i += batchSize) {
          const batch = slots.slice(i, i + batchSize);
          const batchPromises = batch.map(slotData => {
            const createEndpoint = buildApiEndpoint(`availability/professional/${professionalId}/slots`);
            return api.post(createEndpoint, slotData).catch(err => {
              console.warn('Failed to create slot:', slotData, err.message);
              return null; // Don't fail the entire operation
            });
          });
          createPromises.push(Promise.all(batchPromises));
        }
        
        // Execute create batches
        const results = await Promise.all(createPromises);
        
        // Flatten results and filter out failed operations
        const flatResults = results.flat().filter(r => r && r.data);
        return flatResults.map(r => r.data);
      }
    } catch (error) {
      console.error('Erro ao atualizar disponibilidade:', error);
      throw error;
    }
  },

  // Get professional blocked periods
  getBlockedPeriods: async (professionalId) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/blocked-times`);
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar períodos bloqueados:', error);
      throw error;
    }
  },

  // Create blocked period
  createBlockedPeriod: async (professionalId, blockData) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/blocked-times`);
      const response = await api.post(endpoint, blockData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar período bloqueado:', error);
      throw error;
    }
  },

  // Delete blocked period
  deleteBlockedPeriod: async (professionalId, blockId) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/blocked-times/${blockId}`);
      await api.delete(endpoint);
      return true;
    } catch (error) {
      console.error('Erro ao excluir período bloqueado:', error);
      throw error;
    }
  },

  // Get professional breaks
  getBreaks: async (professionalId) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/breaks`);
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pausas:', error);
      throw error;
    }
  },

  // Create break
  createBreak: async (professionalId, breakData) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/breaks`);
      const response = await api.post(endpoint, breakData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar pausa:', error);
      throw error;
    }
  },

  // Delete break
  deleteBreak: async (professionalId, breakId) => {
    try {
      const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/breaks/${breakId}`);
      await api.delete(endpoint);
      return true;
    } catch (error) {
      console.error('Erro ao excluir pausa:', error);
      throw error;
    }
  },

  // Get services associated with professional
  getProfessionalServices: async (professionalId) => {
    try {
      const endpoint = buildApiEndpoint(`professionals/${professionalId}/services`);
      const response = await api.get(endpoint);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar serviços do profissional:', error);
      throw error;
    }
  },

  // Update services associated with professional
  updateProfessionalServices: async (professionalId, serviceIds) => {
    try {
      const endpoint = buildApiEndpoint(`professionals/${professionalId}/services`);
      const response = await api.put(endpoint, {
        service_ids: serviceIds
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar serviços do profissional:', error);
      throw error;
    }
  },

  // Get professionals available for a specific service
  getProfessionalsForService: async (serviceId) => {
    const endpoint = buildApiEndpoint('professionals');
    
    try {
      const response = await api.get(endpoint, {
        params: {
          service_id: serviceId
        }
      });
      return ensureArray(response.data, 'professionals');
    } catch (error) {
      console.error('Error fetching professionals for service:', serviceId, error);
      return [];
    }
  },

  // Update display order for multiple professionals
  updateOrder: async (professionalsOrder) => {
    const endpoint = buildApiEndpoint('professionals/reorder');
    
    return withApiErrorHandling(
      () => api.put(endpoint, {
        professionals: professionalsOrder
      }),
      {
        defaultValue: [],
        transformData: (data) => data
      }
    );
  }
};