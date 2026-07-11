import apiClient from '../client';
import { buildScopedRequestConfig } from '../scopeConfig';

export const usersApi = {
  /**
   * List users (admin view, supports pagination and basic filters)
   * Backend supports: GET /users?page=&limit=
   * We also pass optional role and isActive filters as query params if backend chooses to use them.
   */
  getAll: async (params = {}, options = {}) => {
    const response = await apiClient.get('/users', {
      ...buildScopedRequestConfig(options),
      params,
    });
    return response.data;
  },

  create: async (data, options = {}) => {
    const response = await apiClient.post(
      '/users',
      data,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  /**
   * Update user core fields and roles via PUT /users/:id
   * Body shape per API docs: { fullName?, username?, email?, isActive?, roleIds? }
   */
  update: async (id, data, options = {}) => {
    const response = await apiClient.put(
      `/users/${id}`,
      data,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  /**
   * Activate/deactivate user via dedicated endpoints
   */
  activate: async (id, options = {}) => {
    const response = await apiClient.post(
      `/users/${id}/activate`,
      undefined,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  deactivate: async (id, options = {}) => {
    const response = await apiClient.post(
      `/users/${id}/deactivate`,
      undefined,
      buildScopedRequestConfig(options),
    );
    return response.data;
  },

  /**
   * Set roles for a user using POST /users/:id/roles with { roleIds }
   */
  setRoles: async (id, roleIds, options = {}) => {
    const { changeReason, ...requestOptions } = options;
    const response = await apiClient.post(
      `/users/${id}/roles`,
      {
        roleIds,
        ...(changeReason ? { changeReason } : {}),
      },
      buildScopedRequestConfig(requestOptions),
    );
    return response.data;
  },
};
