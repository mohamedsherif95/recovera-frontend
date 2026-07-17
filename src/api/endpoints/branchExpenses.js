import apiClient from '../client';

export const branchExpensesApi = {
  getCategories: async (params = {}) => {
    const response = await apiClient.get('/expense-categories', { params });
    return response.data;
  },

  createCategory: async (payload) => {
    const response = await apiClient.post('/expense-categories', payload);
    return response.data;
  },

  updateCategory: async (categoryId, payload) => {
    const response = await apiClient.patch(
      `/expense-categories/${categoryId}`,
      payload,
    );
    return response.data;
  },

  getExpenses: async (params = {}) => {
    const response = await apiClient.get('/branch-expenses', { params });
    return response.data;
  },

  getAnalysis: async (params = {}) => {
    const response = await apiClient.get('/branch-expenses/analysis', { params });
    return response.data;
  },

  createExpense: async (payload) => {
    const response = await apiClient.post('/branch-expenses', payload);
    return response.data;
  },

  updateExpense: async (expenseId, payload) => {
    const response = await apiClient.patch(`/branch-expenses/${expenseId}`, payload);
    return response.data;
  },

  voidExpense: async (expenseId, payload) => {
    const response = await apiClient.post(
      `/branch-expenses/${expenseId}/void`,
      payload,
    );
    return response.data;
  },
};
