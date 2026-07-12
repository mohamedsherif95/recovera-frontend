import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { LocalizedDatePicker } from '@/components/common/LocalizedDatePicker';
import { AsyncSearchableSelect } from '@/components/common/AsyncSearchableSelect';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { reportsApi } from '@/api/endpoints/reports';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/constants';
import { formatDate, formatTimeTo12Hour, formatTimeWithDate } from '@/lib/utils';
import { Loader2, RefreshCcw } from 'lucide-react';
import { useDoctorLookupOptions } from '@/hooks/useLookupOptions';

export default function DoctorsPage() {
  const { t, i18n } = useTranslation();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDoctorId, setSelectedDoctorIdState] = useState(() => {
    return searchParams.get('doctorId') || '';
  });

  const [fromDate, setFromDateState] = useState(() => {
    return searchParams.get('from') || '';
  });

  const [toDate, setToDateState] = useState(() => {
    return searchParams.get('to') || '';
  });

  const [status, setStatusState] = useState(() => {
    return searchParams.get('status') || 'all';
  });

  const [page, setPageState] = useState(() => {
    const raw = searchParams.get('page');
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  });
  const pageSize = 10;

  const canView = can(PERMISSIONS['reports:view']);

  const doctorLookup = useDoctorLookupOptions();

  const updateFiltersInUrl = (nextDoctorId, nextFromDate, nextToDate, nextStatus, nextPage) => {
    const params = {};
    if (nextDoctorId) params.doctorId = nextDoctorId;
    if (nextFromDate) params.from = nextFromDate;
    if (nextToDate) params.to = nextToDate;
    if (nextStatus && nextStatus !== 'all') params.status = nextStatus;
    if (nextPage && nextPage !== 1) params.page = String(nextPage);
    setSearchParams(params, { replace: true });
  };

  const doctorOptions = useMemo(() => {
    return doctorLookup.options;
  }, [doctorLookup.options]);

  const selectedDoctorOption = useMemo(() => {
    if (!selectedDoctorId) return undefined;
    const selected = doctorOptions.find((option) => option.value === selectedDoctorId);
    if (selected) return selected;
    return {
      value: selectedDoctorId,
      label: `#${selectedDoctorId}`,
    };
  }, [doctorOptions, selectedDoctorId]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
    { value: 'scheduled', label: t('status.scheduled', { defaultValue: 'Scheduled' }) },
    { value: 'arrived', label: t('status.arrived', { defaultValue: 'Arrived' }) },
    { value: 'in_progress', label: t('status.inProgress', { defaultValue: 'In Progress' }) },
    { value: 'completed', label: t('status.completed', { defaultValue: 'Completed' }) },
    { value: 'cancelled', label: t('status.cancelled', { defaultValue: 'Cancelled' }) },
  ], [t]);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'doctor-sessions-report',
      { doctorId: selectedDoctorId, fromDate, toDate, status, page, limit: pageSize },
    ],
    queryFn: () =>
      reportsApi.getDoctorSessions({
        doctorId: selectedDoctorId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        status: status !== 'all' ? status : undefined,
        page,
        limit: pageSize,
      }),
    enabled: canView && Boolean(selectedDoctorId),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const sessions = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.sessions)) return data.sessions;
    return [];
  }, [data]);

  const summary = data?.summary || {};
  const totalSessions = data?.total ?? data?.meta?.total ?? summary.totalSessions ?? sessions.length;
  const totalPages = totalSessions ? Math.ceil(totalSessions / pageSize) : 1;

  const columns = useMemo(
    () => [
      {
        key: 'patientCode',
        header: t('patients.patientId'),
        cell: (row) => row.patient?.patientCode || '--',
      },
      {
        key: 'patient',
        header: t('sessions.patient'),
        cell: (row) => row.patient?.fullName || '--',
      },
      {
        key: 'date',
        header: t('sessions.date'),
        cell: (row) => {
          const date = row.sessionDate || row.date;
          return date ? formatDate(date, 'PP') : '--';
        },
      },
      {
        key: 'sessionTime',
        header: t('sessions.startedAt'),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeTo12Hour(row.sessionTime)}
          </span>
        ),
      },
      {
        key: 'arrivalTime',
        header: t('sessions.arrivalTime'),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeTo12Hour(row.arrivalTime)}
          </span>
        ),
      },
      {
        key: 'startTime',
        header: t('sessions.startTime', { defaultValue: 'Start time' }),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeWithDate(row.startTime, row.sessionDate || row.date) || '--'}
          </span>
        ),
      },
      {
        key: 'endTime',
        header: t('sessions.endTime', { defaultValue: 'End time' }),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeWithDate(row.endTime, row.sessionDate || row.date) || '--'}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('sessions.status'),
        cell: (row) => (row.status ? t(`status.${row.status}`) : '--'),
      },
      {
        key: 'cost',
        header: t('sessions.cost'),
        cell: (row) => (row.cost != null ? row.cost : '--'),
      },
    ],
    [t]
  );

  const isRtl = i18n.language === 'ar';

  return (
    <div className="space-y-6">
      <PageHeader title={t('doctors.title', { defaultValue: 'Providers' })} />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-3 md:flex md:items-end">
              <div className="w-full md:w-64 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('doctors.doctorLabel', { defaultValue: 'Provider' })}
                </label>
                <AsyncSearchableSelect
                  options={doctorOptions}
                  value={selectedDoctorId}
                  onChange={(val) => {
                    const nextDoctorId = val || '';
                    setSelectedDoctorIdState(nextDoctorId);
                    setPageState(1);
                    updateFiltersInUrl(nextDoctorId, fromDate, toDate, status, 1);
                  }}
                  placeholder={t('doctors.doctorPlaceholder', {
                    defaultValue: 'Select a provider',
                  })}
                  searchPlaceholder={t('sessions.filters.searchPlaceholder')}
                  onSearchChange={doctorLookup.setSearch}
                  hasMore={doctorLookup.hasNextPage}
                  onLoadMore={doctorLookup.fetchNextPage}
                  isLoading={doctorLookup.isLoading}
                  isLoadingMore={doctorLookup.isFetchingNextPage}
                  isError={doctorLookup.isError}
                  selectedOption={selectedDoctorOption}
                  emptyText={t('common.noData', { defaultValue: 'No data' })}
                  loadingText={t('common.loading')}
                  loadMoreText={t('common.loadMore', { defaultValue: 'Load more' })}
                  errorText={t('messages.errorOccurred')}
                />
              </div>

              <div className="w-full md:w-48 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('sessions.status')}
                </label>
                <SearchableSelect
                  options={statusOptions}
                  value={status}
                  onChange={(val) => {
                    const nextStatus = val || 'all';
                    setStatusState(nextStatus);
                    setPageState(1);
                    updateFiltersInUrl(selectedDoctorId, fromDate, toDate, nextStatus, 1);
                  }}
                  placeholder={t('sessions.filters.statusAll', {
                    defaultValue: 'All statuses',
                  })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('reports.from')}
                  </label>
                  <LocalizedDatePicker
                    id="fromDate"
                    value={fromDate}
                    onChange={(value) => {
                      const nextFrom = value || '';
                      setFromDateState(nextFrom);
                      setPageState(1);
                      updateFiltersInUrl(selectedDoctorId, nextFrom, toDate, status, 1);
                    }}
                    placeholder={t('reports.fromPlaceholder', {
                      defaultValue: 'From date',
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('reports.to')}
                  </label>
                  <LocalizedDatePicker
                    id="toDate"
                    value={toDate}
                    onChange={(value) => {
                      const nextTo = value || '';
                      setToDateState(nextTo);
                      setPageState(1);
                      updateFiltersInUrl(selectedDoctorId, fromDate, nextTo, status, 1);
                    }}
                    placeholder={t('reports.toPlaceholder', {
                      defaultValue: 'To date',
                    })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={!selectedDoctorId || isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : isError ? (
            <div className="py-6 text-center text-destructive">
              {t('messages.errorOccurred')}
            </div>
          ) : !selectedDoctorId ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              {t('doctors.selectDoctorHint', {
                defaultValue: 'Select a provider to view visits.',
              })}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              {t('sessions.noSessions')}
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={sessions}
                getRowId={(row) => row.id}
                onRowClick={(row) => navigate(`/sessions/${row.id}`)}
                direction={isRtl ? 'rtl' : 'ltr'}
                mobileCard={(row) => {
                  const date = row.sessionDate || row.date;

                  return (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {row.patient?.fullName || '--'}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.patient?.patientCode
                              ? `#${row.patient.patientCode}`
                              : t('patients.patientId')}
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {row.status ? t(`status.${row.status}`) : '--'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">
                            {t('sessions.date')}
                          </div>
                          <div className="mt-1 font-medium" dir="ltr">
                            {date ? formatDate(date, 'PP') : '--'}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            {t('sessions.scheduledTime', {
                              defaultValue: 'Scheduled time',
                            })}
                          </div>
                          <div className="mt-1 font-mono font-medium" dir="ltr">
                            {formatTimeTo12Hour(row.sessionTime)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            {t('sessions.arrivalTime')}
                          </div>
                          <div className="mt-1 font-mono font-medium" dir="ltr">
                            {formatTimeTo12Hour(row.arrivalTime)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            {t('payments.sessionCost', {
                              defaultValue: 'Visit cost',
                            })}
                          </div>
                          <div className="mt-1 font-medium">
                            {row.cost != null ? row.cost : '--'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <div className="mt-4 flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div className="space-y-2 w-full md:w-auto">
                  <div className="font-medium text-foreground mb-1">
                    {t('doctors.summaryTitle', { defaultValue: 'Summary' })}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-emerald-100 px-4 py-3 text-xs text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100">
                      <div className="text-lg uppercase tracking-wide opacity-80">
                        {t('doctors.totalSessions', { defaultValue: 'Total visits' })}
                      </div>
                      <div className="mt-1 text-base font-bold text-foreground">
                        {summary.totalSessions ?? totalSessions}
                      </div>
                    </div>
                    <div className="rounded-lg bg-sky-100 px-4 py-3 text-xs text-sky-900 dark:bg-sky-900/40 dark:text-sky-100">
                      <div className="text-lg uppercase tracking-wide opacity-80">
                        {t('doctors.completedSessions', {
                          defaultValue: 'Completed visits',
                        })}
                      </div>
                      <div className="mt-1 text-base font-bold text-foreground">
                        {summary.completedSessions ?? '--'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-amber-100 px-4 py-3 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                      <div className="text-lg uppercase tracking-wide opacity-80">
                        {t('doctors.cancelledSessions', {
                          defaultValue: 'Cancelled visits',
                        })}
                      </div>
                      <div className="mt-1 text-base font-bold text-foreground">
                        {summary.cancelledSessions ?? '--'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-indigo-100 px-4 py-3 text-xs text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100">
                      <div className="text-lg uppercase tracking-wide opacity-80">
                        {t('doctors.totalRevenue', { defaultValue: 'Total revenue' })}
                      </div>
                      <div className="mt-1 text-base font-bold text-foreground">
                        {summary.totalRevenue ?? '--'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span>
                    {t('common.paginationSummary', {
                      from: sessions.length ? (page - 1) * pageSize + 1 : 0,
                      to: (page - 1) * pageSize + sessions.length,
                      total: totalSessions,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => {
                        const nextPage = Math.max(1, page - 1);
                        setPageState(nextPage);
                        updateFiltersInUrl(selectedDoctorId, fromDate, toDate, status, nextPage);
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
                        updateFiltersInUrl(selectedDoctorId, fromDate, toDate, status, nextPage);
                      }}
                    >
                      {t('common.next')}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
