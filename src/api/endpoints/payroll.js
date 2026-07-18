import apiClient from '../client';

export const payrollApi = {
  getSalarySettings: async (params = {}) => {
    const response = await apiClient.get('/payroll/salary-settings', { params });
    return response.data;
  },

  upsertSalarySetting: async (userId, payload) => {
    const response = await apiClient.put(
      `/payroll/salary-settings/${userId}`,
      payload,
    );
    return response.data;
  },

  getPeriods: async (params = {}) => {
    const response = await apiClient.get('/payroll/periods', { params });
    return response.data;
  },

  getPeriod: async (periodId) => {
    const response = await apiClient.get(`/payroll/periods/${periodId}`);
    return response.data;
  },

  ensurePeriod: async (payload) => {
    const response = await apiClient.post('/payroll/periods/ensure', payload);
    return response.data;
  },

  refreshDefaults: async (periodId) => {
    const response = await apiClient.post(
      `/payroll/periods/${periodId}/refresh-defaults`,
    );
    return response.data;
  },

  updateLine: async (periodId, lineId, payload) => {
    const response = await apiClient.patch(
      `/payroll/periods/${periodId}/lines/${lineId}`,
      payload,
    );
    return response.data;
  },

  createAdjustment: async (periodId, lineId, payload) => {
    const response = await apiClient.post(
      `/payroll/periods/${periodId}/lines/${lineId}/adjustments`,
      payload,
    );
    return response.data;
  },

  updateAdjustment: async (periodId, lineId, adjustmentId, payload) => {
    const response = await apiClient.patch(
      `/payroll/periods/${periodId}/lines/${lineId}/adjustments/${adjustmentId}`,
      payload,
    );
    return response.data;
  },

  deleteAdjustment: async (periodId, lineId, adjustmentId) => {
    const response = await apiClient.delete(
      `/payroll/periods/${periodId}/lines/${lineId}/adjustments/${adjustmentId}`,
    );
    return response.data;
  },

  closePeriod: async (periodId, payload = {}) => {
    const response = await apiClient.post(
      `/payroll/periods/${periodId}/close`,
      payload,
    );
    return response.data;
  },

  recordExpense: async (periodId, payload = {}) => {
    const response = await apiClient.post(
      `/payroll/periods/${periodId}/record-expense`,
      payload,
    );
    return response.data;
  },
};
