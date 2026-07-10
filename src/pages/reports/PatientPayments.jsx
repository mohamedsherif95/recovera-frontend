import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AsyncSearchableSelect } from '@/components/common/AsyncSearchableSelect';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DataTable } from '@/components/common/DataTable';
import DateRangePicker from '@/components/common/DateRangePicker';
import { reportsApi } from '@/api/endpoints/reports';
import { useAuthStore } from '@/store/authStore';
import { PERMISSIONS, USER_ROLES } from '@/lib/constants';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DollarSign, CreditCard, Banknote, Wallet, AlertCircle } from 'lucide-react';
import { usePatientLookupOptions } from '@/hooks/useLookupOptions';
import { usePermissions } from '@/hooks/usePermissions';
import { invoicesApi } from '@/api/endpoints/invoices';
import { downloadInvoicePdf } from '@/lib/invoices/pdf';
import { useCreateStatementInvoice } from '@/hooks/useInvoices';

const toDateOnlyString = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateOnlyString = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getRecentIncomeDayValues = (todayValue) => {
  const baseDate = parseDateOnlyString(todayValue);
  if (!baseDate) return [];

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() - index);
    return toDateOnlyString(date);
  });
};

export default function IncomeReportPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = usePermissions();
  const { hasAnyRole } = useAuthStore();
  const isAdmin = hasAnyRole([USER_ROLES.MANAGER]);
  const isSecretary = hasAnyRole([USER_ROLES.SECRETARY]);
  const canViewInvoices = can(PERMISSIONS['invoices:view']);
  const canCreateInvoices = can(PERMISSIONS['invoices:create']);
  const usesSecretaryIncomeScope = isSecretary && !isAdmin;
  const canUseFullRangeFilters = isAdmin || hasAnyRole([USER_ROLES.SECRETARY]);
  const todayDateOnly = useMemo(() => toDateOnlyString(new Date()), []);
  const todayDate = useMemo(() => parseDateOnlyString(todayDateOnly), [todayDateOnly]);
  const currentMonthStartDate = useMemo(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
    [todayDate],
  );
  const currentMonthEndDate = useMemo(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0),
    [todayDate],
  );

  const [selectedPatientId, setSelectedPatientIdState] = useState(() => {
    return searchParams.get('patientId') || '';
  });

  const [fromDate, setFromDateState] = useState(() => {
    if (!canUseFullRangeFilters) return todayDate;
    const from = searchParams.get('from');
    return from ? parseDateOnlyString(from) : currentMonthStartDate;
  });

  const [toDate, setToDateState] = useState(() => {
    if (!canUseFullRangeFilters) return todayDate;
    const to = searchParams.get('to');
    return to ? parseDateOnlyString(to) : currentMonthEndDate;
  });
  const [selectedIncomeDate, setSelectedIncomeDateState] = useState(() => {
    const incomeDate = searchParams.get('incomeDate');
    const recentValues = getRecentIncomeDayValues(todayDateOnly);
    return incomeDate && recentValues.includes(incomeDate) ? incomeDate : todayDateOnly;
  });
  const [showTotalIncome, setShowTotalIncome] = useState(false);
  const [invoiceLoadingPaymentId, setInvoiceLoadingPaymentId] = useState(null);
  const createStatementInvoice = useCreateStatementInvoice();

  const [page, setPageState] = useState(() => {
    const raw = searchParams.get('page');
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  });
  const pageSize = 10;

  const updateFiltersInUrl = (
    nextPatientId,
    nextFromDate,
    nextToDate,
    nextPage,
    nextIncomeDate = selectedIncomeDate,
  ) => {
    const params = {};
    const effectiveFromDate = canUseFullRangeFilters ? nextFromDate : todayDate;
    const effectiveToDate = canUseFullRangeFilters ? nextToDate : todayDate;
    if (nextPatientId) params.patientId = nextPatientId;
    if (effectiveFromDate) params.from = toDateOnlyString(effectiveFromDate);
    if (effectiveToDate) params.to = toDateOnlyString(effectiveToDate);
    if (usesSecretaryIncomeScope && nextIncomeDate) {
      params.incomeDate = nextIncomeDate;
    }
    if (nextPage && nextPage !== 1) params.page = String(nextPage);
    setSearchParams(params, { replace: true });
  };

  const patientLookup = usePatientLookupOptions();

  const patientOptions = useMemo(() => {
    const raw = patientLookup.records;
    return raw.map((p) => ({
      value: String(p.id),
      label: `${p.fullName || t('patients.unknownPatient', { defaultValue: 'Unknown patient' })} - #${
        p.patientCode || p.id
      }`,
    }));
  }, [patientLookup.records, t]);

  const selectedPatientOption = useMemo(() => {
    if (!selectedPatientId) return undefined;
    const selected = patientOptions.find((option) => option.value === selectedPatientId);
    if (selected) return selected;
    return {
      value: selectedPatientId,
      label: `#${selectedPatientId}`,
    };
  }, [patientOptions, selectedPatientId]);

  const incomeDayOptions = useMemo(
    () =>
      getRecentIncomeDayValues(todayDateOnly).map((value) => ({
        value,
        label: formatDate(parseDateOnlyString(value), 'PPP'),
      })),
    [todayDateOnly],
  );

  const requestFrom = canUseFullRangeFilters ? fromDate : todayDate;
  const requestTo = canUseFullRangeFilters ? toDate : todayDate;
  const summaryRequestParams = useMemo(() => {
    if (usesSecretaryIncomeScope) {
      return {
        incomeDate: selectedIncomeDate,
      };
    }

    return {
      patientId: selectedPatientId || undefined,
      from: requestFrom ? toDateOnlyString(requestFrom) : undefined,
      to: requestTo ? toDateOnlyString(requestTo) : undefined,
    };
  }, [
    requestFrom,
    requestTo,
    selectedIncomeDate,
    selectedPatientId,
    usesSecretaryIncomeScope,
  ]);

  const {
    data: summaryData,
    refetch: refetchSummary,
    isFetching: isFetchingSummary,
  } = useQuery({
    queryKey: [
      'income-report-summary',
      summaryRequestParams,
    ],
    queryFn: () => reportsApi.getIncomeReport(summaryRequestParams),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const {
    data: detailsData,
    isLoading: isDetailsLoading,
    isError: isDetailsError,
    refetch: refetchDetails,
    isFetching: isFetchingDetails,
  } = useQuery({
    queryKey: [
      'income-report-details',
      {
        patientId: selectedPatientId,
        fromDate,
        toDate,
        page,
        limit: pageSize,
      },
    ],
    queryFn: () =>
      reportsApi.getIncomeReport({
        patientId: selectedPatientId || undefined,
        from: requestFrom ? toDateOnlyString(requestFrom) : undefined,
        to: requestTo ? toDateOnlyString(requestTo) : undefined,
        page,
        limit: pageSize,
      }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const payments = useMemo(() => {
    if (!detailsData) return [];
    if (Array.isArray(detailsData?.payments)) return detailsData.payments;
    if (Array.isArray(detailsData?.data)) return detailsData.data;
    return [];
  }, [detailsData]);

  const unpaidSessions = detailsData?.unpaidSessions ?? [];
  const summary = summaryData?.summary || null;
  const totalPaymentsCount = detailsData?.total ?? 0;
  const totalPages = totalPaymentsCount ? Math.ceil(totalPaymentsCount / pageSize) : 1;
  const isFetching = isFetchingSummary || isFetchingDetails;
  const individualIncomeBreakdown = useMemo(() => {
    const breakdown = summary?.individualIncomeByMethod ?? [];
    const totals = {
      cash: 0,
      instapay: 0,
    };

    breakdown.forEach((item) => {
      if (item.method === 'cash') {
        totals.cash = Number(item.total ?? 0);
      }
      if (item.method === 'instapay') {
        totals.instapay = Number(item.total ?? 0);
      }
    });

    return totals;
  }, [summary]);

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'instapay':
        return <CreditCard className="h-4 w-4" />;
      case 'e_wallet':
        return <Wallet className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method) => {
    switch (method) {
      case 'cash':
        return t('payments.methods.cash', { defaultValue: 'Cash' });
      case 'instapay':
        return t('payments.methods.instapay', { defaultValue: 'Instapay' });
      case 'e_wallet':
        return t('payments.methods.eWallet', { defaultValue: 'E-Wallet' });
      default:
        return method || t('common.unknown', { defaultValue: 'Unknown' });
    }
  };

  const handleDownloadPaymentInvoice = useCallback(async (paymentId) => {
    if (!paymentId) return;
    try {
      setInvoiceLoadingPaymentId(paymentId);
      const invoice = await invoicesApi.getByPaymentSource(paymentId);
      downloadInvoicePdf(invoice);
    } catch (error) {
      if (error?.response?.status === 404) {
        toast.error(
          t('reports.invoiceNotFound', {
            defaultValue: 'No invoice found for this payment.',
          }),
        );
      } else {
        toast.error(
          error?.response?.data?.message ||
            t('reports.failedInvoiceDownload', {
              defaultValue: 'Failed to load invoice.',
            }),
        );
      }
    } finally {
      setInvoiceLoadingPaymentId(null);
    }
  }, [t]);

  const handleCreateStatementInvoice = () => {
    if (!selectedPatientId) {
      toast.error(
        t('reports.statementPatientRequired', {
          defaultValue: 'Select a patient to create a statement invoice.',
        }),
      );
      return;
    }

    createStatementInvoice.mutate(
      {
        patientId: Number(selectedPatientId),
        fromDate: requestFrom ? toDateOnlyString(requestFrom) : undefined,
        toDate: requestTo ? toDateOnlyString(requestTo) : undefined,
      },
      {
        onSuccess: (invoice) => {
          downloadInvoicePdf(invoice);
        },
      },
    );
  };

  const columns = useMemo(
    () => {
      const baseColumns = [
        {
          key: 'patientName',
          header: t('patients.patient'),
          cell: (row) => row.patientName || '--',
        },
        {
          key: 'incomeType',
          header: t('reports.incomeType', { defaultValue: 'Income type' }),
          cell: (row) => {
            const isPackage = row.incomeType === 'package';
            return (
              <Badge
                variant="outline"
                className={
                  isPackage
                    ? 'border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                    : 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                }
              >
                {isPackage
                  ? t('reports.packageIncome', { defaultValue: 'Package' })
                  : t('reports.individualIncome', { defaultValue: 'Individual' })}
              </Badge>
            );
          },
        },
        {
          key: 'sessionDate',
          header: t('sessions.date'),
          cell: (row) => (row.sessionDate ? formatDate(row.sessionDate, 'PP') : '--'),
        },
        {
          key: 'sessionCost',
          header: t('sessions.cost'),
          cell: (row) =>
            row.sessionCost != null ? formatCurrency(row.sessionCost) : '--',
        },
        {
          key: 'amount',
          header: t('payments.paid'),
          cell: (row) => (row.amount != null ? formatCurrency(row.amount) : '--'),
        },
        {
          key: 'remaining',
          header: t('payments.remaining', { defaultValue: 'Remaining' }),
          cell: (row) => {
            const remaining =
              row.sessionRemaining ?? Math.max((row.sessionCost ?? 0) - (row.sessionTotalPaid ?? 0), 0);
            return (
              <span className={remaining > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                {formatCurrency(remaining)}
              </span>
            );
          },
        },
        {
          key: 'paymentDate',
          header: t('payments.paymentDate'),
          cell: (row) => (row.paymentDate ? formatDate(row.paymentDate, 'PP') : '--'),
        },
        {
          key: 'method',
          header: t('payments.method'),
          cell: (row) => (
            <span className="flex items-center gap-1">
              {getMethodIcon(row.paymentMethod || row.method)}
              {getMethodLabel(row.paymentMethod || row.method)}
            </span>
          ),
        },
        {
          key: 'recordedBy',
          header: t('payments.recordedBy', { defaultValue: 'Recorded by' }),
          cell: (row) => row.recordedBy?.fullName || row.recordedByName || '--',
        },
      ];

      if (canViewInvoices) {
        baseColumns.push({
          key: 'invoice',
          header: t('nav.invoices', { defaultValue: 'Invoice' }),
          cell: (row) => (
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handleDownloadPaymentInvoice(row.id);
              }}
              disabled={invoiceLoadingPaymentId === row.id}
            >
              {invoiceLoadingPaymentId === row.id
                ? t('common.loading')
                : t('common.download', { defaultValue: 'Download' })}
            </Button>
          ),
        });
      }

      return baseColumns;
    },
    [
      t,
      canViewInvoices,
      invoiceLoadingPaymentId,
      handleDownloadPaymentInvoice,
      getMethodIcon,
      getMethodLabel,
    ]
  );

  const isRtl = i18n.language === 'ar';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.incomeReportTitle', { defaultValue: 'Income Report' })}
      />

      {/* Filters Card */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="w-full md:w-72 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('reports.filterByPatient', { defaultValue: 'Filter by patient (optional)' })}
                </label>
                <AsyncSearchableSelect
                  options={[{ value: 'all', label: t('common.all', { defaultValue: 'All patients' }) }, ...patientOptions]}
                  value={selectedPatientId || 'all'}
                  onChange={(val) => {
                    const nextPatientId = val === 'all' ? '' : val || '';
                    setSelectedPatientIdState(nextPatientId);
                    setPageState(1);
                    updateFiltersInUrl(nextPatientId, fromDate, toDate, 1, selectedIncomeDate);
                  }}
                  placeholder={t('common.all', { defaultValue: 'All patients' })}
                  searchPlaceholder={t('sessions.filters.searchPlaceholder')}
                  onSearchChange={patientLookup.setSearch}
                  hasMore={patientLookup.hasNextPage}
                  onLoadMore={patientLookup.fetchNextPage}
                  isLoading={patientLookup.isLoading}
                  isLoadingMore={patientLookup.isFetchingNextPage}
                  isError={patientLookup.isError}
                  selectedOption={selectedPatientOption}
                  emptyText={t('common.noData', { defaultValue: 'No data' })}
                  loadingText={t('common.loading')}
                  loadMoreText={t('common.loadMore', { defaultValue: 'Load more' })}
                  errorText={t('messages.errorOccurred')}
                />
              </div>

              <div className="w-full md:w-auto">
                {canUseFullRangeFilters ? (
                  <DateRangePicker
                    fromDate={fromDate}
                    toDate={toDate}
                    onChange={(from, to) => {
                      setFromDateState(from);
                      setToDateState(to);
                      setPageState(1);
                      updateFiltersInUrl(selectedPatientId, from, to, 1, selectedIncomeDate);
                    }}
                    placeholder={t('reports.selectDateRange', { defaultValue: 'Select date range' })}
                  />
                ) : (
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    {t('reports.todayOnly', { defaultValue: 'Today only' })}
                  </div>
                )}
              </div>

              {usesSecretaryIncomeScope && (
                <div className="w-full md:w-64 space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('reports.incomeDayLabel', { defaultValue: 'Income day (last 7 days)' })}
                  </label>
                  <Select
                    value={selectedIncomeDate}
                    onValueChange={(value) => {
                      setSelectedIncomeDateState(value);
                      updateFiltersInUrl(selectedPatientId, fromDate, toDate, page, value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('reports.incomeDayLabel', {
                          defaultValue: 'Income day (last 7 days)',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeDayOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetchSummary();
                  refetchDetails();
                }}
                disabled={isFetching}
              >
                {isFetching ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="text-xs">{t('common.refresh', { defaultValue: 'Refresh' })}</span>
                )}
              </Button>
              {canCreateInvoices && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreateStatementInvoice}
                  disabled={createStatementInvoice.isPending || !selectedPatientId}
                >
                  <span className="text-xs">
                    {createStatementInvoice.isPending
                      ? t('common.loading')
                      : t('reports.createStatementInvoice', {
                          defaultValue: 'Create statement invoice',
                        })}
                  </span>
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant={showTotalIncome ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setShowTotalIncome((current) => !current)}
                  disabled={!summary}
                >
                  <span className="text-xs">
                    {showTotalIncome
                      ? t('reports.hideTotalIncome', {
                          amount: formatCurrency(summary?.allTimeIncome ?? 0),
                          defaultValue: `Hide total income: ${formatCurrency(summary?.allTimeIncome ?? 0)}`,
                        })
                      : t('reports.showTotalIncome', {
                          defaultValue: 'Show total income',
                        })}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {usesSecretaryIncomeScope && (
            <p className="text-xs text-muted-foreground">
              {t('reports.secretaryIncomeScopeNote', {
                defaultValue:
                  'Income cards show the selected day from the last 7 days. Outstanding and tables use the selected date range.',
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-sky-700 dark:text-sky-400">
                {t('reports.totalIncome', { defaultValue: 'Total Income' })}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">
                {formatCurrency(summary.totalIncome ?? 0)}
              </div>
              <p className="text-xs text-sky-700/70 dark:text-sky-300/70">
                {t('reports.fromPayments', {
                  count: summary.totalPayments ?? 0,
                  defaultValue: `From ${summary.totalPayments ?? 0} payments`,
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
                {t('reports.packageIncome', { defaultValue: 'Package Income' })}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                {formatCurrency(summary.packageIncomeTotal ?? 0)}
              </div>
              <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70">
                {t('reports.fromPayments', {
                  count: summary.packagePaymentsCount ?? 0,
                  defaultValue: `From ${summary.packagePaymentsCount ?? 0} payments`,
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {t('reports.individualIncome', { defaultValue: 'Individual Income' })}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatCurrency(summary.individualIncomeTotal ?? 0)}
              </div>
              <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
                {t('reports.fromPayments', {
                  count: summary.individualPaymentsCount ?? 0,
                  defaultValue: `From ${summary.individualPaymentsCount ?? 0} payments`,
                })}
              </p>
              <div className="mt-3 space-y-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1">
                    {getMethodIcon('cash')}
                    {getMethodLabel('cash')}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(individualIncomeBreakdown.cash)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1">
                    {getMethodIcon('instapay')}
                    {getMethodLabel('instapay')}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(individualIncomeBreakdown.instapay)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-amber-200 bg-amber-50 transition hover:shadow-md dark:border-amber-800 dark:bg-amber-950/30"
            onClick={() => navigate('/patient-payments/balances')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate('/patient-payments/balances');
              }
            }}
            role="button"
            tabIndex={0}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {t('reports.totalUnusedBalance', { defaultValue: 'Total Unused Balance' })}
              </CardTitle>
              <Wallet className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {formatCurrency(summary.totalUnusedPatientBalance ?? 0)}
              </div>
              <p className="text-xs text-amber-700/70 dark:text-amber-300/70">
                {t('reports.viewBalanceBreakdown', {
                  defaultValue: 'Click to view patient balance details',
                })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
                {t('reports.totalRemaining', { defaultValue: 'Total Remaining' })}
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(summary.totalRemaining ?? 0)}
              </div>
              <p className="text-xs text-red-600/70 dark:text-red-400/70">
                {t('reports.unpaidBalance', { defaultValue: 'Unpaid balance from sessions' })}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unpaid Sessions Table */}
      {unpaidSessions.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">
              {t('reports.unpaidSessions', { defaultValue: 'Sessions with Outstanding Balance' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden bg-card">
              <div className="overflow-auto max-h-[350px]" dir={isRtl ? 'rtl' : 'ltr'}>
                <table className="w-full text-sm relative">
                  <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                  <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium text-start">{t('patients.patient')}</th>
                    <th className="px-4 py-3 font-medium text-start">{t('sessions.date')}</th>
                    <th className="px-4 py-3 font-medium text-start">{t('sessions.cost')}</th>
                    <th className="px-4 py-3 font-medium text-start">{t('payments.paid')}</th>
                    <th className="px-4 py-3 font-medium text-start">{t('payments.remaining')}</th>
                    <th className="px-4 py-3 font-medium text-start">{t('sessions.category')}</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidSessions.map((session) => (
                    <tr
                      key={session.sessionId}
                      className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/sessions/${session.sessionId}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{session.patientName}</div>
                        <div className="text-xs text-muted-foreground">{session.patientCode}</div>
                      </td>
                      <td className="px-4 py-3">{formatDate(session.sessionDate, 'PP')}</td>
                      <td className="px-4 py-3">{formatCurrency(session.cost)}</td>
                      <td className="px-4 py-3">{formatCurrency(session.totalPaid)}</td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-medium">{formatCurrency(session.remaining)}</span>
                      </td>
                      <td className="px-4 py-3">{session.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reports.paymentsList', { defaultValue: 'Payments List' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {isDetailsLoading && !detailsData ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : isDetailsError ? (
            <div className="py-6 text-center text-destructive">
              {t('messages.errorOccurred')}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              {t('reports.noPaymentsFound', {
                defaultValue: 'No payments found for the selected filters.',
              })}
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={payments}
                getRowId={(row) => row.id}
                onRowClick={(row) => {
                  if (row.sessionId) {
                    navigate(`/sessions/${row.sessionId}`);
                  }
                }}
                direction={isRtl ? 'rtl' : 'ltr'}
              />

              <div className="mt-4 flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  {t('common.paginationSummary', {
                    from: payments.length ? (page - 1) * pageSize + 1 : 0,
                    to: (page - 1) * pageSize + payments.length,
                    total: totalPaymentsCount,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => {
                      const nextPage = Math.max(1, page - 1);
                      setPageState(nextPage);
                      updateFiltersInUrl(
                        selectedPatientId,
                        fromDate,
                        toDate,
                        nextPage,
                        selectedIncomeDate,
                      );
                    }}
                  >
                    {t('common.previous')}
                  </Button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => {
                      const nextPage = Math.min(totalPages || 1, page + 1);
                      setPageState(nextPage);
                      updateFiltersInUrl(
                        selectedPatientId,
                        fromDate,
                        toDate,
                        nextPage,
                        selectedIncomeDate,
                      );
                    }}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
