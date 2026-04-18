import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/endpoints/reports';

export function useDashboard(options = {}) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.getDashboard,
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
    staleTime: 20000,
    ...options,
  });
}

export function usePatientsReport(options = {}) {
  return useQuery({
    queryKey: ['reports', 'patients'],
    queryFn: reportsApi.getPatients,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useDailyOperations(params, options = {}) {
  return useQuery({
    queryKey: ['reports', 'daily-operations', params],
    queryFn: () => reportsApi.getDailyOperations(params),
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
    ...options,
  });
}
