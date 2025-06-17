import apiClient from '../config/api';
import { API_ENDPOINTS } from '../../../Shared/Constans/Api';

/**
 * Get available professionals for a service
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of professional objects
 */
export const getProfessionalsForService = async (serviceId) => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.SERVICES}/${serviceId}/professionals`);
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
 * Get available time slots for a specific date, service, and professional
 * @param {string} serviceId - Service ID
 * @param {string} professionalId - Professional ID  
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of available time slots
 */
export const getAvailableTimeSlots = async (serviceId, professionalId, date) => {
  try {
    const response = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS}/availability`, {
      params: {
        service_id: serviceId,
        professional_id: professionalId,
        date: date
      }
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch available time slots');
    } else if (error.request) {
      throw new Error('Failed to fetch time slots: No response from server');
    } else {
      throw new Error(`Failed to fetch time slots: ${error.message}`);
    }
  }
};

/**
 * Create a new appointment
 * @param {Object} appointmentData - Appointment details
 * @param {string} appointmentData.service_id - Service ID
 * @param {string} appointmentData.professional_id - Professional ID
 * @param {string} appointmentData.appointment_date - Date in YYYY-MM-DD format
 * @param {string} appointmentData.start_time - Start time in HH:MM format
 * @param {string} appointmentData.observations - Optional observations
 * @returns {Promise<Object>} Created appointment object
 */
export const createAppointment = async (appointmentData) => {
  try {
    const response = await apiClient.post(API_ENDPOINTS.APPOINTMENTS, appointmentData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to create appointment');
    } else if (error.request) {
      throw new Error('Failed to create appointment: No response from server');
    } else {
      throw new Error(`Failed to create appointment: ${error.message}`);
    }
  }
};

/**
 * Get user's appointments
 * @param {string} status - Optional status filter ('scheduled', 'completed', 'cancelled')
 * @returns {Promise<Array>} Array of user appointments
 */
export const getUserAppointments = async (status = null) => {
  try {
    const params = status ? { status } : {};
    const response = await apiClient.get(`${API_ENDPOINTS.APPOINTMENTS}/my-appointments`, {
      params
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch appointments');
    } else if (error.request) {
      throw new Error('Failed to fetch appointments: No response from server');
    } else {
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }
  }
};

/**
 * Cancel an appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Updated appointment object
 */
export const cancelAppointment = async (appointmentId) => {
  try {
    const response = await apiClient.patch(`${API_ENDPOINTS.APPOINTMENTS}/${appointmentId}/cancel`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to cancel appointment');
    } else if (error.request) {
      throw new Error('Failed to cancel appointment: No response from server');
    } else {
      throw new Error(`Failed to cancel appointment: ${error.message}`);
    }
  }
};

/**
 * Reschedule an appointment
 * @param {string} appointmentId - Appointment ID
 * @param {Object} rescheduleData - New appointment details
 * @param {string} rescheduleData.appointment_date - New date in YYYY-MM-DD format
 * @param {string} rescheduleData.start_time - New start time in HH:MM format
 * @param {string} rescheduleData.professional_id - Optional new professional ID
 * @returns {Promise<Object>} Updated appointment object
 */
export const rescheduleAppointment = async (appointmentId, rescheduleData) => {
  try {
    const response = await apiClient.patch(`${API_ENDPOINTS.APPOINTMENTS}/${appointmentId}/reschedule`, rescheduleData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to reschedule appointment');
    } else if (error.request) {
      throw new Error('Failed to reschedule appointment: No response from server');
    } else {
      throw new Error(`Failed to reschedule appointment: ${error.message}`);
    }
  }
};