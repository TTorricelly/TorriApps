import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogHeader, 
  DialogBody, 
  DialogFooter, 
  Typography, 
  Button, 
  Select, 
  Option, 
  Input, 
  Spinner,
  Alert,
  Card,
  CardBody,
  Badge
} from "@material-tailwind/react";
import {
  ExclamationTriangleIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MinusIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";


const AddServicesModal = ({ open, onClose, onAddServices, modalContext, preloadedServices }) => {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    services: [],
    professionalId: '',
    notes: ''
  });
  
  // Services state
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);

  // Load categories and professionals on mount
  useEffect(() => {
    if (open) {
      if (preloadedServices?.categories) {
        setCategories(preloadedServices.categories);
        // Clear loading/error states when services are available
        setLoading(false);
        setError(null);
      } else {
        // Show loading state if services aren't preloaded
        setLoading(true);
        setError('Carregando serviços... Aguarde um momento.');
      }
    }
  }, [open, preloadedServices]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setFormData({
        clientName: '',
        clientPhone: '',
        clientEmail: '',
        services: [],
        professionalId: '',
        notes: ''
      });
      setCart([]);
      setSelectedCategory(null);
      setSearchTerm('');
      setError(null);
    }
  }, [open]);

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Calculate total duration and price
  const calculateTotals = () => {
    const totalDuration = cart.reduce((sum, item) => sum + (item.service.duration * item.quantity), 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.service.price * item.quantity), 0);
    return { totalDuration, totalPrice };
  };

  // Add service to cart
  const addToCart = (service) => {
    const existingItem = cart.find(item => item.service.id === service.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.service.id === service.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { service, quantity: 1 }]);
    }
  };

  // Remove service from cart
  const removeFromCart = (serviceId) => {
    const existingItem = cart.find(item => item.service.id === serviceId);
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item => 
        item.service.id === serviceId 
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.service.id !== serviceId));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { totalDuration, totalPrice } = calculateTotals();
      const appointmentData = {
        client_name: formData.clientName,
        client_phone: formData.clientPhone,
        client_email: formData.clientEmail,
        services: cart.map(item => ({
          service_id: item.service.id,
          quantity: item.quantity
        })),
        professional_id: formData.professionalId,
        total_duration_minutes: totalDuration,
        total_price: totalPrice,
        notes: formData.notes,
        status: 'WALK_IN'
      };

      await onAddServices(appointmentData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar serviços');
    } finally {
      setLoading(false);
    }
  };

  // Filter services based on search
  const filteredServices = selectedCategory
    ? selectedCategory.services.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Get professionals for selected services
  const getAvailableProfessionals = () => {
    // Use preloaded professionals if available
    const professionals = preloadedServices?.professionals || [];
    
    if (cart.length === 0) return professionals;
    
    const serviceCategories = [...new Set(
      cart.map(item => {
        const category = categories.find(cat => 
          cat.services && cat.services.some(s => s.id === item.service.id)
        );
        return category?.name;
      }).filter(Boolean)
    )];

    return professionals.filter(prof =>
      serviceCategories.some(cat => prof.specialties && prof.specialties.includes(cat))
    );
  };

  // Render client information step
  const renderClientStep = () => (
    <div className="space-y-l">
      <Typography variant="h6" className="text-text-primary">
        Informações do Cliente
      </Typography>
      
      <div className="space-y-m">
        <Input
          label="Nome do Cliente"
          value={formData.clientName}
          onChange={(e) => setFormData({...formData, clientName: e.target.value})}
          className="text-text-primary"
          labelProps={{ className: "text-text-secondary" }}
          required
        />
        
        <Input
          label="Telefone"
          value={formData.clientPhone}
          onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
          className="text-text-primary"
          labelProps={{ className: "text-text-secondary" }}
          required
        />
        
        <Input
          label="Email (opcional)"
          value={formData.clientEmail}
          onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
          className="text-text-primary"
          labelProps={{ className: "text-text-secondary" }}
        />
      </div>
    </div>
  );

  // Render services selection step
  const renderServicesStep = () => (
    <div className="space-y-l">
      <Typography variant="h6" className="text-text-primary">
        Selecionar Serviços
      </Typography>
      
      {/* Category Selection */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-3 gap-s">
          {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category)}
            className={`
              p-m rounded-card border-2 text-center transition-all duration-normal
              ${selectedCategory?.id === category.id
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-bg-tertiary bg-bg-tertiary text-text-secondary hover:border-accent-primary/50'
              }
            `}
          >
            <Typography variant="small" className="font-medium">
              {category.name}
            </Typography>
          </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-l">
          <Typography className="text-text-secondary">
            Nenhuma categoria disponível. Aguarde o carregamento dos serviços.
          </Typography>
        </div>
      )}

      {/* Service Search */}
      {selectedCategory && (
        <div className="relative">
          <Input
            label="Buscar serviços..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            className="text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          />
        </div>
      )}

      {/* Services List */}
      {selectedCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-s max-h-64 overflow-y-auto">
          {filteredServices.map((service) => (
            <Card key={service.id} className="bg-bg-secondary border border-bg-tertiary">
              <CardBody className="p-m">
                <div className="flex justify-between items-start mb-s">
                  <Typography variant="h6" className="text-text-primary text-small">
                    {service.name}
                  </Typography>
                  <Button
                    size="sm"
                    onClick={() => addToCart(service)}
                    className="bg-accent-primary hover:bg-accent-primary/90 text-white p-s"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex justify-between text-small text-text-secondary">
                  <span className="flex items-center gap-xs">
                    <ClockIcon className="h-4 w-4" />
                    {service.duration}min
                  </span>
                  <span className="flex items-center gap-xs font-medium text-accent-secondary">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    {formatPrice(service.price)}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Cart */}
      {cart.length > 0 && (
        <div className="border-t border-bg-tertiary pt-l">
          <Typography variant="h6" className="text-text-primary mb-m">
            Serviços Selecionados
          </Typography>
          
          <div className="space-y-s">
            {cart.map((item) => (
              <div
                key={item.service.id}
                className="flex items-center justify-between p-s bg-bg-tertiary rounded-button"
              >
                <div className="flex-1">
                  <Typography variant="small" className="text-text-primary font-medium">
                    {item.service.name}
                  </Typography>
                  <Typography variant="small" className="text-text-secondary">
                    {item.service.duration}min • {formatPrice(item.service.price)}
                  </Typography>
                </div>
                
                <div className="flex items-center gap-s">
                  <button
                    onClick={() => removeFromCart(item.service.id)}
                    className="p-xs text-text-secondary hover:text-status-error"
                  >
                    <MinusIcon className="h-4 w-4" />
                  </button>
                  
                  <Badge content={item.quantity} className="bg-accent-primary">
                    <div className="w-6 h-6"></div>
                  </Badge>
                  
                  <button
                    onClick={() => addToCart(item.service)}
                    className="p-xs text-text-secondary hover:text-accent-primary"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-m pt-m border-t border-bg-tertiary">
            <div className="flex justify-between text-text-primary font-semibold">
              <span>Total: {calculateTotals().totalDuration}min</span>
              <span>{formatPrice(calculateTotals().totalPrice)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render professional selection step
  const renderProfessionalStep = () => (
    <div className="space-y-l">
      <Typography variant="h6" className="text-text-primary">
        Selecionar Profissional
      </Typography>
      
      <div className="space-y-m">
        {getAvailableProfessionals().length > 0 ? (
          <Select
            label="Profissional"
            value={formData.professionalId}
            onChange={(value) => setFormData({...formData, professionalId: value})}
            className="text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          >
            {getAvailableProfessionals().map((professional) => (
              <Option key={professional.id} value={professional.id.toString()}>
                <div className="flex items-center gap-s">
                  <UserIcon className="h-4 w-4" />
                  <span>{professional.name}</span>
                  {professional.specialties && (
                    <span className="text-small text-text-secondary">
                      ({professional.specialties.join(', ')})
                    </span>
                  )}
                </div>
              </Option>
            ))}
          </Select>
        ) : (
          <div className="text-center py-l">
            <Typography className="text-text-secondary">
              Nenhum profissional disponível. Aguarde o carregamento.
            </Typography>
          </div>
        )}
        
        <Input
          label="Observações (opcional)"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="text-text-primary"
          labelProps={{ className: "text-text-secondary" }}
        />
      </div>
    </div>
  );

  // Get current step content
  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 1: return renderClientStep();
      case 2: return renderServicesStep();
      case 3: return renderProfessionalStep();
      default: return null;
    }
  };

  // Check if current step is valid
  const isStepValid = () => {
    switch (currentStep) {
      case 1: return formData.clientName && formData.clientPhone;
      case 2: return cart.length > 0;
      case 3: return formData.professionalId;
      default: return false;
    }
  };

  return (
    <Dialog 
      open={open} 
      handler={onClose}
      size="xl"
      className="bg-bg-secondary border border-bg-tertiary max-h-[90vh] overflow-hidden"
    >
      <DialogHeader className="text-text-primary border-b border-bg-tertiary">
        <Typography variant="h4" className="text-text-primary">
          {modalContext?.mode === 'add-to-existing' 
            ? `Adicionar Serviços para ${modalContext.targetGroup?.client_name} - Passo ${currentStep} de 3`
            : `Adicionar Serviços - Passo ${currentStep} de 3`
          }
        </Typography>
      </DialogHeader>
      
      <DialogBody className="p-l max-h-[60vh] overflow-y-auto">
        {error && (
          <Alert
            color="red"
            icon={<ExclamationTriangleIcon className="h-5 w-5" />}
            className="mb-l bg-status-error/20 text-status-error"
          >
            {error}
          </Alert>
        )}
        
        {getCurrentStepContent()}
      </DialogBody>
      
      <DialogFooter className="border-t border-bg-tertiary flex justify-between">
        <div className="flex gap-s">
          {currentStep > 1 && (
            <Button
              variant="outlined"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="border-bg-tertiary text-text-secondary hover:bg-bg-tertiary"
            >
              Voltar
            </Button>
          )}
          
          <Button
            variant="outlined"
            onClick={onClose}
            className="border-bg-tertiary text-text-secondary hover:bg-bg-tertiary"
          >
            Cancelar
          </Button>
        </div>
        
        <div className="flex gap-s">
          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!isStepValid()}
              className="bg-accent-primary hover:bg-accent-primary/90 text-white disabled:opacity-50"
            >
              Próximo
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || loading}
              className="bg-accent-primary hover:bg-accent-primary/90 text-white disabled:opacity-50 flex items-center gap-s"
            >
              {loading && <Spinner className="h-4 w-4" />}
              Adicionar Serviços
            </Button>
          )}
        </div>
      </DialogFooter>
    </Dialog>
  );
};

export default AddServicesModal;