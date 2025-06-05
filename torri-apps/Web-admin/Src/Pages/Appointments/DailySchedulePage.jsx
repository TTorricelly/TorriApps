import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Button, Input, Spinner, Alert, Tooltip } from "@material-tailwind/react";
import {
  ArrowLeftIcon, ArrowRightIcon, CalendarDaysIcon, ExclamationTriangleIcon, LockClosedIcon,
  PencilIcon, TrashIcon
} from "@heroicons/react/24/solid";
import { getDailySchedule } from '../../Services/appointmentsApi'; // Assuming this path is correct

const DailySchedulePage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState({ professionals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // For professional search
  const [clientSearchTerm, setClientSearchTerm] = useState(''); // For client search
  const [currentTime, setCurrentTime] = useState(new Date());

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

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

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
        <div className="w-full sm:w-3/4 md:w-1/2 lg:w-1/3"> {/* Responsive width for client search */}
           <Input
              label="Buscar Cliente..."
              icon={<i className="fas fa-user-friends text-text-secondary" />}
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              className="bg-bg-primary border-bg-tertiary text-text-primary focus:border-accent-primary focus:ring-accent-primary text-xs sm:text-small"
              labelProps={{ className: "text-text-secondary text-xs sm:text-small" }}
              containerProps={{ className: "text-text-primary" }}
            />
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
        : filteredProfessionals.length === 0 && !searchTerm ? ( <Typography color="blue-gray" className="text-center py-l text-text-secondary text-small sm:text-body"> Nenhum profissional ativo para esta data. </Typography> )
        : filteredProfessionals.length === 0 && searchTerm ? ( <Typography color="blue-gray" className="text-center py-l text-text-secondary text-small sm:text-body"> Nenhum profissional encontrado para "{searchTerm}". </Typography> )
        : (
          <>
            <Typography variant="h2" color="blue-gray" className="mb-s sm:mb-m text-h3 sm:text-h2 text-text-primary"> {/* Responsive typography */}
              Horários
            </Typography>
            {filteredProfessionals.length > 0 && clientSearchTerm && !filteredProfessionals.some(p => p.appointments?.some(a => a.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()))) &&
             ( <Typography color="blue-gray" className="text-center py-m text-text-secondary text-small sm:text-body"> Nenhum agendamento encontrado para o cliente "{clientSearchTerm}". </Typography> )
            }
            <div className="overflow-x-auto rounded-lg border border-bg-tertiary custom-scrollbar"> {/* Added custom-scrollbar */}
              <div className="grid min-w-max">
                <div
                  className="grid sticky top-0 z-10 bg-bg-secondary shadow-sm"
                  style={{ gridTemplateColumns: `6rem repeat(${filteredProfessionals.length || 1}, minmax(10rem, 1fr))` }}
                >
                  <div className="p-xs sm:p-s border-r border-b border-bg-tertiary text-center">
                    <Typography variant="small" className="font-semibold text-text-primary text-xs sm:text-small">
                      Hora
                    </Typography>
                  </div>
                  {filteredProfessionals.map(prof => (
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

                {Array.from({ length: (20 - 8) * 2 + 1 }).map((_, slotIndex) => {
                  const hour = 8 + Math.floor(slotIndex / 2); /* ... */
                  const minute = slotIndex % 2 === 0 ? '00' : '30'; /* ... */
                  const timeString = `${String(hour).padStart(2, '0')}:${minute}`; /* ... */
                  const slotTimeInMinutes = hour * 60 + parseInt(minute); /* ... */
                  const now = currentTime; /* ... */
                  const nowTimeInMinutes = now.getHours() * 60 + now.getMinutes(); /* ... */

                  let timeCellClass = `p-xs sm:p-s border-r border-b border-bg-tertiary text-center h-full ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'}`;
                  let isCurrentSlot = false;
                  if (selectedDate.toDateString() === now.toDateString() && nowTimeInMinutes >= slotTimeInMinutes && nowTimeInMinutes < slotTimeInMinutes + 30) {
                    isCurrentSlot = true;
                    timeCellClass = `p-xs sm:p-s border-r border-b border-bg-tertiary text-center h-full bg-accent-primary/20 relative`;
                  }

                  return (
                    <div
                      key={timeString}
                      className="grid items-start"
                      style={{ gridTemplateColumns: `6rem repeat(${filteredProfessionals.length || 1}, minmax(10rem, 1fr))` }}
                    >
                      <div className={timeCellClass}>
                        {isCurrentSlot && <div className="absolute top-0 left-0 w-0.5 sm:w-1 h-full bg-accent-primary"></div>}
                        <Typography variant="small" className={`text-text-secondary text-xs sm:text-small ${isCurrentSlot ? 'font-bold text-accent-primary' : ''}`}>
                          {timeString}
                        </Typography>
                      </div>

                      {filteredProfessionals.map(prof => {
                        // Construct current slot's start datetime for comparisons
                        const slotStartDateTime = new Date(selectedDate);
                        slotStartDateTime.setHours(hour, parseInt(minute), 0, 0);

                        const appointmentInSlot = (prof.appointments || []).find(apt => {
                            const aptStart = new Date(apt.startTimeISO);
                            return aptStart.getTime() === slotStartDateTime.getTime();
                        });

                        const blockedSlotInSlot = (prof.blockedSlots || []).find(block => {
                            const blockStart = new Date(block.startTimeISO);
                            return blockStart.getTime() === slotStartDateTime.getTime();
                        });

                        let cardOpacity = 'opacity-100';
                        if (clientSearchTerm && appointmentInSlot) {
                          if (!appointmentInSlot.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase())) {
                            cardOpacity = 'opacity-30 hover:opacity-100 transition-opacity';
                          }
                        } else if (clientSearchTerm && !appointmentInSlot && !blockedSlotInSlot) {
                           // If there's an active client search and this slot is empty, it remains fully visible
                        }

                        if (appointmentInSlot) {
                          const appointmentSpans = Math.ceil(appointmentInSlot.duration / 30);
                          return (
                            <div
                              key={`${prof.id}-${timeString}-apt`}
                              className={`p-xs border-r border-b border-bg-tertiary relative ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'}`}
                              style={{ gridRow: `span ${appointmentSpans}`, zIndex: 5 }}
                            >
                              <Tooltip
                                interactive={true}
                                placement="top"
                                // CLAUDE: Tooltip styles - Adjusted padding from px-m py-s to px-s py-xs
                                className="border border-bg-tertiary bg-bg-secondary px-s py-xs shadow-card text-text-primary text-small rounded-card"
                                content={
                                  <div className="flex items-center gap-s"> {/* Use theme spacing 's' or 'xs' */}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); console.log(`Edit clicked for appointment ${appointmentInSlot.id}`)}}
                                      className="p-xs rounded-button hover:bg-bg-tertiary text-text-secondary hover:text-accent-primary transition-colors"
                                      title="Editar Agendamento"
                                    >
                                      <PencilIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); console.log(`Delete clicked for appointment ${appointmentInSlot.id}`)}}
                                      className="p-xs rounded-button hover:bg-bg-tertiary text-text-secondary hover:text-status-error transition-colors"
                                      title="Excluir Agendamento"
                                    >
                                      <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    </button>
                                  </div>
                                }
                              >
                                <div className={`bg-bg-secondary p-xs sm:p-s rounded-card shadow-sm h-full border-l-2 sm:border-l-4 border-accent-primary ${cardOpacity} cursor-default`}>
                                  <Typography variant="small" className="font-semibold text-accent-primary text-xs sm:text-body leading-tight sm:leading-normal truncate">
                                    {appointmentInSlot.clientName}
                                  </Typography>
                                  <Typography variant="caption" className="text-text-secondary block mb-xs text-xs sm:text-small truncate">
                                    {appointmentInSlot.startTime} - ({appointmentInSlot.duration} min) {/* Display formatted start time, duration already correct */}
                                  </Typography>
                                  <div className="flex flex-wrap gap-xs mt-xs">
                                    {appointmentInSlot.services.map((service, index) => (
                                      <span key={index} className="text-xs bg-accent-secondary/20 text-accent-secondary px-xs sm:px-s py-0.5 sm:py-xs rounded-full text-2xs sm:text-xs truncate">
                                        {service}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </Tooltip>
                            </div>
                          );
                        } else if (blockedSlotInSlot) {
                            const blockedSpans = Math.ceil(blockedSlotInSlot.duration / 30);
                            return (
                                <div
                                    key={`${prof.id}-${timeString}-blocked`}
                                    className={`p-xs border-r border-b border-bg-tertiary relative ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'}`}
                                    style={{ gridRow: `span ${blockedSpans}`, zIndex: 4 }}
                                >
                                    <Tooltip
                                      placement="top"
                                      className="border border-bg-tertiary bg-bg-secondary px-m py-s shadow-card text-text-primary text-small rounded-card" // CLAUDE: Tooltip styles
                                      content={
                                         <div className="w-64">
                                            <Typography className="font-semibold !text-text-primary text-body">
                                                Horário Bloqueado
                                            </Typography>
                                            <Typography variant="small" className="font-normal !text-text-secondary opacity-80 text-small">
                                                Profissional: {prof.name}
                                            </Typography>
                                            <Typography variant="small" className="font-normal !text-text-secondary opacity-80 text-small">
                                                Motivo: {blockedSlotInSlot.reason || 'N/A'}
                                            </Typography>
                                            <Typography variant="small" className="font-normal !text-text-secondary opacity-80 text-small">
                                                Horário: {new Date(blockedSlotInSlot.startTimeISO).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} - {new Date(blockedSlotInSlot.endTimeISO).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} ({blockedSlotInSlot.duration} min)
                                            </Typography>
                                        </div>
                                      }
                                    >
                                        <div className="bg-bg-tertiary/50 p-xs sm:p-s rounded-card h-full flex flex-col items-center justify-center text-text-tertiary cursor-not-allowed">
                                            <LockClosedIcon className="h-4 w-4 sm:h-5 md:h-6 md:w-6 mb-xs text-text-tertiary" />
                                            <Typography variant="small" className="font-medium text-center text-2xs sm:text-xs md:text-small">
                                                {blockedSlotInSlot.reason || "Bloqueado"}
                                            </Typography>
                                        </div>
                                    </Tooltip>
                                </div>
                            );
                        }

                        let isCoveredByAppointment = false;
                        if (!appointmentInSlot && !blockedSlotInSlot) { // Only check if cell isn't already taken by an item starting in this slot
                            for (const apt of (prof.appointments || [])) {
                                const aptStart = new Date(apt.startTimeISO);
                                const aptEnd = new Date(apt.endTimeISO);
                                if (aptStart < slotStartDateTime && slotStartDateTime < aptEnd) {
                                    isCoveredByAppointment = true;
                                    break;
                                }
                            }
                        }

                        let isCoveredByBlockedSlot = false;
                        if (!appointmentInSlot && !blockedSlotInSlot && !isCoveredByAppointment) { // Only check if not already covered
                            for (const block of (prof.blockedSlots || [])) {
                                const blockStart = new Date(block.startTimeISO);
                                const blockEnd = new Date(block.endTimeISO);
                                if (blockStart < slotStartDateTime && slotStartDateTime < blockEnd) {
                                    isCoveredByBlockedSlot = true;
                                    break;
                                }
                            }
                        }

                        if (isCoveredByAppointment || isCoveredByBlockedSlot) {
                          return ( <div key={`${prof.id}-${timeString}-covered`} className={`border-r border-b border-bg-tertiary ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'}`}></div> );
                        }

                        const emptySlotOpacity = clientSearchTerm ? 'opacity-30' : 'opacity-100';
                        // Render empty slot only if no appointment, no block, and not covered
                        if (!appointmentInSlot && !blockedSlotInSlot) {
                            return ( <div key={`${prof.id}-${timeString}-empty`} className={`p-xs border-r border-b border-bg-tertiary h-full ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'} hover:bg-bg-tertiary/50 transition-colors cursor-pointer ${emptySlotOpacity}`} title={`Disponível ${timeString} - ${prof.name}`} > </div> );
                        }
                        // If we reach here, it means an appointmentInSlot or blockedSlotInSlot was found but not rendered (e.g. due to other conditions)
                        // This case should ideally not be reached if the logic for rendering appointments/blocks is exhaustive.
                        // Fallback to an empty div to maintain grid structure, though this might hide unhandled items.
                        return <div key={`${prof.id}-${timeString}-unhandled`} className={`p-xs border-r border-b border-bg-tertiary h-full ${slotIndex % 2 === 0 ? 'bg-bg-primary' : 'bg-bg-secondary'} ${emptySlotOpacity}`}></div>;
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      {/* Inject scrollbar styles */}
      <style>{scrollbarStyles}</style>
    </div>
  );
};

export default DailySchedulePage;
