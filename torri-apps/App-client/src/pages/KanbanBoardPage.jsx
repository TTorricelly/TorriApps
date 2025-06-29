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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus,
  Clock,
  User,
  DollarSign,
  Calendar,
  Timer,
  X,
  Minimize2,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Keyboard
} from 'lucide-react';

// Import services 
import { getAppointmentGroups, updateAppointmentGroupStatus, createWalkInAppointment } from '../services/appointmentService';
import { useAuthStore } from '../stores/authStore';
import { buildAssetUrl } from '../utils/urlHelpers';

// Import components
import CheckoutDrawer from '../components/CheckoutDrawer';
import WalkInModal from '../components/WalkInModal';

// Kanban columns configuration following the required flow
const KANBAN_COLUMNS = [
  { id: 'SCHEDULED', title: 'Booked', status: 'SCHEDULED', color: 'bg-blue-50 border-blue-200' },
  { id: 'CONFIRMED', title: 'Confirmed', status: 'CONFIRMED', color: 'bg-green-50 border-green-200' }, 
  { id: 'WALK_IN', title: 'Walk-in', status: 'WALK_IN', color: 'bg-purple-50 border-purple-200' },
  { id: 'ARRIVED', title: 'Arrived', status: 'ARRIVED', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'IN_SERVICE', title: 'In Service', status: 'IN_SERVICE', color: 'bg-orange-50 border-orange-200' },
  { id: 'READY_TO_PAY', title: 'Ready to Pay', status: 'READY_TO_PAY', color: 'bg-pink-50 border-pink-200' },
  { id: 'COMPLETED', title: 'Completed', status: 'COMPLETED', color: 'bg-gray-50 border-gray-200' }
];

const KanbanBoardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  // State management
  const [appointmentGroups, setAppointmentGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // Checkout drawer state
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [checkoutMinimized, setCheckoutMinimized] = useState(false);
  const [selectedGroupForCheckout, setSelectedGroupForCheckout] = useState(null);
  const [checkoutGroups, setCheckoutGroups] = useState([]); // For merging multiple groups
  
  // Walk-in modal state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  
  // Keyboard shortcut state
  const [selectedCard, setSelectedCard] = useState(null);
  const [keyboardHelpVisible, setKeyboardHelpVisible] = useState(false);
  
  // Refs for focus management
  const checkoutDrawerRef = useRef(null);
  const kanbanBoardRef = useRef(null);
  
  // Load appointment groups on mount and auth changes
  useEffect(() => {
    if (isAuthenticated) {
      loadAppointmentGroups();
    }
  }, [isAuthenticated]);
  
  // Load appointment groups function
  const loadAppointmentGroups = useCallback(async () => {
    try {
      setError(null);
      const data = await getAppointmentGroups();
      setAppointmentGroups(data || []);
    } catch (err) {
      console.error('[KanbanBoard] Error loading appointment groups:', err);
      setError('Erro ao carregar agendamentos. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
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
  
  // Handle drag start
  const handleDragStart = (e, group) => {
    setDraggedItem(group);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.target.style.opacity = '0.5';
  };
  
  // Handle drag end
  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedItem(null);
    setDragOverColumn(null);
  };
  
  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  // Handle drag enter
  const handleDragEnter = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };
  
  // Handle drag leave  
  const handleDragLeave = (e) => {
    // Only clear if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverColumn(null);
    }
  };
  
  // Handle drop
  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (!draggedItem || draggedItem.status === targetColumnId) {
      return; // No change needed
    }
    
    try {
      // Special handling for Ready to Pay - open checkout drawer
      if (targetColumnId === 'READY_TO_PAY') {
        setSelectedGroupForCheckout(draggedItem);
        setCheckoutGroups([draggedItem]);
        setCheckoutDrawerOpen(true);
        setCheckoutMinimized(false);
        
        // Focus trap to drawer
        setTimeout(() => {
          if (checkoutDrawerRef.current) {
            const firstFocusable = checkoutDrawerRef.current.querySelector('[tabindex="0"], button, input, select, textarea');
            firstFocusable?.focus();
          }
        }, 100);
      }
      
      // Update the status
      await updateAppointmentGroupStatus(draggedItem.id, targetColumnId);
      
      // Update local state optimistically
      setAppointmentGroups(prev => 
        prev.map(group => 
          group.id === draggedItem.id 
            ? { ...group, status: targetColumnId }
            : group
        )
      );
      
    } catch (error) {
      console.error('[KanbanBoard] Error updating appointment status:', error);
      alert('Erro ao atualizar status do agendamento. Tente novamente.');
      // Optionally reload data to sync with server
      loadAppointmentGroups();
    }
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when not in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'a':
          if (selectedCard) {
            e.preventDefault();
            handleStatusUpdate(selectedCard, 'ARRIVED');
          }
          break;
        case 'c':
          if (selectedCard && selectedCard.status === 'READY_TO_PAY') {
            e.preventDefault();
            openCheckoutForGroup(selectedCard);
          }
          break;
        case 'escape':
          e.preventDefault();
          if (checkoutDrawerOpen) {
            closeCheckoutDrawer();
          } else if (walkInModalOpen) {
            setWalkInModalOpen(false);
          } else if (keyboardHelpVisible) {
            setKeyboardHelpVisible(false);
          }
          break;
        case '?':
          e.preventDefault();
          setKeyboardHelpVisible(!keyboardHelpVisible);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard, checkoutDrawerOpen, walkInModalOpen, keyboardHelpVisible]);
  
  // Handle status update via keyboard or other methods
  const handleStatusUpdate = async (group, newStatus) => {
    try {
      await updateAppointmentGroupStatus(group.id, newStatus);
      setAppointmentGroups(prev => 
        prev.map(g => 
          g.id === group.id 
            ? { ...g, status: newStatus }
            : g
        )
      );
    } catch (error) {
      console.error('[KanbanBoard] Error updating status:', error);
      alert('Erro ao atualizar status. Tente novamente.');
    }
  };
  
  // Open checkout for group
  const openCheckoutForGroup = (group) => {
    setSelectedGroupForCheckout(group);
    setCheckoutGroups([group]);
    setCheckoutDrawerOpen(true);
    setCheckoutMinimized(false);
  };
  
  // Close checkout drawer
  const closeCheckoutDrawer = () => {
    setCheckoutDrawerOpen(false);
    setCheckoutMinimized(false);
    setSelectedGroupForCheckout(null);
    setCheckoutGroups([]);
    
    // Return focus to main board
    if (kanbanBoardRef.current) {
      kanbanBoardRef.current.focus();
    }
  };
  
  // Minimize checkout drawer
  const minimizeCheckoutDrawer = () => {
    setCheckoutMinimized(true);
  };
  
  // Add walk-in appointment
  const handleAddWalkIn = () => {
    setWalkInModalOpen(true);
  };
  
  // Handle walk-in created
  const handleWalkInCreated = (newAppointmentGroup) => {
    // Add the new group to local state
    setAppointmentGroups(prev => [...prev, newAppointmentGroup]);
    setWalkInModalOpen(false);
  };
  
  // Handle group add to checkout (from drag and drop)
  const handleGroupAddToCheckout = (group) => {
    if (!checkoutGroups.some(g => g.id === group.id)) {
      setCheckoutGroups(prev => [...prev, group]);
    }
  };
  
  // Handle payment completion
  const handlePaymentComplete = (groups, paymentResult) => {
    // Mark all groups as completed
    const groupIds = groups.map(g => g.id);
    setAppointmentGroups(prev => 
      prev.map(group => 
        groupIds.includes(group.id) 
          ? { ...group, status: 'COMPLETED' }
          : group
      )
    );
    
    // Show success message
    alert(`Payment processed successfully! ${groups.length} appointment(s) completed.`);
  };
  
  // Render appointment card
  const renderAppointmentCard = (group) => {
    const { date, time } = formatDateTime(group.start_time);
    const isSelected = selectedCard?.id === group.id;
    
    return (
      <div
        key={group.id}
        draggable
        onDragStart={(e) => handleDragStart(e, group)}
        onDragEnd={handleDragEnd}
        onClick={() => setSelectedCard(group)}
        onDoubleClick={() => group.status === 'READY_TO_PAY' && openCheckoutForGroup(group)}
        className={`bg-white rounded-xl shadow-sm border p-4 cursor-move hover:shadow-md active:shadow-lg transition-all touch-manipulation
          ${isSelected ? 'ring-2 ring-pink-500 ring-opacity-50 shadow-md' : ''}
          ${group.status === 'READY_TO_PAY' ? 'border-pink-300 bg-gradient-to-br from-pink-25 to-pink-50' : 'border-gray-200'}
        `}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedCard(group);
          }
        }}
        role="button"
        aria-label={`Agendamento para ${group.client_name || 'Cliente'}, ${group.service_names || 'Serviços'}`}
      >
        {/* Client name and price */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate flex-1 mr-2">
            {group.client_name || 'Cliente Walk-in'}
          </h4>
          {group.status === 'READY_TO_PAY' && (
            <span className="text-pink-600 font-bold text-sm sm:text-base bg-white px-2 py-1 rounded-lg shadow-sm">
              {formatPrice(group.total_price)}
            </span>
          )}
        </div>
        
        {/* Services - Mobile optimized */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1.5">
            {group.service_names?.split(',').map((service, index) => (
              <span 
                key={index}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-2.5 py-1.5 rounded-full font-medium"
              >
                {service.trim()}
              </span>
            )) || (
              <span className="text-gray-500 text-xs italic">Nenhum serviço</span>
            )}
          </div>
        </div>
        
        {/* Time and duration - Mobile optimized */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500">
          <div className="flex items-center space-x-1.5">
            <Clock size={14} className="text-gray-400" />
            <span className="font-medium">{time}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Timer size={14} className="text-gray-400" />
            <span className="font-medium">{formatDuration(group.total_duration_minutes)}</span>
          </div>
        </div>
        
        {/* Price preview (grey until Ready to Pay) */}
        {group.status !== 'READY_TO_PAY' && group.total_price && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400 font-medium">
              {formatPrice(group.total_price)}
            </span>
          </div>
        )}
        
        {/* Mobile: Ready to pay indicator */}
        {group.status === 'READY_TO_PAY' && (
          <div className="mt-3 pt-2 border-t border-pink-200">
            <div className="flex items-center justify-center text-xs font-medium text-pink-600">
              <DollarSign size={12} className="mr-1" />
              Toque duas vezes para checkout
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Render column
  const renderColumn = (column) => {
    const groups = getGroupsForColumn(column.status);
    const isDragOver = dragOverColumn === column.id;
    
    return (
      <div 
        key={column.id}
        className={`flex-shrink-0 w-72 sm:w-80 ${column.color} rounded-xl p-3 sm:p-4 transition-all
          ${isDragOver ? 'ring-2 ring-pink-500 ring-opacity-50 bg-opacity-75' : ''}
        `}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.status)}
      >
        {/* Column header - Mobile optimized */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
            {column.title}
          </h3>
          {groups.length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[24px] h-6 flex items-center justify-center font-medium">
              {groups.length}
            </span>
          )}
        </div>
        
        {/* Add Walk-in button for Walk-in column - Mobile optimized */}
        {column.id === 'WALK_IN' && (
          <button
            onClick={handleAddWalkIn}
            className="w-full mb-3 p-3 sm:p-2 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:border-purple-400 hover:bg-purple-25 active:bg-purple-50 transition-colors flex items-center justify-center space-x-2 touch-manipulation font-medium"
          >
            <Plus size={20} className="sm:w-4 sm:h-4" />
            <span className="text-sm">Adicionar Walk-in</span>
          </button>
        )}
        
        {/* Cards container - Mobile optimized scrolling */}
        <div className="space-y-2 sm:space-y-2 min-h-[120px] max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {groups.length === 0 ? (
            <div className="text-gray-400 text-xs text-center py-8 sm:py-12 italic">
              {column.id === 'WALK_IN' ? 'Toque em "A" para marcar como chegou' : 'Vazio'}
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
    <div className="h-screen flex flex-col bg-gray-50" ref={kanbanBoardRef} tabIndex={-1}>
      {/* Header - Mobile optimized */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Voltar ao dashboard"
            >
              <ArrowLeft size={24} className="text-gray-600 sm:w-5 sm:h-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Kanban Front-Desk</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Fluxo de atendimento em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setKeyboardHelpVisible(!keyboardHelpVisible)}
              className="p-2 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation hidden sm:block"
              title="Atalhos do teclado"
              aria-label="Mostrar atalhos do teclado"
            >
              <Keyboard size={20} className="text-gray-600" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              title="Atualizar"
              aria-label="Atualizar dados"
            >
              <RefreshCw 
                size={24} 
                className={`text-gray-600 sm:w-5 sm:h-5 ${refreshing ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Kanban board - Mobile optimized scrolling */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-2 sm:gap-4 p-3 sm:p-6 min-w-max">
          {KANBAN_COLUMNS.map(renderColumn)}
        </div>
      </div>
      
      {/* Keyboard help overlay - Mobile optimized */}
      {keyboardHelpVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="bg-white h-full w-full sm:rounded-xl sm:max-w-md sm:h-auto sm:mx-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold">Atalhos do Teclado</h3>
              <button
                onClick={() => setKeyboardHelpVisible(false)}
                className="p-2 hover:bg-gray-100 rounded-lg touch-manipulation"
                aria-label="Fechar ajuda"
              >
                <X size={24} className="sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between py-2">
                <span className="font-mono bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold">A</span>
                <span className="text-sm ml-4 flex-1">Mover selecionado para "Chegou"</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-mono bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold">C</span>
                <span className="text-sm ml-4 flex-1">Abrir checkout (Pronto para Pagar)</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-mono bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold">ESC</span>
                <span className="text-sm ml-4 flex-1">Fechar modal/gaveta</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-mono bg-gray-100 px-3 py-2 rounded-lg text-sm font-semibold">?</span>
                <span className="text-sm ml-4 flex-1">Mostrar/ocultar esta ajuda</span>
              </div>
            </div>
            <div className="p-4 sm:p-6 border-t border-gray-200">
              <button
                onClick={() => setKeyboardHelpVisible(false)}
                className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-xl transition-colors touch-manipulation"
              >
                Entendi
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
      />
      
      {/* Minimized checkout pill - Mobile optimized */}
      {checkoutDrawerOpen && checkoutMinimized && (
        <div className="fixed bottom-4 left-4 sm:left-4 z-50">
          <button
            onClick={() => setCheckoutMinimized(false)}
            className="bg-pink-500 text-white px-4 sm:px-4 py-3 sm:py-2 rounded-full shadow-lg hover:bg-pink-600 active:bg-pink-700 transition-colors flex items-center space-x-2 touch-manipulation"
            aria-label="Abrir checkout"
          >
            <DollarSign size={20} className="sm:w-4 sm:h-4" />
            <span className="font-medium">Checkout</span>
            {checkoutGroups.length > 0 && (
              <span className="bg-pink-600 text-xs px-2 py-1 rounded-full min-w-[20px] text-center font-semibold">
                {checkoutGroups.length}
              </span>
            )}
          </button>
        </div>
      )}
      
      {/* Walk-in modal */}
      <WalkInModal
        isOpen={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        onWalkInCreated={handleWalkInCreated}
      />
    </div>
  );
};

export default KanbanBoardPage;