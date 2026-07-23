import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsApi } from "@/api/endpoints/sessions";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const SESSION_SLOT_CONFLICT_BACKEND_MESSAGE =
  "Cannot update session time slot. The doctor already has more than one session in this slot.";
const ASSESSMENT_DOCTOR_RESTRICTION_BACKEND_MESSAGE =
  "Selected doctor cannot be assigned to assessment or reassessment sessions.";

export function useSessions(filters = {}) {
  return useQuery({
    queryKey: ["sessions", filters],
    queryFn: () => sessionsApi.getAll(filters),
    staleTime: 60 * 1000,
  });
}

export function useSessionCategories(options = {}) {
  const { suppressPermissionToast = true, ...queryOptions } = options;

  return useQuery({
    queryKey: ["sessions", "categories"],
    queryFn: () => sessionsApi.getCategories({ suppressPermissionToast }),
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

export function useSession(sessionId, options = {}) {
  return useQuery({
    queryKey: ["sessions", sessionId],
    queryFn: () => sessionsApi.getById(sessionId),
    enabled: Boolean(sessionId),
    ...options,
  });
}

export function useSessionProfileDetails(sessionId, options = {}) {
  return useQuery({
    queryKey: ["sessions", sessionId, "profile-details"],
    queryFn: () => sessionsApi.getProfileDetails(sessionId),
    enabled: Boolean(sessionId),
    ...options,
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: sessionsApi.create,
    onSuccess: () => {
      toast.success("Session created successfully");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      const backendMessage = error.response?.data?.message;
      const message =
        backendMessage === ASSESSMENT_DOCTOR_RESTRICTION_BACKEND_MESSAGE
          ? t("validation.sessions.assessmentDoctorRestricted")
          : backendMessage || "Failed to create session";
      toast.error(message);
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ sessionId, data }) => sessionsApi.update(sessionId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session updated successfully");
    },
    onError: (error) => {
      const backendMessage = error.response?.data?.message;
      const message =
        backendMessage === SESSION_SLOT_CONFLICT_BACKEND_MESSAGE
          ? t("validation.sessions.slotConflict")
          : backendMessage === ASSESSMENT_DOCTOR_RESTRICTION_BACKEND_MESSAGE
            ? t("validation.sessions.assessmentDoctorRestricted")
            : backendMessage || "Failed to update session";
      toast.error(message);
    },
  });
}

export function useUpdateSessionProfileDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }) =>
      sessionsApi.updateProfileDetails(sessionId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Clinical details updated successfully");
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || "Failed to update clinical details";
      toast.error(message);
    },
  });
}

export function useUpdateSessionPrograms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }) =>
      sessionsApi.updatePrograms(sessionId, data),
    onSuccess: (_data, variables) => {
      const { sessionId } = variables || {};
      toast.success("Session programs updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
      }
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || "Failed to update session programs";
      toast.error(message);
    },
  });
}

export function useUpdateSessionNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }) =>
      sessionsApi.updateNotes(sessionId, data),
    onSuccess: (_data, variables) => {
      const { sessionId } = variables || {};
      toast.success("Session notes updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
      }
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || "Failed to update session notes";
      toast.error(message);
    },
  });
}

export function useUpdateSessionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, data }) =>
      sessionsApi.updateStatus(sessionId, data),
    onSuccess: (_data, variables) => {
      const { sessionId } = variables || {};
      toast.success("Session status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: ["sessions", sessionId] });
      }
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || "Failed to update session status";
      toast.error(message);
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionsApi.remove,
    onSuccess: () => {
      toast.success("Session deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || "Failed to delete session";
      toast.error(message);
    },
  });
}
