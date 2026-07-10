import { useQuery } from '@tanstack/react-query';
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
