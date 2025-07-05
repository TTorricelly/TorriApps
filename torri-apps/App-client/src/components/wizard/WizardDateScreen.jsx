/**
 * WizardDateScreen Component (Web Version)
 * Maintains identical business logic from Mobile-client-core SchedulingWizardDateScreen.tsx
 * Features: Calendar with availability dots, services summary, auto-advance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import { Loader2 } from 'lucide-react';
import { useWizardStore } from '../../stores/wizardStore';
import { getAvailableDatesForCalendar } from '../../services/wizardApiService';
import 'react-calendar/dist/Calendar.css';

const WizardDateScreen = () => {
  const navigate = useNavigate();
  
  const {
    selectedServices,
    selectedDate,
    availableDates,
    currentMonth,
    isLoading,
    error,
    setSelectedDate,
    setAvailableDates,
    setCurrentMonth,
    setLoading,
    setError,
    clearError,
    canProceedToStep,
    goToNextStep,
    getTotalEstimatedTime
  } = useWizardStore();

  const [calendarValue, setCalendarValue] = useState(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  // Format duration (identical to mobile)
  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null || minutes <= 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
  };

  // Load available dates for calendar month
  const loadAvailableDates = useCallback(async (year, month) => {
    if (selectedServices.length === 0) return;

    setLoading(true);
    clearError();

    try {
      const serviceIds = selectedServices.map(service => service.id);
      const dates = await getAvailableDatesForCalendar(serviceIds, year, month);
      setAvailableDates(dates);
      setCurrentMonth({ year, month });
    } catch (err) {
      console.error('[WizardDateScreen] Error loading available dates:', err);
      setError('Erro ao carregar datas disponíveis. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [selectedServices, setLoading, clearError, setAvailableDates, setCurrentMonth, setError]);

  // Load dates when component mounts or month changes
  useEffect(() => {
    const now = new Date();
    loadAvailableDates(now.getFullYear(), now.getMonth() + 1);
  }, [loadAvailableDates]);

  // Handle calendar month change
  const handleActiveStartDateChange = ({ activeStartDate }) => {
    const year = activeStartDate.getFullYear();
    const month = activeStartDate.getMonth() + 1;
    
    if (year !== currentMonth.year || month !== currentMonth.month) {
      loadAvailableDates(year, month);
    }
  };

  // Handle date selection
  const handleDateSelect = useCallback((date) => {
    const dateString = date.toISOString().split('T')[0];

    if (!availableDates.includes(dateString)) {
      // Show unavailability feedback
      alert('Não há horários disponíveis para os serviços escolhidos nesta data.');
      return;
    }

    setSelectedDate(dateString);
    setCalendarValue(date);

    // Auto-advance to next step after 500ms delay (identical to mobile)
    setTimeout(() => {
      if (canProceedToStep(2)) {
        goToNextStep();
        // TODO: Navigate to next step when implemented
        // navigate('/scheduling-wizard?step=2');
      }
    }, 500);
  }, [availableDates, setSelectedDate, canProceedToStep, goToNextStep]);

  // Calendar tile content - add dots for availability
  const tileContent = ({ date, view }) => {
    if (view !== 'month') return null;
    
    const dateString = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Don't show dots for past dates
    if (dateString < today) return null;
    
    const isAvailable = availableDates.includes(dateString);
    
    return (
      <div className="flex justify-center mt-1">
        <div 
          className={`w-2 h-2 rounded-full ${
            isAvailable ? 'bg-pink-500' : 'bg-gray-300'
          }`}
        />
      </div>
    );
  };

  // Calendar tile class name - highlight selected date
  const tileClassName = ({ date, view }) => {
    if (view !== 'month') return '';
    
    const dateString = date.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Past dates
    if (dateString < today) {
      return 'past-date';
    }
    
    // Selected date
    if (dateString === selectedDate) {
      return 'selected-date';
    }
    
    // Available dates
    if (availableDates.includes(dateString)) {
      return 'available-date';
    }
    
    // Unavailable dates
    return 'unavailable-date';
  };

  // Render services summary (just the chips)
  const renderServicesSummary = () => (
    <div className="bg-gray-50 rounded-lg p-3 mb-3">
      {/* Horizontal scrolling chips */}
      <div className="flex overflow-x-auto gap-2 scrollbar-hide">
        {selectedServices.map((service, index) => (
          <div
            key={service.id || index}
            className="flex-shrink-0 bg-white border border-gray-200 rounded-full px-3 py-2 min-w-20"
          >
            <div className="text-center">
              <div className="text-xs font-medium text-gray-800 mb-0.5">
                {service.name}
              </div>
              <div className="text-xs text-gray-500">
                {formatDuration(service.duration_minutes)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render loading state
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 size={32} className="spinner text-pink-500 mb-4" />
      <p className="text-gray-600">Carregando datas disponíveis...</p>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="text-center py-16">
      <p className="text-red-600 mb-4">{error}</p>
      <button
        onClick={() => {
          const now = new Date();
          loadAvailableDates(now.getFullYear(), now.getMonth() + 1);
        }}
        className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
      >
        Tentar novamente
      </button>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto mobile-scroll">
      <div className="p-4 pb-8">
        {/* Services Summary */}
        {renderServicesSummary()}

        {/* Calendar Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {isLoading ? (
            renderLoadingState()
          ) : error ? (
            renderErrorState()
          ) : (
            <div className="calendar-container">
              <Calendar
                onChange={handleDateSelect}
                value={calendarValue}
                onActiveStartDateChange={handleActiveStartDateChange}
                tileContent={tileContent}
                tileClassName={tileClassName}
                minDate={new Date()}
                maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 90 days ahead
                locale="pt-BR"
                next2Label={null}
                prev2Label={null}
                showNeighboringMonth={false}
                className="wizard-calendar"
              />
            </div>
          )}
        </div>

        {/* Selected Date Display */}
        {selectedDate && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-800 font-medium">
              Data selecionada: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>

      {/* Calendar Custom Styles */}
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .calendar-container .wizard-calendar {
          border: none;
          border-radius: 12px;
          font-family: inherit;
        }
        
        .calendar-container .react-calendar__navigation {
          margin-bottom: 1rem;
        }
        
        .calendar-container .react-calendar__navigation button {
          color: #ec4899;
          font-weight: 600;
          font-size: 1rem;
        }
        
        .calendar-container .react-calendar__navigation button:hover {
          background-color: #fdf2f8;
        }
        
        .calendar-container .react-calendar__tile {
          background: white;
          border: 1px solid #f3f4f6;
          font-weight: 500;
        }
        
        .calendar-container .react-calendar__tile:hover {
          background-color: #fdf2f8;
        }
        
        .calendar-container .react-calendar__tile.past-date {
          color: #d1d5db;
          background-color: #f9fafb;
        }
        
        .calendar-container .react-calendar__tile.selected-date {
          background-color: #ec4899 !important;
          color: white !important;
        }
        
        .calendar-container .react-calendar__tile.available-date:hover {
          background-color: #fdf2f8;
        }
        
        .calendar-container .react-calendar__tile.unavailable-date {
          color: #9ca3af;
        }
        
        .calendar-container .react-calendar__tile--now {
          background-color: #fef3f2;
          color: #ec4899;
        }
      `}</style>
    </div>
  );
};

export default WizardDateScreen;