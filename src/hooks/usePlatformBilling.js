import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { platformBillingApi } from "@/api/endpoints/platformBilling";
import { QUERY_KEYS } from "@/lib/constants";

export function usePlatformBillingPreview(
  branchId,
  billingMonth,
  options = {},
) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.PLATFORM_BILLING,
      "preview",
      branchId ?? "__none__",
      billingMonth ?? "__none__",
      platformClinicId ?? "__platform-active__",
    ],
    queryFn: () =>
      platformBillingApi.preview(
        { branchId, billingMonth },
        { platformClinicId },
      ),
    enabled: Boolean(enabled && branchId && billingMonth),
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

export function usePlatformInvoices(params = {}, options = {}) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.PLATFORM_BILLING,
      "invoices",
      params,
      platformClinicId ?? "__platform-active__",
    ],
    queryFn: () =>
      platformBillingApi.listInvoices(params, { platformClinicId }),
    enabled,
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

export function usePlatformUsageEvents(params = {}, options = {}) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.PLATFORM_BILLING,
      "usage-events",
      params,
      platformClinicId ?? "__platform-active__",
    ],
    queryFn: () =>
      platformBillingApi.listUsageEvents(params, { platformClinicId }),
    enabled: Boolean(enabled && params.branchId && params.billingMonth),
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

export function usePlatformInvoice(id, options = {}) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.PLATFORM_BILLING,
      "invoice",
      id ?? "__none__",
      platformClinicId ?? "__platform-active__",
    ],
    queryFn: () => platformBillingApi.getInvoice(id, { platformClinicId }),
    enabled: Boolean(enabled && id),
    staleTime: 30 * 1000,
    ...queryOptions,
  });
}

const invalidateBilling = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PLATFORM_BILLING] });
};

export function useGeneratePlatformInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, options }) =>
      platformBillingApi.generateInvoice(data, options),
    onSuccess: () => {
      toast.success("Platform invoice generated");
      invalidateBilling(queryClient);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to generate platform invoice",
      );
    },
  });
}

export function useRefreshPlatformInvoiceArtifacts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, options }) =>
      platformBillingApi.refreshArtifacts(invoiceId, options),
    onSuccess: () => {
      toast.success("Invoice artifacts refreshed");
      invalidateBilling(queryClient);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to refresh invoice artifacts",
      );
    },
  });
}

export function useCreatePlatformAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, options }) =>
      platformBillingApi.createAdjustment(data, options),
    onSuccess: () => {
      toast.success("Adjustment recorded");
      invalidateBilling(queryClient);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to record adjustment",
      );
    },
  });
}

export function useRecordPlatformCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, data, options }) =>
      platformBillingApi.recordCollection(invoiceId, data, options),
    onSuccess: () => {
      toast.success("Collection recorded");
      invalidateBilling(queryClient);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Failed to record collection",
      );
    },
  });
}

export function useVoidPlatformInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ invoiceId, data, options }) =>
      platformBillingApi.voidInvoice(invoiceId, data, options),
    onSuccess: () => {
      toast.success("Invoice voided");
      invalidateBilling(queryClient);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || "Failed to void invoice");
    },
  });
}
