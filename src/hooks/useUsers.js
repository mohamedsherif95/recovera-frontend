import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints/users';
import { QUERY_KEYS } from '@/lib/constants';

export function useUsers(filters = {}, options = {}) {
  const { enabled = true, platformClinicId, ...queryOptions } = options;

  return useQuery({
    queryKey: [
      'users',
      filters,
      platformClinicId ?? '__platform-active__',
    ],
    queryFn: () => usersApi.getAll(filters, { platformClinicId }),
    staleTime: 60 * 1000,
    enabled,
    ...queryOptions,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, options }) => usersApi.update(id, data, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PLATFORM_ADMIN, 'clinic-groups'],
      });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => {
      if (payload?.data) {
        return usersApi.create(payload.data, payload.options);
      }

      return usersApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PLATFORM_ADMIN, 'clinic-groups'],
      });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive, options }) =>
      isActive ? usersApi.activate(id, options) : usersApi.deactivate(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PLATFORM_ADMIN, 'clinic-groups'],
      });
    },
  });
}

export function useSetUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, roleIds, options }) => usersApi.setRoles(id, roleIds, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PLATFORM_ADMIN, 'clinic-groups'],
      });
    },
  });
}

export function useSetUserShifts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, shifts, options }) => usersApi.update(id, { shifts }, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
