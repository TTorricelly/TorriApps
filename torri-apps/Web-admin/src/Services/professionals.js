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
    
    // Use direct path with trailing slash to match FastAPI route
    const endpoint = '/api/v1/professionals/';
    
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

      const response = await api.post(`/api/v1/professionals/${professionalId}/photo`, formData, {
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
      const response = await api.get(`/api/v1/availability/professional/${professionalId}/slots`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error);
      throw error;
    }
  },

  // Create availability slot
  createAvailabilitySlot: async (professionalId, slotData) => {
    try {
      const response = await api.post(`/api/v1/availability/professional/${professionalId}/slots`, slotData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar slot de disponibilidade:', error);
      throw error;
    }
  },

  // Delete availability slot
  deleteAvailabilitySlot: async (professionalId, slotId) => {
    try {
      await api.delete(`/api/v1/availability/professional/${professionalId}/slots/${slotId}`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir slot de disponibilidade:', error);
      throw error;
    }
  },

  // Update professional availability (bulk replace all slots)
  updateAvailability: async (professionalId, availabilityData) => {
    try {
      // Get current slots to delete them first
      const currentSlots = await api.get(`/api/v1/availability/professional/${professionalId}/slots`);
      
      // Delete all existing slots
      for (const slot of currentSlots.data) {
        await api.delete(`/api/v1/availability/professional/${professionalId}/slots/${slot.id}`);
      }
      
      // Create new slots from availabilityData
      const results = [];
      for (const [dayOfWeek, periods] of Object.entries(availabilityData)) {
        for (const period of periods) {
          const slotData = {
            day_of_week: dayOfWeek,
            start_time: period.start_time,
            end_time: period.end_time
          };
          const response = await api.post(`/api/v1/availability/professional/${professionalId}/slots`, slotData);
          results.push(response.data);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Erro ao atualizar disponibilidade:', error);
      throw error;
    }
  },

  // Get professional blocked periods
  getBlockedPeriods: async (professionalId) => {
    try {
      const response = await api.get(`/api/v1/availability/professional/${professionalId}/blocked-times`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar períodos bloqueados:', error);
      throw error;
    }
  },

  // Create blocked period
  createBlockedPeriod: async (professionalId, blockData) => {
    try {
      const response = await api.post(`/api/v1/availability/professional/${professionalId}/blocked-times`, blockData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar período bloqueado:', error);
      throw error;
    }
  },

  // Delete blocked period
  deleteBlockedPeriod: async (professionalId, blockId) => {
    try {
      await api.delete(`/api/v1/availability/professional/${professionalId}/blocked-times/${blockId}`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir período bloqueado:', error);
      throw error;
    }
  },

  // Get professional breaks
  getBreaks: async (professionalId) => {
    try {
      const response = await api.get(`/api/v1/availability/professional/${professionalId}/breaks`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pausas:', error);
      throw error;
    }
  },

  // Create break
  createBreak: async (professionalId, breakData) => {
    try {
      const response = await api.post(`/api/v1/availability/professional/${professionalId}/breaks`, breakData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar pausa:', error);
      throw error;
    }
  },

  // Delete break
  deleteBreak: async (professionalId, breakId) => {
    try {
      await api.delete(`/api/v1/availability/professional/${professionalId}/breaks/${breakId}`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir pausa:', error);
      throw error;
    }
  },

  // Get services associated with professional
  getProfessionalServices: async (professionalId) => {
    try {
      const response = await api.get(`/api/v1/professionals/${professionalId}/services`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar serviços do profissional:', error);
      throw error;
    }
  },

  // Update services associated with professional
  updateProfessionalServices: async (professionalId, serviceIds) => {
    try {
      const response = await api.put(`/api/v1/professionals/${professionalId}/services`, {
        service_ids: serviceIds
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar serviços do profissional:', error);
      throw error;
    }
  }
};