import apiClient from "../client";

const JOIN_REQUEST_FIELDS = [
  "name",
  "phone",
  "whatsappNumber",
  "email",
  "clinicType",
];

const toJoinRequestPayload = (payload = {}) =>
  JOIN_REQUEST_FIELDS.reduce((cleanPayload, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      cleanPayload[field] = payload[field];
    }

    return cleanPayload;
  }, {});

export const joinRequestsApi = {
  create: async (payload) => {
    const response = await apiClient.post(
      "/public/join-requests",
      toJoinRequestPayload(payload),
      { suppressErrorToast: true },
    );
    return response.data;
  },

  list: async (params = {}) => {
    const response = await apiClient.get("/platform/admin/join-requests", {
      params,
    });
    return response.data;
  },

  summary: async () => {
    const response = await apiClient.get(
      "/platform/admin/join-requests/summary",
      { suppressErrorToast: true },
    );
    return response.data;
  },

  markReviewed: async (id) => {
    const response = await apiClient.patch(
      `/platform/admin/join-requests/${id}/review`,
    );
    return response.data;
  },

  markAllReviewed: async () => {
    const response = await apiClient.patch(
      "/platform/admin/join-requests/review-all",
    );
    return response.data;
  },
};
