export const professionalsApi = {
  getAll: async () => {
    const { api } = await import('../api/client');
    const response = await api.get('/users');
    return response.data;
  },

  getById: async (id) => {
    const { api } = await import('../api/client');
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  create: async (data) => {
    const { api } = await import('../api/client');
    const response = await api.post('/users', data);
    return response.data;
  },

  update: async (id, data) => {
    const { api } = await import('../api/client');
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const { api } = await import('../api/client');
    await api.delete(`/users/${id}`);
  },

  uploadPhoto: async (id, file) => {
    const { api } = await import('../api/client');
    const formData = new FormData();
    formData.append('file', file);
    await api.post(`/users/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  updateServices: async (id, serviceIds) => {
    const { api } = await import('../api/client');
    await api.post(`/users/${id}/services`, { service_ids: serviceIds });
  },

  getAvailability: async (id) => {
    const { api } = await import('../api/client');
    const res = await api.get(`/availability/professional/${id}/slots`);
    return res.data;
  },
  createAvailability: async (id, data) => {
    const { api } = await import('../api/client');
    const res = await api.post(`/availability/professional/${id}/slots`, data);
    return res.data;
  },
  deleteAvailability: async (id, slotId) => {
    const { api } = await import('../api/client');
    await api.delete(`/availability/professional/${id}/slots/${slotId}`);
  },

  getBreaks: async (id) => {
    const { api } = await import('../api/client');
    const res = await api.get(`/availability/professional/${id}/breaks`);
    return res.data;
  },
  createBreak: async (id, data) => {
    const { api } = await import('../api/client');
    const res = await api.post(`/availability/professional/${id}/breaks`, data);
    return res.data;
  },
  deleteBreak: async (id, breakId) => {
    const { api } = await import('../api/client');
    await api.delete(`/availability/professional/${id}/breaks/${breakId}`);
  },

  getBlockedTimes: async (id) => {
    const { api } = await import('../api/client');
    const res = await api.get(`/availability/professional/${id}/blocked-times`);
    return res.data;
  },
  createBlockedTime: async (id, data) => {
    const { api } = await import('../api/client');
    const res = await api.post(`/availability/professional/${id}/blocked-times`, data);
    return res.data;
  },
  deleteBlockedTime: async (id, blockedId) => {
    const { api } = await import('../api/client');
    await api.delete(`/availability/professional/${id}/blocked-times/${blockedId}`);
  }
};
