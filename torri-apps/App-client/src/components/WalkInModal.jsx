/**
 * WalkInModal Component
 * Modal for creating walk-in appointments quickly
 * 
 * Features:
 * - Quick client creation/selection
 * - Service selection
 * - Professional assignment
 * - Creates appointment group and adds to Walk-in column
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Search, 
  Plus,
  Phone,
  Mail,
  Scissors,
  Clock,
  DollarSign,
  Minus,
  ShoppingCart,
  Check
} from 'lucide-react';

import { getCategories, getServicesByCategory } from '../services/categoryService';
import { getProfessionalsForService } from '../services/professionalService';
import { createWalkInAppointment, addServicesToAppointmentGroup } from '../services/appointmentService';
import { getClients } from '../services/clientService';

const WalkInModal = ({ 
  isOpen, 
  onClose, 
  onWalkInCreated,
  preloadedServices,
  modalContext 
}) => {
  // State management
  const [step, setStep] = useState(1); // 1: Client, 2: Services, 3: Professional, 4: Confirm
  const [clientData, setClientData] = useState({
    id: null,
    name: '',
    phone: '',
    email: '',
    isNewClient: true
  });
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientSearchResults, setClientSearchResults] = useState([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedProfessional, setProfessional] = useState(null);
  const [serviceAssignments, setServiceAssignments] = useState({}); // { serviceId: professionalId }
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  
  // Data loading states
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [professionalsByService, setProfessionalsByService] = useState({}); // { serviceId: [professionals] }
  const [isLoading, setIsLoading] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [error, setError] = useState(null);
  
  // UI state
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  
  // Refs
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  
  // Focus management
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [isOpen, step]);
  
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Load initial data when modal opens (step 1) so services are ready when user reaches step 2
  useEffect(() => {
    if (isOpen && step === 1) {
      loadCategories();
    }
  }, [isOpen, step]);

  // Handle modal context (auto-select client for checkout context)
  useEffect(() => {
    if (isOpen) {
      if (modalContext?.mode === 'add-to-existing' && modalContext.existingClient) {
        // Auto-select existing client
        setClientData({
          id: modalContext.existingClient.id,
          name: modalContext.existingClient.name || 'Cliente Existente',
          email: '', // We'll load this if needed
          phone: '',  // We'll load this if needed
          isNewClient: false
        });
        
        // Skip to step 2 (services) since client is already selected
        setStep(2);
      } else {
        // Reset for new appointment
        setStep(1);
        setClientData({ id: null, name: '', email: '', phone: '', isNewClient: true });
        setSelectedServices([]);
        setServiceAssignments({});
      }
    }
  }, [isOpen, modalContext]);
  
  const loadCategories = async () => {
    try {
      setLoadingServices(true);
      
      // Use preloaded services if available
      if (preloadedServices) {
        setCategories(preloadedServices.categories);
        setServices(preloadedServices.services);
        // No loading delay since data is already available
        setLoadingServices(false);
        return;
      }
      
      
      // Fallback to API call if preloaded services not available
      const data = await getCategories();
      setCategories(data);
      
      // Load all services from all categories for search
      const allServices = [];
      for (const category of data) {
        const categoryServices = await getServicesByCategory(category.id);
        allServices.push(...categoryServices.map(service => ({ ...service, category_name: category.name })));
      }
      setServices(allServices);
    } catch (err) {
      setError('Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  };
  
  // Filter services based on search
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
    service.category_name.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );
  
  // Handle service selection
  const toggleService = (service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };
  
  // Calculate totals when services change
  useEffect(() => {
    const duration = selectedServices.reduce((sum, service) => sum + (service.duration_minutes || 0), 0);
    const price = selectedServices.reduce((sum, service) => sum + parseFloat(service.price || 0), 0);
    setEstimatedDuration(duration);
    setEstimatedPrice(price);
  }, [selectedServices]);
  
  // Load professionals when services are selected
  useEffect(() => {
    if (selectedServices.length > 0) {
      loadProfessionalsForServices();
    }
  }, [selectedServices]);
  
  const loadProfessionalsForServices = async () => {
    try {
      setLoadingProfessionals(true);
      // Get all professionals for each service (for individual assignment)
      const professionalSets = await Promise.all(
        selectedServices.map(async (service) => {
          const serviceProfessionals = await getProfessionalsForService(service.id);
          return {
            serviceId: service.id,
            serviceName: service.name,
            professionals: serviceProfessionals
          };
        })
      );
      
      // Create a map of serviceId -> available professionals
      const servicesProfessionalsMap = {};
      professionalSets.forEach(({ serviceId, professionals }) => {
        servicesProfessionalsMap[serviceId] = professionals;
      });
      
      // For backward compatibility, also set a unified list of all unique professionals
      const allProfessionals = [];
      const professionalIds = new Set();
      professionalSets.forEach(({ professionals }) => {
        professionals.forEach(prof => {
          if (!professionalIds.has(prof.id)) {
            professionalIds.add(prof.id);
            allProfessionals.push(prof);
          }
        });
      });
      
      setProfessionals(allProfessionals);
      
      // Store the service-specific professionals mapping
      setProfessionalsByService(servicesProfessionalsMap);
      
    } catch (err) {
      setError('Failed to load professionals');
      setProfessionals([]);
      setProfessionalsByService({});
    } finally {
      setLoadingProfessionals(false);
    }
  };

  // Search for existing clients
  const handleClientSearch = async (query) => {
    setClientSearchQuery(query);
    
    if (query.length < 2) {
      setClientSearchResults([]);
      return;
    }

    try {
      setSearchingClients(true);
      const response = await getClients({ search: query, limit: 10 });
      setClientSearchResults(response.items || []);
    } catch (err) {
      console.error('Error searching clients:', err);
      setClientSearchResults([]);
    } finally {
      setSearchingClients(false);
    }
  };

  // Select existing client from search results
  const selectExistingClient = (client) => {
    setClientData({
      id: client.id,
      name: client.full_name || client.name,
      phone: client.phone || '',
      email: client.email || '',
      isNewClient: false
    });
    setShowClientSearch(false);
    setClientSearchQuery('');
    setClientSearchResults([]);
  };

  // Toggle between new client and existing client modes
  const toggleClientMode = () => {
    if (showClientSearch) {
      // Switch to new client mode
      setShowClientSearch(false);
      setClientData({ id: null, name: '', phone: '', email: '', isNewClient: true });
      setClientSearchQuery('');
      setClientSearchResults([]);
    } else {
      // Switch to existing client search mode
      setShowClientSearch(true);
      setClientData({ id: null, name: '', phone: '', email: '', isNewClient: false });
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check if we're adding to existing appointment group
      if (modalContext?.mode === 'add-to-existing') {
        // Add services to existing group
        const servicesToAdd = selectedServices.map(s => ({ 
          id: s.id,
          professional_id: serviceAssignments[s.id]
        }));
        
        const response = await addServicesToAppointmentGroup(
          modalContext.existingGroupId, 
          servicesToAdd
        );
        
        // Extract appointment group from response
        onWalkInCreated(response.appointment_group); // Notify parent to refresh data
        onClose();
        resetForm();
        return;
      } else {
        // Validate client data before submission
        if (clientData.isNewClient && !clientData.name?.trim()) {
          setError('Nome do cliente é obrigatório');
          return;
        }
        
        // Create new appointment group (original behavior)
        const walkInData = {
          client: clientData.isNewClient ? {
            name: clientData.name.trim(),
            phone: clientData.phone || null,
            email: clientData.email || null
          } : {
            id: clientData.id
          },
          services: selectedServices.map(s => ({ 
            id: s.id,
            professional_id: serviceAssignments[s.id]
          }))
        };
        
        const result = await createWalkInAppointment(walkInData);
        onWalkInCreated(result);
        onClose();
        resetForm();
      }
      
    } catch (err) {
      setError('Erro ao criar serviços');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setStep(1);
    setClientData({ id: null, name: '', phone: '', email: '', isNewClient: true });
    setSelectedServices([]);
    setProfessional(null);
    setServiceAssignments({});
    setProfessionalsByService({});
    setServiceSearchQuery('');
    setClientSearchQuery('');
    setClientSearchResults([]);
    setShowClientSearch(false);
    setError(null);
  };
  
  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  
  // Format duration
  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'min' : ''}`.trim() || '0min';
  };
  
  // Check if all services have been assigned to professionals
  const areAllServicesAssigned = () => {
    return selectedServices.every(service => serviceAssignments[service.id]);
  };
  
  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Informações do Cliente</h3>
              <button
                onClick={toggleClientMode}
                className="text-sm text-pink-600 hover:text-pink-700 font-medium touch-manipulation"
              >
                {showClientSearch ? 'Novo Cliente' : 'Cliente Existente'}
              </button>
            </div>

            {showClientSearch ? (
              /* Existing client search mode */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Search size={16} className="inline mr-2" />
                    Buscar Cliente Existente
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                    placeholder="Digite nome, telefone ou email..."
                    inputMode="search"
                  />
                </div>

                {/* Search results */}
                {clientSearchQuery.length >= 2 && (
                  <div className="max-h-64 overflow-y-auto">
                    {searchingClients ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent mx-auto mb-2"></div>
                        <p className="text-sm text-gray-500">Buscando clientes...</p>
                      </div>
                    ) : clientSearchResults.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600 mb-2">
                          {clientSearchResults.length} cliente{clientSearchResults.length !== 1 ? 's' : ''} encontrado{clientSearchResults.length !== 1 ? 's' : ''}:
                        </p>
                        {clientSearchResults.map((client) => (
                          <div
                            key={client.id}
                            onClick={() => selectExistingClient(client)}
                            className="p-4 border border-gray-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 active:bg-pink-100 cursor-pointer transition-colors touch-manipulation"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                                <User size={18} className="text-pink-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {client.full_name || client.name}
                                </h4>
                                <div className="text-sm text-gray-500 space-y-1">
                                  {client.phone && <p>{client.phone}</p>}
                                  {client.email && <p>{client.email}</p>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <User size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Nenhum cliente encontrado</p>
                        <button
                          onClick={toggleClientMode}
                          className="text-pink-600 hover:text-pink-700 text-sm font-medium mt-2 touch-manipulation"
                        >
                          Criar novo cliente
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected client display */}
                {clientData.id && !clientData.isNewClient && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-800">Cliente Selecionado</h4>
                        <p className="text-green-700">{clientData.name}</p>
                        {clientData.phone && <p className="text-sm text-green-600">{clientData.phone}</p>}
                        {clientData.email && <p className="text-sm text-green-600">{clientData.email}</p>}
                      </div>
                      <button
                        onClick={() => setClientData({ id: null, name: '', phone: '', email: '', isNewClient: false })}
                        className="text-green-600 hover:text-green-700 touch-manipulation"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* New client creation mode */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Nome do Cliente *
                  </label>
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={clientData.name}
                    onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                    placeholder="Digite o nome do cliente"
                    required
                    autoComplete="name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Phone size={16} className="inline mr-2" />
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={clientData.phone}
                    onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                    placeholder="(11) 99999-9999"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Mail size={16} className="inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                    placeholder="cliente@exemplo.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
              </div>
            )}
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Selecionar Serviços</h3>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                ref={firstInputRef}
                type="text"
                value={serviceSearchQuery}
                onChange={(e) => setServiceSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
                placeholder="Buscar serviços..."
                inputMode="search"
              />
            </div>
            
            {/* Shopping Cart Summary - Compact */}
            {selectedServices.length > 0 && (
              <div className="sticky top-0 z-10 mb-4 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart size={16} className="text-pink-600" />
                    <span className="text-sm text-pink-800 font-medium">
                      {selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-pink-700">
                      {formatPrice(estimatedPrice)}
                    </span>
                    <button
                      onClick={() => setSelectedServices([])}
                      className="text-xs text-pink-600 hover:text-pink-700 font-medium bg-white px-2 py-1 rounded-md transition-colors touch-manipulation"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Services list */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loadingServices ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">Carregando serviços...</p>
                </div>
              ) : filteredServices.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all touch-manipulation ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50 shadow-md scale-[0.98]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 active:scale-[0.98]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 mb-1 leading-snug">{service.name}</h4>
                        <p className="text-sm text-gray-500 mb-2">{service.category_name}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600 flex items-center">
                            <Clock size={14} className="mr-1.5" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                          <span className="text-sm text-green-600 font-semibold flex items-center">
                            <DollarSign size={14} className="mr-1" />
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-pink-500 border-pink-500 scale-110' : 'border-gray-300'
                      }`}>
                        {isSelected ? (
                          <Check size={16} className="text-white font-bold" />
                        ) : (
                          <Plus size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {!loadingServices && filteredServices.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Scissors size={32} className="mx-auto mb-3 text-gray-300" />
                  <p>Nenhum serviço encontrado</p>
                  <p className="text-sm">Tente uma busca diferente</p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Atribuir Profissionais</h3>
              <p className="text-sm text-gray-600">Selecione um profissional para cada serviço</p>
            </div>
            
            {selectedServices.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <User size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="font-medium mb-2">Nenhum serviço selecionado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedServices.map((service) => {
                  const availableProfessionals = professionalsByService[service.id] || [];
                  const assignedProfessionalId = serviceAssignments[service.id];
                  const assignedProfessional = availableProfessionals.find(p => p.id === assignedProfessionalId);
                  
                  return (
                    <div key={service.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Service Header */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                              <Scissors size={18} className="text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{service.name}</h4>
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Clock size={14} className="mr-1" />
                                  {formatDuration(service.duration_minutes)}
                                </span>
                                <span className="flex items-center">
                                  <DollarSign size={14} className="mr-1" />
                                  {formatPrice(service.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                          {assignedProfessional && (
                            <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
                              <Check size={14} className="text-green-600" />
                              <span className="text-sm font-medium text-green-800">Atribuído</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Professionals List */}
                      <div className="p-4">
                        {availableProfessionals.length === 0 ? (
                          <div className="text-center py-6 text-gray-500">
                            <User size={32} className="mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">Nenhum profissional disponível para este serviço</p>
                            <p className="text-xs text-gray-400 mt-1">Serviço: {service.name}</p>
                          </div>
                        ) : (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500">
                              {availableProfessionals.length} profissional{availableProfessionals.length !== 1 ? 'is' : ''} disponível{availableProfessionals.length !== 1 ? 'is' : ''} para {service.name}
                            </p>
                          </div>
                        )}
                        {availableProfessionals.length > 0 && (
                          <div className="space-y-2">
                            {availableProfessionals.map((professional) => {
                              const isSelected = serviceAssignments[service.id] === professional.id;
                              
                              return (
                                <div
                                  key={professional.id}
                                  onClick={() => {
                                    setServiceAssignments(prev => ({
                                      ...prev,
                                      [service.id]: isSelected ? null : professional.id
                                    }));
                                  }}
                                  className={`p-3 rounded-lg border cursor-pointer transition-all touch-manipulation ${
                                    isSelected
                                      ? 'border-pink-500 bg-pink-50 shadow-sm'
                                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center flex-shrink-0">
                                      <User size={18} className="text-pink-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-medium text-gray-900 text-sm">{professional.full_name}</h5>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                      isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                                    }`}>
                                      {isSelected && (
                                        <Check size={12} className="text-white" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Confirmar Walk-in</h3>
            
            {/* Summary */}
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <User size={16} className="mr-2" />
                  Cliente
                </h4>
                <p className="font-medium">{clientData.name}</p>
                {clientData.phone && <p className="text-sm text-gray-600 mt-1">{clientData.phone}</p>}
                {clientData.email && <p className="text-sm text-gray-600">{clientData.email}</p>}
              </div>
              
              <div className="p-4 bg-gray-50 rounded-xl">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Scissors size={16} className="mr-2" />
                  Serviços e Profissionais
                </h4>
                <div className="space-y-3">
                  {selectedServices.map((service) => {
                    const assignedProfessionalId = serviceAssignments[service.id];
                    const assignedProfessional = professionals.find(p => p.id === assignedProfessionalId);
                    
                    return (
                      <div key={service.id} className="bg-white rounded-lg p-3 border">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{service.name}</p>
                            <p className="text-xs text-gray-500">{formatDuration(service.duration_minutes)}</p>
                          </div>
                          <span className="font-semibold text-green-600">{formatPrice(service.price)}</span>
                        </div>
                        {assignedProfessional && (
                          <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                            <div className="w-6 h-6 bg-gradient-to-br from-pink-100 to-pink-200 rounded-full flex items-center justify-center">
                              <User size={12} className="text-pink-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-700">{assignedProfessional.full_name}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              
              <div className="p-4 bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl border border-pink-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-pink-800">Total</span>
                    <p className="text-sm text-pink-600">{formatDuration(estimatedDuration)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-pink-800">{formatPrice(estimatedPrice)}</div>
                  </div>
                </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      {/* Full screen modal */}
      <div 
        ref={modalRef}
        className="bg-white h-full w-full overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">Adicionar Serviços</h2>
            <p className="text-sm text-gray-500">Passo {step} de 4</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-100 rounded-full transition-colors touch-manipulation"
            aria-label="Fechar modal"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="px-4 py-3 bg-gray-50">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-pink-500 h-3 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span className={step >= 1 ? 'text-pink-600 font-medium' : ''}>Cliente</span>
            <span className={step >= 2 ? 'text-pink-600 font-medium' : ''}>Serviços</span>
            <span className={step >= 3 ? 'text-pink-600 font-medium' : ''}>Profissional</span>
            <span className={step >= 4 ? 'text-pink-600 font-medium' : ''}>Confirmar</span>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-safe">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}
          
          {renderStepContent()}
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 bg-white p-4 pb-safe">
          <div className="flex gap-3">
            <button
              onClick={step === 1 ? onClose : () => setStep(step - 1)}
              className="w-24 py-3 px-4 text-gray-600 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation flex-shrink-0"
            >
              {step === 1 ? 'Cancelar' : 'Voltar'}
            </button>
            
            <button
              onClick={() => {
                if (step === 4) {
                  handleSubmit();
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={
                (step === 1 && (showClientSearch ? !clientData.id : !clientData.name)) ||
                (step === 2 && selectedServices.length === 0) ||
                (step === 3 && !areAllServicesAssigned())
              }
              className="flex-1 py-3 px-6 bg-pink-500 hover:bg-pink-600 active:bg-pink-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors touch-manipulation shadow-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Carregando...
                </div>
              ) : step === 4 ? 'Adicionar Serviços' : (
                step === 2 && selectedServices.length > 0 ? (
                  <div className="flex items-center justify-center gap-2">
                    <ShoppingCart size={16} />
                    <span>Continuar ({selectedServices.length})</span>
                  </div>
                ) : 'Próximo'
              )}
            </button>
          </div>
          
          {/* Cart total preview in footer for step 2 */}
          {step === 2 && selectedServices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total do carrinho:</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 flex items-center">
                    <Clock size={14} className="mr-1" />
                    {formatDuration(estimatedDuration)}
                  </span>
                  <span className="font-bold text-pink-600 text-base">
                    {formatPrice(estimatedPrice)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalkInModal;