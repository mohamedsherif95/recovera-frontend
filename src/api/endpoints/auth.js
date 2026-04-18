import apiClient from '../client';

export const authApi = {
  /**
   * Login user
   * @param {Object} credentials - { username, password }
   * @returns {Promise} - { user, token, refreshToken }
   */
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  completeFirstLogin: async (data) => {
    const response = await apiClient.post('/auth/first-login/complete', data);
    return response.data;
  },

  /**
   * Refresh access token
   * @param {string} refreshToken
   * @returns {Promise} - { token }
   */
  refreshToken: async (refreshToken) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Logout user
   * @returns {Promise}
   */
  logout: async (refreshToken) => {
    const response = await apiClient.post('/auth/logout', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user profile
   * @returns {Promise}
   */
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  /**
   * Forgot password
   * @param {string} email
   * @returns {Promise}
   */
  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password
   * @param {Object} data - { token, newPassword }
   * @returns {Promise}
   */
  resetPassword: async (data) => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },

  /**
   * Update profile
   * @param {Object} data - { fullName?, email? }
   * @returns {Promise}
   */
  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/profile', data);
    return response.data;
  },

  /**
   * Change password
   * @param {Object} data - { currentPassword, newPassword }
   * @returns {Promise}
   */
  changePassword: async (data) => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },
};
