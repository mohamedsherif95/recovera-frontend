import apiClient from '../client';
import { buildScopedRequestConfig } from '../scopeConfig';

export const branchesApi = {
  getAll: async (options = {}) => {
    const response = await apiClient.get('/branches', buildScopedRequestConfig(options));
    return response.data;
  },

  getById: async (branchId, options = {}) => {
    const response = await apiClient.get(
      `/branches/${branchId}`,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  create: async (payload, options = {}) => {
    const response = await apiClient.post(
      '/branches',
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  update: async (branchId, payload, options = {}) => {
    const response = await apiClient.put(
      `/branches/${branchId}`,
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  getCredits: async (params = {}, options = {}) => {
    const response = await apiClient.get('/branch-credits', {
      ...buildScopedRequestConfig(options),
      params,
    });
    return response.data;
  },

  reconcileCredit: async (creditId, payload = {}, options = {}) => {
    const response = await apiClient.post(
      `/branch-credits/${creditId}/reconcile`,
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },
};
