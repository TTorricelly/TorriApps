import { api } from '../api/client';
import { withApiErrorHandling, buildApiEndpoint, createCrudApi } from '../Utils/apiHelpers';

// Create base CRUD operations for station types
const stationTypesCrudApi = createCrudApi({
  endpoint: 'stations/types',
  entityName: 'station types'
});

// Station Types API service functions
export const stationTypesApi = {
  ...stationTypesCrudApi,
  
  // Override getAll to handle the response structure
  getAll: async () => {
    const endpoint = buildApiEndpoint('stations/types');
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => Array.isArray(data) ? data : []
      }
    );
  },

  // Get station type by ID with stations
  getById: async (id) => {
    const endpoint = buildApiEndpoint(`stations/types/${id}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Create new station type
  create: async (stationTypeData) => {
    const endpoint = buildApiEndpoint('stations/types');
    
    return withApiErrorHandling(
      () => api.post(endpoint, stationTypeData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update station type
  update: async (id, stationTypeData) => {
    const endpoint = buildApiEndpoint(`stations/types/${id}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, stationTypeData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Delete station type
  delete: async (id) => {
    const endpoint = buildApiEndpoint(`stations/types/${id}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: true,
        transformData: () => true
      }
    );
  },
};

// Create base CRUD operations for stations
const stationsCrudApi = createCrudApi({
  endpoint: 'stations',
  entityName: 'stations'
});

// Stations API service functions
export const stationsApi = {
  ...stationsCrudApi,
  
  // Override getAll to support filtering by type and active status
  getAll: async (typeId = null, activeOnly = true) => {
    const params = {};
    if (typeId) params.type_id = typeId;
    if (!activeOnly) params.active_only = false;
    
    const endpoint = buildApiEndpoint('stations');
    
    return withApiErrorHandling(
      () => api.get(endpoint, { params }),
      {
        defaultValue: [],
        transformData: (data) => Array.isArray(data) ? data : []
      }
    );
  },

  // Get station by ID
  getById: async (id) => {
    const endpoint = buildApiEndpoint(`stations/${id}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Create new station
  create: async (stationData) => {
    const endpoint = buildApiEndpoint('stations');
    
    return withApiErrorHandling(
      () => api.post(endpoint, stationData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update station
  update: async (id, stationData) => {
    const endpoint = buildApiEndpoint(`stations/${id}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, stationData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Delete station
  delete: async (id) => {
    const endpoint = buildApiEndpoint(`stations/${id}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: true,
        transformData: () => true
      }
    );
  },
};

// Service Station Requirements API service functions
export const serviceStationRequirementsApi = {
  // Get station requirements for a service
  getByServiceId: async (serviceId) => {
    const endpoint = buildApiEndpoint(`stations/requirements/service/${serviceId}`);
    
    return withApiErrorHandling(
      () => api.get(endpoint),
      {
        defaultValue: [],
        transformData: (data) => Array.isArray(data) ? data : []
      }
    );
  },

  // Create new service station requirement
  create: async (requirementData) => {
    const endpoint = buildApiEndpoint('stations/requirements');
    
    return withApiErrorHandling(
      () => api.post(endpoint, requirementData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Update service station requirement
  update: async (serviceId, stationTypeId, requirementData) => {
    const endpoint = buildApiEndpoint(`stations/requirements/${serviceId}/${stationTypeId}`);
    
    return withApiErrorHandling(
      () => api.put(endpoint, requirementData),
      {
        defaultValue: null,
        transformData: (data) => data
      }
    );
  },

  // Delete service station requirement
  delete: async (serviceId, stationTypeId) => {
    const endpoint = buildApiEndpoint(`stations/requirements/${serviceId}/${stationTypeId}`);
    
    return withApiErrorHandling(
      () => api.delete(endpoint),
      {
        defaultValue: true,
        transformData: () => true
      }
    );
  },
};