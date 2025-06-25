/**
 * WizardSlotsScreen Component (Web Version)
 * Implements mobile-identical conditional logic: Time Grid (1 service) vs Itinerary Cards (2+ services)
 * Features: Mobile-exact layouts, progressive loading, Brazilian formatting
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Clock, Users, CreditCard, Check } from 'lucide-react';
import { useWizardStore } from '../../stores/wizardStore';
import { getAvailableSlots } from '../../services/wizardApiService';

const WizardSlotsScreen = () => {
  
  const {
    selectedServices,
    selectedDate,
    selectedProfessionals,
    professionalsRequested,
    availableSlots,
    selectedSlot,
    isLoading,
    error,
    setAvailableSlots,
    setSelectedSlot,
    setLoading,
    setError,
    clearError,
    goToNextStep,
    canProceedToStep,
  } = useWizardStore();

  // Mobile behavior: No success messages or button animations - just visual selection feedback

  // Load available slots when component mounts or dependencies change
  useEffect(() => {
    loadAvailableSlots();
  }, [selectedDate, selectedProfessionals]);

  const loadAvailableSlots = useCallback(async () => {
    if (!selectedDate || selectedServices.length === 0 || selectedProfessionals.length === 0) return;

    setLoading(true);
    clearError();

    try {
      const serviceIds = selectedServices.map(service => service.id);
      const professionalIds = selectedProfessionals
        .filter(prof => prof !== null && prof !== undefined)
        .map(prof => prof.id);

      const slots = await getAvailableSlots({
        serviceIds,
        date: selectedDate,
        professionalsRequested,
        professionalIds: professionalIds.length > 0 ? professionalIds : null
      });

      setAvailableSlots(slots);
      
    } catch (err) {
      console.error('[WizardSlotsScreen] Error loading available slots:', err);
      setError('Erro ao carregar horários disponíveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedServices, selectedProfessionals, professionalsRequested, setLoading, clearError, setAvailableSlots, setError]);

  // Handle slot selection (mobile-exact: no auto-advance)
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    // Mobile behavior: No auto-advance - user must manually click continue button
  };

  // Format time for display (Brazilian 24-hour format)
  const formatTime = (timeString) => {
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch (error) {
      return timeString;
    }
  };

  // Format time for grid (just HH:MM)
  const formatTimeForGrid = (timeString) => {
    return formatTime(timeString);
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

  // Calculate service times for itinerary cards
  const calculateServiceTimes = (slot) => {
    if (!slot.services) return [];
    
    return slot.services.map((service, index) => {
      let startTime;
      
      if (slot.execution_type === 'parallel') {
        // All services start at the same time
        startTime = slot.start_time;
      } else {
        // Sequential - calculate cumulative start time
        const previousDurations = slot.services
          .slice(0, index)
          .reduce((total, prev) => total + prev.duration_minutes, 0);
        
        const slotStartDate = new Date(`1970-01-01T${slot.start_time}`);
        slotStartDate.setMinutes(slotStartDate.getMinutes() + previousDurations);
        startTime = slotStartDate.toTimeString().substring(0, 5);
      }
      
      return { ...service, calculated_start_time: startTime };
    });
  };

  // Get unique professional count
  const getUniqueProfessionalCount = (slot) => {
    if (!slot.services) return 0;
    const uniqueProfessionals = new Set(slot.services.map(s => s.professional_id));
    return uniqueProfessionals.size;
  };

  // Render services summary header
  const renderServicesHeader = () => (
    <div className="sticky top-0 bg-white z-10 p-3 border-b border-gray-200">
      <div className="flex overflow-x-auto gap-2 scrollbar-hide">
        {selectedServices.map((service, index) => (
          <div
            key={service.id || index}
            className="relative flex-shrink-0"
          >
            <div className="bg-white border border-gray-200 rounded-full px-2.5 py-1.5 min-w-16">
              <div className="text-center">
                <div className="text-xs font-medium text-gray-800 leading-tight">
                  {service.name}
                </div>
                <div className="text-xs text-gray-500 leading-tight">
                  {formatDuration(service.duration_minutes)}
                </div>
              </div>
            </div>
            
            {/* All services are "covered" at this stage */}
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white text-xs leading-none">✓</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render time grid item for single service (mobile-exact design)
  const renderTimeGridItem = (slot) => {
    const isSelected = selectedSlot?.id === slot.id;
    const isUnavailable = slot.status === 'unavailable';
    
    return (
      <button
        key={slot.id}
        onClick={() => !isUnavailable && handleSlotSelect(slot)}
        disabled={isUnavailable}
        className={`
          w-full min-h-12 rounded-lg border transition-smooth
          flex items-center justify-center px-2 py-3 mb-2
          ${isSelected 
            ? 'bg-pink-500 border-pink-500 text-white' 
            : isUnavailable
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-gray-50 border-gray-300 text-gray-900 hover:bg-gray-100'
          }
        `}
      >
        <span className="text-sm font-medium">
          {formatTimeForGrid(slot.start_time)}
        </span>
      </button>
    );
  };

  // Render time grid for single service (3-column grid) - Show all slots
  const renderTimeGrid = () => {
    return (
      <div className="p-4">
        {/* 3-column grid matching mobile - Show ALL slots for single service */}
        <div className="grid grid-cols-3 gap-2">
          {availableSlots.map(slot => renderTimeGridItem(slot))}
        </div>
      </div>
    );
  };

  // Render itinerary card for multiple services
  const renderItineraryCard = (slot) => {
    const isSelected = selectedSlot?.id === slot.id;
    const servicesWithTimes = calculateServiceTimes(slot);
    const professionalCount = getUniqueProfessionalCount(slot);
    
    return (
      <div
        key={slot.id}
        onClick={() => handleSlotSelect(slot)}
        className={`
          relative m-4 p-4 rounded-xl border cursor-pointer transition-smooth
          ${isSelected 
            ? 'bg-pink-50 border-pink-500 border-2 shadow-lg' 
            : 'bg-white border-gray-200 hover:shadow-md'
          }
        `}
      >
        {/* Header: Time range + duration */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Clock size={16} className={isSelected ? 'text-pink-600' : 'text-gray-500'} />
            <span className={`font-medium ${isSelected ? 'text-pink-900' : 'text-gray-900'}`}>
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </span>
            <span className={`text-sm ${isSelected ? 'text-pink-700' : 'text-gray-600'}`}>
              • Total {formatDuration(slot.total_duration_minutes)}
            </span>
          </div>
        </div>

        {/* Summary: Professionals + Price */}
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-center space-x-1">
            <Users size={14} className={isSelected ? 'text-pink-600' : 'text-gray-500'} />
            <span className={`text-sm ${isSelected ? 'text-pink-700' : 'text-gray-600'}`}>
              {professionalCount} profissional{professionalCount > 1 ? 'is' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <CreditCard size={14} className={isSelected ? 'text-pink-600' : 'text-gray-500'} />
            <span className={`text-sm font-semibold ${isSelected ? 'text-pink-900' : 'text-gray-900'}`}>
              {formatPrice(slot.total_price)}
            </span>
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-2 mb-3">
          {servicesWithTimes.map((service, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex-1">
                <span className={`font-medium ${isSelected ? 'text-pink-800' : 'text-gray-800'}`}>
                  {service.calculated_start_time}
                </span>
                <span className={`ml-2 ${isSelected ? 'text-pink-700' : 'text-gray-700'}`}>
                  {service.service_name}
                </span>
              </div>
              <span className={`text-xs ${isSelected ? 'text-pink-600' : 'text-gray-500'}`}>
                {service.professional_name}
              </span>
            </div>
          ))}
        </div>

        {/* Execution Type */}
        <div className="flex items-center space-x-2">
          <span className={`text-lg ${isSelected ? 'text-pink-600' : 'text-gray-500'}`}>
            {slot.execution_type === 'parallel' ? '║' : '↧'}
          </span>
          <span className={`text-xs font-medium ${isSelected ? 'text-pink-700' : 'text-gray-600'}`}>
            {slot.execution_type === 'parallel' ? 'Paralelo' : 'Sequencial'}
          </span>
        </div>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <Check size={14} className="text-white" />
          </div>
        )}
      </div>
    );
  };

  // Render itinerary slots list for multiple services - Show all slots
  const renderItinerarySlots = () => {
    return (
      <div>
        {availableSlots.map(slot => renderItineraryCard(slot))}
      </div>
    );
  };

  // Mobile behavior: No success snackbar - only visual selection feedback

  // Render loading state
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 size={32} className="spinner text-pink-500 mb-4" />
      <p className="text-gray-600">Carregando horários disponíveis...</p>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="text-center py-16">
      <p className="text-red-600 mb-4">{error}</p>
      <button
        onClick={loadAvailableSlots}
        className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
      >
        Tentar novamente
      </button>
    </div>
  );

  // Render empty state
  const renderEmptyState = () => (
    <div className="text-center py-16">
      <Clock size={48} className="text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600 mb-2">Nenhum horário disponível</p>
      <p className="text-sm text-gray-500">
        Tente selecionar uma data diferente ou outros profissionais
      </p>
    </div>
  );

  // Render continue button (mobile-exact: "Confirmar Horário")
  const renderContinueButton = () => {
    const canContinue = selectedSlot !== null;
    
    return (
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={() => {
            if (canContinue) {
              goToNextStep();
            }
          }}
          disabled={!canContinue}
          className={`w-full py-4 rounded-xl font-semibold transition-smooth ${
            canContinue
              ? 'bg-pink-500 text-white hover:bg-pink-600'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {canContinue ? 'Confirmar Horário' : 'Selecione um horário'}
        </button>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Services Header */}
      {renderServicesHeader()}
      
      {/* Main Content - Conditional Layout (Mobile-Exact Logic) */}
      <div className="flex-1 overflow-y-auto pb-32">
        {isLoading ? (
          renderLoadingState()
        ) : error ? (
          renderErrorState()
        ) : availableSlots.length === 0 ? (
          renderEmptyState()
        ) : (
          // CRITICAL: Mobile-exact conditional logic
          selectedServices.length === 1 ? renderTimeGrid() : renderItinerarySlots()
        )}
      </div>
      
      {/* Continue Button */}
      {renderContinueButton()}
      
      {/* Custom Styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default WizardSlotsScreen;