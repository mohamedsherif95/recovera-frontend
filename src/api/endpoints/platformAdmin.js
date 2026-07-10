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
};
