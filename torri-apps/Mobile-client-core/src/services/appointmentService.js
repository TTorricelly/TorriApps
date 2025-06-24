import { withApiErrorHandling, buildApiEndpoint, transformEntityWithImages } from '../utils/apiHelpers';
import apiClient from '../config/api';

// Image fields for professional data
const PROFESSIONAL_IMAGE_FIELDS = ['photo_url', 'avatar_url', 'profile_picture_url'];

/**
 * Get available professionals for a service
 * @param {string} serviceId - Service ID
 * @returns {Promise<Array>} Array of professional objects
 */
export const getProfessionalsForService = async (serviceId) => {
  const endpoint = buildApiEndpoint(`services/${serviceId}/professionals`);
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: [],
      transformData: (data) => transformEntityWithImages(data, PROFESSIONAL_IMAGE_FIELDS)
    }
  );
};

/**
 * Get professional weekly availability slots (same endpoint as Web-admin)
 * Returns the professional's weekly recurring availability schedule
 * @param {string} professionalId - Professional ID  
 * @returns {Promise<Array>} Array of weekly availability slots
 */
export const getProfessionalWeeklyAvailability = async (professionalId) => {
  const endpoint = buildApiEndpoint(`availability/professional/${professionalId}/slots`);
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint),
    {
      defaultValue: [],
      transformData: (data) => data
    }
  );
};

/**
 * Get professional daily availability with appointment slots (appointments endpoint)
 * Returns 30-minute time slots with availability status for a specific date
 * @param {string} professionalId - Professional ID  
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Object with date and slots array { date: "2024-06-17", slots: [{ start_time: "09:00", end_time: "09:30", is_available: true }] }
 */
export const getProfessionalDailyAvailability = async (professionalId, date) => {
  const endpoint = buildApiEndpoint(`appointments/professional/${professionalId}/availability`);
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, { params: { date } }),
    {
      defaultValue: { date, slots: [] },
      transformData: (data) => data
    }
  );
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
      // Fix timezone issue by explicitly adding time component
      const selectedDate = new Date(date + 'T00:00:00');
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
  const endpoint = buildApiEndpoint('appointments');
  
  // Create the payload with the exact structure expected by the backend
  const payload = {
    client_id: appointmentData.client_id, // This should be the authenticated user's ID
    professional_id: appointmentData.professional_id,
    service_id: appointmentData.service_id,
    appointment_date: appointmentData.appointment_date,
    start_time: appointmentData.start_time,
    notes_by_client: appointmentData.notes_by_client || null
  };

  return withApiErrorHandling(
    () => apiClient.post(endpoint, payload),
    {
      defaultValue: null,
      transformData: (data) => data
    }
  );
};

/**
 * Get user's appointments
 * @param {string} status - Optional status filter ('scheduled', 'completed', 'cancelled')
 * @returns {Promise<Array>} Array of user appointments
 */
export const getUserAppointments = async (status = null) => {
  const endpoint = buildApiEndpoint('appointments');
  const params = status ? { status } : {};
  
  
  return withApiErrorHandling(
    () => apiClient.get(endpoint, { params }),
    {
      defaultValue: [],
      transformData: (data) => {
        return data;
      }
    }
  );
};

/**
 * Cancel an appointment
 * @param {string} appointmentId - Appointment ID
 * @returns {Promise<Object>} Updated appointment object
 */
export const cancelAppointment = async (appointmentId) => {
  const endpoint = buildApiEndpoint(`appointments/${appointmentId}/cancel`);
  
  return withApiErrorHandling(
    () => apiClient.patch(endpoint),
    {
      defaultValue: null,
      transformData: (data) => data
    }
  );
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
  const endpoint = buildApiEndpoint(`appointments/${appointmentId}/reschedule`);
  
  return withApiErrorHandling(
    () => apiClient.patch(endpoint, rescheduleData),
    {
      defaultValue: null,
      transformData: (data) => data
    }
  );
};