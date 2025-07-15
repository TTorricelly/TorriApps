/**
 * ServiceDataContext - Global Service Data Management
 * Following React best practices with Context + Custom Hook pattern
 * 
 * Benefits:
 * - Global state management
 * - Automatic caching and revalidation
 * - Reusable across all components
 * - Loading states handled automatically
 * - No race conditions or manual abort logic
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { serviceDataService } from '../Services/ServiceDataService';

const ServiceDataContext = createContext(null);

/**
 * ServiceDataProvider - Provides service data to entire app
 */
export const ServiceDataProvider = ({ children }) => {
  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Shared loading function
  const loadServiceData = async (isMounted = { current: true }) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await serviceDataService.loadCompleteServiceData({
        useCache: true
      });
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        setServiceData(data);
        setLoading(false);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  };

  // Load service data once on app mount
  useEffect(() => {
    const isMounted = { current: true };
    loadServiceData(isMounted);

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  const value = {
    serviceData,
    loading,
    error,
    // Method to refresh data if needed
    refresh: async () => {
      serviceDataService.clearCache();
      const isMounted = { current: true };
      await loadServiceData(isMounted);
    }
  };

  return (
    <ServiceDataContext.Provider value={value}>
      {children}
    </ServiceDataContext.Provider>
  );
};

/**
 * useServiceData - Custom hook to access service data
 * 
 * Returns modal-compatible format automatically
 */
export const useServiceData = () => {
  const context = useContext(ServiceDataContext);
  
  if (!context) {
    throw new Error('useServiceData must be used within ServiceDataProvider');
  }

  const { serviceData, loading, error, refresh } = context;

  // Transform to modal-compatible format
  const modalData = serviceData ? {
    categories: serviceData.categories.map(category => ({
      id: category.id,
      name: category.name,
      icon_url: category.iconUrl,
      display_order: category.displayOrder
    })),
    services: serviceData.allServices.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      duration_minutes: service.durationMinutes,
      display_order: service.displayOrder,
      category_id: service.categoryId,
      category_name: service.categoryName,
      images: service.images,
      variations: service.getAllVariations()
    })),
    professionals: serviceData.professionals
  } : null;

  return {
    // Modal-compatible data
    preloadedServices: modalData,
    
    // Raw domain data for advanced use
    serviceData,
    
    // Loading states
    loading,
    error,
    isReady: !loading && !error && serviceData !== null,
    
    // Actions
    refresh
  };
};

/**
 * useModalServiceData - Specific hook for modals
 * Returns exactly what AddServicesModal expects (direct data access)
 */
export const useModalServiceData = () => {
  const { preloadedServices, loading, error, isReady } = useServiceData();
  
  // Return data in the exact format the modal expects
  if (!preloadedServices) {
    return null;
  }
  
  return {
    categories: preloadedServices.categories,
    services: preloadedServices.services,
    professionals: preloadedServices.professionals,
    isLoading: loading,
    hasError: !!error,
    isReady,
    error
  };
};