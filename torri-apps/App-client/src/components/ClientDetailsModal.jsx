/**
 * ClientDetailsModal Component
 * Modern client details modal inspired by Uber/Airbnb design patterns
 * Features: Smooth animations, comprehensive client info, appointment history
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Star, 
  Clock, 
  MessageCircle,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { getAppointmentDetails, getClientInfo, getClientAppointmentHistory } from '../services/appointmentService';

const ClientDetailsModal = ({ isOpen, onClose, appointmentId }) => {
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [appointmentHistory, setAppointmentHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('info');
  const [error, setError] = useState(null);

  // Load client data when modal opens
  useEffect(() => {
    if (isOpen && appointmentId) {
      loadClientData();
    }
  }, [isOpen, appointmentId]);

  const loadClientData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Debug: Log current user info for troubleshooting
      const { useAuthStore } = await import('../stores/authStore');
      const currentUser = useAuthStore.getState().user;
      
      // Get appointment details first
      const appointmentData = await getAppointmentDetails(appointmentId);
      setAppointmentDetails(appointmentData);
      
      if (appointmentData?.client?.id) {
        // Get full client info and history in parallel
        
        try {
          const clientInfo = await getClientInfo(appointmentData.client.id);
          setClientData(clientInfo);
        } catch (clientError) {
          setClientData(appointmentData.client);
        }
        
        try {
          const history = await getClientAppointmentHistory(appointmentData.client.id);
          setAppointmentHistory(history);
        } catch (historyError) {
          setAppointmentHistory([]);
        }
      } else if (appointmentData?.client) {
        // Use basic client info from appointment if detailed lookup fails
        setClientData(appointmentData.client);
        // Try to get history with basic client data
        try {
          const history = await getClientAppointmentHistory(appointmentData.client.id);
          setAppointmentHistory(history);
        } catch (historyError) {
          setAppointmentHistory([]);
        }
      }
    } catch (err) {
      setError('Não foi possível carregar os dados do cliente');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format phone number
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Get status color and icon
  const getStatusInfo = (status) => {
    const statusMap = {
      'SCHEDULED': { color: 'text-blue-600 bg-blue-50', icon: Calendar, label: 'Agendado' },
      'CONFIRMED': { color: 'text-green-600 bg-green-50', icon: CheckCircle, label: 'Confirmado' },
      'IN_PROGRESS': { color: 'text-amber-600 bg-amber-50', icon: Clock, label: 'Em Andamento' },
      'COMPLETED': { color: 'text-gray-600 bg-gray-50', icon: CheckCircle, label: 'Concluído' },
      'CANCELLED': { color: 'text-red-600 bg-red-50', icon: XCircle, label: 'Cancelado' }
    };
    return statusMap[status] || statusMap['SCHEDULED'];
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Loader2 className="animate-spin h-8 w-8 text-pink-500 mx-auto mb-4" />
        <p className="text-gray-500">Carregando dados do cliente...</p>
      </div>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
        <p className="text-gray-500">{error}</p>
        <button
          onClick={loadClientData}
          className="mt-4 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );

  // Render client info tab
  const renderClientInfo = () => (
    <div className="space-y-6">
      {/* Client Profile Header */}
      <div className="text-center pb-6 border-b border-gray-100">
        <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-white">
            {clientData?.full_name?.charAt(0)?.toUpperCase() || 'C'}
          </span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          {clientData?.full_name || clientData?.name || 'Cliente'}
        </h2>
        <p className="text-gray-500 text-sm">
          {calculateAge(clientData?.date_of_birth) && `${calculateAge(clientData?.date_of_birth)} anos`}
        </p>
      </div>

      {/* Client Details */}
      <div className="space-y-4">
        {/* Phone */}
        {(clientData?.phone_number || clientData?.phone) && (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Phone size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Telefone</p>
              <p className="font-medium text-gray-900">{formatPhoneNumber(clientData.phone_number || clientData.phone)}</p>
            </div>
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* Date of Birth */}
        {clientData?.date_of_birth && (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar size={18} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Data de Nascimento</p>
              <p className="font-medium text-gray-900">{formatDate(clientData.date_of_birth)}</p>
            </div>
          </div>
        )}

        {/* Address */}
        {clientData?.address && (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin size={18} className="text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Endereço</p>
              <p className="font-medium text-gray-900">{clientData.address}</p>
            </div>
          </div>
        )}

        {/* Email */}
        {clientData?.email && (
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <User size={18} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{clientData.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Current Appointment Notes */}
      {(appointmentDetails?.notes_by_client || appointmentDetails?.notes_by_professional) && (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <MessageCircle size={16} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-2">Observações do Agendamento</h3>
              {appointmentDetails.notes_by_client && (
                <div className="mb-2">
                  <p className="text-xs text-blue-600 font-medium">Cliente:</p>
                  <p className="text-blue-800 text-sm leading-relaxed">{appointmentDetails.notes_by_client}</p>
                </div>
              )}
              {appointmentDetails.notes_by_professional && (
                <div>
                  <p className="text-xs text-blue-600 font-medium">Profissional:</p>
                  <p className="text-blue-800 text-sm leading-relaxed">{appointmentDetails.notes_by_professional}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render appointment history tab
  const renderAppointmentHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Histórico de Agendamentos</h3>
        <span className="text-sm text-gray-500">
          {appointmentHistory.length} agendamento{appointmentHistory.length !== 1 ? 's' : ''}
        </span>
      </div>

      {appointmentHistory.length === 0 ? (
        <div className="text-center py-8">
          <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">Nenhum agendamento anterior encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointmentHistory.map((appointment, index) => {
            const statusInfo = getStatusInfo(appointment.status);
            const StatusIcon = statusInfo.icon;
            
            return (
              <div
                key={appointment.id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900">
                        {appointment.service?.name || 'Serviço'}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        <StatusIcon size={12} className="mr-1" />
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(appointment.appointment_date)} às {appointment.start_time}
                    </p>
                    {appointment.professional?.full_name && (
                      <p className="text-sm text-gray-500">
                        com {appointment.professional.full_name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {appointment.price_at_booking && (
                      <p className="font-semibold text-gray-900">
                        R$ {Number(appointment.price_at_booking).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                
                {(appointment.notes_by_client || appointment.notes_by_professional) && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    {appointment.notes_by_client && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 font-medium">Observações do Cliente:</p>
                        <p className="text-sm text-gray-600">{appointment.notes_by_client}</p>
                      </div>
                    )}
                    {appointment.notes_by_professional && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Observações do Profissional:</p>
                        <p className="text-sm text-gray-600">{appointment.notes_by_professional}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl transform transition-transform max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Detalhes do Cliente</h1>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Informações
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-pink-500 text-pink-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Histórico
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? renderLoading() : error ? renderError() : (
            activeTab === 'info' ? renderClientInfo() : renderAppointmentHistory()
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;