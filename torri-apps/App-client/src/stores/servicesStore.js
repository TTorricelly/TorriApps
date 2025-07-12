/**
 * Services Store using Zustand
 * Maintains identical state management structure from Mobile-client-core
 * Enhanced with service variations support
 */

import { create } from 'zustand';
import { calculateFinalPrice, calculateFinalDuration } from '../services/serviceVariationsService';

// Helper function to expand multiple choice variations into separate service instances
const expandMultipleChoiceVariations = (service, variations) => {
  const expandedServices = [];
  
  // Find multiple choice variations (arrays)
  const multipleChoiceGroups = Object.entries(variations).filter(([groupId, variation]) => Array.isArray(variation));
  const singleChoiceGroups = Object.entries(variations).filter(([groupId, variation]) => !Array.isArray(variation) && variation);
  
  if (multipleChoiceGroups.length === 0) {
    // No multiple choice variations - return single service instance
    const finalPrice = calculateFinalPrice(parseFloat(service.price), variations);
    return [{
      ...service,
      originalId: service.id,
      finalPrice,
      variationName: Object.values(variations).filter(v => v).map(v => v.name).join(' + ') || '',
      selectedVariations: Object.values(variations).filter(v => v)
    }];
  }
  
  // For each multiple choice group, create separate service instances
  multipleChoiceGroups.forEach(([groupId, variationsArray]) => {
    variationsArray.forEach(variation => {
      // Create variation object with this specific variation plus any single choice variations
      const serviceVariations = {
        ...singleChoiceGroups.reduce((acc, [gId, v]) => ({ ...acc, [gId]: v }), {}),
        [groupId]: variation
      };
      
      const finalPrice = calculateFinalPrice(parseFloat(service.price), serviceVariations);
      const allVariations = Object.values(serviceVariations).filter(v => v);
      
      expandedServices.push({
        ...service,
        id: `${service.id}_${variation.id}`, // Unique ID
        originalId: service.id,
        finalPrice,
        variationName: allVariations.map(v => v.name).join(' + '),
        selectedVariations: allVariations
      });
    });
  });
  
  return expandedServices;
};

const useServicesStore = create((set, get) => ({
  selectedServices: [], // Will now contain service instances with specific variations
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
  setServiceVariation: (serviceId, groupId, variation, isMultipleChoice = false) => set((state) => {
    const newServiceVariations = { ...state.serviceVariations };
    
    if (variation === null) {
      // Remove the variation selection completely
      if (newServiceVariations[serviceId]) {
        const serviceVars = { ...newServiceVariations[serviceId] };
        delete serviceVars[groupId];
        
        // If no variations left for this service, remove the service entry
        if (Object.keys(serviceVars).length === 0) {
          delete newServiceVariations[serviceId];
        } else {
          newServiceVariations[serviceId] = serviceVars;
        }
      }
    } else {
      // Set the variation selection
      newServiceVariations[serviceId] = {
        ...newServiceVariations[serviceId],
        [groupId]: isMultipleChoice ? [variation] : variation
      };
    }
    
    return {
      serviceVariations: newServiceVariations
    };
  }),

  // Toggle variation for multiple choice groups
  toggleServiceVariation: (serviceId, groupId, variation) => set((state) => {
    const currentGroupVariations = state.serviceVariations[serviceId]?.[groupId];
    
    if (!Array.isArray(currentGroupVariations)) {
      // Initialize as array with first variation
      return {
        serviceVariations: {
          ...state.serviceVariations,
          [serviceId]: {
            ...state.serviceVariations[serviceId],
            [groupId]: [variation]
          }
        }
      };
    }
    
    // Check if variation is already selected
    const isSelected = currentGroupVariations.some(v => v.id === variation.id);
    
    if (isSelected) {
      // Remove variation
      const newVariations = currentGroupVariations.filter(v => v.id !== variation.id);
      const updatedServiceVariations = {
        ...state.serviceVariations[serviceId],
        [groupId]: newVariations.length > 0 ? newVariations : undefined
      };
      
      // Check if this service has any variations left
      const hasAnyVariations = Object.values(updatedServiceVariations).some(v => v && (Array.isArray(v) ? v.length > 0 : true));
      
      if (!hasAnyVariations) {
        // No variations left - remove service from cart entirely
        const newServiceVariations = { ...state.serviceVariations };
        delete newServiceVariations[serviceId];
        
        return {
          selectedServices: state.selectedServices.filter(s => s.id !== serviceId),
          serviceVariations: newServiceVariations
        };
      }
      
      return {
        serviceVariations: {
          ...state.serviceVariations,
          [serviceId]: updatedServiceVariations
        }
      };
    } else {
      // Add variation
      return {
        serviceVariations: {
          ...state.serviceVariations,
          [serviceId]: {
            ...state.serviceVariations[serviceId],
            [groupId]: [...currentGroupVariations, variation]
          }
        }
      };
    }
  }),
  
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
  
  // Get expanded services (each variation as separate service instance)
  getExpandedServices: () => {
    const state = get();
    const expandedServices = [];
    
    state.selectedServices.forEach(service => {
      const variations = state.serviceVariations[service.id] || {};
      const serviceInstances = expandMultipleChoiceVariations(service, variations);
      expandedServices.push(...serviceInstances);
    });
    
    return expandedServices;
  },

  getTotalPrice: () => {
    const state = get();
    const expandedServices = state.getExpandedServices();
    return expandedServices.reduce((total, serviceInstance) => {
      return total + serviceInstance.finalPrice;
    }, 0);
  },
  
  getTotalDuration: () => {
    const state = get();
    return state.getExpandedServices().reduce((total, serviceInstance) => {
      const baseDuration = serviceInstance.duration_minutes || 0;
      const variationsDuration = serviceInstance.selectedVariations.reduce((sum, variation) => {
        return sum + (variation.duration_delta || 0);
      }, 0);
      return total + baseDuration + variationsDuration;
    }, 0);
  },

  // Get count of expanded services (for display purposes)
  getExpandedServicesCount: () => {
    const state = get();
    return state.getExpandedServices().length;
  }
}));

export default useServicesStore;