import apiClient from '../client';

export const invoicesApi = {
  getAll: async (params = {}) => {
    const response = await apiClient.get('/invoices', { params });
    return response.data;
  },

  getById: async (invoiceId) => {
    const response = await apiClient.get(`/invoices/${invoiceId}`);
    return response.data;
  },

  getByPaymentSource: async (paymentId) => {
    const response = await apiClient.get(`/invoices/source/payment/${paymentId}`);
    return response.data;
  },

  getByBalanceLogSource: async (balanceLogId) => {
    const response = await apiClient.get(
      `/invoices/source/balance-log/${balanceLogId}`,
    );
    return response.data;
  },

  createStatement: async (payload) => {
    const response = await apiClient.post('/invoices/statements', payload);
    return response.data;
  },

  voidInvoice: async (invoiceId, payload = {}) => {
    const response = await apiClient.post(`/invoices/${invoiceId}/void`, payload);
    return response.data;
  },
};
