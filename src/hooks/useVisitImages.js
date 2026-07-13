import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { sessionsApi } from "@/api/endpoints/sessions";
import { patientsApi } from "@/api/endpoints/patients";
import toast from "react-hot-toast";

const imageQueryKey = (sessionId) => ["sessions", sessionId, "visit-images"];
const patientImageQueryKey = (patientId) => [
  "patients",
  patientId,
  "visit-images",
];

export function useSessionVisitImages(sessionId, options = {}) {
  return useQuery({
    queryKey: imageQueryKey(sessionId),
    queryFn: () => sessionsApi.getVisitImages(sessionId),
    enabled: Boolean(sessionId),
    ...options,
  });
}

export function useUploadVisitImage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ sessionId, file }) =>
      sessionsApi.uploadVisitImage(sessionId, file),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: imageQueryKey(variables.sessionId),
      });
      if (variables.patientId) {
        queryClient.invalidateQueries({
          queryKey: patientImageQueryKey(variables.patientId),
        });
        queryClient.removeQueries({
          queryKey: [
            "patients",
            variables.patientId,
            "visit-images",
            variables.imageId,
            "content",
          ],
        });
      }
    },
    onError: (error) => {
      toast.error(
        error.response?.data?.message || t("visitImages.saveFailed"),
      );
    },
  });
}

export function useRemoveVisitImage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: ({ sessionId, imageId }) =>
      sessionsApi.removeVisitImage(sessionId, imageId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: imageQueryKey(variables.sessionId),
      });
      queryClient.removeQueries({
        queryKey: [
          "sessions",
          variables.sessionId,
          "visit-images",
          variables.imageId,
          "content",
        ],
      });
      if (variables.patientId) {
        queryClient.invalidateQueries({
          queryKey: patientImageQueryKey(variables.patientId),
        });
      }
      toast.success(t("visitImages.removeSuccess"));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t("visitImages.removeFailed"));
    },
  });
}

export function usePatientVisitImages(patientId, page = 1, options = {}) {
  return useQuery({
    queryKey: [...patientImageQueryKey(patientId), page],
    queryFn: () => patientsApi.getVisitImages(patientId, { page, limit: 12 }),
    enabled: Boolean(patientId),
    placeholderData: (previousData) => previousData,
    ...options,
  });
}
