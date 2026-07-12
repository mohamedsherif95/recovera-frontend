import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { usePatients, useCreatePatient, useDeletePatient } from '@/hooks/usePatients';
import { useDebounce } from '@/hooks/useDebounce';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/constants';
import { useActiveBranchProfiles } from '@/hooks/useActiveBranchProfiles';
import { CLINIC_PROFILE_WORKFLOWS } from '@/lib/clinicProfiles';
import { PatientForm } from './PatientForm';
import { ExistingPatientIntake } from './ExistingPatientIntake';
import {
  BellRing,
  CircleOff,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCcw,
  Trash2,
  UserPlus,
} from 'lucide-react';

function IntakeModeButton({ active, description, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      className={[
        'flex min-h-[88px] min-w-0 flex-1 items-start gap-3 rounded-md border p-3 text-start transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-primary bg-primary/10 text-primary shadow-sm'
          : 'border-border bg-background hover:bg-muted/50',
      ].join(' ')}
      onClick={onClick}
      aria-pressed={active}
    >
      <span
        className={[
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        ].join(' ')}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

export default function PatientsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission, canAny } = usePermissions();
  const { supportsWorkflow, enabledProfiles } = useActiveBranchProfiles();
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
  const supportsVisitCategories = supportsWorkflow(
    CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
  );
  const supportsAssessmentTracking = supportsWorkflow(
    CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
  );
  const supportsTreatmentPackages = supportsWorkflow(
    CLINIC_PROFILE_WORKFLOWS.TREATMENT_PACKAGES,
  );
  const showPhysiotherapyPatientSettings = Boolean(
    supportsVisitCategories ||
      supportsAssessmentTracking ||
      supportsTreatmentPackages,
  );

  const canView = canAny([
    PERMISSIONS['patients:viewAll'],
    PERMISSIONS['patients:viewAssigned'],
  ]);

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
            {supportsAssessmentTracking && row.sessionsUntilReassessment === 0 && (
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
            {supportsTreatmentPackages && row.isBalanceExhaustedAfterUse && (
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
      ...(supportsVisitCategories
        ? [
            {
              key: 'category',
              header: t('patients.category', { defaultValue: 'Category' }),
              cell: (row) => row.category?.name || '--',
            },
          ]
        : []),
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
    [t, canDelete, supportsAssessmentTracking, supportsTreatmentPackages, supportsVisitCategories]
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
  const branchLinkedRows = patients.filter((patient) => patient.primaryBranch?.name).length;
  const enabledProfileCount = Array.isArray(enabledProfiles) ? enabledProfiles.length : 0;

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

  if (!canView) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('patients.title')}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('patients.searchPlaceholder')}
              className="w-full sm:w-72"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              aria-label={t('common.refresh', { defaultValue: 'Refresh' })}
              className="w-full sm:w-auto"
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {hasPermission(PERMISSIONS['patients:create']) && (
              <Button onClick={handleCreateToggle} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t('patients.createPatient')}
              </Button>
            )}
          </div>
        }
      />

      <ImpactPanel
        icon={ClipboardList}
        title={t('patients.intakeDeskTitle')}
        description={t('patients.intakeDeskDescription')}
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <ImpactMetric
            label={t('patients.directoryMetricTotal')}
            value={totalPatients}
          />
          <ImpactMetric
            label={t('patients.directoryMetricBranchLinked')}
            value={`${branchLinkedRows}/${patients.length || 0}`}
          />
          <ImpactMetric
            label={t('patients.directoryMetricProfiles')}
            value={enabledProfileCount || '--'}
          />
        </div>
      </ImpactPanel>

      {showForm && hasPermission(PERMISSIONS['patients:create']) && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <IntakeModeButton
              active={intakeMode === 'new'}
              icon={Plus}
              label={t('patients.newPatient')}
              description={t('patients.newPatientIntakeDescription')}
              onClick={() => setIntakeMode('new')}
            />
            <IntakeModeButton
              active={intakeMode === 'existing'}
              icon={UserPlus}
              label={t('patients.existingPatient')}
              description={t('patients.existingPatientIntakeDescription')}
              onClick={() => setIntakeMode('existing')}
            />
          </div>

          {intakeMode === 'new' ? (
            <PatientForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isSubmitting={createPatient.isPending}
              showPhysiotherapySettings={showPhysiotherapyPatientSettings}
              intakeContext="new"
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
                mobileCard={(row) => (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{row.patientCode || '--'}</Badge>
                          {supportsAssessmentTracking && row.sessionsUntilReassessment === 0 && (
                            <Badge variant="secondary">
                              {t('patients.reassessmentDue')}
                            </Badge>
                          )}
                          {supportsTreatmentPackages && row.isBalanceExhaustedAfterUse && (
                            <Badge variant="secondary">
                              {t('patients.balanceExhaustedAfterUse')}
                            </Badge>
                          )}
                        </div>
                        <div className="break-words text-base font-semibold">
                          {row.fullName}
                        </div>
                      </div>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPatientToDelete(row);
                            setDeleteDialogOpen(true);
                          }}
                          aria-label={t('patients.deleteTitle')}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                      <span className="min-w-0">
                        {t('patients.phone')}: {row.phone || '--'}
                      </span>
                      <span>
                        {t('patients.age')}: {row.age != null ? row.age : '--'}
                      </span>
                      {supportsVisitCategories && (
                        <span className="min-w-0">
                          {t('patients.category', { defaultValue: 'Category' })}:{' '}
                          {row.category?.name || '--'}
                        </span>
                      )}
                      <span className="min-w-0">
                        {t('patients.primaryBranch', { defaultValue: 'Primary branch' })}:{' '}
                        {row.primaryBranch?.name || '--'}
                      </span>
                    </div>
                    {row.job && (
                      <div className="text-xs text-muted-foreground">
                        {t('patients.job', { defaultValue: 'Job' })}: {row.job}
                      </div>
                    )}
                  </div>
                )}
                mobileCardClassName="p-3"
              />
              <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {t('common.paginationSummary', {
                    from: patients.length ? (page - 1) * pageSize + 1 : 0,
                    to: (page - 1) * pageSize + patients.length,
                    total: totalPatients,
                  })}
                </span>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
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
