import apiClient from '../client';
import { buildScopedRequestConfig } from '../scopeConfig';

export const profileServicesApi = {
  getCatalog: async (params = {}, options = {}) => {
    const config = buildScopedRequestConfig(options);
    const response = await apiClient.get('/profile-service-catalog', {
      ...config,
      params,
    });
    return response.data;
  },

  getBranchProfileSettings: async (params = {}, options = {}) => {
    const config = buildScopedRequestConfig(options);
    const response = await apiClient.get('/branch-profile-settings', {
      ...config,
      params,
    });
    return response.data;
  },

  updateBranchProfileSetting: async (profile, payload, options = {}) => {
    const response = await apiClient.patch(
      `/branch-profile-settings/${profile}`,
      payload,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },
};
