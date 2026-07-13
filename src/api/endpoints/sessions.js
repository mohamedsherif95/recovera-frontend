import apiClient from '../client';
import { parseProtectedImageResponse } from '@/lib/protectedImage';

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
   * List visit images for a session
   */
  getVisitImages: async (sessionId) => {
    const response = await apiClient.get(`/sessions/${sessionId}/visit-images`);
    return response.data;
  },

  /**
   * Upload a visit image
   */
  uploadVisitImage: async (sessionId, file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post(
      `/sessions/${sessionId}/visit-images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  },

  /**
   * Load protected visit image content
   */
  getVisitImageContent: async (sessionId, imageId) => {
    const response = await apiClient.get(
      `/sessions/${sessionId}/visit-images/${imageId}/content`,
      { responseType: 'blob' },
    );
    return parseProtectedImageResponse(response);
  },

  /**
   * Delete a visit image
   */
  removeVisitImage: async (sessionId, imageId) => {
    const response = await apiClient.delete(
      `/sessions/${sessionId}/visit-images/${imageId}`,
    );
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
