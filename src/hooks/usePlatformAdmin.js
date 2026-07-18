import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformAdminApi } from '@/api/endpoints/platformAdmin';
import { QUERY_KEYS } from '@/lib/constants';

export function usePlatformAdminOverview(options = {}) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.PLATFORM_ADMIN,
      'overview',
      platformClinicId ?? '__all__',
    ],
    queryFn: () => platformAdminApi.getOverview({ platformClinicId }),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 3 * 60 * 1000,
    ...queryOptions,
  });
}

export function usePlatformClinicGroups(options = {}) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.PLATFORM_ADMIN,
      'clinic-groups',
      platformClinicId ?? '__all__',
    ],
    queryFn: () => platformAdminApi.getClinicGroups({ platformClinicId }),
    enabled,
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

export function usePlatformAdminAuditEvents(params = {}, options = {}) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.PLATFORM_ADMIN,
      'audit',
      platformClinicId ?? '__all__',
      params,
    ],
    queryFn: () =>
      platformAdminApi.getAuditEvents(params, {
        platformClinicId,
      }),
    enabled,
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

export function usePlatformLandingBanner(options = {}) {
  const { enabled = true, ...queryOptions } = options;

  return useQuery({
    queryKey: [QUERY_KEYS.PLATFORM_ADMIN, 'landing-banner'],
    queryFn: platformAdminApi.getLandingBanner,
    enabled,
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

export function useUpdatePlatformLandingBanner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: platformAdminApi.updateLandingBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PLATFORM_ADMIN, 'landing-banner'],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PUBLIC_CONTENT, 'landing-banner'],
      });
    },
  });
}
