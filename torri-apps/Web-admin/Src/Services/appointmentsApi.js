import { api as apiClient } from '../api/client'; // Adjust path as necessary

// Helper function to format date as YYYY-MM-DD
const formatDateToYYYYMMDD = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Fetches the daily schedule for a given date.
 * @param {Date} date - The date for which to fetch the schedule.
 * @returns {Promise<object>} The daily schedule data.
 * @throws {Error} If the API call fails.
 */
export const getDailySchedule = async (date) => {
  const dateString = formatDateToYYYYMMDD(date);
  console.log(`Fetching real schedule for date: ${dateString}`);

  try {
    // The backend endpoint is /api/v1/appointments/daily-schedule/{schedule_date}
    // apiClient should be configured with the base URL (e.g., http://localhost:8000/api/v1)
    const response = await apiClient.get(`/appointments/daily-schedule/${dateString}`);

    // The backend response is expected to be DailyScheduleResponseSchema:
    // { date: "YYYY-MM-DD", professionals_schedule: List[ProfessionalScheduleSchema] }
    // The frontend component expects an object like: { professionals: [...] }
    // So, we need to adapt the response structure here.
    if (response.data && response.data.professionals_schedule) {
      return {
        // The backend returns `date` as part of the response, which is good for confirmation,
        // but the frontend primarily needs the `professionals_schedule` array.
        // The existing frontend logic uses `scheduleData.professionals`.
        // Let's adapt to that by renaming `professionals_schedule` to `professionals`.
        date: response.data.date, // Keep the date from response for consistency
        professionals: response.data.professionals_schedule.map(prof_schedule => ({
          id: prof_schedule.professional_id,
          name: prof_schedule.professional_name,
          photoUrl: prof_schedule.professional_photo_url, // Ensure this matches the schema field `professional_photo_url`
          appointments: prof_schedule.appointments.map(apt => ({
            id: apt.id,
            clientName: apt.client_name, // From backend's AppointmentDetailSchema

            // Added fields, assuming 'apt' (from AppointmentDetailSchema) will contain them.
            notes_by_client: apt.notes_by_client || null,
            clientEmail: apt.client_email || '',
            clientPhone: apt.client_phone_number || '',

            startTime: new Date(apt.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), // Formatted for display
            startTimeISO: apt.start_time, // Raw ISO string from backend
            duration: apt.duration_minutes,
            services: apt.services.map(service => service.name), // From backend's ServiceTagSchema
            status: apt.status,
            _originalServices: apt.services, // Keep if used by UI
            // Calculate end_time ISO string. Backend sends start_time (datetime) and duration_minutes.
            endTimeISO: new Date(new Date(apt.start_time).getTime() + apt.duration_minutes * 60000).toISOString()
          })),
          blockedSlots: prof_schedule.blocked_slots.map(block => ({
            id: block.id,
            startTime: new Date(block.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), // Formatted for display
            startTimeISO: block.start_time, // Raw ISO string
            duration: block.duration_minutes,
            reason: block.reason,
            type: 'blocked',
            endTimeISO: new Date(new Date(block.start_time).getTime() + block.duration_minutes * 60000).toISOString()
          }))
        }))
      };
    } else {
      // Handle cases where the response might not be as expected
      console.error("Unexpected API response structure:", response.data);
      throw new Error("Resposta da API em formato inesperado.");
    }
  } catch (error) {
    console.error("Error fetching daily schedule:", error.response?.data || error.message);
    // You might want to throw a more user-friendly error or an error object
    // that can be caught and interpreted by the UI (e.g., for specific error messages).
    const errorMessage = error.response?.data?.detail || "Falha ao buscar agenda. Tente novamente mais tarde.";
    throw new Error(errorMessage);
  }
};

/**
 * Creates a new appointment.
 * @param {object} appointmentData - The appointment data to create.
 * @returns {Promise<object>} The created appointment data.
 * @throws {Error} If the API call fails.
 */
export const createAppointment = async (appointmentData) => {
  try {
    const response = await apiClient.post('/appointments', appointmentData);
    return response.data;
  } catch (error) {
    console.error("Error creating appointment:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao criar agendamento. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Updates an existing appointment.
 * @param {string} appointmentId - The ID of the appointment to update.
 * @param {object} appointmentData - The updated appointment data.
 * @returns {Promise<object>} The updated appointment data.
 * @throws {Error} If the API call fails.
 */
export const updateAppointment = async (appointmentId, appointmentData) => {
  try {
    const response = await apiClient.put(`/appointments/${appointmentId}`, appointmentData);
    return response.data;
  } catch (error) {
    console.error("Error updating appointment:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao atualizar agendamento. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Updates an appointment with multiple services (creates one appointment per service).
 * @param {string} appointmentId - The ID of the appointment to update.
 * @param {object} appointmentData - The updated appointment data including services array.
 * @returns {Promise<Array>} Array of appointment data (one per service).
 * @throws {Error} If the API call fails.
 */
export const updateAppointmentWithMultipleServices = async (appointmentId, appointmentData) => {
  try {
    const response = await apiClient.put(`/appointments/${appointmentId}/multiple-services`, appointmentData);
    return response.data;
  } catch (error) {
    console.error("Error updating appointment with multiple services:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao atualizar agendamento com múltiplos serviços. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Cancels an appointment.
 * @param {string} appointmentId - The ID of the appointment to cancel.
 * @param {object} [reasonPayload=null] - Optional payload with cancellation reason, e.g., { reason: "Client request" }.
 * @returns {Promise<object>} The updated appointment data (which now includes the cancelled status).
 * @throws {Error} If the API call fails.
 */
export const cancelAppointment = async (appointmentId, reasonPayload = null) => {
  try {
    // The backend PATCH endpoint for cancel expects an Optional[AppointmentCancelPayload].
    // An empty body or a body with { "reason": null/undefined } should be acceptable if reason is optional.
    // If reasonPayload is null, apiClient.patch might send an empty body or just the headers.
    const response = await apiClient.patch(`/appointments/${appointmentId}/cancel`, reasonPayload);
    return response.data; // The cancel endpoint returns the updated appointment
  } catch (error) {
    console.error("Error cancelling appointment:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao cancelar agendamento. Tente novamente.";
    throw new Error(errorMessage);
  }
};

/**
 * Gets appointment by ID.
 * @param {string} appointmentId - The ID of the appointment to fetch.
 * @returns {Promise<object>} The appointment data.
 * @throws {Error} If the API call fails.
 */
export const getAppointmentById = async (appointmentId) => {
  try {
    const response = await apiClient.get(`/appointments/${appointmentId}`);

    return response.data;
  } catch (error) {
    console.error("Error fetching appointment:", error.response?.data || error.message);
    const errorMessage = error.response?.data?.detail || "Falha ao buscar agendamento. Tente novamente.";
    throw new Error(errorMessage);
  }
};
