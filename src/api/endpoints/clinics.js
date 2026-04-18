import apiClient from '../client';

export const clinicsApi = {
  getAll: async () => {
    const response = await apiClient.get('/clinics');
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/clinics/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/clinics', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/clinics/${id}`, data);
    return response.data;
  },
};
