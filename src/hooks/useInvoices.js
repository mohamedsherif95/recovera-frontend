import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invoicesApi } from '@/api/endpoints/invoices';

export function useInvoices(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.getAll(filters),
    keepPreviousData: true,
    staleTime: 60 * 1000,
    ...options,
  });
}

export function useInvoice(invoiceId, options = {}) {
  return useQuery({
    queryKey: ['invoices', invoiceId],
    queryFn: () => invoicesApi.getById(invoiceId),
    enabled: Boolean(invoiceId),
    ...options,
  });
}

export function useCreateStatementInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: invoicesApi.createStatement,
    onSuccess: () => {
      toast.success('Statement invoice created successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || 'Failed to create statement invoice';
      toast.error(message);
    },
  });
}

export function useVoidInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, data }) => invoicesApi.voidInvoice(invoiceId, data),
    onSuccess: () => {
      toast.success('Invoice voided successfully');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to void invoice';
      toast.error(message);
    },
  });
}
