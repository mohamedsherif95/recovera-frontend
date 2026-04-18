import apiClient from '../client';

export const usersApi = {
  /**
   * List users (admin view, supports pagination and basic filters)
   * Backend supports: GET /users?page=&limit=
   * We also pass optional role and isActive filters as query params if backend chooses to use them.
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  /**
   * Update user core fields and roles via PUT /users/:id
   * Body shape per API docs: { fullName?, username?, email?, isActive?, roleIds? }
   */
  update: async (id, data) => {
    const response = await apiClient.put(`/users/${id}`, data);
    return response.data;
  },

  /**
   * Activate/deactivate user via dedicated endpoints
   */
  activate: async (id) => {
    const response = await apiClient.post(`/users/${id}/activate`);
    return response.data;
  },

  deactivate: async (id) => {
    const response = await apiClient.post(`/users/${id}/deactivate`);
    return response.data;
  },

  /**
   * Set roles for a user using POST /users/:id/roles with { roleIds }
   */
  setRoles: async (id, roleIds) => {
    const response = await apiClient.post(`/users/${id}/roles`, { roleIds });
    return response.data;
  },
};
