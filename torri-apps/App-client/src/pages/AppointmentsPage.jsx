/**
 * AppointmentsPage Component (Web Version)
 * Maintains identical functionality from Mobile-client-core AppointmentsScreen.tsx
 * Features: Tab navigation, appointment cards, status indicators, pull-to-refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';
import BottomNavigation from '../components/BottomNavigation';
import { 
  Calendar, 
  Clock, 
  User, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  Calendar as CalendarIcon,
  MapPin
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { getUserAppointments, cancelAppointment } from '../services/appointmentService';

const AppointmentsPage = () => {
  const { navigate } = useNavigation();
  const { user, isAuthenticated } = useAuthStore();
  
  // State management (mobile-exact)
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'history'

  // Load appointments on mount and auth changes
  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    }
  }, [isAuthenticated]);

  // Load appointments function
  const loadAppointments = useCallback(async () => {
    try {
      setError(null);
      const data = await getUserAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('[AppointmentsPage] Error loading appointments:', err);
      setError('Erro ao carregar agendamentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, [loadAppointments]);

  // Mobile-exact appointment filtering logic
  const isUpcomingAppointment = (appointment) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointmentDate = new Date(appointment.appointment_date);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const isScheduledOrConfirmed = ['SCHEDULED', 'CONFIRMED'].includes(appointment.status);
    const isTodayOrFuture = appointmentDate >= today;
    
    return isScheduledOrConfirmed && isTodayOrFuture;
  };

  // Filter appointments based on active tab
  const filteredAppointments = appointments.filter(appointment => {
    return activeTab === 'upcoming' 
      ? isUpcomingAppointment(appointment)
      : !isUpcomingAppointment(appointment);
  });

  // Format date (Brazilian format)
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format time
  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch (error) {
      return timeString;
    }
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Get status display info (mobile-exact)
  const getStatusInfo = (status) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', text: 'Confirmado' };
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', text: 'Concluído' };
      case 'CANCELLED':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', text: 'Cancelado' };
      case 'NO_SHOW':
        return { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', text: 'Faltou' };
      case 'IN_PROGRESS':
        return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', text: 'Em Andamento' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', text: status };
    }
  };

  // Handle appointment cancellation
  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return;
    }

    try {
      await cancelAppointment(appointmentId);
      await loadAppointments(); // Reload appointments
      alert('Agendamento cancelado com sucesso!');
    } catch (error) {
      console.error('[AppointmentsPage] Error cancelling appointment:', error);
      alert('Erro ao cancelar agendamento. Tente novamente.');
    }
  };

  // Render appointment card (mobile-exact layout)
  const renderAppointmentCard = (appointment) => {
    const statusInfo = getStatusInfo(appointment.status);
    const StatusIcon = statusInfo.icon;
    const isUpcoming = isUpcomingAppointment(appointment);

    return (
      <div 
        key={appointment.id} 
        className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm"
      >
        {/* Header with service name and status */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex-1">
            {appointment.service?.name || appointment.service_name}
          </h3>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusInfo.bg}`}>
            <StatusIcon size={12} className={statusInfo.color} />
            <span className={`text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
          </div>
        </div>

        {/* Professional name */}
        <div className="flex items-center space-x-2 mb-2">
          <User size={14} className="text-gray-500" />
          <span className="text-sm text-gray-700">
            {appointment.professional?.full_name || appointment.professional_name}
          </span>
        </div>

        {/* Date and time */}
        <div className="flex items-center space-x-4 mb-2">
          <div className="flex items-center space-x-1">
            <CalendarIcon size={14} className="text-gray-500" />
            <span className="text-sm text-gray-700 capitalize">
              {formatDate(appointment.appointment_date)}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={14} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-900">
              {formatTime(appointment.start_time)}
            </span>
            {appointment.duration_minutes && (
              <span className="text-xs text-gray-500">
                • {appointment.duration_minutes}min
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        {appointment.price && (
          <div className="mb-3">
            <span className="text-sm font-semibold text-green-600">
              {formatPrice(appointment.price)}
            </span>
          </div>
        )}

        {/* Client notes */}
        {appointment.notes_by_client && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500">Observações:</span>
            <p className="text-sm text-gray-700 mt-1">{appointment.notes_by_client}</p>
          </div>
        )}

        {/* Action buttons for upcoming appointments */}
        {isUpcoming && (
          <div className="flex space-x-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => handleCancelAppointment(appointment.id)}
              className="flex-1 py-2 px-4 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-smooth"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render tab navigation
  const renderTabNavigation = () => (
    <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
      <button
        onClick={() => setActiveTab('upcoming')}
        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-smooth ${
          activeTab === 'upcoming'
            ? 'bg-white text-pink-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Próximos
      </button>
      <button
        onClick={() => setActiveTab('history')}
        className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-smooth ${
          activeTab === 'history'
            ? 'bg-white text-pink-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        Histórico
      </button>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="text-center py-12">
      <Calendar size={48} className="text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        {activeTab === 'upcoming' 
          ? 'Nenhum agendamento próximo' 
          : 'Nenhum histórico encontrado'
        }
      </h3>
      <p className="text-gray-500 mb-6">
        {activeTab === 'upcoming'
          ? 'Você não possui agendamentos futuros. Que tal marcar um horário?'
          : 'Você ainda não possui histórico de agendamentos.'
        }
      </p>
      {activeTab === 'upcoming' && (
        <button 
          onClick={() => navigate(ROUTES.SERVICES)}
          className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
        >
          Agendar Serviço
        </button>
      )}
    </div>
  );

  // Render loading state
  const renderLoadingState = () => (
    <div className="text-center py-12">
      <RefreshCw size={32} className="text-gray-400 mx-auto mb-4 animate-spin" />
      <p className="text-gray-600">Carregando agendamentos...</p>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="text-center py-12">
      <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Erro ao carregar</h3>
      <p className="text-gray-500 mb-6">{error}</p>
      <button
        onClick={loadAppointments}
        className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
      >
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto mobile-scroll">
          {/* Header */}
          <div className="safe-area-top bg-pink-500 px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Meus Agendamentos</h1>
                <p className="text-pink-100">Seus compromissos e histórico</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-full bg-pink-400 hover:bg-pink-300 transition-smooth"
              >
                <RefreshCw 
                  size={20} 
                  className={`text-white ${refreshing ? 'animate-spin' : ''}`} 
                />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-t-3xl -mt-4 px-6 py-8 min-h-0">
            {renderTabNavigation()}
            
            {isLoading ? (
              renderLoadingState()
            ) : error ? (
              renderErrorState()
            ) : filteredAppointments.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map(renderAppointmentCard)}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default AppointmentsPage;