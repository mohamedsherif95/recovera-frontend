import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BadgeDollarSign,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useClosePayrollPeriod,
  useCreatePayrollAdjustment,
  useDeletePayrollAdjustment,
  useEnsurePayrollPeriod,
  usePayrollPeriod,
  usePayrollPeriods,
  useRecordPayrollExpense,
  useRefreshPayrollDefaults,
  useSalarySettings,
  useUpdatePayrollAdjustment,
  useUpdatePayrollLine,
  useUpsertSalarySetting,
} from '@/hooks/usePayroll';
import {
  getClinicCurrentMonthInput,
  getClinicTodayDateOnly,
} from '@/lib/time';
import {
  cn,
  formatCurrency,
  formatDate,
  formatWesternNumber,
} from '@/lib/utils';

const PAYROLL_STATUS = {
  DRAFT: 'draft',
  CLOSED: 'closed',
  EXPENSE_RECORDED: 'expense_recorded',
};

const LINE_STATUS = {
  INCLUDED: 'included',
  EXCLUDED: 'excluded',
};

const ADJUSTMENT_TYPE = {
  ADDITION: 'addition',
  DEDUCTION: 'deduction',
};

const emptyLineForm = {
  defaultSalarySnapshot: '',
  status: LINE_STATUS.INCLUDED,
  exclusionReason: '',
  notes: '',
};

const emptyAdjustmentForm = {
  id: null,
  type: ADJUSTMENT_TYPE.ADDITION,
  label: '',
  amount: '',
  notes: '',
};

function normalizePaginatedData(payload) {
  return {
    rows: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta || {},
  };
}

function toMonthDate(monthInput) {
  return `${monthInput || getClinicCurrentMonthInput()}-01`;
}

function getMonthEndDateOnly(monthInput) {
  const [year, month] = String(monthInput || getClinicCurrentMonthInput())
    .split('-')
    .map(Number);
  const end = new Date(Date.UTC(year, month, 0));
  return `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}-${String(end.getUTCDate()).padStart(2, '0')}`;
}

function formatMonthLabel(month) {
  if (!month) return '';
  const parsed = new Date(`${month.slice(0, 7)}-01T00:00:00Z`);
  return new Intl.DateTimeFormat('en-US-u-nu-latn', {
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
    timeZone: 'UTC',
  }).format(parsed);
}

function getRoleLabel(roleName, t) {
  if (!roleName) return '';
  return t(`roles.${roleName}`, {
    defaultValue: String(roleName).replace(/_/g, ' '),
  });
}

function getStatusLabel(status, t) {
  const labels = {
    [PAYROLL_STATUS.DRAFT]: t('payroll.status.draft', {
      defaultValue: 'Draft',
    }),
    [PAYROLL_STATUS.CLOSED]: t('payroll.status.closed', {
      defaultValue: 'Closed',
    }),
    [PAYROLL_STATUS.EXPENSE_RECORDED]: t('payroll.status.expenseRecorded', {
      defaultValue: 'Expense recorded',
    }),
    [LINE_STATUS.INCLUDED]: t('payroll.lineStatus.included', {
      defaultValue: 'Included',
    }),
    [LINE_STATUS.EXCLUDED]: t('payroll.lineStatus.excluded', {
      defaultValue: 'Excluded',
    }),
  };
  return labels[status] || status || '--';
}

function PayrollStatusBadge({ status, t }) {
  const tone =
    status === PAYROLL_STATUS.EXPENSE_RECORDED
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
      : status === PAYROLL_STATUS.CLOSED
        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';

  return (
    <Badge variant="secondary" className={cn('border-transparent', tone)}>
      {getStatusLabel(status, t)}
    </Badge>
  );
}

function LineStatusBadge({ status, t }) {
  const isExcluded = status === LINE_STATUS.EXCLUDED;
  return (
    <Badge
      variant={isExcluded ? 'outline' : 'secondary'}
      className={cn(
        isExcluded
          ? 'border-slate-300 text-muted-foreground'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      )}
    >
      {getStatusLabel(status, t)}
    </Badge>
  );
}

function AdjustmentBadge({ adjustment, t }) {
  const isDeduction = adjustment.type === ADJUSTMENT_TYPE.DEDUCTION;
  return (
    <Badge
      variant="outline"
      className={cn(
        'max-w-full gap-1',
        isDeduction
          ? 'border-rose-200 text-rose-700 dark:border-rose-900/70 dark:text-rose-300'
          : 'border-emerald-200 text-emerald-700 dark:border-emerald-900/70 dark:text-emerald-300',
      )}
    >
      <span className="truncate">{adjustment.label}</span>
      <span className="shrink-0">
        {isDeduction ? '-' : '+'}
        {formatCurrency(adjustment.amount)}
      </span>
      <span className="sr-only">
        {isDeduction
          ? t('payroll.adjustments.deduction', { defaultValue: 'Deduction' })
          : t('payroll.adjustments.addition', { defaultValue: 'Addition' })}
      </span>
    </Badge>
  );
}

function SalaryDefaultsPanel({
  rows,
  drafts,
  isLoading,
  isSaving,
  onChange,
  onSave,
  search,
  setSearch,
  t,
  canManageSalarySettings,
}) {
  const columns = [
    {
      key: 'employee',
      header: t('payroll.employee', { defaultValue: 'Employee' }),
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{row.user.fullName}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {(row.user.roles || []).map((role) => (
              <Badge key={role.id || role.name} variant="outline">
                {getRoleLabel(role.name, t)}
              </Badge>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: 'defaultSalary',
      header: t('payroll.defaultSalary', { defaultValue: 'Default salary' }),
      cellClassName: 'min-w-[160px]',
      cell: (row) => {
        const draft = drafts[row.user.id] || {};
        return canManageSalarySettings ? (
          <Input
            aria-label={t('payroll.defaultSalaryFor', {
              defaultValue: 'Default salary for {{name}}',
              name: row.user.fullName,
            })}
            min="0"
            type="number"
            value={draft.defaultSalary ?? ''}
            onChange={(event) =>
              onChange(row.user.id, 'defaultSalary', event.target.value)
            }
          />
        ) : (
          <span className="font-medium">
            {row.currentDefaultSalary == null
              ? '--'
              : formatCurrency(row.currentDefaultSalary)}
          </span>
        );
      },
    },
    {
      key: 'eligible',
      header: t('payroll.eligible', { defaultValue: 'Eligible' }),
      cell: (row) => {
        const draft = drafts[row.user.id] || {};
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`salary-eligible-${row.user.id}`}
              checked={draft.isPayrollEligible !== false}
              disabled={!canManageSalarySettings}
              onCheckedChange={(checked) =>
                onChange(row.user.id, 'isPayrollEligible', checked === true)
              }
            />
            <Label
              htmlFor={`salary-eligible-${row.user.id}`}
              className="text-xs text-muted-foreground"
            >
              {draft.isPayrollEligible === false
                ? t('payroll.notEligible', { defaultValue: 'No' })
                : t('common.yes', { defaultValue: 'Yes' })}
            </Label>
          </div>
        );
      },
    },
    {
      key: 'effectiveFromMonth',
      header: t('payroll.effectiveMonth', {
        defaultValue: 'Effective month',
      }),
      cell: (row) => row.setting?.effectiveFromMonth?.slice(0, 7) || '--',
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cellClassName: 'text-right',
      cell: (row) =>
        canManageSalarySettings ? (
          <Button
            size="sm"
            onClick={() => onSave(row)}
            disabled={isSaving(row.user.id)}
          >
            {isSaving(row.user.id) ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        ) : null,
    },
  ];

  return (
    <section className="rounded-md border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">
            {t('payroll.salaryDefaults.title', {
              defaultValue: 'Default salaries',
            })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('payroll.salaryDefaults.description', {
              defaultValue:
                'Set each employee salary once, then use it to prepare monthly payroll drafts.',
            })}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('payroll.searchStaff', {
              defaultValue: 'Search staff',
            })}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : rows.length ? (
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.user.id}
          mobileCard={(row) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{row.user.fullName}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(row.user.roles || []).map((role) => (
                      <Badge key={role.id || role.name} variant="outline">
                        {getRoleLabel(role.name, t)}
                      </Badge>
                    ))}
                  </div>
                </div>
                {row.currentDefaultSalary != null && (
                  <Badge variant="secondary">
                    {formatCurrency(row.currentDefaultSalary)}
                  </Badge>
                )}
              </div>
              {canManageSalarySettings && (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    min="0"
                    type="number"
                    value={drafts[row.user.id]?.defaultSalary ?? ''}
                    onChange={(event) =>
                      onChange(row.user.id, 'defaultSalary', event.target.value)
                    }
                  />
                  <Button
                    onClick={() => onSave(row)}
                    disabled={isSaving(row.user.id)}
                  >
                    {isSaving(row.user.id) ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {t('common.save', { defaultValue: 'Save' })}
                  </Button>
                </div>
              )}
            </div>
          )}
        />
      ) : (
        <div className="p-6 text-sm text-muted-foreground">
          {t('payroll.salaryDefaults.empty', {
            defaultValue: 'No active staff were found for this branch.',
          })}
        </div>
      )}
    </section>
  );
}

function PayrollLineDrawer({
  open,
  onOpenChange,
  line,
  form,
  adjustmentForm,
  isSavingLine,
  isSavingAdjustment,
  isDeletingAdjustment,
  onFormChange,
  onAdjustmentFormChange,
  onSaveLine,
  onSaveAdjustment,
  onEditAdjustment,
  onDeleteAdjustment,
  onResetAdjustment,
  t,
  canManageMonth,
}) {
  const isExcluded = form.status === LINE_STATUS.EXCLUDED;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle>
            {line?.employeeNameSnapshot ||
              t('payroll.editLine', { defaultValue: 'Edit payroll line' })}
          </SheetTitle>
          <SheetDescription>
            {t('payroll.editLineDescription', {
              defaultValue:
                'Adjust the salary snapshot, inclusion status, and month-specific additions or deductions.',
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="flex flex-wrap gap-2">
            <LineStatusBadge status={line?.status} t={t} />
            {line?.roleSnapshot && (
              <Badge variant="outline">{line.roleSnapshot}</Badge>
            )}
            {line?.defaultSalarySnapshot == null &&
              line?.status === LINE_STATUS.INCLUDED && (
                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {t('payroll.missingDefaultSalary', {
                    defaultValue: 'Missing salary',
                  })}
                </Badge>
              )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payroll-line-salary">
                {t('payroll.salarySnapshot', {
                  defaultValue: 'Salary snapshot',
                })}
              </Label>
              <Input
                id="payroll-line-salary"
                min="0"
                type="number"
                value={form.defaultSalarySnapshot}
                disabled={!canManageMonth}
                onChange={(event) =>
                  onFormChange('defaultSalarySnapshot', event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payroll-line-status">
                {t('payroll.lineStatus.title', { defaultValue: 'Line status' })}
              </Label>
              <Select
                value={form.status}
                disabled={!canManageMonth}
                onValueChange={(value) => onFormChange('status', value)}
              >
                <SelectTrigger id="payroll-line-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LINE_STATUS.INCLUDED}>
                    {getStatusLabel(LINE_STATUS.INCLUDED, t)}
                  </SelectItem>
                  <SelectItem value={LINE_STATUS.EXCLUDED}>
                    {getStatusLabel(LINE_STATUS.EXCLUDED, t)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isExcluded && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="payroll-line-exclusion">
                  {t('payroll.exclusionReason', {
                    defaultValue: 'Exclusion reason',
                  })}
                </Label>
                <Textarea
                  id="payroll-line-exclusion"
                  value={form.exclusionReason}
                  disabled={!canManageMonth}
                  onChange={(event) =>
                    onFormChange('exclusionReason', event.target.value)
                  }
                />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="payroll-line-notes">
                {t('payroll.notes', { defaultValue: 'Notes' })}
              </Label>
              <Textarea
                id="payroll-line-notes"
                value={form.notes}
                disabled={!canManageMonth}
                onChange={(event) => onFormChange('notes', event.target.value)}
              />
            </div>
          </div>

          <section className="rounded-md border">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">
                  {t('payroll.adjustments.title', {
                    defaultValue: 'Additions and deductions',
                  })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t('payroll.adjustments.description', {
                    defaultValue:
                      'Use month-specific adjustments for bonuses, penalties, or corrections.',
                  })}
                </p>
              </div>
              {adjustmentForm.id && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onResetAdjustment}
                >
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Button>
              )}
            </div>

            <div className="space-y-4 p-4">
              <div className="flex flex-wrap gap-2">
                {(line?.adjustments || []).length ? (
                  line.adjustments.map((adjustment) => (
                    <span
                      key={adjustment.id}
                      className="inline-flex max-w-full items-center gap-1"
                    >
                      <AdjustmentBadge adjustment={adjustment} t={t} />
                      {canManageMonth && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEditAdjustment(adjustment)}
                            aria-label={t('payroll.adjustments.edit', {
                              defaultValue: 'Edit adjustment',
                            })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            disabled={isDeletingAdjustment}
                            onClick={() => onDeleteAdjustment(adjustment)}
                            aria-label={t('payroll.adjustments.delete', {
                              defaultValue: 'Delete adjustment',
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('payroll.adjustments.empty', {
                      defaultValue: 'No adjustments for this employee.',
                    })}
                  </span>
                )}
              </div>

              {canManageMonth && (
                <div className="grid gap-3 sm:grid-cols-[120px_1fr_130px_auto]">
                  <Select
                    value={adjustmentForm.type}
                    onValueChange={(value) =>
                      onAdjustmentFormChange('type', value)
                    }
                  >
                    <SelectTrigger aria-label={t('payroll.adjustments.type', {
                      defaultValue: 'Adjustment type',
                    })}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ADJUSTMENT_TYPE.ADDITION}>
                        {t('payroll.adjustments.addition', {
                          defaultValue: 'Addition',
                        })}
                      </SelectItem>
                      <SelectItem value={ADJUSTMENT_TYPE.DEDUCTION}>
                        {t('payroll.adjustments.deduction', {
                          defaultValue: 'Deduction',
                        })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={adjustmentForm.label}
                    onChange={(event) =>
                      onAdjustmentFormChange('label', event.target.value)
                    }
                    placeholder={t('payroll.adjustments.labelPlaceholder', {
                      defaultValue: 'Label',
                    })}
                  />
                  <Input
                    min="1"
                    type="number"
                    value={adjustmentForm.amount}
                    onChange={(event) =>
                      onAdjustmentFormChange('amount', event.target.value)
                    }
                    placeholder={t('payroll.amount', {
                      defaultValue: 'Amount',
                    })}
                  />
                  <Button
                    type="button"
                    onClick={onSaveAdjustment}
                    disabled={isSavingAdjustment}
                  >
                    {isSavingAdjustment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : adjustmentForm.id ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    {adjustmentForm.id
                      ? t('common.save', { defaultValue: 'Save' })
                      : t('common.add', { defaultValue: 'Add' })}
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>

        <SheetFooter className="border-t bg-background px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          {canManageMonth && (
            <Button onClick={onSaveLine} disabled={isSavingLine}>
              {isSavingLine && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.save', { defaultValue: 'Save' })}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function PayrollPage() {
  const { t, i18n } = useTranslation();
  const { can } = usePermissions();
  const [selectedMonth, setSelectedMonth] = useState(getClinicCurrentMonthInput());
  const [salarySearch, setSalarySearch] = useState('');
  const [salaryDrafts, setSalaryDrafts] = useState({});
  const [activeLine, setActiveLine] = useState(null);
  const [lineForm, setLineForm] = useState(emptyLineForm);
  const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
  const [confirmAction, setConfirmAction] = useState(null);
  const monthDate = toMonthDate(selectedMonth);
  const isRtl = i18n.language === 'ar';

  const canManageSalarySettings = can('payroll:manageSalarySettings');
  const canManageMonth = can('payroll:manageMonth');
  const canClose = can('payroll:close');
  const canRecordExpense = can('payroll:recordExpense');

  const salarySettingsQuery = useSalarySettings({
    month: monthDate,
    search: salarySearch,
    page: 1,
    limit: 100,
  });
  const payrollPeriodsQuery = usePayrollPeriods({
    month: monthDate,
    page: 1,
    limit: 1,
  });
  const periodSummary = normalizePaginatedData(payrollPeriodsQuery.data).rows[0];
  const payrollPeriodQuery = usePayrollPeriod(periodSummary?.id, {
    enabled: Boolean(periodSummary?.id),
  });
  const period = payrollPeriodQuery.data || periodSummary || null;
  const salaryRows = normalizePaginatedData(salarySettingsQuery.data).rows;
  const lines = useMemo(() => period?.lines || [], [period?.lines]);
  const isDraft = period?.status === PAYROLL_STATUS.DRAFT;
  const isClosed = period?.status === PAYROLL_STATUS.CLOSED;
  const isExpenseRecorded = period?.status === PAYROLL_STATUS.EXPENSE_RECORDED;
  const missingSalaryLines = lines.filter(
    (line) =>
      line.status === LINE_STATUS.INCLUDED &&
      line.defaultSalarySnapshot == null,
  );
  const upsertSalarySettingMutation = useUpsertSalarySetting();
  const ensurePeriodMutation = useEnsurePayrollPeriod();
  const refreshDefaultsMutation = useRefreshPayrollDefaults();
  const updateLineMutation = useUpdatePayrollLine();
  const createAdjustmentMutation = useCreatePayrollAdjustment();
  const updateAdjustmentMutation = useUpdatePayrollAdjustment();
  const deleteAdjustmentMutation = useDeletePayrollAdjustment();
  const closePeriodMutation = useClosePayrollPeriod();
  const recordExpenseMutation = useRecordPayrollExpense();

  useEffect(() => {
    setSalaryDrafts({});
    setActiveLine(null);
  }, [selectedMonth]);

  useEffect(() => {
    setSalaryDrafts((current) => {
      const next = { ...current };
      for (const row of salaryRows) {
        if (next[row.user.id]) continue;
        next[row.user.id] = {
          defaultSalary:
            row.currentDefaultSalary == null
              ? ''
              : String(row.currentDefaultSalary),
          isPayrollEligible: row.isPayrollEligible !== false,
          notes: row.setting?.notes || '',
        };
      }
      return next;
    });
  }, [salaryRows]);

  useEffect(() => {
    if (!activeLine) return;
    const freshLine = lines.find((line) => line.id === activeLine.id);
    if (freshLine) {
      setActiveLine(freshLine);
    }
  }, [activeLine, lines]);

  const periodActions = useMemo(() => {
    if (!period) {
      return [
        <Button
          key="ensure"
          onClick={() => ensurePeriodMutation.mutate({ month: monthDate })}
          disabled={!canManageMonth || ensurePeriodMutation.isPending}
        >
          {ensurePeriodMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {t('payroll.actions.prepareDraft', {
            defaultValue: 'Prepare payroll draft',
          })}
        </Button>,
      ];
    }

    const actions = [];
    if (isDraft && canManageMonth) {
      actions.push(
        <Button
          key="refresh"
          variant="outline"
          onClick={() => setConfirmAction('refresh')}
          disabled={refreshDefaultsMutation.isPending}
        >
          <RefreshCcw className="h-4 w-4" />
          {t('payroll.actions.refreshDefaults', {
            defaultValue: 'Refresh defaults',
          })}
        </Button>,
      );
    }
    if (isDraft && canClose) {
      actions.push(
        <Button
          key="close"
          onClick={() => setConfirmAction('close')}
          disabled={closePeriodMutation.isPending || missingSalaryLines.length > 0}
        >
          <ShieldCheck className="h-4 w-4" />
          {t('payroll.actions.closeMonth', {
            defaultValue: 'Close month',
          })}
        </Button>,
      );
    }
    if (isClosed && canRecordExpense) {
      actions.push(
        <Button
          key="record-expense"
          onClick={() => setConfirmAction('recordExpense')}
          disabled={recordExpenseMutation.isPending}
        >
          <WalletCards className="h-4 w-4" />
          {t('payroll.actions.recordExpense', {
            defaultValue: 'Record salaries expense',
          })}
        </Button>,
      );
    }
    if (isExpenseRecorded) {
      actions.push(
        <Badge
          key="recorded"
          className="justify-center bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t('payroll.expenseRecorded', {
            defaultValue: 'Expense recorded',
          })}
        </Badge>,
      );
    }
    return actions;
  }, [
    canClose,
    canManageMonth,
    canRecordExpense,
    closePeriodMutation.isPending,
    ensurePeriodMutation,
    isClosed,
    isDraft,
    isExpenseRecorded,
    missingSalaryLines.length,
    monthDate,
    period,
    recordExpenseMutation.isPending,
    refreshDefaultsMutation.isPending,
    t,
  ]);

  const updateSalaryDraft = (userId, field, value) => {
    setSalaryDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || {}),
        [field]: value,
      },
    }));
  };

  const saveSalarySetting = (row) => {
    const draft = salaryDrafts[row.user.id] || {};
    upsertSalarySettingMutation.mutate({
      userId: row.user.id,
      data: {
        defaultSalary: Number(draft.defaultSalary || 0),
        currency: 'EGP',
        effectiveFromMonth: monthDate,
        isPayrollEligible: draft.isPayrollEligible !== false,
        notes: draft.notes || null,
      },
    });
  };

  const openLineDrawer = (line) => {
    setActiveLine(line);
    setLineForm({
      defaultSalarySnapshot:
        line.defaultSalarySnapshot == null
          ? ''
          : String(line.defaultSalarySnapshot),
      status: line.status,
      exclusionReason: line.exclusionReason || '',
      notes: line.notes || '',
    });
    setAdjustmentForm(emptyAdjustmentForm);
  };

  const closeLineDrawer = () => {
    setActiveLine(null);
    setLineForm(emptyLineForm);
    setAdjustmentForm(emptyAdjustmentForm);
  };

  const saveLine = () => {
    if (!period || !activeLine) return;
    updateLineMutation.mutate({
      periodId: period.id,
      lineId: activeLine.id,
      data: {
        defaultSalarySnapshot:
          lineForm.defaultSalarySnapshot === ''
            ? null
            : Number(lineForm.defaultSalarySnapshot),
        status: lineForm.status,
        exclusionReason: lineForm.exclusionReason || null,
        notes: lineForm.notes || null,
      },
    });
  };

  const saveAdjustment = () => {
    if (!period || !activeLine) return;
    const payload = {
      type: adjustmentForm.type,
      label: adjustmentForm.label.trim(),
      amount: Number(adjustmentForm.amount || 0),
      notes: adjustmentForm.notes || null,
    };

    if (adjustmentForm.id) {
      updateAdjustmentMutation.mutate(
        {
          periodId: period.id,
          lineId: activeLine.id,
          adjustmentId: adjustmentForm.id,
          data: payload,
        },
        { onSuccess: () => setAdjustmentForm(emptyAdjustmentForm) },
      );
      return;
    }

    createAdjustmentMutation.mutate(
      {
        periodId: period.id,
        lineId: activeLine.id,
        data: payload,
      },
      { onSuccess: () => setAdjustmentForm(emptyAdjustmentForm) },
    );
  };

  const editAdjustment = (adjustment) => {
    setAdjustmentForm({
      id: adjustment.id,
      type: adjustment.type,
      label: adjustment.label,
      amount: String(adjustment.amount),
      notes: adjustment.notes || '',
    });
  };

  const deleteAdjustment = (adjustment) => {
    if (!period || !activeLine) return;
    deleteAdjustmentMutation.mutate({
      periodId: period.id,
      lineId: activeLine.id,
      adjustmentId: adjustment.id,
    });
  };

  const lineColumns = [
    {
      key: 'employee',
      header: t('payroll.employee', { defaultValue: 'Employee' }),
      cell: (line) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{line.employeeNameSnapshot}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <LineStatusBadge status={line.status} t={t} />
            {line.roleSnapshot && (
              <Badge variant="outline">{line.roleSnapshot}</Badge>
            )}
            {line.defaultSalarySnapshot == null &&
              line.status === LINE_STATUS.INCLUDED && (
                <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  {t('payroll.missingDefaultSalary', {
                    defaultValue: 'Missing salary',
                  })}
                </Badge>
              )}
          </div>
        </div>
      ),
    },
    {
      key: 'defaultSalarySnapshot',
      header: t('payroll.baseSalary', { defaultValue: 'Base salary' }),
      cellClassName: 'text-right font-medium',
      className: 'text-right',
      cell: (line) =>
        line.defaultSalarySnapshot == null
          ? '--'
          : formatCurrency(line.defaultSalarySnapshot),
    },
    {
      key: 'adjustments',
      header: t('payroll.adjustments.shortTitle', {
        defaultValue: 'Adjustments',
      }),
      cell: (line) => (
        <div className="flex max-w-sm flex-wrap gap-1">
          {(line.adjustments || []).length ? (
            line.adjustments.map((adjustment) => (
              <AdjustmentBadge
                key={adjustment.id}
                adjustment={adjustment}
                t={t}
              />
            ))
          ) : (
            <span className="text-muted-foreground">--</span>
          )}
        </div>
      ),
    },
    {
      key: 'netSalary',
      header: t('payroll.netSalary', { defaultValue: 'Net salary' }),
      cellClassName: 'text-right font-semibold',
      className: 'text-right',
      cell: (line) => formatCurrency(line.netSalary),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      cellClassName: 'text-right',
      cell: (line) => (
        <Button size="sm" variant="outline" onClick={() => openLineDrawer(line)}>
          <Pencil className="h-4 w-4" />
          {t('common.edit', { defaultValue: 'Edit' })}
        </Button>
      ),
    },
  ];

  const confirmConfig = {
    refresh: {
      title: t('payroll.confirm.refreshTitle', {
        defaultValue: 'Refresh payroll defaults?',
      }),
      description: t('payroll.confirm.refreshDescription', {
        defaultValue:
          'This rebuilds the draft from current default salaries and removes draft-only line edits and adjustments.',
      }),
      confirmText: t('payroll.actions.refreshDefaults', {
        defaultValue: 'Refresh defaults',
      }),
      variant: 'destructive',
      isLoading: refreshDefaultsMutation.isPending,
      onConfirm: () => {
        refreshDefaultsMutation.mutate(period.id, {
          onSuccess: () => setConfirmAction(null),
        });
      },
    },
    close: {
      title: t('payroll.confirm.closeTitle', {
        defaultValue: 'Close payroll month?',
      }),
      description: t('payroll.confirm.closeDescription', {
        defaultValue:
          'Closed payroll cannot be edited. You can then record one salaries expense for the month.',
      }),
      confirmText: t('payroll.actions.closeMonth', {
        defaultValue: 'Close month',
      }),
      variant: 'default',
      isLoading: closePeriodMutation.isPending,
      onConfirm: () => {
        closePeriodMutation.mutate(
          {
            periodId: period.id,
            data: {
              reason: `Closed from payroll page on ${getClinicTodayDateOnly()}`,
            },
          },
          { onSuccess: () => setConfirmAction(null) },
        );
      },
    },
    recordExpense: {
      title: t('payroll.confirm.recordExpenseTitle', {
        defaultValue: 'Record salaries expense?',
      }),
      description: t('payroll.confirm.recordExpenseDescription', {
        amount: formatCurrency(period?.netSalaryTotal || 0),
        defaultValue:
          'This creates one expense record for {{amount}} in the Salaries category.',
      }),
      confirmText: t('payroll.actions.recordExpense', {
        defaultValue: 'Record salaries expense',
      }),
      variant: 'default',
      isLoading: recordExpenseMutation.isPending,
      onConfirm: () => {
        recordExpenseMutation.mutate(
          {
            periodId: period.id,
            data: {
              occurredOn: getMonthEndDateOnly(selectedMonth),
              paymentMethod: 'payroll',
            },
          },
          { onSuccess: () => setConfirmAction(null) },
        );
      },
    },
  }[confirmAction];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('payroll.title', { defaultValue: 'Payroll' })}
        description={t('payroll.description', {
          defaultValue:
            'Manage staff salaries month by month and post closed payroll as one salaries expense.',
        })}
        actions={
          <>
            <div className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 sm:w-auto">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <Input
                aria-label={t('payroll.month', { defaultValue: 'Month' })}
                className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
              />
            </div>
            {periodActions}
          </>
        }
      />

      <ImpactPanel
        icon={BadgeDollarSign}
        title={formatMonthLabel(monthDate)}
        description={t('payroll.monthOverviewDescription', {
          defaultValue:
            'Review salary defaults, prepare the draft, close the month, then record the salaries expense.',
        })}
        tone={
          missingSalaryLines.length > 0
            ? 'warning'
            : isExpenseRecorded
              ? 'commercial'
              : 'neutral'
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ImpactMetric
            label={t('payroll.status.title', { defaultValue: 'Status' })}
            value={
              period ? <PayrollStatusBadge status={period.status} t={t} /> : '--'
            }
          />
          <ImpactMetric
            label={t('payroll.includedStaff', {
              defaultValue: 'Included staff',
            })}
            value={formatWesternNumber(period?.lineCount || 0)}
          />
          <ImpactMetric
            label={t('payroll.grossSalaryTotal', {
              defaultValue: 'Gross salary',
            })}
            value={formatCurrency(period?.grossSalaryTotal || 0)}
          />
          <ImpactMetric
            label={t('payroll.deductionsTotal', {
              defaultValue: 'Deductions',
            })}
            value={formatCurrency(period?.deductionsTotal || 0)}
          />
          <ImpactMetric
            label={t('payroll.netSalaryTotal', {
              defaultValue: 'Net salary',
            })}
            value={formatCurrency(period?.netSalaryTotal || 0)}
          />
        </div>
      </ImpactPanel>

      {missingSalaryLines.length > 0 && (
        <ImpactPanel
          tone="warning"
          icon={Banknote}
          title={t('payroll.missingSalaryNoticeTitle', {
            defaultValue: 'Set missing salaries before closing',
          })}
          description={t('payroll.missingSalaryNoticeDescription', {
            count: formatWesternNumber(missingSalaryLines.length),
            defaultValue:
              '{{count}} included employee(s) are missing a salary snapshot.',
          })}
        >
          <div className="flex flex-wrap gap-2">
            {missingSalaryLines.slice(0, 8).map((line) => (
              <Badge key={line.id} variant="outline">
                {line.employeeNameSnapshot}
              </Badge>
            ))}
          </div>
        </ImpactPanel>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
        <SalaryDefaultsPanel
          rows={salaryRows}
          drafts={salaryDrafts}
          isLoading={salarySettingsQuery.isLoading}
          isSaving={(userId) =>
            upsertSalarySettingMutation.isPending &&
            upsertSalarySettingMutation.variables?.userId === userId
          }
          onChange={updateSalaryDraft}
          onSave={saveSalarySetting}
          search={salarySearch}
          setSearch={setSalarySearch}
          t={t}
          canManageSalarySettings={canManageSalarySettings}
        />

        <section className="rounded-md border bg-card">
          <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold">
                  {t('payroll.monthDraft.title', {
                    defaultValue: 'Monthly payroll',
                  })}
                </h2>
                {period && <PayrollStatusBadge status={period.status} t={t} />}
                {period?.branchExpenseId && (
                  <Badge variant="outline">
                    {t('payroll.expenseId', {
                      id: period.branchExpenseId,
                      defaultValue: 'Expense #{{id}}',
                    })}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {period
                  ? t('payroll.monthDraft.description', {
                      defaultValue:
                        'This snapshot is locked when the month is closed.',
                    })
                  : t('payroll.monthDraft.emptyDescription', {
                      defaultValue:
                        'Prepare a draft to snapshot active staff and salary defaults for this month.',
                    })}
              </p>
            </div>
            {!period && (
              <Button
                onClick={() => ensurePeriodMutation.mutate({ month: monthDate })}
                disabled={!canManageMonth || ensurePeriodMutation.isPending}
              >
                {ensurePeriodMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t('payroll.actions.prepareDraft', {
                  defaultValue: 'Prepare payroll draft',
                })}
              </Button>
            )}
          </div>

          {payrollPeriodsQuery.isLoading || payrollPeriodQuery.isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : period ? (
            <>
              <div className="grid gap-3 border-b p-4 sm:grid-cols-4">
                <div className="rounded-md border bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t('payroll.additionsTotal', {
                      defaultValue: 'Additions',
                    })}
                  </div>
                  <div className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(period.additionsTotal || 0)}
                  </div>
                </div>
                <div className="rounded-md border bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t('payroll.deductionsTotal', {
                      defaultValue: 'Deductions',
                    })}
                  </div>
                  <div className="mt-1 font-semibold text-rose-700 dark:text-rose-300">
                    {formatCurrency(period.deductionsTotal || 0)}
                  </div>
                </div>
                <div className="rounded-md border bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t('payroll.netSalaryTotal', {
                      defaultValue: 'Net salary',
                    })}
                  </div>
                  <div className="mt-1 font-semibold">
                    {formatCurrency(period.netSalaryTotal || 0)}
                  </div>
                </div>
                <div className="rounded-md border bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">
                    {t('payroll.closedAt', { defaultValue: 'Closed at' })}
                  </div>
                  <div className="mt-1 font-semibold">
                    {period.closedAt ? formatDate(period.closedAt) : '--'}
                  </div>
                </div>
              </div>

              {lines.length ? (
                <DataTable
                  columns={lineColumns}
                  data={lines}
                  direction={isRtl ? 'rtl' : 'ltr'}
                  mobileCard={(line) => (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">
                            {line.employeeNameSnapshot}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <LineStatusBadge status={line.status} t={t} />
                            {line.roleSnapshot && (
                              <Badge variant="outline">
                                {line.roleSnapshot}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {formatCurrency(line.netSalary)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(line.adjustments || []).map((adjustment) => (
                          <AdjustmentBadge
                            key={adjustment.id}
                            adjustment={adjustment}
                            t={t}
                          />
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openLineDrawer(line)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t('common.edit', { defaultValue: 'Edit' })}
                      </Button>
                    </div>
                  )}
                />
              ) : (
                <div className="p-6 text-sm text-muted-foreground">
                  {t('payroll.monthDraft.emptyLines', {
                    defaultValue:
                      'No active staff were captured for this payroll month.',
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
              <WalletCards className="h-10 w-10 text-muted-foreground" />
              <div className="max-w-sm">
                <h3 className="text-sm font-semibold">
                  {t('payroll.monthDraft.noDraftTitle', {
                    defaultValue: 'No payroll draft yet',
                  })}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('payroll.monthDraft.noDraftDescription', {
                    defaultValue:
                      'Prepare the month after reviewing default salaries.',
                  })}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <PayrollLineDrawer
        open={Boolean(activeLine)}
        onOpenChange={(open) => {
          if (!open) closeLineDrawer();
        }}
        line={activeLine}
        form={lineForm}
        adjustmentForm={adjustmentForm}
        isSavingLine={updateLineMutation.isPending}
        isSavingAdjustment={
          createAdjustmentMutation.isPending ||
          updateAdjustmentMutation.isPending
        }
        isDeletingAdjustment={deleteAdjustmentMutation.isPending}
        onFormChange={(field, value) =>
          setLineForm((current) => ({ ...current, [field]: value }))
        }
        onAdjustmentFormChange={(field, value) =>
          setAdjustmentForm((current) => ({ ...current, [field]: value }))
        }
        onSaveLine={saveLine}
        onSaveAdjustment={saveAdjustment}
        onEditAdjustment={editAdjustment}
        onDeleteAdjustment={deleteAdjustment}
        onResetAdjustment={() => setAdjustmentForm(emptyAdjustmentForm)}
        t={t}
        canManageMonth={isDraft && canManageMonth}
      />

      <ConfirmDialog
        open={Boolean(confirmConfig)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={confirmConfig?.title}
        description={confirmConfig?.description}
        confirmText={confirmConfig?.confirmText}
        variant={confirmConfig?.variant}
        isLoading={confirmConfig?.isLoading}
        onConfirm={confirmConfig?.onConfirm}
      />
    </div>
  );
}
