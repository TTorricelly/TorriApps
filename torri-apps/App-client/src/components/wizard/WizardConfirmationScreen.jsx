/**
 * WizardConfirmationScreen Component (Web Version)
 * Step 4: Final confirmation with booking summary, client notes, and booking submission
 * Features: Mobile-exact layout, booking validation, success screen, Brazilian formatting
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, Clock, User, CreditCard, MessageSquare, CheckCircle, Loader2, Users } from 'lucide-react';
import { useWizardStore } from '../../stores/wizardStore';
import { useAuthStore } from '../../stores/authStore';
import useServicesStore from '../../stores/servicesStore';
import { createMultiServiceBooking, buildBookingRequest } from '../../services/wizardApiService';
import { createClient } from '../../services/clientService';
import { ROUTES } from '../../shared/navigation';

const WizardConfirmationScreen = ({ onAppointmentCreated }) => {
  const navigate = useNavigate();
  const { tenantSlug } = useParams();
  const [clientNotes, setClientNotes] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [confirmedBookingData, setConfirmedBookingData] = useState(null);
  const [error, setError] = useState(null);

  const {
    clientData,
    selectedServices,
    selectedDate,
    selectedSlot,
    selectedProfessionals,
    professionalsRequested,
    setCurrentStep,
    goToPreviousStep,
    resetWizard,
    mode,
    isClientMode,
  } = useWizardStore();

  const { user } = useAuthStore();
  const { clearServices } = useServicesStore();

  // Set current step on mount (mobile behavior)
  useEffect(() => {
    setCurrentStep(6);
  }, [setCurrentStep, selectedServices, selectedDate, selectedSlot, user]);

  const maxNotesLength = 500;

  // Format date (Brazilian format - mobile exact)
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit', // Mobile uses '2-digit' not 'numeric'
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Format time (Brazilian 24-hour format)
  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch (error) {
      return timeString;
    }
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null || minutes <= 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Calculate service times for display
  const calculateServiceTimes = () => {
    if (!selectedSlot?.services) return [];
    
    return selectedSlot.services.map((service, index) => {
      let startTime;
      
      if (selectedSlot.execution_type === 'parallel') {
        startTime = selectedSlot.start_time;
      } else {
        const previousDurations = selectedSlot.services
          .slice(0, index)
          .reduce((total, prev) => total + prev.duration_minutes, 0);
        
        const slotStartDate = new Date(`1970-01-01T${selectedSlot.start_time}`);
        slotStartDate.setMinutes(slotStartDate.getMinutes() + previousDurations);
        startTime = slotStartDate.toTimeString().substring(0, 5);
      }
      
      return { ...service, calculated_start_time: startTime };
    });
  };

  // Handle booking confirmation
  const handleConfirmBooking = useCallback(async () => {
    if (!selectedSlot) {
      alert('Erro: Nenhum horário selecionado.');
      return;
    }

    if (!clientData.id && !clientData.name.trim()) {
      alert('Erro: Nenhum cliente selecionado.');
      return;
    }

    if (!user?.id) {
      alert('Erro: Usuário não autenticado.');
      return;
    }

    setIsBooking(true);
    setError(null);

    try {
      let clientId = clientData.id;

      // Create new client if needed
      if (!clientId && clientData.isNewClient && clientData.name.trim()) {
        
        const newClientData = {
          full_name: clientData.name.trim(),
          nickname: clientData.nickname?.trim() || null,
          phone: clientData.phone?.trim() || null,
          email: clientData.email?.trim() || null,
          cpf: clientData.cpf?.replace(/\D/g, '') || null,
          address_cep: clientData.address_cep?.replace(/\D/g, '') || null,
          address_street: clientData.address_street?.trim() || null,
          address_number: clientData.address_number?.trim() || null,
          address_complement: clientData.address_complement?.trim() || null,
          address_neighborhood: clientData.address_neighborhood?.trim() || null,
          address_city: clientData.address_city?.trim() || null,
          address_state: clientData.address_state?.trim() || null,
        };

        const newClient = await createClient(newClientData);
        clientId = newClient.id;
      }

      if (!clientId) {
        alert('Erro: Não foi possível identificar o cliente.');
        return;
      }


      const bookingRequest = buildBookingRequest(
        clientId,
        selectedDate,
        selectedSlot,
        clientNotes.trim() || null
      );


      const result = await createMultiServiceBooking(bookingRequest);

      // Store booking data before clearing wizard state
      setConfirmedBookingData({
        selectedServices,
        selectedDate,
        selectedSlot,
      });
      
      // Show success screen (keep wizard state until user clicks "Concluir")
      setBookingConfirmed(true);
      
      // Clear the original service cart/checkout (mobile behavior)
      clearServices();
      
      // Clear local state
      setClientNotes('');
      
      // Call the callback to refresh agenda data
      if (onAppointmentCreated) {
        onAppointmentCreated();
      }
      
    } catch (error) {
      
      // Mobile uses Alert.alert for booking errors - make it prominent
      alert('Erro no Agendamento\n\nNão foi possível confirmar o agendamento. Tente novamente.');
    } finally {
      setIsBooking(false);
    }
  }, [selectedSlot, user, selectedDate, clientNotes, selectedServices, clientData, resetWizard]);

  // Get unique professional count
  const getUniqueProfessionalCount = () => {
    if (!selectedSlot?.services) return 0;
    const uniqueProfessionals = new Set(selectedSlot.services.map(s => s.professional_id));
    return uniqueProfessionals.size;
  };

  // Render client summary card
  const renderClientCard = () => (
    <div className="bg-white rounded-xl border border-gray-200 mb-4 shadow-sm">
      <div className="flex items-center p-4">
        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
          <span className="text-sm">👤</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Cliente</h3>
          <p className="font-medium text-gray-900 mb-1">
            {clientData.name || 'Cliente não identificado'}
          </p>
          <div className="space-y-1">
            {clientData.phone && (
              <p className="text-sm text-gray-500">{clientData.phone}</p>
            )}
            {clientData.email && (
              <p className="text-sm text-gray-500">{clientData.email}</p>
            )}
            {clientData.isNewClient && (
              <div className="inline-block bg-green-100 px-2 py-1 rounded-md">
                <span className="text-xs font-medium text-green-800">Novo Cliente</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render date/time summary card (mobile-exact compact design)
  const renderDateTimeCard = () => (
    <div className="bg-white rounded-xl border border-gray-200 mb-4 shadow-sm">
      <div className="flex items-center p-4">
        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
          <span className="text-sm">📅</span>
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-[15px] capitalize mb-1">
            {formatDate(selectedDate)}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-pink-500">
              {formatTime(selectedSlot?.start_time || '')} - {formatTime(selectedSlot?.end_time || '')}
            </span>
            <div className="bg-gray-100 px-2 py-1 rounded-md">
              <span className="text-xs font-medium text-gray-600">
                {formatDuration(selectedSlot?.total_duration_minutes || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render services summary (mobile-exact layout)
  const renderServicesCard = () => {
    const servicesWithTimes = calculateServiceTimes();
    const professionalCount = getUniqueProfessionalCount();

    return (
      <div className="bg-white rounded-xl border border-gray-200 mb-4 shadow-sm">
        {/* Header with parallel badge */}
        <div className="flex items-center px-4 pt-4 pb-2">
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
            <span className="text-sm">💼</span>
          </div>
          <h3 className="font-semibold text-gray-900 flex-1">Serviços</h3>
          {selectedSlot?.execution_type === 'parallel' && (
            <div className="bg-yellow-100 px-2 py-1 rounded-md">
              <span className="text-xs font-medium text-yellow-800">⚡</span>
            </div>
          )}
        </div>
        
        {/* Services content */}
        <div className="px-4 pb-4">
          {servicesWithTimes.length > 0 ? (
            servicesWithTimes.map((service, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 mb-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-1 mr-3">
                  <h4 className="font-medium text-gray-900 mb-1">{service.service_name}</h4>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {formatDuration(service.duration_minutes)}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      {formatPrice(parseFloat(service.price))}
                    </span>
                  </div>
                </div>
                
                {/* Professional assignment with avatar */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">
                      {(service.professional_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {service.professional_name}
                  </span>
                </div>
              </div>
            ))
          ) : (
            // Fallback for when service assignments aren't available (mobile behavior)
            selectedServices.map((service, index) => (
              <div key={index} className="flex items-center justify-between py-3 px-4 mb-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-1 mr-3">
                  <h4 className="font-medium text-gray-900 mb-1">{service.name}</h4>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {formatDuration(service.duration_minutes)}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      {formatPrice(parseFloat(service.price))}
                    </span>
                  </div>
                </div>
                
                {/* Fallback professional assignment */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-600">
                    Atribuição automática
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Render client notes section (mobile-exact compact design)
  const renderClientNotesCard = () => (
    <div className="bg-white rounded-xl border border-gray-200 mb-4 shadow-sm">
      <div className="flex items-center px-4 pt-4 pb-2">
        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center mr-3">
          <span className="text-sm">📝</span>
        </div>
        <h3 className="font-semibold text-gray-900 flex-1">Observações</h3>
        <span className="text-xs text-gray-500 italic">(opcional)</span>
      </div>
      
      <div className="px-4 pb-4">
        <textarea
          value={clientNotes}
          onChange={(e) => setClientNotes(e.target.value)}
          placeholder="Alergias, preferências ou observações especiais..."
          maxLength={maxNotesLength}
          className="w-full h-[70px] px-3 py-2 border border-gray-300 rounded-lg resize-none text-sm bg-gray-50 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 placeholder-gray-500"
        />
        <span className="text-xs text-gray-500 float-right mt-1">
          {clientNotes.length}/{maxNotesLength}
        </span>
      </div>
    </div>
  );

  // Render important information card (mobile-exact layout)
  const renderImportantInfoCard = () => (
    <div className="bg-blue-50 rounded-xl border border-blue-200 mb-6">
      <div className="flex items-center px-5 pt-5 pb-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
          <span className="text-base">ℹ️</span>
        </div>
        <h3 className="font-semibold text-blue-900">Informações Importantes</h3>
      </div>
      
      <div className="px-5 pb-5 space-y-3">
        <div className="flex items-start space-x-3">
          <span className="text-base mt-0.5">🕐</span>
          <span className="text-sm text-blue-800 leading-5">Chegue com 10 minutos de antecedência</span>
        </div>
        
        <div className="flex items-start space-x-3">
          <span className="text-base mt-0.5">📞</span>
          <span className="text-sm text-blue-800 leading-5">Cancelamentos com 24h de antecedência</span>
        </div>
        
        <div className="flex items-start space-x-3">
          <span className="text-base mt-0.5">⏰</span>
          <span className="text-sm text-blue-800 leading-5">Atrasos de 15+ min podem ser reagendados</span>
        </div>
      </div>
    </div>
  );


  // Render booking button (mobile-exact layout)
  const renderBookingButton = () => {
    const totalPrice = selectedSlot?.total_price || 0;
    
    return (
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <button
          onClick={handleConfirmBooking}
          disabled={isBooking}
          className={`w-full py-[18px] px-6 rounded-2xl font-semibold shadow-lg transition-smooth flex items-center justify-center ${
            isBooking
              ? 'bg-gray-300 text-white cursor-not-allowed shadow-none'
              : 'bg-pink-500 text-white hover:bg-pink-600 shadow-pink-500/30'
          }`}
        >
          {isBooking ? (
            <div className="flex items-center space-x-2">
              <Loader2 size={16} className="spinner" />
              <span className="font-semibold">Confirmando...</span>
            </div>
          ) : (
            <div className="text-center">
              <div className="font-semibold">Confirmar Agendamento</div>
              <div className="text-xl font-bold">{formatPrice(totalPrice)}</div>
            </div>
          )}
        </button>
      </div>
    );
  };

  // Render success screen (mobile-exact design - full screen)
  const renderSuccessScreen = () => (
    <div className="min-h-screen h-full overflow-y-auto">
      <div className="flex flex-col px-6 pt-6 pb-40 min-h-screen">
        {/* Success header */}
        <div className="text-center mb-6 mt-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-[28px] font-bold text-gray-900 mb-2 leading-8">
            Agendamento Confirmado!
          </h2>
        </div>

        {/* Booking summary card - compact design */}
        {confirmedBookingData && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-md">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">📅 Data</span>
                <span className="text-sm font-medium text-gray-900 text-right capitalize">
                  {formatDate(confirmedBookingData.selectedDate)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">🕐 Horário</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatTime(confirmedBookingData.selectedSlot?.start_time || '')} - {formatTime(confirmedBookingData.selectedSlot?.end_time || '')}
                </span>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm text-gray-600">💼 Serviços</span>
                <div className="flex flex-wrap gap-1.5">
                  {confirmedBookingData.selectedServices.map((service, index) => (
                    <div key={index} className="bg-pink-50 border border-pink-500 rounded-xl px-2.5 py-1">
                      <span className="text-xs font-medium text-pink-500">{service.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="h-px bg-gray-200 my-2"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-green-500">
                  {formatPrice(confirmedBookingData.selectedSlot?.total_price || 0)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed footer button - positioned above nav bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-100 p-6 pb-8">
        <button
          onClick={() => {
            // Reset wizard state when user completes the flow
            resetWizard();
            
            // Navigate based on mode with tenant slug
            if (isClientMode()) {
              // Client mode: navigate to appointments page (meus agendamentos)
              const appointmentsPath = `/${tenantSlug}/appointments`;
              navigate(appointmentsPath);
            } else {
              // Professional mode: navigate to professional agenda
              const agendaPath = `/${tenantSlug}/professional/agenda`;
              navigate(agendaPath);
            }
          }}
          className="w-full py-[18px] bg-green-500 text-white rounded-2xl font-semibold text-base shadow-lg hover:bg-green-600 transition-smooth"
        >
          Concluir
        </button>
      </div>
    </div>
  );

  // Show success screen if booking is confirmed (full-page overlay like mobile)
  if (bookingConfirmed) {
    return (
      <div className="fixed inset-0 z-[60] bg-gray-50">
        {renderSuccessScreen()}
      </div>
    );
  }

  // Check if we have the required data to show confirmation screen
  if (!selectedSlot && !bookingConfirmed) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum horário selecionado</h3>
          <p className="text-gray-600 mb-4">Volte à tela anterior para selecionar um horário.</p>
          <button
            onClick={() => goToPreviousStep()}
            className="px-6 py-3 bg-pink-500 text-white rounded-xl font-semibold hover:bg-pink-600"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 py-4">
          {renderClientCard()}
          {renderDateTimeCard()}
          {renderServicesCard()}
          {renderClientNotesCard()}
          {renderImportantInfoCard()}
          
          {/* Bottom spacing for better scroll experience */}
          <div className="h-5"></div>
        </div>
      </div>
      
      {/* Booking Button */}
      {renderBookingButton()}
      
      {/* Custom Styles */}
      <style>{`
        .transition-smooth {
          transition: all 0.2s ease-in-out;
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default WizardConfirmationScreen;