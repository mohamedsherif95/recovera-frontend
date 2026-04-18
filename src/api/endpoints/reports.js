import apiClient from '../client';

export const reportsApi = {
  getDashboard: async () => {
    const response = await apiClient.get('/reports/dashboard');
    return response.data;
  },

  getRevenue: async (params = {}) => {
    const response = await apiClient.get('/reports/revenue', { params });
    return response.data;
  },

  getSessions: async (params = {}) => {
    const response = await apiClient.get('/reports/sessions', { params });
    return response.data;
  },

  getPatients: async (params = {}) => {
    const response = await apiClient.get('/reports/patients', { params });
    return response.data;
  },

  getDoctorPerformance: async (params = {}) => {
    const response = await apiClient.get('/reports/doctor-performance', { params });
    return response.data;
  },

  getDoctorSessions: async (params = {}) => {
    const response = await apiClient.get('/reports/doctor-sessions', { params });
    return response.data;
  },

  getDailyOperations: async (params = {}) => {
    const response = await apiClient.get('/reports/daily-operations', { params });
    return response.data;
  },

  getIncomeReport: async (params = {}) => {
    const response = await apiClient.get('/reports/income', { params });
    return response.data;
  },

  getPatientBalancesReport: async (params = {}) => {
    const response = await apiClient.get('/reports/patient-balances', { params });
    return response.data;
  },

  getPatientPayments: async (params = {}) => {
    const response = await apiClient.get('/reports/income', { params });
    return response.data;
  },
};
