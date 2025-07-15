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
import { getClientDisplayName, clientNameMatchesSearch } from '../Utils/clientUtils';
import { useModalServiceData } from '../Contexts/ServiceDataContext';
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
import { professionalsApi } from '../Services/professionals';
import { serviceVariationGroupsApi } from '../Services/services';
import { buildAssetUrl } from '../Utils/urlHelpers';
import { 
  handleCpfInput, 
  handleCepInput, 
  validateCpfChecksum, 
  validateCepFormat, 
  lookupCep,
  BRAZILIAN_STATES
} from '../Utils/brazilianFormatters';


const AddServicesModal = ({ open, onClose, onAddServices, modalContext }) => {
  // Use global service data context instead of props
  const modalServiceData = useModalServiceData();
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Client search state - default to existing client search for better UX
  const [showClientSearch, setShowClientSearch] = useState(true);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    clientName: '',
    clientNickname: '',
    clientPhone: '',
    clientEmail: '',
    clientCpf: '',
    clientAddressCep: '',
    clientAddressStreet: '',
    clientAddressNumber: '',
    clientAddressComplement: '',
    clientAddressNeighborhood: '',
    clientAddressCity: '',
    clientAddressState: '',
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
  const [_showAllServices, _setShowAllServices] = useState(false); // Toggle between category and global view
  const [serviceVariations, setServiceVariations] = useState({}); // { serviceId: [variationGroups] }
  
  // Service assignment state (for per-service professional assignment)
  const [serviceAssignments, setServiceAssignments] = useState({});
  const [professionalsByService, setProfessionalsByService] = useState({});

  // Load categories and professionals on mount, handle context
  useEffect(() => {
    if (open) {
      if (modalServiceData?.categories && modalServiceData?.services) {
        setCategories(modalServiceData.categories);
        setAllServices(modalServiceData.services);
        // Clear loading/error states when services are available
        setLoading(false);
        setError(null);
      } else {
        // Show loading state if services aren't available from context
        setLoading(true);
        setError('Carregando serviços... Aguarde um momento.');
      }

      // Handle add-to-existing context auto-selection
      if (modalContext?.mode === 'add-to-existing' && modalContext?.targetGroup) {
        const group = modalContext.targetGroup;
        
        // Skip to step 2 (services) since client info is already known
        setCurrentStep(2);
        
        // Auto-select existing client mode and populate client data
        setShowClientSearch(true);
        const clientData = {
          id: group.client_id || null,
          name: getClientDisplayName(group, 'selection'),
          phone_number: group.client_phone || '',
          email: group.client_email || ''
        };
        setSelectedClient(clientData);
        setFormData(prev => ({
          ...prev,
          clientName: getClientDisplayName(group, 'selection'),
          clientPhone: group.client_phone || '',
          clientEmail: group.client_email || ''
        }));
      }
    }
  }, [open, modalServiceData, modalContext]);

  // Optimized client search effect - no debounce, 3 char minimum
  useEffect(() => {
    if (!showClientSearch) {
      setClientSearchResults([]);
      return;
    }
    
    // Only search if 3+ characters
    if (!clientSearchTerm.trim() || clientSearchTerm.trim().length < 3) {
      setClientSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setClientSearchLoading(true);
      try {
        const results = await searchClients(clientSearchTerm);
        
        // Apply client-side filtering as backup if backend doesn't filter properly
        const filteredResults = (results || []).filter(client => {
          const searchLower = clientSearchTerm.toLowerCase();
          const phone = (client.phone_number || client.phone || '').toLowerCase();
          const email = (client.email || '').toLowerCase();
          
          return clientNameMatchesSearch(client, clientSearchTerm) || 
                 phone.includes(searchLower) || 
                 email.includes(searchLower);
        });
        
        setClientSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching clients:', error);
        setClientSearchResults([]);
      } finally {
        setClientSearchLoading(false);
      }
    };
    
    performSearch();
  }, [clientSearchTerm, showClientSearch]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setFormData({
        clientName: '',
        clientNickname: '',
        clientPhone: '',
        clientEmail: '',
        clientCpf: '',
        clientAddressCep: '',
        clientAddressStreet: '',
        clientAddressNumber: '',
        clientAddressComplement: '',
        clientAddressNeighborhood: '',
        clientAddressCity: '',
        clientAddressState: '',
        services: [],
        professionalId: '',
        notes: ''
      });
      setCart([]);
      setSelectedCategory(null);
      setSearchTerm('');
      setError(null);
      // Reset client search state - default to search mode for better UX
      setShowClientSearch(true);
      setClientSearchTerm('');
      setClientSearchResults([]);
      setSelectedClient(null);
      setServiceAssignments({});
      setProfessionalsByService({});
      // Reset service view state
      _setShowAllServices(false);
      setAllServices([]);
    }
  }, [open]);

  // Load professionals for services when cart changes
  useEffect(() => {
    if (cart.length > 0) {
      loadProfessionalsForServices();
    }
  }, [cart]);

  // Extract variations from preloaded services data (optimized format)
  useEffect(() => {
    if (allServices.length > 0 && modalServiceData?.services) {
      const variationsMap = {};
      
      // Extract variations from optimized service data
      modalServiceData.services.forEach(service => {
        if (service.variations && Array.isArray(service.variations)) {
          // Group variations by variation group
          const groupedVariations = [];
          const variationGroups = {};
          
          service.variations.forEach(variation => {
            const groupId = variation.groupId;
            if (!variationGroups[groupId]) {
              variationGroups[groupId] = {
                id: groupId,
                name: variation.groupName,
                variations: []
              };
              groupedVariations.push(variationGroups[groupId]);
            }
            variationGroups[groupId].variations.push(variation);
          });
          
          variationsMap[service.id] = groupedVariations;
        } else {
          variationsMap[service.id] = [];
        }
      });
      
      setServiceVariations(variationsMap);
    }
  }, [allServices, modalServiceData]);

  const loadProfessionalsForServices = async () => {
    try {
      // Get all professionals for each service (for individual assignment)
      const professionalSets = await Promise.all(
        cart.map(async (item) => {
          const serviceProfessionals = await getProfessionalsForService(item.service.id);
          return {
            serviceId: item.service.id,
            professionals: serviceProfessionals
          };
        })
      );
      
      // Create a map of serviceId -> available professionals
      const servicesProfessionalsMap = {};
      professionalSets.forEach(({ serviceId, professionals }) => {
        servicesProfessionalsMap[serviceId] = professionals;
      });
      
      setProfessionalsByService(servicesProfessionalsMap);
      
    } catch (err) {
      console.error('Failed to load professionals for services:', err);
      setProfessionalsByService({});
    }
  };

  // Format price helper
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Get display name for cart item (service + variation)
  const getCartItemDisplayName = (item) => {
    const serviceName = item.service.name;
    const variation = item.service.selectedVariation;
    
    if (variation && variation.name && variation.name !== 'Padrão') {
      return `${serviceName} - ${variation.name}`;
    }
    
    return serviceName;
  };

  // Note: loadServiceVariations function removed - now using preloaded data

  // Toggle between new client and existing client modes
  const toggleClientMode = () => {
    if (showClientSearch) {
      // Switch to new client mode
      setShowClientSearch(false);
      setFormData({
        ...formData,
        clientName: '',
        clientNickname: '',
        clientPhone: '',
        clientEmail: '',
        clientCpf: '',
        clientAddressCep: '',
        clientAddressStreet: '',
        clientAddressNumber: '',
        clientAddressComplement: '',
        clientAddressNeighborhood: '',
        clientAddressCity: '',
        clientAddressState: ''
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
        clientNickname: '',
        clientPhone: '',
        clientEmail: '',
        clientCpf: '',
        clientAddressCep: '',
        clientAddressStreet: '',
        clientAddressNumber: '',
        clientAddressComplement: '',
        clientAddressNeighborhood: '',
        clientAddressCity: '',
        clientAddressState: ''
      });
    }
  };

  // Select an existing client
  const selectClient = (client) => {
    setSelectedClient(client);
    setFormData({
      ...formData,
      clientName: getClientDisplayName(client, 'selection'),
      clientPhone: client.phone_number || client.phone || '',
      clientEmail: client.email || ''
    });
    setClientSearchTerm('');
    setClientSearchResults([]);
  };

  // Calculate total duration and price
  const calculateTotals = () => {
    const totalDuration = cart.reduce((sum, item) => {
      // Use final duration if available, otherwise fallback to original duration
      const duration = item.service.finalDuration || item.service.duration || item.service.duration_minutes || 0;
      return sum + (duration * item.quantity);
    }, 0);
    const totalPrice = cart.reduce((sum, item) => {
      // Use final price if available, otherwise fallback to original price
      const price = item.service.finalPrice || parseFloat(item.service.price) || 0;
      return sum + (price * item.quantity);
    }, 0);
    return { totalDuration, totalPrice };
  };

  // Add service to cart
  const addToCart = (service, variation = null) => {
    const serviceWithVariation = {
      ...service,
      selectedVariation: variation,
      finalPrice: variation 
        ? parseFloat(service.price) + parseFloat(variation.price_delta || 0)
        : parseFloat(service.price),
      finalDuration: variation
        ? (service.duration_minutes || 0) + (service.processing_time || 0) + (service.finishing_time || 0) + parseInt(variation.duration_delta || 0)
        : (service.duration_minutes || 0) + (service.processing_time || 0) + (service.finishing_time || 0)
    };
    
    // For variation services, treat each variation as a separate item
    const cartKey = variation ? `${service.id}-${variation.id}` : service.id;
    const existingItem = cart.find(item => {
      const itemKey = item.service.selectedVariation 
        ? `${item.service.id}-${item.service.selectedVariation.id}` 
        : item.service.id;
      return itemKey === cartKey;
    });
    
    if (existingItem) {
      setCart(cart.map(item => {
        const itemKey = item.service.selectedVariation 
          ? `${item.service.id}-${item.service.selectedVariation.id}` 
          : item.service.id;
        return itemKey === cartKey 
          ? { ...item, quantity: item.quantity + 1 }
          : item;
      }));
    } else {
      setCart([...cart, { service: serviceWithVariation, quantity: 1 }]);
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

  // Handle CEP lookup
  const handleCepLookup = async (cep) => {
    if (cep && validateCepFormat(cep)) {
      try {
        const addressData = await lookupCep(cep);
        if (addressData) {
          setFormData(prev => ({
            ...prev,
            clientAddressStreet: addressData.address_street || prev.clientAddressStreet,
            clientAddressNeighborhood: addressData.address_neighborhood || prev.clientAddressNeighborhood,
            clientAddressCity: addressData.address_city || prev.clientAddressCity,
            clientAddressState: addressData.address_state || prev.clientAddressState,
          }));
        }
      } catch (error) {
        console.warn('CEP lookup failed:', error);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { totalDuration, totalPrice } = calculateTotals();
      
      // Create services array with individual professional assignments
      // For quantity > 1, repeat the service object (backend doesn't support quantity field)
      const servicesWithProfessionals = cart.flatMap(item => 
        Array.from({ length: item.quantity }, () => ({
          id: item.service.id,
          professional_id: serviceAssignments[item.service.id], // Per-service professional assignment
          service_variation_id: item.service.selectedVariation?.id || null // Include variant selection
        }))
      );

      const appointmentData = {
        client: {
          name: formData.clientName,
          nickname: formData.clientNickname || null,
          phone: formData.clientPhone,
          email: formData.clientEmail,
          cpf: formData.clientCpf || null,
          address_cep: formData.clientAddressCep || null,
          address_street: formData.clientAddressStreet || null,
          address_number: formData.clientAddressNumber || null,
          address_complement: formData.clientAddressComplement || null,
          address_neighborhood: formData.clientAddressNeighborhood || null,
          address_city: formData.clientAddressCity || null,
          address_state: formData.clientAddressState || null,
          id: selectedClient?.id || null
        },
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

  // Filter and sort services with unified search + category filtering
  const filteredServices = allServices
    .filter(service => {
      // Text search filter (always applied if searchTerm exists)
      const matchesSearch = !searchTerm.trim() || 
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.service_sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter (applied if category is selected)
      const matchesCategory = !selectedCategory || service.category_id === selectedCategory.id;
      
      // Both filters must pass
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      // Sort by display_order first (ascending), then by name as fallback
      const orderA = a.display_order || 0;
      const orderB = b.display_order || 0;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      
      // Fallback to alphabetical by name
      return a.name.localeCompare(b.name);
    });

  // Get professionals for selected services
  const _getAvailableProfessionals = () => {
    // Use preloaded professionals if available
    const professionals = modalServiceData?.professionals || [];
    
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
                    {getClientDisplayName(modalContext.targetGroup, 'selection')}
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

          {/* Selected Client Display - Right below search box for better UX */}
          {selectedClient && (
            <Card className="border-accent-primary bg-accent-primary/5 bg-bg-secondary">
              <CardBody className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-accent-primary p-2 rounded-full">
                      <UserIcon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <Typography variant="small" className="text-text-primary font-medium">
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
                        clientNickname: '',
                        clientPhone: '',
                        clientEmail: '',
                        clientCpf: '',
                        clientAddressCep: '',
                        clientAddressStreet: '',
                        clientAddressNumber: '',
                        clientAddressComplement: '',
                        clientAddressNeighborhood: '',
                        clientAddressCity: '',
                        clientAddressState: ''
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

          {/* Search Guidance - Prominent for default state */}
          {(!clientSearchTerm.trim() || clientSearchTerm.trim().length < 3) && !selectedClient && (
            <div className="text-center py-8 bg-accent-primary/5 rounded-card border border-accent-primary/20">
              <div className="bg-accent-primary/10 p-3 rounded-full w-fit mx-auto mb-3">
                <MagnifyingGlassIcon className="h-6 w-6 text-accent-primary" />
              </div>
              <Typography variant="h6" className="text-text-primary font-semibold mb-2">
                Buscar Cliente Existente
              </Typography>
              <Typography variant="small" className="text-text-secondary">
                Digite pelo menos 3 caracteres para buscar
              </Typography>
              <Typography variant="small" className="text-text-tertiary mt-2">
                Não encontrou? Use o botão "Novo Cliente" para criar
              </Typography>
            </div>
          )}

          {/* No Results Found */}
          {clientSearchTerm.trim() && clientSearchTerm.trim().length >= 3 && !clientSearchLoading && clientSearchResults.length === 0 && (
            <div className="text-center py-4 bg-bg-tertiary/20 rounded-card border border-bg-tertiary">
              <Typography variant="small" className="text-text-secondary">
                Nenhum cliente encontrado para "{clientSearchTerm}"
              </Typography>
              <Typography variant="small" className="text-text-tertiary mt-1">
                Tente buscar pelo nome ou telefone
              </Typography>
            </div>
          )}

          {clientSearchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Typography variant="small" className="text-text-secondary font-medium">
                {clientSearchResults.length} cliente{clientSearchResults.length !== 1 ? 's' : ''} encontrado{clientSearchResults.length !== 1 ? 's' : ''}:
              </Typography>
              {clientSearchResults.map((client) => (
                <Card
                  key={client.id}
                  className={`cursor-pointer transition-all hover:shadow-md border bg-bg-secondary ${
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
                          {getClientDisplayName(client, 'selection')}
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

        </div>
      ) : (
        // New Client Form Mode - Enhanced with better UX
        <div className="space-y-m">

          {/* Basic Information Section */}
          <Card className="bg-bg-primary border border-bg-tertiary">
            <CardBody className="p-s">
              <Typography variant="small" className="text-text-primary font-semibold mb-s text-xs">
                📋 Informações Básicas
              </Typography>
              
              {/* Name and Nickname Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-s mb-s">
                <Input
                  label="Nome Completo *"
                  value={formData.clientName}
                  onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  required
                />
                <Input
                  label="Apelido"
                  value={formData.clientNickname}
                  onChange={(e) => setFormData({...formData, clientNickname: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="Como prefere ser chamado"
                />
              </div>
              
              {/* Contact Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-s mb-s">
                <Input
                  label="Telefone"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="(11) 99999-9999"
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="cliente@exemplo.com"
                />
              </div>
              
              {/* CPF Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-s">
                <Input
                  label="CPF"
                  value={formData.clientCpf}
                  onChange={(e) => setFormData({...formData, clientCpf: handleCpfInput(e.target.value)})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
                <div></div> {/* Empty space for alignment */}
              </div>
            </CardBody>
          </Card>

          {/* Address Information Section */}
          <Card className="bg-bg-primary border border-bg-tertiary">
            <CardBody className="p-s">
              <Typography variant="small" className="text-text-primary font-semibold mb-s text-xs">
                📍 Endereço (Opcional)
              </Typography>
              
              {/* CEP Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-s mb-s">
                <Input
                  label="CEP"
                  value={formData.clientAddressCep}
                  onChange={(e) => setFormData({...formData, clientAddressCep: handleCepInput(e.target.value)})}
                  onBlur={(e) => handleCepLookup(e.target.value)}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="00000-000"
                  maxLength={9}
                />
                <div className="md:col-span-2"></div> {/* Empty space */}
              </div>
              
              {/* Street and Number Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-s mb-s">
                <div className="md:col-span-2">
                  <Input
                    label="Rua/Logradouro"
                    value={formData.clientAddressStreet}
                    onChange={(e) => setFormData({...formData, clientAddressStreet: e.target.value})}
                    className="text-text-primary text-sm"
                    labelProps={{ className: "text-text-secondary text-xs" }}
                    size="sm"
                    placeholder="Nome da rua"
                  />
                </div>
                <Input
                  label="Número"
                  value={formData.clientAddressNumber}
                  onChange={(e) => setFormData({...formData, clientAddressNumber: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="123"
                />
              </div>
              
              {/* Complement and Neighborhood Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-s mb-s">
                <Input
                  label="Complemento"
                  value={formData.clientAddressComplement}
                  onChange={(e) => setFormData({...formData, clientAddressComplement: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="Apto, Bloco, etc."
                />
                <Input
                  label="Bairro"
                  value={formData.clientAddressNeighborhood}
                  onChange={(e) => setFormData({...formData, clientAddressNeighborhood: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="Nome do bairro"
                />
              </div>
              
              {/* City and State Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-s">
                <Input
                  label="Cidade"
                  value={formData.clientAddressCity}
                  onChange={(e) => setFormData({...formData, clientAddressCity: e.target.value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                  placeholder="Nome da cidade"
                />
                <Select
                  label="Estado"
                  value={formData.clientAddressState}
                  onChange={(value) => setFormData({...formData, clientAddressState: value})}
                  className="text-text-primary text-sm"
                  labelProps={{ className: "text-text-secondary text-xs" }}
                  size="sm"
                >
                  {BRAZILIAN_STATES.map(state => (
                    <Option key={state.code} value={state.code} className="text-sm">
                      {state.code} - {state.name}
                    </Option>
                  ))}
                </Select>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );

  // Render services selection step with horizontal category tabs
  const renderServicesStep = () => (
    <div className="h-full">
      {/* Search bar */}
      <div className="mb-4">
        <div className="w-full max-w-md mx-auto">
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

      {/* Category Tabs */}
      <div className="mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {/* All Categories Tab */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`
              flex-shrink-0 px-6 py-3 rounded-lg border transition-all duration-200 flex items-center gap-3
              ${!selectedCategory
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-bg-tertiary bg-bg-secondary text-text-secondary hover:border-accent-primary/50 hover:bg-accent-primary/5'
              }
            `}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-accent-primary/20 to-accent-primary/30 rounded-lg flex items-center justify-center">
              <span className="text-accent-primary text-sm font-semibold">All</span>
            </div>
            <span className="text-sm font-medium">
              {allServices.length}
            </span>
          </button>

          {/* Category Tabs */}
          {categories.length > 0 ? (
            categories.map((category) => {
              const categoryServiceCount = allServices.filter(s => s.category_id === category.id).length;
              const filteredCategoryCount = filteredServices.filter(s => s.category_id === category.id).length;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(selectedCategory?.id === category.id ? null : category)}
                  className={`
                    flex-shrink-0 px-5 py-3 rounded-lg border transition-all duration-200 flex items-center gap-3
                    ${selectedCategory?.id === category.id
                      ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                      : 'border-bg-tertiary bg-bg-secondary text-text-secondary hover:border-accent-primary/50 hover:bg-accent-primary/5'
                    }
                  `}
                  title={category.name}
                >
                  {/* Category Image */}
                  <div className="w-10 h-10 bg-white rounded-lg border border-bg-primary/20 shadow-sm flex items-center justify-center overflow-hidden">
                    {category?.icon_url ? (
                      <img 
                        src={category.icon_url} 
                        alt={category.name}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent-primary/10 to-accent-primary/20 flex items-center justify-center rounded-md">
                        <span className="text-accent-primary text-sm font-semibold">
                          {category.name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Service Count */}
                  <span className="text-sm font-medium">
                    {searchTerm ? filteredCategoryCount : categoryServiceCount}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-center py-4">
              <Typography className="text-text-secondary text-sm">
                Carregando categorias...
              </Typography>
            </div>
          )}
        </div>
      </div>

      {/* Services Grid */}
      <div className="space-y-4">
        {/* Clear filters */}
        {searchTerm && (
          <div className="flex justify-center gap-2">
            <Button
              variant="text"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="text-text-secondary hover:text-accent-primary"
            >
              Limpar busca
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[320px] overflow-y-auto auto-rows-max">
          {filteredServices.map((service) => {
            const variations = serviceVariations[service.id] || [];
            const hasVariations = variations.length > 0 && variations.some(group => group.variations?.length > 0);
            
            // Flatten all variations from all groups
            const allVariations = hasVariations 
              ? variations.flatMap(group => group.variations || [])
              : [{ id: 'standard', name: 'Padrão', price_delta: 0, duration_delta: 0 }];
            
            return (
              <Card 
                key={service.id} 
                className="bg-bg-secondary border border-bg-tertiary hover:border-accent-primary/50 transition-all h-fit w-full"
              >
                <CardBody className="p-4">
                  {/* Header: Service Image + Name + Duration */}
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-bg-tertiary">
                    {/* Service Image */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent-primary/10 to-accent-primary/20 rounded-lg flex items-center justify-center overflow-hidden border border-bg-tertiary shadow-sm">
                        {(() => {
                          // Get service image from available fields (based on backend schema)
                          const getServiceImage = () => {
                            // Try new images array first
                            if (service.images && service.images.length > 0) {
                              return service.images[0].file_path;
                            }
                            // Fallback to legacy fields
                            return service.image || service.image_liso || service.image_ondulado || service.image_cacheado || service.image_crespo;
                          };
                          
                          const imageUrl = getServiceImage();
                          
                          return imageUrl ? (
                            <img 
                              src={buildAssetUrl(imageUrl)} 
                              alt={service.name}
                              className="w-full h-full object-cover rounded-lg"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null;
                        })()}
                        
                        <div 
                          className="w-full h-full bg-gradient-to-br from-accent-primary/10 to-accent-primary/20 flex items-center justify-center rounded-lg" 
                          style={{ 
                            display: (() => {
                              const imageUrl = service.images?.[0]?.file_path || service.image || service.image_liso || service.image_ondulado || service.image_cacheado || service.image_crespo;
                              return imageUrl ? 'none' : 'flex';
                            })()
                          }}
                        >
                          <span className="text-accent-primary text-xs font-semibold">
                            {service.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Service Info */}
                    <div className="flex-1 min-w-0">
                      <Typography variant="small" className="text-text-primary font-semibold text-sm leading-tight mb-1">
                        {service.name}
                      </Typography>
                      <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <ClockIcon className="h-3 w-3" />
                        <span>{service.duration || service.duration_minutes || 0}min</span>
                      </div>
                    </div>
                  </div>

                  {/* Variations Section */}
                  <div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {allVariations.map((variation, index) => {
                          if (index >= 8) return null; // Max 8 variations (2 rows of 4)
                          
                          const finalPrice = parseFloat(service.price) + parseFloat(variation.price_delta || 0);
                          const isStandard = variation.id === 'standard';
                          
                          return (
                            <button
                              key={variation.id}
                              onClick={() => addToCart(service, isStandard ? null : variation)}
                              className="bg-bg-primary border border-bg-tertiary rounded-lg p-3 hover:border-accent-primary/50 hover:bg-accent-primary/5 transition-all cursor-pointer text-center min-h-[80px] min-w-[100px] flex flex-col justify-center"
                              title={`Adicionar ${service.name} - ${variation.name}`}
                            >
                              <div className="space-y-1">
                                <Typography variant="small" className="text-text-primary font-medium text-xs leading-tight line-clamp-2">
                                  {variation.name}
                                </Typography>
                                <Typography variant="small" className="text-accent-primary font-semibold text-xs">
                                  {formatPrice(finalPrice)}
                                </Typography>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
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
  );

  // Get professionals available for a specific service
  const getProfessionalsForService = async (serviceId) => {
    try {
      const serviceProfessionals = await professionalsApi.getProfessionalsForService(serviceId);
      
      // If no specific professionals are associated with this service, 
      // fall back to showing all professionals (better UX than showing none)
      if (!serviceProfessionals || serviceProfessionals.length === 0) {
        const allProfessionals = await professionalsApi.getAll();
        return allProfessionals || [];
      }
      
      return serviceProfessionals;
    } catch (error) {
      console.error('Error fetching professionals for service:', serviceId, error);
      // Fallback to all professionals if API call fails
      try {
        const allProfessionals = await professionalsApi.getAll();
        return allProfessionals || [];
      } catch (fallbackError) {
        console.error('Error fetching all professionals as fallback:', fallbackError);
        return [];
      }
    }
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
          {cart.map((item) => {
            const availableProfessionals = professionalsByService[item.service.id] || [];
            const assignedProfessionalId = serviceAssignments[item.service.id];

            return (
              <Card key={item.service.id} className="bg-bg-secondary border border-bg-tertiary h-fit">
                <CardBody className="p-3">
                  {/* Compact Service Header */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-bg-tertiary">
                    <div className="flex-1">
                      <Typography variant="small" className="text-accent-primary font-semibold text-sm">
                        {getCartItemDisplayName(item)}
                      </Typography>
                      <Typography variant="small" className="text-text-secondary text-xs">
                        {item.service.duration || item.service.duration_minutes || 0}min • {formatPrice(item.service.price)}
                        {item.quantity > 1 && ` • ${item.quantity}x`}
                      </Typography>
                    </div>
                  </div>

                  {/* Compact Professional Selection */}
                  <div>
                    <Typography variant="small" className="text-text-secondary font-medium text-xs mb-2">
                      Profissional:
                    </Typography>
                    
                    {availableProfessionals.length > 0 ? (
                      <div className="grid grid-cols-1 gap-1">
                        {availableProfessionals.map((professional) => {
                          const isSelected = assignedProfessionalId === professional.id.toString();
                          
                          return (
                            <button
                              key={professional.id}
                              className={`cursor-pointer transition-all duration-200 rounded border px-2 py-1.5 text-left text-xs ${
                                isSelected
                                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                                  : 'border-bg-tertiary bg-bg-primary text-text-secondary hover:border-accent-primary/50 hover:bg-accent-primary/5'
                              }`}
                              onClick={() => assignProfessionalToService(item.service.id, professional.id.toString())}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-medium truncate ${
                                  isSelected ? 'text-accent-primary' : 'text-text-primary'
                                }`}>
                                  {professional.full_name}
                                </span>
                                {isSelected && (
                                  <CheckCircleIcon className="h-3 w-3 text-accent-primary flex-shrink-0 ml-1" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <Typography className="text-text-secondary text-xs">
                          Nenhum profissional disponível
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


    </div>
  );

  // Render confirmation step
  const _renderConfirmationStep = () => {
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
                const assignedProfessional = modalServiceData?.professionals?.find(p => p.id.toString() === assignedProfessionalId);
                
                return (
                  <div key={item.service.id} className="bg-white/70 rounded-lg p-3 border border-purple-200">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <Typography variant="small" className="text-purple-700 font-medium">
                          {getCartItemDisplayName(item)}
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
      default: return false;
    }
  };

  return (
    <Dialog 
      open={open} 
      handler={onClose}
      size="xl"
      className="bg-bg-secondary border border-bg-tertiary max-h-[85vh] overflow-hidden flex flex-col"
      style={{ 
        zIndex: 99999,
        position: 'fixed !important'
      }}
      BackdropProps={{
        style: { 
          zIndex: 99998
        }
      }}
      container={document.body}
      disablePortal={false}
    >
      <DialogHeader className="text-text-primary border-b border-bg-tertiary pb-0">
        <div className="w-full">
          {/* Title */}
          <div className="mb-4">
            <Typography variant="h4" className="text-text-primary">
              {modalContext?.mode === 'add-to-existing' 
                ? `Adicionar Serviços para ${getClientDisplayName(modalContext.targetGroup, 'selection')}`
                : 'Adicionar Serviços'
              }
            </Typography>
          </div>

          {/* Progress Bar */}
          <div className="w-full">
            {/* Step Labels */}
            <div className="flex justify-between mb-2">
              {(modalContext?.mode === 'add-to-existing' ? [
                { step: 2, label: 'Serviços' },
                { step: 3, label: 'Confirmação' }
              ] : [
                { step: 1, label: 'Cliente' },
                { step: 2, label: 'Serviços' },
                { step: 3, label: 'Confirmação' }
              ]).map(({ step, label }) => (
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
                  style={{ 
                    width: modalContext?.mode === 'add-to-existing' 
                      ? `${((currentStep - 2) / 1) * 100}%` 
                      : `${((currentStep - 1) / 2) * 100}%` 
                  }}
                />
              </div>
              
              {/* Step Dots */}
              <div className="absolute top-0 left-0 w-full h-2 flex justify-between items-center">
                {(modalContext?.mode === 'add-to-existing' ? [2, 3] : [1, 2, 3]).map((step) => (
                  <div
                    key={step}
                    className={`w-4 h-4 rounded-full border-2 bg-bg-primary transition-all ${
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
          {(modalContext?.mode === 'add-to-existing' ? currentStep > 2 : currentStep > 1) && (
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
                        {getCartItemDisplayName(item)}
                      </Typography>
                      {item.quantity > 1 && (
                        <Badge size="sm" content={item.quantity} className="bg-accent-primary">
                          <div className="w-1 h-1"></div>
                        </Badge>
                      )}
                      <button
                        onClick={() => removeFromCart(item.service.id)}
                        className="text-text-secondary hover:text-status-error"
                        title={`Remover ${getCartItemDisplayName(item)}`}
                      >
                        <TrashIcon className="h-3 w-3" />
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
            <div className={`mb-2 px-4 py-2 rounded-card transition-all ${
              areAllServicesAssigned() 
                ? 'bg-status-success/10 border border-status-success/20' 
                : 'bg-status-warning/10 border border-status-warning/20'
            }`}>
              <div className="flex items-center justify-center gap-2">
                {areAllServicesAssigned() ? (
                  <CheckCircleIcon className="h-4 w-4 text-status-success" />
                ) : (
                  <ExclamationTriangleIcon className="h-4 w-4 text-status-warning" />
                )}
                
                <Typography variant="small" className={`font-medium ${
                  areAllServicesAssigned() ? 'text-status-success' : 'text-status-warning'
                }`}>
                  {Object.keys(serviceAssignments).length} de {cart.length} serviços atribuídos
                  {!areAllServicesAssigned() && ' - Atribua todos para continuar'}
                </Typography>
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
          {currentStep < 3 ? (
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
              Próximo →
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