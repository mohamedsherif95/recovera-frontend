import axios from "axios";
import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import toast from "react-hot-toast";
import {
  canOverrideBranchScope,
  canOverrideClinicScope,
} from "@/lib/branchScope";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: API_TIMEOUT_MS,
});

const isApiEnvelope = (payload) => {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.status === "number" &&
    typeof payload.message === "string" &&
    Object.prototype.hasOwnProperty.call(payload, "data")
  );
};

const createEnvelopeError = (response, status, message, data) => {
  const error = new Error(message || "Request failed");
  error.config = response.config;
  error.response = {
    ...response,
    status,
    data: {
      status,
      message: message || "Request failed",
      data: data ?? null,
    },
  };

  return error;
};

const extractEnvelopeData = (payload) => {
  if (!isApiEnvelope(payload)) {
    return payload;
  }

  if (payload.status >= 400) {
    throw new Error(payload.message || "Request failed");
  }

  return payload.data;
};

const shouldSuppressToast = (config, flag) =>
  Boolean(config?.suppressErrorToast || config?.[flag]);

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const { user } = useAuthStore.getState();
    const { clinicOverrideId, branchOverrideId } = useUIStore.getState();
    const canOverrideClinic = canOverrideClinicScope(user);
    const canOverrideBranch = canOverrideBranchScope(user);
    const hasExplicitClinicOverride = Object.prototype.hasOwnProperty.call(
      config,
      "clinicOverrideId",
    );
    const hasExplicitBranchOverride = Object.prototype.hasOwnProperty.call(
      config,
      "branchOverrideId",
    );
    const resolvedClinicOverrideId = hasExplicitClinicOverride
      ? config.clinicOverrideId
      : clinicOverrideId;
    const resolvedBranchOverrideId = hasExplicitBranchOverride
      ? config.branchOverrideId
      : branchOverrideId;

    if (canOverrideClinic && resolvedClinicOverrideId) {
      config.headers["X-Clinic-Override"] = String(resolvedClinicOverrideId);
    } else if (config.headers["X-Clinic-Override"]) {
      delete config.headers["X-Clinic-Override"];
    }

    const canSendBranchOverride =
      canOverrideBranch &&
      (!canOverrideClinic || Boolean(resolvedClinicOverrideId));
    if (canSendBranchOverride && resolvedBranchOverrideId) {
      config.headers["X-Branch-Override"] = String(resolvedBranchOverrideId);
    } else if (config.headers["X-Branch-Override"]) {
      delete config.headers["X-Branch-Override"];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

const handleApiError = async (error) => {
  const originalRequest = error.config;
  const status = error.response?.status;

  if (status === 401 && originalRequest && !originalRequest._retry) {
    if (originalRequest.url && originalRequest.url.includes("/auth/login")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken) {
      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {
            refreshToken,
          },
        );
        const refreshPayload = extractEnvelopeData(refreshResponse.data);
        const accessToken = refreshPayload?.accessToken;

        if (!accessToken) {
          throw new Error("Refresh response missing access token");
        }

        useAuthStore.getState().setToken(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    useAuthStore.getState().logout();
    window.location.href = "/login";
  }

  if (
    status === 403 &&
    !shouldSuppressToast(originalRequest, "suppressPermissionToast")
  ) {
    toast.error("You do not have permission to perform this action");
  }

  if (
    status === 404 &&
    !shouldSuppressToast(originalRequest, "suppressNotFoundToast")
  ) {
    toast.error("Resource not found");
  }

  return Promise.reject(error);
};

apiClient.interceptors.response.use(async (response) => {
  if (!isApiEnvelope(response.data)) {
    return response;
  }

  const { status, message, data } = response.data;
  if (status >= 400) {
    return handleApiError(createEnvelopeError(response, status, message, data));
  }

  response.data = data;
  return response;
}, handleApiError);

export default apiClient;
