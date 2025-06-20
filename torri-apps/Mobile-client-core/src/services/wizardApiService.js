import { API_BASE_URL } from '../config/api';

class WizardApiService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/appointments/wizard`;
  }

  /**
   * Build URL with query parameters
   */
  buildURL(endpoint, params = {}) {
    const url = new URL(`${this.baseURL}${endpoint}`);
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        value.forEach(item => url.searchParams.append(key, item));
      } else if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }

  /**
   * Make authenticated API request
   */
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if available
          // TODO: Get auth token from auth store
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Wizard API request failed:', error);
      throw error;
    }
  }

  /**
   * Get default number of professionals suggested
   */
  async getDefaultProsRequested() {
    try {
      const url = `${API_BASE_URL}/settings/pros/default-suggested`;
      const response = await this.request(url);
      return response;
    } catch (error) {
      console.error('Error fetching default pros requested:', error);
      return 1; // Fallback
    }
  }

  /**
   * Get available dates for services in a given month
   */
  async getAvailableDates(serviceIds, year = null, month = null) {
    try {
      const currentDate = new Date();
      const targetYear = year || currentDate.getFullYear();
      const targetMonth = month || (currentDate.getMonth() + 1);

      const url = this.buildURL('/available-dates', {
        service_ids: serviceIds,
        year: targetYear,
        month: targetMonth,
      });

      const response = await this.request(url);
      return response;
    } catch (error) {
      console.error('Error fetching available dates:', error);
      throw error;
    }
  }

  /**
   * Get available professionals for services on a specific date
   */
  async getAvailableProfessionals(serviceIds, date) {
    try {
      const url = this.buildURL('/professionals', {
        service_ids: serviceIds,
        date: date,
      });

      const response = await this.request(url);
      return response.professionals || [];
    } catch (error) {
      console.error('Error fetching available professionals:', error);
      throw error;
    }
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
    try {
      const params = {
        service_ids: serviceIds,
        date: date,
        professionals_requested: professionalsRequested,
      };

      if (professionalIds && professionalIds.length > 0) {
        params.professional_ids = professionalIds;
      }

      const url = this.buildURL('/availability', params);

      const response = await this.request(url);
      return response.available_slots || [];
    } catch (error) {
      console.error('Error fetching available slots:', error);
      throw error;
    }
  }

  /**
   * Create multi-service appointment booking
   */
  async createMultiServiceBooking(bookingData) {
    try {
      const url = `${this.baseURL}/book`;
      
      const response = await this.request(url, {
        method: 'POST',
        body: JSON.stringify(bookingData),
      });

      return response;
    } catch (error) {
      console.error('Error creating multi-service booking:', error);
      throw error;
    }
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