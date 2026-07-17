import apiClient from "../client";
import { parseProtectedImageResponse } from "@/lib/protectedImage";
import { buildRequestControlConfig } from "../scopeConfig";

export const patientsApi = {
  /**
   * List patients with optional query params
   */
  getAll: async (params = {}, options = {}) => {
    const response = await apiClient.get("/patients", {
      ...buildRequestControlConfig(options),
      params,
    });
    return response.data;
  },

  /**
   * Search company-level patients that can be attached to the active branch.
   */
  searchCompany: async (params = {}) => {
    const response = await apiClient.get("/patients/company-search", {
      params,
    });
    return response.data;
  },

  /**
   * Get patient by ID
   */
  getById: async (patientId) => {
    const response = await apiClient.get(`/patients/${patientId}`);
    return response.data;
  },

  /**
   * Create patient
   */
  create: async (payload) => {
    const response = await apiClient.post("/patients", payload);
    return response.data;
  },

  /**
   * Attach an existing company patient to the active branch.
   */
  attachToCurrentBranch: async (patientId) => {
    const response = await apiClient.post(
      `/patients/${patientId}/branch-relationships/current`,
    );
    return response.data;
  },

  /**
   * Deactivate a patient relationship to the active branch.
   */
  deactivateBranchRelationship: async (patientId, relationshipId) => {
    const response = await apiClient.delete(
      `/patients/${patientId}/branch-relationships/${relationshipId}`,
    );
    return response.data;
  },

  /**
   * Update patient
   */
  update: async (patientId, payload) => {
    const response = await apiClient.put(`/patients/${patientId}`, payload);
    return response.data;
  },

  /**
   * Delete patient
   */
  remove: async (patientId) => {
    const response = await apiClient.delete(`/patients/${patientId}`);
    return response.data;
  },

  /**
   * Get patient's sessions history
   */
  getSessions: async (patientId, params = {}) => {
    const response = await apiClient.get(`/patients/${patientId}/sessions`, {
      params,
    });
    return response.data;
  },

  /**
   * Get protected visit image metadata for this patient
   */
  getVisitImages: async (patientId, params = {}) => {
    const response = await apiClient.get(`/patients/${patientId}/visit-images`, {
      params,
    });
    return response.data;
  },

  /**
   * Load protected patient visit image content.
   */
  getVisitImageContent: async (patientId, imageId) => {
    const response = await apiClient.get(
      `/patients/${patientId}/visit-images/${imageId}/content`,
      { responseType: "blob" },
    );
    return parseProtectedImageResponse(response);
  },

  /**
   * Update patient's medical history
   */
  updateHistory: async (patientId, payload) => {
    const response = await apiClient.put(
      `/patients/${patientId}/history`,
      payload,
    );
    return response.data;
  },

  /**
   * Get patient's programs
   */
  getPrograms: async (patientId) => {
    const response = await apiClient.get(`/patients/${patientId}/programs`);
    return response.data;
  },

  /**
   * Update patient's programs
   */
  updatePrograms: async (patientId, payload) => {
    const response = await apiClient.put(
      `/patients/${patientId}/programs`,
      payload,
    );
    return response.data;
  },

  /**
   * Update branch/profile-specific patient record details.
   */
  updateProfileRecord: async (patientId, profile, payload) => {
    const response = await apiClient.put(
      `/patients/${patientId}/profile-records/${profile}`,
      payload,
    );
    return response.data;
  },
  /**
   * Add balance log entry for patient
   */
  addBalance: async (patientId, payload) => {
    const response = await apiClient.post(
      `/patients/${patientId}/balance`,
      payload,
    );
    return response.data;
  },

  /**
   * List patient balance logs/notes
   */
  getBalanceLogs: async (patientId, params = {}) => {
    const response = await apiClient.get(
      `/patients/${patientId}/balance-logs`,
      {
        params,
      },
    );
    return response.data;
  },

  /**
   * Create package transaction (balance and/or remaining amount adjustment)
   */
  createPackageTransaction: async (patientId, payload) => {
    const response = await apiClient.post(
      `/patients/${patientId}/package-transaction`,
      payload,
    );
    return response.data;
  },
};
