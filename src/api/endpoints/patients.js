import apiClient from '../client';

export const patientsApi = {
  /**
   * List patients with optional query params
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get('/patients', { params });
    return response.data;
  },

  /**
   * Get patient by ID
   */
  getById: async (patientId) => {
    const response = await apiClient.get(`/patients/${patientId}`);
    return response.data;
  },

  /**
   * Create patient
   */
  create: async (payload) => {
    const response = await apiClient.post('/patients', payload);
    return response.data;
  },

  /**
   * Update patient
   */
  update: async (patientId, payload) => {
    const response = await apiClient.put(`/patients/${patientId}`, payload);
    return response.data;
  },

  /**
   * Delete patient
   */
  remove: async (patientId) => {
    const response = await apiClient.delete(`/patients/${patientId}`);
    return response.data;
  },

  /**
   * Get patient's sessions history
   */
  getSessions: async (patientId, params = {}) => {
    const response = await apiClient.get(`/patients/${patientId}/sessions`, { params });
    return response.data;
  },

  /**
   * Update patient's medical history
   */
  updateHistory: async (patientId, payload) => {
    const response = await apiClient.put(`/patients/${patientId}/history`, payload);
    return response.data;
  },

  /**
   * Get patient's programs
   */
  getPrograms: async (patientId) => {
    const response = await apiClient.get(`/patients/${patientId}/programs`);
    return response.data;
  },

  /**
   * Update patient's programs
   */
  updatePrograms: async (patientId, payload) => {
    const response = await apiClient.put(`/patients/${patientId}/programs`, payload);
    return response.data;
  },
  /**
   * Add balance log entry for patient
   */
  addBalance: async (patientId, payload) => {
    const response = await apiClient.post(`/patients/${patientId}/balance`, payload);
    return response.data;
  },

  /**
   * List patient balance logs/notes
   */
  getBalanceLogs: async (patientId, params = {}) => {
    const response = await apiClient.get(`/patients/${patientId}/balance-logs`, {
      params,
    });
    return response.data;
  },

  /**
   * Create package transaction (balance and/or remaining amount adjustment)
   */
  createPackageTransaction: async (patientId, payload) => {
    const response = await apiClient.post(
      `/patients/${patientId}/package-transaction`,
      payload,
    );
    return response.data;
  },
};
