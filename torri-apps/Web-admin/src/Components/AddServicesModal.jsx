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
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersIcon,
  PhoneIcon,
  EnvelopeIcon,
  ShoppingCartIcon,
  TrashIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";
import { searchClients } from '../Services/clientsApi';


const AddServicesModal = ({ open, onClose, onAddServices, modalContext, preloadedServices }) => {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Client search state
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
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
  const [allServices, setAllServices] = useState([]); // All services across categories
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [showAllServices, setShowAllServices] = useState(false); // Toggle between category and global view
  
  // Service assignment state (for per-service professional assignment)
  const [serviceAssignments, setServiceAssignments] = useState({});

  // Load categories and professionals on mount, handle context
  useEffect(() => {
    if (open) {
      if (preloadedServices?.categories && preloadedServices?.services) {
        setCategories(preloadedServices.categories);
        setAllServices(preloadedServices.services);
        // Clear loading/error states when services are available
        setLoading(false);
        setError(null);
      } else {
        // Show loading state if services aren't preloaded
        setLoading(true);
        setError('Carregando serviços... Aguarde um momento.');
      }

      // Handle add-to-existing context auto-selection
      if (modalContext?.mode === 'add-to-existing' && modalContext?.targetGroup) {
        const group = modalContext.targetGroup;
        
        // Auto-select existing client mode and populate client data
        setShowClientSearch(true);
        const clientData = {
          id: group.client_id || null,
          name: group.client_name,
          phone_number: group.client_phone || '',
          email: group.client_email || ''
        };
        setSelectedClient(clientData);
        setFormData(prev => ({
          ...prev,
          clientName: group.client_name,
          clientPhone: group.client_phone || '',
          clientEmail: group.client_email || ''
        }));
        
        // Show context notification
        setError(`Adicionando serviços para ${group.client_name}. As informações do cliente foram preenchidas automaticamente.`);
        setTimeout(() => setError(null), 3000);
      }
    }
  }, [open, preloadedServices, modalContext]);

  // Debounced client search effect
  useEffect(() => {
    if (!showClientSearch || !clientSearchTerm.trim()) {
      setClientSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setClientSearchLoading(true);
      try {
        const results = await searchClients(clientSearchTerm);
        setClientSearchResults(results || []);
      } catch (error) {
        console.error('Error searching clients:', error);
        setClientSearchResults([]);
      } finally {
        setClientSearchLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [clientSearchTerm, showClientSearch]);

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
      // Reset client search state
      setShowClientSearch(false);
      setClientSearchTerm('');
      setClientSearchResults([]);
      setSelectedClient(null);
      setServiceAssignments({});
      // Reset service view state
      setShowAllServices(false);
      setAllServices([]);
    }
  }, [open]);

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Toggle between new client and existing client modes
  const toggleClientMode = () => {
    if (showClientSearch) {
      // Switch to new client mode
      setShowClientSearch(false);
      setFormData({
        ...formData,
        clientName: '',
        clientPhone: '',
        clientEmail: ''
      });
      setSelectedClient(null);
      setClientSearchTerm('');
      setClientSearchResults([]);
    } else {
      // Switch to existing client search mode
      setShowClientSearch(true);
      setFormData({
        ...formData,
        clientName: '',
        clientPhone: '',
        clientEmail: ''
      });
    }
  };

  // Select an existing client
  const selectClient = (client) => {
    setSelectedClient(client);
    setFormData({
      ...formData,
      clientName: client.name || client.full_name || '',
      clientPhone: client.phone_number || client.phone || '',
      clientEmail: client.email || ''
    });
    setClientSearchTerm('');
    setClientSearchResults([]);
  };

  // Calculate total duration and price
  const calculateTotals = () => {
    const totalDuration = cart.reduce((sum, item) => {
      // Handle different possible duration field names
      const duration = item.service.duration || item.service.duration_minutes || 0;
      return sum + (duration * item.quantity);
    }, 0);
    const totalPrice = cart.reduce((sum, item) => {
      const price = parseFloat(item.service.price) || 0;
      return sum + (price * item.quantity);
    }, 0);
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
      
      // Create services array with individual professional assignments
      const servicesWithProfessionals = cart.map(item => ({
        service_id: item.service.id,
        quantity: item.quantity,
        professional_id: serviceAssignments[item.service.id] // Per-service professional assignment
      }));

      const appointmentData = {
        client_name: formData.clientName,
        client_phone: formData.clientPhone,
        client_email: formData.clientEmail,
        client_id: selectedClient?.id || null, // Include client ID if existing client selected
        services: servicesWithProfessionals,
        total_duration_minutes: totalDuration,
        total_price: totalPrice,
        notes: formData.notes,
        status: 'WALK_IN',
        // Include service assignments for backend processing
        service_assignments: serviceAssignments
      };

      await onAddServices(appointmentData);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao adicionar serviços');
    } finally {
      setLoading(false);
    }
  };

  // Filter services with unified search + category filtering
  const filteredServices = allServices.filter(service => {
    // Text search filter (always applied if searchTerm exists)
    const matchesSearch = !searchTerm.trim() || 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Category filter (applied if category is selected)
    const matchesCategory = !selectedCategory || service.category_id === selectedCategory.id;
    
    // Both filters must pass
    return matchesSearch && matchesCategory;
  });

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
      <div className="flex items-center justify-between">
        <Typography variant="h6" className="text-text-primary">
          Informações do Cliente
        </Typography>
        
        {/* Context-aware client mode toggle */}
        {modalContext?.mode === 'add-to-existing' ? (
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-full border border-blue-200">
            <UserIcon className="h-4 w-4 text-blue-600" />
            <Typography variant="small" className="text-blue-600 font-medium">
              Cliente do agendamento existente
            </Typography>
          </div>
        ) : (
          /* Client Mode Toggle for new appointments */
          <div className="flex items-center gap-2">
            <Button
              variant={!showClientSearch ? "filled" : "outlined"}
              size="sm"
              onClick={toggleClientMode}
              className={`flex items-center gap-2 px-4 py-2 ${
                !showClientSearch 
                  ? "bg-accent-primary text-white" 
                  : "border-accent-primary text-accent-primary hover:bg-accent-primary/10"
              }`}
            >
              <UserPlusIcon className="h-4 w-4" />
              Novo Cliente
            </Button>
            
            <Button
              variant={showClientSearch ? "filled" : "outlined"}
              size="sm"
              onClick={toggleClientMode}
              className={`flex items-center gap-2 px-4 py-2 ${
                showClientSearch 
                  ? "bg-accent-primary text-white" 
                  : "border-accent-primary text-accent-primary hover:bg-accent-primary/10"
              }`}
            >
              <UsersIcon className="h-4 w-4" />
              Cliente Existente
            </Button>
          </div>
        )}
      </div>

      {modalContext?.mode === 'add-to-existing' ? (
        // Add-to-existing mode: Show pre-filled client info
        <div className="space-y-m">
          <Card className="border-blue-200 bg-blue-50">
            <CardBody className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 p-3 rounded-full">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <Typography variant="h6" className="text-blue-700 font-semibold">
                    {modalContext.targetGroup?.client_name}
                  </Typography>
                  <div className="flex items-center space-x-4 mt-1">
                    {modalContext.targetGroup?.client_phone && (
                      <div className="flex items-center space-x-1">
                        <PhoneIcon className="h-4 w-4 text-blue-600" />
                        <Typography variant="small" className="text-blue-600">
                          {modalContext.targetGroup.client_phone}
                        </Typography>
                      </div>
                    )}
                    {modalContext.targetGroup?.client_email && (
                      <div className="flex items-center space-x-1">
                        <EnvelopeIcon className="h-4 w-4 text-blue-600" />
                        <Typography variant="small" className="text-blue-600">
                          {modalContext.targetGroup.client_email}
                        </Typography>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-blue-600">
                  <Typography variant="small" className="font-medium">
                    Agendamento #{modalContext.targetGroup?.id?.slice(-8)}
                  </Typography>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-card p-4">
            <Typography variant="small" className="text-yellow-700">
              💡 <strong>Dica:</strong> Os serviços serão adicionados ao agendamento existente deste cliente.
            </Typography>
          </div>
        </div>
      ) : showClientSearch ? (
        // Existing Client Search Mode for new appointments
        <div className="space-y-m">
          <div className="relative">
            <Input
              label="Buscar Cliente"
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              className="text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              placeholder="Digite o nome ou telefone do cliente"
            />
            
            {clientSearchLoading && (
              <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                <Spinner className="h-4 w-4" />
              </div>
            )}
          </div>

          {/* Client Search Results */}
          {clientSearchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Typography variant="small" className="text-text-secondary font-medium">
                Resultados da busca:
              </Typography>
              {clientSearchResults.map((client) => (
                <Card
                  key={client.id}
                  className={`cursor-pointer transition-all hover:shadow-md border ${
                    selectedClient?.id === client.id 
                      ? 'border-accent-primary bg-accent-primary/5' 
                      : 'border-bg-tertiary hover:border-accent-primary/50'
                  }`}
                  onClick={() => selectClient(client)}
                >
                  <CardBody className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-accent-primary/10 p-2 rounded-full">
                        <UserIcon className="h-5 w-5 text-accent-primary" />
                      </div>
                      <div className="flex-1">
                        <Typography variant="h6" className="text-text-primary text-sm font-medium">
                          {client.name || client.full_name}
                        </Typography>
                        <div className="flex items-center space-x-4 mt-1">
                          {client.phone_number && (
                            <div className="flex items-center space-x-1">
                              <PhoneIcon className="h-3 w-3 text-text-secondary" />
                              <Typography variant="small" className="text-text-secondary">
                                {client.phone_number}
                              </Typography>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center space-x-1">
                              <EnvelopeIcon className="h-3 w-3 text-text-secondary" />
                              <Typography variant="small" className="text-text-secondary">
                                {client.email}
                              </Typography>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {/* Selected Client Display */}
          {selectedClient && (
            <Card className="border-accent-primary bg-accent-primary/5">
              <CardBody className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-accent-primary p-2 rounded-full">
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <Typography variant="h6" className="text-text-primary font-medium">
                        Cliente Selecionado
                      </Typography>
                      <Typography variant="small" className="text-accent-primary font-medium">
                        {selectedClient.name || selectedClient.full_name}
                      </Typography>
                    </div>
                  </div>
                  <Button
                    variant="text"
                    size="sm"
                    onClick={() => {
                      setSelectedClient(null);
                      setFormData({
                        ...formData,
                        clientName: '',
                        clientPhone: '',
                        clientEmail: ''
                      });
                    }}
                    className="text-text-secondary hover:text-accent-primary"
                  >
                    Alterar
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      ) : (
        // New Client Form Mode
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
            label="Telefone (opcional)"
            value={formData.clientPhone}
            onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
            className="text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          />
          
          <Input
            label="Email (opcional)"
            value={formData.clientEmail}
            onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
            className="text-text-primary"
            labelProps={{ className: "text-text-secondary" }}
          />
        </div>
      )}
    </div>
  );

  // Render services selection step with master-detail layout
  const renderServicesStep = () => (
    <div className="h-full">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Typography variant="h6" className="text-text-primary flex-shrink-0">
          Selecionar Serviços
        </Typography>
        
        {/* Centered global search bar */}
        <div className="flex-1 flex justify-center px-8">
          <div className="w-96">
            <Input
              label="Buscar serviços..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<MagnifyingGlassIcon className="h-4 w-4" />}
              className="text-text-primary"
              labelProps={{ className: "text-text-secondary" }}
              placeholder="Digite o nome do serviço"
            />
          </div>
        </div>
        
        {/* Right spacer to balance layout */}
        <div className="flex-shrink-0 w-32"></div>
      </div>

      {/* Master-Detail Layout */}
      <div className="flex gap-4 h-[400px]">
        {/* Left Panel - Category Filters (30%) */}
        <div className="w-[30%] border-r border-bg-tertiary pr-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Typography variant="small" className="text-text-secondary font-medium">
                Filtrar por Categoria
              </Typography>
              {selectedCategory && (
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  className="text-text-secondary hover:text-accent-primary p-1"
                  title="Limpar filtro"
                >
                  Todos
                </Button>
              )}
            </div>
            
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {categories.length > 0 ? (
                categories.map((category) => {
                  const categoryServiceCount = allServices.filter(s => s.category_id === category.id).length;
                  const filteredCategoryCount = filteredServices.filter(s => s.category_id === category.id).length;
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(selectedCategory?.id === category.id ? null : category)}
                      className={`
                        w-full text-left px-3 py-2 rounded-md border transition-all duration-200
                        ${selectedCategory?.id === category.id
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-bg-tertiary bg-bg-secondary text-text-secondary hover:border-accent-primary/50 hover:bg-accent-primary/5'
                        }
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <Typography variant="small" className="font-medium">
                          {category.name}
                        </Typography>
                        <Typography variant="small" className="text-xs text-text-tertiary">
                          {searchTerm ? filteredCategoryCount : categoryServiceCount}
                        </Typography>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Typography className="text-text-secondary text-sm">
                    Carregando categorias...
                  </Typography>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Services (70%) */}
        <div className="flex-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="small" className="text-text-primary font-medium">
                  {selectedCategory ? selectedCategory.name : 'Todos os Serviços'}
                </Typography>
                <Typography variant="small" className="text-text-secondary">
                  {filteredServices.length} serviços {selectedCategory ? 'nesta categoria' : 'encontrados'}
                </Typography>
              </div>
              
              {/* Clear filters */}
              {(searchTerm || selectedCategory) && (
                <div className="flex gap-2">
                  {searchTerm && (
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="text-text-secondary hover:text-accent-primary"
                    >
                      Limpar busca
                    </Button>
                  )}
                  {selectedCategory && (
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="text-text-secondary hover:text-accent-primary"
                    >
                      Todas categorias
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-[350px] overflow-y-auto">
              {filteredServices.map((service) => (
                <Card 
                  key={service.id} 
                  className="bg-bg-secondary border border-bg-tertiary hover:border-accent-primary/50 transition-all cursor-pointer"
                  onClick={() => addToCart(service)}
                  title={`Adicionar ${service.name} ao carrinho`}
                >
                  <CardBody className="p-2">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 pr-1">
                        <Typography variant="small" className="text-text-primary font-medium text-xs leading-tight">
                          {service.name}
                        </Typography>
                        {!selectedCategory && (
                          <Typography variant="small" className="text-text-tertiary text-xs">
                            {service.category_name}
                          </Typography>
                        )}
                      </div>
                      <div className="bg-accent-primary text-white p-1 rounded min-w-0 h-5 w-5 flex items-center justify-center">
                        <PlusIcon className="h-3 w-3" />
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs text-text-secondary">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {service.duration || service.duration_minutes || 0}min
                      </span>
                      <span className="flex items-center gap-1 font-medium text-accent-secondary">
                        <CurrencyDollarIcon className="h-3 w-3" />
                        {formatPrice(service.price)}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Empty states */}
            {filteredServices.length === 0 && (
              <div className="text-center py-8">
                {searchTerm && selectedCategory ? (
                  <div>
                    <Typography className="text-text-secondary mb-2">
                      Nenhum serviço encontrado para "{searchTerm}" em {selectedCategory.name}
                    </Typography>
                    <div className="flex justify-center gap-2">
                      <Button
                        variant="text"
                        size="sm"
                        onClick={() => setSearchTerm('')}
                        className="text-accent-primary"
                      >
                        Limpar busca
                      </Button>
                      <Button
                        variant="text"
                        size="sm"
                        onClick={() => setSelectedCategory(null)}
                        className="text-accent-primary"
                      >
                        Ver todas categorias
                      </Button>
                    </div>
                  </div>
                ) : searchTerm ? (
                  <div>
                    <Typography className="text-text-secondary mb-2">
                      Nenhum serviço encontrado para "{searchTerm}"
                    </Typography>
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => setSearchTerm('')}
                      className="text-accent-primary"
                    >
                      Limpar busca
                    </Button>
                  </div>
                ) : selectedCategory ? (
                  <Typography className="text-text-secondary">
                    Nenhum serviço disponível em {selectedCategory.name}
                  </Typography>
                ) : (
                  <div>
                    <Typography className="text-text-secondary mb-2">
                      Digite algo na busca ou selecione uma categoria
                    </Typography>
                    <Typography variant="small" className="text-text-tertiary">
                      {allServices.length} serviços disponíveis
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Get professionals available for a specific service
  const getProfessionalsForService = (service) => {
    const allProfessionals = preloadedServices?.professionals || [];
    
    // Filter professionals based on service category/specialty
    const serviceCategory = service.category_name || 
      categories.find(cat => cat.services?.some(s => s.id === service.id))?.name;
    
    if (!serviceCategory) return allProfessionals;
    
    return allProfessionals.filter(prof =>
      !prof.specialties || 
      prof.specialties.length === 0 || 
      prof.specialties.includes(serviceCategory)
    );
  };

  // Assign professional to a specific service
  const assignProfessionalToService = (serviceId, professionalId) => {
    setServiceAssignments(prev => ({
      ...prev,
      [serviceId]: professionalId
    }));
  };

  // Check if all services have professionals assigned
  const areAllServicesAssigned = () => {
    const serviceIds = cart.map(item => item.service.id);
    return serviceIds.every(serviceId => serviceAssignments[serviceId]);
  };

  // Render professional assignment step
  const renderProfessionalStep = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Typography variant="small" className="text-text-primary font-semibold">
          Atribuir Profissionais
        </Typography>
        <Typography variant="small" className="text-text-secondary text-xs">
          {Object.keys(serviceAssignments).length} de {cart.length} serviços atribuídos
        </Typography>
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-4">
          <Typography className="text-text-secondary text-sm">
            Adicione serviços primeiro para atribuir profissionais.
          </Typography>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {cart.map((item) => {
            const availableProfessionals = getProfessionalsForService(item.service);
            const assignedProfessionalId = serviceAssignments[item.service.id];
            const assignedProfessional = availableProfessionals.find(p => p.id.toString() === assignedProfessionalId);

            return (
              <Card key={item.service.id} className="bg-bg-secondary border border-bg-tertiary">
                <CardBody className="p-3">
                  {/* Service Header */}
                  <div className="bg-accent-primary/5 px-3 py-2 rounded border border-accent-primary/20 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Typography variant="small" className="text-accent-primary font-semibold">
                          {item.service.name}
                        </Typography>
                        <Typography variant="small" className="text-text-secondary text-xs">
                          {item.service.duration || item.service.duration_minutes || 0}min • {formatPrice(item.service.price)}
                          {item.quantity > 1 && ` • ${item.quantity}x`}
                        </Typography>
                      </div>
                      {assignedProfessional && (
                        <div className="flex items-center gap-1 bg-white/70 px-2 py-1 rounded">
                          <UserIcon className="h-3 w-3 text-accent-primary" />
                          <Typography variant="small" className="text-accent-primary font-medium text-xs">
                            {assignedProfessional.full_name}
                          </Typography>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional Selection */}
                  <div className="space-y-2">
                    <Typography variant="small" className="text-text-secondary font-medium text-xs">
                      Selecionar Profissional:
                    </Typography>
                    
                    {availableProfessionals.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {availableProfessionals.map((professional) => {
                          const isSelected = assignedProfessionalId === professional.id.toString();
                          
                          return (
                            <div
                              key={professional.id}
                              className={`cursor-pointer transition-all duration-200 rounded-xl border-2 backdrop-blur-sm ${
                                isSelected
                                  ? 'border-pink-500 bg-gradient-to-r from-pink-500/20 to-purple-600/20 shadow-lg shadow-pink-500/25'
                                  : 'border-white/10 bg-white/5 hover:border-pink-400/50 hover:bg-white/10 hover:shadow-md'
                              }`}
                              onClick={() => assignProfessionalToService(item.service.id, professional.id.toString())}
                            >
                              <div className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className={`relative p-2.5 rounded-xl ${
                                    isSelected 
                                      ? 'bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg' 
                                      : 'bg-white/10 backdrop-blur-sm'
                                  }`}>
                                    <UserIcon className={`h-4 w-4 ${
                                      isSelected ? 'text-white' : 'text-white/80'
                                    }`} />
                                    {isSelected && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={`font-semibold text-sm truncate ${
                                      isSelected ? 'text-white' : 'text-white/90'
                                    }`}>
                                      {professional.full_name}
                                    </div>
                                    {professional.specialties && professional.specialties.length > 0 && (
                                      <div className={`text-xs truncate mt-0.5 ${
                                        isSelected ? 'text-white/70' : 'text-white/60'
                                      }`}>
                                        {professional.specialties.slice(0, 2).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <div className="text-green-400 flex-shrink-0 animate-pulse">
                                      <CheckCircleIcon className="h-5 w-5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Typography className="text-text-secondary text-sm">
                          Nenhum profissional disponível para este serviço.
                        </Typography>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}


      {/* Notes Section */}
      <div className="pt-m border-t border-bg-tertiary">
        <Input
          label="Observações (opcional)"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          className="text-text-primary"
          labelProps={{ className: "text-text-secondary" }}
          placeholder="Adicione observações sobre o atendimento..."
        />
      </div>
    </div>
  );

  // Render confirmation step
  const renderConfirmationStep = () => {
    const { totalDuration, totalPrice } = calculateTotals();
    
    return (
      <div className="space-y-l">
        <div className="text-center">
          <Typography variant="h6" className="text-text-primary mb-2">
            Confirmar Agendamento
          </Typography>
          <Typography variant="small" className="text-text-secondary">
            Revise as informações abaixo antes de finalizar
          </Typography>
        </div>

        {/* Client Summary */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <CardBody className="p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 p-3 rounded-full">
                <UserIcon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <Typography variant="h6" className="text-blue-700 font-semibold">
                  {formData.clientName}
                </Typography>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <PhoneIcon className="h-4 w-4 text-blue-600" />
                    <Typography variant="small" className="text-blue-600">
                      {formData.clientPhone}
                    </Typography>
                  </div>
                  {formData.clientEmail && (
                    <div className="flex items-center space-x-1">
                      <EnvelopeIcon className="h-4 w-4 text-blue-600" />
                      <Typography variant="small" className="text-blue-600">
                        {formData.clientEmail}
                      </Typography>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-blue-600">
                <Typography variant="small" className="font-medium">
                  {selectedClient ? 'Cliente Existente' : 'Novo Cliente'}
                </Typography>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Services Summary */}
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500 p-3 rounded-full">
                  <ShoppingCartIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h6" className="text-purple-700 font-semibold">
                    {cart.length} Serviço{cart.length !== 1 ? 's' : ''} Selecionado{cart.length !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="small" className="text-purple-600">
                    {totalDuration}min • {formatPrice(totalPrice)}
                  </Typography>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {cart.map((item) => {
                const assignedProfessionalId = serviceAssignments[item.service.id];
                const assignedProfessional = preloadedServices?.professionals?.find(p => p.id.toString() === assignedProfessionalId);
                
                return (
                  <div key={item.service.id} className="bg-white/70 rounded-lg p-3 border border-purple-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Typography variant="small" className="text-purple-700 font-medium">
                          {item.service.name}
                          {item.quantity > 1 && ` (${item.quantity}x)`}
                        </Typography>
                        <Typography variant="small" className="text-purple-600">
                          {item.service.duration}min • {formatPrice(item.service.price * item.quantity)}
                        </Typography>
                      </div>
                      <div className="text-right">
                        <Typography variant="small" className="text-purple-700 font-medium">
                          {assignedProfessional?.full_name || 'Sem profissional'}
                        </Typography>
                        {assignedProfessional?.specialties && (
                          <Typography variant="small" className="text-purple-600">
                            {assignedProfessional.specialties.join(', ')}
                          </Typography>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Total Summary */}
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-green-500 p-3 rounded-full">
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <Typography variant="h6" className="text-green-700 font-semibold">
                    Total do Agendamento
                  </Typography>
                  <Typography variant="small" className="text-green-600">
                    Duração total: {totalDuration} minutos
                  </Typography>
                </div>
              </div>
              <div className="text-right">
                <Typography variant="h4" className="text-green-700 font-bold">
                  {formatPrice(totalPrice)}
                </Typography>
                <Typography variant="small" className="text-green-600">
                  Status: WALK_IN
                </Typography>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Notes */}
        {formData.notes && (
          <Card className="bg-gray-50 border border-gray-200">
            <CardBody className="p-4">
              <Typography variant="small" className="text-gray-700">
                <strong>Observações:</strong> {formData.notes}
              </Typography>
            </CardBody>
          </Card>
        )}
      </div>
    );
  };

  // Get current step content
  const getCurrentStepContent = () => {
    switch (currentStep) {
      case 1: return renderClientStep();
      case 2: return renderServicesStep();
      case 3: return renderProfessionalStep();
      case 4: return renderConfirmationStep();
      default: return null;
    }
  };

  // Check if current step is valid
  const isStepValid = () => {
    switch (currentStep) {
      case 1: 
        // For existing client mode, require client selection
        // For new client mode, require only name (phone is optional)
        return showClientSearch 
          ? selectedClient !== null 
          : formData.clientName?.trim();
      case 2: return cart.length > 0;
      case 3: return areAllServicesAssigned(); // All services must have professionals assigned
      case 4: return true; // Confirmation step is always valid if we reached it
      default: return false;
    }
  };

  return (
    <Dialog 
      open={open} 
      handler={onClose}
      size="xl"
      className="bg-bg-secondary border border-bg-tertiary max-h-[85vh] overflow-hidden flex flex-col"
    >
      <DialogHeader className="text-text-primary border-b border-bg-tertiary pb-0">
        <div className="w-full">
          {/* Title */}
          <div className="mb-4">
            <Typography variant="h4" className="text-text-primary">
              {modalContext?.mode === 'add-to-existing' 
                ? `Adicionar Serviços para ${modalContext.targetGroup?.client_name}`
                : 'Adicionar Serviços'
              }
            </Typography>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            {/* Step Labels */}
            <div className="flex justify-between mb-2">
              {[
                { step: 1, label: 'Cliente' },
                { step: 2, label: 'Serviços' },
                { step: 3, label: 'Profissionais' },
                { step: 4, label: 'Confirmação' }
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                    ${currentStep === step 
                      ? 'border-accent-primary bg-accent-primary text-white' 
                      : currentStep > step 
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-bg-tertiary bg-bg-tertiary text-text-secondary'
                    }
                  `}>
                    {currentStep > step ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step}</span>
                    )}
                  </div>
                  <Typography variant="small" className={`ml-2 ${
                    currentStep === step ? 'text-accent-primary font-semibold' : 'text-text-secondary'
                  }`}>
                    {label}
                  </Typography>
                </div>
              ))}
            </div>

            {/* Progress Line */}
            <div className="relative">
              <div className="w-full h-2 bg-bg-tertiary rounded-full">
                <div 
                  className="h-2 bg-gradient-to-r from-accent-primary to-purple-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                />
              </div>
              
              {/* Step Dots */}
              <div className="absolute top-0 left-0 w-full h-2 flex justify-between items-center">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-4 h-4 rounded-full border-2 bg-white transition-all ${
                      currentStep >= step 
                        ? 'border-accent-primary' 
                        : 'border-bg-tertiary'
                    }`}
                    style={{ 
                      marginLeft: step === 1 ? '0' : '-8px',
                      marginRight: step === 3 ? '0' : '-8px'
                    }}
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </DialogHeader>
      
      <DialogBody className="p-l flex-1 overflow-y-auto">
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
      
      <DialogFooter className="border-t border-bg-tertiary flex justify-between items-center">
        <div className="flex gap-s">
          {currentStep > 1 && (
            <Button
              variant="outlined"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="border-bg-tertiary text-text-secondary hover:bg-bg-tertiary transition-all duration-200 active:scale-95"
              disabled={loading}
            >
              ← Voltar
            </Button>
          )}
          
          <Button
            variant="outlined"
            onClick={onClose}
            className="border-bg-tertiary text-text-secondary hover:bg-bg-tertiary transition-all duration-200 active:scale-95"
            disabled={loading}
          >
            Cancelar
          </Button>
        </div>

        {/* Shopping Cart Summary & Step validation helper */}
        <div className="flex-1 text-center">
          {/* Shopping Cart Summary in Footer */}
          {currentStep === 2 && cart.length > 0 && (
            <div className="mb-2 p-2 bg-accent-primary/5 rounded-lg border border-accent-primary/20">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShoppingCartIcon className="h-4 w-4 text-accent-primary" />
                  <Typography variant="small" className="text-accent-primary font-medium">
                    {cart.length} serviço{cart.length !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="small" className="text-text-secondary">
                    {formatPrice(calculateTotals().totalPrice)}
                  </Typography>
                </div>
                
                {/* Quick preview chips */}
                <div className="flex flex-wrap gap-1 max-w-md">
                  {cart.map((item) => (
                    <div
                      key={item.service.id}
                      className="bg-accent-primary/10 px-2 py-1 rounded-full border border-accent-primary/30 flex items-center gap-1"
                    >
                      <Typography variant="small" className="text-accent-primary text-xs">
                        {item.service.name}
                      </Typography>
                      {item.quantity > 1 && (
                        <Badge size="sm" content={item.quantity} className="bg-accent-primary">
                          <div className="w-1 h-1"></div>
                        </Badge>
                      )}
                      <button
                        onClick={() => removeFromCart(item.service.id)}
                        className="text-text-secondary hover:text-status-error"
                        title={`Remover ${item.service.name}`}
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => setCart([])}
                  className="text-text-secondary hover:text-status-error p-1"
                  title="Limpar carrinho"
                >
                  <TrashIcon className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Assignment Status in Footer (Step 3) */}
          {currentStep === 3 && cart.length > 0 && (
            <div className={`mb-2 p-3 rounded-lg border-2 ${
              areAllServicesAssigned() 
                ? 'bg-gray-800 border-green-500' 
                : 'bg-gray-800 border-yellow-500'
            }`}>
              <div className="flex items-center justify-center gap-3">
                <div className={`p-2 rounded-full ${
                  areAllServicesAssigned() ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  {areAllServicesAssigned() ? (
                    <CheckCircleIcon className="h-4 w-4 text-white" />
                  ) : (
                    <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                  )}
                </div>
                
                <div className="text-center">
                  <Typography variant="small" className={`font-semibold ${
                    areAllServicesAssigned() ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    Status da Atribuição
                  </Typography>
                  <Typography variant="small" className="text-gray-300 text-xs">
                    {Object.keys(serviceAssignments).length} de {cart.length} serviços atribuídos
                  </Typography>
                </div>
                
                {!areAllServicesAssigned() && (
                  <Typography variant="small" className="text-yellow-400 font-medium text-xs">
                    Atribua todos para continuar
                  </Typography>
                )}
              </div>
            </div>
          )}
          
          {/* Step validation helper */}
          {!isStepValid() && (
            <Typography variant="small" className="text-yellow-600 mb-2">
              {currentStep === 1 && 'Complete as informações do cliente'}
              {currentStep === 2 && 'Adicione pelo menos um serviço'}
              {currentStep === 3 && 'Atribua profissionais a todos os serviços'}
            </Typography>
          )}
        </div>
        
        <div className="flex gap-s">
          {currentStep < 4 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!isStepValid() || loading}
              className={`
                transition-all duration-200 active:scale-95 flex items-center gap-2
                ${isStepValid() 
                  ? 'bg-accent-primary hover:bg-accent-primary/90 text-white shadow-md hover:shadow-lg' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {currentStep === 3 ? 'Revisar →' : 'Próximo →'}
              {currentStep === 1 && isStepValid() && (
                <span className="ml-1 text-xs opacity-75">
                  {showClientSearch ? 'Cliente selecionado' : 'Dados preenchidos'}
                </span>
              )}
              {currentStep === 2 && isStepValid() && (
                <span className="ml-1 text-xs opacity-75">
                  {cart.length} item{cart.length !== 1 ? 's' : ''}
                </span>
              )}
              {currentStep === 3 && isStepValid() && (
                <span className="ml-1 text-xs opacity-75">
                  Pronto para revisar
                </span>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isStepValid() || loading}
              className={`
                transition-all duration-200 active:scale-95 flex items-center gap-2 min-w-[160px] justify-center
                ${isStepValid() && !loading
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  Finalizar
                </>
              )}
            </Button>
          )}
        </div>
      </DialogFooter>
    </Dialog>
  );
};

export default AddServicesModal;