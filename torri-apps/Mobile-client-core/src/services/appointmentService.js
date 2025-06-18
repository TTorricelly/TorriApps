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
 * Get professional weekly availability slots (same endpoint as Web-admin)
 * Returns the professional's weekly recurring availability schedule
 * @param {string} professionalId - Professional ID  
 * @returns {Promise<Array>} Array of weekly availability slots
 */
export const getProfessionalWeeklyAvailability = async (professionalId) => {
  try {
    const response = await apiClient.get(`/api/v1/availability/professional/${professionalId}/slots`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || 'Failed to fetch professional availability');
    } else if (error.request) {
      throw new Error('Failed to fetch availability: No response from server');
    } else {
      throw new Error(`Failed to fetch availability: ${error.message}`);
    }
  }
};

/**
 * Get professional daily availability with appointment slots (appointments endpoint)
 * Returns 30-minute time slots with availability status for a specific date
 * @param {string} professionalId - Professional ID  
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Object with date and slots array { date: "2024-06-17", slots: [{ start_time: "09:00", end_time: "09:30", is_available: true }] }
 */
export const getProfessionalDailyAvailability = async (professionalId, date) => {
  try {
    const response = await apiClient.get(`/api/v1/appointments/professional/${professionalId}/availability/`, {
      params: { date }
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
 * Generate available time slots for a professional on a specific date
 * Uses the weekly availability to generate daily time slots (like Web-admin approach)
 * @param {string} serviceId - Service ID (not used in current implementation, kept for compatibility)
 * @param {string} professionalId - Professional ID  
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of available time slot strings (e.g., ["09:00", "09:30", "10:00"])
 */
export const getAvailableTimeSlots = async (serviceId, professionalId, date) => {
  try {
    // First try the appointment endpoint for precise daily availability
    try {
      const dailyAvailability = await getProfessionalDailyAvailability(professionalId, date);
      
      // Transform the slots data to return only available time slots as strings
      const availableSlots = dailyAvailability.slots
        .filter(slot => slot.is_available)
        .map(slot => slot.start_time);
      
      return availableSlots;
    } catch (dailyError) {
      // Fallback: Use weekly availability and generate basic time slots
      const weeklyAvailability = await getProfessionalWeeklyAvailability(professionalId);
      
      // Simple fallback: generate basic time slots based on day of week
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Filter slots for the selected day of week and generate time slots
      const daySlots = weeklyAvailability.filter(slot => {
        // Convert day_of_week to match JavaScript's getDay() (0-6)
        // Backend returns lowercase day names
        const slotDayMap = {
          'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
          'friday': 5, 'saturday': 6, 'sunday': 0
        };
        return slotDayMap[slot.day_of_week.toLowerCase()] === dayOfWeek;
      });
      
      // Generate 30-minute slots from the weekly availability
      const timeSlots = [];
      daySlots.forEach(slot => {
        const startTime = slot.start_time;
        const endTime = slot.end_time;
        
        // Simple implementation: create slots every 30 minutes
        const start = new Date(`1970-01-01T${startTime}`);
        const end = new Date(`1970-01-01T${endTime}`);
        
        while (start < end) {
          const timeString = start.toTimeString().substring(0, 5); // "HH:MM"
          timeSlots.push(timeString);
          start.setMinutes(start.getMinutes() + 30);
        }
      });
      
      return timeSlots.sort();
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new appointment for the authenticated user
 * @param {Object} appointmentData - Appointment details
 * @param {string} appointmentData.service_id - Service ID
 * @param {string} appointmentData.professional_id - Professional ID
 * @param {string} appointmentData.appointment_date - Date in YYYY-MM-DD format
 * @param {string} appointmentData.start_time - Start time in HH:MM format
 * @param {string} appointmentData.notes_by_client - Optional notes from client
 * @returns {Promise<Object>} Created appointment object
 */
export const createAppointment = async (appointmentData) => {
  try {
    // Create the payload with the exact structure expected by the backend
    const payload = {
      client_id: appointmentData.client_id, // This should be the authenticated user's ID
      professional_id: appointmentData.professional_id,
      service_id: appointmentData.service_id,
      appointment_date: appointmentData.appointment_date,
      start_time: appointmentData.start_time,
      notes_by_client: appointmentData.notes_by_client || null
    };

    const response = await apiClient.post(API_ENDPOINTS.APPOINTMENTS, payload);
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
    console.log('getUserAppointments - Making request to:', API_ENDPOINTS.APPOINTMENTS);
    console.log('getUserAppointments - With params:', params);
    
    // Use the main appointments endpoint without trailing slash to avoid 307 redirect
    const response = await apiClient.get(API_ENDPOINTS.APPOINTMENTS, {
      params
    });
    
    console.log('getUserAppointments - Response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('getUserAppointments error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url,
      headers: error.config?.headers
    });
    
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