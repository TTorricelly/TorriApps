import { useState, useEffect, useRef } from 'react';
import { createMergedCheckoutSession, processAppointmentPayment } from '../Services/appointmentsApi';
import { getClientDisplayName } from '../utils/clientUtils';
import { 
  Dialog, 
  DialogHeader, 
  DialogBody, 
  DialogFooter, 
  Typography, 
  Button, 
  Card,
  CardBody,
  Input
} from "@material-tailwind/react";
import {
  CurrencyDollarIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ShoppingCartIcon,
  CubeIcon,
  ReceiptPercentIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  MinusCircleIcon
} from "@heroicons/react/24/outline";

const CheckoutModal = ({ 
  open, 
  onClose, 
  appointmentGroup, 
  onPaymentComplete,
  isMinimized = false,
  onMinimize,
  onGroupAdd,
  onAddMoreServices,
  refreshTrigger // New prop to force refresh
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('items');
  
  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('MONEY');
  const [amountPaid, setAmountPaid] = useState(appointmentGroup?.total_price || 0);
  const [loading, setLoading] = useState(false);
  
  // Products state
  const [additionalProducts, setAdditionalProducts] = useState([]);
  
  // Discounts state
  const [customDiscountAmount, setCustomDiscountAmount] = useState(0);
  const [customDiscountPercentage, setCustomDiscountPercentage] = useState(0);
  
  // Tip state
  const [selectedTipPercentage, setSelectedTipPercentage] = useState(0);
  const [customTipAmount, setCustomTipAmount] = useState(0);
  
  // Error state
  const [paymentError, setPaymentError] = useState(null);
  
  // Checkout session state (like mobile version)
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(false);
  
  // Refs
  const dialogRef = useRef(null);

  // Fetch detailed checkout session when modal opens (like mobile version)
  useEffect(() => {
    const fetchCheckoutSession = async () => {
      if (open && appointmentGroup) {
        setLoadingSession(true);
        try {
          const session = await createMergedCheckoutSession([appointmentGroup.id]);
          setCheckoutSession(session);
          setAmountPaid(session.total_amount || appointmentGroup.total_price || 0);
        } catch (error) {
          console.error('Failed to fetch checkout session:', error);
          setPaymentError('Erro ao carregar detalhes do checkout');
          // Fallback to basic appointment group data
          setCheckoutSession(null);
          setAmountPaid(appointmentGroup?.total_price || 0);
        } finally {
          setLoadingSession(false);
        }
      } else {
        setCheckoutSession(null);
      }
    };
    
    if (open && appointmentGroup) {
      setActiveTab('items');
      setAdditionalProducts([]);
      setCustomDiscountAmount(0);
      setCustomDiscountPercentage(0);
      setSelectedTipPercentage(0);
      setCustomTipAmount(0);
      setPaymentError(null);
      fetchCheckoutSession();
    }
  }, [open, appointmentGroup, refreshTrigger]);

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Calculate totals (using checkout session like mobile version)
  const calculateTotals = () => {
    // Use detailed services from checkout session or fallback to appointment group
    const servicesTotal = checkoutSession?.services?.reduce((sum, service) => sum + parseFloat(service.price || 0), 0) || appointmentGroup?.total_price || 0;
    
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
  
  // Calculate change for cash payments
  const change = amountPaid - totals.total;
  
  // Handle tip selection
  const handleTipSelect = (percentage) => {
    setSelectedTipPercentage(percentage);
    setCustomTipAmount(0);
  };
  
  // Handle custom tip amount
  const handleCustomTipChange = (amount) => {
    setCustomTipAmount(amount);
    setSelectedTipPercentage(0);
  };
  
  // Add product
  const addProduct = (product) => {
    setAdditionalProducts(prev => [...prev, { ...product, quantity: 1 }]);
  };
  
  // Update product quantity
  const updateProductQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeProduct(index);
      return;
    }
    setAdditionalProducts(prev => 
      prev.map((product, i) => i === index ? { ...product, quantity } : product)
    );
  };
  
  // Remove product
  const removeProduct = (index) => {
    setAdditionalProducts(prev => prev.filter((_, i) => i !== index));
  };
  
  // Handle drag over for adding groups (like mobile version)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const draggedGroupData = e.dataTransfer.getData('application/json');
      if (draggedGroupData && onGroupAdd) {
        const group = JSON.parse(draggedGroupData);
        onGroupAdd(group);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // Handle payment completion (using mobile version API)
  const handlePayment = async () => {
    setLoading(true);
    setPaymentError(null);
    
    try {
      const paymentData = {
        group_ids: [appointmentGroup.id],
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tip_amount: totals.tipAmount,
        total_amount: totals.total,
        payment_method: paymentMethod.toLowerCase(), // mobile uses lowercase
        additional_products: additionalProducts
      };
      
      const result = await processAppointmentPayment(paymentData);
      
      // Call the original onPaymentComplete with the result
      await onPaymentComplete({
        appointment_group_id: appointmentGroup.id,
        payment_method: paymentMethod,
        amount_paid: paymentMethod === 'MONEY' ? amountPaid : totals.total,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        tip_amount: totals.tipAmount,
        total_price: totals.total,
        change: paymentMethod === 'MONEY' ? change : 0,
        additional_products: additionalProducts,
        api_result: result
      });
      
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Early return after all hooks
  if (!appointmentGroup) return null;

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'items':
        return (
          <div className="space-y-s">
            {/* Service Summary */}
            <Card className="bg-bg-primary border border-bg-tertiary">
              <CardBody className="p-s">
                <div className="flex items-center justify-between mb-s">
                  <Typography variant="h6" className="text-text-primary text-sm font-semibold">
                    Serviços
                  </Typography>
                  {onAddMoreServices && (
                    <Button
                      size="sm"
                      variant="outlined"
                      className="border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white text-xs py-xs px-s"
                      onClick={() => onAddMoreServices({
                        mode: 'add-to-existing',
                        existingGroupId: appointmentGroup.id,
                        existingClient: {
                          id: appointmentGroup.client_id,
                          name: getClientDisplayName(appointmentGroup, 'selection')
                        }
                      })}
                    >
                      <PlusIcon className="h-3 w-3 mr-xs" />
                      Adicionar
                    </Button>
                  )}
                </div>
                
                {/* Client info */}
                <div className="flex items-center gap-xs p-xs bg-bg-tertiary rounded-input mb-s">
                  <UserIcon className="h-3 w-3 text-accent-primary" />
                  <Typography className="font-medium text-accent-primary text-sm">
                    {getClientDisplayName(appointmentGroup, 'card')}
                  </Typography>
                </div>
                
                {loadingSession ? (
                  <div className="text-center py-4 text-text-secondary">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-primary border-t-transparent mx-auto mb-2"></div>
                    <Typography className="text-sm">Carregando serviços...</Typography>
                  </div>
                ) : checkoutSession?.services ? (
                  // Individual services from detailed session (4-column grid layout)
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-xs">
                    {checkoutSession.services.map((service, index) => (
                      <div key={`${service.id}-${index}`} className="bg-bg-tertiary rounded-input p-xs hover:bg-bg-secondary transition-colors border border-transparent hover:border-accent-primary/20">
                        {/* Service name */}
                        <Typography className="font-semibold text-xs text-text-primary mb-1 line-clamp-2 min-h-[2rem]">
                          {service.name}
                        </Typography>
                        
                        {/* Price - prominent */}
                        <Typography className="font-bold text-sm text-status-success mb-1">
                          {formatPrice(service.price)}
                        </Typography>
                        
                        {/* Professional */}
                        <div className="flex items-center gap-1 mb-1">
                          <UserIcon className="h-2.5 w-2.5 text-accent-primary flex-shrink-0" />
                          <span className="text-xs text-text-secondary truncate">
                            {service.professional_name || 'Não atribuído'}
                          </span>
                        </div>
                        
                        {/* Duration */}
                        {service.duration_minutes && (
                          <div className="flex items-center gap-1">
                            <ClockIcon className="h-2.5 w-2.5 text-text-tertiary flex-shrink-0" />
                            <span className="text-xs text-text-tertiary">
                              {service.duration_minutes >= 60 ? 
                                `${Math.floor(service.duration_minutes / 60)}h ${service.duration_minutes % 60}min` :
                                `${service.duration_minutes}min`}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Enhanced fallback with appointment group data (4-column grid layout)
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-xs">
                    {appointmentGroup.service_names && appointmentGroup.service_names.split(', ').map((service, index) => {
                      const serviceCount = appointmentGroup.service_names.split(', ').length;
                      const estimatedDuration = appointmentGroup.total_duration_minutes ? 
                        Math.floor(appointmentGroup.total_duration_minutes / serviceCount) : null;
                      const estimatedPrice = appointmentGroup.total_price / serviceCount;
                      
                      return (
                        <div key={index} className="bg-bg-tertiary rounded-input p-xs hover:bg-bg-secondary transition-colors border border-transparent hover:border-accent-primary/20">
                          {/* Service name */}
                          <Typography className="font-semibold text-xs text-text-primary mb-1 line-clamp-2 min-h-[2rem]">
                            {service.trim()}
                          </Typography>
                          
                          {/* Price - prominent */}
                          <Typography className="font-bold text-sm text-status-success mb-1">
                            {formatPrice(estimatedPrice)}
                          </Typography>
                          
                          {/* Professional */}
                          <div className="flex items-center gap-1 mb-1">
                            <UserIcon className="h-2.5 w-2.5 text-accent-primary flex-shrink-0" />
                            <span className="text-xs text-text-secondary truncate">
                              A definir
                            </span>
                          </div>
                          
                          {/* Duration */}
                          {estimatedDuration && (
                            <div className="flex items-center gap-1">
                              <ClockIcon className="h-2.5 w-2.5 text-text-tertiary flex-shrink-0" />
                              <span className="text-xs text-text-tertiary">
                                {estimatedDuration >= 60 ? 
                                  `${Math.floor(estimatedDuration / 60)}h ${estimatedDuration % 60}min aprox.` :
                                  `${estimatedDuration}min aprox.`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        );
        
      case 'products':
        return (
          <div className="space-y-s">
            <div className="flex items-center justify-between">
              <Typography variant="h6" className="text-text-primary text-sm font-semibold">
                Produtos Adicionais
              </Typography>
              <Button
                size="sm"
                variant="outlined"
                className="border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white text-xs py-xs px-s"
                onClick={() => {
                  addProduct({ id: Date.now(), name: 'Produto Exemplo', price: 25.00 });
                }}
              >
                <PlusIcon className="h-3 w-3 mr-xs" />
                Adicionar
              </Button>
            </div>
            
            {additionalProducts.length === 0 ? (
              <div className="text-center py-l text-text-secondary">
                <CubeIcon className="h-6 w-6 mx-auto mb-s text-text-tertiary" />
                <Typography className="text-sm">Nenhum produto adicionado</Typography>
              </div>
            ) : (
              <div className="space-y-xs">
                {additionalProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-xs bg-bg-primary border border-bg-tertiary rounded-card hover:bg-bg-tertiary transition-colors">
                    <div className="flex-1">
                      <Typography className="font-medium text-sm text-text-primary">{product.name}</Typography>
                      <div className="flex items-center gap-xs mt-xs">
                        <Button
                          size="sm"
                          variant="outlined"
                          className="h-5 w-5 p-0 border-bg-tertiary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary min-w-0"
                          onClick={() => updateProductQuantity(index, product.quantity - 1)}
                        >
                          <MinusIcon className="h-2 w-2" />
                        </Button>
                        <span className="text-xs font-medium text-text-primary min-w-[20px] text-center">{product.quantity}</span>
                        <Button
                          size="sm"
                          variant="outlined"
                          className="h-5 w-5 p-0 border-bg-tertiary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary min-w-0"
                          onClick={() => updateProductQuantity(index, product.quantity + 1)}
                        >
                          <PlusIcon className="h-2 w-2" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-xs">
                      <Typography className="font-semibold text-accent-secondary text-sm">
                        {formatPrice(product.price * product.quantity)}
                      </Typography>
                      <Button
                        size="sm"
                        variant="outlined"
                        className="h-5 w-5 p-0 border-status-error text-status-error hover:bg-status-error hover:text-white min-w-0"
                        onClick={() => removeProduct(index)}
                      >
                        <TrashIcon className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'discounts':
        return (
          <div className="space-y-s">
            <Typography variant="h6" className="text-text-primary text-sm font-semibold">
              Descontos
            </Typography>
            
            <div className="space-y-s">
              <div>
                <Typography className="text-sm text-text-secondary mb-xs">
                  Porcentagem de Desconto
                </Typography>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={customDiscountPercentage}
                  onChange={(e) => setCustomDiscountPercentage(parseFloat(e.target.value) || 0)}
                  className="text-text-primary bg-bg-input border-bg-tertiary focus:border-accent-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  placeholder="0"
                />
              </div>
              
              <div>
                <Typography className="text-sm text-text-secondary mb-xs">
                  Valor Fixo de Desconto
                </Typography>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customDiscountAmount}
                  onChange={(e) => setCustomDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="text-text-primary bg-bg-input border-bg-tertiary focus:border-accent-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  placeholder="0.00"
                  icon={<CurrencyDollarIcon className="h-3 w-3 text-text-tertiary" />}
                />
              </div>
              
              {totals.discountAmount > 0 && (
                <div className="p-s bg-status-success/20 border border-status-success rounded-card">
                  <Typography className="text-sm text-status-success font-medium">
                    Desconto Aplicado: {formatPrice(totals.discountAmount)}
                  </Typography>
                </div>
              )}
            </div>
          </div>
        );
        
      case 'payments':
        return (
          <div className="space-y-s">
            {/* Cash Payment Amount - Only shown when cash is selected */}
            {paymentMethod === 'MONEY' && (
              <div className="space-y-s">
                <Typography variant="h6" className="text-text-primary text-sm font-semibold">
                  Valor Recebido
                </Typography>
                
                <Input
                  type="number"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="text-text-primary bg-bg-input border-bg-tertiary focus:border-accent-primary"
                  labelProps={{ className: "text-text-secondary" }}
                  icon={<CurrencyDollarIcon className="h-4 w-4 text-text-tertiary" />}
                />
                
                {change > 0 && (
                  <div className="bg-status-warning/20 border border-status-warning rounded-card p-xs">
                    <Typography className="text-status-warning font-medium text-sm">
                      Troco: {formatPrice(change)}
                    </Typography>
                  </div>
                )}
                
                {change < 0 && (
                  <div className="bg-status-error/20 border border-status-error rounded-card p-xs">
                    <Typography className="text-status-error font-medium text-sm">
                      Faltam: {formatPrice(Math.abs(change))}
                    </Typography>
                  </div>
                )}
              </div>
            )}
            
            {/* Tip Selection - Compact Layout */}
            <div>
              <Typography variant="h6" className="text-text-primary text-sm font-semibold mb-s">
                Gorjeta
              </Typography>
              
              {/* Compact row with buttons and custom input */}
              <div className="flex gap-xs items-end">
                {/* Tip percentage buttons */}
                <div className="flex gap-xs flex-1">
                  {[0, 10, 15, 18].map((percentage) => (
                    <Button
                      key={percentage}
                      variant={selectedTipPercentage === percentage ? 'filled' : 'outlined'}
                      size="sm"
                      className={`transition-colors text-xs py-xs px-xs flex-1 ${
                        selectedTipPercentage === percentage
                          ? 'bg-accent-primary text-white border-accent-primary'
                          : 'border-bg-tertiary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                      }`}
                      onClick={() => handleTipSelect(percentage)}
                    >
                      {percentage === 0 ? '0%' : `${percentage}%`}
                    </Button>
                  ))}
                </div>
                
                {/* Custom tip input */}
                <div className="w-24">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customTipAmount}
                    onChange={(e) => handleCustomTipChange(parseFloat(e.target.value) || 0)}
                    className="text-text-primary bg-bg-input border-bg-tertiary focus:border-accent-primary text-xs"
                    labelProps={{ className: "text-text-secondary" }}
                    placeholder="R$ 0,00"
                    size="sm"
                  />
                </div>
              </div>
              
              {/* Optional: Show selected tip amount */}
              {(selectedTipPercentage > 0 || customTipAmount > 0) && (
                <div className="mt-xs">
                  <Typography className="text-xs text-text-tertiary">
                    Gorjeta: {formatPrice(selectedTipPercentage > 0 ? 
                      (calculateTotals().subtotal - calculateTotals().discountAmount) * selectedTipPercentage / 100 : 
                      customTipAmount)}
                  </Typography>
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog 
      open={open} 
      handler={onClose}
      size={isMinimized ? "md" : "lg"}
      className={`bg-bg-secondary border border-bg-tertiary transition-all shadow-card-hover ${
        isMinimized ? 'transform scale-95 opacity-90' : ''
      } !z-[1080]`}
      style={{ zIndex: 1080 }}
      BackdropProps={{
        style: { zIndex: 1079 }
      }}
      ref={dialogRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <DialogHeader className="text-text-primary border-b border-bg-tertiary bg-bg-primary px-m py-s">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-s">
            <div className="p-s bg-accent-primary rounded-button">
              <CurrencyDollarIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <Typography variant="h6" className="text-text-primary font-semibold">
                Checkout
              </Typography>
              <Typography className="text-text-secondary text-sm">
                {getClientDisplayName(appointmentGroup, 'card')}
              </Typography>
            </div>
          </div>
          <div className="flex items-center gap-xs">
            {onMinimize && (
              <Button
                variant="text"
                size="sm"
                className="text-text-secondary hover:text-text-primary hover:bg-bg-tertiary p-xs min-w-0"
                onClick={onMinimize}
              >
                <MinusCircleIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogHeader>
      
      <DialogBody className="p-0 max-h-[600px] overflow-hidden bg-bg-secondary">
        {/* Custom Tabs Implementation - No Material Tailwind */}
        <div className="h-full flex flex-col">
          {/* Custom Tab Header */}
          <div className="bg-bg-primary m-0 rounded-none border-b border-bg-tertiary p-xs flex">
            {[
              { id: 'items', label: 'Itens', icon: ShoppingCartIcon },
              { id: 'products', label: 'Produtos', icon: CubeIcon },
              { id: 'discounts', label: 'Desconto', icon: ReceiptPercentIcon },
              { id: 'payments', label: 'Pagamento', icon: CreditCardIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-xs font-medium transition-all text-xs py-s px-s rounded-button border-0 outline-none ring-0 shadow-none flex-1 ${
                    activeTab === tab.id
                      ? 'text-white bg-accent-primary hover:bg-accent-primary active:bg-accent-primary focus:bg-accent-primary'
                      : 'text-text-secondary bg-transparent hover:text-text-primary hover:bg-bg-tertiary active:bg-bg-tertiary focus:bg-bg-tertiary'
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* Custom Tab Content */}
          <div className="flex-1 overflow-y-auto p-m">
            <div className="p-0 h-full">
              {renderTabContent()}
            </div>
          </div>
        </div>
        
        {/* Payment Error */}
        {paymentError && (
          <div className="p-s bg-status-error/20 border-t border-status-error">
            <Typography className="text-status-error text-sm font-medium">
              {paymentError}
            </Typography>
          </div>
        )}
        
        {/* Modern Footer with Totals + Payment Methods + Pay Button */}
        <div className="border-t border-bg-tertiary p-s space-y-s bg-bg-primary">
          {/* Totals breakdown - Compact */}
          <div className="space-y-xs text-sm">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Subtotal:</span>
              <span className="font-medium text-text-primary">{formatPrice(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between items-center text-status-error">
                <span>Desconto:</span>
                <span className="font-medium">-{formatPrice(totals.discountAmount)}</span>
              </div>
            )}
            {totals.tipAmount > 0 && (
              <div className="flex justify-between items-center text-text-secondary">
                <span>Gorjeta ({selectedTipPercentage > 0 ? `${selectedTipPercentage}%` : 'Personalizado'}):</span>
                <span className="font-medium text-text-primary">{formatPrice(totals.tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center font-semibold text-base border-t border-bg-tertiary pt-xs">
              <span className="text-text-primary">Total:</span>
              <span className="text-accent-secondary text-lg">{formatPrice(totals.total)}</span>
            </div>
          </div>
          
          {/* Payment method quick selector - Compact */}
          <div className="grid grid-cols-4 gap-xs">
            {[
              { id: 'MONEY', label: 'Dinheiro', icon: BanknotesIcon },
              { id: 'DEBIT', label: 'Débito', icon: CreditCardIcon },
              { id: 'CARD', label: 'Crédito', icon: CreditCardIcon },
              { id: 'PIX', label: 'PIX', icon: CurrencyDollarIcon },
            ].map((method) => {
              const Icon = method.icon;
              return (
                <Button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-xs rounded-button border transition-all text-xs font-medium h-12 ${
                    paymentMethod === method.id
                      ? 'border-accent-primary bg-accent-primary text-white shadow-button scale-105'
                      : 'border-bg-tertiary bg-bg-secondary text-text-secondary hover:border-bg-tertiary hover:bg-bg-tertiary active:scale-95'
                  }`}
                >
                  <div className="flex flex-col items-center gap-xs">
                    <Icon className="h-3 w-3" />
                    <div className="truncate text-xs">{method.label}</div>
                  </div>
                </Button>
              );
            })}
          </div>
          
          {/* Modern pay button with design system styling */}
          <Button
            onClick={handlePayment}
            disabled={loading || (paymentMethod === 'MONEY' && change < 0)}
            className="w-full bg-accent-primary hover:bg-accent-primary/90 active:bg-accent-primary/80 disabled:bg-bg-tertiary disabled:cursor-not-allowed text-white font-semibold py-s px-m rounded-button transition-all flex items-center justify-between shadow-button hover:shadow-card"
          >
            <div className="flex items-center space-x-xs">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span className="text-sm">Processando...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">Pagar {formatPrice(totals.total)}</span>
                </>
              )}
            </div>
            
            {/* Selected payment method indicator */}
            {!loading && (
              <div className="flex items-center space-x-xs bg-white/10 px-xs py-xs rounded-input">
                {paymentMethod === 'MONEY' && <BanknotesIcon className="h-3 w-3" />}
                {(paymentMethod === 'DEBIT' || paymentMethod === 'CARD') && <CreditCardIcon className="h-3 w-3" />}
                {paymentMethod === 'PIX' && <CurrencyDollarIcon className="h-3 w-3" />}
                <span className="text-xs">
                  {paymentMethod === 'MONEY' && 'Dinheiro'}
                  {paymentMethod === 'DEBIT' && 'Débito'}
                  {paymentMethod === 'CARD' && 'Crédito'}
                  {paymentMethod === 'PIX' && 'PIX'}
                </span>
              </div>
            )}
          </Button>
        </div>
      </DialogBody>
    </Dialog>
  );
};

export default CheckoutModal;