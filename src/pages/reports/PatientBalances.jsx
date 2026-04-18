import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Wallet } from 'lucide-react';
import { reportsApi } from '@/api/endpoints/reports';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
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

  const updateFiltersInUrl = (nextSearch, nextPage) => {
    const params = {};
    const trimmedSearch = nextSearch.trim();

    if (trimmedSearch) params.search = trimmedSearch;
    if (nextPage && nextPage !== 1) params.page = String(nextPage);

    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (previousDebouncedSearchRef.current === debouncedSearch) {
      return;
    }

    previousDebouncedSearchRef.current = debouncedSearch;
    setPageState(1);
    updateFiltersInUrl(debouncedSearch, 1);
  }, [debouncedSearch]);

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {t('reports.totalUnusedBalance', {
                defaultValue: 'Total Unused Balance',
              })}
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(summary.totalUnusedBalance ?? 0)}
            </div>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70">
              {t('reports.positiveBalancesOnly', {
                defaultValue: 'Positive patient balances only',
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('reports.patientsWithUnusedBalance', {
                defaultValue: 'Patients With Unused Balance',
              })}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.patientsWithUnusedBalance ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reports.clickRowToOpenBalanceLogs', {
                defaultValue: 'Click any row to open that patient balance log.',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('reports.searchPatientsWithBalance', {
                defaultValue: 'Search by patient name or code',
              })}
            />

            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? (
                <LoadingSpinner size="sm" />
              ) : (
                t('common.refresh', { defaultValue: 'Refresh' })
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('reports.unusedBalanceReportTable', {
              defaultValue: 'Patients with unused balance',
            })}
          </CardTitle>
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
