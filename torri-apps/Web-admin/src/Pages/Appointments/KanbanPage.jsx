import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Typography, Button, Spinner, Alert } from "@material-tailwind/react";
import AddServicesModal from '../../Components/AddServicesModal';
import CheckoutModal from '../../Components/CheckoutModal';
import { 
  getAppointmentGroups, 
  updateAppointmentGroupStatus, 
  createWalkInAppointment,
  addServicesToAppointmentGroup
} from '../../Services/appointmentsApi';
import { getClientDisplayName } from '../../Utils/clientUtils';
import {
  CalendarDaysIcon, 
  ExclamationTriangleIcon,
  UserPlusIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
  getFirstCollision,
  pointerWithin,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  CSS,
} from '@dnd-kit/utilities';


const KanbanPage = () => {
  // State management
  const [appointmentGroups, setAppointmentGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddServicesModal, setShowAddServicesModal] = useState(false);
  const [modalContext, setModalContext] = useState(null); // Context for modal (new vs add-to-existing)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutGroup, setCheckoutGroup] = useState(null);
  const [checkoutMinimized, setCheckoutMinimized] = useState(false);
  const [checkoutRefreshTrigger, setCheckoutRefreshTrigger] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [movingCard, setMovingCard] = useState(null); // Visual feedback for moving cards

  // Brazil timezone support - always use today's date for kanban (operational view)
  // Use useMemo to recalculate date when component updates (handles midnight transitions)
  const todayDate = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit'
    }).split('/').reverse().join('-'); // Convert DD/MM/YYYY to YYYY-MM-DD format
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayDate);

  // Service data now handled by global context - no local state needed
  
  // Service data loader following DDD patterns (using singleton directly to avoid re-renders)
  // Note: useServiceDataLoader() creates new object each render, causing infinite loops

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Kanban columns configuration - matches mobile version
  const columns = [
    {
      id: 'SCHEDULED',
      title: 'Agendado',
      color: 'bg-blue-500/20 border-blue-500',
      icon: CalendarDaysIcon
    },
    {
      id: 'CONFIRMED',
      title: 'Confirmado',
      color: 'bg-status-success/20 border-status-success',
      icon: CheckCircleIcon
    },
    {
      id: 'WALK_IN',
      title: 'Sem Agendamento',
      color: 'bg-accent-secondary/20 border-accent-secondary',
      icon: UserPlusIcon
    },
    {
      id: 'ARRIVED',
      title: 'Chegou',
      color: 'bg-status-warning/20 border-status-warning',
      icon: UserIcon
    },
    {
      id: 'IN_SERVICE',
      title: 'Em Atendimento',
      color: 'bg-accent-primary/20 border-accent-primary',
      icon: ClockIcon
    },
    {
      id: 'READY_TO_PAY',
      title: 'Pronto p/ Pagar',
      color: 'bg-pink-500/20 border-pink-500',
      icon: CurrencyDollarIcon
    },
    {
      id: 'COMPLETED',
      title: 'Finalizado',
      color: 'bg-gray-500/20 border-gray-500',
      icon: CheckCircleIcon
    }
  ];

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  // Custom collision detection that prioritizes columns over cards
  const customCollisionDetection = (args) => {
    // First, check for collisions with droppable columns using pointerWithin
    const pointerCollisions = pointerWithin(args);
    
    // Filter to only include column IDs (not card IDs)
    const columnCollisions = pointerCollisions.filter(collision => {
      return columns.some(col => col.id === collision.id);
    });
    
    if (columnCollisions.length > 0) {
      return columnCollisions;
    }
    
    // Fallback to closest corners for any remaining collisions
    return closestCorners(args);
  };

  // Load appointment groups function
  const loadAppointmentGroups = useCallback(async () => {
    try {
      setError(null);
      const params = {
        date_filter: selectedDate
      };
      const data = await getAppointmentGroups(params);
      setAppointmentGroups(data || []);
    } catch (err) {
      console.error('[KanbanBoard] Error loading appointment groups:', err);
      setError('Erro ao carregar agendamentos. Tente novamente.');
      // Don't fallback to mock data - let user see the real error
      setAppointmentGroups([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Service preloading is now handled by ServiceDataContext automatically
  // No manual preloading needed - data is available globally

  // Load appointment groups on mount and date changes
  useEffect(() => {
    loadAppointmentGroups();
  }, [loadAppointmentGroups]);

  // Service preloading is now handled by ServiceDataContext automatically
  // No useEffect needed for service preloading

  // Keyboard shortcuts (A, C, ESC)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle shortcuts if no modal is open and not typing in input
      if (showAddServicesModal || showCheckoutModal || 
          event.target.tagName === 'INPUT' || 
          event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'a':
          event.preventDefault();
          handleAddServices();
          break;
        case 'c':
          event.preventDefault();
          if (selectedCard && selectedCard.status !== 'COMPLETED') {
            handleMoveToColumn('COMPLETED');
          }
          break;
        case 'escape':
          event.preventDefault();
          if (showActionMenu) {
            handleBackgroundTap();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showAddServicesModal, showCheckoutModal, showActionMenu, selectedCard]);

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointmentGroups();
    setRefreshing(false);
  }, [loadAppointmentGroups]);

  // Format date helper
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('pt-BR')
    };
  };

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Handle card tap (mobile) or click (desktop) - touch-friendly
  const handleCardTap = (group) => {
    if (selectedCard?.id === group.id) {
      // If already selected, toggle action menu
      setShowActionMenu(!showActionMenu);
    } else {
      // Select new card and show action menu
      setSelectedCard(group);
      setShowActionMenu(true);
      
      // Add haptic feedback for mobile devices
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  // Handle background tap to close selected card and action menu
  const handleBackgroundTap = () => {
    setSelectedCard(null);
    setShowActionMenu(false);
  };

  // Move card to specific column (shared logic)
  const moveCardToColumn = async (groupId, newStatus) => {
    // Find the group being moved
    const group = appointmentGroups.find(g => g.id === groupId);
    if (!group || group.status === newStatus) return;

    // Show immediate visual feedback
    setMovingCard({ cardId: groupId, targetColumn: newStatus });

    try {
      // Special handling for Ready to Pay - open checkout modal
      if (newStatus === 'READY_TO_PAY') {
        setCheckoutGroup(group);
        setShowCheckoutModal(true);
        setMovingCard(null); // Clear moving state since we're opening modal
        return; // Don't update status yet, wait for payment completion
      }
      
      // Update the status via API
      await updateAppointmentGroupStatus(groupId, newStatus);
      
      // Update local state optimistically
      const updatedGroups = appointmentGroups.map(g => 
        g.id === groupId 
          ? { ...g, status: newStatus }
          : g
      );

      setAppointmentGroups(updatedGroups);
      showToast(`${getClientDisplayName(group, 'card')} movido para ${columns.find(c => c.id === newStatus)?.title}`);
      
    } catch (error) {
      console.error('[KanbanBoard] Error updating appointment status:', error);
      showToast('Erro ao atualizar status do agendamento. Tente novamente.', 'error');
      // Reload data to sync with server
      loadAppointmentGroups();
    } finally {
      // Clear moving state
      setMovingCard(null);
    }
  };

  // Handle moving card to specific column from action menu
  const handleMoveToColumn = async (targetStatus) => {
    if (!selectedCard || targetStatus === selectedCard.status) return;
    
    // Close action menu immediately for better UX
    setShowActionMenu(false);
    
    try {
      await moveCardToColumn(selectedCard.id, targetStatus);
      
      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
      
    } catch (error) {
      console.error('[KanbanBoard] Error moving card:', error);
      
      // Error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      showToast('Erro ao mover agendamento. Tente novamente.', 'error');
    } finally {
      setSelectedCard(null);
    }
  };

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Handle drag over
  const handleDragOver = (event) => {
    setOverId(event.over?.id || null);
  };

  // Handle drag end with API call
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const groupId = active.id;
    const newStatus = over.id;
    
    // Debug logging
    console.log('Drag end - groupId:', groupId, 'newStatus:', newStatus);
    
    // Validate that newStatus is a valid column ID
    const validColumn = columns.find(c => c.id === newStatus);
    if (!validColumn) {
      console.error('Invalid drop target. Expected column ID, got:', newStatus);
      setActiveId(null);
      setOverId(null);
      return;
    }
    
    try {
      await moveCardToColumn(groupId, newStatus);
    } finally {
      setActiveId(null);
      setOverId(null);
    }
  };

  // Handle add services (new appointment)
  const handleAddServices = () => {
    setModalContext(null); // Clear context for new appointment
    setShowAddServicesModal(true);
  };

  // Handle add services to existing appointment
  const handleAddServicesToExisting = (group) => {
    // Temporarily hide checkout modal to avoid z-index conflicts
    const wasCheckoutOpen = showCheckoutModal;
    if (wasCheckoutOpen) {
      setShowCheckoutModal(false);
    }
    
    setModalContext({
      mode: 'add-to-existing',
      targetGroup: group,
      wasCheckoutOpen: wasCheckoutOpen, // Remember if checkout was open
      checkoutGroup: checkoutGroup // Remember the checkout group
    });
    setShowAddServicesModal(true);
  };

  // Handle add services submission
  const handleAddServicesSubmit = async (appointmentData) => {
    let updatedGroup = null; // Declare at function scope
    
    try {
      if (modalContext?.mode === 'add-to-existing') {
        // Add services to existing appointment group
        const { targetGroup } = modalContext;
        
        const groupId = targetGroup?.existingGroupId || targetGroup?.id;
        if (!groupId) {
          throw new Error('Target group ID is missing. Cannot add services to undefined group.');
        }
        
        updatedGroup = await addServicesToAppointmentGroup(groupId, appointmentData.services);
        
        // Update existing group in local state (optimistic update)
        setAppointmentGroups(prev => 
          prev.map(group => 
            group.id === updatedGroup.id ? updatedGroup : group
          )
        );
        
        showToast('Serviços adicionados com sucesso!');
        
        // Refresh data after a short delay to ensure consistency
        setTimeout(() => {
          loadAppointmentGroups();
        }, 100);
        
      } else {
        // Create new walk-in appointment
        console.log('Creating walk-in appointment:', appointmentData);
        
        const newGroup = await createWalkInAppointment(appointmentData);
        
        // Add to local state
        setAppointmentGroups([...appointmentGroups, newGroup]);
        showToast(`Serviços adicionados para ${appointmentData.client?.name || appointmentData.client_name || 'Cliente'}`);
        
        // Refresh data to ensure consistency
        await loadAppointmentGroups();
      }
      
      // Reopen checkout modal if it was previously open
      if (modalContext?.wasCheckoutOpen && modalContext?.checkoutGroup) {
        // Use the updated group instead of the old cached reference
        const updatedGroupForCheckout = modalContext.mode === 'add-to-existing' ? updatedGroup : modalContext.checkoutGroup;
        setCheckoutGroup(updatedGroupForCheckout);
        setCheckoutRefreshTrigger(prev => prev + 1); // Force refresh
        setShowCheckoutModal(true);
      }
      
      // Clear modal context
      setModalContext(null);
      
    } catch (error) {
      console.error('Error adding services:', error);
      showToast(error.message || 'Erro ao adicionar serviços', 'error');
    }
  };

  // Handle payment completion
  const handlePaymentComplete = async (paymentData) => {
    try {
      console.log('Processing payment:', paymentData);
      
      // First update status to READY_TO_PAY
      await updateAppointmentGroupStatus(checkoutGroup.id, 'READY_TO_PAY');
      
      // Then move to COMPLETED after payment
      await updateAppointmentGroupStatus(checkoutGroup.id, 'COMPLETED');
      
      // Update local state
      const updatedGroups = appointmentGroups.map(g => 
        g.id === checkoutGroup.id 
          ? { ...g, status: 'COMPLETED' }
          : g
      );
      
      setAppointmentGroups(updatedGroups);
      showToast(`Pagamento processado para ${getClientDisplayName(checkoutGroup, 'card')}!`);
      
      // Refresh data to ensure consistency
      await loadAppointmentGroups();
      
    } catch (error) {
      console.error('Error processing payment:', error);
      showToast(error.message || 'Erro ao processar pagamento', 'error');
    }
  };

  // Handle checkout minimization
  const handleMinimizeCheckout = () => {
    setCheckoutMinimized(true);
  };

  // Handle adding groups to checkout (drag & drop)
  const handleGroupAddToCheckout = (group) => {
    try {
      console.log('Adding group to checkout:', group);
      // TODO: Implement group merging logic
      showToast(`Agendamento de ${getClientDisplayName(group, 'card')} adicionado ao checkout!`);
    } catch (error) {
      console.error('Error adding group to checkout:', error);
      showToast('Erro ao adicionar agendamento ao checkout', 'error');
    }
  };

  // Droppable column component
  const DroppableColumn = ({ column, children }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: column.id,
    });

    return (
      <div
        ref={setNodeRef}
        className={`
          flex-1 min-h-0 p-s rounded-card border-2 border-dashed transition-colors relative overflow-y-auto
          ${isOver 
            ? 'border-accent-primary bg-accent-primary/5' 
            : 'border-bg-tertiary'
          }
        `}
      >
        {/* Invisible drop zone overlay that covers the entire column */}
        <div 
          className="absolute inset-0 z-0" 
        />
        
        {/* Content with higher z-index */}
        <div className="relative z-10 space-y-s">
          {children}
        </div>
      </div>
    );
  };

  // Draggable card component (no sorting within columns)
  const DraggableCard = ({ group }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ 
      id: group.id,
      disabled: false // Keep dragging enabled
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
      >
        {renderAppointmentCard(group, isDragging)}
      </div>
    );
  };

  // Render appointment card
  const renderAppointmentCard = (group, isDragging = false) => {
    const { time } = formatDateTime(group.start_time);
    const isSelected = selectedCard?.id === group.id;
    const isMoving = movingCard?.cardId === group.id;
    
    // Parse service names to create chips
    const services = group.service_names ? group.service_names.split(', ') : [];
    
    return (
      <div
        className={`
          bg-bg-secondary border border-bg-tertiary rounded-card p-m mb-s shadow-card
          ${isSelected ? 'ring-2 ring-accent-primary shadow-card-hover' : ''}
          ${isDragging ? 'shadow-card-hover rotate-1' : ''}
          ${isMoving ? 'opacity-50 scale-95 pointer-events-none' : ''}
          transition-all duration-normal cursor-pointer hover:shadow-card-hover
          touch-manipulation select-none
          active:scale-98 hover:scale-101
          md:hover:shadow-card-hover
        `}
        onClick={() => !isMoving && handleCardTap(group)}
      >
        {/* Moving overlay */}
        {isMoving && (
          <div className="absolute inset-0 bg-white bg-opacity-50 rounded-card flex items-center justify-center z-10">
            <div className="flex items-center space-x-2 bg-accent-primary text-white px-3 py-2 rounded-full shadow-lg">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Movendo...</span>
            </div>
          </div>
        )}
        
        {/* Card Header */}
        <div className="flex items-center justify-between mb-s">
          <Typography variant="small" className="font-semibold text-text-primary truncate">
            {getClientDisplayName(group, 'card')}
          </Typography>
          <div className="flex items-center gap-xs">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleAddServicesToExisting(group);
              }}
              className="text-accent-primary hover:text-accent-primary/80 transition-colors p-xs rounded-button hover:bg-accent-primary/10"
              title="Adicionar Serviços"
            >
              <UserPlusIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleCardTap(group);
              }}
              className="text-text-secondary hover:text-text-primary transition-colors p-xs rounded-button hover:bg-bg-tertiary"
              title="Mover para outra coluna"
            >
              <ChevronDownIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Service Chips */}
        <div className="flex flex-wrap gap-xs mb-s">
          {services.slice(0, 2).map((service, index) => (
            <span
              key={index}
              className="bg-accent-primary/20 text-accent-primary px-s py-xs rounded-full text-xs font-medium"
            >
              {service.trim()}
            </span>
          ))}
          {services.length > 2 && (
            <span className="text-text-tertiary text-xs px-s py-xs">
              +{services.length - 2}
            </span>
          )}
        </div>

        {/* Card Details */}
        <div className="space-y-xs">
          <div className="flex items-center justify-between text-small text-text-secondary">
            <span className="flex items-center gap-xs">
              <ClockIcon className="h-3 w-3" />
              {time} • {group.total_duration_minutes}min
            </span>
            <span className="font-semibold text-accent-secondary">
              {formatPrice(group.total_price)}
            </span>
          </div>
        </div>

        {/* Expanded Details (Mobile) */}
        {isSelected && (
          <div className="mt-m pt-m border-t border-bg-tertiary md:hidden">
            <div className="space-y-s">
              <div className="flex justify-between">
                <span className="text-small text-text-secondary">Status:</span>
                <span className="text-small text-text-primary font-medium">
                  {columns.find(c => c.id === group.status)?.title}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-small text-text-secondary">Início:</span>
                <span className="text-small text-text-primary">
                  {formatDateTime(group.start_time).time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-small text-text-secondary">Fim:</span>
                <span className="text-small text-text-primary">
                  {formatDateTime(group.end_time).time}
                </span>
              </div>
            </div>
            
            {/* Action Buttons - Touch Optimized */}
            <div className="flex gap-s mt-m">
              <Button
                size="sm"
                variant="outlined"
                className="flex-1 border-accent-primary text-accent-primary hover:bg-accent-primary/10 min-h-[44px] touch-manipulation"
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement edit functionality
                  showToast('Editar agendamento - em desenvolvimento');
                }}
              >
                Editar
              </Button>
              
              <Button
                size="sm"
                className="flex-1 bg-status-success hover:bg-status-success/90 text-white min-h-[44px] touch-manipulation"
                onClick={(e) => {
                  e.stopPropagation();
                  moveCardToColumn(group.id, 'COMPLETED');
                }}
              >
                Concluir
              </Button>
              
              {group.status !== 'READY_TO_PAY' && (
                <Button
                  size="sm"
                  className="flex-1 bg-accent-secondary hover:bg-accent-secondary/90 text-white min-h-[44px] touch-manipulation"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveCardToColumn(group.id, 'READY_TO_PAY');
                  }}
                >
                  Pagar
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Group appointments by status
  const groupedAppointments = columns.reduce((acc, column) => {
    acc[column.id] = appointmentGroups.filter(group => group.status === column.id);
    return acc;
  }, {});

  return (
    <div 
      className="bg-bg-primary min-h-screen p-xs sm:p-s md:p-m text-text-primary"
      onClick={handleBackgroundTap}
    >

      {/* Error Alert */}
      {error && (
        <Alert
          color="red"
          icon={<ExclamationTriangleIcon className="h-5 w-5" />}
          className="mb-l bg-status-error/20 text-status-error p-m rounded-card"
        >
          {error}
        </Alert>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner className="h-12 w-12 text-accent-primary" />
          </div>
        ) : (
          <div className="flex gap-m overflow-x-auto pb-s h-[calc(100vh-2rem)]">
            {columns.map((column) => (
              <div key={column.id} className="flex flex-col min-w-[280px] w-[280px] flex-shrink-0 h-full">
                {/* Column Header */}
                <div className="bg-bg-secondary rounded-card p-m mb-s shadow-card border-l-4 border-accent-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-s">
                      <column.icon className="h-5 w-5 text-accent-primary" />
                      <Typography variant="h6" className="font-semibold text-text-primary text-small">
                        {column.title}
                      </Typography>
                    </div>
                    
                    {/* Group Count */}
                    <span className="bg-accent-primary/20 text-accent-primary px-s py-xs rounded-full text-xs font-medium">
                      {groupedAppointments[column.id].length}
                    </span>
                  </div>
                </div>

                {/* Droppable Column */}
                <DroppableColumn column={column}>
                  <SortableContext
                    items={groupedAppointments[column.id].map(g => g.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {groupedAppointments[column.id].map((group) => (
                      <DraggableCard key={group.id} group={group} />
                    ))}
                    
                    {/* Empty State */}
                    {groupedAppointments[column.id].length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 text-text-tertiary">
                        <column.icon className="h-8 w-8 mb-s opacity-50" />
                      </div>
                    )}
                  </SortableContext>
                </DroppableColumn>
              </div>
            ))}
          </div>
        )}
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activeId ? (
            <div className="rotate-1 shadow-card-hover">
              {renderAppointmentCard(
                appointmentGroups.find(g => g.id === activeId),
                true
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Services Modal */}
      <AddServicesModal
        open={showAddServicesModal}
        onClose={() => {
          // Reopen checkout modal if it was previously open
          if (modalContext?.wasCheckoutOpen && modalContext?.checkoutGroup) {
            // Find the most up-to-date group from current state
            const currentGroup = appointmentGroups.find(g => g.id === modalContext.checkoutGroup.id);
            setCheckoutGroup(currentGroup || modalContext.checkoutGroup);
            setCheckoutRefreshTrigger(prev => prev + 1); // Force refresh
            setShowCheckoutModal(true);
          }
          
          setShowAddServicesModal(false);
          setModalContext(null);
        }}
        onAddServices={handleAddServicesSubmit}
        modalContext={modalContext}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        open={showCheckoutModal}
        onClose={() => {
          setShowCheckoutModal(false);
          setCheckoutGroup(null);
          setCheckoutMinimized(false);
        }}
        appointmentGroup={checkoutGroup}
        onPaymentComplete={handlePaymentComplete}
        isMinimized={checkoutMinimized}
        onMinimize={handleMinimizeCheckout}
        onGroupAdd={handleGroupAddToCheckout}
        onAddMoreServices={handleAddServicesToExisting}
        refreshTrigger={checkoutRefreshTrigger}
      />

      {/* Floating Action Menu - Mobile Touch Optimized */}
      {selectedCard && showActionMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center p-m" onClick={handleBackgroundTap}>
          <div className="bg-bg-secondary rounded-card shadow-card-hover border border-bg-tertiary w-full max-w-xs flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-m pb-s flex-shrink-0">
              <div className="text-center">
                <Typography variant="h6" className="text-text-primary mb-xs truncate">
                  {getClientDisplayName(selectedCard, 'card') || 'Cliente Sem Agendamento'}
                </Typography>
                <Typography variant="small" className="text-text-secondary">
                  Mover para:
                </Typography>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-m pb-s">
              <div className="space-y-s">
                {columns
                  .filter(column => column.id !== selectedCard.status)
                  .map(column => {
                    const IconComponent = column.icon;
                    const groupCount = groupedAppointments[column.id]?.length || 0;
                    
                    return (
                      <button
                        key={column.id}
                        onClick={() => handleMoveToColumn(column.id)}
                        className={`w-full p-s rounded-button border text-left transition-all touch-manipulation min-h-[44px]
                          ${column.color} border-opacity-30 active:scale-95 hover:shadow-card`}
                      >
                        <div className="flex items-center space-x-s">
                          <IconComponent className="h-5 w-5 text-text-secondary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <Typography variant="small" className="text-text-primary font-medium truncate">
                              {column.title}
                            </Typography>
                            <Typography variant="small" className="text-text-tertiary">
                              {groupCount} agendamento(s)
                            </Typography>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-m pt-s flex-shrink-0 border-t border-bg-tertiary">
              <button
                onClick={handleBackgroundTap}
                className="w-full p-s text-text-secondary text-center touch-manipulation text-small hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-m left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className={`
            flex items-center space-x-s px-l py-m rounded-card shadow-card backdrop-blur-sm border max-w-sm
            ${toast.type === 'success' 
              ? 'bg-status-success/20 text-status-success border-status-success/30' 
              : 'bg-status-error/20 text-status-error border-status-error/30'
            }
          `}>
            {toast.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            ) : (
              <XCircleIcon className="h-5 w-5 flex-shrink-0" />
            )}
            <Typography variant="small" className="font-medium">
              {toast.message}
            </Typography>
          </div>
        </div>
      )}

      {/* Floating Action Button - Add Services */}
      <button
        onClick={handleAddServices}
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent-primary hover:bg-accent-primary/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50 active:scale-95"
        title="Adicionar Serviços (Atalho: A)"
      >
        <UserPlusIcon className="h-6 w-6" />
      </button>
    </div>
  );
};

export default KanbanPage;