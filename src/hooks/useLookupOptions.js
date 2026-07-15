import { useMemo, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { patientsApi } from '@/api/endpoints/patients';
import { usersApi } from '@/api/endpoints/users';
import { sessionsApi } from '@/api/endpoints/sessions';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { resolveEffectiveBranchId } from '@/lib/branchScope';

const DEFAULT_PAGE_SIZE = 25;

function extractDataList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function extractMeta(payload) {
  return payload?.meta;
}

function usePaginatedLookup({
  queryKey,
  fetchPage,
  toOption,
  enabled = true,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const query = useInfiniteQuery({
    queryKey: [...queryKey, { search: debouncedSearch, pageSize }],
    queryFn: ({ pageParam = 1 }) =>
      fetchPage({
        page: pageParam,
        limit: pageSize,
        search: debouncedSearch || undefined,
      }),
    getNextPageParam: (lastPage) => {
      const meta = extractMeta(lastPage);
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    enabled,
  });

  const records = useMemo(() => {
    if (!query.data?.pages) return [];
    return query.data.pages.flatMap((page) => extractDataList(page));
  }, [query.data?.pages]);

  const options = useMemo(() => {
    const unique = new Map();
    records.forEach((record) => {
      const option = toOption(record);
      if (!option || !option.value) return;
      if (!unique.has(option.value)) {
        unique.set(option.value, option);
      }
    });
    return Array.from(unique.values());
  }, [records, toOption]);

  return {
    search,
    setSearch,
    options,
    records,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function usePatientLookupOptions({
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
  scope,
} = {}) {
  return usePaginatedLookup({
    queryKey: ['lookup', 'patients', { scope: scope || 'branch' }],
    enabled,
    pageSize,
    fetchPage: (params) =>
      patientsApi.getAll({
        ...params,
        scope,
      }),
    toOption: (patient) => ({
      value: String(patient.id),
      label: patient.fullName || patient.patientCode || `#${patient.id}`,
      raw: patient,
    }),
  });
}

export function useDoctorLookupOptions({
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
} = {}) {
  const user = useAuthStore((state) => state.user);
  const branchOverrideId = useUIStore((state) => state.branchOverrideId);
  const effectiveBranchId = resolveEffectiveBranchId(user, branchOverrideId);

  return usePaginatedLookup({
    queryKey: ['lookup', 'users', 'doctors', { branchId: effectiveBranchId }],
    enabled,
    pageSize,
    fetchPage: (params) =>
      usersApi.getDoctorLookup({
        ...params,
        branchId: effectiveBranchId || undefined,
      }),
    toOption: (user) => ({
      value: String(user.id),
      label: user.fullName || user.username || `#${user.id}`,
      raw: user,
    }),
  });
}

export function useSessionLookupOptions({
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
} = {}) {
  return usePaginatedLookup({
    queryKey: ['lookup', 'sessions'],
    enabled,
    pageSize,
    fetchPage: (params) => sessionsApi.getAll(params),
    toOption: (session) => ({
      value: String(session.id),
      label: `${session.patient?.fullName || 'Unknown patient'} - ${session.sessionDate || ''}`,
      raw: session,
    }),
  });
}
