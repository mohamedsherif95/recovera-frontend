import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sessionSchema } from '@/lib/validators';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { AsyncSearchableSelect } from '@/components/common/AsyncSearchableSelect';
import { LocalizedDatePicker } from '@/components/common/LocalizedDatePicker';
import { TimePicker } from '@/components/common/TimePicker';
import { useSessionCategories } from '@/hooks/useSessions';
import { useBranches } from '@/hooks/useBranches';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { CLINIC_PROFILES, USER_ROLES } from '@/lib/constants';
import {
  canOverrideBranchScope,
  resolveEffectiveBranchId,
  resolveEffectiveClinicId,
} from '@/lib/branchScope';
import {
  useDoctorLookupOptions,
  usePatientLookupOptions,
} from '@/hooks/useLookupOptions';
import { usePatient } from '@/hooks/usePatients';
import {
  isAssessmentCategoryName,
  isPackageCategoryName,
} from '@/lib/sessionCategory';

const DEFAULT_SESSION_VALUES = {
  doctorId: undefined,
  patientId: undefined,
  sessionDate: '',
  sessionTime: '',
  cost: undefined,
  categoryId: undefined,
  categoryNotes: '',
  profile: CLINIC_PROFILES.PHYSIOTHERAPY,
  visitType: '',
  isAssessment: false,
  isNewAssessment: false,
};

const PROFILE_OPTIONS = [
  {
    value: CLINIC_PROFILES.PHYSIOTHERAPY,
    label: 'Physiotherapy',
  },
  {
    value: CLINIC_PROFILES.MEDICAL_DOCTOR,
    label: 'Medical doctor clinic',
  },
  {
    value: CLINIC_PROFILES.DENTIST,
    label: 'Dentist',
  },
  {
    value: CLINIC_PROFILES.LASER_DERMATOLOGY,
    label: 'Laser and dermatology',
  },
];

const normalizeBranchProfiles = (branch) => {
  const profiles = branch?.subscription?.profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return [CLINIC_PROFILES.PHYSIOTHERAPY];
  }

  return profiles
    .filter((profile) => profile?.isEnabled !== false)
    .map((profile) =>
      typeof profile === 'string'
        ? profile
        : profile?.profile || profile?.profileCode || profile?.code || profile?.name,
    )
    .filter(Boolean);
};

export function SessionForm({
  initialValues = DEFAULT_SESSION_VALUES,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing,
  fixedPatient,
  lockDoctor = false,
}) {
  const { t } = useTranslation();
  const { hasAnyRole, user } = useAuthStore();
  const { clinicOverrideId, branchOverrideId } = useUIStore();
  const canOverrideBranch = canOverrideBranchScope(user);
  const effectiveClinicId = resolveEffectiveClinicId(user, clinicOverrideId);
  const effectiveBranchId = resolveEffectiveBranchId(user, branchOverrideId);
  const { data: branchesData } = useBranches({
    enabled: Boolean(
      user &&
        (canOverrideBranch ? effectiveClinicId : effectiveBranchId),
    ),
  });
  const branches = useMemo(() => {
    if (canOverrideBranch && !effectiveClinicId) return [];
    if (Array.isArray(branchesData)) return branchesData;
    if (Array.isArray(branchesData?.data)) return branchesData.data;
    return [];
  }, [branchesData, canOverrideBranch, effectiveClinicId]);
  const currentBranch = useMemo(
    () =>
      branches.find((branch) => Number(branch.id) === Number(effectiveBranchId)) ||
      branches.find((branch) => branch.isDefault) ||
      (!canOverrideBranch ? user?.branch : null) ||
      null,
    [branches, canOverrideBranch, effectiveBranchId, user?.branch],
  );
  const enabledProfiles = useMemo(
    () => normalizeBranchProfiles(currentBranch),
    [currentBranch],
  );
  const showProfileSelector = enabledProfiles.length > 1;

  const patientLookup = usePatientLookupOptions({
    enabled: !fixedPatient,
    scope: 'clinic',
  });
  const fixedPatientDetailsQuery = usePatient(fixedPatient?.id, {
    enabled: Boolean(fixedPatient?.id) && fixedPatient?.balance == null,
    staleTime: 60 * 1000,
  });
  const doctorLookup = useDoctorLookupOptions();
  const categoriesQuery = useSessionCategories();

  const canManageCategories = hasAnyRole([
    USER_ROLES.ADMIN,
    USER_ROLES.SECRETARY,
  ]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sessionSchema),
    defaultValues: initialValues,
  });

  // Reset form when initialValues change or when options finish loading
  const optionsLoaded =
    (fixedPatient || !patientLookup.isLoading) &&
    !doctorLookup.isLoading &&
    !categoriesQuery.isLoading;
  
  useEffect(() => {
    if (optionsLoaded) {
      reset(initialValues);
    }
  }, [initialValues, reset, optionsLoaded]);

  const isAssessmentSelected = watch('isAssessment');
  const selectedDoctorId = watch('doctorId');

  useEffect(() => {
    if (!isAssessmentSelected) {
      setValue('isNewAssessment', false);
    }
  }, [isAssessmentSelected, setValue]);

  const categories = useMemo(() => {
    const data = categoriesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.categories)) return data.categories;
    return [];
  }, [categoriesQuery.data]);

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.id),
        label: c.name,
        minCost: c.minCost,
        maxCost: c.maxCost,
      })),
    [categories]
  );

  const selectedCategoryId = watch('categoryId');
  const selectedPatientId = watch('patientId');
  const selectedCost = watch('cost');
  const selectedProfile = watch('profile');

  useEffect(() => {
    const fallbackProfile = enabledProfiles[0] || CLINIC_PROFILES.PHYSIOTHERAPY;
    if (!selectedProfile || !enabledProfiles.includes(selectedProfile)) {
      setValue('profile', fallbackProfile, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [enabledProfiles, selectedProfile, setValue]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    return (
      categories.find((c) => c.id === selectedCategoryId) ||
      categories.find((c) => String(c.id) === String(selectedCategoryId)) ||
      null
    );
  }, [categories, selectedCategoryId]);
  const isAssessmentCategorySelected = useMemo(
    () => isAssessmentCategoryName(selectedCategory?.name),
    [selectedCategory?.name],
  );
  const isAssessmentTypeSelected = Boolean(
    isAssessmentSelected || isAssessmentCategorySelected,
  );

  useEffect(() => {
    if (!isAssessmentCategorySelected || isAssessmentSelected) {
      return;
    }

    setValue('isAssessment', true, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('isNewAssessment', true, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [isAssessmentCategorySelected, isAssessmentSelected, setValue]);

  const patients = useMemo(() => patientLookup.records, [patientLookup.records]);

  const selectedPatientForDefaults = useMemo(() => {
    if (fixedPatient) {
      const fixedPatientDetails = fixedPatientDetailsQuery.data;
      if (!fixedPatientDetails) return fixedPatient;

      return {
        ...fixedPatientDetails,
        ...fixedPatient,
        // Ensure balance is available for package validation in edit mode.
        balance:
          fixedPatient.balance ?? fixedPatientDetails.balance ?? 0,
      };
    }
    if (!selectedPatientId) return null;

    return (
      patients.find((p) => p.id === selectedPatientId || String(p.id) === String(selectedPatientId)) ||
      null
    );
  }, [fixedPatient, fixedPatientDetailsQuery.data, patients, selectedPatientId]);

  const packageValidation = useMemo(() => {
    const isPackage = isPackageCategoryName(selectedCategory?.name);
    if (!isPackage) {
      return { isInvalid: false, message: '' };
    }

    if (!selectedPatientForDefaults) {
      return {
        isInvalid: true,
        message: t('sessions.packageRequiresPatient', {
          defaultValue: 'Select a patient before creating a package session.',
        }),
      };
    }

    const numericCost = Number(selectedCost ?? 0);
    if (!Number.isFinite(numericCost) || numericCost <= 0) {
      return {
        isInvalid: true,
        message: t('sessions.packageCostPositive', {
          defaultValue: 'Package sessions require a positive cost.',
        }),
      };
    }

    const resolvedPatientBalance = selectedPatientForDefaults.balance;
    const isFixedPatientBalanceLoading =
      Boolean(fixedPatient) &&
      fixedPatient?.balance == null &&
      fixedPatientDetailsQuery.isLoading &&
      resolvedPatientBalance == null;

    // Avoid false "insufficient balance" while we hydrate fixed patient details in edit mode.
    if (isFixedPatientBalanceLoading) {
      return { isInvalid: false, message: '' };
    }

    const patientBalance = Number(resolvedPatientBalance ?? 0);
    if (patientBalance < numericCost) {
      return {
        isInvalid: true,
        message: t('sessions.packageInsufficientBalance', {
          defaultValue:
            'Insufficient patient balance for package session. Balance: {{balance}}, required: {{cost}}.',
          balance: patientBalance,
          cost: numericCost,
        }),
      };
    }

    return { isInvalid: false, message: '' };
  }, [
    fixedPatient,
    fixedPatientDetailsQuery.isLoading,
    selectedCategory?.name,
    selectedPatientForDefaults,
    selectedCost,
    t,
  ]);

  const handleFormSubmit = (values) => {
    const payload = { ...values };
    payload.profile =
      payload.profile || enabledProfiles[0] || CLINIC_PROFILES.PHYSIOTHERAPY;
    payload.visitType = payload.visitType?.trim() || null;

    const isAssessment =
      (payload.isAssessment ?? false) || isAssessmentCategoryName(selectedCategory?.name);
    const cost = payload.cost ?? 0;
    payload.isAssessment = isAssessment;

    if (!isAssessment) {
      delete payload.isNewAssessment;
    } else if (payload.isNewAssessment === undefined) {
      payload.isNewAssessment = true;
    }

    if (isAssessment && selectedDoctor && !canAssignAssessmentToSelectedDoctor) {
      setError('doctorId', {
        type: 'manual',
        message: 'validation.sessions.assessmentDoctorRestricted',
      });
      return;
    }

    if (!isAssessment && canManageCategories && typeof cost === 'number' && cost >= 0) {
      const category =
        categories.find((c) => c.id === payload.categoryId) ||
        categories.find((c) => String(c.id) === String(payload.categoryId));

      if (category && typeof category.minCost === 'number' && typeof category.maxCost === 'number') {
        if (cost < category.minCost || cost > category.maxCost) {
          const message = t('validation.sessions.categoryCostRange', {
            min: category.minCost,
            max: category.maxCost,
          });
          setError('cost', {
            type: 'manual',
            message,
          });
          return;
        }
      }
    }

    if (packageValidation.isInvalid) {
      setError('cost', {
        type: 'manual',
        message: packageValidation.message,
      });
      return;
    }

    onSubmit(payload);
  };

  useEffect(() => {
    if (isEditing || !selectedPatientForDefaults) {
      return;
    }

    const patientDefaultCost = selectedPatientForDefaults.defaultSessionCost;
    const patientDefaultCategoryId =
      selectedPatientForDefaults.categoryId ?? selectedPatientForDefaults.category?.id ?? undefined;

    setValue('cost', patientDefaultCost ?? undefined, {
      shouldDirty: false,
      shouldValidate: true,
    });
    setValue('categoryId', patientDefaultCategoryId ?? undefined, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [isEditing, selectedPatientForDefaults, setValue]);

  const users = useMemo(() => doctorLookup.records, [doctorLookup.records]);

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return (
      users.find((u) => u.id === selectedDoctorId || String(u.id) === String(selectedDoctorId)) ||
      null
    );
  }, [users, selectedDoctorId]);

  const canAssignAssessmentToSelectedDoctor = useMemo(() => {
    if (!selectedDoctor) return true;
    return selectedDoctor.canPerformAssessments === true;
  }, [selectedDoctor]);

  useEffect(() => {
    if (!isAssessmentTypeSelected || lockDoctor || !selectedDoctorId || !selectedDoctor) {
      return;
    }

    if (canAssignAssessmentToSelectedDoctor) {
      return;
    }

    setValue('doctorId', undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [
    isAssessmentTypeSelected,
    lockDoctor,
    selectedDoctorId,
    selectedDoctor,
    canAssignAssessmentToSelectedDoctor,
    setValue,
  ]);

  const doctorOptions = useMemo(
    () => {
      const filteredUsers = isAssessmentTypeSelected
        ? users.filter((u) => u.canPerformAssessments === true)
        : users;

      return filteredUsers.map((u) => ({
        value: String(u.id),
        label: u.fullName || u.username || `#${u.id}`,
      }));
    },
    [users, isAssessmentTypeSelected]
  );

  const lockedDoctorLabel = useMemo(() => {
    if (!lockDoctor) return '';
    const id = initialValues?.doctorId;
    if (!id) return '';
    const match = users.find((u) => u.id === id || String(u.id) === String(id));
    if (match) return match.fullName || match.username || `#${id}`;
    if (initialValues?.doctorName) return initialValues.doctorName;
    return `#${id}`;
  }, [lockDoctor, initialValues, users]);

  const selectedDoctorOption = useMemo(() => {
    const selected = doctorOptions.find(
      (option) => String(option.value) === String(selectedDoctorId || '')
    );

    if (selected) return selected;
    if (!selectedDoctorId) return undefined;

    return {
      value: String(selectedDoctorId),
      label: lockedDoctorLabel || `#${selectedDoctorId}`,
    };
  }, [doctorOptions, selectedDoctorId, lockedDoctorLabel]);

  const patientOptions = useMemo(
    () =>
      patients.map((p) => ({
        value: String(p.id),
        label: p.fullName || p.patientCode || `#${p.id}`,
      })),
    [patients]
  );

  const selectedPatientOption = useMemo(() => {
    const selected = patientOptions.find(
      (option) => String(option.value) === String(selectedPatientId || '')
    );

    if (selected) return selected;
    if (!selectedPatientId) return undefined;

    return {
      value: String(selectedPatientId),
      label: `#${selectedPatientId}`,
    };
  }, [patientOptions, selectedPatientId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? t('sessions.editSession') : t('sessions.createSession')}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="doctorId">{t('sessions.doctor')}</Label>
            {lockDoctor ? (
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {lockedDoctorLabel || t('sessions.doctor')}
              </div>
            ) : (
              <Controller
                name="doctorId"
                control={control}
                render={({ field }) => (
                  <AsyncSearchableSelect
                    options={doctorOptions}
                    value={field.value ? String(field.value) : ''}
                    onChange={(val) => field.onChange(Number(val))}
                    placeholder={t('sessions.doctor')}
                    disabled={isSubmitting}
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
                )}
              />
            )}
            {errors.doctorId && (
              <p className="text-sm text-destructive">{t(errors.doctorId.message)}</p>
            )}
            {isAssessmentTypeSelected && (
              <p className="text-xs text-muted-foreground">
                {t('sessions.assessmentDoctorRestriction', {
                  defaultValue: 'Assessment and reassessment sessions have doctor assignment restrictions.',
                })}
              </p>
            )}
          </div>

          {fixedPatient ? (
            <div className="space-y-2">
              <Label>{t('sessions.patient')}</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {fixedPatient.fullName}{' '}
                {fixedPatient.patientCode && `(#${fixedPatient.patientCode})`}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="patientId">{t('sessions.patient')}</Label>
              <Controller
                name="patientId"
                control={control}
                render={({ field }) => (
                  <AsyncSearchableSelect
                    options={patientOptions}
                    value={field.value ? String(field.value) : ''}
                    onChange={(val) => field.onChange(Number(val))}
                    placeholder={t('sessions.patient')}
                    disabled={isSubmitting}
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
                )}
              />
              {errors.patientId && (
                <p className="text-sm text-destructive">{t(errors.patientId.message)}</p>
              )}
            </div>
          )}

          {showProfileSelector && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile">
                {t('sessions.profile', { defaultValue: 'Clinic profile' })}
              </Label>
              <Controller
                name="profile"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || enabledProfiles[0]}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="profile">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFILE_OPTIONS.filter((profile) =>
                        enabledProfiles.includes(profile.value),
                      ).map((profile) => (
                        <SelectItem key={profile.value} value={profile.value}>
                          {profile.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.profile && (
                <p className="text-sm text-destructive">{t(errors.profile.message)}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="sessionDate">{t('sessions.date')}</Label>
            <Controller
              name="sessionDate"
              control={control}
              render={({ field }) => (
                <LocalizedDatePicker
                  id="sessionDate"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.sessionDate && (
              <p className="text-sm text-destructive">{t(errors.sessionDate.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTime">{t('sessions.startedAt')}</Label>
            <Controller
              name="sessionTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  id="sessionTime"
                  value={field.value || ''}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  placeholder={t('sessions.startedAt')}
                  stepMinutes={60}
                  startHour={10}
                  endHour={24}
                />
              )}
            />
            {errors.sessionTime && (
              <p className="text-sm text-destructive">{t(errors.sessionTime.message)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">{t('sessions.cost')}</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              {...register('cost', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.cost && (
              <p className="text-sm text-destructive">{t(errors.cost.message)}</p>
            )}
            {!errors.cost && packageValidation.isInvalid && (
              <p className="text-sm text-destructive">{packageValidation.message}</p>
            )}
          </div>

          {canManageCategories && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="categoryId">
                {t('sessions.category', { defaultValue: 'Category' })}
              </Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={categoryOptions}
                    value={field.value ? String(field.value) : ''}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    placeholder={t('sessions.category', {
                      defaultValue: 'Select category',
                    })}
                    disabled={isSubmitting || categoriesQuery.isLoading}
                  />
                )}
              />
              {selectedCategory && (
                <p className="text-xs text-muted-foreground">
                  {t('sessions.categoryRangeHint', {
                    defaultValue: 'Allowed cost: {{min}}–{{max}}',
                    min: selectedCategory.minCost,
                    max: selectedCategory.maxCost,
                    })}
                </p>
              )}
            </div>
          )}

          {canManageCategories && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="categoryNotes">
                {t('sessions.categoryNotes', { defaultValue: 'Category note' })}
              </Label>
              <Input
                id="categoryNotes"
                {...register('categoryNotes')}
                disabled={isSubmitting}
              />
              {errors.categoryNotes && (
                <p className="text-sm text-destructive">{t(errors.categoryNotes.message)}</p>
              )}
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            {/* <Label>{t('sessions.isAssessment', { defaultValue: 'Assessment' })}</Label> */}
            <Controller
              name="isAssessment"
              control={control}
              render={({ field }) => {
                const active = Boolean(field.value);
                return (
                  <Button
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    className={`inline-flex items-center gap-4 rounded-full border-2 px-5 py-3 text-base ${
                      active
                        ? 'border-primary text-white bg-primary/5'
                        : 'border-border text-muted-foreground bg-background'
                    }`}
                    onClick={() => {
                      if (active && isAssessmentCategorySelected) {
                        return;
                      }

                      const next = !active;
                      field.onChange(next);

                      if (next) {
                        // Default assessment mode to "new assessment" to avoid accidental reassessment.
                        setValue('isNewAssessment', true, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }
                    }}
                    disabled={
                      isSubmitting ||
                      (active && isAssessmentCategorySelected) ||
                      (lockDoctor && !active && selectedDoctor && !canAssignAssessmentToSelectedDoctor)
                    }
                    aria-pressed={active}
                  >
                    <span className="font-medium">
                      {t('sessions.isAssessment', { defaultValue: 'Assessment' })}
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-150 ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground scale-110'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {active ? '✓' : ''}
                    </span>
                  </Button>
                );
              }}
            />
            {lockDoctor && selectedDoctor && !canAssignAssessmentToSelectedDoctor && (
              <p className="text-xs text-muted-foreground">
                {t('sessions.assessmentLockedDoctorHint', {
                  defaultValue: 'This doctor cannot be assigned assessment or reassessment sessions.',
                })}
              </p>
            )}
            {isAssessmentCategorySelected && (
              <p className="text-xs text-muted-foreground">
                {t('sessions.assessmentCategoryForcesAssessment', {
                  defaultValue: 'Category {{categoryName}} is treated as an assessment session.',
                  categoryName: selectedCategory?.name,
                })}
              </p>
            )}
            {errors.isAssessment && (
              <p className="text-sm text-destructive">{t(errors.isAssessment.message)}</p>
            )}
          </div>

          {isAssessmentSelected && (
            <div className="space-y-2 md:col-span-2">
              <Controller
                name="isNewAssessment"
                control={control}
                render={({ field }) => {
                  const isNew = Boolean(field.value);
                  return (
                    <div className="space-y-2">
                      <div className="inline-flex rounded-full border bg-background p-1">
                        <Button
                          type="button"
                          variant={isNew ? 'default' : 'ghost'}
                          className="rounded-full px-4"
                          onClick={() => field.onChange(true)}
                          disabled={isSubmitting}
                          aria-pressed={isNew}
                        >
                          {t('sessions.isNewAssessment', { defaultValue: 'New Diagnosis Assessment' })}
                        </Button>
                        <Button
                          type="button"
                          variant={!isNew ? 'default' : 'ghost'}
                          className="rounded-full px-4"
                          onClick={() => field.onChange(false)}
                          disabled={
                            isSubmitting ||
                            (lockDoctor && selectedDoctor && !canAssignAssessmentToSelectedDoctor)
                          }
                          aria-pressed={!isNew}
                        >
                          {t('sessions.isReassessment', { defaultValue: 'Reassessment' })}
                        </Button>
                      </div>
                      {lockDoctor && selectedDoctor && !canAssignAssessmentToSelectedDoctor && (
                        <p className="text-xs text-muted-foreground">
                          {t('sessions.assessmentLockedDoctorHint', {
                            defaultValue: 'This doctor cannot be assigned assessment or reassessment sessions.',
                          })}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
              {errors.isNewAssessment && (
                <p className="text-sm text-destructive">{t(errors.isNewAssessment.message)}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {isEditing && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting || packageValidation.isInvalid}>
            {isSubmitting ? t('common.loading') : t('common.save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
