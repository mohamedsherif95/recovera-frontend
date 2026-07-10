import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { branchesApi } from '@/api/endpoints/branches';
import { QUERY_KEYS } from '@/lib/constants';

export function useBranches(optionsOrEnabled = true) {
  const options =
    typeof optionsOrEnabled === 'boolean'
      ? { enabled: optionsOrEnabled }
      : optionsOrEnabled || {};
  const {
    enabled = true,
    clinicOverrideId,
    branchOverrideId,
    platformClinicId,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey: [
      QUERY_KEYS.BRANCHES,
      clinicOverrideId ?? '__active__',
      branchOverrideId ?? '__active__',
      platformClinicId ?? '__platform-active__',
    ],
    queryFn: () =>
      branchesApi.getAll({
        clinicOverrideId,
        branchOverrideId,
        platformClinicId,
      }),
    enabled,
    staleTime: 60 * 1000,
    ...queryOptions,
  });
}

export function useBranchCredits(params = {}, enabled = true, options = {}) {
  return useQuery({
    queryKey: [
      QUERY_KEYS.BRANCHES,
      'credits',
      params,
      options.platformClinicId ?? '__platform-active__',
    ],
    queryFn: () => branchesApi.getCredits(params, options),
    enabled,
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) =>
      variables?.data !== undefined
        ? branchesApi.create(variables.data, variables.options)
        : branchesApi.create(variables),
    onSuccess: () => {
      toast.success('Branch created successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BRANCHES] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to create branch');
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, options }) => branchesApi.update(id, data, options),
    onSuccess: () => {
      toast.success('Branch updated successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BRANCHES] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Failed to update branch');
    },
  });
}

export function useReconcileBranchCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, options }) =>
      branchesApi.reconcileCredit(id, data, options),
    onSuccess: () => {
      toast.success('Branch credit reconciled successfully');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BRANCHES, 'credits'] });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || 'Failed to reconcile branch credit',
      );
    },
  });
}
