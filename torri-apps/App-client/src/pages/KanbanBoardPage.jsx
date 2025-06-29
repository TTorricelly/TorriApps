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

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus,
  Clock,
  DollarSign,
  Timer,
  RefreshCw,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

// Import services 
import { getAppointmentGroups, updateAppointmentGroupStatus } from '../services/appointmentService';
import { useAuthStore } from '../stores/authStore';

// Import components
import CheckoutDrawer from '../components/CheckoutDrawer';
import WalkInModal from '../components/WalkInModal';

// Kanban columns configuration following the required flow
const KANBAN_COLUMNS = [
  { id: 'SCHEDULED', title: 'Agendado', status: 'SCHEDULED', color: 'bg-blue-50 border-blue-200' },
  { id: 'CONFIRMED', title: 'Confirmado', status: 'CONFIRMED', color: 'bg-green-50 border-green-200' }, 
  { id: 'WALK_IN', title: 'Sem Agendamento', status: 'WALK_IN', color: 'bg-purple-50 border-purple-200' },
  { id: 'ARRIVED', title: 'Chegou', status: 'ARRIVED', color: 'bg-yellow-50 border-yellow-200' },
  { id: 'IN_SERVICE', title: 'Em Atendimento', status: 'IN_SERVICE', color: 'bg-orange-50 border-orange-200' },
  { id: 'READY_TO_PAY', title: 'Pronto p/ Pagar', status: 'READY_TO_PAY', color: 'bg-pink-50 border-pink-200' },
  { id: 'COMPLETED', title: 'Finalizado', status: 'COMPLETED', color: 'bg-gray-50 border-gray-200' }
];

const KanbanBoardPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  
  // State management
  const [appointmentGroups, setAppointmentGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Touch drag state only
  const [dragOverColumn, setDragOverColumn] = useState(null);
  
  // Touch drag state
  const [touchDraggedItem, setTouchDraggedItem] = useState(null);
  const [touchStartPosition, setTouchStartPosition] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  
  // Checkout drawer state
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [checkoutMinimized, setCheckoutMinimized] = useState(false);
  const [checkoutGroups, setCheckoutGroups] = useState([]); // For merging multiple groups
  
  // Walk-in modal state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  
  // Card selection state
  const [selectedCard, setSelectedCard] = useState(null);
  
  
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
  
  
  // Move card to column (shared function for both drag and touch)
  const moveCardToColumn = async (item, targetColumnId) => {
    try {
      // Special handling for Ready to Pay - open checkout drawer
      if (targetColumnId === 'READY_TO_PAY') {
        setCheckoutGroups([item]);
        setCheckoutDrawerOpen(true);
        setCheckoutMinimized(false);
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
      console.error('[KanbanBoard] Error updating appointment status:', error);
      alert('Erro ao atualizar status do agendamento. Tente novamente.');
      // Optionally reload data to sync with server
      loadAppointmentGroups();
    }
  };
  
  // Touch event handlers for mobile drag and drop
  const handleTouchStart = (e, group) => {
    const touch = e.touches[0];
    setTouchDraggedItem(group);
    setTouchStartPosition({ x: touch.clientX, y: touch.clientY });
    setSelectedCard(group);
    
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };
  
  const handleTouchMove = (e) => {
    if (!touchDraggedItem || !touchStartPosition) return;
    
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPosition.x;
    const deltaY = touch.clientY - touchStartPosition.y;
    
    // Only start visual drag if moved enough (prevent accidental drags)
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (!dragPreview) {
        createDragPreview(touch.clientX, touch.clientY);
      } else {
        updateDragPreview(touch.clientX, touch.clientY);
      }
      
      // Find column under touch point
      const columnElement = document.elementFromPoint(touch.clientX, touch.clientY);
      const columnContainer = columnElement?.closest('[data-column-id]');
      if (columnContainer) {
        const columnId = columnContainer.getAttribute('data-column-id');
        setDragOverColumn(columnId);
      } else {
        setDragOverColumn(null);
      }
    }
  };
  
  const handleTouchEnd = async (e) => {
    if (!touchDraggedItem) return;
    
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const columnContainer = elementBelow?.closest('[data-column-id]');
    
    if (columnContainer) {
      const targetColumnId = columnContainer.getAttribute('data-column-id');
      if (targetColumnId && targetColumnId !== touchDraggedItem.status) {
        await moveCardToColumn(touchDraggedItem, targetColumnId);
        
        // Success haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate([30, 10, 30]);
        }
      }
    }
    
    // Cleanup
    setTouchDraggedItem(null);
    setTouchStartPosition(null);
    setDragOverColumn(null);
    removeDragPreview();
  };
  
  // Create visual drag preview for touch
  const createDragPreview = (x, y) => {
    if (!touchDraggedItem) return;
    
    const preview = document.createElement('div');
    preview.id = 'touch-drag-preview';
    preview.className = 'fixed z-50 pointer-events-none bg-white rounded-xl shadow-lg border p-4 transform -translate-x-1/2 -translate-y-1/2 opacity-90 scale-95';
    preview.style.left = `${x}px`;
    preview.style.top = `${y}px`;
    preview.innerHTML = `
      <div class="font-semibold text-sm text-gray-900">${touchDraggedItem.client_name || 'Cliente Walk-in'}</div>
      <div class="text-xs text-gray-500 mt-1">${touchDraggedItem.service_names || 'Serviços'}</div>
    `;
    
    document.body.appendChild(preview);
    setDragPreview(preview);
  };
  
  // Update drag preview position
  const updateDragPreview = (x, y) => {
    if (dragPreview) {
      dragPreview.style.left = `${x}px`;
      dragPreview.style.top = `${y}px`;
    }
  };
  
  // Remove drag preview
  const removeDragPreview = () => {
    if (dragPreview) {
      document.body.removeChild(dragPreview);
      setDragPreview(null);
    }
  };
  
  // Cleanup drag preview on unmount
  useEffect(() => {
    return () => {
      if (dragPreview) {
        document.body.removeChild(dragPreview);
      }
    };
  }, [dragPreview]);
  
  
  
  // Open checkout for group
  const openCheckoutForGroup = (group) => {
    setCheckoutGroups([group]);
    setCheckoutDrawerOpen(true);
    setCheckoutMinimized(false);
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
    
    // Show success message
    alert(`Payment processed successfully! ${groups.length} appointment(s) completed.`);
  };
  
  // Render appointment card
  const renderAppointmentCard = (group) => {
    const { time } = formatDateTime(group.start_time);
    const isSelected = selectedCard?.id === group.id;
    
    return (
      <div
        key={group.id}
        onTouchStart={(e) => handleTouchStart(e, group)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => setSelectedCard(group)}
        onDoubleClick={() => group.status === 'READY_TO_PAY' && openCheckoutForGroup(group)}
        className={`bg-white rounded-xl shadow-sm border p-4 active:shadow-lg transition-all touch-manipulation select-none
          ${isSelected ? 'ring-2 ring-pink-500 ring-opacity-50 shadow-md' : ''}
          ${group.status === 'READY_TO_PAY' ? 'border-pink-300 bg-gradient-to-br from-pink-25 to-pink-50' : 'border-gray-200'}
          ${touchDraggedItem?.id === group.id ? 'opacity-50 scale-95' : ''}
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
        
        {/* Ready to pay indicator */}
        {group.status === 'READY_TO_PAY' && (
          <div className="mt-3 pt-2 border-t border-pink-200">
            <div className="flex items-center justify-center text-sm font-medium text-pink-600">
              <DollarSign size={14} className="mr-1" />
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
        data-column-id={column.status}
        className={`flex-shrink-0 w-80 ${column.color} rounded-xl p-4 transition-all
          ${isDragOver ? 'ring-2 ring-pink-500 ring-opacity-50 bg-opacity-75' : ''}
        `}
      >
        {/* Column header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-base truncate">
            {column.title}
          </h3>
          {groups.length > 0 && (
            <span className="bg-red-500 text-white text-sm rounded-full px-3 py-1.5 min-w-[28px] h-7 flex items-center justify-center font-medium">
              {groups.length}
            </span>
          )}
        </div>
        
        {/* Add sem agendamento button */}
        {column.id === 'WALK_IN' && (
          <button
            onClick={handleAddWalkIn}
            className="w-full mb-4 p-4 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:border-purple-400 hover:bg-purple-25 active:bg-purple-50 transition-colors flex items-center justify-center space-x-2 touch-manipulation font-medium"
          >
            <Plus size={20} />
            <span className="text-base">Adicionar Sem Agendamento</span>
          </button>
        )}
        
        {/* Cards container */}
        <div className="space-y-3 min-h-[120px] max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {groups.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-12 italic">
              Vazio
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header - Mobile only */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              aria-label="Voltar ao dashboard"
            >
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900 truncate">Atendimentos</h1>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            title="Atualizar"
            aria-label="Atualizar dados"
          >
            <RefreshCw 
              size={24} 
              className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
      </div>
      
      {/* Kanban board - Mobile only */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-3 p-4 min-w-max">
          {KANBAN_COLUMNS.map(renderColumn)}
        </div>
      </div>
      
      
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