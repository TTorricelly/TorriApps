/**
 * CheckoutDrawer Component
 * Embedded checkout functionality for kanban board
 * 
 * Features:
 * - Slides in from right (desktop) or bottom (tablet)
 * - Tabs: Items, Products, Discounts, Payments
 * - Add card drop-zone for merging groups
 * - Tip chips (15%, 18%, 20%)
 * - Sticky pay button with running total
 * - Can minimize to pill
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Minimize2, 
  ShoppingCart, 
  Package, 
  Percent, 
  CreditCard,
  Plus,
  Minus,
  DollarSign,
  User,
  Clock,
  Trash2,
  CheckCircle
} from 'lucide-react';

import { 
  createMergedCheckoutSession, 
  processAppointmentPayment,
  removeServiceFromAppointmentGroup
} from '../services/appointmentService';

const CheckoutDrawer = ({
  isOpen,
  isMinimized,
  groups,
  onClose,
  onMinimize,
  onGroupAdd,
  onPaymentComplete,
  onAddMoreServices,
  className = ''
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('items');
  const [selectedTipPercentage, setSelectedTipPercentage] = useState(0);
  const [customTipAmount, setCustomTipAmount] = useState(0);
  const [customDiscountAmount, setCustomDiscountAmount] = useState(0);
  const [customDiscountPercentage, setCustomDiscountPercentage] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  
  // Additional products state (for retail items)
  const [additionalProducts, setAdditionalProducts] = useState([]);
  
  // Checkout session state for detailed service information
  const [checkoutSession, setCheckoutSession] = useState(null);
  
  // Refs for focus management
  const drawerRef = useRef(null);
  const firstFocusableRef = useRef(null);
  
  // Fetch detailed checkout session when groups change
  useEffect(() => {
    const fetchCheckoutSession = async () => {
      if (groups && groups.length > 0) {
        try {
          const groupIds = groups.map(g => g.id);
          const session = await createMergedCheckoutSession(groupIds);
          setCheckoutSession(session);
        } catch (error) {
          setPaymentError('Erro ao carregar detalhes do checkout');
        }
      } else {
        setCheckoutSession(null);
      }
    };
    
    fetchCheckoutSession();
  }, [groups]);

  // Focus trap effect
  useEffect(() => {
    if (isOpen && !isMinimized && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        firstFocusableRef.current = focusableElements[0];
        firstFocusableRef.current.focus();
      }
      
      const handleTabKey = (e) => {
        if (e.key === 'Tab') {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };
      
      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [isOpen, isMinimized]);
  
  // Calculate totals
  const calculateTotals = () => {
    // Use detailed services from checkout session instead of grouped data
    const servicesTotal = checkoutSession?.services?.reduce((sum, service) => sum + parseFloat(service.price || 0), 0) || 0;
    const productsTotal = additionalProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    
    const subtotal = servicesTotal + productsTotal;
    const discountAmount = customDiscountPercentage > 0 
      ? (subtotal * customDiscountPercentage / 100)
      : customDiscountAmount;
    
    const afterDiscount = subtotal - discountAmount;
    const tipAmount = customTipAmount > 0 
      ? customTipAmount 
      : (afterDiscount * selectedTipPercentage / 100);
    
    const total = afterDiscount + tipAmount;
    
    return {
      subtotal,
      discountAmount,
      tipAmount,
      total,
      servicesTotal,
      productsTotal
    };
  };
  
  const totals = calculateTotals();
  
  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  
  // Handle service removal
  const handleRemoveService = async (serviceId) => {
    try {
      // Use the first group ID from checkout session (since services belong to appointment groups)
      const groupId = checkoutSession.group_ids?.[0] || groups[0]?.id;
      if (!groupId) {
        throw new Error('No group ID found for service removal');
      }
      
      await removeServiceFromAppointmentGroup(groupId, serviceId);
      
      // Refresh checkout session to reflect the removal
      const groupIds = groups.map(g => g.id);
      const session = await createMergedCheckoutSession(groupIds);
      setCheckoutSession(session);
      
      // If no services left, close checkout
      if (!session.services || session.services.length === 0) {
        onClose();
      }
      
    } catch (error) {
      setPaymentError('Erro ao remover serviço. Tente novamente.');
    }
  };
  
  // SwipeableServiceCard component
  const SwipeableServiceCard = ({ service, index, onRemove }) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const cardRef = useRef(null);
    const startX = useRef(0);
    const currentX = useRef(0);
    
    // Touch/Mouse handlers for swipe gesture
    const handleStart = (clientX) => {
      startX.current = clientX;
      currentX.current = clientX;
    };

    const handleMove = (clientX) => {
      if (startX.current === 0) return;
      
      currentX.current = clientX;
      const diff = clientX - startX.current;
      
      // Only allow left swipe (negative values)
      if (diff < 0) {
        setSwipeOffset(Math.max(diff, -120));
      }
    };

    const handleEnd = () => {
      const diff = currentX.current - startX.current;
      
      if (diff < -80) {
        // Trigger removal
        setIsRemoving(true);
        setTimeout(() => {
          onRemove(service.id);
        }, 200);
      } else {
        // Snap back
        setSwipeOffset(0);
      }
      
      startX.current = 0;
      currentX.current = 0;
    };
    
    return (
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Red background for swipe-to-delete */}
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6">
          <div className="flex items-center space-x-2 text-white">
            <Trash2 size={16} />
            <span className="font-semibold text-sm">Remover</span>
          </div>
        </div>

        {/* Main card content */}
        <div 
          ref={cardRef}
          className={`relative bg-white transition-transform duration-200 ${isRemoving ? 'opacity-0 -translate-x-full' : ''}`}
          style={{ transform: `translateX(${swipeOffset}px)` }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => e.buttons === 1 && handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
        >
          <div className="flex items-center justify-between p-3">
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900 mb-1">
                {service.name}
              </div>
              <div className="text-xs text-gray-600 mb-1">
                Profissional: {service.professional_name || 'Não atribuído'}
              </div>
              {service.duration_minutes && (
                <div className="flex items-center space-x-1">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {Math.floor(service.duration_minutes / 60)}h {service.duration_minutes % 60}min
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="font-semibold text-green-600">
                {formatPrice(service.price)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Handle tip selection
  const handleTipSelect = (percentage) => {
    setSelectedTipPercentage(percentage);
    setCustomTipAmount(0); // Clear custom tip when percentage is selected
  };
  
  // Handle custom tip amount
  const handleCustomTipChange = (amount) => {
    setCustomTipAmount(amount);
    setSelectedTipPercentage(0); // Clear percentage when custom amount is set
  };
  
  // Handle adding more services to existing checkout
  const handleAddMoreServices = () => {
    if (onAddMoreServices && checkoutSession) {
      onAddMoreServices({
        mode: 'add-to-existing',
        existingGroupId: checkoutSession.group_ids?.[0], // First group ID
        existingClient: {
          id: checkoutSession.client_id,
          name: checkoutSession.client_name
        }
      });
    }
  };
  
  // Handle payment processing
  const handlePayment = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    
    try {
      const paymentData = {
        group_ids: groups.map(g => g.id),
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tip_amount: totals.tipAmount,
        total_amount: totals.total,
        payment_method: paymentMethod,
        additional_products: additionalProducts
      };
      
      const result = await processAppointmentPayment(paymentData);
      
      // Mark groups as completed and close drawer
      onPaymentComplete(groups, result);
      onClose();
      
    } catch (error) {
      setPaymentError('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessingPayment(false);
    }
  };
  
  // Handle drag over for adding groups
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const draggedGroupData = e.dataTransfer.getData('application/json');
      if (draggedGroupData) {
        const group = JSON.parse(draggedGroupData);
        onGroupAdd(group);
      }
    } catch (error) {
    }
  };
  
  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'items':
        return (
          <div className="space-y-4">
            
            {/* Service items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-800">Serviços</h4>
                <button 
                  onClick={() => handleAddMoreServices()}
                  className="text-pink-600 hover:text-pink-700 text-sm"
                >
                  + Adicionar Serviços
                </button>
              </div>
              {checkoutSession ? (
                <>
                  {/* Client info */}
                  <div className="flex items-center space-x-2 mb-3 p-2 bg-blue-50 rounded-lg">
                    <User size={16} className="text-blue-600" />
                    <span className="font-medium text-blue-800">{checkoutSession.client_name}</span>
                  </div>
                  
                  {/* Individual services with swipe-to-delete */}
                  <div className="space-y-2">
                    {checkoutSession.services?.map((service, index) => (
                      <SwipeableServiceCard
                        key={`${service.id}-${index}`}
                        service={service}
                        index={index}
                        onRemove={handleRemoveService}
                      />
                    ))}
                  </div>
                  
                  {/* Helper text for swipe gesture */}
                  {checkoutSession.services && checkoutSession.services.length > 0 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">
                        ← Deslize para a esquerda para remover
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent mx-auto mb-2"></div>
                  <p className="text-sm">Carregando serviços...</p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'products':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-800">Produtos Adicionais</h4>
              <button className="text-pink-600 hover:text-pink-700 text-sm">
                + Adicionar Produto
              </button>
            </div>
            
            {additionalProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nenhum produto adicionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {additionalProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium text-sm">{product.name}</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <button className="p-1 hover:bg-gray-200 rounded">
                          <Minus size={12} />
                        </button>
                        <span className="text-sm">{product.quantity}</span>
                        <button className="p-1 hover:bg-gray-200 rounded">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">
                        {formatPrice(product.price * product.quantity)}
                      </span>
                      <button className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'discounts':
        return (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-800">Descontos</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Porcentagem de Desconto</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customDiscountPercentage}
                  onChange={(e) => setCustomDiscountPercentage(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Valor Fixo de Desconto</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customDiscountAmount}
                  onChange={(e) => setCustomDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              
              {totals.discountAmount > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    Desconto Aplicado: <strong>{formatPrice(totals.discountAmount)}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'payments':
        return (
          <div className="space-y-4">
            
            
            
            {/* Tip selection */}
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Gorjeta</h5>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[0, 10, 15, 18].map((percentage) => (
                  <button
                    key={percentage}
                    onClick={() => handleTipSelect(percentage)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedTipPercentage === percentage
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {percentage === 0 ? 'Sem gorjeta' : `${percentage}%`}
                  </button>
                ))}
              </div>
              
              <div>
                <label className="block text-sm text-gray-600 mb-2">Valor Personalizado da Gorjeta</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customTipAmount}
                  onChange={(e) => handleCustomTipChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className={`fixed inset-0 bg-white shadow-xl z-40 transform transition-transform ${
        isMinimized ? 'translate-y-full' : 'translate-y-0'
      } ${className}`}
      ref={drawerRef}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
          <h3 className="text-lg font-semibold">Finalizar Pagamento</h3>
          <div className="flex space-x-2">
            <button 
              onClick={onMinimize}
              className="p-3 hover:bg-gray-100 rounded-lg touch-manipulation"
              title="Minimizar"
              aria-label="Minimizar checkout"
            >
              <Minimize2 size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-gray-100 rounded-lg touch-manipulation"
              title="Fechar"
              aria-label="Fechar checkout"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {[
            { id: 'items', label: 'Itens', icon: ShoppingCart },
            { id: 'products', label: 'Produtos', icon: Package },
            { id: 'discounts', label: 'Desconto', icon: Percent },
            { id: 'payments', label: 'Pagamento', icon: CreditCard }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center space-y-1 py-3 text-xs font-medium transition-colors touch-manipulation ${
                  activeTab === tab.id
                    ? 'text-pink-600 border-b-2 border-pink-600 bg-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4 pb-safe">
          {renderTabContent()}
        </div>
        
        {/* Payment error */}
        {paymentError && (
          <div className="p-4 bg-red-50 border-t border-red-200">
            <p className="text-red-600 text-sm font-medium">{paymentError}</p>
          </div>
        )}
        
        {/* Footer with totals and pay button */}
        <div className="border-t border-gray-200 p-4 pb-safe space-y-4 bg-white">
          {/* Totals breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span>Desconto:</span>
                <span className="font-medium">-{formatPrice(totals.discountAmount)}</span>
              </div>
            )}
            {totals.tipAmount > 0 && (
              <div className="flex justify-between items-center text-gray-600">
                <span>Gorjeta ({selectedTipPercentage > 0 ? `${selectedTipPercentage}%` : 'Personalizado'}):</span>
                <span className="font-medium">{formatPrice(totals.tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-semibold text-lg border-t border-gray-200 pt-3">
              <span>Total:</span>
              <span className="text-green-600 text-xl">{formatPrice(totals.total)}</span>
            </div>
          </div>
          
          {/* Payment method quick selector */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { id: 'cash', label: 'Dinheiro', icon: DollarSign },
              { id: 'debit', label: 'Débito', icon: CreditCard },
              { id: 'credit', label: 'Crédito', icon: CreditCard },
              { id: 'pix', label: 'PIX', icon: DollarSign },
            ].map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-2 rounded-lg border-2 transition-all text-xs font-medium touch-manipulation ${
                    paymentMethod === method.id
                      ? 'border-pink-500 bg-pink-500 text-white shadow-md scale-105'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 active:scale-95'
                  }`}
                >
                  <Icon size={14} className="mx-auto mb-1" />
                  <div className="truncate">{method.label}</div>
                </button>
              );
            })}
          </div>
          
          {/* Enhanced pay button with method indicator */}
          <button
            onClick={handlePayment}
            disabled={isProcessingPayment || groups.length === 0}
            className="w-full bg-pink-500 hover:bg-pink-600 active:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-4 rounded-xl transition-colors flex items-center justify-between touch-manipulation shadow-lg"
          >
            <div className="flex items-center space-x-2">
              {isProcessingPayment ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Pagar {formatPrice(totals.total)}</span>
                </>
              )}
            </div>
            
            {/* Selected payment method indicator */}
            {!isProcessingPayment && (
              <div className="flex items-center space-x-1 bg-white/20 px-2 py-1 rounded-md text-sm">
                {paymentMethod === 'cash' && <DollarSign size={14} />}
                {(paymentMethod === 'debit' || paymentMethod === 'credit') && <CreditCard size={14} />}
                {paymentMethod === 'pix' && <DollarSign size={14} />}
                <span className="text-xs">
                  {paymentMethod === 'cash' && 'Dinheiro'}
                  {paymentMethod === 'debit' && 'Débito'}
                  {paymentMethod === 'credit' && 'Crédito'}
                  {paymentMethod === 'pix' && 'PIX'}
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutDrawer;