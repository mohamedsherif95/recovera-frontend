import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { LocalizedDatePicker } from '@/components/common/LocalizedDatePicker';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useSessions, useCreateSession, useSessionCategories, useDeleteSession } from '@/hooks/useSessions';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS, USER_ROLES, SESSION_STATUS } from '@/lib/constants';
import { formatDate, formatTimeTo12Hour, formatTimeWithDate } from '@/lib/utils';
import { Loader2, RefreshCcw, Trash2, Stethoscope, BellRing, ClipboardCheck } from 'lucide-react';
import { SessionForm } from './SessionForm';
import { useAuthStore } from '@/store/authStore';

export default function SessionsPage() {
  const { t, i18n } = useTranslation();
  const { canAny, can } = usePermissions();
  const { hasAnyRole } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialFromState = location.state || {};
  const initialFilters = initialFromState.initialFilters || {};
  const lockDoctor = !!initialFromState.initialDoctorId;

  const returnDate = searchParams.get('returnDate');
  const returnShift = searchParams.get('returnShift');

  const canView = canAny([
    PERMISSIONS['sessions:viewAll'],
    PERMISSIONS['sessions:viewOwn'],
  ]);

  if (!canView) {
    return <Navigate to="/unauthorized" replace />;
  }

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState(initialFilters.status ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [fromDate, setFromDate] = useState(initialFilters.fromDate ?? todayIso);
  const [toDate, setToDate] = useState(initialFilters.toDate ?? todayIso);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, statusFilter, categoryFilter, debouncedSearch]);

  const canSeeFinancialAndCategory = hasAnyRole([
    USER_ROLES.MANAGER,
    USER_ROLES.SECRETARY,
  ]);

  const { data, isLoading, isError, refetch } = useSessions({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    categoryId: categoryFilter !== 'all' ? Number(categoryFilter) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const categoriesQuery = useSessionCategories();

  const categoryOptions = useMemo(() => {
    const data = categoriesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.categories)) return data.categories;
    return [];
  }, [categoriesQuery.data]);

  const createSession = useCreateSession();

  const handleCancelForm = () => {
    if (returnDate) {
      const params = new URLSearchParams();
      params.set('date', returnDate);
      if (returnShift) {
        params.set('shift', returnShift);
      }
      navigate(`/daily-operations?${params.toString()}`);
    } else {
      setShowForm(false);
    }
  };

  const initialFormValues = useMemo(
    () => ({
      doctorId: initialFromState.initialDoctorId ?? undefined,
      patientId: undefined,
      sessionDate: initialFromState.initialDate ?? '',
      sessionTime: initialFromState.initialSlot ?? '',
      cost: undefined,
      doctorName: initialFromState.initialDoctorName ?? undefined,
      isAssessment: false,
    }),
    [initialFromState]
  );

  const [showForm, setShowForm] = useState(
    !!(
      initialFromState.initialDoctorId ||
      initialFromState.initialDate ||
      initialFromState.initialSlot
    )
  );

  const sessions = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.sessions)) return data.sessions;
    return [];
  }, [data]);

  const totalSessions = data?.total ?? data?.meta?.total ?? sessions.length;
  const totalPages = totalSessions ? Math.ceil(totalSessions / pageSize) : 1;

  const statusOptions = useMemo(() => {
    return Object.values(SESSION_STATUS);
  }, []);

  const deleteSession = useDeleteSession();
  const isAdmin = hasAnyRole([USER_ROLES.MANAGER]);
  const [sessionPendingDelete, setSessionPendingDelete] = useState(null);

  const handleConfirmDelete = () => {
    if (!sessionPendingDelete) return;
    deleteSession.mutate(sessionPendingDelete.id, {
      onSuccess: () => {
        setSessionPendingDelete(null);
      },
      onError: () => {
        setSessionPendingDelete(null);
      },
    });
  };

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
        cell: (row) => (
          <span className="flex items-center gap-2">
            {row.patient?.fullName || '--'}
            {row.patient?.sessionsUntilReassessment === 0 &&
              !row.isAssessment &&
              !row.isReassessment && (
              <BellRing
            className="h-4 w-4 text-sky-500 dark:text-sky-400 flex-shrink-0"
                aria-hidden="true"
                title={t('patients.reassessmentDue', { defaultValue: 'Reassessment due' })}
              />
            )}
          </span>
        ),
      },
      {
        key: 'doctor',
        header: t('sessions.doctor'),
        cell: (row) => row.doctor?.fullName || '--',
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
        cell: (row) => (
          <div className="flex items-center gap-2">
            <span>{t(`status.${row.status}`)}</span>
            {row.isReassessment ? (
              <Badge className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-teal-200 bg-teal-100 p-0 text-teal-800 dark:border-teal-800 dark:bg-teal-900/40 dark:text-teal-100">
                <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
              </Badge>
            ) : row.isAssessment ? (
              <Badge className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-purple-200 bg-purple-100 p-0 text-purple-800 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-100">
                <Stethoscope className="h-3 w-3" aria-hidden="true" />
              </Badge>
            ) : null}
          </div>
        ),
      },
      ...(canSeeFinancialAndCategory
        ? [
            {
              key: 'category',
              header: t('sessions.category', { defaultValue: 'Category' }),
              cell: (row) => row.category?.name || '--',
            },
            {
              key: 'cost',
              header: t('sessions.cost'),
              cell: (row) => (row.cost != null ? row.cost : '--'),
            },
          ]
        : []),
      ...(isAdmin
        ? [
            {
              key: 'actions',
              header: '',
              className: 'w-[80px]',
              cell: (row) => (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessionPendingDelete(row);
                    }}
                    disabled={deleteSession.isPending}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t('common.delete')}</span>
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [t, canSeeFinancialAndCategory, isAdmin, deleteSession.isPending]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('sessions.title')}
        onBack={returnDate ? handleCancelForm : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {can(PERMISSIONS['sessions:create']) && (
              <Button onClick={() => setShowForm((prev) => !prev)}>
                {t('sessions.createSession')}
              </Button>
            )}
          </div>
        }
      />

      {showForm && can(PERMISSIONS['sessions:create']) && (
        <SessionForm
          initialValues={initialFormValues}
          lockDoctor={lockDoctor}
          onSubmit={(values) =>
            createSession.mutate(values, {
              onSuccess: () => {
                if (returnDate) {
                  const params = new URLSearchParams();
                  params.set('date', returnDate);
                  if (returnShift) {
                    params.set('shift', returnShift);
                  }
                  navigate(`/daily-operations?${params.toString()}`);
                } else {
                  setShowForm(false);
                }
              },
            })
          }
          onCancel={handleCancelForm}
          isSubmitting={createSession.isPending}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder={t('sessions.filters.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 max-w-xs"
            />
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{t('sessions.filters.statusLabel')}</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue placeholder={t('sessions.filters.statusAll')} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="all">{t('sessions.filters.statusAll')}</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canSeeFinancialAndCategory && (
                <div className="flex items-center gap-2">
                  <span>
                    {t('sessions.filters.categoryLabel', { defaultValue: 'Category' })}
                  </span>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 w-[160px]">
                      <SelectValue
                        placeholder={t('sessions.filters.categoryAll', {
                          defaultValue: 'All categories',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">
                        {t('sessions.filters.categoryAll', {
                          defaultValue: 'All categories',
                        })}
                      </SelectItem>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span>{t('sessions.filters.fromDateLabel', { defaultValue: 'From' })}</span>
                <LocalizedDatePicker
                  id="sessions-from-date"
                  value={fromDate}
                  onChange={(value) => setFromDate(value || '')}
                  className="w-[160px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <span>{t('sessions.filters.toDateLabel', { defaultValue: 'To' })}</span>
                <LocalizedDatePicker
                  id="sessions-to-date"
                  value={toDate}
                  onChange={(value) => setToDate(value || '')}
                  className="w-[160px]"
                />
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-destructive">{t('messages.errorOccurred')}</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">{t('sessions.noSessions')}</div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={sessions}
                getRowId={(row) => row.id}
                onRowClick={(row) => navigate(`/sessions/${row.id}`)}
                direction={i18n.language === 'ar' ? 'rtl' : 'ltr'}
              />
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
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
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        title={t('sessions.deleteTitle', { defaultValue: 'Delete session' })}
        description={t('sessions.deleteDescription', {
          defaultValue: 'Are you sure you want to delete this session? This action cannot be undone.',
        })}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        open={!!sessionPendingDelete}
        onOpenChange={(open) => {
          if (!open) setSessionPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        confirmProps={{ variant: 'destructive', disabled: deleteSession.isPending }}
      />
    </div>
  );
}
