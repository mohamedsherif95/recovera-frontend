import apiClient from '../client';
import { buildScopedRequestConfig } from '../scopeConfig';

export const platformAdminApi = {
  getOverview: async (options = {}) => {
    const response = await apiClient.get(
      '/platform/admin/overview',
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  getClinicGroups: async (options = {}) => {
    const response = await apiClient.get(
      '/platform/admin/clinic-groups',
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  getAuditEvents: async (params = {}, options = {}) => {
    const config = buildScopedRequestConfig(options);
    config.params = params;

    const response = await apiClient.get('/platform/admin/audit', config);
    return response.data;
  },
};
