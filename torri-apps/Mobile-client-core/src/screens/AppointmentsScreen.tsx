import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react-native';
import { getUserAppointments, cancelAppointment } from '../services/appointmentService';
import { formatDateForDisplay } from '../utils/dateUtils';
import { DateOption } from '../types';
import useAuthStore from '../store/authStore';

interface UserBasicInfo {
  id: string;
  full_name?: string;
  email: string;
}

interface ServiceBasicInfo {
  id: string;
  name: string;
  duration_minutes: number;
}

interface Appointment {
  id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  price_at_booking?: number;
  paid_manually?: boolean;
  notes_by_client?: string;
  notes_by_professional?: string;
  
  // Nested objects from backend
  client?: UserBasicInfo;
  professional?: UserBasicInfo;
  service?: ServiceBasicInfo;
  
  // Legacy fields for backward compatibility
  service_name?: string;
  professional_name?: string;
  observations?: string;
  salon_name?: string;
  salon_address?: string;
}

const AppointmentsScreen = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const loadAppointments = async (showRefreshLoader = false) => {
    if (!isAuthenticated || !user) {
      setIsLoading(false);
      setRefreshing(false);
      setError('User not authenticated');
      return;
    }

    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const data = await getUserAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('[AppointmentsScreen] Error loading appointments:', err);
      setError(err.message || 'Failed to load appointments');
      setAppointments([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadAppointments();
    }
  }, [authLoading, isAuthenticated]);

  const handleRefresh = () => {
    loadAppointments(true);
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancelar Agendamento',
      'Tem certeza que deseja cancelar este agendamento?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(appointmentId);
              Alert.alert('Sucesso', 'Agendamento cancelado com sucesso');
              loadAppointments();
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao cancelar agendamento');
            }
          },
        },
      ]
    );
  };

  const formatAppointmentDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00');
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    const dateOption: DateOption = {
      day: dayNames[date.getDay()],
      date: date.getDate().toString(),
      month: monthNames[date.getMonth()],
      fullDate: dateString
    };
    
    return formatDateForDisplay(dateOption);
  };

  const formatPrice = (price?: number): string => {
    if (!price || typeof price !== 'number') return '';
    return `R$ ${price.toFixed(2).replace('.', ',')}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return {
          icon: <Clock size={16} color="#3b82f6" />,
          text: 'Confirmado',
          color: '#3b82f6',
          bgColor: '#eff6ff',
          borderColor: '#3b82f6'
        };
      case 'COMPLETED':
        return {
          icon: <CheckCircle size={16} color="#22c55e" />,
          text: 'Concluído',
          color: '#22c55e',
          bgColor: '#f0fdf4',
          borderColor: '#22c55e'
        };
      case 'CANCELLED':
        return {
          icon: <XCircle size={16} color="#ef4444" />,
          text: 'Cancelado',
          color: '#ef4444',
          bgColor: '#fef2f2',
          borderColor: '#ef4444'
        };
      case 'NO_SHOW':
        return {
          icon: <AlertCircle size={16} color="#f59e0b" />,
          text: 'Faltou',
          color: '#f59e0b',
          bgColor: '#fffbeb',
          borderColor: '#f59e0b'
        };
      case 'IN_PROGRESS':
        return {
          icon: <Clock size={16} color="#f59e0b" />,
          text: 'Em Andamento',
          color: '#f59e0b',
          bgColor: '#fffbeb',
          borderColor: '#f59e0b'
        };
      default:
        return {
          icon: <Clock size={16} color="#6b7280" />,
          text: status,
          color: '#6b7280',
          bgColor: '#f9fafb',
          borderColor: '#6b7280'
        };
    }
  };

  const isUpcomingAppointment = (appointment: Appointment): boolean => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    return (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') && 
           appointment.appointment_date >= today;
  };

  const filterAppointments = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (activeTab === 'upcoming') {
      return appointments.filter(apt => isUpcomingAppointment(apt));
    } else {
      return appointments.filter(apt => !isUpcomingAppointment(apt));
    }
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const statusConfig = getStatusConfig(appointment.status);
    const serviceName = appointment.service?.name || appointment.service_name || 'Serviço não informado';
    const professionalName = appointment.professional?.full_name || appointment.professional_name || 'Profissional não informado';
    const isUpcoming = isUpcomingAppointment(appointment);
    const isExpanded = expandedCard === appointment.id;

    return (
      <TouchableOpacity 
        key={appointment.id} 
        style={[styles.appointmentCard, { borderLeftColor: statusConfig.borderColor }]}
        activeOpacity={0.7}
        onPress={() => setExpandedCard(isExpanded ? null : appointment.id)}
      >
        {/* Header with service and status */}
        <View style={styles.cardHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceName}</Text>
            <Text style={styles.professionalName}>{professionalName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            {statusConfig.icon}
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        {/* Date and time row */}
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeInfo}>
            <Calendar size={18} color="#ec4899" />
            <Text style={styles.dateText}>
              {formatAppointmentDate(appointment.appointment_date)}
            </Text>
            <Text style={styles.timeText}>
              {appointment.start_time.substring(0, 5)}
            </Text>
            {appointment.service?.duration_minutes && (
              <View style={styles.durationBadgeSmall}>
                <Text style={styles.durationTextSmall}>
                  {appointment.service.duration_minutes}min
                </Text>
              </View>
            )}
          </View>
          {appointment.price_at_booking && (
            <Text style={styles.priceText}>
              {formatPrice(appointment.price_at_booking)}
            </Text>
          )}
        </View>

        {/* Notes if available */}
        {(appointment.notes_by_client || appointment.observations) && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>
              {appointment.notes_by_client || appointment.observations}
            </Text>
          </View>
        )}

        {/* Expanded details section */}
        {isExpanded && (appointment.salon_name || appointment.salon_address) && (
          <View style={styles.expandedDetails}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Informações do Local</Text>
            </View>
            
            {appointment.salon_name && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Local:</Text>
                <Text style={styles.detailValue}>{appointment.salon_name}</Text>
              </View>
            )}
            
            {appointment.salon_address && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Endereço:</Text>
                <Text style={styles.detailValue}>{appointment.salon_address}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action button for upcoming appointments */}
        {isUpcoming && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelAppointment(appointment.id)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            {(appointment.salon_name || appointment.salon_address) && (
              <TouchableOpacity 
                style={styles.detailsButton}
                onPress={() => setExpandedCard(isExpanded ? null : appointment.id)}
              >
                <Text style={styles.detailsButtonText}>
                  {isExpanded ? 'Menos' : 'Local'}
                </Text>
                <ChevronRight 
                  size={16} 
                  color="#ec4899" 
                  style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Loading states remain the same as original
  if (authLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Meus Agendamentos</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Verificando autenticação...</Text>
        </View>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Meus Agendamentos</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={styles.loadingText}>Carregando agendamentos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meus Agendamentos</Text>
        </View>
      </SafeAreaView>

      {/* Modern Tab Selector */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
              Próximos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              Histórico
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color="#ef4444" />
            <Text style={styles.errorTitle}>Erro ao carregar agendamentos</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadAppointments()}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {filterAppointments().length === 0 ? (
              <View style={styles.emptyContainer}>
                <Calendar size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>
                  {activeTab === 'upcoming' ? 'Nenhum agendamento próximo' : 'Nenhum item no histórico'}
                </Text>
                <Text style={styles.emptyMessage}>
                  {activeTab === 'upcoming' 
                    ? 'Quando você agendar um serviço, ele aparecerá aqui' 
                    : 'Seus agendamentos passados aparecerão aqui'}
                </Text>
              </View>
            ) : (
              <View style={styles.appointmentsList}>
                {filterAppointments().map(renderAppointmentCard)}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ec4899',
  },
  headerContainer: {
    backgroundColor: '#ec4899',
  },
  header: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  tabsContainer: {
    backgroundColor: '#ec4899',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 16,
  },
  tabTextActive: {
    color: '#ec4899',
  },
  content: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  appointmentsList: {
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  professionalName: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  timeText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  priceText: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
  },
  durationBadgeSmall: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  durationTextSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  notesContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ec4899',
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fdf2f8',
    borderWidth: 1,
    borderColor: '#f9a8d4',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 4,
  },
  detailsButtonText: {
    color: '#ec4899',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#ec4899',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 24,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  expandedDetails: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  detailsHeader: {
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '400',
    flex: 2,
    textAlign: 'right',
  },
});

export default AppointmentsScreen;