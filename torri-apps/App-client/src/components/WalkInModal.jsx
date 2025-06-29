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
  DollarSign
} from 'lucide-react';

import { getCategories, getServicesByCategory } from '../services/categoryService';
import { getProfessionalsForService } from '../services/professionalService';
import { createWalkInAppointment } from '../services/appointmentService';

const WalkInModal = ({ 
  isOpen, 
  onClose, 
  onWalkInCreated 
}) => {
  // State management
  const [step, setStep] = useState(1); // 1: Client, 2: Services, 3: Professional, 4: Confirm
  const [clientData, setClientData] = useState({
    name: '',
    phone: '',
    email: '',
    isNewClient: true
  });
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedProfessional, setProfessional] = useState(null);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  
  // Data loading states
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // UI state
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  
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
  
  // Load initial data
  useEffect(() => {
    if (isOpen && step === 2) {
      loadCategories();
    }
  }, [isOpen, step]);
  
  const loadCategories = async () => {
    try {
      setIsLoading(true);
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
      setIsLoading(false);
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
      setIsLoading(true);
      // Get professionals who can perform all selected services
      const professionalSets = await Promise.all(
        selectedServices.map(service => getProfessionalsForService(service.id))
      );
      
      // Find intersection of all professional sets
      const commonProfessionals = professionalSets.reduce((common, current) => {
        if (common.length === 0) return current;
        return common.filter(prof => current.some(p => p.id === prof.id));
      }, []);
      
      setProfessionals(commonProfessionals);
    } catch (err) {
      setError('Failed to load professionals');
      setProfessionals([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const walkInData = {
        client_data: clientData,
        services: selectedServices.map(s => ({ id: s.id, price: s.price })),
        professional_id: selectedProfessional?.id,
        estimated_duration: estimatedDuration,
        estimated_price: estimatedPrice,
        notes: `Walk-in appointment created for ${clientData.name}`
      };
      
      const result = await createWalkInAppointment(walkInData);
      onWalkInCreated(result);
      onClose();
      resetForm();
      
    } catch (err) {
      setError('Failed to create walk-in appointment');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setStep(1);
    setClientData({ name: '', phone: '', email: '', isNewClient: true });
    setSelectedServices([]);
    setProfessional(null);
    setServiceSearchQuery('');
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
  
  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Client Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name *
              </label>
              <input
                ref={firstInputRef}
                type="text"
                value={clientData.name}
                onChange={(e) => setClientData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter client name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={clientData.phone}
                onChange={(e) => setClientData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={clientData.email}
                onChange={(e) => setClientData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="client@example.com"
              />
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Select Services</h3>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                ref={firstInputRef}
                type="text"
                value={serviceSearchQuery}
                onChange={(e) => setServiceSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Search services..."
              />
            </div>
            
            {/* Selected services summary */}
            {selectedServices.length > 0 && (
              <div className="p-3 bg-pink-50 rounded-lg">
                <p className="text-sm text-pink-800 mb-2">
                  {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex justify-between text-sm">
                  <span>Duration: {formatDuration(estimatedDuration)}</span>
                  <span>Price: {formatPrice(estimatedPrice)}</span>
                </div>
              </div>
            )}
            
            {/* Services list */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredServices.map((service) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <div
                    key={service.id}
                    onClick={() => toggleService(service)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{service.name}</h4>
                        <p className="text-xs text-gray-500">{service.category_name}</p>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-xs text-gray-600 flex items-center">
                            <Clock size={12} className="mr-1" />
                            {formatDuration(service.duration_minutes)}
                          </span>
                          <span className="text-xs text-green-600 font-medium flex items-center">
                            <DollarSign size={12} className="mr-1" />
                            {formatPrice(service.price)}
                          </span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <div className="w-full h-full rounded-full bg-white scale-50"></div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Select Professional</h3>
            
            {professionals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No professionals available for selected services</p>
              </div>
            ) : (
              <div className="space-y-3">
                {professionals.map((professional) => (
                  <div
                    key={professional.id}
                    onClick={() => setProfessional(professional)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProfessional?.id === professional.id
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User size={20} className="text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{professional.full_name}</h4>
                        <p className="text-sm text-gray-500">{professional.role || 'Professional'}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        selectedProfessional?.id === professional.id ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                      }`}>
                        {selectedProfessional?.id === professional.id && 
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Walk-in</h3>
            
            {/* Summary */}
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Client</h4>
                <p className="text-sm">{clientData.name}</p>
                {clientData.phone && <p className="text-xs text-gray-600">{clientData.phone}</p>}
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Services</h4>
                {selectedServices.map((service, index) => (
                  <div key={service.id} className="flex justify-between text-sm">
                    <span>{service.name}</span>
                    <span>{formatPrice(service.price)}</span>
                  </div>
                ))}
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Professional</h4>
                <p className="text-sm">{selectedProfessional?.full_name}</p>
              </div>
              
              <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-pink-800">Total</span>
                  <div className="text-right">
                    <div className="font-bold text-pink-800">{formatPrice(estimatedPrice)}</div>
                    <div className="text-xs text-pink-600">{formatDuration(estimatedDuration)}</div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold">Add Walk-in</h2>
            <p className="text-sm text-gray-500">Step {step} of 4</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="px-4 py-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          
          {renderStepContent()}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
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
              isLoading ||
              (step === 1 && !clientData.name) ||
              (step === 2 && selectedServices.length === 0) ||
              (step === 3 && !selectedProfessional)
            }
            className="px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {isLoading ? 'Loading...' : step === 4 ? 'Create Walk-in' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WalkInModal;