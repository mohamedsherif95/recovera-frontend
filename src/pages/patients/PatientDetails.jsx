import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import {
  usePatient,
  usePatientSessionsInfinite,
  useUpdatePatient,
  useUpdatePatientHistory,
  useUpdatePatientPrograms,
  useCreatePackageTransaction,
  usePatientBalanceLogs,
} from '@/hooks/usePatients';
import { useBranches } from '@/hooks/useBranches';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS, USER_ROLES } from '@/lib/constants';
import { PatientForm } from './PatientForm';
import { SessionForm } from '../sessions/SessionForm';
import { useCreateSession } from '@/hooks/useSessions';
import { formatDate, formatDateTime, formatTimeWithDate } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { BellRing, Stethoscope, ClipboardCheck, Wallet, CircleOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUIStore } from '@/store/uiStore';
import { resolveEffectiveClinicId } from '@/lib/branchScope';

export default function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { hasAnyPermission, hasPermission, currentUser } = usePermissions();
  const { clinicOverrideId } = useUIStore();
  const [isEditing, setIsEditing] = useState(false);
  const updatePatient = useUpdatePatient();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [reassessmentCycleLength, setReassessmentCycleLength] = useState('');
  const updatePatientHistory = useUpdatePatientHistory();
  const [isEditingPrograms, setIsEditingPrograms] = useState(false);
  const [programItems, setProgramItems] = useState([]);
  const updatePatientPrograms = useUpdatePatientPrograms();
  const [addBalanceAmount, setAddBalanceAmount] = useState('');
  const [addBalanceNote, setAddBalanceNote] = useState('');
  const [setBalanceAmount, setSetBalanceAmount] = useState('');
  const [setBalanceNote, setSetBalanceNote] = useState('');
  const [addRemainingAmount, setAddRemainingAmount] = useState('');
  const [addRemainingNote, setAddRemainingNote] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [balanceLogsPage, setBalanceLogsPage] = useState(1);
  const balanceLogsSectionRef = useRef(null);
  const hasScrolledToBalanceLogsRef = useRef(false);
  const createPackageTransaction = useCreatePackageTransaction();
  const effectiveClinicId = resolveEffectiveClinicId(currentUser, clinicOverrideId);

  const canView = hasAnyPermission([
    PERMISSIONS['patients:viewAll'],
    PERMISSIONS['patients:viewAssigned'],
  ]);

  const {
    data: patient,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = usePatient(id);
  const { data: branchesData } = useBranches({
    enabled: Boolean(effectiveClinicId),
  });
  const isDoctorOnly = useMemo(() => {
    const roles = currentUser?.roles?.map((role) => role?.name?.toLowerCase()) || [];
    return roles.length > 0 && roles.every((role) => role === USER_ROLES.DOCTOR);
  }, [currentUser]);
  const branches = useMemo(() => {
    if (Array.isArray(branchesData)) return branchesData;
    if (Array.isArray(branchesData?.data)) return branchesData.data;
    return [];
  }, [branchesData]);
  const branchOptions = useMemo(
    () =>
      branches.map((branch) => ({
        value: String(branch.id),
        label: branch.name,
      })),
    [branches],
  );
  const canViewBalanceLogs = !isDoctorOnly && hasPermission(PERMISSIONS['patients:viewAll']);

  const {
    data: balanceLogsData,
    isLoading: isBalanceLogsLoading,
  } = usePatientBalanceLogs(
    id,
    {
      page: balanceLogsPage,
      limit: 10,
    },
    {
      enabled: Boolean(id) && canViewBalanceLogs,
    },
  );

  const canCreateSession = hasPermission(PERMISSIONS['sessions:create']);
  const createSession = useCreateSession();

  const canEdit = useMemo(
    () =>
      hasPermission(PERMISSIONS['patients:update']) ||
      hasPermission(PERMISSIONS['patients:updateAssigned']),
    [hasPermission]
  );
  const currentBalance = Number(patient?.balance ?? 0);
  const currentRemainingAmount = Number(patient?.packageRemainingAmount ?? 0);

  const handleStartEditHistory = () => {
    setHistoryItems(currentHistoryItems.length ? currentHistoryItems : ['']);
    const nextCycleLength = patient?.reassessmentCycleLength;
    setReassessmentCycleLength(
      nextCycleLength === null || nextCycleLength === undefined ? '' : String(nextCycleLength),
    );
    setIsEditingHistory(true);
  };

  const handleChangeHistoryItem = (index, value) => {
    setHistoryItems((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddHistoryItem = () => {
    setHistoryItems((prev) => [...prev, '']);
  };

  const handleRemoveHistoryItem = (index) => {
    setHistoryItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveHistory = () => {
    const cleaned = historyItems
      .map((item) => (item == null ? '' : item.trim()))
      .filter((item) => item.length > 0);

    const parsedCycleLength = reassessmentCycleLength === ''
      ? null
      : Number.parseInt(reassessmentCycleLength, 10);

    updatePatientHistory.mutate(
      {
        patientId: id,
        data: {
          medicalHistory: cleaned,
          reassessmentCycleLength:
            parsedCycleLength === null || Number.isNaN(parsedCycleLength)
              ? null
              : parsedCycleLength,
        },
      },
      {
        onSuccess: () => {
          setIsEditingHistory(false);
        },
      }
    );
  };

  const handleStartEditPrograms = () => {
    setProgramItems(currentProgramItems.length ? currentProgramItems : ['']);
    setIsEditingPrograms(true);
  };

  const handleChangeProgramItem = (index, value) => {
    setProgramItems((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddProgramItem = () => {
    setProgramItems((prev) => [...prev, '']);
  };

  const handleRemoveProgramItem = (index) => {
    setProgramItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePrograms = () => {
    const cleaned = programItems
      .map((item) => (item == null ? '' : item.trim()))
      .filter((item) => item.length > 0);

    updatePatientPrograms.mutate(
      {
        patientId: id,
        data: { programs: cleaned },
      },
      {
        onSuccess: () => {
          setIsEditingPrograms(false);
        },
      }
    );
  };

  const submitPackageUpdate = ({
    balanceDelta,
    remainingDelta,
    reason,
    notes,
    onSuccess,
  }) => {
    createPackageTransaction.mutate(
      {
        patientId: id,
        data: {
          reason,
          balanceDelta: balanceDelta || undefined,
          remainingDelta: remainingDelta || undefined,
          notes: notes || undefined,
        },
      },
      { onSuccess },
    );
  };

  const handleAddToBalance = () => {
    const amount = Number.parseInt(addBalanceAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(
        t('patients.enterValidAmount', { defaultValue: 'Enter a valid amount.' }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: amount,
      remainingDelta: 0,
      reason: 'package_payment',
      notes:
        addBalanceNote.trim() ||
        t('patients.addedToBalanceNote', {
          defaultValue: 'Added {{amount}} to patient balance',
          amount,
        }),
      onSuccess: () => {
        setAddBalanceAmount('');
        setAddBalanceNote('');
      },
    });
  };

  const handleSetBalance = () => {
    const targetAmount = Number.parseInt(setBalanceAmount, 10);
    if (Number.isNaN(targetAmount) || targetAmount < 0) {
      toast.error(
        t('patients.enterValidTargetBalance', {
          defaultValue: 'Enter a valid balance value.',
        }),
      );
      return;
    }

    const correctionDelta = targetAmount - currentBalance;
    if (correctionDelta === 0) {
      toast.error(
        t('patients.noBalanceChange', {
          defaultValue: 'New value is the same as current balance.',
        }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: correctionDelta,
      remainingDelta: 0,
      reason: 'manual_correction',
      notes:
        setBalanceNote.trim() ||
        t('patients.balanceCorrectedNote', {
          defaultValue:
            'Balance corrected from {{from}} to {{to}}',
          from: currentBalance,
          to: targetAmount,
        }),
      onSuccess: () => {
        setSetBalanceAmount('');
        setSetBalanceNote('');
      },
    });
  };

  const handleMoveFromRemainingToBalance = () => {
    const amount = Number.parseInt(transferAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(
        t('patients.enterValidAmount', { defaultValue: 'Enter a valid amount.' }),
      );
      return;
    }

    if (amount > currentRemainingAmount) {
      toast.error(
        t('patients.transferExceedsRemaining', {
          defaultValue: 'Amount is higher than the remaining due amount.',
        }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: amount,
      remainingDelta: -amount,
      reason: 'remaining_adjustment',
      notes:
        transferNote.trim() ||
        t('patients.transferFromRemainingNote', {
          defaultValue:
            'Moved {{amount}} from amount due to balance',
          amount,
        }),
      onSuccess: () => {
        setTransferAmount('');
        setTransferNote('');
      },
    });
  };

  const handleAddToRemainingAmount = () => {
    const amount = Number.parseInt(addRemainingAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(
        t('patients.enterValidAmount', { defaultValue: 'Enter a valid amount.' }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: 0,
      remainingDelta: amount,
      reason: 'remaining_adjustment',
      notes:
        addRemainingNote.trim() ||
        t('patients.increaseRemainingNote', {
          defaultValue: 'Increased remaining amount by {{amount}}',
          amount,
        }),
      onSuccess: () => {
        setAddRemainingAmount('');
        setAddRemainingNote('');
      },
    });
  };

  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePatientSessionsInfinite(id, 10);

  const sessions = useMemo(() => {
    if (!sessionsData?.pages) return [];
    return sessionsData.pages.flatMap(page => page.data || []);
  }, [sessionsData]);

  const loadMoreRef = useRef(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    setBalanceLogsPage(1);
  }, [id]);

  useEffect(() => {
    hasScrolledToBalanceLogsRef.current = false;
  }, [id, searchParams.get('section')]);

  const currentHistoryItems = useMemo(() => {
    if (!patient || !patient.medicalHistory) return [];
    if (Array.isArray(patient.medicalHistory)) {
      return patient.medicalHistory
        .map((item) => (item == null ? '' : String(item)))
        .filter((item) => item.trim().length > 0);
    }
    const single = String(patient.medicalHistory);
    return single.trim().length ? [single] : [];
  }, [patient]);

  const currentProgramItems = useMemo(() => {
    if (!patient || !patient.programs) return [];
    if (Array.isArray(patient.programs)) {
      return patient.programs
        .map((item) => (item == null ? '' : String(item)))
        .filter((item) => item.trim().length > 0);
    }
    const single = String(patient.programs);
    return single.trim().length ? [single] : [];
  }, [patient]);

  const completedSessionsCount = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return 0;
    return sessions.filter(session => session.status === 'completed' && !session.isAssessment).length;
  }, [sessions]);

  const cancelledSessionsCount = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return 0;
    return sessions.filter(session => session.status === 'cancelled' && !session.isAssessment).length;
  }, [sessions]);

  const balanceLogs = useMemo(() => {
    if (!balanceLogsData) return [];
    if (Array.isArray(balanceLogsData?.data)) return balanceLogsData.data;
    if (Array.isArray(balanceLogsData)) return balanceLogsData;
    return [];
  }, [balanceLogsData]);

  const balanceLogsTotalPages = balanceLogsData?.meta?.totalPages ?? 1;
  const isBalanceExhaustedAfterUse = Boolean(
    patient?.isBalanceExhaustedAfterUse,
  );
  const pageDescription = [
    patient?.patientCode ? `#${patient.patientCode}` : null,
    patient?.homeBranch?.name
      ? `${t('patients.homeBranch', { defaultValue: 'Home branch' })}: ${patient.homeBranch.name}`
      : null,
  ]
    .filter(Boolean)
    .join(' | ');
  const requestedSection = searchParams.get('section');
  const formatSignedAmount = (value) => {
    const numericValue = Number(value || 0);
    return numericValue > 0 ? `+${numericValue}` : `${numericValue}`;
  };
  const describeBalanceLogAction = (log) => {
    if (!log) return t('common.update', { defaultValue: 'Update' });

    if (log.type === 'session_payment') {
      return t('patients.logActionSessionUsedBalance', {
        defaultValue: 'Session used balance',
      });
    }

    if (log.type === 'refund' || log.type === 'cancellation_credit') {
      return t('patients.logActionReturnedToBalance', {
        defaultValue: 'Amount returned to balance',
      });
    }

    if (
      log.type === 'remaining_adjustment' &&
      Number(log.amount || 0) > 0 &&
      Number(log.remainingDelta || 0) < 0
    ) {
      return t('patients.logActionMovedToBalance', {
        defaultValue: 'Moved from amount due to balance',
      });
    }

    if (
      log.type === 'remaining_adjustment' &&
      Number(log.amount || 0) === 0 &&
      Number(log.remainingDelta || 0) > 0
    ) {
      return t('patients.logActionIncreasedRemaining', {
        defaultValue: 'Increased remaining amount',
      });
    }

    if (log.type === 'manual_adjustment') {
      return t('patients.logActionBalanceCorrected', {
        defaultValue: 'Balance corrected',
      });
    }

    if (Number(log.amount || 0) > 0) {
      return t('patients.logActionAddedToBalance', {
        defaultValue: 'Added to balance',
      });
    }

    if (Number(log.amount || 0) < 0) {
      return t('patients.logActionReducedBalance', {
        defaultValue: 'Reduced from balance',
      });
    }

    return t('common.update', { defaultValue: 'Update' });
  };

  const describeBalanceLogChanges = (log) => {
    const changes = [];
    const amount = Number(log?.amount || 0);
    const remainingDelta = Number(log?.remainingDelta || 0);

    if (amount !== 0) {
      changes.push(
        t('patients.logBalanceChange', {
          defaultValue: 'Balance: {{value}}',
          value: formatSignedAmount(amount),
        }),
      );
    }

    if (remainingDelta !== 0) {
      changes.push(
        t('patients.logRemainingChange', {
          defaultValue: 'Amount due: {{value}}',
          value: formatSignedAmount(remainingDelta),
        }),
      );
    }

    if (!changes.length) {
      return t('patients.logNoAmountChange', {
        defaultValue: 'No amount change',
      });
    }

    return changes.join(' • ');
  };

  useEffect(() => {
    if (
      requestedSection !== 'balance-logs' ||
      !canViewBalanceLogs ||
      !balanceLogsSectionRef.current ||
      isBalanceLogsLoading ||
      hasScrolledToBalanceLogsRef.current
    ) {
      return;
    }

    balanceLogsSectionRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    hasScrolledToBalanceLogsRef.current = true;
  }, [requestedSection, canViewBalanceLogs, isBalanceLogsLoading]);

  if (!canView) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (isPatientLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isPatientError || !patient) {
    return (
      <EmptyState
        title={t('messages.errorOccurred')}
        description={t('common.error')}
        action={() => navigate(-1)}
        actionLabel={t('common.back')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            {patient.fullName}
            {patient.sessionsUntilReassessment === 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50"
              >
                <BellRing
                  className="h-5 w-5 text-sky-500 dark:text-sky-400 flex-shrink-0"
                  aria-hidden="true"
                  title={t('patients.reassessmentDue', { defaultValue: 'Reassessment due' })}
                />
              </span>
            )}
            {isBalanceExhaustedAfterUse && (
              <span
                className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50"
              >
                <CircleOff
                  className="h-5 w-5 text-sky-600 dark:text-sky-300"
                  aria-hidden="true"
                  title={t('patients.balanceExhaustedAfterUse', {
                    defaultValue: 'Previously had balance, now exhausted',
                  })}
                />
              </span>
            )}
          </div>
        }
        description={pageDescription || undefined}
        onBack={() => navigate(-1)}
        actions={
          <>
            {canCreateSession && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCreatingSession((prev) => !prev)}
              >
                {isCreatingSession ? t('common.close') : t('sessions.createSession')}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing((prev) => !prev)}
              >
                {isEditing ? t('common.close') : t('common.edit')}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/patient-payments?patientId=${patient.id}`)}
            >
              {t('patients.payments', { defaultValue: 'Payments' })}
            </Button>
          </>
        }
      />

      {canCreateSession && isCreatingSession && (
        <SessionForm
          initialValues={{
            doctorId: undefined,
            patientId: Number(id),
            sessionDate: '',
            sessionTime: '',
            cost: patient.defaultSessionCost ?? undefined,
            categoryId: patient.categoryId ?? patient.category?.id ?? undefined,
            isAssessment: false,
          }}
          fixedPatient={patient}
          onSubmit={(values) =>
            createSession.mutate(values, {
              onSuccess: () => {
                setIsCreatingSession(false);
              },
            })
          }
          onCancel={() => setIsCreatingSession(false)}
          isSubmitting={createSession.isPending}
        />
      )}

      {isEditing && canEdit && (
        <PatientForm
          initialValues={{
            fullName: patient.fullName || '',
            age: patient.age ?? undefined,
            phone: patient.phone || '',
            job: patient.job || '',
            address: patient.address || '',
            referral: patient.referral || '',
            homeBranchId: patient.homeBranchId ?? patient.homeBranch?.id ?? undefined,
            categoryId: patient.categoryId ?? patient.category?.id ?? undefined,
            defaultSessionCost: patient.defaultSessionCost ?? undefined,
            reassessmentCycleLength: patient.reassessmentCycleLength ?? undefined,
          }}
          showDefaultSessionCost={!isDoctorOnly}
          branchOptions={branchOptions}
          isEditing
          isSubmitting={updatePatient.isPending}
          onCancel={() => setIsEditing(false)}
          onSubmit={(values) =>
            updatePatient.mutate(
              { patientId: id, data: values },
              {
                onSuccess: () => {
                  setIsEditing(false);
                },
              }
            )
          }
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t('patients.patientDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">{t('patients.fullName')}:</span> {patient.fullName}
            </div>
            <div>
              <span className="font-medium">{t('patients.age')}:</span> {patient.age ?? '--'}
            </div>
            <div>
              <span className="font-medium">{t('patients.phone')}:</span> {patient.phone || '--'}
            </div>
            <div>
              <span className="font-medium">{t('patients.job', { defaultValue: 'Job' })}:</span> {patient.job || '--'}
            </div>
            <div>
              <span className="font-medium">{t('patients.address')}:</span> {patient.address || '--'}
            </div>
            <div>
              <span className="font-medium">{t('patients.referral', { defaultValue: 'Referral' })}:</span> {patient.referral || '--'}
            </div>
            <div>
              <span className="font-medium">
                {t('patients.homeBranch', { defaultValue: 'Home branch' })}:
              </span>{' '}
              {patient.homeBranch?.name || '--'}
            </div>
            <div>
              <span className="font-medium">{t('patients.category', { defaultValue: 'Category' })}:</span>{' '}
              {patient.category?.name || '--'}
            </div>
            {!isDoctorOnly && (
              <div>
                <span className="font-medium">
                  {t('patients.defaultSessionCost', { defaultValue: 'Default session cost' })}:
                </span>{' '}
                {patient.defaultSessionCost ?? '--'}
              </div>
            )}
            <div>
              <span className="font-medium">
                {t('patients.reassessmentCycleLength', {
                  defaultValue: 'Reassessment cycle length',
                })}
                :
              </span>{' '}
              {patient.reassessmentCycleLength ?? '--'}
            </div>
            <div>
              <span className="font-medium">
                {t('sessions.sessionsUntilReassessment', {
                  defaultValue: 'Sessions until reassessment',
                })}
                :
              </span>{' '}
              {patient.sessionsUntilReassessment ?? '--'}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t('patients.patientHistory')}</CardTitle>
            {canEdit && isEditingHistory ? (
              <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddHistoryItem}
                    disabled={updatePatientHistory.isPending}
                  >
                    + {t('common.create')}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditingHistory(false)}
                      disabled={updatePatientHistory.isPending}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSaveHistory}
                      disabled={updatePatientHistory.isPending}
                    >
                      {updatePatientHistory.isPending ? t('common.loading') : t('common.save')}
                    </Button>
                  </div>
                </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isEditingHistory ? setIsEditingHistory(false) : handleStartEditHistory()
                }
              >
                {t('common.edit')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingHistory && canEdit ? (
              <div className="space-y-4">
                {historyItems.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {t('patients.patientHistory')} #{index + 1}
                      </span>
                      {historyItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHistoryItem(index)}
                          disabled={updatePatientHistory.isPending}
                        >
                          {t('common.delete')}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      rows={4}
                      value={item}
                      onChange={(e) => handleChangeHistoryItem(index, e.target.value)}
                      disabled={updatePatientHistory.isPending}
                    />
                  </div>
                ))}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t('patients.reassessmentCycleLength', {
                        defaultValue: 'Reassessment cycle length',
                      })}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={reassessmentCycleLength}
                    onChange={(e) => setReassessmentCycleLength(e.target.value)}
                    disabled={updatePatientHistory.isPending}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder={t('sessions.reassessmentPlaceholder', { defaultValue: 'e.g. 10' })}
                  />
                </div>
              </div>
            ) : currentHistoryItems.length ? (
              <div className="space-y-3">
                <ul className="space-y-2 text-sm list-disc pl-5">
                  {currentHistoryItems.map((item, index) => (
                    <li key={index} className="whitespace-pre-line">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('messages.noDataFound')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {!isDoctorOnly && (
        <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {t('patients.balanceAndPackages', {
              defaultValue: 'Balance and package amount',
            })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">
                {t('patients.currentBalance', { defaultValue: 'Current balance' })}
              </div>
              <div className="mt-1 text-2xl font-bold text-primary">{currentBalance}</div>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">
                {t('patients.amountStillDue', { defaultValue: 'Amount still due' })}
              </div>
              <div className="mt-1 text-2xl font-bold">{currentRemainingAmount}</div>
            </div>
          </div>

          {isBalanceExhaustedAfterUse && (
            <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
              <CircleOff className="h-4 w-4" />
              <span>
                {t('patients.balanceExhaustedAfterUse', {
                  defaultValue: 'Previously had balance, now exhausted',
                })}
              </span>
            </div>
          )}

          {canEdit && (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-semibold">
                  {t('patients.addBalanceSimple', {
                    defaultValue: 'Add to balance',
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('patients.addBalanceSimpleHint', {
                    defaultValue: 'Use this when the patient pays part of a package.',
                  })}
                </div>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={addBalanceAmount}
                  onChange={(event) => setAddBalanceAmount(event.target.value)}
                  placeholder={t('common.amount')}
                  disabled={createPackageTransaction.isPending}
                />
                <Input
                  value={addBalanceNote}
                  onChange={(event) => setAddBalanceNote(event.target.value)}
                  placeholder={t('common.notes')}
                  disabled={createPackageTransaction.isPending}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAddToBalance}
                  disabled={createPackageTransaction.isPending}
                >
                  {createPackageTransaction.isPending
                    ? t('common.loading')
                    : t('patients.addBalanceSimple', {
                        defaultValue: 'Add to balance',
                      })}
                </Button>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-semibold">
                  {t('patients.increaseRemainingAmount', {
                    defaultValue: 'Increase remaining amount',
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('patients.increaseRemainingAmountHint', {
                    defaultValue:
                      'Use this when there is still an unpaid amount in the package.',
                  })}
                </div>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={addRemainingAmount}
                  onChange={(event) => setAddRemainingAmount(event.target.value)}
                  placeholder={t('common.amount')}
                  disabled={createPackageTransaction.isPending}
                />
                <Input
                  value={addRemainingNote}
                  onChange={(event) => setAddRemainingNote(event.target.value)}
                  placeholder={t('common.notes')}
                  disabled={createPackageTransaction.isPending}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAddToRemainingAmount}
                  disabled={createPackageTransaction.isPending}
                >
                  {createPackageTransaction.isPending
                    ? t('common.loading')
                    : t('patients.increaseRemainingAmount', {
                        defaultValue: 'Increase remaining amount',
                      })}
                </Button>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-semibold">
                  {t('patients.correctBalance', {
                    defaultValue: 'Correct balance',
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('patients.correctBalanceHint', {
                    defaultValue: 'Set the balance to an exact value.',
                  })}
                </div>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={setBalanceAmount}
                  onChange={(event) => setSetBalanceAmount(event.target.value)}
                  placeholder={t('patients.newBalanceValue', {
                    defaultValue: 'New balance value',
                  })}
                  disabled={createPackageTransaction.isPending}
                />
                <Input
                  value={setBalanceNote}
                  onChange={(event) => setSetBalanceNote(event.target.value)}
                  placeholder={t('common.notes')}
                  disabled={createPackageTransaction.isPending}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleSetBalance}
                  disabled={createPackageTransaction.isPending}
                >
                  {createPackageTransaction.isPending
                    ? t('common.loading')
                    : t('patients.correctBalance', {
                        defaultValue: 'Correct balance',
                      })}
                </Button>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-semibold">
                  {t('patients.moveFromDueToBalance', {
                    defaultValue: 'Move from due amount to balance',
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('patients.moveFromDueToBalanceHint', {
                    defaultValue:
                      'Use this after collecting part of the due amount.',
                  })}
                </div>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  placeholder={t('common.amount')}
                  disabled={
                    createPackageTransaction.isPending || currentRemainingAmount <= 0
                  }
                />
                <Input
                  value={transferNote}
                  onChange={(event) => setTransferNote(event.target.value)}
                  placeholder={t('common.notes')}
                  disabled={
                    createPackageTransaction.isPending || currentRemainingAmount <= 0
                  }
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleMoveFromRemainingToBalance}
                  disabled={
                    createPackageTransaction.isPending || currentRemainingAmount <= 0
                  }
                >
                  {createPackageTransaction.isPending
                    ? t('common.loading')
                    : t('patients.moveAmount', { defaultValue: 'Move amount' })}
                </Button>
                {currentRemainingAmount <= 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('patients.noRemainingToMove', {
                      defaultValue: 'No due amount to move right now.',
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>{t('sessions.program')}</CardTitle>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                isEditingPrograms ? setIsEditingPrograms(false) : handleStartEditPrograms()
              }
            >
              {isEditingPrograms ? t('common.close') : t('common.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditingPrograms && canEdit ? (
            <div className="space-y-4">
              {programItems.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t('sessions.program')} #{index + 1}
                    </span>
                    {programItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveProgramItem(index)}
                        disabled={updatePatientPrograms.isPending}
                      >
                        {t('common.delete')}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={4}
                    value={item}
                    onChange={(e) => handleChangeProgramItem(index, e.target.value)}
                    disabled={updatePatientPrograms.isPending}
                  />
                </div>
              ))}

              <div className="flex justify-between items-center pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddProgramItem}
                  disabled={updatePatientPrograms.isPending}
                >
                  + {t('common.create')}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditingPrograms(false)}
                    disabled={updatePatientPrograms.isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePrograms}
                    disabled={updatePatientPrograms.isPending}
                  >
                    {updatePatientPrograms.isPending ? t('common.loading') : t('common.save')}
                  </Button>
                </div>
              </div>
            </div>
          ) : currentProgramItems.length ? (
            <ul className="space-y-2 text-sm list-disc pl-5">
              {currentProgramItems.map((item, index) => (
                <li key={index} className="whitespace-pre-line">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t('messages.noDataFound')}</p>
          )}
        </CardContent>
      </Card>

      {canViewBalanceLogs && (
        <Card ref={balanceLogsSectionRef}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            {t('patients.balanceLogs', { defaultValue: 'Notes and history' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isBalanceLogsLoading ? (
            <LoadingSpinner />
          ) : balanceLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('messages.noDataFound')}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {balanceLogs.map((log) => (
                  <div key={log.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold">
                        {describeBalanceLogAction(log)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.createdAt ? formatDateTime(log.createdAt, 'PP p') : '--'}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('common.amount', { defaultValue: 'Amount' })}:{' '}
                      <span className="font-medium text-foreground">
                        {formatSignedAmount(log?.amount)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {describeBalanceLogChanges(log)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('payments.recordedBy', { defaultValue: 'Recorded by' })}:{' '}
                      <span className="font-medium text-foreground">
                        {log.createdBy?.fullName || '--'}
                      </span>
                    </div>
                    {log.notes ? (
                      <div className="mt-2 rounded bg-muted/40 px-2 py-1 text-xs">
                        {log.notes}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {t('common.paginationSummary', {
                    from: balanceLogs.length ? (balanceLogsPage - 1) * 10 + 1 : 0,
                    to: (balanceLogsPage - 1) * 10 + balanceLogs.length,
                    total: balanceLogsData?.meta?.total || balanceLogs.length,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={balanceLogsPage === 1}
                    onClick={() =>
                      setBalanceLogsPage((previous) => Math.max(1, previous - 1))
                    }
                  >
                    {t('common.previous')}
                  </Button>
                  <span>
                    {balanceLogsPage} / {balanceLogsTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={balanceLogsPage >= balanceLogsTotalPages}
                    onClick={() =>
                      setBalanceLogsPage((previous) => previous + 1)
                    }
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            {t('patients.patientSessionHistory')}
            <div className="flex items-center gap-2">
              <Badge
                variant="default"
                className="ml-2 mt-2 flex items-baseline gap-2 bg-green-600 hover:bg-green-700"
              >
                <span className="text-xs font-semibold leading-none">{completedSessionsCount}</span>
                <span className="text-xs uppercase tracking-wide">
                  {t('sessions.completed', { defaultValue: 'Completed' })}
                </span>
              </Badge>
              <Badge
                variant="default"
                className="mt-2 flex items-baseline gap-2 bg-red-600 hover:bg-red-700"
              >
                <span className="text-xs font-semibold leading-none">{cancelledSessionsCount}</span>
                <span className="text-xs uppercase tracking-wide">
                  {t('sessions.cancelled', { defaultValue: 'Cancelled' })}
                </span>
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isSessionsLoading ? (
            <LoadingSpinner />
          ) : sessions && sessions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
                <thead>
                  <tr
                    className={`border-b bg-muted/50 text-xs uppercase text-muted-foreground ${
                      i18n.language === 'ar' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <th className="px-4 py-3 font-medium">{t('sessions.date')}</th>
                    <th className="px-4 py-3 font-medium">{t('sessions.startedAt')}</th>
                    <th className="px-4 py-3 font-medium">{t('sessions.arrivalTime')}</th>
                    <th className="px-4 py-3 font-medium">{t('sessions.startTime', { defaultValue: 'Start time' })}</th>
                    <th className="px-4 py-3 font-medium">{t('sessions.endTime', { defaultValue: 'End time' })}</th>
                    <th className="px-4 py-3 font-medium">{t('sessions.category', { defaultValue: 'Category' })}</th>
                    <th className="px-4 py-3 font-medium">
                      {t('users.branch', { defaultValue: 'Branch' })}
                    </th>
                    <th className="px-4 py-3 font-medium">{t('sessions.status')}</th>
                    <th className="px-4 py-3 font-medium">{t('sessions.doctor')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr 
                      key={session.id} 
                      className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          {session.sessionDate ? formatDate(session.sessionDate, 'PP') : '--'}
                          {session.isReassessment ? (
                            <Badge className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-teal-100 p-0 text-teal-800 dark:border-teal-800 dark:bg-teal-900/40 dark:text-teal-100">
                              <ClipboardCheck className="h-5 w-5 text-teal-600" aria-hidden="true" />
                            </Badge>
                          ) : session.isAssessment ? (
                            <Badge className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-purple-200 bg-purple-100 p-0 text-purple-800 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-100">
                              <Stethoscope className="h-5 w-5 text-primary" aria-hidden="true" />
                            </Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {session.sessionTime ? (
                          <span dir="ltr" className="inline-block font-mono">
                            {formatDateTime(`${session.sessionDate}T${session.sessionTime}`, 'p')}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {session.arrivalTime ? (
                          <span dir="ltr" className="inline-block font-mono">
                            {formatDateTime(`${session.sessionDate}T${session.arrivalTime}`, 'p')}
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeWithDate(session.startTime, session.sessionDate) || '--'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeWithDate(session.endTime, session.sessionDate) || '--'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{session.category?.name || '--'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{session.branch?.name || '--'}</span>
                          {patient.homeBranchId != null &&
                            session.branchId != null &&
                            Number(patient.homeBranchId) !== Number(session.branchId) && (
                              <Badge variant="outline">
                                {t('patients.crossBranchService', {
                                  defaultValue: 'Cross-branch',
                                })}
                              </Badge>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{session.status || '--'}</td>
                      <td className="px-4 py-3">{session.doctor?.fullName || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasNextPage && (
                <div ref={loadMoreRef} className="py-4 text-center">
                  {isFetchingNextPage ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('common.loadMore', { defaultValue: 'Load more' })}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('sessions.noSessions')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
