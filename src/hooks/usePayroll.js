import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { payrollApi } from '@/api/endpoints/payroll';

export const PAYROLL_QUERY_KEY = 'payroll';

const showMutationError = (error, fallbackMessage) => {
  toast.error(error?.response?.data?.message || fallbackMessage);
};

export function useSalarySettings(params = {}, options = {}) {
  return useQuery({
    queryKey: [PAYROLL_QUERY_KEY, 'salary-settings', params],
    queryFn: () => payrollApi.getSalarySettings(params),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function usePayrollPeriods(params = {}, options = {}) {
  return useQuery({
    queryKey: [PAYROLL_QUERY_KEY, 'periods', params],
    queryFn: () => payrollApi.getPeriods(params),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function usePayrollPeriod(periodId, options = {}) {
  return useQuery({
    queryKey: [PAYROLL_QUERY_KEY, 'period', periodId],
    queryFn: () => payrollApi.getPeriod(periodId),
    enabled: Boolean(periodId),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useUpsertSalarySetting() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ userId, data }) =>
      payrollApi.upsertSalarySetting(userId, data),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.salarySaved', {
          defaultValue: 'Default salary saved',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.salarySaveFailed', {
          defaultValue: 'Failed to save default salary',
        }),
      ),
  });
}

export function useEnsurePayrollPeriod() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (data) => payrollApi.ensurePeriod(data),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.periodReady', {
          defaultValue: 'Payroll draft is ready',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.periodReadyFailed', {
          defaultValue: 'Failed to prepare payroll draft',
        }),
      ),
  });
}

export function useRefreshPayrollDefaults() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (periodId) => payrollApi.refreshDefaults(periodId),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.defaultsRefreshed', {
          defaultValue: 'Payroll defaults refreshed',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.defaultsRefreshFailed', {
          defaultValue: 'Failed to refresh payroll defaults',
        }),
      ),
  });
}

export function useUpdatePayrollLine() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, lineId, data }) =>
      payrollApi.updateLine(periodId, lineId, data),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.lineSaved', {
          defaultValue: 'Payroll line saved',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.lineSaveFailed', {
          defaultValue: 'Failed to save payroll line',
        }),
      ),
  });
}

export function useCreatePayrollAdjustment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, lineId, data }) =>
      payrollApi.createAdjustment(periodId, lineId, data),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.adjustmentSaved', {
          defaultValue: 'Adjustment saved',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.adjustmentSaveFailed', {
          defaultValue: 'Failed to save adjustment',
        }),
      ),
  });
}

export function useUpdatePayrollAdjustment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, lineId, adjustmentId, data }) =>
      payrollApi.updateAdjustment(periodId, lineId, adjustmentId, data),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.adjustmentSaved', {
          defaultValue: 'Adjustment saved',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.adjustmentSaveFailed', {
          defaultValue: 'Failed to save adjustment',
        }),
      ),
  });
}

export function useDeletePayrollAdjustment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, lineId, adjustmentId }) =>
      payrollApi.deleteAdjustment(periodId, lineId, adjustmentId),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.adjustmentDeleted', {
          defaultValue: 'Adjustment removed',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.adjustmentDeleteFailed', {
          defaultValue: 'Failed to remove adjustment',
        }),
      ),
  });
}

export function useClosePayrollPeriod() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, data }) => payrollApi.closePeriod(periodId, data),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.periodClosed', {
          defaultValue: 'Payroll month closed',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.periodCloseFailed', {
          defaultValue: 'Failed to close payroll month',
        }),
      ),
  });
}

export function useRecordPayrollExpense() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ periodId, data }) => payrollApi.recordExpense(periodId, data),
    onSuccess: () => {
      toast.success(
        t('payroll.toasts.expenseRecorded', {
          defaultValue: 'Salaries expense recorded',
        }),
      );
      queryClient.invalidateQueries({ queryKey: [PAYROLL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['branchExpenses'] });
    },
    onError: (error) =>
      showMutationError(
        error,
        t('payroll.toasts.expenseRecordFailed', {
          defaultValue: 'Failed to record salaries expense',
        }),
      ),
  });
}
