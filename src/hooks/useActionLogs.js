import { useQuery } from '@tanstack/react-query';
import { actionLogsApi } from '@/api/endpoints/actionLogs';

export function useActionLogs(params = {}) {
    return useQuery({
        queryKey: ['action-logs', params],
        queryFn: () => actionLogsApi.getLogs(params),
        keepPreviousData: true,
        staleTime: 30 * 1000,
    });
}

export function useActionLog(id) {
    return useQuery({
        queryKey: ['action-logs', id],
        queryFn: () => actionLogsApi.getLog(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });
}
