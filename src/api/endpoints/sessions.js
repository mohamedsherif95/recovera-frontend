import apiClient from '../client';

export const sessionsApi = {
  /**
   * List sessions (doctors see only their own)
   */
  getAll: async (params = {}) => {
    const response = await apiClient.get('/sessions', { params });
    return response.data;
  },

  /**
   * Get session by ID
   */
  getById: async (sessionId) => {
    const response = await apiClient.get(`/sessions/${sessionId}`);
    return response.data;
  },

  /**
   * Get profile-specific clinical details for a session
   */
  getProfileDetails: async (sessionId) => {
    const response = await apiClient.get(`/sessions/${sessionId}/profile-details`);
    return response.data;
  },

  /**
   * Create session
   */
  create: async (payload) => {
    const response = await apiClient.post('/sessions', payload);
    return response.data;
  },

  /**
   * Update session core details
   */
  update: async (sessionId, payload) => {
    const response = await apiClient.put(`/sessions/${sessionId}`, payload);
    return response.data;
  },

  /**
   * Update profile-specific clinical details for a session
   */
  updateProfileDetails: async (sessionId, payload) => {
    const response = await apiClient.put(`/sessions/${sessionId}/profile-details`, payload);
    return response.data;
  },

  /**
   * Update session status
   */
  updateStatus: async (sessionId, payload) => {
    const response = await apiClient.put(`/sessions/${sessionId}/status`, payload);
    return response.data;
  },

  /**
   * Update session programs
   */
  updatePrograms: async (sessionId, payload) => {
    const response = await apiClient.put(`/sessions/${sessionId}/programs`, payload);
    return response.data;
  },

  /**
   * Update session notes
   */
  updateNotes: async (sessionId, payload) => {
    const response = await apiClient.put(`/sessions/${sessionId}/notes`, payload);
    return response.data;
  },

  /**
   * Delete session
   */
  remove: async (sessionId) => {
    const response = await apiClient.delete(`/sessions/${sessionId}`);
    return response.data;
  },
  /**
   * List session categories
   */
  getCategories: async () => {
    const response = await apiClient.get('/sessions/categories');
    return response.data;
  },
};
