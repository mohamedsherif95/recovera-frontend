import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LocalizedDatePicker } from '@/components/common/LocalizedDatePicker';
import { AsyncSearchableSelect } from '@/components/common/AsyncSearchableSelect';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DataTable } from '@/components/common/DataTable';
import { reportsApi } from '@/api/endpoints/reports';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { usePatientLookupOptions } from '@/hooks/useLookupOptions';

export default function PatientPaymentsReportPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedPatientId, setSelectedPatientIdState] = useState(() => {
    return searchParams.get('patientId') || '';
  });

  const [fromDate, setFromDateState] = useState(() => {
    return searchParams.get('from') || '';
  });

  const [toDate, setToDateState] = useState(() => {
    return searchParams.get('to') || '';
  });

  const [page, setPageState] = useState(() => {
    const raw = searchParams.get('page');
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  });
  const pageSize = 10;

  const updateFiltersInUrl = (nextPatientId, nextFromDate, nextToDate, nextPage) => {
    const params = {};
    if (nextPatientId) params.patientId = nextPatientId;
    if (nextFromDate) params.from = nextFromDate;
    if (nextToDate) params.to = nextToDate;
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

  const canFetch = Boolean(selectedPatientId);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'patient-payments-report',
      { patientId: selectedPatientId, fromDate, toDate, page, limit: pageSize },
    ],
    queryFn: () =>
      reportsApi.getPatientPayments({
        patientId: selectedPatientId || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        limit: pageSize,
      }),
    enabled: canFetch,
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const payments = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.payments)) return data.payments;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

  const totalPayments = data?.total ?? data?.meta?.total ?? payments.length;
  const totalPages = totalPayments ? Math.ceil(totalPayments / pageSize) : 1;

  const columns = useMemo(
    () => [
      {
        key: 'amount',
        header: t('payments.amount'),
        cell: (row) => (row.amount != null ? formatCurrency(row.amount) : '--'),
      },
      {
        key: 'paymentDate',
        header: t('payments.paymentDate'),
        cell: (row) => (row.paymentDate ? formatDate(row.paymentDate, 'PP') : '--'),
      },
      {
        key: 'method',
        header: t('payments.method'),
        cell: (row) => row.paymentMethod || row.method || '--',
      },
      {
        key: 'referenceNumber',
        header: t('payments.referenceNumber'),
        cell: (row) => row.referenceNumber || '--',
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
        key: 'sessionPaidInFull',
        header: t('payments.sessionPaidInFull', { defaultValue: 'Session fully paid' }),
        cell: (row) =>
          row.sessionPaidInFull != null
            ? row.sessionPaidInFull
              ? t('common.yes')
              : t('common.no')
            : '--',
      },
      {
        key: 'sessionRemaining',
        header: t('payments.sessionRemaining', { defaultValue: 'Session remaining' }),
        cell: (row) =>
          row.sessionRemaining != null
            ? formatCurrency(row.sessionRemaining)
            : '--',
      },
      {
        key: 'recordedBy',
        header: t('payments.recordedBy', { defaultValue: 'Recorded by' }),
        cell: (row) => row.recordedBy?.fullName || row.recordedByName || '--',
      },
      {
        key: 'notes',
        header: t('sessions.notes'),
        cell: (row) => row.notes || '--',
      },
    ],
    [t]
  );

  const isRtl = i18n.language === 'ar';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.patientPaymentsTitle', { defaultValue: 'Patient payments' })}
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="w-full md:w-72 space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('payments.patientLabel', { defaultValue: 'Patient' })}
                </label>
                <SearchableSelect
                  options={patientOptions}
                  value={selectedPatientId}
                  onChange={(val) => {
                    const nextPatientId = val || '';
                    setSelectedPatientIdState(nextPatientId);
                    setPageState(1);
                    updateFiltersInUrl(nextPatientId, fromDate, toDate, 1);
                  }}
                  placeholder={t('payments.patientPlaceholder', {
                    defaultValue: 'Select a patient',
                  })}
                  disabled={patientsQuery.isLoading}
                />
              </div>

              <div className="flex gap-3">
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
                      updateFiltersInUrl(selectedPatientId, nextFrom, toDate, 1);
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
                      updateFiltersInUrl(selectedPatientId, fromDate, nextTo, 1);
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
                size="sm"
                onClick={() => refetch()}
                disabled={!selectedPatientId || isFetching}
              >
                {isFetching ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <span className="text-xs">{t('common.refresh', { defaultValue: 'Refresh' })}</span>
                )}
              </Button>
            </div>
          </div>

          {!selectedPatientId ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              {t('payments.selectPatientHint', {
                defaultValue: 'Select a patient to view payments history.',
              })}
            </div>
          ) : isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : isError ? (
            <div className="py-6 text-center text-destructive">
              {t('messages.errorOccurred')}
            </div>
          ) : payments.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              {t('payments.noPaymentsForPatient', {
                defaultValue: 'No payments found for this patient.',
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
                    total: totalPayments,
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
                      updateFiltersInUrl(selectedPatientId, fromDate, toDate, nextPage);
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
                      updateFiltersInUrl(selectedPatientId, fromDate, toDate, nextPage);
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
