import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { patientsApi } from '@/api/endpoints/patients';
import toast from 'react-hot-toast';

export function usePatients(filters = {}) {
  return useQuery({
    queryKey: ['patients', filters],
    queryFn: () => patientsApi.getAll(filters),
    staleTime: 60 * 1000,
  });
}

export function useCompanyPatientSearch(filters = {}, options = {}) {
  return useQuery({
    queryKey: ['patients', 'company-search', filters],
    queryFn: () => patientsApi.searchCompany(filters),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function usePatient(patientId, options = {}) {
  return useQuery({
    queryKey: ['patients', patientId],
    queryFn: () => patientsApi.getById(patientId),
    enabled: Boolean(patientId),
    ...options,
  });
}

export function usePatientSessions(patientId, options = {}) {
  return useQuery({
    queryKey: ['patients', patientId, 'sessions'],
    queryFn: () => patientsApi.getSessions(patientId),
    enabled: Boolean(patientId),
    ...options,
  });
}

export function usePatientSessionsInfinite(patientId, pageSize = 10) {
  return useInfiniteQuery({
    queryKey: ['patients', patientId, 'sessions', 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      patientsApi.getSessions(patientId, { page: pageParam, limit: pageSize }),
    enabled: Boolean(patientId),
    getNextPageParam: (lastPage) => {
      const { meta } = lastPage;
      if (meta && meta.page < meta.totalPages) {
        return meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function usePatientBalanceLogs(patientId, filters = {}, options = {}) {
  return useQuery({
    queryKey: ['patients', patientId, 'balance-logs', filters],
    queryFn: () => patientsApi.getBalanceLogs(patientId, filters),
    enabled: Boolean(patientId),
    keepPreviousData: true,
    ...options,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      toast.success('Patient created successfully');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to create patient';
      toast.error(message);
    },
  });
}

export function useAttachPatientToCurrentBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patientsApi.attachToCurrentBranch,
    onSuccess: (patient) => {
      toast.success('Patient added to this branch');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      if (patient?.id) {
        queryClient.invalidateQueries({ queryKey: ['patients', patient.id] });
      }
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || 'Failed to add patient to this branch';
      toast.error(message);
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, data }) => patientsApi.update(patientId, data),
    onSuccess: (_data, variables) => {
      const { patientId } = variables || {};
      toast.success('Patient updated successfully');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update patient';
      toast.error(message);
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patientsApi.remove,
    onSuccess: () => {
      toast.success('Patient deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to delete patient';
      toast.error(message);
    },
  });
}

export function useUpdatePatientHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, data }) => patientsApi.updateHistory(patientId, data),
    onSuccess: (_data, variables) => {
      const { patientId } = variables || {};
      toast.success('Medical history updated successfully');
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update medical history';
      toast.error(message);
    },
  });
}

export function useUpdatePatientPrograms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, data }) => patientsApi.updatePrograms(patientId, data),
    onSuccess: (_data, variables) => {
      const { patientId } = variables || {};
      toast.success('Programs updated successfully');
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update programs';
      toast.error(message);
    },
  });
}

export function useAddPatientBalance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patientId, data }) => patientsApi.addBalance(patientId, data),
    onSuccess: (_data, variables) => {
      const { patientId } = variables || {};
      toast.success('Balance added successfully');
      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to add balance';
      toast.error(message);
    },
  });
}

export function useCreatePackageTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, data }) =>
      patientsApi.createPackageTransaction(patientId, data),
    onSuccess: (_data, variables) => {
      const { patientId } = variables || {};
      toast.success('Package transaction saved successfully');
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      if (patientId) {
        queryClient.invalidateQueries({ queryKey: ['patients', patientId] });
        queryClient.invalidateQueries({
          queryKey: ['patients', patientId, 'balance-logs'],
        });
      }
    },
    onError: (error) => {
      const message =
        error.response?.data?.message || 'Failed to save package transaction';
      toast.error(message);
    },
  });
}
