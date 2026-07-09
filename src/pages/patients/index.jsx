import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { usePatients, useCreatePatient, useDeletePatient } from '@/hooks/usePatients';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/constants';
import { PatientForm } from './PatientForm';
import { ExistingPatientIntake } from './ExistingPatientIntake';
import { Loader2, Plus, RefreshCcw, Trash2, BellRing, CircleOff, UserPlus } from 'lucide-react';

export default function PatientsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, canAny } = usePermissions();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [intakeMode, setIntakeMode] = useState('new');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const debouncedSearch = useDebounce(search, 400);

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, refetch } = usePatients({
    search: debouncedSearch,
    page,
    limit: pageSize,
  });
  const createPatient = useCreatePatient();
  const deletePatient = useDeletePatient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);

  const canDelete = hasPermission(PERMISSIONS['patients:delete']);

  const canView = canAny([
    PERMISSIONS['patients:viewAll'],
    PERMISSIONS['patients:viewAssigned'],
  ]);

  if (!canView) {
    return <Navigate to="/unauthorized" replace />;
  }

  const columns = useMemo(
    () => [
      {
        key: 'patientCode',
        header: t('patients.patientId'),
        cell: (row) => row.patientCode || '--',
      },
      {
        key: 'fullName',
        header: t('patients.fullName'),
        className: 'w-[25%]',
        cellClassName: 'font-medium',
        cell: (row) => (
          <span className="flex items-center gap-1">
            {row.fullName}
            {row.sessionsUntilReassessment === 0 && (
              <span
            className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50"
              >
                <BellRing
              className="h-4 w-4 text-sky-500 dark:text-sky-400 flex-shrink-0"
                  aria-hidden="true"
                  title={t('patients.reassessmentDue', { defaultValue: 'Reassessment due' })}
                />
              </span>
            )}
            {row.isBalanceExhaustedAfterUse && (
              <span
                className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50"
              >
                <CircleOff
                  className="h-4 w-4 text-sky-600 dark:text-sky-300"
                  aria-hidden="true"
                  title={t('patients.balanceExhaustedAfterUse', {
                    defaultValue: 'Previously had balance, now exhausted',
                  })}
                />
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'phone',
        header: t('patients.phone'),
        cell: (row) => row.phone || '--',
      },
      {
        key: 'category',
        header: t('patients.category', { defaultValue: 'Category' }),
        cell: (row) => row.category?.name || '--',
      },
      {
        key: 'primaryBranch',
        header: t('patients.primaryBranch', { defaultValue: 'Primary branch' }),
        cell: (row) => row.primaryBranch?.name || '--',
      },
      {
        key: 'job',
        header: t('patients.job', { defaultValue: 'Job' }),
        cell: (row) => row.job || '--',
      },
      {
        key: 'age',
        header: t('patients.age'),
        cell: (row) => (row.age != null ? row.age : '--'),
      },
      ...(canDelete
        ? [
            {
              key: 'actions',
              header: '',
              className: 'w-[60px] text-end',
              cellClassName: 'text-end',
              cell: (row) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPatientToDelete(row);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ),
            },
          ]
        : []),
    ],
    [t, canDelete]
  );

  const patients = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.patients)) return data.patients;
    return [];
  }, [data]);

  const totalPatients = data?.total ?? data?.meta?.total ?? patients.length;
  const totalPages = totalPatients ? Math.ceil(totalPatients / pageSize) : 1;

  const handleCreate = (values) => {
    createPatient.mutate(values, {
      onSuccess: () => {
        setShowForm(false);
      },
    });
  };

  const handleCreateToggle = () => {
    setShowForm((prev) => {
      const next = !prev;
      if (next) {
        setIntakeMode('new');
      }
      return next;
    });
  };

  const handleConfirmDelete = () => {
    if (!patientToDelete) return;
    deletePatient.mutate(patientToDelete.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setPatientToDelete(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('patients.title')}
        actions={
          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('patients.searchPlaceholder')}
            />
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {hasPermission(PERMISSIONS['patients:create']) && (
              <Button onClick={handleCreateToggle}>
                <Plus className="mr-2 h-4 w-4" />
                {t('patients.createPatient')}
              </Button>
            )}
          </div>
        }
      />

      {showForm && hasPermission(PERMISSIONS['patients:create']) && (
        <div className="space-y-3">
          <div className="inline-flex rounded-md border bg-background p-1">
            <Button
              type="button"
              size="sm"
              variant={intakeMode === 'new' ? 'default' : 'ghost'}
              onClick={() => setIntakeMode('new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('patients.newPatient')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={intakeMode === 'existing' ? 'default' : 'ghost'}
              onClick={() => setIntakeMode('existing')}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              {t('patients.existingPatient')}
            </Button>
          </div>

          {intakeMode === 'new' ? (
            <PatientForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isSubmitting={createPatient.isPending}
            />
          ) : (
            <ExistingPatientIntake
              onCancel={() => setShowForm(false)}
              onAttached={(patient) => {
                setShowForm(false);
                if (patient?.id) {
                  navigate(`/patients/${patient.id}`);
                }
              }}
            />
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-destructive">{t('messages.errorOccurred')}</div>
          ) : patients.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">{t('patients.noPatients')}</div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={patients}
                getRowId={(row) => row.id}
                direction={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                onRowClick={(row) => navigate(`/patients/${row.id}`)}
              />
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <span>
                  {t('common.paginationSummary', {
                    from: patients.length ? (page - 1) * pageSize + 1 : 0,
                    to: (page - 1) * pageSize + patients.length,
                    total: totalPatients,
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
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPatientToDelete(null);
          }
          setDeleteDialogOpen(open);
        }}
        title={t('patients.deleteTitle')}
        description={t('patients.deleteDescription')}
        onConfirm={handleConfirmDelete}
        isLoading={deletePatient.isPending}
      />
    </div>
  );
}
