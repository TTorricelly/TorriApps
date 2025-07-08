/**
 * WizardServiceScreen Component
 * Service selection step for the scheduling wizard
 * Based on WalkInModal service selection functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Clock, 
  DollarSign, 
  Check, 
  Plus, 
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { useWizardStore } from '../../stores/wizardStore';
import { getCategories, getServicesByCategory } from '../../services/categoryService';

const WizardServiceScreen = () => {
  const firstInputRef = useRef(null);
  
  // State for service selection
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  
  // Wizard store
  const {
    selectedServices,
    setSelectedServices,
    goToNextStep,
    canProceedToStep,
    setLoading,
    setError,
    clearError
  } = useWizardStore();

  // Load categories and services on component mount
  useEffect(() => {
    loadServicesData();
  }, []);

  // Focus search input when component mounts
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  const loadServicesData = async () => {
    try {
      setLoadingServices(true);
      clearError();
      
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      
      // Load all services from all categories
      const allServices = [];
      for (const category of categoriesData) {
        const categoryServices = await getServicesByCategory(category.id);
        allServices.push(...categoryServices);
      }
      
      setServices(allServices);
    } catch (error) {
      console.error('Error loading services:', error);
      setError('Erro ao carregar serviços. Tente novamente.');
    } finally {
      setLoadingServices(false);
    }
  };

  // Filter services based on search query
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
    service.category_name?.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(price));
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // Toggle service selection
  const toggleService = (service) => {
    const isSelected = selectedServices.some(s => s.id === service.id);
    
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  // Calculate totals
  const estimatedPrice = selectedServices.reduce((sum, service) => sum + parseFloat(service.price || 0), 0);
  const estimatedDuration = selectedServices.reduce((sum, service) => sum + (service.duration_minutes || 0), 0);

  // Handle continue to next step
  const handleContinue = () => {
    if (selectedServices.length > 0 && canProceedToStep(3)) {
      goToNextStep();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Selecionar Serviços</h2>
        <p className="text-sm text-gray-500 mt-1">Escolha os serviços que deseja agendar</p>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-6 py-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={firstInputRef}
            type="text"
            value={serviceSearchQuery}
            onChange={(e) => setServiceSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-colors"
            placeholder="Buscar serviços..."
            inputMode="search"
          />
        </div>
      </div>

      {/* Shopping Cart Summary */}
      {selectedServices.length > 0 && (
        <div className="flex-shrink-0 mx-6 mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
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
                className="text-xs text-pink-600 hover:text-pink-700 font-medium bg-white px-2 py-1 rounded-md transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>
          <div className="text-xs text-pink-600">
            Duração estimada: {formatDuration(estimatedDuration)}
          </div>
        </div>
      )}

      {/* Services List */}
      <div className="flex-1 overflow-y-auto px-6">
        {loadingServices ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando serviços...</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredServices.map((service) => {
              const isSelected = selectedServices.some(s => s.id === service.id);
              return (
                <div
                  key={service.id}
                  onClick={() => toggleService(service)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-pink-500 bg-pink-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 mb-1">{service.name}</h4>
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
                      isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
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
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum serviço encontrado</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200">
        <button
          onClick={handleContinue}
          disabled={selectedServices.length === 0}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
            selectedServices.length > 0
              ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {selectedServices.length > 0 
            ? `Continuar com ${selectedServices.length} serviço${selectedServices.length !== 1 ? 's' : ''}`
            : 'Selecione pelo menos um serviço'
          }
        </button>
      </div>
    </div>
  );
};

export default WizardServiceScreen;