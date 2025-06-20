import { api } from '../api/client';

export const professionalsApi = {
  // Get all professionals (users with role PROFISSIONAL)
  getAll: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.services && filters.services.length > 0) {
        params.append('services', filters.services.join(','));
      }
      
      const response = await api.get(`/professionals?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error);
      throw error;
    }
  },

  // Get professional by ID
  getById: async (professionalId) => {
    try {
      const response = await api.get(`/professionals/${professionalId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar profissional:', error);
      throw error;
    }
  },

  // Create new professional
  create: async (professionalData) => {
    try {
      const response = await api.post('/professionals', professionalData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar profissional:', error);
      throw error;
    }
  },

  // Update professional
  update: async (professionalId, professionalData) => {
    try {
      const response = await api.put(`/professionals/${professionalId}`, professionalData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error);
      throw error;
    }
  },

  // Delete professional
  delete: async (professionalId) => {
    try {
      await api.delete(`/professionals/${professionalId}`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir profissional:', error);
      throw error;
    }
  },

  // Upload professional profile photo
  uploadPhoto: async (professionalId, photoFile) => {
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);

      const response = await api.post(`/professionals/${professionalId}/photo`, formData, {
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
      const response = await api.get(`/availability/professional/${professionalId}/slots`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error);
      throw error;
    }
  },

  // Create availability slot
  createAvailabilitySlot: async (professionalId, slotData) => {
    try {
      const response = await api.post(`/availability/professional/${professionalId}/slots`, slotData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar slot de disponibilidade:', error);
      throw error;
    }
  },

  // Delete availability slot
  deleteAvailabilitySlot: async (professionalId, slotId) => {
    try {
      await api.delete(`/availability/professional/${professionalId}/slots/${slotId}`);
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
      const currentSlots = await api.get(`/availability/professional/${professionalId}/slots`);
      
      // Delete all existing slots
      for (const slot of currentSlots.data) {
        await api.delete(`/availability/professional/${professionalId}/slots/${slot.id}`);
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
          const response = await api.post(`/availability/professional/${professionalId}/slots`, slotData);
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
      const response = await api.get(`/availability/professional/${professionalId}/blocked-times`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar períodos bloqueados:', error);
      throw error;
    }
  },

  // Create blocked period
  createBlockedPeriod: async (professionalId, blockData) => {
    try {
      const response = await api.post(`/availability/professional/${professionalId}/blocked-times`, blockData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar período bloqueado:', error);
      throw error;
    }
  },

  // Delete blocked period
  deleteBlockedPeriod: async (professionalId, blockId) => {
    try {
      await api.delete(`/availability/professional/${professionalId}/blocked-times/${blockId}`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir período bloqueado:', error);
      throw error;
    }
  },

  // Get professional breaks
  getBreaks: async (professionalId) => {
    try {
      const response = await api.get(`/availability/professional/${professionalId}/breaks`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar pausas:', error);
      throw error;
    }
  },

  // Create break
  createBreak: async (professionalId, breakData) => {
    try {
      const response = await api.post(`/availability/professional/${professionalId}/breaks`, breakData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar pausa:', error);
      throw error;
    }
  },

  // Delete break
  deleteBreak: async (professionalId, breakId) => {
    try {
      await api.delete(`/availability/professional/${professionalId}/breaks/${breakId}`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir pausa:', error);
      throw error;
    }
  },

  // Get services associated with professional
  getProfessionalServices: async (professionalId) => {
    try {
      const response = await api.get(`/professionals/${professionalId}/services`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar serviços do profissional:', error);
      throw error;
    }
  },

  // Update services associated with professional
  updateProfessionalServices: async (professionalId, serviceIds) => {
    try {
      const response = await api.put(`/professionals/${professionalId}/services`, {
        service_ids: serviceIds
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar serviços do profissional:', error);
      throw error;
    }
  }
};