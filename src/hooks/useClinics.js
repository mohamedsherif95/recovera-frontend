import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clinicsApi } from '@/api/endpoints/clinics';
import { QUERY_KEYS } from '@/lib/constants';

export function useClinics(enabled = true) {
  return useQuery({
    queryKey: [QUERY_KEYS.CLINICS],
    queryFn: clinicsApi.getAll,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clinicsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLINICS] });
    },
  });
}

export function useUpdateClinic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => clinicsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.CLINICS] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
