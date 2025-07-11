/**
 * Services Store using Zustand
 * Maintains identical state management structure from Mobile-client-core
 * Enhanced with service variations support
 */

import { create } from 'zustand';
import { calculateFinalPrice, calculateFinalDuration } from '../services/serviceVariationsService';

const useServicesStore = create((set, get) => ({
  selectedServices: [],
  serviceVariations: {}, // { serviceId: { groupId: variation } }
  
  addService: (service) => set((state) => ({
    selectedServices: [...state.selectedServices, service]
  })),
  
  removeService: (serviceId) => set((state) => {
    // Also remove variations for this service
    const newVariations = { ...state.serviceVariations };
    delete newVariations[serviceId];
    
    return {
      selectedServices: state.selectedServices.filter(s => s.id !== serviceId),
      serviceVariations: newVariations
    };
  }),
  
  toggleService: (service) => set((state) => {
    const isSelected = state.selectedServices.some(s => s.id === service.id);
    if (isSelected) {
      // Remove service and its variations
      const newVariations = { ...state.serviceVariations };
      delete newVariations[service.id];
      
      return {
        selectedServices: state.selectedServices.filter(s => s.id !== service.id),
        serviceVariations: newVariations
      };
    } else {
      return {
        selectedServices: [...state.selectedServices, service]
      };
    }
  }),
  
  clearServices: () => set({ 
    selectedServices: [],
    serviceVariations: {}
  }),
  
  // Variation management
  setServiceVariation: (serviceId, groupId, variation) => set((state) => ({
    serviceVariations: {
      ...state.serviceVariations,
      [serviceId]: {
        ...state.serviceVariations[serviceId],
        [groupId]: variation
      }
    }
  })),
  
  removeServiceVariation: (serviceId, groupId) => set((state) => {
    const serviceVars = { ...state.serviceVariations[serviceId] };
    delete serviceVars[groupId];
    
    return {
      serviceVariations: {
        ...state.serviceVariations,
        [serviceId]: serviceVars
      }
    };
  }),
  
  getServiceVariations: (serviceId) => {
    const state = get();
    return state.serviceVariations[serviceId] || {};
  },
  
  // Calculate final price including variations
  getServiceFinalPrice: (service) => {
    const state = get();
    const basePrice = parseFloat(service.price) || 0;
    const variations = state.serviceVariations[service.id] || {};
    return calculateFinalPrice(basePrice, variations);
  },
  
  // Calculate final duration including variations
  getServiceFinalDuration: (service) => {
    const state = get();
    const baseDuration = service.duration_minutes || 0;
    const variations = state.serviceVariations[service.id] || {};
    return calculateFinalDuration(baseDuration, variations);
  },
  
  getTotalPrice: () => {
    const state = get();
    return state.selectedServices.reduce((total, service) => {
      const finalPrice = state.getServiceFinalPrice(service);
      return total + finalPrice;
    }, 0);
  },
  
  getTotalDuration: () => {
    const state = get();
    return state.selectedServices.reduce((total, service) => {
      const finalDuration = state.getServiceFinalDuration(service);
      return total + finalDuration;
    }, 0);
  }
}));

export default useServicesStore;