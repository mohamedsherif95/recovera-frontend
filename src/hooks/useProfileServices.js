import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { profileServicesApi } from '@/api/endpoints/profileServices';
import { QUERY_KEYS } from '@/lib/constants';

export function useProfileServiceCatalog(params = {}, options = {}) {
  const {
    enabled = true,
    suppressPermissionToast = true,
    clinicOverrideId,
    branchOverrideId,
    platformClinicId,
    ...queryOptions
  } = options;
  const requestOptions = {
    suppressPermissionToast,
    clinicOverrideId,
    branchOverrideId,
    platformClinicId,
  };

  return useQuery({
    queryKey: [QUERY_KEYS.PROFILE_SERVICES, 'catalog', params, requestOptions],
    queryFn: () =>
      profileServicesApi.getCatalog(params, requestOptions),
    enabled,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

export function useBranchProfileSettings(params = {}, options = {}) {
  const {
    enabled = true,
    suppressPermissionToast = true,
    clinicOverrideId,
    branchOverrideId,
    platformClinicId,
    ...queryOptions
  } = options;
  const requestOptions = {
    suppressPermissionToast,
    clinicOverrideId,
    branchOverrideId,
    platformClinicId,
  };

  return useQuery({
    queryKey: [
      QUERY_KEYS.PROFILE_SERVICES,
      'branch-settings',
      params,
      requestOptions,
    ],
    queryFn: () =>
      profileServicesApi.getBranchProfileSettings(params, requestOptions),
    enabled,
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

export function useUpdateBranchProfileSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ profile, data, options }) =>
      profileServicesApi.updateBranchProfileSetting(profile, data, options),
    onSuccess: () => {
      toast.success('Branch profile settings updated successfully');
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PROFILE_SERVICES],
      });
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message ||
          'Failed to update branch profile settings',
      );
    },
  });
}
