/**
 * Appointment Service for handling appointment operations
 * Maintains identical API endpoints and logic from Mobile-client-core
 */

import { withApiErrorHandling, buildApiEndpoint } from '../utils/apiHelpers';
import apiClient from '../config/api';

/**
 * Fetches available time slots for a service, professional, and date.
 * @param {string} serviceId - The ID of the service.
 * @param {string} professionalId - The ID of the professional.
 * @param {string} date - The date in YYYY-MM-DD format.
 * @returns {Promise<Array>} Array of available time slots.
 */
export const getAvailableTimeSlots = async (serviceId, professionalId, date) => {
  const endpoint = buildApiEndpoint('appointments/availability');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, {
      params: {
        service_id: serviceId,
        professional_id: professionalId,
        date: date
      }
    }),
    {
      defaultValue: [],
      transformData: (data) => data,
      logErrors: true
    }
  );
};

/**
 * Creates a new appointment.
 * @param {Object} appointmentData - Appointment details.
 * @returns {Promise<Object>} Created appointment data.
 */
export const createAppointment = async (appointmentData) => {
  const endpoint = buildApiEndpoint('appointments');
  
  return withApiErrorHandling(
    () => apiClient.post(endpoint, appointmentData),
    {
      defaultValue: null,
      transformData: (data) => data,
      logErrors: true
    }
  );
};

/**
 * Fetches user's appointments.
 * @param {Object} params - Optional parameters for filtering
 * @returns {Promise<Array>} Array of user appointments.
 */
export const getUserAppointments = async (params = {}) => {
  const endpoint = buildApiEndpoint('appointments');
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, { params }),
    {
      defaultValue: [],
      transformData: (data) => data,
      logErrors: true
    }
  );
};

/**
 * Cancels an appointment.
 * @param {string} appointmentId - The ID of the appointment to cancel.
 * @returns {Promise<Object>} Cancellation result.
 */
export const cancelAppointment = async (appointmentId) => {
  const endpoint = buildApiEndpoint(`appointments/${appointmentId}/cancel`);
  
  return withApiErrorHandling(
    () => apiClient.patch(endpoint),
    {
      defaultValue: null,
      transformData: (data) => data,
      logErrors: true
    }
  );
};