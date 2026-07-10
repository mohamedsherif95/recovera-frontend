import apiClient from '../client';
import { buildScopedRequestConfig } from '../scopeConfig';

export const branchSubscriptionsApi = {
  getByBranch: async (branchId, options = {}) => {
    const response = await apiClient.get(
      `/platform/branch-subscriptions/${branchId}`,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  updateByBranch: async (branchId, payload, options = {}) => {
    const response = await apiClient.put(
      `/platform/branch-subscriptions/${branchId}`,
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },
};
