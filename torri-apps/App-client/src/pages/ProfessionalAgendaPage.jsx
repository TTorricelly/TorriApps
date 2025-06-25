/**
 * ProfessionalAgendaPage Component
 * Professional agenda/schedule view with time slots and appointments
 * Features: Date picker, time slots grid, professional navigation, responsive layout
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';
import { 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  User,
  Clock,
  Plus,
  Loader2
} from 'lucide-react';

// Import API services
import { 
  getCalendarAppointments, 
  getDailySchedule,
  processCalendarData,
  getAppointmentDensity,
  formatDateForApi,
  getMonthRange
} from '../services/calendarService';

const ProfessionalAgendaPage = () => {
  const navigate = useNavigate();
  
  // State management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentProfessionalIndex, setCurrentProfessionalIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isLandscape, setIsLandscape] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock professionals data (replace with actual API)
  const [professionals] = useState([
    {
      id: '1',
      name: 'Ana Silva',
      photoUrl: null,
      appointments: [
        {
          id: '1',
          clientName: 'Maria Santos',
          startTime: '09:00',
          endTime: '10:00',
          duration: 60,
          services: ['Corte de Cabelo'],
          status: 'CONFIRMED'
        },
        {
          id: '2',
          clientName: 'João Costa',
          startTime: '14:30',
          endTime: '16:00',
          duration: 90,
          services: ['Escova Progressiva'],
          status: 'SCHEDULED'
        }
      ]
    },
    {
      id: '2',
      name: 'Carlos Mendes',
      photoUrl: null,
      appointments: [
        {
          id: '3',
          clientName: 'Lucas Oliveira',
          startTime: '10:00',
          endTime: '11:30',
          duration: 90,
          services: ['Corte + Barba'],
          status: 'IN_PROGRESS'
        }
      ]
    },
    {
      id: '3',
      name: 'Beatriz Lima',
      photoUrl: null,
      appointments: []
    }
  ]);

  // Time slots configuration (30-minute intervals from 8:00 to 20:00)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      if (hour < 20) {
        slots.push(`${String(hour).padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Check screen orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Load schedule data (mock implementation)
  useEffect(() => {
    const loadSchedule = async () => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      setScheduleData({ professionals });
      setIsLoading(false);
    };

    loadSchedule();
  }, [selectedDate, professionals]);

  // Date formatting
  const formatDate = (date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateCompact = (date) => {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayMonth = date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short' 
    });
    return `${weekday}, ${dayMonth}`;
  };

  const formatDateShort = (date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Calendar utility functions
  const getMonthName = (date) => {
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getLastDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const getDaysInMonth = (date) => {
    const firstDay = getFirstDayOfMonth(date);
    const lastDay = getLastDayOfMonth(date);
    const days = [];
    
    // Add empty cells for days before month starts
    const startWeekday = firstDay.getDay();
    for (let i = 0; i < startWeekday; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(date.getFullYear(), date.getMonth(), day));
    }
    
    return days;
  };

  const isSameDay = (date1, date2) => {
    return date1?.toDateString() === date2?.toDateString();
  };

  const isToday = (date) => {
    return isSameDay(date, new Date());
  };

  // Check if a date has appointments
  const hasAppointments = (date) => {
    // This would check against actual appointment data
    // For now, using mock data - you'd replace this with real API data
    const dateString = date.toISOString().split('T')[0];
    
    // Mock: Add appointments for demo (every 3rd day has appointments)
    return date.getDate() % 3 === 0;
  };

  // Get appointment count for a date
  const getAppointmentCount = (date) => {
    if (!hasAppointments(date)) return 0;
    
    // Mock data - replace with actual appointment counting logic
    const dayOfMonth = date.getDate();
    if (dayOfMonth % 7 === 0) return 5; // Heavy day
    if (dayOfMonth % 5 === 0) return 3; // Medium day
    return 1; // Light day
  };

  // Get appointment indicator color based on count
  const getAppointmentIndicatorColor = (count) => {
    if (count === 0) return '';
    if (count >= 4) return 'bg-red-500'; // Heavy day
    if (count >= 2) return 'bg-amber-500'; // Medium day
    return 'bg-green-500'; // Light day
  };

  // Professional navigation
  const goToPreviousProfessional = () => {
    setCurrentProfessionalIndex(prev => 
      prev > 0 ? prev - 1 : professionals.length - 1
    );
  };

  const goToNextProfessional = () => {
    setCurrentProfessionalIndex(prev => 
      prev < professionals.length - 1 ? prev + 1 : 0
    );
  };

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const selectDate = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
  };

  // Get professional initials for avatar fallback
  const getProfessionalInitials = (name) => {
    const parts = name.split(' ');
    const first = parts[0]?.substring(0, 1).toUpperCase() || '';
    const last = parts[1]?.substring(0, 1).toUpperCase() || '';
    return first + last;
  };

  // Calculate appointment position in grid
  const getAppointmentPosition = (startTime) => {
    const [hour, minute] = startTime.split(':').map(Number);
    return (hour - 8) * 2 + (minute >= 30 ? 1 : 0);
  };

  // Calculate appointment height based on duration
  const getAppointmentHeight = (duration) => {
    const slots = Math.ceil(duration / 30);
    return `${slots * 3}rem`;
  };

  // Get status color
  const getStatusColor = (status) => {
    const statusMap = {
      'SCHEDULED': 'bg-blue-100 border-blue-300 text-blue-800',
      'CONFIRMED': 'bg-green-100 border-green-300 text-green-800',
      'IN_PROGRESS': 'bg-amber-100 border-amber-300 text-amber-800',
      'COMPLETED': 'bg-gray-100 border-gray-300 text-gray-800',
      'CANCELLED': 'bg-red-100 border-red-300 text-red-800'
    };
    return statusMap[status] || 'bg-gray-100 border-gray-300 text-gray-800';
  };

  // Render header
  const renderHeader = () => (
    <div className="safe-area-top bg-pink-500 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/professional/dashboard')}
          className="p-2 hover:bg-pink-600 rounded-lg transition-smooth"
        >
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">Agenda</h1>
        <div className="w-10" />
      </div>

      {/* Date selector - compact */}
      <div className="bg-pink-400 rounded-lg px-3 py-2">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="flex items-center space-x-2 text-white w-full"
        >
          <Calendar size={18} />
          <span className="font-medium text-sm">
            {formatDateCompact(selectedDate)}
          </span>
          <ChevronRight 
            size={14} 
            className={`ml-auto transition-transform ${showCalendar ? 'rotate-90' : ''}`} 
          />
        </button>
      </div>
    </div>
  );

  // Render inline calendar
  const renderInlineCalendar = () => {
    if (!showCalendar) return null;

    const days = getDaysInMonth(calendarDate);
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-smooth"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {getMonthName(calendarDate)}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-smooth"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const isSelected = day && isSameDay(day, selectedDate);
            const isTodayDate = day && isToday(day);
            const appointmentCount = day ? getAppointmentCount(day) : 0;
            const hasAppointmentsToday = appointmentCount > 0;
            const indicatorColor = getAppointmentIndicatorColor(appointmentCount);
            
            return (
              <button
                key={index}
                onClick={() => day && selectDate(day)}
                disabled={!day}
                className={`
                  relative h-10 w-10 text-sm rounded-lg transition-smooth flex items-center justify-center
                  ${!day ? 'invisible' : ''}
                  ${isSelected 
                    ? 'bg-pink-500 text-white font-semibold' 
                    : isTodayDate 
                    ? 'bg-pink-100 text-pink-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <span className="relative z-10">
                  {day?.getDate()}
                </span>
                
                {/* Appointment indicator */}
                {hasAppointmentsToday && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                    {appointmentCount >= 4 ? (
                      // Multiple dots for heavy days
                      <>
                        <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
                        <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
                        <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
                      </>
                    ) : appointmentCount >= 2 ? (
                      // Two dots for medium days
                      <>
                        <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
                        <div className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
                      </>
                    ) : (
                      // Single dot for light days
                      <div className={`w-2 h-2 rounded-full ${indicatorColor}`} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Poucos</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="flex space-x-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              </div>
              <span>Médio</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="flex space-x-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              </div>
              <span>Cheio</span>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => selectDate(new Date())}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-smooth"
          >
            Hoje
          </button>
          <button
            onClick={() => setShowCalendar(false)}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-smooth"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  };

  // Render professional header (portrait mode)
  const renderProfessionalHeader = () => {
    if (isLandscape) return null;

    const currentProfessional = professionals[currentProfessionalIndex];
    
    return (
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousProfessional}
            className="p-2 hover:bg-gray-100 rounded-lg transition-smooth"
            disabled={professionals.length <= 1}
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>

          <div className="flex items-center space-x-3">
            {currentProfessional.photoUrl ? (
              <img
                src={currentProfessional.photoUrl}
                alt={currentProfessional.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-pink-600 font-medium text-sm">
                  {getProfessionalInitials(currentProfessional.name)}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-semibold text-gray-900">{currentProfessional.name}</h3>
              <p className="text-sm text-gray-500">
                {currentProfessionalIndex + 1} de {professionals.length}
              </p>
            </div>
          </div>

          <button
            onClick={goToNextProfessional}
            className="p-2 hover:bg-gray-100 rounded-lg transition-smooth"
            disabled={professionals.length <= 1}
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    );
  };

  // Render time slot
  const renderTimeSlot = (time, index) => (
    <div
      key={time}
      className="flex items-center justify-center text-xs text-gray-500 border-b border-gray-100 bg-gray-50"
      style={{ height: '3rem' }}
    >
      {time}
    </div>
  );

  // Render appointment
  const renderAppointment = (appointment, professionalIndex) => {
    const position = getAppointmentPosition(appointment.startTime);
    const height = getAppointmentHeight(appointment.duration);
    
    return (
      <div
        key={appointment.id}
        className={`absolute rounded-lg border-2 p-2 ${getStatusColor(appointment.status)}`}
        style={{
          top: `${position * 3}rem`,
          height: height,
          left: '4px',
          right: '4px',
          zIndex: 10
        }}
      >
        <div className="text-xs font-medium mb-1 truncate">
          {appointment.clientName}
        </div>
        <div className="text-xs text-gray-600 mb-1">
          {appointment.startTime} - {appointment.endTime}
        </div>
        <div className="text-xs truncate">
          {appointment.services.join(', ')}
        </div>
      </div>
    );
  };

  // Render professional column
  const renderProfessionalColumn = (professional, index) => (
    <div key={professional.id} className={`relative border-r border-gray-200 bg-white ${!isLandscape ? 'flex-1 min-w-0' : ''}`}>
      {/* Professional header (landscape mode) */}
      {isLandscape && (
        <div className="sticky top-0 bg-white border-b border-gray-200 p-2 z-20">
          <div className="flex items-center space-x-2">
            {professional.photoUrl ? (
              <img
                src={professional.photoUrl}
                alt={professional.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <span className="text-pink-600 font-medium text-xs">
                  {getProfessionalInitials(professional.name)}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-900 truncate">
              {professional.name}
            </span>
          </div>
        </div>
      )}

      {/* Time slots and appointments */}
      <div className="relative">
        {/* Background time slots */}
        {timeSlots.map((time, index) => (
          <div
            key={`slot-${time}`}
            className="border-b border-gray-100"
            style={{ height: '3rem' }}
          />
        ))}

        {/* Appointments overlay */}
        {professional.appointments.map(appointment => 
          renderAppointment(appointment, index)
        )}
      </div>
    </div>
  );

  // Render schedule grid
  const renderScheduleGrid = () => {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
            <p className="text-gray-500">Carregando agenda...</p>
          </div>
        </div>
      );
    }

    const visibleProfessionals = isLandscape 
      ? professionals 
      : [professionals[currentProfessionalIndex]];

    return (
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 bg-gray-50 border-r border-gray-200">
            {/* Header spacer for landscape mode */}
            {isLandscape && <div className="h-14 border-b border-gray-200" />}
            
            {timeSlots.map(renderTimeSlot)}
          </div>

          {/* Professionals columns */}
          <div className={`flex ${isLandscape ? 'flex-1' : 'flex-1 min-w-0'}`}>
            {visibleProfessionals.map(renderProfessionalColumn)}
          </div>
        </div>
      </div>
    );
  };

  // Render floating action button
  const renderFAB = () => (
    <button className="fixed bottom-20 right-4 w-14 h-14 bg-pink-500 rounded-full shadow-lg flex items-center justify-center hover:bg-pink-600 transition-smooth z-30">
      <Plus size={24} className="text-white" />
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {renderHeader()}
      {renderInlineCalendar()}
      {renderProfessionalHeader()}
      {renderScheduleGrid()}
      {renderFAB()}
      
      <ProfessionalBottomNavigation />
    </div>
  );
};

export default ProfessionalAgendaPage;