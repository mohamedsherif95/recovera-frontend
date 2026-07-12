import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sessionSchema } from "@/lib/validators";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { AsyncSearchableSelect } from "@/components/common/AsyncSearchableSelect";
import { LocalizedDatePicker } from "@/components/common/LocalizedDatePicker";
import { TimePicker } from "@/components/common/TimePicker";
import { ImpactMetric, ImpactPanel } from "@/components/common/ImpactPanel";
import { useSessionCategories } from "@/hooks/useSessions";
import { useActiveBranchProfiles } from "@/hooks/useActiveBranchProfiles";
import { useAuthStore } from "@/store/authStore";
import { CLINIC_PROFILES, USER_ROLES } from "@/lib/constants";
import {
  CLINIC_PROFILE_OPTIONS,
  CLINIC_PROFILE_WORKFLOWS,
  clinicProfileSupportsWorkflow,
  getClinicProfileLabel,
  getClinicProfileProviderLabel,
  getClinicProfileVisitLabel,
} from "@/lib/clinicProfiles";
import {
  useDoctorLookupOptions,
  usePatientLookupOptions,
} from "@/hooks/useLookupOptions";
import { usePatient } from "@/hooks/usePatients";
import {
  isAssessmentCategoryName,
  isPackageCategoryName,
} from "@/lib/sessionCategory";
import { getProfileDetailFields } from "@/lib/sessionProfileDetails";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Stethoscope,
} from "lucide-react";

const DEFAULT_SESSION_VALUES = {
  doctorId: undefined,
  patientId: undefined,
  sessionDate: "",
  sessionTime: "",
  cost: undefined,
  categoryId: undefined,
  categoryNotes: "",
  profile: CLINIC_PROFILES.PHYSIOTHERAPY,
  visitType: "",
  profileDetails: {},
  isAssessment: false,
  isNewAssessment: false,
};

function cleanProfileDetails(fields, values = {}) {
  return fields.reduce((acc, field) => {
    const rawValue = values?.[field.key];
    if (rawValue == null || rawValue === "") {
      return acc;
    }

    if (field.type === "number") {
      const numericValue = Number(rawValue);
      if (Number.isFinite(numericValue)) {
        acc[field.key] = numericValue;
      }
      return acc;
    }

    const value = String(rawValue).trim();
    if (value) {
      acc[field.key] = value;
    }
    return acc;
  }, {});
}

function resolvePatientProfileDefaults(patient, profile, supportsVisitCategories) {
  const profileRecord = Array.isArray(patient?.profileRecords)
    ? patient.profileRecords.find((record) => record?.profile === profile)
    : null;
  const profileSettings = profileRecord?.settings || {};
  const legacyPhysiotherapyDefaults =
    profile === CLINIC_PROFILES.PHYSIOTHERAPY
      ? {
          defaultSessionCost: patient?.defaultSessionCost,
          categoryId: patient?.categoryId ?? patient?.category?.id,
        }
      : {};

  return {
    defaultSessionCost:
      profileSettings.defaultSessionCost ??
      legacyPhysiotherapyDefaults.defaultSessionCost,
    categoryId: supportsVisitCategories
      ? (profileSettings.categoryId ?? legacyPhysiotherapyDefaults.categoryId)
      : undefined,
  };
}

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
  const { hasAnyRole } = useAuthStore();
  const { enabledProfiles } = useActiveBranchProfiles();
  const showProfileSelector = enabledProfiles.length > 1;

  const patientLookup = usePatientLookupOptions({
    enabled: !fixedPatient,
    scope: "clinic",
  });
  const fixedPatientDetailsQuery = usePatient(fixedPatient?.id, {
    enabled: Boolean(fixedPatient?.id) && fixedPatient?.balance == null,
    staleTime: 60 * 1000,
  });
  const doctorLookup = useDoctorLookupOptions();
  const categoriesQuery = useSessionCategories();

  const canManageCategories = hasAnyRole([
    USER_ROLES.MANAGER,
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

  const isAssessmentSelected = watch("isAssessment");
  const selectedDoctorId = watch("doctorId");

  useEffect(() => {
    if (!isAssessmentSelected) {
      setValue("isNewAssessment", false);
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
    [categories],
  );

  const selectedCategoryId = watch("categoryId");
  const selectedPatientId = watch("patientId");
  const selectedCost = watch("cost");
  const selectedProfile = watch("profile");
  const selectedSessionDate = watch("sessionDate");
  const selectedSessionTime = watch("sessionTime");
  const selectedVisitType = watch("visitType");
  const activeProfile =
    selectedProfile && enabledProfiles.includes(selectedProfile)
      ? selectedProfile
      : enabledProfiles[0] || CLINIC_PROFILES.PHYSIOTHERAPY;
  const supportsVisitCategories = clinicProfileSupportsWorkflow(
    activeProfile,
    CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
  );
  const supportsAssessmentTracking = clinicProfileSupportsWorkflow(
    activeProfile,
    CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
  );
  const supportsTreatmentPackages = clinicProfileSupportsWorkflow(
    activeProfile,
    CLINIC_PROFILE_WORKFLOWS.TREATMENT_PACKAGES,
  );
  const profileDetailFields = useMemo(
    () => getProfileDetailFields(activeProfile),
    [activeProfile],
  );
  const activeVisitLabel = getClinicProfileVisitLabel(activeProfile, t);
  const activeProviderLabel = getClinicProfileProviderLabel(activeProfile, t);

  useEffect(() => {
    const fallbackProfile = enabledProfiles[0] || CLINIC_PROFILES.PHYSIOTHERAPY;
    if (!selectedProfile || !enabledProfiles.includes(selectedProfile)) {
      setValue("profile", fallbackProfile, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [enabledProfiles, selectedProfile, setValue]);

  useEffect(() => {
    if (supportsVisitCategories) {
      return;
    }

    setValue("categoryId", undefined, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("categoryNotes", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [setValue, supportsVisitCategories]);

  useEffect(() => {
    if (supportsAssessmentTracking) {
      return;
    }

    setValue("isAssessment", false, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("isNewAssessment", false, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [setValue, supportsAssessmentTracking]);

  const selectedCategory = useMemo(() => {
    if (!supportsVisitCategories || !selectedCategoryId) return null;
    return (
      categories.find((c) => c.id === selectedCategoryId) ||
      categories.find((c) => String(c.id) === String(selectedCategoryId)) ||
      null
    );
  }, [categories, selectedCategoryId, supportsVisitCategories]);
  const isAssessmentCategorySelected = useMemo(
    () =>
      supportsAssessmentTracking &&
      isAssessmentCategoryName(selectedCategory?.name),
    [selectedCategory?.name, supportsAssessmentTracking],
  );
  const isAssessmentTypeSelected = Boolean(
    supportsAssessmentTracking &&
      (isAssessmentSelected || isAssessmentCategorySelected),
  );

  useEffect(() => {
    if (
      !supportsAssessmentTracking ||
      !isAssessmentCategorySelected ||
      isAssessmentSelected
    ) {
      return;
    }

    setValue("isAssessment", true, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("isNewAssessment", true, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [
    isAssessmentCategorySelected,
    isAssessmentSelected,
    setValue,
    supportsAssessmentTracking,
  ]);

  const patients = useMemo(
    () => patientLookup.records,
    [patientLookup.records],
  );

  const selectedPatientForDefaults = useMemo(() => {
    if (fixedPatient) {
      const fixedPatientDetails = fixedPatientDetailsQuery.data;
      if (!fixedPatientDetails) return fixedPatient;

      return {
        ...fixedPatientDetails,
        ...fixedPatient,
        // Ensure balance is available for package validation in edit mode.
        balance: fixedPatient.balance ?? fixedPatientDetails.balance ?? 0,
      };
    }
    if (!selectedPatientId) return null;

    return (
      patients.find(
        (p) =>
          p.id === selectedPatientId ||
          String(p.id) === String(selectedPatientId),
      ) || null
    );
  }, [
    fixedPatient,
    fixedPatientDetailsQuery.data,
    patients,
    selectedPatientId,
  ]);

  const packageValidation = useMemo(() => {
    const isPackage =
      supportsTreatmentPackages &&
      isPackageCategoryName(selectedCategory?.name);
    if (!isPackage) {
      return { isInvalid: false, message: "" };
    }

    if (!selectedPatientForDefaults) {
      return {
        isInvalid: true,
        message: t("sessions.packageRequiresPatient", {
          defaultValue: "Select a patient before creating a package visit.",
        }),
      };
    }

    const numericCost = Number(selectedCost ?? 0);
    if (!Number.isFinite(numericCost) || numericCost <= 0) {
      return {
        isInvalid: true,
        message: t("sessions.packageCostPositive", {
          defaultValue: "Package visits require a positive cost.",
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
      return { isInvalid: false, message: "" };
    }

    const patientBalance = Number(resolvedPatientBalance ?? 0);
    if (patientBalance < numericCost) {
      return {
        isInvalid: true,
        message: t("sessions.packageInsufficientBalance", {
          defaultValue:
            "Insufficient patient balance for package visit. Balance: {{balance}}, required: {{cost}}.",
          balance: patientBalance,
          cost: numericCost,
        }),
      };
    }

    return { isInvalid: false, message: "" };
  }, [
    fixedPatient,
    fixedPatientDetailsQuery.isLoading,
    selectedCategory?.name,
    selectedPatientForDefaults,
    selectedCost,
    supportsTreatmentPackages,
    t,
  ]);

  const handleFormSubmit = (values) => {
    const payload = { ...values };
    payload.profile =
      payload.profile || enabledProfiles[0] || CLINIC_PROFILES.PHYSIOTHERAPY;
    payload.visitType = payload.visitType?.trim() || null;

    if (!supportsVisitCategories) {
      payload.categoryId = null;
      payload.categoryNotes = null;
    }

    payload.profileDetails = cleanProfileDetails(
      profileDetailFields,
      payload.profileDetails || {},
    );

    const isAssessment =
      supportsAssessmentTracking &&
      ((payload.isAssessment ?? false) ||
        isAssessmentCategoryName(selectedCategory?.name));
    const cost = payload.cost ?? 0;
    payload.isAssessment = isAssessment;

    if (!isAssessment) {
      delete payload.isNewAssessment;
    } else if (payload.isNewAssessment === undefined) {
      payload.isNewAssessment = true;
    }

    if (
      supportsAssessmentTracking &&
      isAssessment &&
      selectedDoctor &&
      !canAssignAssessmentToSelectedDoctor
    ) {
      setError("doctorId", {
        type: "manual",
        message: "validation.sessions.assessmentDoctorRestricted",
      });
      return;
    }

    if (
      supportsVisitCategories &&
      !isAssessment &&
      canManageCategories &&
      typeof cost === "number" &&
      cost >= 0
    ) {
      const category =
        categories.find((c) => c.id === payload.categoryId) ||
        categories.find((c) => String(c.id) === String(payload.categoryId));

      if (
        category &&
        typeof category.minCost === "number" &&
        typeof category.maxCost === "number"
      ) {
        if (cost < category.minCost || cost > category.maxCost) {
          const message = t("validation.sessions.categoryCostRange", {
            min: category.minCost,
            max: category.maxCost,
          });
          setError("cost", {
            type: "manual",
            message,
          });
          return;
        }
      }
    }

    if (packageValidation.isInvalid) {
      setError("cost", {
        type: "manual",
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

    const patientDefaults = resolvePatientProfileDefaults(
      selectedPatientForDefaults,
      activeProfile,
      supportsVisitCategories,
    );

    setValue("cost", patientDefaults.defaultSessionCost ?? undefined, {
      shouldDirty: false,
      shouldValidate: true,
    });
    setValue("categoryId", patientDefaults.categoryId ?? undefined, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [
    activeProfile,
    isEditing,
    selectedPatientForDefaults,
    setValue,
    supportsVisitCategories,
  ]);

  const users = useMemo(() => doctorLookup.records, [doctorLookup.records]);

  const selectedDoctor = useMemo(() => {
    if (!selectedDoctorId) return null;
    return (
      users.find(
        (u) =>
          u.id === selectedDoctorId ||
          String(u.id) === String(selectedDoctorId),
      ) || null
    );
  }, [users, selectedDoctorId]);

  const canAssignAssessmentToSelectedDoctor = useMemo(() => {
    if (!selectedDoctor) return true;
    return selectedDoctor.canPerformAssessments === true;
  }, [selectedDoctor]);

  useEffect(() => {
    if (
      !isAssessmentTypeSelected ||
      lockDoctor ||
      !selectedDoctorId ||
      !selectedDoctor
    ) {
      return;
    }

    if (canAssignAssessmentToSelectedDoctor) {
      return;
    }

    setValue("doctorId", undefined, {
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

  const doctorOptions = useMemo(() => {
    const filteredUsers = isAssessmentTypeSelected
      ? users.filter((u) => u.canPerformAssessments === true)
      : users;

    return filteredUsers.map((u) => ({
      value: String(u.id),
      label: u.fullName || u.username || `#${u.id}`,
    }));
  }, [users, isAssessmentTypeSelected]);

  const lockedDoctorLabel = useMemo(() => {
    if (!lockDoctor) return "";
    const id = initialValues?.doctorId;
    if (!id) return "";
    const match = users.find((u) => u.id === id || String(u.id) === String(id));
    if (match) return match.fullName || match.username || `#${id}`;
    if (initialValues?.doctorName) return initialValues.doctorName;
    return `#${id}`;
  }, [lockDoctor, initialValues, users]);

  const selectedDoctorOption = useMemo(() => {
    const selected = doctorOptions.find(
      (option) => String(option.value) === String(selectedDoctorId || ""),
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
    [patients],
  );

  const selectedPatientOption = useMemo(() => {
    const selected = patientOptions.find(
      (option) => String(option.value) === String(selectedPatientId || ""),
    );

    if (selected) return selected;
    if (!selectedPatientId) return undefined;

    return {
      value: String(selectedPatientId),
      label: `#${selectedPatientId}`,
    };
  }, [patientOptions, selectedPatientId]);

  const contextPatientLabel = fixedPatient
    ? `${fixedPatient.fullName || t("patients.unknownPatient")} ${
        fixedPatient.patientCode ? `(#${fixedPatient.patientCode})` : ""
      }`.trim()
    : selectedPatientOption?.label ||
      t("sessions.contextNotSelected", { defaultValue: "Not selected yet" });
  const contextProviderLabel =
    (lockDoctor ? lockedDoctorLabel : selectedDoctorOption?.label) ||
    t("sessions.contextNotSelected", { defaultValue: "Not selected yet" });
  const contextScheduleLabel =
    selectedSessionDate || selectedSessionTime
      ? `${selectedSessionDate || "--"} ${selectedSessionTime || "--"}`
      : t("sessions.contextNotScheduled", {
          defaultValue: "Not scheduled yet",
        });
  const contextCommercialLabel = supportsVisitCategories
    ? selectedCategory?.name ||
      t("sessions.contextCategoryPending", {
        defaultValue: "Category pending",
      })
    : t("sessions.contextProfileDriven", { defaultValue: "Profile driven" });
  const contextVisitTypeLabel =
    selectedVisitType?.trim() ||
    (isAssessmentTypeSelected
      ? t("sessions.isAssessment", { defaultValue: "Assessment" })
      : activeVisitLabel);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle>
          {isEditing
            ? `${t("common.edit")} ${activeVisitLabel}`
            : `${t("common.create")} ${activeVisitLabel}`}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <ImpactPanel
            icon={CalendarClock}
            title={
              isEditing
                ? t("sessions.formEditContextTitle")
                : t("sessions.formCreateContextTitle")
            }
            description={
              isEditing
                ? t("sessions.formEditContextDescription")
                : t("sessions.formCreateContextDescription")
            }
            className="md:col-span-2"
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <ImpactMetric
                label={t("sessions.contextPatient")}
                value={contextPatientLabel}
              />
              <ImpactMetric
                label={activeProviderLabel}
                value={contextProviderLabel}
              />
              <ImpactMetric
                label={t("sessions.contextSchedule")}
                value={contextScheduleLabel}
              />
              <ImpactMetric
                label={t("sessions.contextVisitSetup")}
                value={contextCommercialLabel}
              />
            </div>
          </ImpactPanel>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="h-4 w-4 text-primary" />
              {t("sessions.sectionPeople")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorId">{activeProviderLabel}</Label>
            {lockDoctor ? (
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {lockedDoctorLabel || activeProviderLabel}
              </div>
            ) : (
              <Controller
                name="doctorId"
                control={control}
                render={({ field }) => (
                  <AsyncSearchableSelect
                    options={doctorOptions}
                    value={field.value ? String(field.value) : ""}
                    onChange={(val) => field.onChange(Number(val))}
                    placeholder={activeProviderLabel}
                    disabled={isSubmitting}
                    searchPlaceholder={t("sessions.filters.searchPlaceholder")}
                    onSearchChange={doctorLookup.setSearch}
                    hasMore={doctorLookup.hasNextPage}
                    onLoadMore={doctorLookup.fetchNextPage}
                    isLoading={doctorLookup.isLoading}
                    isLoadingMore={doctorLookup.isFetchingNextPage}
                    isError={doctorLookup.isError}
                    selectedOption={selectedDoctorOption}
                    emptyText={t("common.noData", { defaultValue: "No data" })}
                    loadingText={t("common.loading")}
                    loadMoreText={t("common.loadMore", {
                      defaultValue: "Load more",
                    })}
                    errorText={t("messages.errorOccurred")}
                  />
                )}
              />
            )}
            {errors.doctorId && (
              <p className="text-sm text-destructive">
                {t(errors.doctorId.message)}
              </p>
            )}
            {isAssessmentTypeSelected && (
              <p className="text-xs text-muted-foreground">
                {t("sessions.assessmentDoctorRestriction", {
                  defaultValue:
                    "Assessment and reassessment visits have provider assignment restrictions.",
                })}
              </p>
            )}
          </div>

          {fixedPatient ? (
            <div className="space-y-2">
              <Label>{t("sessions.patient")}</Label>
              <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                {fixedPatient.fullName}{" "}
                {fixedPatient.patientCode && `(#${fixedPatient.patientCode})`}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="patientId">{t("sessions.patient")}</Label>
              <Controller
                name="patientId"
                control={control}
                render={({ field }) => (
                  <AsyncSearchableSelect
                    options={patientOptions}
                    value={field.value ? String(field.value) : ""}
                    onChange={(val) => field.onChange(Number(val))}
                    placeholder={t("sessions.patient")}
                    disabled={isSubmitting}
                    searchPlaceholder={t("sessions.filters.searchPlaceholder")}
                    onSearchChange={patientLookup.setSearch}
                    hasMore={patientLookup.hasNextPage}
                    onLoadMore={patientLookup.fetchNextPage}
                    isLoading={patientLookup.isLoading}
                    isLoadingMore={patientLookup.isFetchingNextPage}
                    isError={patientLookup.isError}
                    selectedOption={selectedPatientOption}
                    emptyText={t("common.noData", { defaultValue: "No data" })}
                    loadingText={t("common.loading")}
                    loadMoreText={t("common.loadMore", {
                      defaultValue: "Load more",
                    })}
                    errorText={t("messages.errorOccurred")}
                  />
                )}
              />
              {errors.patientId && (
                <p className="text-sm text-destructive">
                  {t(errors.patientId.message)}
                </p>
              )}
            </div>
          )}

          {showProfileSelector && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="profile">
                {t("sessions.profile", { defaultValue: "Clinic profile" })}
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
                      {CLINIC_PROFILE_OPTIONS.filter((profile) =>
                        enabledProfiles.includes(profile.value),
                      ).map((profile) => (
                        <SelectItem key={profile.value} value={profile.value}>
                          {getClinicProfileLabel(profile.value, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.profile && (
                <p className="text-sm text-destructive">
                  {t(errors.profile.message)}
                </p>
              )}
            </div>
          )}

          <div className="md:col-span-2">
            <div className="flex items-center gap-2 border-t pt-4 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-primary" />
              {t("sessions.sectionTiming")}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionDate">{t("sessions.date")}</Label>
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
              <p className="text-sm text-destructive">
                {t(errors.sessionDate.message)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTime">
              {`${activeVisitLabel} - ${t("sessions.scheduledTime", {
                defaultValue: "Scheduled time",
              })}`}
            </Label>
            <Controller
              name="sessionTime"
              control={control}
              render={({ field }) => (
                <TimePicker
                  id="sessionTime"
                  value={field.value || ""}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  placeholder={t("sessions.scheduledTime", {
                    defaultValue: "Scheduled time",
                  })}
                  stepMinutes={60}
                  startHour={10}
                  endHour={24}
                />
              )}
            />
            {errors.sessionTime && (
              <p className="text-sm text-destructive">
                {t(errors.sessionTime.message)}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-2 border-t pt-4 text-sm font-semibold">
              <Stethoscope className="h-4 w-4 text-primary" />
              {t("sessions.sectionVisitSetup")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {contextVisitTypeLabel}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">{t("sessions.cost")}</Label>
            <Input
              id="cost"
              type="number"
              step="0.01"
              {...register("cost", { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.cost && (
              <p className="text-sm text-destructive">
                {t(errors.cost.message)}
              </p>
            )}
            {!errors.cost && packageValidation.isInvalid && (
              <p className="text-sm text-destructive">
                {packageValidation.message}
              </p>
            )}
          </div>

          {canManageCategories && supportsVisitCategories && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="categoryId">
                {t("sessions.category", { defaultValue: "Category" })}
              </Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={categoryOptions}
                    value={field.value ? String(field.value) : ""}
                    onChange={(val) =>
                      field.onChange(val ? Number(val) : undefined)
                    }
                    placeholder={t("sessions.category", {
                      defaultValue: "Select category",
                    })}
                    disabled={isSubmitting || categoriesQuery.isLoading}
                  />
                )}
              />
              {selectedCategory && (
                <p className="text-xs text-muted-foreground">
                  {t("sessions.categoryRangeHint", {
                    defaultValue: "Allowed cost: {{min}}–{{max}}",
                    min: selectedCategory.minCost,
                    max: selectedCategory.maxCost,
                  })}
                </p>
              )}
            </div>
          )}

          {canManageCategories && supportsVisitCategories && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="categoryNotes">
                {t("sessions.categoryNotes", { defaultValue: "Category note" })}
              </Label>
              <Input
                id="categoryNotes"
                {...register("categoryNotes")}
                disabled={isSubmitting}
              />
              {errors.categoryNotes && (
                <p className="text-sm text-destructive">
                  {t(errors.categoryNotes.message)}
                </p>
              )}
            </div>
          )}

          {supportsAssessmentTracking && (
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
                      variant={active ? "default" : "outline"}
                      className={`inline-flex min-h-11 w-full items-center justify-between gap-4 rounded-md border px-4 py-3 text-start sm:w-auto ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        if (active && isAssessmentCategorySelected) {
                          return;
                        }

                        const next = !active;
                        field.onChange(next);

                        if (next) {
                          // Default assessment mode to "new assessment" to avoid accidental reassessment.
                          setValue("isNewAssessment", true, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      disabled={
                        isSubmitting ||
                        (active && isAssessmentCategorySelected) ||
                        (lockDoctor &&
                          !active &&
                          selectedDoctor &&
                          !canAssignAssessmentToSelectedDoctor)
                      }
                      aria-pressed={active}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          {t("sessions.isAssessment", {
                            defaultValue: "Assessment",
                          })}
                        </span>
                        <span
                          className={`text-xs ${
                            active
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          }`}
                        >
                          {t("sessions.assessmentToggleHint", {
                            defaultValue:
                              "Use when this visit opens or reviews the care plan.",
                          })}
                        </span>
                      </span>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all duration-150 ${
                          active
                            ? "border-primary-foreground/40 bg-primary-foreground/15 text-primary-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {active ? (
                          <CheckCircle2
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                    </Button>
                  );
                }}
              />
              {lockDoctor &&
                selectedDoctor &&
                !canAssignAssessmentToSelectedDoctor && (
                  <p className="text-xs text-muted-foreground">
                    {t("sessions.assessmentLockedDoctorHint", {
                      defaultValue:
                        "This provider cannot be assigned assessment or reassessment sessions.",
                    })}
                  </p>
                )}
              {isAssessmentCategorySelected && (
                <p className="text-xs text-muted-foreground">
                  {t("sessions.assessmentCategoryForcesAssessment", {
                    defaultValue:
                      "Category {{categoryName}} is treated as an assessment session.",
                    categoryName: selectedCategory?.name,
                  })}
                </p>
              )}
              {errors.isAssessment && (
                <p className="text-sm text-destructive">
                  {t(errors.isAssessment.message)}
                </p>
              )}
            </div>
          )}

          {supportsAssessmentTracking && isAssessmentSelected && (
            <div className="space-y-2 md:col-span-2">
              <Controller
                name="isNewAssessment"
                control={control}
                render={({ field }) => {
                  const isNew = Boolean(field.value);
                  return (
                    <div className="space-y-2">
                      <div className="grid gap-2 rounded-md border bg-background p-1 sm:inline-grid sm:grid-cols-2">
                        <Button
                          type="button"
                          variant={isNew ? "default" : "ghost"}
                          className="justify-center rounded-md px-4"
                          onClick={() => field.onChange(true)}
                          disabled={isSubmitting}
                          aria-pressed={isNew}
                        >
                          {t("sessions.isNewAssessment", {
                            defaultValue: "New Diagnosis Assessment",
                          })}
                        </Button>
                        <Button
                          type="button"
                          variant={!isNew ? "default" : "ghost"}
                          className="justify-center rounded-md px-4"
                          onClick={() => field.onChange(false)}
                          disabled={
                            isSubmitting ||
                            (lockDoctor &&
                              selectedDoctor &&
                              !canAssignAssessmentToSelectedDoctor)
                          }
                          aria-pressed={!isNew}
                        >
                          {t("sessions.isReassessment", {
                            defaultValue: "Reassessment",
                          })}
                        </Button>
                      </div>
                      {lockDoctor &&
                        selectedDoctor &&
                        !canAssignAssessmentToSelectedDoctor && (
                          <p className="text-xs text-muted-foreground">
                            {t("sessions.assessmentLockedDoctorHint", {
                              defaultValue:
                                "This provider cannot be assigned assessment or reassessment sessions.",
                            })}
                          </p>
                        )}
                    </div>
                  );
                }}
              />
              {errors.isNewAssessment && (
                <p className="text-sm text-destructive">
                  {t(errors.isNewAssessment.message)}
                </p>
              )}
            </div>
          )}

          {profileDetailFields.length > 0 && (
            <div className="space-y-4 rounded-md border bg-muted/10 p-4 md:col-span-2">
              <div>
                <h3 className="text-sm font-semibold">
                  {t("visitDetails.title", { defaultValue: "Visit details" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {getClinicProfileLabel(activeProfile, t)}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {profileDetailFields.map((field) => (
                  <div
                    key={field.key}
                    className={
                      field.type === "textarea"
                        ? "space-y-2 md:col-span-2"
                        : "space-y-2"
                    }
                  >
                    <Label htmlFor={`profileDetails-${field.key}`}>
                      {t(field.labelKey, { defaultValue: field.defaultLabel })}
                    </Label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={`profileDetails-${field.key}`}
                        rows={4}
                        {...register(`profileDetails.${field.key}`)}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <Input
                        id={`profileDetails-${field.key}`}
                        type={field.type === "number" ? "number" : "text"}
                        min={field.type === "number" ? 1 : undefined}
                        {...register(`profileDetails.${field.key}`)}
                        disabled={isSubmitting}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || packageValidation.isInvalid}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? t("common.loading") : t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
