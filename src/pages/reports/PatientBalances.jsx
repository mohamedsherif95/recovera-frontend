import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RefreshCw, Wallet } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DataTable } from '@/components/common/DataTable';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function PatientBalancesReportPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [page, setPageState] = useState(() => {
    const raw = searchParams.get('page');
    const parsed = raw ? Number.parseInt(raw, 10) : 1;
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  });
  const pageSize = 10;
  const debouncedSearch = useDebounce(search, 400);
  const previousDebouncedSearchRef = useRef(debouncedSearch);
  const isRtl = i18n.language === 'ar';

  const updateFiltersInUrl = useCallback((nextSearch, nextPage) => {
    const params = {};
    const trimmedSearch = nextSearch.trim();

    if (trimmedSearch) params.search = trimmedSearch;
    if (nextPage && nextPage !== 1) params.page = String(nextPage);

    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    if (previousDebouncedSearchRef.current === debouncedSearch) {
      return;
    }

    previousDebouncedSearchRef.current = debouncedSearch;
    setPageState(1);
    updateFiltersInUrl(debouncedSearch, 1);
  }, [debouncedSearch, updateFiltersInUrl]);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'patient-balances-report',
      {
        search: debouncedSearch,
        page,
        limit: pageSize,
      },
    ],
    queryFn: () =>
      reportsApi.getPatientBalancesReport({
        search: debouncedSearch || undefined,
        page,
        limit: pageSize,
      }),
    keepPreviousData: true,
    staleTime: 60 * 1000,
  });

  const rows = useMemo(() => {
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);

  const summary = data?.summary || {
    totalUnusedBalance: 0,
    patientsWithUnusedBalance: 0,
  };
  const total = data?.meta?.total ?? rows.length;
  const totalPages = Math.max(data?.meta?.totalPages ?? 0, 1);

  const columns = useMemo(
    () => [
      {
        key: 'patientCode',
        header: t('patients.patientId'),
        cell: (row) => row.patientCode || '--',
      },
      {
        key: 'patientName',
        header: t('patients.patient'),
        cellClassName: 'font-medium',
        cell: (row) => row.patientName || '--',
      },
      {
        key: 'balance',
        header: t('reports.currentUnusedBalance', {
          defaultValue: 'Current unused balance',
        }),
        cell: (row) => (
          <span className="font-medium text-emerald-700 dark:text-emerald-300">
            {formatCurrency(row.balance ?? 0)}
          </span>
        ),
      },
      {
        key: 'lastBalanceActivityAt',
        header: t('reports.lastBalanceActivity', {
          defaultValue: 'Last balance activity',
        }),
        cell: (row) =>
          row.lastBalanceActivityAt
            ? formatDateTime(row.lastBalanceActivityAt, 'PP p')
            : '--',
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.patientBalancesTitle', {
          defaultValue: 'Patient Unused Balances',
        })}
        description={t('reports.patientBalancesDescription', {
          defaultValue: 'Patients with positive unused balance in the system.',
        })}
        onBack={() => navigate('/patient-payments')}
      />

      <ImpactPanel
        icon={Wallet}
        tone="commercial"
        title={t('reports.balanceWorkbenchTitle', {
          defaultValue: 'Unused balance workbench',
        })}
        description={t('reports.balanceWorkbenchDescription', {
          defaultValue:
            'Track patient credit that is still available, then open the balance log when a front-desk or finance question needs context.',
        })}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <ImpactMetric
            label={t('reports.totalUnusedBalance', {
              defaultValue: 'Total Unused Balance',
            })}
            value={formatCurrency(summary.totalUnusedBalance ?? 0)}
          />
          <ImpactMetric
            label={t('reports.patientsWithUnusedBalance', {
              defaultValue: 'Patients With Unused Balance',
            })}
            value={summary.patientsWithUnusedBalance ?? 0}
          />
          <ImpactMetric
            label={t('reports.resultsMetric', { defaultValue: 'Results' })}
            value={total}
          />
        </div>
      </ImpactPanel>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('reports.balanceFiltersTitle', {
              defaultValue: 'Balance filters',
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <SearchInput
              className="max-w-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('reports.searchPatientsWithBalance', {
                defaultValue: 'Search by patient name or code',
              })}
            />

            <Button
              variant="outline"
              size="sm"
              className="justify-center"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <RefreshCw className="me-2 h-4 w-4" />
                  {t('common.refresh', { defaultValue: 'Refresh' })}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {t('reports.unusedBalanceReportTable', {
              defaultValue: 'Patients with unused balance',
            })}
          </CardTitle>
          <Badge variant="secondary" className="w-fit">
            {t('reports.resultCount', {
              count: total,
              defaultValue: '{{count}} results',
            })}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : isError ? (
            <div className="py-6 text-center text-destructive">
              {t('messages.errorOccurred')}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">
              {t('reports.noPatientBalancesFound', {
                defaultValue: 'No patients with unused balance found.',
              })}
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={rows}
                getRowId={(row) => row.patientId}
                onRowClick={(row) =>
                  navigate(`/patients/${row.patientId}?section=balance-logs`)
                }
                direction={isRtl ? 'rtl' : 'ltr'}
                mobileCard={(row) => (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Badge variant="outline" className="mb-2 max-w-full">
                          {row.patientCode || '--'}
                        </Badge>
                        <div className="break-words font-semibold">
                          {row.patientName || '--'}
                        </div>
                      </div>
                      <div className="shrink-0 text-end font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(row.balance ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      {t('reports.lastBalanceActivity', {
                        defaultValue: 'Last balance activity',
                      })}
                      :{' '}
                      {row.lastBalanceActivityAt
                        ? formatDateTime(row.lastBalanceActivityAt, 'PP p')
                        : '--'}
                    </div>
                  </div>
                )}
              />

              <div className="mt-4 flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                <div>
                  {t('common.paginationSummary', {
                    from: rows.length ? (page - 1) * pageSize + 1 : 0,
                    to: (page - 1) * pageSize + rows.length,
                    total,
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
                      updateFiltersInUrl(debouncedSearch, nextPage);
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
                    disabled={page >= totalPages}
                    onClick={() => {
                      const nextPage = Math.min(totalPages, page + 1);
                      setPageState(nextPage);
                      updateFiltersInUrl(debouncedSearch, nextPage);
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
