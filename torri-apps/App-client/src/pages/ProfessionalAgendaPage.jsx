/**
 * ProfessionalAgendaPage Component
 * Professional agenda/schedule view with time slots and appointments
 * Features: Date picker, time slots grid, professional navigation, responsive layout
 */

import React, { useState, useEffect } from 'react';
import { useNavigation } from '../shared/hooks/useNavigation';
import { ROUTES } from '../shared/navigation';
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';
import ClientDetailsModal from '../components/ClientDetailsModal';
import SchedulingWizardModal from '../components/SchedulingWizardModal';
import { 
  Calendar, 
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  User,
  Clock,
  Plus,
  Loader2,
  CalendarCheck,
  CheckCircle,
  PlayCircle,
  XCircle,
  CheckCircle2
} from 'lucide-react';

// Import API services
import { 
  getCalendarAppointments, 
  getDailySchedule,
  getCalendarAvailability,
  processCalendarData,
  getAppointmentDensity,
  formatDateForApi,
  getMonthRange
} from '../services/calendarService';
import { getAllProfessionals } from '../services/professionalService';
import { useAuthStore } from '../stores/authStore';

const ProfessionalAgendaPage = () => {
  const { navigate } = useNavigation();
  const { validateStoredToken, isAuthenticated } = useAuthStore();
  
  // State management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentProfessionalIndex, setCurrentProfessionalIndex] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isLandscape, setIsLandscape] = useState(false);
  const [scheduleData, setScheduleData] = useState(null);
  const [calendarData, setCalendarData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [professionalsLoading, setProfessionalsLoading] = useState(true);
  
  // Client details modal state
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  
  // Scheduling wizard modal state
  const [showSchedulingWizard, setShowSchedulingWizard] = useState(false);

  // Professionals data from API
  const [professionals, setProfessionals] = useState([]);

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

  // Validate authentication on component mount
  useEffect(() => {
    const isValid = validateStoredToken();
    if (!isValid && !isAuthenticated) {
      navigate(ROUTES.LOGIN);
      return;
    }
  }, [validateStoredToken, isAuthenticated, navigate]);

  // Check screen orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Load professionals data
  useEffect(() => {
    const loadProfessionals = async () => {
      try {
        setProfessionalsLoading(true);
        const professionalsData = await getAllProfessionals();
        // Transform data to match expected format
        const transformedProfessionals = professionalsData.map(prof => ({
          id: prof.id,
          name: prof.full_name || prof.name,
          photoUrl: prof.photo_url || prof.avatar_url || null,
          appointments: [] // Will be loaded in schedule data
        }));
        setProfessionals(transformedProfessionals);
      } catch (error) {
        setProfessionals([]);
      } finally {
        setProfessionalsLoading(false);
      }
    };

    loadProfessionals();
  }, []);

  // Load schedule data from API
  useEffect(() => {
    const loadSchedule = async () => {
      if (professionals.length === 0 || !selectedDate) return;
      
      try {
        setIsLoading(true);
        const dateString = formatDateForApi(selectedDate);
        const dailyScheduleData = await getDailySchedule(dateString);
        
        // Merge schedule data with professionals
        const professionalsWithAppointments = professionals.map(professional => {
          const professionalSchedule = dailyScheduleData?.professionals_schedule?.find(
            p => p.professional_id === professional.id
          );
          
          
          // Debug: Log appointment structure
          if (professionalSchedule?.appointments?.length > 0) {
          }
          
          // Transform appointments to match expected format
          const transformedAppointments = (professionalSchedule?.appointments || []).map(apt => ({
            id: apt.id,
            clientName: apt.client_name || 'Cliente',
            startTime: new Date(apt.start_time).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            endTime: apt.end_time ? new Date(apt.end_time).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : null,
            duration: apt.duration_minutes || 60,
            services: (apt.services || []).map(service => 
              typeof service === 'string' ? service : service.name || service.service_name || 'Serviço'
            ),
            status: apt.status || 'SCHEDULED'
          }));
          
          return {
            ...professional,
            appointments: transformedAppointments
          };
        });
        
        setScheduleData({ professionals: professionalsWithAppointments });
      } catch (error) {
        // Fallback to professionals without appointments
        setScheduleData({ professionals });
      } finally {
        setIsLoading(false);
      }
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

  // Load calendar data for appointment indicators
  useEffect(() => {
    // TODO: Implement proper calendar API endpoint in backend
    // For now, disable calendar indicators and focus on daily appointments
    setCalendarData({});
  }, [calendarDate]);

  // Check if a date has appointments
  const hasAppointments = (date) => {
    if (!calendarData) return false;
    const dateString = formatDateForApi(date);
    return calendarData[dateString]?.appointmentCount > 0;
  };

  // Get appointment count for a date
  const getAppointmentCount = (date) => {
    if (!calendarData) return 0;
    const dateString = formatDateForApi(date);
    return calendarData[dateString]?.appointmentCount || 0;
  };

  // Get appointment indicator color based on count
  const getAppointmentIndicatorColor = (count) => {
    const density = getAppointmentDensity(count);
    const colorMap = {
      'none': '',
      'light': 'bg-green-500',
      'medium': 'bg-amber-500', 
      'heavy': 'bg-red-500'
    };
    return colorMap[density] || '';
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

  // Handle appointment card click
  const handleAppointmentClick = (appointmentId) => {
    setSelectedAppointmentId(appointmentId);
    setShowClientModal(true);
  };

  // Handle modal close
  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setSelectedAppointmentId(null);
  };
  
  // Handle scheduling wizard modal
  const handleOpenSchedulingWizard = () => {
    setShowSchedulingWizard(true);
  };
  
  const handleCloseSchedulingWizard = () => {
    setShowSchedulingWizard(false);
  };
  
  // Handle appointment creation callback
  const handleAppointmentCreated = () => {
    // Close the modal first
    setShowSchedulingWizard(false);
    
    // Refresh schedule data after successful appointment creation
    if (professionals.length > 0 && selectedDate) {
      const dateString = formatDateForApi(selectedDate);
      getDailySchedule(dateString).then(dailyScheduleData => {
        const professionalsWithAppointments = professionals.map(professional => {
          const professionalSchedule = dailyScheduleData?.professionals_schedule?.find(
            p => p.professional_id === professional.id
          );
          
          const transformedAppointments = (professionalSchedule?.appointments || []).map(apt => ({
            id: apt.id,
            clientName: apt.client_name || 'Cliente',
            startTime: new Date(apt.start_time).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            endTime: apt.end_time ? new Date(apt.end_time).toLocaleTimeString('en-US', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit' 
            }) : null,
            duration: apt.duration_minutes || 60,
            services: (apt.services || []).map(service => 
              typeof service === 'string' ? service : service.name || service.service_name || 'Serviço'
            ),
            status: apt.status || 'SCHEDULED'
          }));
          
          return {
            ...professional,
            appointments: transformedAppointments
          };
        });
        
        setScheduleData({ professionals: professionalsWithAppointments });
      }).catch(error => {
      });
    }
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

  // Get status icon
  const getStatusIcon = (status) => {
    const iconMap = {
      'SCHEDULED': CalendarCheck,
      'CONFIRMED': CheckCircle,
      'IN_PROGRESS': PlayCircle,
      'COMPLETED': CheckCircle2,
      'CANCELLED': XCircle
    };
    const IconComponent = iconMap[status] || CalendarCheck;
    return <IconComponent size={12} className="text-current opacity-70" />;
  };

  // Render header
  const renderHeader = () => (
    <div className="safe-area-top bg-pink-500 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate(ROUTES.PROFESSIONAL.DASHBOARD)}
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
    if (isLandscape || professionals.length === 0) return null;

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
      className={`flex items-center justify-center text-xs text-gray-500 border-b border-gray-100 ${
        index % 2 === 0 ? 'bg-gray-100' : 'bg-white'
      }`}
      style={{ height: '3rem' }}
    >
      {time}
    </div>
  );

  // Render appointment
  const renderAppointment = (appointment, professionalIndex) => {
    const position = getAppointmentPosition(appointment.startTime);
    const height = getAppointmentHeight(appointment.duration);
    const isShort = appointment.duration <= 30; // 30 minutes or less
    
    return (
      <button
        key={appointment.id}
        onClick={() => handleAppointmentClick(appointment.id)}
        className={`absolute rounded-lg border-2 ${isShort ? 'p-1' : 'p-2'} ${getStatusColor(appointment.status)} cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 text-left w-full`}
        style={{
          top: `${position * 3}rem`,
          height: height,
          left: '4px',
          right: '4px',
          zIndex: 10
        }}
      >
        {/* Status icon in top-right corner */}
        <div className="absolute top-1 right-1">
          {getStatusIcon(appointment.status)}
        </div>
        
        {isShort ? (
          // Compact layout for short appointments (30 min or less)
          <div className="text-xs space-y-0 pr-4">
            <div className="font-medium truncate leading-tight">
              {appointment.clientName}
            </div>
            <div className="text-gray-600 truncate leading-tight">
              {appointment.startTime} • {appointment.services.join(', ')}
            </div>
          </div>
        ) : (
          // Full layout for longer appointments
          <div className="pr-4">
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
        )}
      </button>
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
            className={`border-b border-gray-100 ${
              index % 2 === 0 ? 'bg-gray-100' : 'bg-white'
            }`}
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
    if (professionalsLoading || isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
            <p className="text-gray-500">
              {professionalsLoading ? 'Carregando profissionais...' : 'Carregando agenda...'}
            </p>
          </div>
        </div>
      );
    }

    if (professionals.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <User size={48} className="mx-auto mb-2 opacity-50" />
            <p>Nenhum profissional encontrado</p>
          </div>
        </div>
      );
    }

    // Use schedule data (professionals with appointments) if available, otherwise fallback to basic professionals
    const professionalsWithAppointments = scheduleData?.professionals || professionals;
    
    const visibleProfessionals = isLandscape 
      ? professionalsWithAppointments 
      : (professionalsWithAppointments[currentProfessionalIndex] ? [professionalsWithAppointments[currentProfessionalIndex]] : []);

    return (
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 bg-gray-50 border-r border-gray-200">
            {/* Header spacer for landscape mode - match professional header height exactly */}
            {isLandscape && (
              <div className="sticky top-0 bg-white border-b border-gray-200 p-2 z-20">
                <div className="h-8"></div>
              </div>
            )}
            
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
    <button 
      onClick={handleOpenSchedulingWizard}
      className="fixed bottom-20 right-4 w-14 h-14 bg-pink-500 rounded-full shadow-lg flex items-center justify-center hover:bg-pink-600 transition-smooth z-30"
    >
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
      
      {/* Client Details Modal */}
      <ClientDetailsModal
        isOpen={showClientModal}
        onClose={handleCloseClientModal}
        appointmentId={selectedAppointmentId}
      />
      
      {/* Scheduling Wizard Modal */}
      <SchedulingWizardModal
        isVisible={showSchedulingWizard}
        onClose={handleCloseSchedulingWizard}
        selectedServices={[]} // Empty array initially, let user select services in wizard
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  );
};

export default ProfessionalAgendaPage;