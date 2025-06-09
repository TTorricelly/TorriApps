import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Input, Spinner, Alert, Tooltip, Dialog, DialogHeader, DialogBody, DialogFooter, Select, Option, Textarea, Badge } from "@material-tailwind/react";
import {
  ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, ExclamationTriangleIcon, LockClosedIcon,
  PencilIcon, TrashIcon, PlusIcon, ClockIcon, UserIcon
} from "@heroicons/react/24/solid";
import { getDailySchedule, createAppointment, updateAppointment, updateAppointmentWithMultipleServices, cancelAppointment } from '../../Services/appointmentsApi'; // Updated import
import { servicesApi } from '../../Services/services';
import { professionalsApi } from '../../Services/professionals'; // Added import
import { createClient, getClients, searchClients } from '../../Services/clientsApi';
import SearchableServiceSelect from '../../Components/SearchableServiceSelect';

const DailySchedulePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({ professionals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // For professional search
  const [clientSearchTerm, setClientSearchTerm] = useState(''); // For client search
  const [currentTime, setCurrentTime] = useState(new Date());

  // Appointment modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    professionalId: '',
    services: [],
    date: '',
    startTime: '',
    duration: 60,
    status: 'SCHEDULED',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [savingAppointment, setSavingAppointment] = useState(false);

  // Services state
  const [availableServices, setAvailableServices] = useState([]); // Changed initial state
  const [loadingServices, setLoadingServices] = useState(false);
  const [professionalServicesCache, setProfessionalServicesCache] = useState({}); // Added state

  // Client management state
  const [availableClients, setAvailableClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);

  // Appointment status translation and color mapping
  const getStatusInfo = (status) => {
    const statusMap = {
      'SCHEDULED': { 
        label: 'Agendado', 
        color: 'border-accent-primary', 
        bgColor: 'bg-accent-primary/10',
        textColor: 'text-accent-primary'
      },
      'CONFIRMED': { 
        label: 'Confirmado', 
        color: 'border-status-success', 
        bgColor: 'bg-status-success/10',
        textColor: 'text-status-success'
      },
      'IN_PROGRESS': { 
        label: 'Em Andamento', 
        color: 'border-status-warning', 
        bgColor: 'bg-status-warning/10',
        textColor: 'text-status-warning'
      },
      'COMPLETED': { 
        label: 'Concluído', 
        color: 'border-green-500', 
        bgColor: 'bg-green-500/10',
        textColor: 'text-green-500'
      },
      'CANCELLED': { 
        label: 'Cancelado', 
        color: 'border-status-error', 
        bgColor: 'bg-status-error/10',
        textColor: 'text-status-error'
      },
      'NO_SHOW': { 
        label: 'Não Compareceu', 
        color: 'border-red-800', 
        bgColor: 'bg-red-800/10',
        textColor: 'text-red-800'
      }
    };
    
    return statusMap[status] || statusMap['SCHEDULED']; // Default to SCHEDULED
  };

  // Appointment modal functions
  const openCreateModal = () => {
    setEditingAppointment(null);
    setAppointmentForm({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      professionalId: '',
      services: [],
      date: selectedDate.toISOString().split('T')[0],
      startTime: '',
      duration: 60,
      status: 'SCHEDULED',
      notes: ''
    });
    setFormErrors({});
    setSelectedClient(null);
    setIsNewClient(false);
    setClientSearchResults([]);
    setAvailableServices([]); // Clear available services
    setShowAppointmentModal(true);
  };

  const openEditModal = (appointment, professionalId) => {
    setEditingAppointment(appointment);
    setAppointmentForm({
      clientName: appointment.clientName || '',
      clientPhone: appointment.clientPhone || '',
      clientEmail: appointment.clientEmail || '',
      professionalId: professionalId || appointment.professionalId || '',
      services: appointment.services || [],
      date: appointment.startTimeISO ? new Date(appointment.startTimeISO).toISOString().split('T')[0] : '',
      startTime: appointment.startTimeISO ? new Date(appointment.startTimeISO).toTimeString().slice(0, 5) : '',
      duration: appointment.duration || 60,
      status: appointment.status || 'SCHEDULED',
      notes: appointment.notes || ''
    });
    setFormErrors({});
    setShowAppointmentModal(true);
    // Fetch services if professionalId is available
    const profId = professionalId || appointment.professionalId;
    if (profId) {
      fetchServicesForProfessional(profId);
    }
  };

  const handleCancelAppointment = async (appointment) => { // Renamed function
    const appointmentIds = appointment.appointmentIds || [appointment.id];
    const isGrouped = appointmentIds.length > 1;
    
    const confirmMessage = isGrouped 
      ? `Tem certeza que deseja cancelar todos os ${appointmentIds.length} serviços deste agendamento?` // Updated message
      : "Tem certeza que deseja cancelar este agendamento?"; // Updated message
      
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Cancel all appointments in the group - for now, assuming cancellation of one cancels logical group if needed,
      // or backend handles cascade if these are linked.
      // For simplicity, if it's a "grouped" display item, we might only explicitly cancel the primary ID
      // or expect the backend to handle related items if that's the design.
      // The current API only cancels one by ID. If multiple actual cancellations are needed, loop here.
      // Assuming for now we cancel the primary appointment of the group.
      // The backend cancel endpoint returns the updated appointment, so we might want to use that.
      await cancelAppointment(appointment.id, null); // Using primary ID, passing null for reasonPayload

      console.log(`Appointment(s) cancelled successfully`); // Updated log
      
      // Refresh schedule data
      await fetchSchedule();
      setError(null);
    } catch (error) {
      console.error("Error cancelling appointment:", error); // Updated log
      setError(error.message || "Erro ao cancelar agendamento. Tente novamente."); // Updated message
    }
  };

  const closeModal = () => {
    setShowAppointmentModal(false);
    setEditingAppointment(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    // Client validation
    if (!editingAppointment) {
      if (isNewClient) {
        if (!appointmentForm.clientName.trim()) {
          errors.clientName = 'Nome do cliente é obrigatório';
        }
        if (!appointmentForm.clientEmail?.trim()) {
          errors.clientEmail = 'Email é obrigatório para novos clientes';
        }
      } else {
        if (!selectedClient) {
          errors.clientName = 'Selecione um cliente existente';
        }
      }
    } else {
      if (!appointmentForm.clientName.trim()) {
        errors.clientName = 'Nome do cliente é obrigatório';
      }
    }
    
    if (!appointmentForm.professionalId) {
      errors.professionalId = 'Profissional é obrigatório';
    }
    
    if (!appointmentForm.date) {
      errors.date = 'Data é obrigatória';
    }
    
    if (!appointmentForm.startTime) {
      errors.startTime = 'Horário é obrigatório';
    }
    
    if (appointmentForm.duration < 15) {
      errors.duration = 'Duração mínima é 15 minutos';
    }
    
    // Only validate services for new appointments
    if (!editingAppointment && appointmentForm.services.length === 0) {
      errors.services = 'Selecione pelo menos um serviço';
    }

    // Time slot conflict validation
    if (appointmentForm.professionalId && appointmentForm.date && appointmentForm.startTime) {
      const professional = scheduleData.professionals.find(p => p.id === appointmentForm.professionalId);
      if (professional) {
        const appointmentStart = new Date(`${appointmentForm.date}T${appointmentForm.startTime}:00`);
        const appointmentEnd = new Date(appointmentStart.getTime() + appointmentForm.duration * 60000);
        
        // Determine current client name
        let currentAppointmentClientName = null;
        if (editingAppointment) {
          currentAppointmentClientName = editingAppointment.clientName;
        } else if (selectedClient) {
          currentAppointmentClientName = selectedClient.full_name; // Matches apt.clientName source
        } else if (isNewClient) {
          currentAppointmentClientName = appointmentForm.clientName;
        }

        // Check for conflicts with existing appointments (exclude current appointment when editing)
        const conflictingAppointment = professional.appointments.find(apt => {
          if (editingAppointment && apt.id === editingAppointment.id) {
            return false; // Skip current appointment when editing
          }
          
          const existingStart = new Date(apt.startTimeISO);
          const existingEnd = new Date(apt.endTimeISO);
          
          // Check if time slots overlap
          const timeOverlap = (
            (appointmentStart >= existingStart && appointmentStart < existingEnd) ||
            (appointmentEnd > existingStart && appointmentEnd <= existingEnd) ||
            (appointmentStart <= existingStart && appointmentEnd >= existingEnd)
          );

          if (timeOverlap) {
            // If current client name is unknown, or if existing apt client name is different from current.
            // Existing appointments on schedule use apt.clientName.
            if (!currentAppointmentClientName || (apt.clientName !== currentAppointmentClientName)) {
              return true; // Conflict
            }
          }
          return false; // No conflict or same client
        });
        
        if (conflictingAppointment) {
          errors.startTime = "Conflito: Horário ocupado por outro cliente.";
        }
        
        // Check for conflicts with blocked slots
        const conflictingBlock = professional.blockedSlots.find(block => {
          const blockStart = new Date(block.startTimeISO);
          const blockEnd = new Date(block.endTimeISO);
          
          // Check if time slots overlap
          return (
            (appointmentStart >= blockStart && appointmentStart < blockEnd) ||
            (appointmentEnd > blockStart && appointmentEnd <= blockEnd) ||
            (appointmentStart <= blockStart && appointmentEnd >= blockEnd)
          );
        });
        
        if (conflictingBlock) {
          errors.startTime = `Horário bloqueado: ${conflictingBlock.reason}`;
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveAppointment = async () => {
    if (!validateForm()) return;
    
    setSavingAppointment(true);
    try {
      // Find selected services with their IDs - for now use first service
      const selectedServices = availableServices.filter(service => 
        appointmentForm.services.includes(service.name)
      );
      
      let appointmentData;
      
      if (editingAppointment) {
        // For updates, use the AppointmentUpdate schema format (only include fields that changed)
        appointmentData = {};
        
        // Only include fields that are being updated
        if (appointmentForm.professionalId) {
          appointmentData.professional_id = appointmentForm.professionalId;
        }
        
        if (selectedServices.length > 0) {
          appointmentData.service_id = selectedServices[0].id;
        }
        
        if (appointmentForm.date) {
          appointmentData.appointment_date = appointmentForm.date;
        }
        
        if (appointmentForm.startTime) {
          appointmentData.start_time = appointmentForm.startTime;
        }
        
        if (appointmentForm.notes) {
          appointmentData.notes_by_client = appointmentForm.notes;
        }
        
        if (appointmentForm.status) {
          appointmentData.status = appointmentForm.status;
        }
      } else {
        // For creates, handle client creation first
        let clientId = selectedClient?.id;
        
        if (!clientId && isNewClient) {
          // Create new client first
          const newClientData = {
            email: appointmentForm.clientEmail || `${appointmentForm.clientName.toLowerCase().replace(/\s+/g, '')}@cliente.com`,
            full_name: appointmentForm.clientName,
            password: 'temp123', // Temporary password - client should reset
            role: 'CLIENTE'
          };
          
          try {
            const newClient = await createClient(newClientData);
            clientId = newClient.id;
          } catch (error) {
            throw new Error(`Erro ao criar cliente: ${error.message}`);
          }
        }
        
        if (!clientId) {
          throw new Error('É necessário selecionar um cliente ou criar um novo cliente.');
        }
        
        // For creates, use the AppointmentCreate schema format  
        appointmentData = {
          client_id: clientId,
          professional_id: appointmentForm.professionalId,
          service_id: selectedServices.length > 0 ? selectedServices[0].id : null,
          appointment_date: appointmentForm.date,
          start_time: appointmentForm.startTime,
          notes_by_client: appointmentForm.notes || null
        };
      }
      
      if (editingAppointment) {
        // Update existing appointment (single service only)
        await updateAppointment(editingAppointment.id, appointmentData);
        console.log('Appointment updated successfully');
      } else {
        // Create new appointment (single service only)
        await createAppointment(appointmentData);
        console.log('Appointment created successfully');
        
        // Refresh clients list if we created a new client
        if (isNewClient) {
          await fetchClients();
        }
      }
      
      // Refresh schedule data
      await fetchSchedule();
      closeModal();
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error saving appointment:', error);
      setError(error.message || 'Erro ao salvar agendamento. Tente novamente.');
    } finally {
      setSavingAppointment(false);
    }
  };

  // const fetchServices = useCallback(async () => { // Commented out old fetchServices
  //   setLoadingServices(true);
  //   try {
  //     const services = await servicesApi.getAllServices();
  //     setAvailableServices(services);
  //   } catch (err) {
  //     console.error("Error fetching services:", err);
  //     // Don't set error for services - use fallback services if API fails
  //     setAvailableServices([
  //       { id: '1', name: 'Corte' },
  //       { id: '2', name: 'Barba' },
  //       { id: '3', name: 'Bigode' },
  //       { id: '4', name: 'Sobrancelha' },
  //       { id: '5', name: 'Lavagem' },
  //       { id: '6', name: 'Hidratação' }
  //     ]);
  //   } finally {
  //     setLoadingServices(false);
  //   }
  // }, []);

  const fetchServicesForProfessional = useCallback(async (professionalId) => {
    if (professionalServicesCache[professionalId]) {
      setAvailableServices(professionalServicesCache[professionalId]);
      return professionalServicesCache[professionalId]; // Return cached services
    }

    setLoadingServices(true);
    setError(null); // Clear previous errors
    try {
      const fetchedServices = await professionalsApi.getProfessionalServices(professionalId);
      setProfessionalServicesCache(prevCache => ({ ...prevCache, [professionalId]: fetchedServices }));
      setAvailableServices(fetchedServices);
      return fetchedServices; // Return fetched services
    } catch (err) {
      console.error(`Error fetching services for professional ${professionalId}:`, err);
      setError(`Erro ao carregar serviços para o profissional.`);
      setAvailableServices([]);
      return []; // Return empty array on error
    } finally {
      setLoadingServices(false);
    }
  }, [professionalServicesCache]);

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const clients = await getClients();
      setAvailableClients(clients);
    } catch (err) {
      console.error("Error fetching clients:", err);
      setAvailableClients([]);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const handleClientSearch = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setClientSearchResults([]);
      return;
    }

    setLoadingClients(true);
    try {
      const results = await searchClients(searchTerm);
      setClientSearchResults(results || []);
    } catch (err) {
      console.error("Error searching clients:", err);
      setClientSearchResults([]);
      // Fallback to filtering from available clients if search API fails
      if (availableClients.length > 0) {
        const filtered = availableClients.filter(client => 
          (client.full_name && client.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setClientSearchResults(filtered.slice(0, 10)); // Limit to 10 results
      }
    } finally {
      setLoadingClients(false);
    }
  }, [availableClients]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailySchedule(selectedDate);
      setScheduleData(data);
    } catch (err) {
      console.error("Error fetching schedule:", err);
      setError("Falha ao carregar a agenda. Tente novamente mais tarde.");
      setScheduleData({ professionals: [] }); // Clear data on error
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Calculate total duration from selected services
  const calculateTotalDuration = useCallback((selectedServiceNames) => {
    if (!selectedServiceNames || selectedServiceNames.length === 0) {
      return 60; // Default duration
    }

    let totalDuration = 0;
    selectedServiceNames.forEach(serviceName => {
      const service = availableServices.find(s => s.name === serviceName);
      if (service && service.duration_minutes) {
        totalDuration += service.duration_minutes;
      }
    });

    return totalDuration > 0 ? totalDuration : 60; // Fallback to default if no valid durations found
  }, [availableServices]);

  // Auto-calculate duration when services change
  useEffect(() => {
    if (!editingAppointment && appointmentForm.services.length > 0) {
      const calculatedDuration = calculateTotalDuration(appointmentForm.services);
      setAppointmentForm(prev => ({ 
        ...prev, 
        duration: calculatedDuration 
      }));
    }
  }, [appointmentForm.services, calculateTotalDuration, editingAppointment]);

  useEffect(() => {
    fetchSchedule();
    // fetchServices(); // Removed call to old fetchServices
    fetchClients();
  }, [fetchSchedule, fetchClients]); // Removed fetchServices from dependencies

  // Fetch services when professional changes in the appointment form
  useEffect(() => {
    const updateServicesForProfessional = async () => {
      if (appointmentForm.professionalId) {
        const newServices = await fetchServicesForProfessional(appointmentForm.professionalId);
        // newServices is an array of service objects, e.g., [{id: '1', name: 'Corte'}, ...]
        // prev.services is an array of service names, e.g., ['Corte', 'Barba']

        setAppointmentForm(prev => {
          const updatedServices = prev.services.filter(serviceName => {
            // Assuming serviceName is the name and we need to find it in newServices
            // This might need adjustment if appointmentForm.services stores IDs instead of names
            const serviceExists = newServices.some(ns => ns.name === serviceName);
            return serviceExists;
          });
          return { ...prev, services: updatedServices };
        });
      } else {
        setAvailableServices([]);
        setAppointmentForm(prev => ({ ...prev, services: [] })); // Clear selected services
      }
    };

    updateServicesForProfessional();
  }, [appointmentForm.professionalId, fetchServicesForProfessional]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const handleDateChange = (daysToAdd) => {
    setSelectedDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + daysToAdd);
      return newDate;
    });
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handleDateInputChange = (event) => {
    const dateValue = event.target.value;
    // HTML date input value is YYYY-MM-DD. Need to convert to JS Date object.
    // Important: constructor new Date(string) can have timezone issues.
    // new Date('YYYY-MM-DD') creates date at UTC midnight.
    // To keep it local, split and use new Date(year, monthIndex, day).
    const [year, month, day] = dateValue.split('-').map(Number);
    if (year && month && day) { // Ensure basic validity
        setSelectedDate(new Date(year, month - 1, day));
    }
  };

  const filteredProfessionals = scheduleData.professionals.filter(prof =>
    prof.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group appointments that have the same client, professional, date, and start time
  const groupAppointments = (appointments) => {
    const groups = {};
    const grouped = [];
    
    appointments.forEach(apt => {
      // Create a unique key for grouping
      const groupKey = `${apt.clientName}-${apt.startTimeISO}`;
      
      if (groups[groupKey]) {
        // Add to existing group
        groups[groupKey].services.push(...apt.services);
        groups[groupKey].duration += apt.duration;
        groups[groupKey].appointmentIds.push(apt.id);
        groups[groupKey].endTimeISO = new Date(new Date(groups[groupKey].startTimeISO).getTime() + groups[groupKey].duration * 60000).toISOString();
      } else {
        // Create new group
        groups[groupKey] = {
          ...apt,
          services: [...apt.services],
          appointmentIds: [apt.id], // Track all IDs in this group
          isGrouped: false // Will be set to true if more appointments are added
        };
        grouped.push(groups[groupKey]);
      }
    });
    
    // Mark groups with multiple appointments
    Object.values(groups).forEach(group => {
      if (group.appointmentIds.length > 1) {
        group.isGrouped = true;
      }
    });
    
    return grouped;
  };

  // Apply grouping to all professionals
  const professionalsWithGroupedAppointments = filteredProfessionals.map(prof => ({
    ...prof,
    appointments: groupAppointments(prof.appointments || [])
  }));

  // Define Tailwind classes from CLAUDE.md for easier use
  // These are descriptive and should be replaced by actual Tailwind utility classes.
  // For example, instead of `theme.colors.bgPrimary` use `bg-bg-primary` (which should be defined in tailwind.config.js)
  // This is a conceptual mapping. The actual Tailwind classes will be used directly.

  // Spacing mapping (conceptual)
  // p-xs -> p-1 (4px)
  // p-s -> p-2 (8px)
  // p-m -> p-4 (16px)
  // Helper to generate scrollbar styles
  // Note: This will be added to a global style sheet or a style tag if no global CSS file is managed by this tool.
  // For now, this is a conceptual representation of the styles.
  const scrollbarStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px; /* CLAUDE.md Spacing: s */
      height: 8px; /* CLAUDE.md Spacing: s */
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #1A1A2E; /* CLAUDE.md: bg-bg-primary */
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #2A2A4A; /* CLAUDE.md: bg-bg-tertiary */
      border-radius: 4px; /* CLAUDE.md Spacing: xs for rounding */
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #A0A0A0; /* CLAUDE.md: text-text-secondary for hover */
    }
  `;
  // In a real app, this would be injected via a <style> tag or added to a global CSS file.

  return (
    // Added custom-scrollbar to the main div if overflow is possible at this level
    <div className="bg-bg-primary min-h-screen p-xs sm:p-s md:p-m text-text-primary custom-scrollbar">
      {/* Header Section - Responsive adjustments */}
      <div className="mb-m p-s sm:p-m bg-bg-secondary shadow-card rounded-card">
        {/* Flex container for all header items, responsive direction and alignment */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-s md:gap-m">
          {/* Title - takes full width on small, auto on larger */}
          <Typography variant="h1" color="blue-gray" className="text-h2 sm:text-h1 text-text-primary mb-s lg:mb-0 w-full lg:w-auto text-center lg:text-left">
            Agenda Diária
          </Typography>

          {/* Controls Group: Date Nav + Date Picker + Search - flex-wrap for medium screens down */}
          <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center justify-center lg:justify-end gap-s md:gap-m w-full lg:w-auto">
            {/* Date Navigation Buttons */}
            <div className="flex flex-shrink-0 items-center gap-s order-1 md:order-1">
              <Button
                variant="outlined"
                onClick={() => handleDateChange(-1)}
                className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 flex items-center gap-s px-s sm:px-m py-xs sm:py-s rounded-button text-xs sm:text-small"
              >
                <ArrowLeftIcon strokeWidth={2} className="h-4 w-4 sm:h-5 sm:w-5" /> Anterior
              </Button>
              <Button
                variant="filled"
                onClick={handleToday}
                className="bg-accent-primary hover:bg-accent-primary/90 text-white flex items-center gap-s px-s sm:px-m py-xs sm:py-s rounded-button text-xs sm:text-small"
              >
                Hoje
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleDateChange(1)}
                className="border-accent-primary text-accent-primary hover:bg-accent-primary/10 flex items-center gap-s px-s sm:px-m py-xs sm:py-s rounded-button text-xs sm:text-small"
              >
                Próximo <ArrowRightIcon strokeWidth={2} className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-s text-text-primary relative order-2 md:order-2">
              <CalendarDaysIcon className="h-7 w-7 sm:h-8 sm:w-8 text-text-secondary" />
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={handleDateInputChange}
                className="p-s border border-bg-tertiary rounded-input text-text-primary bg-bg-primary hover:border-accent-primary focus:ring-1 focus:ring-accent-primary focus:border-accent-primary outline-none appearance-none text-xs sm:text-small"
                style={{ minWidth: '150px', maxWidth: '180px' }}
              />
            </div>

            {/* Professional Search */}
            <div className="w-full md:w-auto md:flex-grow lg:w-72 order-3 md:order-3">
              <Input
                label="Buscar Profissional..."
                icon={<i className="fas fa-search text-text-secondary" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary focus:border-accent-primary focus:ring-accent-primary text-xs sm:text-small"
                labelProps={{ className: "text-text-secondary text-xs sm:text-small" }}
                containerProps={{ className: "text-text-primary" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-m p-s sm:p-m bg-bg-secondary shadow-card rounded-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-s">
          <div className="w-full sm:w-3/4 md:w-1/2 lg:w-1/3"> {/* Responsive width for client search */}
             <Input
                label="Buscar Cliente..."
                icon={<UserIcon className="h-4 w-4 text-text-secondary" />}
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="bg-bg-primary border-bg-tertiary text-text-primary focus:border-accent-primary focus:ring-accent-primary text-xs sm:text-small"
                labelProps={{ className: "text-text-secondary text-xs sm:text-small" }}
                containerProps={{ className: "text-text-primary" }}
              />
          </div>
          <Button
            onClick={openCreateModal}
            className="bg-accent-primary hover:bg-accent-primary/90 text-white flex items-center gap-2 px-4 py-2 rounded-button text-xs sm:text-small whitespace-nowrap"
          >
            <PlusIcon className="h-4 w-4" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          color="red"
          icon={<ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />} // Responsive icon
          className="mb-m bg-status-error/20 text-status-error p-s sm:p-m rounded-card text-xs sm:text-small" // Responsive padding and text
        >
          {error}
        </Alert>
      )}

      <div className="bg-bg-secondary shadow-card rounded-card p-xs sm:p-s md:p-m lg:p-l"> {/* Responsive padding */}
        {loading ? ( <div className="flex justify-center items-center h-64"> <Spinner className="h-10 w-10 sm:h-12 sm:w-12 text-accent-primary" /> <Typography color="blue-gray" className="ml-s text-text-secondary text-small sm:text-body">Carregando agenda...</Typography> </div> )
        : professionalsWithGroupedAppointments.length === 0 && !searchTerm ? ( <Typography color="blue-gray" className="text-center py-l text-text-secondary text-small sm:text-body"> Nenhum profissional ativo para esta data. </Typography> )
        : professionalsWithGroupedAppointments.length === 0 && searchTerm ? ( <Typography color="blue-gray" className="text-center py-l text-text-secondary text-small sm:text-body"> Nenhum profissional encontrado para "{searchTerm}". </Typography> )
        : (
          <>
           
            {professionalsWithGroupedAppointments.length > 0 && clientSearchTerm && !professionalsWithGroupedAppointments.some(p => p.appointments?.some(a => a.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()))) &&
             ( <Typography color="blue-gray" className="text-center py-m text-text-secondary text-small sm:text-body"> Nenhum agendamento encontrado para o cliente "{clientSearchTerm}". </Typography> )
            }
            <div className="overflow-x-auto rounded-lg border border-bg-tertiary custom-scrollbar"> {/* Added custom-scrollbar */}
              <div className="min-w-max">
                {/* Header Row */}
                <div
                  className="grid sticky top-0 z-10 bg-bg-secondary shadow-sm"
                  style={{ gridTemplateColumns: `6rem repeat(${professionalsWithGroupedAppointments.length || 1}, minmax(10rem, 1fr))` }}
                >
                  <div className="p-xs sm:p-s border-r border-b border-bg-tertiary text-center">
                    <Typography variant="small" className="font-semibold text-text-primary text-xs sm:text-small">
                      Hora
                    </Typography>
                  </div>
                  {professionalsWithGroupedAppointments.map(prof => (
                    <div key={prof.id} className="p-xs sm:p-s border-r border-b border-bg-tertiary text-center">
                       <div className="flex flex-col items-center gap-xs">
                        {prof.photoUrl ? (
                          <img src={prof.photoUrl} alt={prof.name} className="h-7 w-7 sm:h-8 md:h-10 md:w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-7 w-7 sm:h-8 md:h-10 md:w-10 rounded-full bg-accent-secondary flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                            {prof.name.substring(0,1).toUpperCase()}{(prof.name.includes(' ') ? prof.name.split(' ')[1].substring(0,1).toUpperCase() : prof.name.substring(1,2).toUpperCase())}
                          </div>
                        )}
                        <Typography variant="small" className="font-semibold text-text-primary text-xs sm:text-small truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]" title={prof.name}>
                          {prof.name}
                        </Typography>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Schedule Grid */}
                <div 
                  className="grid relative"
                  style={{ 
                    gridTemplateColumns: `6rem repeat(${professionalsWithGroupedAppointments.length || 1}, minmax(10rem, 1fr))`,
                    gridTemplateRows: `repeat(${(20 - 8) * 2 + 1}, 3rem)`
                  }}
                >
                  {/* Time Column */}
                  {Array.from({ length: (20 - 8) * 2 + 1 }).map((_, slotIndex) => {
                    const hour = 8 + Math.floor(slotIndex / 2);
                    const minute = slotIndex % 2 === 0 ? '00' : '30';
                    const timeString = `${String(hour).padStart(2, '0')}:${minute}`;
                    const slotTimeInMinutes = hour * 60 + parseInt(minute);
                    const now = currentTime;
                    const nowTimeInMinutes = now.getHours() * 60 + now.getMinutes();

                    let timeCellClass = `p-xs sm:p-s border-r border-b border-bg-tertiary text-center min-h-[3rem] flex items-center justify-center ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'}`;
                    let isCurrentSlot = false;
                    if (selectedDate.toDateString() === now.toDateString() && nowTimeInMinutes >= slotTimeInMinutes && nowTimeInMinutes < slotTimeInMinutes + 30) {
                      isCurrentSlot = true;
                      timeCellClass = `p-xs sm:p-s border-r border-b border-bg-tertiary text-center min-h-[3rem] flex items-center justify-center bg-accent-primary/20 relative`;
                    }

                    return (
                      <div 
                        key={`time-${timeString}`}
                        className={timeCellClass}
                        style={{ gridColumn: 1, gridRow: slotIndex + 1 }}
                      >
                        {isCurrentSlot && <div className="absolute top-0 left-0 w-0.5 sm:w-1 h-full bg-accent-primary"></div>}
                        <Typography variant="small" className={`text-text-secondary text-xs sm:text-small ${isCurrentSlot ? 'font-bold text-accent-primary' : ''}`}>
                          {timeString}
                        </Typography>
                      </div>
                    );
                  })}

                  {/* Professional Columns - Empty Slots */}
                  {professionalsWithGroupedAppointments.map((prof, profIndex) => 
                    Array.from({ length: (20 - 8) * 2 + 1 }).map((_, slotIndex) => {
                      const hour = 8 + Math.floor(slotIndex / 2);
                      const minute = slotIndex % 2 === 0 ? '00' : '30';
                      const timeString = `${String(hour).padStart(2, '0')}:${minute}`;
                      
                      // Construct current slot's start datetime for comparisons
                      const slotStartDateTime = new Date(selectedDate);
                      slotStartDateTime.setHours(hour, parseInt(minute), 0, 0);

                      // Check if this slot is covered by an appointment or blocked slot that started earlier
                      const isCoveredByAppointment = (prof.appointments || []).some(apt => {
                        const aptStart = new Date(apt.startTimeISO);
                        const aptEnd = new Date(apt.endTimeISO);
                        return aptStart < slotStartDateTime && slotStartDateTime < aptEnd;
                      });

                      const isCoveredByBlockedSlot = (prof.blockedSlots || []).some(block => {
                        const blockStart = new Date(block.startTimeISO);
                        const blockEnd = new Date(block.endTimeISO);
                        return blockStart < slotStartDateTime && slotStartDateTime < blockEnd;
                      });

                      // Skip rendering background slot if it's covered by an appointment or blocked slot
                      if (isCoveredByAppointment || isCoveredByBlockedSlot) {
                        return null;
                      }

                      const emptySlotOpacity = clientSearchTerm ? 'opacity-30' : 'opacity-100';
                      
                      return (
                        <div 
                          key={`${prof.id}-${timeString}-empty`}
                          className={`border-r border-b border-bg-tertiary min-h-[3rem] flex items-center justify-center ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'} hover:bg-bg-tertiary/50 transition-colors cursor-pointer ${emptySlotOpacity}`}
                          style={{ gridColumn: profIndex + 2, gridRow: slotIndex + 1 }}
                          title={`Disponível ${timeString} - ${prof.name}`}
                        />
                      );
                    })
                  )}

                  {/* Appointments and Blocked Slots */}
                  {professionalsWithGroupedAppointments.map((prof, profIndex) => {
                    const items = [
                      ...(prof.appointments || []).map(apt => ({ ...apt, type: 'appointment' })),
                      ...(prof.blockedSlots || []).map(block => ({ ...block, type: 'blocked' }))
                    ];

                    return items.map((item, itemIndex) => {
                      const startTime = new Date(item.startTimeISO);
                      const startHour = startTime.getHours();
                      const startMinute = startTime.getMinutes();
                      
                      // Calculate which slot this item starts in (0-based)
                      const startSlotIndex = (startHour - 8) * 2 + (startMinute >= 30 ? 1 : 0);
                      
                      // Skip if the item starts before or after our time range
                      if (startSlotIndex < 0 || startSlotIndex >= (20 - 8) * 2 + 1) {
                        return null;
                      }

                      const spans = Math.ceil(item.duration / 30);
                      
                      // Calculate end time for display (common for both appointments and blocked slots)
                      const endTime = new Date(item.endTimeISO || item.startTimeISO);
                      if (!item.endTimeISO) {
                        endTime.setMinutes(endTime.getMinutes() + item.duration);
                      }
                      const endTimeFormatted = endTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      
                      let cardOpacity = 'opacity-100';
                      if (clientSearchTerm && item.type === 'appointment') {
                        if (!item.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())) {
                          cardOpacity = 'opacity-30 hover:opacity-100 transition-opacity';
                        }
                      }
                      
                      if (item.type === 'appointment') {
                        // Determine if we have enough space for services (threshold: 2+ spans = 60+ minutes)
                        const hasSpaceForServices = spans >= 3;
                        const servicesList = item.services || [];
                        
                        // Get status information for styling and display
                        const statusInfo = getStatusInfo(item.status);
                        
                        return (
                          <div
                            key={`${prof.id}-apt-${item.id}`}
                            className="border-r border-b border-bg-tertiary relative"
                            style={{ 
                              gridColumn: profIndex + 2,
                              gridRow: `${startSlotIndex + 1} / span ${spans}`
                            }}
                          >
                            <div className="relative h-full p-xs">
                              <Tooltip
                                placement="top"
                                interactive={true}
                                animate={{
                                  mount: { scale: 1, y: 0 },
                                  unmount: {
                                    scale: 0,
                                    y: 25,
                                    transition: { delay: 0.7, duration: 0.2 }
                                  }
                                }}
                                className="border border-bg-tertiary bg-bg-secondary px-4 py-3 shadow-card text-text-primary text-small rounded-card min-w-[200px] max-w-[300px]"
                                content={
                                  <div className="border border-bg-tertiary bg-bg-secondary px-4 py-3 shadow-card text-text-primary text-small rounded-card min-w-[200px] max-w-[300px]">
                                    {/* Appointment Info */}
                                    <div className="mb-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <Typography className="font-semibold text-accent-primary text-body">
                                          {item.clientName}
                                        </Typography>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
                                          {statusInfo.label}
                                        </span>
                                      </div>
                                      <Typography variant="small" className="text-text-secondary text-small">
                                        {startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {endTimeFormatted} ({item.duration} min) {item.isGrouped && <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs bg-accent-primary/20 text-accent-primary ml-1">{item.appointmentIds.length} serviços</span>}
                                      </Typography>
                                    </div>
                                    
                                    {/* Services */}
                                    {servicesList.length > 0 && (
                                      <div className="mb-3">
                                        <Typography variant="small" className="font-semibold text-text-primary text-small mb-2">
                                          Serviços:
                                        </Typography>
                                        <div className="flex flex-wrap gap-1">
                                          {servicesList.map((service, index) => (
                                            <span key={index} className="text-xs bg-accent-secondary/20 text-accent-secondary px-2 py-1 rounded-full text-xs">
                                              {service}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-bg-tertiary">
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation();
                                          openEditModal(item, prof.id);
                                        }}
                                        className="p-2 rounded-button hover:bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors"
                                        title="Editar Agendamento"
                                      >
                                        <PencilIcon className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setHoveredAppointment(null);
                                          handleCancelAppointment(item); // Updated function call
                                        }}
                                        className="p-2 rounded-button hover:bg-bg-tertiary text-text-secondary hover:text-status-error transition-colors"
                                        title="Cancelar Agendamento" // Updated title
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                }
                              >
                                <div className={`bg-bg-secondary p-xs sm:p-s rounded-card shadow-sm h-full border-l-2 sm:border-l-4 ${statusInfo.color} ${cardOpacity} cursor-default flex flex-col ${item.duration <= 30 ? 'justify-center items-center' : (hasSpaceForServices ? 'justify-between' : 'justify-start')}`}>
                                  {item.duration <= 30 ? (
                                  // Content for appointments <= 30 minutes
                                  <Typography variant="small" className="font-semibold text-accent-primary text-xs sm:text-body leading-tight sm:leading-normal text-center">
                                    {item.clientName}
                                  </Typography>
                                ) : (
                                  // Existing content for appointments > 30 minutes
                                  <>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <Typography variant="small" className="font-semibold text-accent-primary text-xs sm:text-body leading-tight sm:leading-normal">
                                          {item.clientName}
                                        </Typography>
                                        {!hasSpaceForServices && (
                                          <span className={`w-2 h-2 rounded-full ${statusInfo.color.replace('border-', 'bg-')}`} title={statusInfo.label}></span>
                                        )}
                                      </div>
                                      <Typography variant="small" className="text-text-secondary text-small">
                                        {startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {endTimeFormatted} ({item.duration} min) {item.isGrouped && <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs bg-accent-primary/20 text-accent-primary ml-1">{item.appointmentIds.length} serviços</span>}
                                      </Typography>

                                    
                                    </div>

                                    {/* Show services only if we have enough space */}
                                    {hasSpaceForServices && servicesList.length > 0 && (
                                      <div className="flex flex-wrap gap-xs mt-xs">
                                        {servicesList.slice(0, 3).map((service, index) => (
                                          <span key={index} className="text-xs bg-accent-secondary/20 text-accent-secondary px-xs sm:px-s py-0.5 sm:py-xs rounded-full text-2xs sm:text-xs">
                                            {service}
                                          </span>
                                        ))}
                                        {servicesList.length > 3 && (
                                          <span className="text-xs text-text-tertiary px-xs py-0.5 text-2xs">
                                            +{servicesList.length - 3}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      } else if (item.type === 'blocked') {
                        return (
                          <div
                            key={`${prof.id}-blocked-${item.id || itemIndex}`}
                            className="border-r border-b border-bg-tertiary relative"
                            style={{ 
                              gridColumn: profIndex + 2,
                              gridRow: `${startSlotIndex + 1} / span ${spans}`
                            }}
                          >
                            <Tooltip
                              placement="top"
                              className="border border-bg-tertiary bg-bg-secondary px-m py-s shadow-card text-text-primary text-small rounded-card"
                              content={
                                <div className="w-64">
                                  <Typography className="font-semibold !text-text-primary text-body">
                                    Horário Bloqueado
                                  </Typography>
                                  <Typography variant="small" className="font-normal !text-text-secondary opacity-80 text-small">
                                    Profissional: {prof.name}
                                  </Typography>
                                  <Typography variant="small" className="font-normal !text-text-secondary opacity-80 text-small">
                                    Motivo: {item.reason || 'N/A'}
                                  </Typography>
                                  <Typography variant="small" className="font-normal !text-text-secondary opacity-80 text-small">
                                    Horário: {startTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - {endTimeFormatted} ({item.duration} min) {item.isGrouped && <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs bg-accent-primary/20 text-accent-primary ml-1">{item.appointmentIds.length} serviços</span>}
                                  </Typography>
                                </div>
                              }
                            >
                              <div className="bg-bg-tertiary/50 p-xs sm:p-s rounded-card h-full flex flex-col items-center justify-center text-text-tertiary cursor-not-allowed">
                                <LockClosedIcon className="h-4 w-4 sm:h-5 md:h-6 md:w-6 mb-xs text-text-tertiary" />
                                <Typography variant="small" className="font-medium text-center text-2xs sm:text-xs md:text-small">
                                  {item.reason || "Bloqueado"}
                                </Typography>
                              </div>
                            </Tooltip>
                          </div>
                        );
                      }

                      return null;
                    });
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {/* Appointment Modal */}
      <Dialog 
        open={showAppointmentModal} 
        handler={closeModal}
        size="lg"
        className="bg-bg-secondary border border-bg-tertiary"
      >
        <DialogHeader className="text-text-primary border-b border-bg-tertiary">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-accent-primary" />
            <Typography variant="h4" className="text-text-primary">
              {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </Typography>
          </div>
        </DialogHeader>
        
        <DialogBody className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Information */}
            <div className="space-y-4">
              <Typography variant="h6" className="text-text-primary mb-3">
                Dados do Cliente
              </Typography>
              
              {!editingAppointment && (
                <div className="space-y-3">
                  {/* Client Selection Mode Toggle */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clientMode"
                        checked={!isNewClient}
                        onChange={() => {
                          setIsNewClient(false);
                          setSelectedClient(null);
                        }}
                        className="w-4 h-4 text-accent-primary"
                      />
                      <Typography variant="small" className="text-text-primary">
                        Cliente Existente
                      </Typography>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="clientMode"
                        checked={isNewClient}
                        onChange={() => {
                          setIsNewClient(true);
                          setSelectedClient(null);
                          setClientSearchResults([]);
                        }}
                        className="w-4 h-4 text-accent-primary"
                      />
                      <Typography variant="small" className="text-text-primary">
                        Novo Cliente
                      </Typography>
                    </label>
                  </div>

                  {/* Client Search/Selection */}
                  {!isNewClient && (
                    <div className="relative">
                      <Input
                        label="Buscar Cliente *"
                        value={selectedClient ? selectedClient.full_name || selectedClient.email : appointmentForm.clientName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAppointmentForm(prev => ({ ...prev, clientName: value }));
                          setSelectedClient(null); // Clear selected client when typing
                          if (value.length >= 2) {
                            // Debounce search
                            setTimeout(() => {
                              handleClientSearch(value);
                            }, 300);
                          } else {
                            setClientSearchResults([]);
                          }
                        }}
                        onFocus={() => {
                          // If no search term, show some available clients
                          if (!appointmentForm.clientName || appointmentForm.clientName.length < 2) {
                            setClientSearchResults(availableClients.slice(0, 10)); // Show first 10 clients
                          }
                        }}
                        className="bg-bg-primary border-bg-tertiary text-text-primary"
                        labelProps={{ className: "text-text-secondary" }}
                        containerProps={{ className: "text-text-primary" }}
                        error={!!formErrors.clientName}
                        icon={loadingClients ? <Spinner className="h-4 w-4" /> : undefined}
                      />
                      
                      {/* Client Search Results */}
                      {clientSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-bg-tertiary rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto">
                          {clientSearchResults.map(client => (
                            <div
                              key={client.id}
                              onClick={() => {
                                setSelectedClient(client);
                                setAppointmentForm(prev => ({
                                  ...prev,
                                  clientName: client.full_name || client.email,
                                  clientEmail: client.email
                                }));
                                setClientSearchResults([]);
                              }}
                              className="p-3 hover:bg-bg-tertiary cursor-pointer"
                            >
                              <Typography variant="small" className="text-text-primary font-medium">
                                {client.full_name || client.email}
                              </Typography>
                              <Typography variant="small" className="text-text-secondary text-xs">
                                {client.email}
                              </Typography>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Client Form Fields */}
              {(isNewClient || editingAppointment) && (
                <>
                  <Input
                    label="Nome do Cliente *"
                    value={appointmentForm.clientName}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientName: e.target.value }))}
                    className="bg-bg-primary border-bg-tertiary text-text-primary disabled:bg-bg-primary disabled:text-text-primary disabled:border-bg-tertiary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    error={!!formErrors.clientName}
                    disabled={editingAppointment} // Can't change client when editing
                  />
                  {formErrors.clientName && (
                    <Typography variant="small" className="text-status-error">
                      {formErrors.clientName}
                    </Typography>
                  )}
                  
                  <Input
                    label="Telefone"
                    value={appointmentForm.clientPhone}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                    className="bg-bg-primary border-bg-tertiary text-text-primary disabled:bg-bg-primary disabled:text-text-primary disabled:border-bg-tertiary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    disabled={editingAppointment} // Can't change client when editing
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    value={appointmentForm.clientEmail}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                    className="bg-bg-primary border-bg-tertiary text-text-primary disabled:bg-bg-primary disabled:text-text-primary disabled:border-bg-tertiary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    error={!!formErrors.clientEmail}
                    disabled={editingAppointment} // Can't change client when editing
                  />
                  {formErrors.clientEmail && (
                    <Typography variant="small" className="text-status-error">
                      {formErrors.clientEmail}
                    </Typography>
                  )}
                </>
              )}

              {/* Selected Client Display */}
              {!isNewClient && selectedClient && !editingAppointment && (
                <div className="p-3 bg-bg-primary border border-accent-primary rounded-lg">
                  <Typography variant="small" className="text-accent-primary font-medium">
                    Cliente Selecionado:
                  </Typography>
                  <Typography variant="small" className="text-text-primary">
                    {selectedClient.full_name || selectedClient.email}
                  </Typography>
                  <Typography variant="small" className="text-text-secondary">
                    {selectedClient.email}
                  </Typography>
                </div>
              )}
            </div>
            
            {/* Appointment Details */}
            <div className="space-y-4">
              <Typography variant="h6" className="text-text-primary mb-3">
                Detalhes do Agendamento
              </Typography>
              
              <Select
                label="Profissional *"
                value={appointmentForm.professionalId}
                onChange={(value) => setAppointmentForm(prev => ({ ...prev, professionalId: value }))}
                className="bg-bg-primary border-bg-tertiary text-text-primary"
                labelProps={{ className: "text-text-secondary" }}
                containerProps={{ className: "text-text-primary" }}
                menuProps={{ 
                  className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50"
                }}
                error={!!formErrors.professionalId}
              >
                {professionalsWithGroupedAppointments.map(prof => (
                  <Option 
                    key={prof.id} 
                    value={prof.id}
                    className="text-text-primary hover:bg-bg-tertiary"
                  >
                    {prof.name}
                  </Option>
                ))}
              </Select>
              {formErrors.professionalId && (
                <Typography variant="small" className="text-status-error">
                  {formErrors.professionalId}
                </Typography>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    label="Data *"
                    type="date"
                    value={appointmentForm.date}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, date: e.target.value }))}
                    className="bg-bg-primary border-bg-tertiary text-text-primary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    error={!!formErrors.date}
                  />
                  {formErrors.date && (
                    <Typography variant="small" className="text-status-error mt-1">
                      {formErrors.date}
                    </Typography>
                  )}
                </div>
                
                <div>
                  <Input
                    label="Horário *"
                    type="time"
                    value={appointmentForm.startTime}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="bg-bg-primary border-bg-tertiary text-text-primary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    error={!!formErrors.startTime}
                  />
                  {formErrors.startTime && (
                    <Typography variant="small" className="text-status-error mt-1">
                      {formErrors.startTime}
                    </Typography>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    label="Duração (min) *"
                    type="number"
                    min="15"
                    step="15"
                    value={appointmentForm.duration}
                    onChange={(e) => setAppointmentForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="bg-bg-primary border-bg-tertiary text-text-primary"
                    labelProps={{ className: "text-text-secondary" }}
                    containerProps={{ className: "text-text-primary" }}
                    error={!!formErrors.duration}
                    disabled={!editingAppointment && appointmentForm.services.length > 0}
                  />
                  {formErrors.duration && (
                    <Typography variant="small" className="text-status-error mt-1">
                      {formErrors.duration}
                    </Typography>
                  )}
                  {!editingAppointment && appointmentForm.services.length > 0 && (
                    <Typography variant="small" className="text-text-tertiary mt-1 text-xs">
                      Duração calculada automaticamente com base nos serviços selecionados
                    </Typography>
                  )}
                </div>
                
                <Select
                  label="Status"
                  value={appointmentForm.status}
                  onChange={(value) => setAppointmentForm(prev => ({ ...prev, status: value }))}
                  className="bg-bg-primary border-bg-tertiary text-text-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  containerProps={{ className: "text-text-primary" }}
                  menuProps={{ 
                    className: "bg-bg-secondary border-bg-tertiary max-h-60 overflow-y-auto z-50"
                  }}
                >
                  <Option value="SCHEDULED" className="text-text-primary hover:bg-bg-tertiary">Agendado</Option>
                  <Option value="CONFIRMED" className="text-text-primary hover:bg-bg-tertiary">Confirmado</Option>
                  <Option value="IN_PROGRESS" className="text-text-primary hover:bg-bg-tertiary">Em Andamento</Option>
                  <Option value="COMPLETED" className="text-text-primary hover:bg-bg-tertiary">Concluído</Option>
                  <Option value="CANCELLED" className="text-text-primary hover:bg-bg-tertiary">Cancelado</Option>
                  <Option value="NO_SHOW" className="text-text-primary hover:bg-bg-tertiary">Não Compareceu</Option>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Services Selection */}
          <div className="mt-6">
            <Typography variant="h6" className="text-text-primary mb-3">
              Serviços *
            </Typography>
            {loadingServices ? (
              <div className="flex items-center gap-2 text-text-secondary">
                <Spinner className="h-4 w-4" />
                <Typography variant="small">Carregando serviços...</Typography>
              </div>
            ) : (
              <div className="space-y-4">
                {editingAppointment ? (
                  /* When editing: Show only the services that are part of this appointment */
                  <div className="space-y-2">
                    <Typography variant="small" className="text-text-secondary font-medium">
                      Serviços do Agendamento
                    </Typography>
                    <div className="flex flex-wrap gap-2">
                      {appointmentForm.services.map((serviceName, index) => (
                        <div
                          key={index}
                          className="bg-accent-primary text-white px-3 py-1 text-sm rounded-full"
                        >
                          {serviceName}
                        </div>
                      ))}
                      {appointmentForm.services.length === 0 && (
                        <Typography variant="small" className="text-text-tertiary">
                          Nenhum serviço selecionado
                        </Typography>
                      )}
                    </div>
                    <Typography variant="small" className="text-text-tertiary text-xs mt-2">
                      Nota: Para modificar os serviços, exclua este agendamento e crie um novo.
                    </Typography>
                  </div>
                ) : (
                  /* When creating: Show searchable service selection dropdown */
                  <SearchableServiceSelect
                    services={availableServices}
                    selectedServices={appointmentForm.services}
                    onServicesChange={(services) => {
                      setAppointmentForm(prev => ({
                        ...prev,
                        services
                      }));
                    }}
                    placeholder={
                      !appointmentForm.professionalId
                        ? "Selecione um profissional para ver os serviços"
                        : "Buscar e selecionar serviços..."
                    }
                    disabled={!appointmentForm.professionalId || loadingServices}
                  />
                )}
              </div>
            )}
            {formErrors.services && (
              <Typography variant="small" className="text-status-error mt-2">
                {formErrors.services}
              </Typography>
            )}
          </div>
          
          {/* Notes */}
          <div className="mt-6">
            <Textarea
              label="Observações"
              value={appointmentForm.notes}
              onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-bg-primary border-bg-tertiary text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              containerProps={{ className: "text-text-primary" }}
              rows={3}
            />
          </div>
        </DialogBody>
        
        <DialogFooter className="border-t border-bg-tertiary">
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              onClick={closeModal}
              className="border-bg-tertiary text-text-secondary hover:bg-bg-tertiary"
              disabled={savingAppointment}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveAppointment}
              className="bg-accent-primary hover:bg-accent-primary/90 text-white"
              disabled={savingAppointment}
            >
              {savingAppointment ? (
                <div className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Salvando...
                </div>
              ) : (
                editingAppointment ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </div>
        </DialogFooter>
      </Dialog>

      {/* Inject scrollbar styles */}
      <style>{scrollbarStyles}</style>
    </div>
  );
};

export default DailySchedulePage;
