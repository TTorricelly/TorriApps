import { api } from '../api/client';

// Station Types API service functions
export const stationTypesApi = {
  // Get all station types
  getAll: async () => {
    const response = await api.get('/stations/types');
    return response.data;
  },

  // Get station type by ID with stations
  getById: async (id) => {
    const response = await api.get(`/stations/types/${id}`);
    return response.data;
  },

  // Create new station type
  create: async (stationTypeData) => {
    const response = await api.post('/stations/types', stationTypeData);
    return response.data;
  },

  // Update station type
  update: async (id, stationTypeData) => {
    const response = await api.put(`/stations/types/${id}`, stationTypeData);
    return response.data;
  },

  // Delete station type
  delete: async (id) => {
    await api.delete(`/stations/types/${id}`);
  },
};

// Stations API service functions
export const stationsApi = {
  // Get all stations (optionally filtered by type and active status)
  getAll: async (typeId = null, activeOnly = true) => {
    const params = {};
    if (typeId) params.type_id = typeId;
    if (!activeOnly) params.active_only = false;
    
    const response = await api.get('/stations', { params });
    return response.data;
  },

  // Get station by ID
  getById: async (id) => {
    const response = await api.get(`/stations/${id}`);
    return response.data;
  },

  // Create new station
  create: async (stationData) => {
    const response = await api.post('/stations', stationData);
    return response.data;
  },

  // Update station
  update: async (id, stationData) => {
    const response = await api.put(`/stations/${id}`, stationData);
    return response.data;
  },

  // Delete station
  delete: async (id) => {
    await api.delete(`/stations/${id}`);
  },
};

// Service Station Requirements API service functions
export const serviceStationRequirementsApi = {
  // Get station requirements for a service
  getByServiceId: async (serviceId) => {
    const response = await api.get(`/stations/requirements/service/${serviceId}`);
    return response.data;
  },

  // Create new service station requirement
  create: async (requirementData) => {
    const response = await api.post('/stations/requirements', requirementData);
    return response.data;
  },

  // Update service station requirement
  update: async (serviceId, stationTypeId, requirementData) => {
    const response = await api.put(`/stations/requirements/${serviceId}/${stationTypeId}`, requirementData);
    return response.data;
  },

  // Delete service station requirement
  delete: async (serviceId, stationTypeId) => {
    await api.delete(`/stations/requirements/${serviceId}/${stationTypeId}`);
  },
};