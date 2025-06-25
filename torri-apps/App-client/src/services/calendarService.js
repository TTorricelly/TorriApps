/**
 * Calendar Service
 * Handles fetching appointment data for calendar display
 * Optimized for calendar month view with appointment indicators
 */

import apiClient from '../config/api';
import { withApiErrorHandling } from '../utils/apiHelpers';

/**
 * Get appointments for a specific month to show calendar indicators
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Calendar data with appointment counts per day
 */
export const getCalendarAppointments = withApiErrorHandling(async (year, month) => {
  const response = await apiClient.get('/api/v1/appointments/calendar', {
    params: {
      year,
      month
    }
  });
  
  return response.data;
});

/**
 * Get daily schedule for a specific date (for the agenda view)
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Daily schedule with appointments by professional
 */
export const getDailySchedule = withApiErrorHandling(async (date) => {
  const response = await apiClient.get(`/api/v1/appointments/daily-schedule/${date}`);
  
  return response.data;
});

/**
 * Get appointment summary for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Appointment summary with counts and basic info
 */
export const getDateAppointmentSummary = withApiErrorHandling(async (date) => {
  const response = await apiClient.get('/api/v1/appointments/date-summary', {
    params: { date }
  });
  
  return response.data;
});

/**
 * Get appointment count for multiple dates (batch operation)
 * @param {string[]} dates - Array of dates in YYYY-MM-DD format
 * @returns {Promise<Object>} Object with date as key and appointment count as value
 */
export const getBatchAppointmentCounts = withApiErrorHandling(async (dates) => {
  const response = await apiClient.post('/api/v1/appointments/batch-counts', {
    dates
  });
  
  return response.data;
});

/**
 * Get available dates for calendar month (optimized for fast loading)
 * Uses existing wizard API for consistency
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Available dates with appointment indicators
 */
export const getCalendarAvailability = withApiErrorHandling(async (year, month) => {
  const response = await apiClient.get('/api/v1/appointments/wizard/available-dates-fast', {
    params: {
      year,
      month,
      // For salon staff, we want to see all days regardless of availability
      include_unavailable: true
    }
  });
  
  return response.data;
});

/**
 * Process calendar data for appointment indicators
 * Transforms API response into calendar-friendly format
 * @param {Object} calendarData - Raw calendar data from API
 * @returns {Object} Processed data with appointment counts per day
 */
export const processCalendarData = (calendarData) => {
  const processedData = {};
  
  if (calendarData?.days) {
    calendarData.days.forEach(day => {
      const dateKey = day.date; // YYYY-MM-DD format
      processedData[dateKey] = {
        appointmentCount: day.appointment_count || 0,
        totalProfessionals: day.total_professionals || 0,
        busyProfessionals: day.busy_professionals || 0,
        availability: day.availability || 'unknown'
      };
    });
  }
  
  return processedData;
};

/**
 * Get appointment density level for calendar indicators
 * @param {number} count - Number of appointments
 * @param {number} maxCapacity - Maximum appointments possible (optional)
 * @returns {string} Density level: 'light', 'medium', 'heavy', 'none'
 */
export const getAppointmentDensity = (count, maxCapacity = null) => {
  if (count === 0) return 'none';
  
  if (maxCapacity) {
    const ratio = count / maxCapacity;
    if (ratio >= 0.8) return 'heavy';
    if (ratio >= 0.5) return 'medium';
    return 'light';
  }
  
  // Fallback thresholds when max capacity is unknown
  if (count >= 8) return 'heavy';
  if (count >= 4) return 'medium';
  return 'light';
};

/**
 * Format date for API calls
 * @param {Date} date - JavaScript Date object
 * @returns {string} Date in YYYY-MM-DD format
 */
export const formatDateForApi = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Get calendar month range
 * @param {Date} date - Any date in the target month
 * @returns {Object} Object with startDate and endDate for the month
 */
export const getMonthRange = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  return {
    startDate: formatDateForApi(startDate),
    endDate: formatDateForApi(endDate),
    year,
    month: month + 1 // API expects 1-12, JS uses 0-11
  };
};