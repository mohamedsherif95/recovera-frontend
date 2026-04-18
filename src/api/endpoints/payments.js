import apiClient from '../client';

export const paymentsApi = {
  /**
   * List payments
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get('/payments', { params });
    return response.data;
  },

  /**
   * Get payment by ID
   */
  getById: async (paymentId) => {
    const response = await apiClient.get(`/payments/${paymentId}`);
    return response.data;
  },

  /**
   * Get payments summary for a session
   */
  getBySession: async (sessionId) => {
    const response = await apiClient.get(`/payments/session/${sessionId}`);
    return response.data;
  },

  /**
   * Create payment
   */
  create: async (payload) => {
    const response = await apiClient.post('/payments', payload);
    return response.data;
  },

  /**
   * Delete payment
   */
  remove: async (paymentId) => {
    const response = await apiClient.delete(`/payments/${paymentId}`);
    return response.data;
  },
};
