import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/api/endpoints/payments';
import toast from 'react-hot-toast';

export function usePayments(filters = {}) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsApi.getAll(filters),
    staleTime: 60 * 1000,
  });
}

export function useSessionPayments(sessionId, options = {}) {
  return useQuery({
    queryKey: ['payments', 'session', sessionId],
    queryFn: () => paymentsApi.getBySession(sessionId),
    enabled: Boolean(sessionId),
    ...options,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      toast.success('Payment created successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create payment';
      toast.error(message);
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId }) => paymentsApi.remove(paymentId),
    onSuccess: (_data, variables) => {
      toast.success('Payment deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      if (variables?.sessionId) {
        queryClient.invalidateQueries({ queryKey: ['payments', 'session', variables.sessionId] });
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete payment';
      toast.error(message);
    },
  });
}
