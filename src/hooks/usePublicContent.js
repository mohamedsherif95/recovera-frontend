import { useQuery } from "@tanstack/react-query";
import { publicContentApi } from "@/api/endpoints/publicContent";
import { QUERY_KEYS } from "@/lib/constants";

export function usePublicLandingBanner(options = {}) {
  const { enabled = true, ...queryOptions } = options;

  return useQuery({
    queryKey: [QUERY_KEYS.PUBLIC_CONTENT, "landing-banner"],
    queryFn: publicContentApi.getLandingBanner,
    enabled,
    staleTime: 60 * 1000,
    retry: 1,
    ...queryOptions,
  });
}
