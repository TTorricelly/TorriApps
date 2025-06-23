import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, User, MapPin, AlertCircle, CheckCircle, XCircle } from 'lucide-react-native';
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
  
  // Legacy fields for backward compatibility (might not be populated)
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

  const loadAppointments = async (showRefreshLoader = false) => {
    // Check if user is authenticated before making API call
    if (!isAuthenticated || !user) {
      console.log('[AppointmentsScreen] User not authenticated, skipping appointments load');
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
      
      console.log('[AppointmentsScreen] Loading appointments for user:', user.id);
      const data = await getUserAppointments();
      // Temporary debugging - remove once confirmed working
      console.log('[AppointmentsScreen] Raw appointment data:', JSON.stringify(data, null, 2));
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
    // Only load appointments when auth loading is complete and user is authenticated
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
              loadAppointments(); // Reload appointments
            } catch (err: any) {
              Alert.alert('Erro', err.message || 'Falha ao cancelar agendamento');
            }
          },
        },
      ]
    );
  };

  // Helper function to convert date string to DateOption for formatting
  const formatAppointmentDate = (dateString: string): string => {
    // Fix timezone issue by explicitly adding time component
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return <Clock size={20} color="#3b82f6" />;
      case 'COMPLETED':
        return <CheckCircle size={20} color="#22c55e" />;
      case 'CANCELLED':
        return <XCircle size={20} color="#ef4444" />;
      case 'NO_SHOW':
        return <AlertCircle size={20} color="#f59e0b" />;
      case 'IN_PROGRESS':
        return <Clock size={20} color="#f59e0b" />;
      default:
        return <Clock size={20} color="#6b7280" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'Agendado';
      case 'CONFIRMED':
        return 'Confirmado';
      case 'IN_PROGRESS':
        return 'Em Andamento';
      case 'COMPLETED':
        return 'Concluído';
      case 'CANCELLED':
        return 'Cancelado';
      case 'NO_SHOW':
        return 'Faltou';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return '#3b82f6';
      case 'IN_PROGRESS':
        return '#f59e0b';
      case 'COMPLETED':
        return '#22c55e';
      case 'CANCELLED':
        return '#ef4444';
      case 'NO_SHOW':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const filterAppointments = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (activeTab === 'upcoming') {
      // Check for both SCHEDULED and CONFIRMED as upcoming appointments
      return appointments.filter(apt => 
        (apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && apt.appointment_date >= today
      );
    } else {
      // History includes completed, cancelled, no-show appointments, or past appointments
      return appointments.filter(apt => 
        (apt.status === 'COMPLETED' || apt.status === 'CANCELLED' || apt.status === 'NO_SHOW') || apt.appointment_date < today
      );
    }
  };

  const renderAppointmentCard = (appointment: Appointment) => (
    <View key={appointment.id} style={{
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2
    }}>
      {/* Header with service name and status */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', flex: 1 }}>
          {appointment.service?.name || appointment.service_name || 'Serviço não informado'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          {getStatusIcon(appointment.status)}
          <Text style={{ 
            marginLeft: 4, 
            fontSize: 14, 
            fontWeight: '500',
            color: getStatusColor(appointment.status)
          }}>
            {getStatusText(appointment.status)}
          </Text>
        </View>
      </View>

      {/* Date and time */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Calendar size={16} color="#6b7280" />
        <Text style={{ marginLeft: 8, fontSize: 14, color: '#6b7280' }}>
          {formatAppointmentDate(appointment.appointment_date)} às {appointment.start_time}
        </Text>
      </View>

      {/* Professional */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <User size={16} color="#6b7280" />
        <Text style={{ marginLeft: 8, fontSize: 14, color: '#6b7280' }}>
          {appointment.professional?.full_name || appointment.professional_name || 'Profissional não informado'}
        </Text>
      </View>

      {/* Salon info */}
      {appointment.salon_name && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <MapPin size={16} color="#6b7280" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#6b7280' }}>
            {appointment.salon_name}
          </Text>
        </View>
      )}

      {/* Observations */}
      {(appointment.notes_by_client || appointment.observations) && (
        <View style={{ 
          backgroundColor: '#f9fafb', 
          borderRadius: 8, 
          padding: 12, 
          marginBottom: 12 
        }}>
          <Text style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>
            Observações: {appointment.notes_by_client || appointment.observations}
          </Text>
        </View>
      )}

      {/* Action buttons for scheduled appointments */}
      {(appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#ef4444',
              padding: 12,
              borderRadius: 8,
              alignItems: 'center'
            }}
            onPress={() => handleCancelAppointment(appointment.id)}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Show loading while authentication is being verified
  if (authLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
        <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
          <View style={{ backgroundColor: '#ec4899', padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Meus Agendamentos
            </Text>
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={{ marginTop: 10, color: '#374151' }}>Verificando autenticação...</Text>
        </View>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
        <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
          <View style={{ backgroundColor: '#ec4899', padding: 16 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
              Meus Agendamentos
            </Text>
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text style={{ marginTop: 10, color: '#374151' }}>Carregando agendamentos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#ec4899' }}>
      {/* Header */}
      <SafeAreaView style={{ backgroundColor: '#ec4899' }}>
        <View style={{ backgroundColor: '#ec4899', padding: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
            Meus Agendamentos
          </Text>
        </View>
      </SafeAreaView>

      {/* Tabs */}
      <View style={{ backgroundColor: '#ec4899', paddingHorizontal: 16, paddingBottom: 16 }}>
        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 4 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: activeTab === 'upcoming' ? 'white' : 'transparent',
              paddingVertical: 8,
              borderRadius: 6,
              alignItems: 'center'
            }}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={{ 
              color: activeTab === 'upcoming' ? '#ec4899' : 'white', 
              fontWeight: '600',
              fontSize: 14
            }}>
              Próximos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: activeTab === 'history' ? 'white' : 'transparent',
              paddingVertical: 8,
              borderRadius: 6,
              alignItems: 'center'
            }}
            onPress={() => setActiveTab('history')}
          >
            <Text style={{ 
              color: activeTab === 'history' ? '#ec4899' : 'white', 
              fontWeight: '600',
              fontSize: 14
            }}>
              Histórico
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1, backgroundColor: 'white' }}>
        {error ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <AlertCircle size={48} color="#ef4444" />
            <Text style={{ color: '#ef4444', textAlign: 'center', marginTop: 16, marginBottom: 10 }}>
              Erro ao carregar agendamentos:
            </Text>
            <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: 20 }}>
              {error}
            </Text>
            <TouchableOpacity 
              onPress={() => loadAppointments()} 
              style={{ 
                paddingVertical: 10, 
                paddingHorizontal: 20, 
                backgroundColor: '#ec4899', 
                borderRadius: 8 
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={{ flex: 1, padding: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {filterAppointments().length === 0 ? (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Calendar size={64} color="#d1d5db" />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#6b7280', marginTop: 16, textAlign: 'center' }}>
                  {activeTab === 'upcoming' ? 'Nenhum agendamento próximo' : 'Nenhum item no histórico'}
                </Text>
                <Text style={{ fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                  {activeTab === 'upcoming' 
                    ? 'Quando você agendar um serviço, ele aparecerá aqui' 
                    : 'Seus agendamentos passados aparecerão aqui'}
                </Text>
              </View>
            ) : (
              filterAppointments().map(renderAppointmentCard)
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default AppointmentsScreen;
