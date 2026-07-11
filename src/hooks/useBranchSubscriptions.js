import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { branchSubscriptionsApi } from '@/api/endpoints/branchSubscriptions';
import { QUERY_KEYS } from '@/lib/constants';

export function useBranchSubscription(branchId, options = {}) {
  const {
    enabled = true,
    clinicOverrideId,
    branchOverrideId,
    platformClinicId,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.BRANCH_SUBSCRIPTIONS,
      branchId ?? '__none__',
      clinicOverrideId ?? '__active__',
      branchOverrideId ?? '__active__',
      platformClinicId ?? '__platform-active__',
    ],
    queryFn: () =>
      branchSubscriptionsApi.getByBranch(branchId, {
        clinicOverrideId,
        branchOverrideId,
        platformClinicId,
      }),
    enabled: Boolean(enabled && branchId),
    staleTime: 60 * 1000,
    ...queryOptions,
  });
}

export function useUpdateBranchSubscription() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ branchId, data, options }) =>
      branchSubscriptionsApi.updateByBranch(branchId, data, options),
    onSuccess: (_data, variables) => {
      toast.success(
        t('branchSubscriptions.toasts.updated', {
          defaultValue: 'Branch subscription updated successfully',
        }),
      );
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BRANCH_SUBSCRIPTIONS, variables?.branchId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.BRANCH_SUBSCRIPTIONS],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BRANCHES] });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          t('branchSubscriptions.toasts.updateFailed', {
            defaultValue: 'Failed to update branch subscription',
          }),
      );
    },
  });
}
