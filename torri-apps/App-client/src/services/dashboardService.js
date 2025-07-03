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
      console.error('Error fetching dashboard metrics:', error);
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
      console.log('[DashboardService] Fetching appointments for revenue from:', url);
      const response = await apiClient.get(url);
      const appointments = response.data || [];
      
      console.log('[DashboardService] Received appointments for revenue:', appointments.length);

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
        
        console.log('[DashboardService] Processing appointment for revenue:', {
          id: appointment.id,
          status: appointment.status,
          price: appointmentPrice,
          date: appointmentDateStr,
          today: today,
          isToday: appointmentDateStr === today,
          isCompleted: appointment.status === 'COMPLETED'
        });
        
        // Only count completed appointments for revenue
        if (appointment.status === 'COMPLETED') {
          completedRevenue += appointmentPrice;
          totalRevenue += appointmentPrice;
          
          // Today's revenue
          if (appointmentDateStr === today) {
            todayRevenue += appointmentPrice;
            console.log('[DashboardService] Added to today revenue:', appointmentPrice);
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
      
      console.log('[DashboardService] Revenue calculation result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching appointment revenue:', error);
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
      console.error('Error fetching appointment groups:', error);
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
      console.error('Error fetching today schedule:', error);
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
    console.log('[DashboardService] Calculating today appointments for date:', today);
    console.log('[DashboardService] Appointment groups received:', appointmentGroups.length);
    
    const todayAppointments = appointmentGroups.filter(group => {
      const groupDate = group.date || group.appointment_date || group.schedule_date;
      const isToday = groupDate === today;
      
      console.log('[DashboardService] Group:', {
        id: group.id,
        date: groupDate,
        isToday: isToday,
        status: group.status
      });
      
      if (isToday) return true;
      
      // Also check individual appointments within the group
      if (group.appointments && Array.isArray(group.appointments)) {
        const hasAppointmentToday = group.appointments.some(apt => {
          const aptDate = apt.date || apt.appointment_date || apt.schedule_date;
          return aptDate === today;
        });
        
        if (hasAppointmentToday) {
          console.log('[DashboardService] Found appointment in group for today');
          return true;
        }
      }
      
      return false;
    });
    
    console.log('[DashboardService] Today appointments count:', todayAppointments.length);
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
    
    console.log('[DashboardService] Getting next appointments for today (Brazil time):', today);
    console.log('[DashboardService] Current time (Brazil time):', currentTime);
    console.log('[DashboardService] Appointments to process:', appointments.length);
    
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
          console.log('[DashboardService] Appointment filtered out:', {
            id: appointment.id,
            date: appointmentDate,
            time: appointmentTime,
            status: appointment.status,
            isToday,
            isNotCompleted,
            isUpcoming,
            reason: !isToday ? 'Not today' : !isNotCompleted ? 'Completed/Cancelled' : 'Time passed'
          });
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
    
    console.log('[DashboardService] Next appointments result:', upcomingAppointments);
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
      console.log('[DashboardService] Fetching today appointments from:', url);
      
      const response = await apiClient.get(url);
      const appointments = response.data || [];
      
      console.log('[DashboardService] Today appointments received:', appointments.length);
      console.log('[DashboardService] Sample appointment:', appointments[0]);
      
      return appointments;
    } catch (error) {
      console.error('Error fetching today appointments:', error);
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
      
      console.log('[DashboardService] Final stats calculation:', {
        appointmentsCount,
        completedCount,
        uniqueClients,
        revenueData,
        formattedRevenue: this.formatCurrency(revenueData.todayRevenue)
      });
      
      // Maybe we should also count WALK_IN appointments as revenue?
      const walkInRevenue = todayAppointments
        .filter(apt => apt.status === 'WALK_IN')
        .reduce((sum, apt) => sum + (parseFloat(apt.price_at_booking) || 0), 0);
      
      const totalDayRevenue = revenueData.todayRevenue + walkInRevenue;
      const totalCompleted = completedCount + todayAppointments.filter(apt => apt.status === 'WALK_IN').length;
      
      console.log('[DashboardService] Including WALK_IN appointments:', {
        walkInRevenue,
        totalDayRevenue,
        totalCompleted
      });
      
      const finalStats = {
        appointments: appointmentsCount,
        completed: totalCompleted, // Include WALK_IN as completed
        clients: uniqueClients,
        revenue: this.formatCurrency(totalDayRevenue), // Include WALK_IN revenue
        nextAppointments: this.getNextAppointments(todayAppointments)
      };
      
      console.log('[DashboardService] Final stats result:', finalStats);
      return finalStats;
    } catch (error) {
      console.error('Error fetching today stats:', error);
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