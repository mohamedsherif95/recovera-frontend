import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { joinRequestsApi } from "@/api/endpoints/joinRequests";
import { QUERY_KEYS } from "@/lib/constants";

const joinRequestQueryKey = (part, extra) =>
  [QUERY_KEYS.JOIN_REQUESTS, part, extra].filter(Boolean);

export function useCreateJoinRequest() {
  return useMutation({
    mutationFn: joinRequestsApi.create,
  });
}

export function usePlatformJoinRequests(params = {}, options = {}) {
  const { enabled = true, ...queryOptions } = options;

  return useQuery({
    queryKey: joinRequestQueryKey("list", params),
    queryFn: () => joinRequestsApi.list(params),
    enabled,
    staleTime: 20 * 1000,
    ...queryOptions,
  });
}

export function usePlatformJoinRequestSummary(options = {}) {
  const { enabled = true, ...queryOptions } = options;

  return useQuery({
    queryKey: joinRequestQueryKey("summary"),
    queryFn: joinRequestsApi.summary,
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: 60 * 1000,
    ...queryOptions,
  });
}

export function useMarkJoinRequestReviewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinRequestsApi.markReviewed,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.JOIN_REQUESTS],
      });
    },
  });
}

export function useMarkAllJoinRequestsReviewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: joinRequestsApi.markAllReviewed,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.JOIN_REQUESTS],
      });
    },
  });
}
