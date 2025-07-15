/**
 * ServiceDataService - Application Service Layer
 * Following DDD patterns and single responsibility principle
 * 
 * Responsibilities:
 * - Coordinate service data loading
 * - Transform API responses to domain objects  
 * - Provide clean interface for UI components
 * - Handle errors and loading states
 */

import { useMemo } from 'react';
import { servicesApi } from './services';
import { professionalsApi } from './professionals';
import { CompleteServiceData } from './domain/ServiceDataTypes';

/**
 * ServiceDataService
 * Application service for managing service data operations
 */
export class ServiceDataService {
  constructor() {
    this._cache = new Map();
    this._loadingPromises = new Map();
  }

  /**
   * Load complete service data optimized for modals
   * Uses single API request to eliminate N+1 queries
   * 
   * @param {Object} options - Loading options
   * @param {AbortSignal} options.signal - Abort signal for cancellation
   * @param {boolean} options.useCache - Whether to use cached data (default: true)
   * @returns {Promise<CompleteServiceData>} Complete service data
   */
  async loadCompleteServiceData({ signal, useCache = true } = {}) {
    const cacheKey = 'complete-service-data';
    
    // Return cached data if available and requested
    if (useCache && this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    // Return existing promise if already loading
    if (this._loadingPromises.has(cacheKey)) {
      return this._loadingPromises.get(cacheKey);
    }

    // Create new loading promise
    const loadingPromise = this._performLoad(signal);
    this._loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      
      // Cache successful result
      this._cache.set(cacheKey, result);
      
      return result;
    } finally {
      // Clean up loading promise
      this._loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Internal method to perform the actual data loading
   * @private
   */
  async _performLoad(signal) {
    // Check for abort before starting
    if (signal?.aborted) {
      throw new Error('Operation aborted');
    }

    try {
      // Load data in parallel for optimal performance
      const [categoriesWithServices, professionals] = await Promise.all([
        servicesApi.getCompleteServicesData(),
        professionalsApi.getAll()
      ]);

      // Check for abort after requests
      if (signal?.aborted) {
        throw new Error('Operation aborted');
      }

      // Transform API data to domain objects
      const completeServiceData = CompleteServiceData.fromApiData(
        categoriesWithServices,
        professionals
      );

      return completeServiceData;

    } catch (error) {
      // Handle abort errors gracefully
      if (error.name === 'AbortError' || error.message === 'Operation aborted') {
        throw error;
      }

      // Log and re-throw other errors
      console.error('[ServiceDataService] Failed to load service data:', error);
      throw new Error(`Failed to load service data: ${error.message}`);
    }
  }

  /**
   * Clear cached data
   * Useful when data needs to be refreshed
   */
  clearCache() {
    this._cache.clear();
  }

  /**
   * Get cached data without loading
   * @returns {CompleteServiceData|null} Cached data or null
   */
  getCachedData() {
    return this._cache.get('complete-service-data') || null;
  }

  /**
   * Check if data is currently loading
   * @returns {boolean} True if loading
   */
  isLoading() {
    return this._loadingPromises.has('complete-service-data');
  }
}

/**
 * Singleton instance for application-wide use
 * Following single responsibility - one instance manages all service data
 */
export const serviceDataService = new ServiceDataService();

/**
 * Hook-like function for React components
 * Provides consistent interface for service data loading
 * 
 * NOTE: This creates a new object on each render, which can cause infinite loops
 * in useEffect dependencies. Prefer using the singleton `serviceDataService` directly
 * in components that use it in useEffect dependencies.
 */
export const useServiceDataLoader = () => {
  // Use useMemo to prevent creating new object on each render
  return useMemo(() => ({
    loadCompleteServiceData: (options) => serviceDataService.loadCompleteServiceData(options),
    clearCache: () => serviceDataService.clearCache(),
    getCachedData: () => serviceDataService.getCachedData(),
    isLoading: () => serviceDataService.isLoading()
  }), []);
};