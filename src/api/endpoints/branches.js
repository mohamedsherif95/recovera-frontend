import apiClient from '../client';

const buildScopeConfig = (options = {}) => {
  const config = {};

  if (options.clinicOverrideId !== undefined) {
    config.clinicOverrideId = options.clinicOverrideId;
  }

  if (options.branchOverrideId !== undefined) {
    config.branchOverrideId = options.branchOverrideId;
  }

  if (options.platformClinicId !== undefined && options.platformClinicId !== null) {
    config.headers = {
      ...config.headers,
      'X-Platform-Clinic-Scope': String(options.platformClinicId),
    };
  }

  return config;
};

export const branchesApi = {
  getAll: async (options = {}) => {
    const response = await apiClient.get('/branches', buildScopeConfig(options));
    return response.data;
  },

  getById: async (branchId, options = {}) => {
    const response = await apiClient.get(
      `/branches/${branchId}`,
      buildScopeConfig(options),
    );
    return response.data;
  },

  create: async (payload, options = {}) => {
    const response = await apiClient.post(
      '/branches',
      payload,
      buildScopeConfig(options),
    );
    return response.data;
  },

  update: async (branchId, payload, options = {}) => {
    const response = await apiClient.put(
      `/branches/${branchId}`,
      payload,
      buildScopeConfig(options),
    );
    return response.data;
  },

  getCredits: async (params = {}, options = {}) => {
    const response = await apiClient.get('/branch-credits', {
      ...buildScopeConfig(options),
      params,
    });
    return response.data;
  },

  reconcileCredit: async (creditId, payload = {}, options = {}) => {
    const response = await apiClient.post(
      `/branch-credits/${creditId}/reconcile`,
      payload,
      buildScopeConfig(options),
    );
    return response.data;
  },
};
