import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  CircleSlash,
  FolderCog,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Tags,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import DateRangePicker from '@/components/common/DateRangePicker';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { branchExpensesApi } from '@/api/endpoints/branchExpenses';
import { PAYMENT_METHODS, PERMISSIONS, QUERY_KEYS } from '@/lib/constants';
import { cn, formatCurrency, formatDate, formatWesternNumber } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import {
  dateOnlyToDate,
  getClinicMonthEndDateOnly,
  getClinicMonthStartDateOnly,
  getClinicTodayDateOnly,
} from '@/lib/time';

const ALL_VALUE = 'all';
const POSTED_STATUS = 'posted';
const VOIDED_STATUS = 'voided';

const emptyExpenseForm = {
  categoryId: '',
  occurredOn: '',
  amount: '',
  paymentMethod: PAYMENT_METHODS.CASH,
  payee: '',
  referenceNumber: '',
  notes: '',
};

const emptyCategoryForm = {
  name: '',
  code: '',
  sortOrder: '',
};

function toDateOnlyString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizePaginatedData(payload) {
  return {
    rows: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload?.meta || {},
  };
}

function getPaymentMethodLabel(method, t) {
  if (!method) return '--';
  return t(`paymentMethods.${method}`, {
    defaultValue: String(method).replace(/_/g, ' '),
  });
}

function ExpenseStatusBadge({ status, t }) {
  const isVoided = status === VOIDED_STATUS;
  return (
    <Badge
      variant={isVoided ? 'outline' : 'secondary'}
      className={cn(
        isVoided
          ? 'border-destructive/30 text-destructive'
          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      )}
    >
      {isVoided
        ? t('branchExpenses.status.voided', { defaultValue: 'Voided' })
        : t('branchExpenses.status.posted', { defaultValue: 'Posted' })}
    </Badge>
  );
}

function GeneratedExpenseBadge({ sourceType, t }) {
  if (!sourceType) return null;
  return (
    <Badge
      variant="outline"
      className="border-sky-200 text-sky-700 dark:border-sky-900/70 dark:text-sky-300"
    >
      {sourceType === 'payroll'
        ? t('branchExpenses.generatedPayroll', {
            defaultValue: 'Payroll',
          })
        : t('branchExpenses.generatedExpense', {
            defaultValue: 'Generated',
          })}
    </Badge>
  );
}

function isGeneratedExpense(expense) {
  return Boolean(expense?.sourceType || expense?.sourceId);
}

function ExpenseForm({
  categories,
  form,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
  paymentMethodOptions,
  t,
}) {
  const activeCategories = categories.filter((category) => category.isActive);
  const categoryOptions = activeCategories.map((category) => ({
    value: String(category.id),
    label: category.name,
  }));

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="expense-category">
              {t('branchExpenses.category', { defaultValue: 'Category' })}
            </Label>
            <SearchableSelect
              options={categoryOptions}
              value={form.categoryId}
              onChange={(value) => onChange('categoryId', value)}
              placeholder={t('branchExpenses.selectCategory', {
                defaultValue: 'Select category',
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-date">
              {t('branchExpenses.occurredOn', { defaultValue: 'Date' })}
            </Label>
            <Input
              id="expense-date"
              type="date"
              value={form.occurredOn}
              onChange={(event) => onChange('occurredOn', event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-amount">
              {t('branchExpenses.amount', { defaultValue: 'Amount' })}
            </Label>
            <Input
              id="expense-amount"
              type="number"
              min="1"
              value={form.amount}
              onChange={(event) => onChange('amount', event.target.value)}
              disabled={isEditing}
              required={!isEditing}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                {t('branchExpenses.amountLocked', {
                  defaultValue:
                    'Amount is locked after creation. Void and recreate the expense to correct it.',
                })}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-payment-method">
              {t('branchExpenses.paymentMethod', {
                defaultValue: 'Payment method',
              })}
            </Label>
            <SearchableSelect
              options={paymentMethodOptions}
              value={form.paymentMethod}
              onChange={(value) => onChange('paymentMethod', value)}
              placeholder={t('branchExpenses.selectPaymentMethod', {
                defaultValue: 'Select payment method',
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-payee">
              {t('branchExpenses.payee', { defaultValue: 'Payee' })}
            </Label>
            <Input
              id="expense-payee"
              value={form.payee}
              onChange={(event) => onChange('payee', event.target.value)}
              placeholder={t('branchExpenses.payeePlaceholder', {
                defaultValue: 'Vendor or recipient',
              })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="expense-reference">
              {t('branchExpenses.referenceNumber', {
                defaultValue: 'Reference number',
              })}
            </Label>
            <Input
              id="expense-reference"
              value={form.referenceNumber}
              onChange={(event) => onChange('referenceNumber', event.target.value)}
              placeholder={t('branchExpenses.referencePlaceholder', {
                defaultValue: 'Receipt, transfer, or invoice reference',
              })}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="expense-notes">
              {t('branchExpenses.notes', { defaultValue: 'Notes' })}
            </Label>
            <Textarea
              id="expense-notes"
              value={form.notes}
              onChange={(event) => onChange('notes', event.target.value)}
              placeholder={t('branchExpenses.notesPlaceholder', {
                defaultValue: 'Optional context for accounting review',
              })}
            />
          </div>
        </div>
      </div>

      <SheetFooter className="border-t bg-background px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing
            ? t('common.save', { defaultValue: 'Save' })
            : t('branchExpenses.recordExpense', {
                defaultValue: 'Record expense',
              })}
        </Button>
      </SheetFooter>
    </form>
  );
}

export default function BranchExpensesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const isRtl = i18n.language === 'ar';
  const canCreate = can(PERMISSIONS['expenses:create']);
  const canUpdate = can(PERMISSIONS['expenses:update']);
  const canVoid = can(PERMISSIONS['expenses:void']);
  const canManageCategories = can(PERMISSIONS['expenses:manageCategories']);
  const canViewAnalysis = can(PERMISSIONS['expenses:viewAnalysis']);
  const currentMonthStart = getClinicMonthStartDateOnly();
  const currentMonthEnd = getClinicMonthEndDateOnly();

  const [fromDate, setFromDate] = useState(() => dateOnlyToDate(currentMonthStart));
  const [toDate, setToDate] = useState(() => dateOnlyToDate(currentMonthEnd));
  const [status, setStatus] = useState(ALL_VALUE);
  const [categoryId, setCategoryId] = useState(ALL_VALUE);
  const [paymentMethod, setPaymentMethod] = useState(ALL_VALUE);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [expenseDrawerOpen, setExpenseDrawerOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(() => ({
    ...emptyExpenseForm,
    occurredOn: getClinicTodayDateOnly(),
  }));
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [voidExpense, setVoidExpense] = useState(null);
  const [voidReason, setVoidReason] = useState('');

  const requestParams = useMemo(
    () => ({
      from: fromDate ? toDateOnlyString(fromDate) : undefined,
      to: toDate ? toDateOnlyString(toDate) : undefined,
      status: status !== ALL_VALUE ? status : undefined,
      categoryId: categoryId !== ALL_VALUE ? Number(categoryId) : undefined,
      paymentMethod: paymentMethod !== ALL_VALUE ? paymentMethod : undefined,
      search: search.trim() || undefined,
      page,
      limit: pageSize,
    }),
    [categoryId, fromDate, page, paymentMethod, search, status, toDate],
  );

  const analysisParams = useMemo(() => {
    const params = { ...requestParams };
    delete params.page;
    delete params.limit;
    return params;
  }, [requestParams]);

  const {
    data: categoryData,
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: [QUERY_KEYS.BRANCH_EXPENSES, 'categories'],
    queryFn: () => branchExpensesApi.getCategories({ includeInactive: 'true' }),
    staleTime: 60 * 1000,
  });

  const categories = useMemo(
    () => (Array.isArray(categoryData) ? categoryData : []),
    [categoryData],
  );

  const {
    data: expensesData,
    isLoading: isExpensesLoading,
    isError: isExpensesError,
    isFetching: isExpensesFetching,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: [QUERY_KEYS.BRANCH_EXPENSES, 'ledger', requestParams],
    queryFn: () => branchExpensesApi.getExpenses(requestParams),
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });

  const {
    data: analysis,
    isFetching: isAnalysisFetching,
    refetch: refetchAnalysis,
  } = useQuery({
    queryKey: [QUERY_KEYS.BRANCH_EXPENSES, 'analysis', analysisParams],
    queryFn: () => branchExpensesApi.getAnalysis(analysisParams),
    enabled: canViewAnalysis,
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });

  const { rows: expenses, meta } = normalizePaginatedData(expensesData);
  const totalPages = meta.totalPages || 1;

  const paymentMethodOptions = useMemo(
    () => [
      { value: PAYMENT_METHODS.CASH, label: getPaymentMethodLabel(PAYMENT_METHODS.CASH, t) },
      {
        value: PAYMENT_METHODS.INSTAPAY,
        label: getPaymentMethodLabel(PAYMENT_METHODS.INSTAPAY, t),
      },
      {
        value: PAYMENT_METHODS.E_WALLET,
        label: getPaymentMethodLabel(PAYMENT_METHODS.E_WALLET, t),
      },
      {
        value: 'bank_transfer',
        label: t('paymentMethods.bank_transfer', { defaultValue: 'Bank transfer' }),
      },
    ],
    [t],
  );

  const categoryOptions = useMemo(
    () => [
      {
        value: ALL_VALUE,
        label: t('branchExpenses.allCategories', {
          defaultValue: 'All categories',
        }),
      },
      ...categories
        .filter((category) => category.isActive)
        .map((category) => ({
          value: String(category.id),
          label: category.name,
        })),
    ],
    [categories, t],
  );

  const statusOptions = useMemo(
    () => [
      {
        value: ALL_VALUE,
        label: t('branchExpenses.status.all', { defaultValue: 'All statuses' }),
      },
      {
        value: POSTED_STATUS,
        label: t('branchExpenses.status.posted', { defaultValue: 'Posted' }),
      },
      {
        value: VOIDED_STATUS,
        label: t('branchExpenses.status.voided', { defaultValue: 'Voided' }),
      },
    ],
    [t],
  );

  const filterPaymentMethodOptions = useMemo(
    () => [
      {
        value: ALL_VALUE,
        label: t('branchExpenses.allPaymentMethods', {
          defaultValue: 'All methods',
        }),
      },
      ...paymentMethodOptions,
    ],
    [paymentMethodOptions, t],
  );

  const invalidateExpenses = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.BRANCH_EXPENSES] });
  };

  const createExpenseMutation = useMutation({
    mutationFn: (payload) => branchExpensesApi.createExpense(payload),
    onSuccess: () => {
      toast.success(
        t('branchExpenses.toasts.expenseCreated', {
          defaultValue: 'Expense recorded.',
        }),
      );
      setExpenseDrawerOpen(false);
      setEditingExpense(null);
      invalidateExpenses();
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, payload }) => branchExpensesApi.updateExpense(id, payload),
    onSuccess: () => {
      toast.success(
        t('branchExpenses.toasts.expenseUpdated', {
          defaultValue: 'Expense updated.',
        }),
      );
      setExpenseDrawerOpen(false);
      setEditingExpense(null);
      invalidateExpenses();
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (payload) => branchExpensesApi.createCategory(payload),
    onSuccess: () => {
      toast.success(
        t('branchExpenses.toasts.categoryCreated', {
          defaultValue: 'Category created.',
        }),
      );
      setCategoryForm(emptyCategoryForm);
      invalidateExpenses();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, payload }) => branchExpensesApi.updateCategory(id, payload),
    onSuccess: () => {
      toast.success(
        t('branchExpenses.toasts.categoryUpdated', {
          defaultValue: 'Category updated.',
        }),
      );
      setEditingCategory(null);
      setCategoryForm(emptyCategoryForm);
      invalidateExpenses();
    },
  });

  const voidExpenseMutation = useMutation({
    mutationFn: ({ id, reason }) => branchExpensesApi.voidExpense(id, { reason }),
    onSuccess: () => {
      toast.success(
        t('branchExpenses.toasts.expenseVoided', {
          defaultValue: 'Expense voided.',
        }),
      );
      setVoidExpense(null);
      setVoidReason('');
      invalidateExpenses();
    },
  });

  const openCreateExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      ...emptyExpenseForm,
      occurredOn: getClinicTodayDateOnly(),
    });
    setExpenseDrawerOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      categoryId: String(expense.categoryId || ''),
      occurredOn: expense.occurredOn ? expense.occurredOn.slice(0, 10) : '',
      amount: String(expense.amount || ''),
      paymentMethod: expense.paymentMethod || PAYMENT_METHODS.CASH,
      payee: expense.payee || '',
      referenceNumber: expense.referenceNumber || '',
      notes: expense.notes || '',
    });
    setExpenseDrawerOpen(true);
  };

  const handleExpenseFormChange = (field, value) => {
    setExpenseForm((current) => ({ ...current, [field]: value }));
  };

  const handleExpenseSubmit = (event) => {
    event.preventDefault();
    if (!expenseForm.categoryId) {
      toast.error(
        t('branchExpenses.validation.categoryRequired', {
          defaultValue: 'Select an expense category.',
        }),
      );
      return;
    }
    if (!expenseForm.occurredOn) {
      toast.error(
        t('branchExpenses.validation.dateRequired', {
          defaultValue: 'Select the expense date.',
        }),
      );
      return;
    }

    if (editingExpense) {
      updateExpenseMutation.mutate({
        id: editingExpense.id,
        payload: {
          categoryId: Number(expenseForm.categoryId),
          occurredOn: expenseForm.occurredOn,
          paymentMethod: expenseForm.paymentMethod,
          payee: expenseForm.payee || null,
          referenceNumber: expenseForm.referenceNumber || null,
          notes: expenseForm.notes || null,
        },
      });
      return;
    }

    const amount = Number(expenseForm.amount);
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error(
        t('branchExpenses.validation.amountRequired', {
          defaultValue: 'Enter an amount greater than zero.',
        }),
      );
      return;
    }

    createExpenseMutation.mutate({
      categoryId: Number(expenseForm.categoryId),
      occurredOn: expenseForm.occurredOn,
      amount,
      paymentMethod: expenseForm.paymentMethod,
      payee: expenseForm.payee || null,
      referenceNumber: expenseForm.referenceNumber || null,
      notes: expenseForm.notes || null,
    });
  };

  const handleCategorySubmit = (event) => {
    event.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error(
        t('branchExpenses.validation.categoryNameRequired', {
          defaultValue: 'Enter a category name.',
        }),
      );
      return;
    }

    const payload = {
      name: categoryForm.name.trim(),
      code: categoryForm.code.trim() || null,
      sortOrder: categoryForm.sortOrder ? Number(categoryForm.sortOrder) : 100,
    };

    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        payload,
      });
      return;
    }

    createCategoryMutation.mutate(payload);
  };

  const startEditingCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || '',
      code: category.code || '',
      sortOrder: String(category.sortOrder ?? 100),
    });
  };

  const cancelEditingCategory = () => {
    setEditingCategory(null);
    setCategoryForm(emptyCategoryForm);
  };

  const refreshAll = () => {
    refetchExpenses();
    refetchCategories();
    if (canViewAnalysis) {
      refetchAnalysis();
    }
  };

  const columns = useMemo(
    () => [
      {
        key: 'occurredOn',
        header: t('branchExpenses.occurredOn', { defaultValue: 'Date' }),
        cell: (row) => formatDate(row.occurredOn, 'PP'),
      },
      {
        key: 'category',
        header: t('branchExpenses.category', { defaultValue: 'Category' }),
        cell: (row) => row.category?.name || '--',
      },
      {
        key: 'payee',
        header: t('branchExpenses.payee', { defaultValue: 'Payee' }),
        cell: (row) => row.payee || '--',
      },
      {
        key: 'paymentMethod',
        header: t('branchExpenses.paymentMethod', {
          defaultValue: 'Payment method',
        }),
        cell: (row) => getPaymentMethodLabel(row.paymentMethod, t),
      },
      {
        key: 'amount',
        header: t('branchExpenses.amount', { defaultValue: 'Amount' }),
        cellClassName: 'text-right font-medium',
        cell: (row) => formatCurrency(row.amount || 0),
      },
      {
        key: 'status',
        header: t('branchExpenses.status.label', { defaultValue: 'Status' }),
        cell: (row) => (
          <div className="flex flex-wrap gap-1">
            <ExpenseStatusBadge status={row.status} t={t} />
            <GeneratedExpenseBadge sourceType={row.sourceType} t={t} />
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        cellClassName: 'text-right',
        cell: (row) => (
          <div className="flex justify-end gap-1">
            {canUpdate &&
              row.status !== VOIDED_STATUS &&
              !isGeneratedExpense(row) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation();
                  openEditExpense(row);
                }}
                aria-label={t('common.edit', { defaultValue: 'Edit' })}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canVoid && row.status !== VOIDED_STATUS && !isGeneratedExpense(row) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  setVoidExpense(row);
                }}
                aria-label={t('branchExpenses.voidExpense', {
                  defaultValue: 'Void expense',
                })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canUpdate, canVoid, t],
  );

  const mobileCard = (row) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{row.category?.name || '--'}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(row.occurredOn, 'PP')} · {getPaymentMethodLabel(row.paymentMethod, t)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{formatCurrency(row.amount || 0)}</div>
          <div className="mt-1 flex flex-wrap justify-end gap-1">
            <ExpenseStatusBadge status={row.status} t={t} />
            <GeneratedExpenseBadge sourceType={row.sourceType} t={t} />
          </div>
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {row.payee || t('branchExpenses.noPayee', { defaultValue: 'No payee' })}
      </div>
      {(canUpdate || canVoid) &&
        row.status !== VOIDED_STATUS &&
        !isGeneratedExpense(row) && (
        <div className="flex gap-2">
          {canUpdate && (
            <Button size="sm" variant="outline" onClick={() => openEditExpense(row)}>
              <Pencil className="h-4 w-4" />
              {t('common.edit', { defaultValue: 'Edit' })}
            </Button>
          )}
          {canVoid && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setVoidExpense(row)}
            >
              <Trash2 className="h-4 w-4" />
              {t('branchExpenses.void', { defaultValue: 'Void' })}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const isSavingExpense =
    createExpenseMutation.isPending || updateExpenseMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('branchExpenses.title', { defaultValue: 'Branch expenses' })}
        description={t('branchExpenses.description', {
          defaultValue:
            'Record operating expenses, review category spend, and keep voided corrections visible in the ledger.',
        })}
        actions={
          <>
            {canManageCategories && (
              <Button variant="outline" onClick={() => setCategoryDrawerOpen(true)}>
                <FolderCog className="h-4 w-4" />
                {t('branchExpenses.manageCategories', {
                  defaultValue: 'Categories',
                })}
              </Button>
            )}
            {canCreate && (
              <Button onClick={openCreateExpense}>
                <Plus className="h-4 w-4" />
                {t('branchExpenses.newExpense', { defaultValue: 'New expense' })}
              </Button>
            )}
          </>
        }
      />

      {canViewAnalysis && (
        <ImpactPanel
          icon={CalendarDays}
          title={t('branchExpenses.analysisTitle', {
            defaultValue: 'Expense analysis',
          })}
          description={t('branchExpenses.analysisDescription', {
            defaultValue:
              'Posted totals exclude voided records while the ledger keeps voided history visible.',
          })}
          tone="commercial"
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <ImpactMetric
              label={t('branchExpenses.totalPostedExpenses', {
                defaultValue: 'Posted expenses',
              })}
              value={
                isAnalysisFetching && !analysis
                  ? undefined
                  : formatCurrency(analysis?.totalPostedExpenses ?? 0)
              }
            />
            <ImpactMetric
              label={t('branchExpenses.averageDailyExpense', {
                defaultValue: 'Daily average',
              })}
              value={formatCurrency(analysis?.averageDailyExpense ?? 0)}
            />
            <ImpactMetric
              label={t('branchExpenses.postedCount', {
                defaultValue: 'Posted records',
              })}
              value={formatWesternNumber(analysis?.postedExpenseCount ?? 0)}
            />
            <ImpactMetric
              label={t('branchExpenses.voidedCount', {
                defaultValue: 'Voided records',
              })}
              value={formatWesternNumber(analysis?.voidedExpenseCount ?? 0)}
            />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <div className="rounded-md border bg-background/80 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t('branchExpenses.categoryBreakdown', {
                  defaultValue: 'Top categories',
                })}
              </div>
              <div className="space-y-2">
                {(analysis?.categoryBreakdown || []).slice(0, 4).map((item) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">{item.categoryName}</span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
                {(!analysis?.categoryBreakdown ||
                  analysis.categoryBreakdown.length === 0) && (
                  <div className="text-sm text-muted-foreground">
                    {t('branchExpenses.noBreakdownData', {
                      defaultValue: 'No posted expenses in this range.',
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border bg-background/80 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t('branchExpenses.paymentMethodBreakdown', {
                  defaultValue: 'Payment methods',
                })}
              </div>
              <div className="space-y-2">
                {(analysis?.paymentMethodBreakdown || []).map((item) => (
                  <div
                    key={item.paymentMethod}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {getPaymentMethodLabel(item.paymentMethod, t)}
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
                {(!analysis?.paymentMethodBreakdown ||
                  analysis.paymentMethodBreakdown.length === 0) && (
                  <div className="text-sm text-muted-foreground">
                    {t('branchExpenses.noBreakdownData', {
                      defaultValue: 'No posted expenses in this range.',
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border bg-background/80 p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                {t('branchExpenses.topPayees', { defaultValue: 'Top payees' })}
              </div>
              <div className="space-y-2">
                {(analysis?.topPayees || []).map((item) => (
                  <div
                    key={item.payee}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">{item.payee}</span>
                    <span className="shrink-0 font-medium">
                      {formatCurrency(item.total)}
                    </span>
                  </div>
                ))}
                {(!analysis?.topPayees || analysis.topPayees.length === 0) && (
                  <div className="text-sm text-muted-foreground">
                    {t('branchExpenses.noPayeeData', {
                      defaultValue: 'No payee totals in this range.',
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ImpactPanel>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('branchExpenses.ledgerTitle', { defaultValue: 'Expense ledger' })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.3fr)_repeat(3,minmax(160px,1fr))_auto] lg:items-end">
            <div className="space-y-1">
              <Label>{t('reports.dateRange', { defaultValue: 'Date range' })}</Label>
              <DateRangePicker
                fromDate={fromDate}
                toDate={toDate}
                onChange={(from, to) => {
                  setFromDate(from);
                  setToDate(to);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('branchExpenses.category', { defaultValue: 'Category' })}</Label>
              <SearchableSelect
                options={categoryOptions}
                value={categoryId}
                onChange={(value) => {
                  setCategoryId(value || ALL_VALUE);
                  setPage(1);
                }}
                placeholder={t('branchExpenses.allCategories', {
                  defaultValue: 'All categories',
                })}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('branchExpenses.status.label', { defaultValue: 'Status' })}</Label>
              <SearchableSelect
                options={statusOptions}
                value={status}
                onChange={(value) => {
                  setStatus(value || ALL_VALUE);
                  setPage(1);
                }}
                placeholder={t('branchExpenses.status.all', {
                  defaultValue: 'All statuses',
                })}
              />
            </div>
            <div className="space-y-1">
              <Label>
                {t('branchExpenses.paymentMethod', {
                  defaultValue: 'Payment method',
                })}
              </Label>
              <SearchableSelect
                options={filterPaymentMethodOptions}
                value={paymentMethod}
                onChange={(value) => {
                  setPaymentMethod(value || ALL_VALUE);
                  setPage(1);
                }}
                placeholder={t('branchExpenses.allPaymentMethods', {
                  defaultValue: 'All methods',
                })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={refreshAll}
              disabled={isExpensesFetching || isCategoriesLoading}
              aria-label={t('common.refresh', { defaultValue: 'Refresh' })}
            >
              {isExpensesFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="ps-9"
              placeholder={t('branchExpenses.searchPlaceholder', {
                defaultValue: 'Search payee, reference, or notes...',
              })}
            />
          </div>

          {isExpensesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isExpensesError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {t('branchExpenses.loadFailed', {
                defaultValue: 'Failed to load expenses.',
              })}
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <Tags className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-3 font-medium">
                {t('branchExpenses.emptyTitle', {
                  defaultValue: 'No expenses found',
                })}
              </div>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {t('branchExpenses.emptyDescription', {
                  defaultValue:
                    'Create the first expense or adjust the filters to review another period.',
                })}
              </p>
              {canCreate && (
                <Button className="mt-4" onClick={openCreateExpense}>
                  <Plus className="h-4 w-4" />
                  {t('branchExpenses.newExpense', { defaultValue: 'New expense' })}
                </Button>
              )}
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={expenses}
                direction={isRtl ? 'rtl' : 'ltr'}
                mobileCard={mobileCard}
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('branchExpenses.pageSummary', {
                    defaultValue: 'Page {{page}} of {{totalPages}}',
                    page: formatWesternNumber(meta.page || page),
                    totalPages: formatWesternNumber(totalPages),
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    {t('common.previous', { defaultValue: 'Previous' })}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    {t('common.next', { defaultValue: 'Next' })}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={expenseDrawerOpen}
        onOpenChange={(open) => {
          setExpenseDrawerOpen(open);
          if (!open) setEditingExpense(null);
        }}
      >
        <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl">
          <SheetHeader className="border-b px-6 py-5 pe-12">
            <SheetTitle>
              {editingExpense
                ? t('branchExpenses.editExpense', { defaultValue: 'Edit expense' })
                : t('branchExpenses.newExpense', { defaultValue: 'New expense' })}
            </SheetTitle>
            <SheetDescription>
              {t('branchExpenses.drawerDescription', {
                defaultValue:
                  'Record branch operating costs with enough detail for later accounting review.',
              })}
            </SheetDescription>
          </SheetHeader>
          <ExpenseForm
            categories={categories}
            form={expenseForm}
            isEditing={Boolean(editingExpense)}
            isSaving={isSavingExpense}
            onCancel={() => setExpenseDrawerOpen(false)}
            onChange={handleExpenseFormChange}
            onSubmit={handleExpenseSubmit}
            paymentMethodOptions={paymentMethodOptions}
            t={t}
          />
        </SheetContent>
      </Sheet>

      <Sheet
        open={categoryDrawerOpen}
        onOpenChange={(open) => {
          setCategoryDrawerOpen(open);
          if (!open) cancelEditingCategory();
        }}
      >
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader className="border-b px-6 py-5 pe-12">
            <SheetTitle>
              {t('branchExpenses.manageCategories', {
                defaultValue: 'Categories',
              })}
            </SheetTitle>
            <SheetDescription>
              {t('branchExpenses.categoriesDescription', {
                defaultValue:
                  'Keep category setup separate from expense entry so the ledger stays focused.',
              })}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form className="space-y-3 rounded-md border p-3" onSubmit={handleCategorySubmit}>
              {editingCategory && (
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">
                    {t('branchExpenses.editCategory', {
                      defaultValue: 'Edit category',
                    })}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditingCategory}
                    disabled={updateCategoryMutation.isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="category-name">
                  {t('branchExpenses.categoryName', {
                    defaultValue: 'Category name',
                  })}
                </Label>
                <Input
                  id="category-name"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category-code">
                    {t('branchExpenses.categoryCode', {
                      defaultValue: 'Code',
                    })}
                  </Label>
                  <Input
                    id="category-code"
                    value={categoryForm.code}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-sort">
                    {t('branchExpenses.sortOrder', {
                      defaultValue: 'Sort order',
                    })}
                  </Label>
                  <Input
                    id="category-sort"
                    type="number"
                    min="0"
                    value={categoryForm.sortOrder}
                    onChange={(event) =>
                      setCategoryForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={
                  createCategoryMutation.isPending ||
                  updateCategoryMutation.isPending
                }
              >
                {(createCategoryMutation.isPending ||
                  updateCategoryMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {editingCategory
                  ? t('common.save')
                  : t('branchExpenses.addCategory', {
                      defaultValue: 'Add category',
                    })}
              </Button>
            </form>

            <div className="mt-5 space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{category.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {category.code || t('branchExpenses.noCode', { defaultValue: 'No code' })}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateCategoryMutation.isPending}
                      onClick={() => startEditingCategory(category)}
                    >
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateCategoryMutation.isPending}
                      onClick={() =>
                        updateCategoryMutation.mutate({
                          id: category.id,
                          payload: { isActive: !category.isActive },
                        })
                      }
                    >
                      {category.isActive
                        ? t('branchExpenses.deactivate', {
                            defaultValue: 'Deactivate',
                          })
                        : t('branchExpenses.activate', {
                            defaultValue: 'Activate',
                          })}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(voidExpense)}
        onOpenChange={(open) => {
          if (!open) {
            setVoidExpense(null);
            setVoidReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('branchExpenses.voidExpenseTitle', {
                defaultValue: 'Void expense?',
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">
                {voidExpense?.category?.name || '--'} ·{' '}
                {formatCurrency(voidExpense?.amount || 0)}
              </div>
              <div className="mt-1 text-muted-foreground">
                {voidExpense?.payee || t('branchExpenses.noPayee', { defaultValue: 'No payee' })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="void-reason">
                {t('branchExpenses.voidReason', { defaultValue: 'Void reason' })}
              </Label>
              <Textarea
                id="void-reason"
                value={voidReason}
                onChange={(event) => setVoidReason(event.target.value)}
                placeholder={t('branchExpenses.voidReasonPlaceholder', {
                  defaultValue: 'Explain why this expense is being voided',
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVoidExpense(null);
                setVoidReason('');
              }}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="destructive"
              disabled={voidExpenseMutation.isPending || voidReason.trim().length < 3}
              onClick={() =>
                voidExpenseMutation.mutate({
                  id: voidExpense.id,
                  reason: voidReason.trim(),
                })
              }
            >
              {voidExpenseMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <CircleSlash className="h-4 w-4" />
              {t('branchExpenses.void', { defaultValue: 'Void' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
