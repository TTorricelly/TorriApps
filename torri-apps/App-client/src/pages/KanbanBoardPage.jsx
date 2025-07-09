/**
 * KanbanBoardPage Component
 * Front-Desk Kanban Board with Embedded Checkout
 * 
 * Features:
 * - Drag & drop between columns
 * - Status management: Scheduled → Confirmed → Walk-in → Arrived → In Service → Ready to Pay → Completed
 * - Embedded checkout drawer
 * - Keyboard shortcuts (A, C, ESC)
 * - Responsive design
 * - Real-time status updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus,
  Clock,
  DollarSign,
  Timer,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  UserCheck,
  Play,
  CreditCard,
  CheckCircle2,
  CalendarCheck,
  Users,
  Check,
  X,
  UserPlus
} from 'lucide-react';

// Import services 
import { getAppointmentGroups, updateAppointmentGroupStatus } from '../services/appointmentService';
import { getCategories, getServicesByCategory } from '../services/categoryService';
import { useAuthStore } from '../stores/authStore';

// Import components
import CheckoutDrawer from '../components/CheckoutDrawer';
import WalkInModal from '../components/WalkInModal';
import ProfessionalBottomNavigation from '../components/ProfessionalBottomNavigation';

// Kanban columns configuration following the required flow
const KANBAN_COLUMNS = [
  { id: 'SCHEDULED', title: 'Agendado', status: 'SCHEDULED', color: 'bg-blue-50 border-blue-200', icon: Calendar },
  { id: 'CONFIRMED', title: 'Confirmado', status: 'CONFIRMED', color: 'bg-green-50 border-green-200', icon: CalendarCheck }, 
  { id: 'WALK_IN', title: 'Sem Agendamento', status: 'WALK_IN', color: 'bg-purple-50 border-purple-200', icon: Users },
  { id: 'ARRIVED', title: 'Chegou', status: 'ARRIVED', color: 'bg-yellow-50 border-yellow-200', icon: UserCheck },
  { id: 'IN_SERVICE', title: 'Em Atendimento', status: 'IN_SERVICE', color: 'bg-orange-50 border-orange-200', icon: Play },
  { id: 'READY_TO_PAY', title: 'Pronto p/ Pagar', status: 'READY_TO_PAY', color: 'bg-pink-50 border-pink-200', icon: CreditCard },
  { id: 'COMPLETED', title: 'Finalizado', status: 'COMPLETED', color: 'bg-gray-50 border-gray-200', icon: CheckCircle2 }
];

const KanbanBoardPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  
  // State management
  const [appointmentGroups, setAppointmentGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Always use today's date for kanban - this is an operational view, not planning
  // Use Brazil São Paulo timezone for correct local date
  const todayDate = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit'
  }).split('/').reverse().join('-'); // Convert DD/MM/YYYY to YYYY-MM-DD format
  
  // Helper function to determine the correct dashboard path based on user role
  const getDashboardPath = () => {
    if (!user) return '/';
    
    switch (user.role) {
      case 'PROFISSIONAL':
      case 'ATENDENTE':
      case 'GESTOR':
        return '/professional/dashboard';
      case 'CLIENTE':
        return '/dashboard';
      default:
        return '/';
    }
  };
  
  // Card selection state for tap-to-move pattern
  const [selectedCard, setSelectedCard] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [movingCard, setMovingCard] = useState(null);
  
  // Checkout drawer state
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [checkoutMinimized, setCheckoutMinimized] = useState(false);
  const [checkoutGroups, setCheckoutGroups] = useState([]); // For merging multiple groups
  
  // Add services modal state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [modalContext, setModalContext] = useState(null); // Context for modal (new vs add-to-existing)
  
  // Preloaded services state (silent background loading)
  const [preloadedServices, setPreloadedServices] = useState(null);
  
  // Toast notification state
  const [toast, setToast] = useState(null);
  
  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    // Auto-dismiss after 4 seconds
    setTimeout(() => setToast(null), 4000);
  };
  
  
  
  // Load appointment groups and preload services on mount and auth changes
  useEffect(() => {
    if (isAuthenticated) {
      loadAppointmentGroups();
      preloadServices();
    }
  }, [isAuthenticated]);
  
  // Silent service preloading for better walk-in UX
  const preloadServices = useCallback(async () => {
    try {
      const data = await getCategories();
      const allServices = [];
      
      // Load all services from all categories (same logic as WalkInModal)
      if (data && Array.isArray(data)) {
        for (const category of data) {
          const categoryServices = await getServicesByCategory(category.id);
          allServices.push(...categoryServices.map(service => ({ ...service, category_name: category.name })));
        }
      }
      
      setPreloadedServices({
        categories: data,
        services: allServices
      });
      
      
    } catch (err) {
      // Silent failure - don't show errors to user for background loading
    }
  }, []);
  
  // Load appointment groups function - always for today
  const loadAppointmentGroups = useCallback(async () => {
    try {
      setError(null);
      const params = {
        date_filter: todayDate
      };
      const data = await getAppointmentGroups(params);
      setAppointmentGroups(data || []);
    } catch (err) {
      setError('Erro ao carregar agendamentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, [todayDate]);
  
  // Refresh data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointmentGroups();
    setRefreshing(false);
  }, [loadAppointmentGroups]);
  
  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  
  // Format duration 
  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '-';
  };
  
  // Format date and time
  const formatDateTime = (startTime) => {
    try {
      const date = new Date(startTime);
      return {
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
    } catch (error) {
      return { date: '-', time: '-' };
    }
  };
  
  // Get groups for specific column
  const getGroupsForColumn = (columnStatus) => {
    return appointmentGroups.filter(group => group.status === columnStatus);
  };
  
  
  // Move card to column (shared function for both drag and touch)
  const moveCardToColumn = async (item, targetColumnId) => {
    try {
      // Special handling for Ready to Pay - open checkout drawer
      if (targetColumnId === 'READY_TO_PAY') {
        setCheckoutGroups([item]);
        setCheckoutDrawerOpen(true);
        setCheckoutMinimized(false);
        // Close action menu to prevent interference
        setSelectedCard(null);
        setShowActionMenu(false);
      }
      
      // Update the status
      await updateAppointmentGroupStatus(item.id, targetColumnId);
      
      // Update local state optimistically
      setAppointmentGroups(prev => 
        prev.map(group => 
          group.id === item.id 
            ? { ...group, status: targetColumnId }
            : group
        )
      );
      
    } catch (error) {
      showToast('Erro ao atualizar status do agendamento. Tente novamente.', 'error');
      // Optionally reload data to sync with server
      loadAppointmentGroups();
    }
  };
  
  // Card tap handlers for mobile interaction
  const handleCardTap = (group) => {
    if (selectedCard?.id === group.id) {
      // If already selected, toggle action menu
      setShowActionMenu(!showActionMenu);
    } else {
      // Select new card and show action menu
      setSelectedCard(group);
      setShowActionMenu(true);
      
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };
  
  // Close action menu when tapping outside
  const handleBackgroundTap = () => {
    setSelectedCard(null);
    setShowActionMenu(false);
  };
  
  // Move card to specific column
  const handleMoveToColumn = async (targetColumnId) => {
    if (!selectedCard || targetColumnId === selectedCard.status) return;
    
    // Show immediate feedback
    setMovingCard({ cardId: selectedCard.id, targetColumn: targetColumnId });
    
    // Close action menu immediately for better UX
    setShowActionMenu(false);
    
    try {
      await moveCardToColumn(selectedCard, targetColumnId);
      
      // Success haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([30, 10, 30]);
      }
      
    } catch (error) {
      
      // Error haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      
      // Show error message with toast
      showToast('Erro ao mover agendamento. Tente novamente.', 'error');
    } finally {
      // Clear moving state and selection
      setMovingCard(null);
      setSelectedCard(null);
    }
  };
  
  
  
  // Open checkout for group
  const openCheckoutForGroup = (group) => {
    setCheckoutGroups([group]);
    setCheckoutDrawerOpen(true);
    setCheckoutMinimized(false);
    // Close action menu to prevent interference
    setSelectedCard(null);
    setShowActionMenu(false);
  };
  
  // Close checkout drawer
  const closeCheckoutDrawer = () => {
    setCheckoutDrawerOpen(false);
    setCheckoutMinimized(false);
    setCheckoutGroups([]);
  };
  
  // Minimize checkout drawer
  const minimizeCheckoutDrawer = () => {
    setCheckoutMinimized(true);
  };
  
  // Add new services (from kanban)
  const handleAddWalkIn = () => {
    setModalContext(null); // Clear context for new appointment
    setWalkInModalOpen(true);
  };
  
  // Handle walk-in created or services added
  const handleWalkInCreated = (appointmentGroupData) => {
    if (modalContext?.mode === 'add-to-existing') {
      // Update existing group in local state (optimistic update)
      setAppointmentGroups(prev => 
        prev.map(group => 
          group.id === appointmentGroupData.id ? appointmentGroupData : group
        )
      );
      
      // Also update checkout groups if the updated group is in checkout
      setCheckoutGroups(prev => 
        prev.map(group => 
          group.id === appointmentGroupData.id ? appointmentGroupData : group
        )
      );
      
      // Show success message
      showToast('Serviços adicionados com sucesso!', 'success');
      
      // Refresh data from server to ensure consistency
      setTimeout(() => {
        loadAppointmentGroups();
      }, 100);
    } else {
      // Add new group to local state
      setAppointmentGroups(prev => [...prev, appointmentGroupData]);
    }
    setWalkInModalOpen(false);
  };
  
  // Handle group add to checkout (from drag and drop)
  const handleGroupAddToCheckout = (group) => {
    if (!checkoutGroups.some(g => g.id === group.id)) {
      setCheckoutGroups(prev => [...prev, group]);
    }
  };
  
  // Handle payment completion
  const handlePaymentComplete = (groups) => {
    // Mark all groups as completed
    const groupIds = groups.map(g => g.id);
    setAppointmentGroups(prev => 
      prev.map(group => 
        groupIds.includes(group.id) 
          ? { ...group, status: 'COMPLETED' }
          : group
      )
    );
    
    // Show modern toast notification instead of alert
    const message = groups.length === 1 
      ? 'Pagamento processado com sucesso!' 
      : `${groups.length} pagamentos processados com sucesso!`;
    showToast(message, 'success');
    
    // Close checkout drawer
    setCheckoutDrawerOpen(false);
    setCheckoutGroups([]);
  };
  
  // Handle adding more services from checkout context
  const handleAddMoreServicesFromCheckout = (context) => {
    setModalContext(context); // Set context for modal
    setWalkInModalOpen(true); // Open modal
  };
  
  // Render appointment card
  const renderAppointmentCard = (group) => {
    const { time } = formatDateTime(group.start_time);
    const isSelected = selectedCard?.id === group.id;
    const isMoving = movingCard?.cardId === group.id;
    
    return (
      <div
        key={group.id}
        onClick={(e) => {
          e.stopPropagation();
          if (!isMoving) handleCardTap(group);
        }}
        className={`relative bg-white rounded-xl shadow-sm border p-4 transition-all touch-manipulation select-none cursor-pointer
          ${isSelected ? 'ring-2 ring-pink-500 ring-opacity-50 shadow-lg scale-105' : 'active:scale-95'}
          ${group.status === 'READY_TO_PAY' ? 'border-pink-300 bg-gradient-to-br from-pink-25 to-pink-50' : 'border-gray-200'}
          ${isMoving ? 'opacity-50 scale-95 pointer-events-none' : ''}
        `}
        tabIndex={0}
        role="button"
        aria-label={`Agendamento para ${group.client_name || 'Cliente'}, ${group.service_names || 'Serviços'}`}
      >
        {/* Client name and price */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-base truncate flex-1 mr-2">
            {group.client_name || 'Cliente Sem Agendamento'}
          </h4>
          {group.status === 'READY_TO_PAY' && (
            <span className="text-pink-600 font-bold text-base bg-white px-3 py-1.5 rounded-lg shadow-sm">
              {formatPrice(group.total_price)}
            </span>
          )}
        </div>
        
        {/* Services */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-2">
            {group.service_names?.split(',').map((service, index) => (
              <span 
                key={index}
                className="inline-block bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full font-medium"
              >
                {service.trim()}
              </span>
            )) || (
              <span className="text-gray-500 text-sm italic">Nenhum serviço</span>
            )}
          </div>
        </div>
        
        {/* Time and duration */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <Clock size={16} className="text-gray-400" />
            <span className="font-medium">{time}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Timer size={16} className="text-gray-400" />
            <span className="font-medium">{formatDuration(group.total_duration_minutes)}</span>
          </div>
        </div>
        
        {/* Price preview (grey until Ready to Pay) */}
        {group.status !== 'READY_TO_PAY' && group.total_price && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-400 font-medium">
              {formatPrice(group.total_price)}
            </span>
          </div>
        )}
        
        {/* Moving indicator */}
        {isMoving && (
          <div className="absolute inset-0 bg-white bg-opacity-90 rounded-xl flex items-center justify-center">
            <div className="flex items-center space-x-2 text-pink-600">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm font-medium">Movendo...</span>
            </div>
          </div>
        )}
        
        {/* Ready to pay - Mobile-friendly checkout button */}
        {group.status === 'READY_TO_PAY' && !isMoving && (
          <div className="mt-3 pt-2 border-t border-pink-200">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent card tap
                openCheckoutForGroup(group);
              }}
              className="w-full py-2.5 px-4 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 text-white rounded-lg font-medium text-sm transition-colors touch-manipulation flex items-center justify-center space-x-2"
            >
              <DollarSign size={16} />
              <span>Fazer Checkout</span>
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // Render column
  const renderColumn = (column) => {
    const groups = getGroupsForColumn(column.status);
    
    return (
      <div 
        key={column.id}
        data-column-id={column.status}
        onClick={handleBackgroundTap}
        className={`flex-shrink-0 w-80 flex flex-col ${column.color} rounded-xl p-4 transition-all`}
        style={{ 
          height: user && ['PROFISSIONAL', 'ATENDENTE', 'GESTOR'].includes(user.role) 
            ? 'calc(100dvh - 80px)' // Account for Navigation only
            : '100dvh'   // No header, full height
        }}
      >
        {/* Column header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {/* Column icon */}
            <div className="flex-shrink-0">
              {React.createElement(column.icon, { 
                size: 20, 
                className: "text-gray-600" 
              })}
            </div>
            <h3 className="font-semibold text-gray-800 text-base truncate">
              {column.title}
            </h3>
            {/* Add services icon for walk-in column */}
            {column.id === 'WALK_IN' && (
              <button
                onClick={handleAddWalkIn}
                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors touch-manipulation flex-shrink-0"
                title="Adicionar Serviços"
                aria-label="Adicionar Serviços"
              >
                <UserPlus size={18} />
              </button>
            )}
          </div>
          {groups.length > 0 && (
            <span className="bg-red-500 text-white text-sm rounded-full px-3 py-1.5 min-w-[28px] h-7 flex items-center justify-center font-medium">
              {groups.length}
            </span>
          )}
        </div>
        
        {/* Cards container */}
        <div className={`flex-1 overflow-y-auto space-y-3 min-h-0 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent ${
          user && ['PROFISSIONAL', 'ATENDENTE', 'GESTOR'].includes(user.role) ? 'pb-4' : 'pb-2'
        }`}>
          {groups.length === 0 ? (
            <div className="py-12">
            </div>
          ) : (
            groups.map(renderAppointmentCard)
          )}
        </div>
      </div>
    );
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={32} className="text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading kanban board...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error loading board</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadAppointmentGroups}
            className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-smooth"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen max-h-screen flex flex-col bg-gray-50 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Kanban board - Mobile only */}
      <div className={`flex-1 min-h-0 overflow-x-auto overflow-y-hidden ${
        user && ['PROFISSIONAL', 'ATENDENTE', 'GESTOR'].includes(user.role) ? 'pb-20' : ''
      }`}>
        <div className="flex h-full gap-3 p-2 min-w-max">
          {KANBAN_COLUMNS.map(renderColumn)}
        </div>
      </div>
      
      {/* Floating Action Menu */}
      {selectedCard && showActionMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-40 flex items-center justify-center p-4" onClick={handleBackgroundTap}>
          <div className="bg-white rounded-xl shadow-xl border w-full max-w-xs flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* Header - Fixed */}
            <div className="p-4 pb-2 flex-shrink-0">
              <div className="text-center">
                <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                  {selectedCard.client_name || 'Cliente Sem Agendamento'}
                </h3>
                <p className="text-xs text-gray-500">
                  Mover para:
                </p>
              </div>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-2">
              <div className="space-y-2">
                {KANBAN_COLUMNS
                  .filter(column => column.status !== selectedCard.status)
                  .map(column => {
                    const IconComponent = column.icon;
                    return (
                      <button
                        key={column.id}
                        onClick={() => handleMoveToColumn(column.status)}
                        className={`w-full p-3 rounded-lg border text-left transition-all touch-manipulation
                          ${column.color} border-opacity-30 active:scale-95`}
                      >
                        <div className="flex items-center space-x-3">
                          <IconComponent size={18} className="text-gray-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-sm truncate">{column.title}</div>
                            <div className="text-xs text-gray-600">
                              {getGroupsForColumn(column.status).length} item(s)
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
            
            {/* Footer - Fixed */}
            <div className="p-4 pt-2 flex-shrink-0 border-t border-gray-100">
              <button
                onClick={handleBackgroundTap}
                className="w-full p-2 text-gray-500 text-center touch-manipulation text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Checkout drawer */}
      <CheckoutDrawer
        isOpen={checkoutDrawerOpen}
        isMinimized={checkoutMinimized}
        groups={checkoutGroups}
        onClose={closeCheckoutDrawer}
        onMinimize={minimizeCheckoutDrawer}
        onGroupAdd={handleGroupAddToCheckout}
        onPaymentComplete={handlePaymentComplete}
        onAddMoreServices={handleAddMoreServicesFromCheckout}
      />
      
      {/* Minimized checkout pill */}
      {checkoutDrawerOpen && checkoutMinimized && (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            onClick={() => setCheckoutMinimized(false)}
            className="bg-pink-500 text-white px-5 py-4 rounded-full shadow-lg hover:bg-pink-600 active:bg-pink-700 transition-colors flex items-center space-x-3 touch-manipulation"
            aria-label="Abrir checkout"
          >
            <DollarSign size={20} />
            <span className="font-medium text-base">Checkout</span>
            {checkoutGroups.length > 0 && (
              <span className="bg-pink-600 text-sm px-2.5 py-1 rounded-full min-w-[24px] text-center font-semibold">
                {checkoutGroups.length}
              </span>
            )}
          </button>
        </div>
      )}
      
      {/* Add Services modal */}
      <WalkInModal
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        onWalkInCreated={handleWalkInCreated}
        preloadedServices={preloadedServices}
        modalContext={modalContext}
      />
      
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
          <div className={`flex items-center space-x-3 px-6 py-4 rounded-xl shadow-lg backdrop-blur-sm border max-w-sm
            ${toast.type === 'success' 
              ? 'bg-green-50/95 border-green-200 text-green-800' 
              : 'bg-red-50/95 border-red-200 text-red-800'
            }`}>
            {/* Icon */}
            <div className="flex-shrink-0">
              {toast.type === 'success' ? (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Check size={16} className="text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <X size={16} className="text-white" />
                </div>
              )}
            </div>
            
            {/* Message */}
            <div className="flex-1 font-medium text-sm">
              {toast.message}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setToast(null)}
              className={`flex-shrink-0 p-1 rounded-md transition-colors
                ${toast.type === 'success'
                  ? 'hover:bg-green-100 text-green-600' 
                  : 'hover:bg-red-100 text-red-600'
                }`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Professional navigation for staff users */}
      {user && ['PROFISSIONAL', 'ATENDENTE', 'GESTOR'].includes(user.role) && (
        <ProfessionalBottomNavigation />
      )}
    </div>
  );
};

export default KanbanBoardPage;