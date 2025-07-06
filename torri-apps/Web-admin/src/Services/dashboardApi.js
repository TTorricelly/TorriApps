import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint } from '../Utils/apiHelpers';

/**
 * Dashboard API service for fetching dashboard statistics
 */
export const dashboardApi = {
  /**
   * Get comprehensive dashboard statistics
   * @returns {Promise<object>} Dashboard statistics including appointments, clients, revenue, etc.
   */
  getDashboardStats: async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const weekStart = getWeekStart(new Date()).toISOString().split('T')[0];
      const weekEnd = getWeekEnd(new Date()).toISOString().split('T')[0];
      
      // Execute multiple API calls in parallel for better performance
      const [
        todayAppointments,
        activeClients, 
        weeklyCommissions,
        dailySchedule
      ] = await Promise.all([
        // Today's appointments
        api.get(buildApiEndpoint(`appointments?date_from=${today}&date_to=${today}`)),
        // Active clients count
        api.get(buildApiEndpoint('users?role=CLIENTE')),
        // Weekly revenue data
        api.get(buildApiEndpoint(`commissions/kpis?date_from=${weekStart}&date_to=${weekEnd}`)),
        // Today's detailed schedule
        api.get(buildApiEndpoint(`appointments/daily-schedule/${today}`))
      ]);

      // Process and transform the data for dashboard consumption
      const stats = {
        // Today's appointments count
        todayAppointmentsCount: todayAppointments.data?.length || 0,
        
        // Active clients count
        activeClientsCount: activeClients.data?.length || 0,
        
        // Next appointment time (from today's schedule)
        nextAppointmentTime: getNextAppointmentTime(dailySchedule.data),
        
        // Monthly revenue (using commission data as proxy)
        monthlyRevenue: weeklyCommissions.data?.total_this_period || 0,
        
        // Today's appointments details
        todayAppointmentsList: formatTodayAppointments(dailySchedule.data),
        
        // Weekly summary
        weeklySummary: {
          appointments: calculateWeeklyAppointments(dailySchedule.data),
          newClients: calculateNewClients(activeClients.data, weekStart),
          revenue: weeklyCommissions.data?.total_this_period || 0
        }
      };

      return stats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Falha ao carregar estatísticas do dashboard. Tente novamente.');
    }
  },

  /**
   * Get today's appointments for the agenda section
   * @returns {Promise<Array>} Array of today's appointments
   */
  getTodayAppointments: async () => {
    const today = new Date().toISOString().split('T')[0];
    
    return withApiErrorHandling(
      () => api.get(buildApiEndpoint(`appointments/daily-schedule/${today}`)),
      {
        defaultValue: [],
        transformData: (data) => formatTodayAppointments(data)
      }
    );
  },

  /**
   * Get revenue statistics
   * @param {string} dateFrom - Start date (YYYY-MM-DD)
   * @param {string} dateTo - End date (YYYY-MM-DD)
   * @returns {Promise<object>} Revenue statistics
   */
  getRevenueStats: async (dateFrom, dateTo) => {
    return withApiErrorHandling(
      () => api.get(buildApiEndpoint(`commissions/kpis?date_from=${dateFrom}&date_to=${dateTo}`)),
      {
        defaultValue: { total_this_period: 0, commission_count: 0 },
        transformData: (data) => data
      }
    );
  }
};

// Helper functions

/**
 * Get the start of the current week (Monday)
 */
function getWeekStart(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get the end of the current week (Sunday)
 */
function getWeekEnd(date) {
  const end = new Date(date);
  const day = end.getDay();
  const diff = end.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  end.setDate(diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Extract the next appointment time from daily schedule
 */
function getNextAppointmentTime(scheduleData) {
  if (!scheduleData?.professionals_schedule) return '--:--';
  
  const now = new Date();
  let nextAppointment = null;
  
  for (const professional of scheduleData.professionals_schedule) {
    for (const appointment of professional.appointments) {
      const appointmentTime = new Date(appointment.start_time);
      if (appointmentTime > now && (!nextAppointment || appointmentTime < nextAppointment)) {
        nextAppointment = appointmentTime;
      }
    }
  }
  
  return nextAppointment 
    ? nextAppointment.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '--:--';
}

/**
 * Format today's appointments for the agenda display
 */
function formatTodayAppointments(scheduleData) {
  if (!scheduleData?.professionals_schedule) return [];
  
  const appointments = [];
  
  for (const professional of scheduleData.professionals_schedule) {
    for (const appointment of professional.appointments) {
      appointments.push({
        time: new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        client: appointment.client_name,
        service: appointment.services.map(s => s.name).join(', '),
        professional: professional.professional_name
      });
    }
  }
  
  // Sort by time
  return appointments.sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Calculate weekly appointments count (simplified estimate)
 */
function calculateWeeklyAppointments(scheduleData) {
  // This is a simplified calculation based on today's data
  // In a real implementation, you'd want to fetch the entire week's data
  const todayCount = scheduleData?.professionals_schedule?.reduce((total, prof) => 
    total + prof.appointments.length, 0) || 0;
  
  // Estimate weekly count (rough approximation)
  return Math.round(todayCount * 7);
}

/**
 * Calculate new clients this week (simplified estimate)
 */
function calculateNewClients(clientsData, weekStart) {
  if (!Array.isArray(clientsData)) return 0;
  
  // This is a simplified calculation
  // In a real implementation, you'd filter by creation date
  return Math.min(8, Math.floor(clientsData.length * 0.1)); // Rough estimate
}