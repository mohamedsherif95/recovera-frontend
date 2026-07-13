import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionsApi } from "@/api/endpoints/sessions";
import { patientsApi } from "@/api/endpoints/patients";

export function useProtectedVisitImage(sessionId, imageId, options = {}) {
  const query = useQuery({
    queryKey: ["sessions", sessionId, "visit-images", imageId, "content"],
    queryFn: () => sessionsApi.getVisitImageContent(sessionId, imageId),
    enabled: Boolean(sessionId && imageId),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!query.data) {
      setObjectUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(query.data);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [query.data]);

  return { ...query, objectUrl };
}

export function useProtectedPatientVisitImage(patientId, imageId, options = {}) {
  const query = useQuery({
    queryKey: ["patients", patientId, "visit-images", imageId, "content"],
    queryFn: () => patientsApi.getVisitImageContent(patientId, imageId),
    enabled: Boolean(patientId && imageId),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
  const [objectUrl, setObjectUrl] = useState("");

  useEffect(() => {
    if (!query.data) {
      setObjectUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(query.data);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [query.data]);

  return { ...query, objectUrl };
}
