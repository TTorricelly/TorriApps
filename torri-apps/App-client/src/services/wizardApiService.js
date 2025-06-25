/**
 * Wizard API Service for Scheduling Flow
 * Maintains identical endpoints from Mobile-client-core wizardApiService.js
 * Handles all wizard-related API calls
 */

import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';

/**
 * Get available dates for calendar display (optimized endpoint)
 * @param {Array} serviceIds - Array of service IDs
 * @param {number} year - Year to check
 * @param {number} month - Month to check (1-12)
 * @returns {Promise<Array>} Array of available date strings (YYYY-MM-DD)
 */
export const getAvailableDatesForCalendar = async (serviceIds, year = null, month = null) => {
  const endpoint = buildApiEndpoint('appointments/wizard/available-dates-fast');
  
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1);
  
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
};

/**
 * Get available professionals for selected services on a specific date
 * @param {Array} serviceIds - Array of service IDs
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of available professionals
 */
export const getAvailableProfessionals = async (serviceIds, date) => {
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
};

/**
 * Get available time slots for booking
 * @param {Object} params - Slot request parameters
 * @param {Array} params.serviceIds - Array of service IDs
 * @param {string} params.date - Date string (YYYY-MM-DD)
 * @param {number} params.professionalsRequested - Number of professionals requested
 * @param {Array} params.professionalIds - Array of specific professional IDs (optional)
 * @returns {Promise<Array>} Array of available time slots
 */
export const getAvailableSlots = async ({
  serviceIds,
  date,
  professionalsRequested = 1,
  professionalIds = null
}) => {
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
      transformData: (data) => data?.available_slots || []
    }
  );
};

/**
 * Create a multi-service appointment booking
 * @param {Object} bookingData - Complete booking information
 * @returns {Promise<Object>} Booking result
 */
export const createMultiServiceBooking = async (bookingData) => {
  const endpoint = buildApiEndpoint('appointments/wizard/book');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, bookingData),
    {
      defaultValue: null,
      transformData: (data) => data
    }
  );
};

/**
 * Helper method to validate date format
 * @param {string|Date} date - Date to validate
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export const validateDate = (date) => {
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
};

/**
 * Format services for booking request
 * @param {Object} selectedSlot - Selected time slot with services
 * @returns {Array} Formatted services array
 */
export const formatServicesForBooking = (selectedSlot) => {
  return selectedSlot.services.map(service => ({
    service_id: service.service_id,
    professional_id: service.professional_id,
    station_id: service.station_id,
    start_time: service.start_time || selectedSlot.start_time,
    end_time: service.end_time || selectedSlot.end_time,
  }));
};

/**
 * Build complete booking request
 * @param {string} clientId - Client ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @param {Object} selectedSlot - Selected time slot
 * @param {string} notes - Client notes (optional)
 * @returns {Object} Complete booking request
 */
export const buildBookingRequest = (clientId, date, selectedSlot, notes = null) => {
  const services = formatServicesForBooking(selectedSlot);
  
  return {
    client_id: clientId,
    date: validateDate(date),
    selected_slot: {
      start_time: selectedSlot.start_time,
      end_time: selectedSlot.end_time,
      execution_type: selectedSlot.execution_type,
      services: services,
    },
    notes_by_client: notes,
  };
};

// Export all functions as named exports and as default object
const wizardApiService = {
  getAvailableDatesForCalendar,
  getAvailableProfessionals,
  getAvailableSlots,
  createMultiServiceBooking,
  buildBookingRequest,
  validateDate,
  formatServicesForBooking
};

export default wizardApiService;