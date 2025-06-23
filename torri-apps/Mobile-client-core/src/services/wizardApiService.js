import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';

class WizardApiService {

  /**
   * Get default number of professionals suggested
   */
  async getDefaultProsRequested() {
    const endpoint = buildApiEndpoint('settings/pros/default-suggested');
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint),
      {
        defaultValue: 1,
        transformData: (data) => data || 1
      }
    );
  }

  /**
   * Get available dates for services in a given month
   */
  async getAvailableDates(serviceIds, year = null, month = null) {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || (currentDate.getMonth() + 1);

    const endpoint = buildApiEndpoint('appointments/wizard/available-dates');
    
    const params = {
      service_ids: serviceIds,
      year: targetYear,
      month: targetMonth,
    };
    
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint, { params }),
      {
        defaultValue: [],
        transformData: (data) => Array.isArray(data) ? data : []
      }
    );
  }

  /**
   * Get available professionals for services on a specific date
   */
  async getAvailableProfessionals(serviceIds, date) {
    const endpoint = buildApiEndpoint('appointments/wizard/professionals');
    
    return withApiErrorHandling(
      () => apiClient.get(endpoint, {
        params: {
          service_ids: serviceIds,
          date: date,
        }
      }),
      {
        defaultValue: [],
        transformData: (data) => data?.professionals || []
      }
    );
  }

  /**
   * Get available time slots for multiple services
   */
  async getAvailableSlots({
    serviceIds,
    date,
    professionalsRequested = 1,
    professionalIds = null
  }) {
    const endpoint = buildApiEndpoint('appointments/wizard/availability');
    
    const params = {
      service_ids: serviceIds,
      date: date,
      professionals_requested: professionalsRequested,
    };

    if (professionalIds && professionalIds.length > 0) {
      params.professional_ids = professionalIds;
    }

    return withApiErrorHandling(
      () => apiClient.get(endpoint, { params }),
      {
        defaultValue: [],
        transformData: (data) => {
          const slots = data?.available_slots || [];
          
          return slots;
        }
      }
    );
  }

  /**
   * Create multi-service appointment booking
   */
  async createMultiServiceBooking(bookingData) {
    const endpoint = buildApiEndpoint('appointments/wizard/book');
    
    return withApiErrorHandling(
      () => apiClient.post(endpoint, bookingData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  }

  /**
   * Helper method to validate service IDs
   */
  validateServiceIds(serviceIds) {
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      throw new Error('Service IDs must be a non-empty array');
    }
    return serviceIds;
  }

  /**
   * Helper method to validate date format
   */
  validateDate(date) {
    if (typeof date === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new Error('Date must be in YYYY-MM-DD format');
      }
      return date;
    }
    
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    
    throw new Error('Invalid date format');
  }

  /**
   * Format services for booking request
   */
  formatServicesForBooking(selectedSlot) {
    return selectedSlot.services.map(service => ({
      service_id: service.service_id,
      professional_id: service.professional_id,
      station_id: service.station_id,
      start_time: service.start_time || selectedSlot.start_time,
      end_time: service.end_time || selectedSlot.end_time,
    }));
  }

  /**
   * Build complete booking request
   */
  buildBookingRequest(clientId, date, selectedSlot, notes = null) {
    const services = this.formatServicesForBooking(selectedSlot);
    
    return {
      client_id: clientId,
      date: this.validateDate(date),
      selected_slot: {
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        execution_type: selectedSlot.execution_type,
        services: services,
      },
      notes_by_client: notes,
    };
  }
}

// Create and export singleton instance
export const wizardApiService = new WizardApiService();
export default wizardApiService;