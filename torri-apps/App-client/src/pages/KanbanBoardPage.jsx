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
        className={`bg-white rounded-lg shadow-sm border p-3 mb-3 cursor-move hover:shadow-md transition-all
          ${isSelected ? 'ring-2 ring-pink-500 ring-opacity-50' : ''}
          ${group.status === 'READY_TO_PAY' ? 'border-pink-300 bg-pink-25' : 'border-gray-200'}
        `}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedCard(group);
          }
        }}
        role="button"
        aria-label={`Appointment for ${group.client_name || 'Client'}, ${group.service_names || 'Services'}`}
      >
        {/* Client name */}
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-900 text-sm">
            {group.client_name || 'Walk-in Client'}
          </h4>
          {group.status === 'READY_TO_PAY' && (
            <span className="text-pink-600 font-bold text-sm">
              {formatPrice(group.total_price)}
            </span>
          )}
        </div>
        
        {/* Services */}
        <div className="mb-2">
          <div className="flex flex-wrap gap-1">
            {group.service_names?.split(',').map((service, index) => (
              <span 
                key={index}
                className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
              >
                {service.trim()}
              </span>
            )) || (
              <span className="text-gray-500 text-xs italic">No services</span>
            )}
          </div>
        </div>
        
        {/* Time and duration */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock size={12} />
            <span>{time}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Timer size={12} />
            <span>{formatDuration(group.total_duration_minutes)}</span>
          </div>
        </div>
        
        {/* Price (grey until Ready to Pay) */}
        {group.status !== 'READY_TO_PAY' && group.total_price && (
          <div className="mt-2 text-xs text-gray-400">
            {formatPrice(group.total_price)}
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
        className={`flex-1 min-w-0 ${column.color} rounded-lg p-4 transition-all
          ${isDragOver ? 'ring-2 ring-pink-500 ring-opacity-50 bg-opacity-75' : ''}
        `}
        onDragOver={handleDragOver}
        onDragEnter={(e) => handleDragEnter(e, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, column.status)}
      >
        {/* Column header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">
            {column.title}
          </h3>
          {groups.length > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {groups.length}
            </span>
          )}
        </div>
        
        {/* Add Walk-in button for Walk-in column */}
        {column.id === 'WALK_IN' && (
          <button
            onClick={handleAddWalkIn}
            className="w-full mb-3 p-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:border-purple-400 hover:bg-purple-25 transition-colors flex items-center justify-center space-x-1"
          >
            <Plus size={16} />
            <span className="text-sm">Add Walk-in</span>
          </button>
        )}
        
        {/* Cards container */}
        <div className="space-y-2 min-h-[100px] max-h-[calc(100vh-250px)] overflow-y-auto">
          {groups.length === 0 ? (
            <div className="text-gray-400 text-xs text-center py-8 italic">
              {column.id === 'WALK_IN' ? 'Press A to mark arrived' : 'Empty'}
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Front-Desk Kanban</h1>
              <p className="text-sm text-gray-500">Real-time appointment flow</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setKeyboardHelpVisible(!keyboardHelpVisible)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Keyboard shortcuts"
            >
              <Keyboard size={20} className="text-gray-600" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw 
                size={20} 
                className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full gap-4 p-6 min-w-max">
          {KANBAN_COLUMNS.map(renderColumn)}
        </div>
      </div>
      
      {/* Keyboard help overlay */}
      {keyboardHelpVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setKeyboardHelpVisible(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">A</span>
                <span>Move selected to Arrived</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">C</span>
                <span>Open checkout (Ready to Pay)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">ESC</span>
                <span>Close drawer/modal</span>
              </div>
              <div className="flex justify-between">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">?</span>
                <span>Toggle this help</span>
              </div>
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
      
      {/* Minimized checkout pill */}
      {checkoutDrawerOpen && checkoutMinimized && (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            onClick={() => setCheckoutMinimized(false)}
            className="bg-pink-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-pink-600 transition-colors flex items-center space-x-2"
          >
            <DollarSign size={16} />
            <span>Checkout</span>
            {checkoutGroups.length > 0 && (
              <span className="bg-pink-600 text-xs px-2 py-1 rounded-full">
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