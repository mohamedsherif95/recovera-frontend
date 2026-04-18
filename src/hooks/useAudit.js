import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/api/endpoints/audit';

export function useAuditLogs({ page = 1, limit = 10 } = {}) {
  return useQuery({
    queryKey: ['audit', 'logs', { page, limit }],
    queryFn: () => auditApi.getLogs({ page, limit }),
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });
}
