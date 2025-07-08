/**
 * Dashboard Service
 * Handles all dashboard-related API calls for professional dashboard
 */

import apiClient from '../config/api';
import { buildApiEndpoint } from '../utils/apiHelpers';

class DashboardService {
  /**
   * Get comprehensive dashboard metrics
   * @param {string} professionalId - Optional filter by professional ID
   * @param {string} dateFrom - Optional date filter (YYYY-MM-DD)
   * @param {string} dateTo - Optional date filter (YYYY-MM-DD)
   * @returns {Promise<Object>} Dashboard metrics
   */
  async getDashboardMetrics(professionalId = null, dateFrom = null, dateTo = null) {
    try {
      // Fetch appointment data and revenue
      const appointmentParams = new URLSearchParams();
      if (professionalId) appointmentParams.append('professional_id', professionalId);
      if (dateFrom) appointmentParams.append('date_from', dateFrom);
      if (dateTo) appointmentParams.append('date_to', dateTo);

      const [appointmentData, appointmentGroups, todaySchedule] = await Promise.all([
        this.getAppointmentRevenue(appointmentParams.toString()),
        this.getAppointmentGroups(),
        this.getTodaySchedule()
      ]);

      // Aggregate metrics
      const metrics = {
        // Financial data from actual appointments/payments
        totalRevenue: appointmentData.totalRevenue || 0,
        todayRevenue: appointmentData.todayRevenue || 0,
        monthlyRevenue: appointmentData.monthlyRevenue || 0,
        completedRevenue: appointmentData.completedRevenue || 0,
        
        // Appointment statistics
        todayAppointments: this.calculateTodayAppointments(appointmentGroups),
        completedAppointments: this.calculateCompletedAppointments(appointmentGroups),
        totalClients: this.calculateUniqueClients(appointmentGroups),
        nextAppointments: this.getNextAppointments(appointmentGroups),
        
        // Schedule data
        todaySchedule: todaySchedule || [],
        
        // Raw data for additional processing
        rawAppointmentData: appointmentData,
        rawAppointmentGroups: appointmentGroups
      };

      return metrics;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get revenue data from appointment payments
   * @param {string} queryParams - URL encoded query parameters
   * @returns {Promise<Object>} Revenue data calculated from appointments
   */
  async getAppointmentRevenue(queryParams = '') {
    try {
      // Fetch ALL appointments for the date range, we'll filter by status later
      const params = new URLSearchParams(queryParams);
      // Don't filter by status in the API call, do it in JavaScript instead
      
      const url = buildApiEndpoint(`appointments?${params.toString()}`);
      const response = await apiClient.get(url);
      const appointments = response.data || [];
      

      // Calculate revenue metrics using Brazil timezone
      const brazilDate = new Date().toLocaleDateString("en-CA", {timeZone: "America/Sao_Paulo"});
      const today = brazilDate;
      const currentDate = new Date().toLocaleDateString("en-US", {timeZone: "America/Sao_Paulo"});
      const [month, , year] = currentDate.split('/');
      const currentMonth = parseInt(month) - 1; // JavaScript months are 0-indexed
      const currentYear = parseInt(year);

      let totalRevenue = 0;
      let todayRevenue = 0;
      let monthlyRevenue = 0;
      let completedRevenue = 0;

      appointments.forEach(appointment => {
        const appointmentPrice = parseFloat(appointment.price_at_booking) || 0;
        const appointmentDateStr = appointment.appointment_date; // This should already be in YYYY-MM-DD format
        
        // Only count completed appointments for revenue
        if (appointment.status === 'COMPLETED') {
          completedRevenue += appointmentPrice;
          totalRevenue += appointmentPrice;
          
          // Today's revenue
          if (appointmentDateStr === today) {
            todayRevenue += appointmentPrice;
          }
          
          // Monthly revenue - parse the date properly
          const appointmentDate = new Date(appointmentDateStr + 'T00:00:00');
          if (appointmentDate.getMonth() === currentMonth && 
              appointmentDate.getFullYear() === currentYear) {
            monthlyRevenue += appointmentPrice;
          }
        }
      });

      const result = {
        totalRevenue: totalRevenue,
        todayRevenue: todayRevenue,
        monthlyRevenue: monthlyRevenue,
        completedRevenue: completedRevenue,
        appointmentCount: appointments.length,
        completedCount: appointments.filter(apt => apt.status === 'COMPLETED').length
      };
      
      return result;
    } catch (error) {
      // Return default values if API fails
      return {
        totalRevenue: 0,
        todayRevenue: 0,
        monthlyRevenue: 0,
        completedRevenue: 0,
        appointmentCount: 0,
        completedCount: 0
      };
    }
  }

  /**
   * Get appointment groups for dashboard
   * @param {string} dateFilter - Optional date filter
   * @returns {Promise<Array>} Appointment groups
   */
  async getAppointmentGroups(dateFilter = null) {
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date_filter', dateFilter);
      
      const endpoint = params.toString() ? `appointments/groups?${params}` : 'appointments/groups';
      const url = buildApiEndpoint(endpoint);
      const response = await apiClient.get(url);
      return response.data || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get today's schedule
   * @returns {Promise<Object>} Today's schedule data
   */
  async getTodaySchedule() {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const url = buildApiEndpoint(`appointments/daily-schedule/${today}`);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate today's appointment count
   * @param {Array} appointmentGroups 
   * @returns {number} Count of today's appointments
   */
  calculateTodayAppointments(appointmentGroups) {
    if (!Array.isArray(appointmentGroups)) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    
    const todayAppointments = appointmentGroups.filter(group => {
      const groupDate = group.date || group.appointment_date || group.schedule_date;
      const isToday = groupDate === today;
      
      if (isToday) return true;
      
      // Also check individual appointments within the group
      if (group.appointments && Array.isArray(group.appointments)) {
        const hasAppointmentToday = group.appointments.some(apt => {
          const aptDate = apt.date || apt.appointment_date || apt.schedule_date;
          return aptDate === today;
        });
        
        if (hasAppointmentToday) {
          return true;
        }
      }
      
      return false;
    });
    
    return todayAppointments.length;
  }

  /**
   * Calculate completed appointments
   * @param {Array} appointmentGroups 
   * @returns {number} Count of completed appointments
   */
  calculateCompletedAppointments(appointmentGroups) {
    if (!Array.isArray(appointmentGroups)) return 0;
    
    return appointmentGroups.filter(group => 
      group.status === 'COMPLETED' || 
      group.status === 'FINALIZADO' ||
      (group.appointments && group.appointments.some(apt => 
        apt.status === 'COMPLETED' || apt.status === 'FINALIZADO'
      ))
    ).length;
  }

  /**
   * Calculate unique clients count
   * @param {Array} appointmentGroups 
   * @returns {number} Count of unique clients
   */
  calculateUniqueClients(appointmentGroups) {
    if (!Array.isArray(appointmentGroups)) return 0;
    
    const clientIds = new Set();
    appointmentGroups.forEach(group => {
      if (group.client_id) {
        clientIds.add(group.client_id);
      }
      if (group.appointments) {
        group.appointments.forEach(apt => {
          if (apt.client_id) clientIds.add(apt.client_id);
        });
      }
    });
    
    return clientIds.size;
  }

  /**
   * Get next appointments for dashboard display
   * @param {Array} appointments - Direct appointments array
   * @returns {Array} Next appointments formatted for display
   */
  getNextAppointments(appointments) {
    if (!Array.isArray(appointments)) return [];
    
    // Use Brazil timezone (America/Sao_Paulo)
    const nowInBrazil = new Date().toLocaleString("en-CA", {timeZone: "America/Sao_Paulo"});
    const [dateStr, timeStr] = nowInBrazil.split(', ');
    const today = dateStr; // YYYY-MM-DD format
    const currentTime = timeStr.slice(0, 5); // HH:MM format
    
    
    // Filter for today's appointments that haven't been completed and are upcoming
    const upcomingAppointments = appointments
      .filter(appointment => {
        const appointmentDate = appointment.appointment_date;
        const appointmentTime = appointment.start_time;
        const isToday = appointmentDate === today;
        const isNotCompleted = appointment.status !== 'COMPLETED' && appointment.status !== 'FINALIZADO' && appointment.status !== 'CANCELLED';
        
        // Show appointments that are upcoming or recently started
        let isUpcoming = true;
        if (appointmentTime && currentTime) {
          const [aptHour, aptMin] = appointmentTime.split(':').map(Number);
          const [currentHour, currentMin] = currentTime.split(':').map(Number);
          const aptTimeMinutes = aptHour * 60 + aptMin;
          const currentTimeMinutes = currentHour * 60 + currentMin;
          
          // Show appointments that are upcoming or started within the last hour
          isUpcoming = aptTimeMinutes >= (currentTimeMinutes - 60);
        }
        
        // Optional: log only if appointment doesn't pass filters for debugging
        if (!(isToday && isNotCompleted && isUpcoming)) {
          // Appointment filtered out
        }
        
        return isToday && isNotCompleted && isUpcoming;
      })
      .map(appointment => ({
        id: appointment.id,
        service: appointment.service?.name || 'Serviço',
        client: appointment.client?.full_name || 'Cliente',
        time: appointment.start_time || '--:--',
        status: this.translateStatus(appointment.status),
        professional: appointment.professional?.full_name || 'Profissional'
      }))
      .sort((a, b) => {
        // Sort by time
        const timeA = a.time.replace(':', '');
        const timeB = b.time.replace(':', '');
        return timeA.localeCompare(timeB);
      })
      .slice(0, 5); // Limit to 5 upcoming appointments
    
    return upcomingAppointments;
  }

  /**
   * Format currency for display
   * @param {number} value - Numeric value
   * @returns {string} Formatted currency string
   */
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  /**
   * Translate appointment status from English to Portuguese
   * @param {string} status - Status in English
   * @returns {string} Status in Portuguese
   */
  translateStatus(status) {
    const statusTranslations = {
      'SCHEDULED': 'Agendado',
      'CONFIRMED': 'Confirmado',
      'WALK_IN': 'Encaixe',
      'IN_PROGRESS': 'Em Andamento',
      'COMPLETED': 'Concluído',
      'CANCELLED': 'Cancelado',
      'NO_SHOW': 'Não Compareceu',
      'RESCHEDULED': 'Reagendado'
    };

    return statusTranslations[status] || status || 'Agendado';
  }

  /**
   * Get today's appointments directly from appointments endpoint
   * @returns {Promise<Array>} Today's appointments
   */
  async getTodayAppointments() {
    try {
      // Use Brazil timezone for today's date
      const today = new Date().toLocaleDateString("en-CA", {timeZone: "America/Sao_Paulo"});
      const params = new URLSearchParams();
      params.append('date_from', today);
      params.append('date_to', today);
      
      const url = buildApiEndpoint(`appointments?${params.toString()}`);
      
      const response = await apiClient.get(url);
      const appointments = response.data || [];
      
      
      return appointments;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get dashboard stats for today (simplified method)
   * @returns {Promise<Object>} Today's dashboard statistics
   */
  async getTodayStats() {
    try {
      // Use Brazil timezone for today's date
      const today = new Date().toLocaleDateString("en-CA", {timeZone: "America/Sao_Paulo"});
      
      // Get direct appointments and revenue data
      const [todayAppointments, revenueData] = await Promise.all([
        this.getTodayAppointments(),
        this.getAppointmentRevenue(`date_from=${today}&date_to=${today}`)
      ]);
      
      // Use direct appointments count for more accuracy
      const appointmentsCount = todayAppointments.length;
      const completedCount = todayAppointments.filter(apt => apt.status === 'COMPLETED').length;
      const uniqueClients = new Set(todayAppointments.map(apt => apt.client_id).filter(Boolean)).size;
      
      // Maybe we should also count WALK_IN appointments as revenue?
      const walkInRevenue = todayAppointments
        .filter(apt => apt.status === 'WALK_IN')
        .reduce((sum, apt) => sum + (parseFloat(apt.price_at_booking) || 0), 0);
      
      const totalDayRevenue = revenueData.todayRevenue + walkInRevenue;
      const totalCompleted = completedCount + todayAppointments.filter(apt => apt.status === 'WALK_IN').length;
      
      const finalStats = {
        appointments: appointmentsCount,
        completed: totalCompleted, // Include WALK_IN as completed
        clients: uniqueClients,
        revenue: this.formatCurrency(totalDayRevenue), // Include WALK_IN revenue
        nextAppointments: this.getNextAppointments(todayAppointments)
      };
      
      return finalStats;
    } catch (error) {
      // Return fallback data
      return {
        appointments: 0,
        completed: 0,
        clients: 0,
        revenue: this.formatCurrency(0),
        nextAppointments: []
      };
    }
  }
}

export default new DashboardService();