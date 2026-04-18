import apiClient from '../client';

export const auditApi = {
  /**
   * Get paginated audit/activity logs
   */
  getLogs: async (params = {}) => {
    const response = await apiClient.get('/audit/logs', { params });
    return response.data;
  },
};
