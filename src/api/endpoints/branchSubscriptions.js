import apiClient from '../client';

const buildScopeConfig = (options = {}) => {
  const config = {};

  if (options.clinicOverrideId !== undefined) {
    config.clinicOverrideId = options.clinicOverrideId;
  }

  if (options.branchOverrideId !== undefined) {
    config.branchOverrideId = options.branchOverrideId;
  }

  return config;
};

export const branchSubscriptionsApi = {
  getByBranch: async (branchId, options = {}) => {
    const response = await apiClient.get(
      `/platform/branch-subscriptions/${branchId}`,
      buildScopeConfig(options),
    );
    return response.data;
  },

  updateByBranch: async (branchId, payload, options = {}) => {
    const response = await apiClient.put(
      `/platform/branch-subscriptions/${branchId}`,
      payload,
      buildScopeConfig(options),
    );
    return response.data;
  },
};
