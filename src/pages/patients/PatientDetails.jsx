import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  useParams,
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  usePatient,
  usePatientSessionsInfinite,
  useUpdatePatient,
  useUpdatePatientHistory,
  useUpdatePatientProfileRecord,
  useUpdatePatientPrograms,
  useCreatePackageTransaction,
  usePatientBalanceLogs,
  useDeactivatePatientBranchRelationship,
} from "@/hooks/usePatients";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS, USER_ROLES } from "@/lib/constants";
import { useUIStore } from "@/store/uiStore";
import { resolveEffectiveBranchId } from "@/lib/branchScope";
import { useActiveBranchProfiles } from "@/hooks/useActiveBranchProfiles";
import {
  CLINIC_PROFILE_WORKFLOWS,
  clinicProfileSupportsWorkflow,
  getClinicProfileDetailFields,
  getClinicProfileLabel,
} from "@/lib/clinicProfiles";
import { PatientForm } from "./PatientForm";
import { SessionForm } from "../sessions/SessionForm";
import { useCreateSession } from "@/hooks/useSessions";
import {
  cn,
  formatDate,
  formatDateTime,
  formatTimeWithDate,
} from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Activity,
  BellRing,
  ClipboardCheck,
  FileText,
  Stethoscope,
  Wallet,
  CircleOff,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const normalizeTextItems = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? "" : String(item)))
      .filter((item) => item.trim().length > 0);
  }

  const single = String(value);
  return single.trim().length ? [single] : [];
};

function ProfileMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 px-3 py-2">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value ?? "--"}</div>
    </div>
  );
}

function buildProfileDetailDraft(fields, settings = {}) {
  return fields.reduce((acc, field) => {
    const value = settings?.[field.key];
    acc[field.key] = value == null ? "" : String(value);
    return acc;
  }, {});
}

function cleanProfileDetailDraft(fields, values = {}) {
  return fields.reduce((acc, field) => {
    const rawValue = values[field.key];
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

export default function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { hasAnyPermission, hasPermission, currentUser } = usePermissions();
  const [isEditing, setIsEditing] = useState(false);
  const updatePatient = useUpdatePatient();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [reassessmentCycleLength, setReassessmentCycleLength] = useState("");
  const updatePatientHistory = useUpdatePatientHistory();
  const [isEditingPrograms, setIsEditingPrograms] = useState(false);
  const [programItems, setProgramItems] = useState([]);
  const updatePatientPrograms = useUpdatePatientPrograms();
  const updatePatientProfileRecord = useUpdatePatientProfileRecord();
  const deactivateRelationship = useDeactivatePatientBranchRelationship();
  const { branchOverrideId } = useUIStore();
  const { supportsWorkflow, enabledProfiles } = useActiveBranchProfiles();
  const [relationshipToDeactivate, setRelationshipToDeactivate] =
    useState(null);
  const [selectedClinicalProfile, setSelectedClinicalProfile] = useState(null);
  const [isEditingProfileDetails, setIsEditingProfileDetails] = useState(false);
  const [profileDetailsDraft, setProfileDetailsDraft] = useState({});
  const [addBalanceAmount, setAddBalanceAmount] = useState("");
  const [addBalanceNote, setAddBalanceNote] = useState("");
  const [setBalanceAmount, setSetBalanceAmount] = useState("");
  const [setBalanceNote, setSetBalanceNote] = useState("");
  const [addRemainingAmount, setAddRemainingAmount] = useState("");
  const [addRemainingNote, setAddRemainingNote] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [balanceLogsPage, setBalanceLogsPage] = useState(1);
  const balanceLogsSectionRef = useRef(null);
  const hasScrolledToBalanceLogsRef = useRef(false);
  const createPackageTransaction = useCreatePackageTransaction();

  const canView = hasAnyPermission([
    PERMISSIONS["patients:viewAll"],
    PERMISSIONS["patients:viewAssigned"],
  ]);

  const {
    data: patient,
    isLoading: isPatientLoading,
    isError: isPatientError,
  } = usePatient(id);
  const isDoctorOnly = useMemo(() => {
    const roles =
      currentUser?.roles?.map((role) => role?.name?.toLowerCase()) || [];
    return (
      roles.length > 0 && roles.every((role) => role === USER_ROLES.DOCTOR)
    );
  }, [currentUser]);
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
  const profileRecords = useMemo(
    () =>
      Array.isArray(patient?.profileRecords)
        ? patient.profileRecords.filter((record) => record?.profile)
        : [],
    [patient?.profileRecords],
  );
  const clinicalProfiles = useMemo(() => {
    const orderedProfiles = [
      ...(Array.isArray(enabledProfiles) ? enabledProfiles : []),
      ...profileRecords.map((record) => record.profile),
    ];
    const seen = new Set();

    return orderedProfiles.filter((profile) => {
      if (!profile || seen.has(profile)) return false;
      seen.add(profile);
      return true;
    });
  }, [enabledProfiles, profileRecords]);
  const profileRecordByCode = useMemo(() => {
    const records = new Map();
    profileRecords.forEach((record) => {
      records.set(record.profile, record);
    });
    return records;
  }, [profileRecords]);
  const activeClinicalProfile =
    selectedClinicalProfile &&
    clinicalProfiles.includes(selectedClinicalProfile)
      ? selectedClinicalProfile
      : clinicalProfiles[0] || null;
  const activeClinicalRecord = useMemo(
    () =>
      activeClinicalProfile
        ? profileRecordByCode.get(activeClinicalProfile) || {
            profile: activeClinicalProfile,
            clinicalHistory: [],
            programs: [],
            settings: {},
          }
        : null,
    [activeClinicalProfile, profileRecordByCode],
  );
  const activeClinicalProfileLabel = activeClinicalProfile
    ? getClinicProfileLabel(activeClinicalProfile, t)
    : "";
  const activeProfileDetailFields = useMemo(
    () =>
      activeClinicalProfile
        ? getClinicProfileDetailFields(activeClinicalProfile)
        : [],
    [activeClinicalProfile],
  );
  const selectedSupportsVisitCategories = activeClinicalProfile
    ? clinicProfileSupportsWorkflow(
        activeClinicalProfile,
        CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
      )
    : false;
  const selectedSupportsAssessmentTracking = activeClinicalProfile
    ? clinicProfileSupportsWorkflow(
        activeClinicalProfile,
        CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
      )
    : false;
  const selectedSupportsTreatmentPackages = activeClinicalProfile
    ? clinicProfileSupportsWorkflow(
        activeClinicalProfile,
        CLINIC_PROFILE_WORKFLOWS.TREATMENT_PACKAGES,
      )
    : false;
  const selectedSupportsTreatmentPrograms = activeClinicalProfile
    ? clinicProfileSupportsWorkflow(
        activeClinicalProfile,
        CLINIC_PROFILE_WORKFLOWS.AUTO_FOLLOW_UP_VISITS,
      )
    : false;
  const showSelectedProfileSettings = Boolean(
    selectedSupportsVisitCategories ||
      selectedSupportsAssessmentTracking ||
      selectedSupportsTreatmentPackages ||
      selectedSupportsTreatmentPrograms,
  );
  const selectedProfileSettings = useMemo(
    () => activeClinicalRecord?.settings || {},
    [activeClinicalRecord],
  );
  const selectedCategoryName = selectedSupportsVisitCategories
    ? patient?.category?.name || null
    : null;
  const hasProfileDetails = activeProfileDetailFields.some((field) => {
    const value = selectedProfileSettings?.[field.key];
    return value !== null && value !== undefined && String(value).trim() !== "";
  });
  const canViewBalanceLogs =
    !isDoctorOnly &&
    selectedSupportsTreatmentPackages &&
    hasPermission(PERMISSIONS["patients:viewAll"]);
  const canViewInvoices =
    !isDoctorOnly && hasPermission(PERMISSIONS["invoices:view"]);

  const { data: balanceLogsData, isLoading: isBalanceLogsLoading } =
    usePatientBalanceLogs(
      id,
      {
        page: balanceLogsPage,
        limit: 10,
      },
      {
        enabled: Boolean(id) && canViewBalanceLogs,
      },
    );

  const canCreateSession = hasPermission(PERMISSIONS["sessions:create"]);
  const createSession = useCreateSession();

  const canEdit = useMemo(
    () =>
      hasPermission(PERMISSIONS["patients:update"]) ||
      hasPermission(PERMISSIONS["patients:updateAssigned"]),
    [hasPermission],
  );
  useEffect(() => {
    if (!clinicalProfiles.length) {
      if (selectedClinicalProfile !== null) {
        setSelectedClinicalProfile(null);
      }
      return;
    }

    if (
      !selectedClinicalProfile ||
      !clinicalProfiles.includes(selectedClinicalProfile)
    ) {
      setSelectedClinicalProfile(clinicalProfiles[0]);
    }
  }, [clinicalProfiles, selectedClinicalProfile]);

  useEffect(() => {
    setIsEditingHistory(false);
    setIsEditingPrograms(false);
    setIsEditingProfileDetails(false);
  }, [activeClinicalProfile]);

  useEffect(() => {
    if (!isEditingProfileDetails) {
      setProfileDetailsDraft(
        buildProfileDetailDraft(
          activeProfileDetailFields,
          selectedProfileSettings,
        ),
      );
    }
  }, [
    activeProfileDetailFields,
    isEditingProfileDetails,
    selectedProfileSettings,
  ]);

  const effectiveBranchId = useMemo(
    () => resolveEffectiveBranchId(currentUser, branchOverrideId),
    [currentUser, branchOverrideId],
  );
  const currentBalance = Number(patient?.balance ?? 0);
  const currentRemainingAmount = Number(
    selectedProfileSettings?.packageRemainingAmount ?? 0,
  );

  const handleStartEditHistory = () => {
    setHistoryItems(currentHistoryItems.length ? currentHistoryItems : [""]);
    if (selectedSupportsAssessmentTracking) {
      const nextCycleLength = selectedProfileSettings?.reassessmentCycleLength;
      setReassessmentCycleLength(
        nextCycleLength === null || nextCycleLength === undefined
          ? ""
          : String(nextCycleLength),
      );
    } else {
      setReassessmentCycleLength("");
    }
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
    setHistoryItems((prev) => [...prev, ""]);
  };

  const handleRemoveHistoryItem = (index) => {
    setHistoryItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveHistory = () => {
    const cleaned = historyItems
      .map((item) => (item == null ? "" : item.trim()))
      .filter((item) => item.length > 0);

    const parsedCycleLength =
      reassessmentCycleLength === ""
        ? null
        : Number.parseInt(reassessmentCycleLength, 10);

    const data = {
      medicalHistory: cleaned,
    };

    if (selectedSupportsAssessmentTracking) {
      data.reassessmentCycleLength =
        parsedCycleLength === null || Number.isNaN(parsedCycleLength)
          ? null
          : parsedCycleLength;
    }

    updatePatientHistory.mutate(
      {
        patientId: id,
        data,
      },
      {
        onSuccess: () => {
          setIsEditingHistory(false);
        },
      },
    );
  };

  const handleStartEditPrograms = () => {
    setProgramItems(currentProgramItems.length ? currentProgramItems : [""]);
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
    setProgramItems((prev) => [...prev, ""]);
  };

  const handleRemoveProgramItem = (index) => {
    setProgramItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePrograms = () => {
    const cleaned = programItems
      .map((item) => (item == null ? "" : item.trim()))
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
      },
    );
  };

  const handleStartEditProfileDetails = () => {
    setProfileDetailsDraft(
      buildProfileDetailDraft(
        activeProfileDetailFields,
        selectedProfileSettings,
      ),
    );
    setIsEditingProfileDetails(true);
  };

  const handleChangeProfileDetail = (fieldKey, value) => {
    setProfileDetailsDraft((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  };

  const handleSaveProfileDetails = () => {
    if (!activeClinicalProfile) return;

    updatePatientProfileRecord.mutate(
      {
        patientId: id,
        profile: activeClinicalProfile,
        data: {
          details: cleanProfileDetailDraft(
            activeProfileDetailFields,
            profileDetailsDraft,
          ),
        },
      },
      {
        onSuccess: () => {
          setIsEditingProfileDetails(false);
        },
      },
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
        t("patients.enterValidAmount", {
          defaultValue: "Enter a valid amount.",
        }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: amount,
      remainingDelta: 0,
      reason: "package_payment",
      notes:
        addBalanceNote.trim() ||
        t("patients.addedToBalanceNote", {
          defaultValue: "Added {{amount}} to patient balance",
          amount,
        }),
      onSuccess: () => {
        setAddBalanceAmount("");
        setAddBalanceNote("");
      },
    });
  };

  const handleSetBalance = () => {
    const targetAmount = Number.parseInt(setBalanceAmount, 10);
    if (Number.isNaN(targetAmount) || targetAmount < 0) {
      toast.error(
        t("patients.enterValidTargetBalance", {
          defaultValue: "Enter a valid balance value.",
        }),
      );
      return;
    }

    const correctionDelta = targetAmount - currentBalance;
    if (correctionDelta === 0) {
      toast.error(
        t("patients.noBalanceChange", {
          defaultValue: "New value is the same as current balance.",
        }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: correctionDelta,
      remainingDelta: 0,
      reason: "manual_correction",
      notes:
        setBalanceNote.trim() ||
        t("patients.balanceCorrectedNote", {
          defaultValue: "Balance corrected from {{from}} to {{to}}",
          from: currentBalance,
          to: targetAmount,
        }),
      onSuccess: () => {
        setSetBalanceAmount("");
        setSetBalanceNote("");
      },
    });
  };

  const handleMoveFromRemainingToBalance = () => {
    const amount = Number.parseInt(transferAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(
        t("patients.enterValidAmount", {
          defaultValue: "Enter a valid amount.",
        }),
      );
      return;
    }

    if (amount > currentRemainingAmount) {
      toast.error(
        t("patients.transferExceedsRemaining", {
          defaultValue: "Amount is higher than the remaining due amount.",
        }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: amount,
      remainingDelta: -amount,
      reason: "remaining_adjustment",
      notes:
        transferNote.trim() ||
        t("patients.transferFromRemainingNote", {
          defaultValue: "Moved {{amount}} from amount due to balance",
          amount,
        }),
      onSuccess: () => {
        setTransferAmount("");
        setTransferNote("");
      },
    });
  };

  const handleAddToRemainingAmount = () => {
    const amount = Number.parseInt(addRemainingAmount, 10);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(
        t("patients.enterValidAmount", {
          defaultValue: "Enter a valid amount.",
        }),
      );
      return;
    }

    submitPackageUpdate({
      balanceDelta: 0,
      remainingDelta: amount,
      reason: "remaining_adjustment",
      notes:
        addRemainingNote.trim() ||
        t("patients.increaseRemainingNote", {
          defaultValue: "Increased remaining amount by {{amount}}",
          amount,
        }),
      onSuccess: () => {
        setAddRemainingAmount("");
        setAddRemainingNote("");
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
    return sessionsData.pages.flatMap((page) => page.data || []);
  }, [sessionsData]);

  const loadMoreRef = useRef(null);
  const sectionParam = searchParams.get("section");

  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    setBalanceLogsPage(1);
  }, [id]);

  useEffect(() => {
    hasScrolledToBalanceLogsRef.current = false;
  }, [id, sectionParam]);

  const currentHistoryItems = useMemo(() => {
    return normalizeTextItems(activeClinicalRecord?.clinicalHistory);
  }, [activeClinicalRecord?.clinicalHistory]);

  const currentProgramItems = useMemo(() => {
    return normalizeTextItems(activeClinicalRecord?.programs);
  }, [activeClinicalRecord?.programs]);

  const completedSessionsCount = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return 0;
    return sessions.filter(
      (session) => session.status === "completed" && !session.isAssessment,
    ).length;
  }, [sessions]);

  const cancelledSessionsCount = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return 0;
    return sessions.filter(
      (session) => session.status === "cancelled" && !session.isAssessment,
    ).length;
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
    patient?.primaryBranch?.name
      ? `${t("patients.primaryBranch", { defaultValue: "Primary branch" })}: ${patient.primaryBranch.name}`
      : null,
  ]
    .filter(Boolean)
    .join(" | ");
  const activeBranchRelationships = useMemo(
    () =>
      Array.isArray(patient?.branchRelationships)
        ? patient.branchRelationships.filter(
            (relationship) => relationship?.status === "active",
          )
        : [],
    [patient?.branchRelationships],
  );
  const canDeactivateRelationship = (relationship) =>
    canEdit &&
    !relationship?.isPrimary &&
    effectiveBranchId != null &&
    Number(relationship?.branchId) === Number(effectiveBranchId);
  const handleConfirmDeactivateRelationship = () => {
    if (!relationshipToDeactivate) return;

    deactivateRelationship.mutate(
      {
        patientId: id,
        relationshipId: relationshipToDeactivate.id,
      },
      {
        onSuccess: () => {
          setRelationshipToDeactivate(null);
          navigate("/patients");
        },
      },
    );
  };
  const requestedSection = searchParams.get("section");
  const formatSignedAmount = (value) => {
    const numericValue = Number(value || 0);
    return numericValue > 0 ? `+${numericValue}` : `${numericValue}`;
  };
  const describeBalanceLogAction = (log) => {
    if (!log) return t("common.update", { defaultValue: "Update" });

    if (log.type === "session_payment") {
      return t("patients.logActionSessionUsedBalance", {
        defaultValue: "Session used balance",
      });
    }

    if (log.type === "refund" || log.type === "cancellation_credit") {
      return t("patients.logActionReturnedToBalance", {
        defaultValue: "Amount returned to balance",
      });
    }

    if (
      log.type === "remaining_adjustment" &&
      Number(log.amount || 0) > 0 &&
      Number(log.remainingDelta || 0) < 0
    ) {
      return t("patients.logActionMovedToBalance", {
        defaultValue: "Moved from amount due to balance",
      });
    }

    if (
      log.type === "remaining_adjustment" &&
      Number(log.amount || 0) === 0 &&
      Number(log.remainingDelta || 0) > 0
    ) {
      return t("patients.logActionIncreasedRemaining", {
        defaultValue: "Increased remaining amount",
      });
    }

    if (log.type === "manual_adjustment") {
      return t("patients.logActionBalanceCorrected", {
        defaultValue: "Balance corrected",
      });
    }

    if (Number(log.amount || 0) > 0) {
      return t("patients.logActionAddedToBalance", {
        defaultValue: "Added to balance",
      });
    }

    if (Number(log.amount || 0) < 0) {
      return t("patients.logActionReducedBalance", {
        defaultValue: "Reduced from balance",
      });
    }

    return t("common.update", { defaultValue: "Update" });
  };

  const describeBalanceLogChanges = (log) => {
    const changes = [];
    const amount = Number(log?.amount || 0);
    const remainingDelta = Number(log?.remainingDelta || 0);

    if (amount !== 0) {
      changes.push(
        t("patients.logBalanceChange", {
          defaultValue: "Balance: {{value}}",
          value: formatSignedAmount(amount),
        }),
      );
    }

    if (remainingDelta !== 0) {
      changes.push(
        t("patients.logRemainingChange", {
          defaultValue: "Amount due: {{value}}",
          value: formatSignedAmount(remainingDelta),
        }),
      );
    }

    if (!changes.length) {
      return t("patients.logNoAmountChange", {
        defaultValue: "No amount change",
      });
    }

    return changes.join(" • ");
  };

  useEffect(() => {
    if (
      requestedSection !== "balance-logs" ||
      !canViewBalanceLogs ||
      !balanceLogsSectionRef.current ||
      isBalanceLogsLoading ||
      hasScrolledToBalanceLogsRef.current
    ) {
      return;
    }

    balanceLogsSectionRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
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
        title={t("messages.errorOccurred")}
        description={t("common.error")}
        action={() => navigate(-1)}
        actionLabel={t("common.back")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            {patient.fullName}
            {supportsAssessmentTracking &&
              patient.sessionsUntilReassessment === 0 && (
                <span className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50">
                  <BellRing
                    className="h-5 w-5 text-sky-500 dark:text-sky-400 flex-shrink-0"
                    aria-hidden="true"
                    title={t("patients.reassessmentDue", {
                      defaultValue: "Reassessment due",
                    })}
                  />
                </span>
              )}
            {supportsTreatmentPackages && isBalanceExhaustedAfterUse && (
              <span className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50">
                <CircleOff
                  className="h-5 w-5 text-sky-600 dark:text-sky-300"
                  aria-hidden="true"
                  title={t("patients.balanceExhaustedAfterUse", {
                    defaultValue: "Previously had balance, now exhausted",
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
                {isCreatingSession
                  ? t("common.close")
                  : t("sessions.createSession")}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsEditing((prev) => !prev)}
              >
                {isEditing ? t("common.close") : t("common.edit")}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                navigate(`/patient-payments?patientId=${patient.id}`)
              }
            >
              {t("patients.payments", { defaultValue: "Payments" })}
            </Button>
            {canViewInvoices && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate(`/invoices?patientId=${patient.id}`)}
              >
                {t("nav.invoices", { defaultValue: "Invoices" })}
              </Button>
            )}
          </>
        }
      />

      {canCreateSession && isCreatingSession && (
        <SessionForm
          initialValues={{
            doctorId: undefined,
            patientId: Number(id),
            sessionDate: "",
            sessionTime: "",
            cost: showPhysiotherapyPatientSettings
              ? (patient.defaultSessionCost ?? undefined)
              : undefined,
            categoryId: supportsVisitCategories
              ? (patient.categoryId ?? patient.category?.id ?? undefined)
              : undefined,
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
            fullName: patient.fullName || "",
            age: patient.age ?? undefined,
            phone: patient.phone || "",
            job: patient.job || "",
            address: patient.address || "",
            referral: patient.referral || "",
            categoryId: supportsVisitCategories
              ? (patient.categoryId ?? patient.category?.id ?? undefined)
              : undefined,
            defaultSessionCost: showPhysiotherapyPatientSettings
              ? (patient.defaultSessionCost ?? undefined)
              : undefined,
            reassessmentCycleLength: supportsAssessmentTracking
              ? (patient.reassessmentCycleLength ?? undefined)
              : undefined,
          }}
          showPhysiotherapySettings={showPhysiotherapyPatientSettings}
          showDefaultSessionCost={!isDoctorOnly}
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
              },
            )
          }
        />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("patients.companyPatientRecord")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">{t("patients.fullName")}:</span>{" "}
              {patient.fullName}
            </div>
            <div>
              <span className="font-medium">{t("patients.age")}:</span>{" "}
              {patient.age ?? "--"}
            </div>
            <div>
              <span className="font-medium">{t("patients.phone")}:</span>{" "}
              {patient.phone || "--"}
            </div>
            <div>
              <span className="font-medium">
                {t("patients.job", { defaultValue: "Job" })}:
              </span>{" "}
              {patient.job || "--"}
            </div>
            <div>
              <span className="font-medium">{t("patients.address")}:</span>{" "}
              {patient.address || "--"}
            </div>
            <div>
              <span className="font-medium">
                {t("patients.referral", { defaultValue: "Referral" })}:
              </span>{" "}
              {patient.referral || "--"}
            </div>
            <div>
              <span className="font-medium">
                {t("patients.primaryBranch", {
                  defaultValue: "Primary branch",
                })}
                :
              </span>{" "}
              {patient.primaryBranch?.name || "--"}
            </div>
            <div>
              <span className="font-medium">
                {t("patients.branchRelationships", {
                  defaultValue: "Branch relationships",
                })}
                :
              </span>{" "}
              {activeBranchRelationships.length ? "" : "--"}
            </div>
            {activeBranchRelationships.length > 0 && (
              <div className="space-y-2 pt-1">
                {activeBranchRelationships.map((relationship) => (
                  <div
                    key={relationship.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {relationship.branch?.name || "--"}
                        </span>
                        {relationship.isPrimary && (
                          <Badge variant="secondary">
                            {t("patients.primaryBranch", {
                              defaultValue: "Primary branch",
                            })}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {relationship.relationshipType || "care"}
                      </div>
                    </div>
                    {canDeactivateRelationship(relationship) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setRelationshipToDeactivate(relationship)
                        }
                        disabled={deactivateRelationship.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t("patients.removeFromThisBranch", {
                          defaultValue: "Remove from this branch",
                        })}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("patients.branchClinicalRecords")}
              {activeClinicalProfileLabel && (
                <Badge variant="secondary">{activeClinicalProfileLabel}</Badge>
              )}
            </CardTitle>
            {canEdit && showSelectedProfileSettings && isEditingHistory ? (
              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddHistoryItem}
                  disabled={updatePatientHistory.isPending}
                >
                  + {t("common.create")}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditingHistory(false)}
                    disabled={updatePatientHistory.isPending}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveHistory}
                    disabled={updatePatientHistory.isPending}
                  >
                    {updatePatientHistory.isPending
                      ? t("common.loading")
                      : t("common.save")}
                  </Button>
                </div>
              </div>
            ) : canEdit && showSelectedProfileSettings ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isEditingHistory
                    ? setIsEditingHistory(false)
                    : handleStartEditHistory()
                }
              >
                {t("common.edit")}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-5">
            {clinicalProfiles.length ? (
              <>
                <div
                  className="flex flex-wrap gap-2"
                  role="tablist"
                  aria-label={t("patients.branchClinicalRecords")}
                >
                  {clinicalProfiles.map((profile) => {
                    const isSelected = profile === activeClinicalProfile;
                    const hasRecord = profileRecordByCode.has(profile);

                    return (
                      <button
                        key={profile}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted",
                        )}
                        onClick={() => setSelectedClinicalProfile(profile)}
                      >
                        {getClinicProfileLabel(profile, t)}
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            hasRecord
                              ? isSelected
                                ? "bg-primary-foreground"
                                : "bg-primary"
                              : "bg-muted-foreground/40",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
                {showSelectedProfileSettings && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {selectedSupportsVisitCategories && (
                      <ProfileMetric
                        label={t("patients.category", {
                          defaultValue: "Category",
                        })}
                        value={selectedCategoryName || "--"}
                      />
                    )}
                    {!isDoctorOnly && (
                      <ProfileMetric
                        label={t("patients.defaultSessionCost", {
                          defaultValue: "Default session cost",
                        })}
                        value={
                          selectedProfileSettings.defaultSessionCost ?? "--"
                        }
                      />
                    )}
                    {selectedSupportsAssessmentTracking && (
                      <ProfileMetric
                        label={t("patients.reassessmentCycleLength", {
                          defaultValue: "Reassessment cycle length",
                        })}
                        value={
                          selectedProfileSettings.reassessmentCycleLength ??
                          "--"
                        }
                      />
                    )}
                    {selectedSupportsAssessmentTracking && (
                      <ProfileMetric
                        label={t("sessions.sessionsUntilReassessment", {
                          defaultValue: "Sessions until reassessment",
                        })}
                        value={
                          selectedProfileSettings.sessionsUntilReassessment ??
                          "--"
                        }
                      />
                    )}
                  </div>
                )}
                {activeProfileDetailFields.length > 0 ? (
                  <div className="rounded-md border bg-muted/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Activity className="h-4 w-4 text-primary" />
                          {t("patients.profileSummary")}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activeClinicalProfileLabel}
                        </p>
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            isEditingProfileDetails
                              ? setIsEditingProfileDetails(false)
                              : handleStartEditProfileDetails()
                          }
                          disabled={updatePatientProfileRecord.isPending}
                        >
                          {isEditingProfileDetails
                            ? t("common.close")
                            : t("common.edit")}
                        </Button>
                      )}
                    </div>

                    {isEditingProfileDetails ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          {activeProfileDetailFields.map((field) => (
                            <div
                              key={field.key}
                              className={
                                field.type === "textarea"
                                  ? "space-y-2 md:col-span-2"
                                  : "space-y-2"
                              }
                            >
                              <Label htmlFor={`patient-profile-${field.key}`}>
                                {t(field.labelKey, {
                                  defaultValue: field.defaultLabel,
                                })}
                              </Label>
                              {field.type === "textarea" ? (
                                <Textarea
                                  id={`patient-profile-${field.key}`}
                                  rows={4}
                                  value={profileDetailsDraft[field.key] || ""}
                                  onChange={(event) =>
                                    handleChangeProfileDetail(
                                      field.key,
                                      event.target.value,
                                    )
                                  }
                                  disabled={
                                    updatePatientProfileRecord.isPending
                                  }
                                />
                              ) : (
                                <Input
                                  id={`patient-profile-${field.key}`}
                                  type={
                                    field.type === "number" ? "number" : "text"
                                  }
                                  min={field.type === "number" ? 1 : undefined}
                                  value={profileDetailsDraft[field.key] || ""}
                                  onChange={(event) =>
                                    handleChangeProfileDetail(
                                      field.key,
                                      event.target.value,
                                    )
                                  }
                                  disabled={
                                    updatePatientProfileRecord.isPending
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditingProfileDetails(false)}
                            disabled={updatePatientProfileRecord.isPending}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveProfileDetails}
                            disabled={updatePatientProfileRecord.isPending}
                          >
                            {updatePatientProfileRecord.isPending
                              ? t("common.loading")
                              : t("common.save")}
                          </Button>
                        </div>
                      </div>
                    ) : hasProfileDetails ? (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {activeProfileDetailFields
                          .filter((field) => {
                            const value = selectedProfileSettings[field.key];
                            return (
                              value !== null &&
                              value !== undefined &&
                              String(value).trim() !== ""
                            );
                          })
                          .map((field) => (
                            <div
                              key={field.key}
                              className={
                                field.type === "textarea"
                                  ? "space-y-1 md:col-span-2"
                                  : "space-y-1"
                              }
                            >
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {t(field.labelKey, {
                                  defaultValue: field.defaultLabel,
                                })}
                              </p>
                              <p className="whitespace-pre-line text-sm">
                                {String(selectedProfileSettings[field.key])}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">
                        {t("patients.profileRecordEmpty")}
                      </p>
                    )}
                  </div>
                ) : !showSelectedProfileSettings ? (
                  <div className="rounded-md border border-dashed bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Activity className="h-4 w-4 text-primary" />
                      {t("patients.profileRecord")}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("patients.profileRecordEmpty")}
                    </p>
                  </div>
                ) : null}
                <div className="border-t pt-4">
                  <div className="mb-3 text-sm font-semibold">
                    {t("patients.clinicalHistory")}
                  </div>
                  {isEditingHistory &&
                  canEdit &&
                  showSelectedProfileSettings ? (
                    <div className="space-y-4">
                      {historyItems.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {t("patients.patientHistory")} #{index + 1}
                            </span>
                            {historyItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveHistoryItem(index)}
                                disabled={updatePatientHistory.isPending}
                              >
                                {t("common.delete")}
                              </Button>
                            )}
                          </div>
                          <Textarea
                            rows={4}
                            value={item}
                            onChange={(e) =>
                              handleChangeHistoryItem(index, e.target.value)
                            }
                            disabled={updatePatientHistory.isPending}
                          />
                        </div>
                      ))}

                      {selectedSupportsAssessmentTracking && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {t("patients.reassessmentCycleLength", {
                                defaultValue: "Reassessment cycle length",
                              })}
                            </span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={reassessmentCycleLength}
                            onChange={(e) =>
                              setReassessmentCycleLength(e.target.value)
                            }
                            disabled={updatePatientHistory.isPending}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder={t("sessions.reassessmentPlaceholder", {
                              defaultValue: "e.g. 10",
                            })}
                          />
                        </div>
                      )}
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
                    <p className="text-sm text-muted-foreground">
                      {t("messages.noDataFound")}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("patients.noEnabledClinicalProfiles")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {!isDoctorOnly && selectedSupportsTreatmentPackages && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {t("patients.balanceAndPackages", {
                defaultValue: "Balance and package amount",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  {t("patients.currentBalance", {
                    defaultValue: "Current balance",
                  })}
                </div>
                <div className="mt-1 text-2xl font-bold text-primary">
                  {currentBalance}
                </div>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  {t("patients.amountStillDue", {
                    defaultValue: "Amount still due",
                  })}
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {currentRemainingAmount}
                </div>
              </div>
            </div>

            {isBalanceExhaustedAfterUse && (
              <div className="flex items-center gap-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-xs text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                <CircleOff className="h-4 w-4" />
                <span>
                  {t("patients.balanceExhaustedAfterUse", {
                    defaultValue: "Previously had balance, now exhausted",
                  })}
                </span>
              </div>
            )}

            {canEdit && (
              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2 rounded-md border p-3">
                  <div className="text-sm font-semibold">
                    {t("patients.addBalanceSimple", {
                      defaultValue: "Add to balance",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("patients.addBalanceSimpleHint", {
                      defaultValue:
                        "Use this when the patient pays part of a package.",
                    })}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={addBalanceAmount}
                    onChange={(event) =>
                      setAddBalanceAmount(event.target.value)
                    }
                    placeholder={t("common.amount")}
                    disabled={createPackageTransaction.isPending}
                  />
                  <Input
                    value={addBalanceNote}
                    onChange={(event) => setAddBalanceNote(event.target.value)}
                    placeholder={t("common.notes")}
                    disabled={createPackageTransaction.isPending}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleAddToBalance}
                    disabled={createPackageTransaction.isPending}
                  >
                    {createPackageTransaction.isPending
                      ? t("common.loading")
                      : t("patients.addBalanceSimple", {
                          defaultValue: "Add to balance",
                        })}
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="text-sm font-semibold">
                    {t("patients.increaseRemainingAmount", {
                      defaultValue: "Increase remaining amount",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("patients.increaseRemainingAmountHint", {
                      defaultValue:
                        "Use this when there is still an unpaid amount in the package.",
                    })}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={addRemainingAmount}
                    onChange={(event) =>
                      setAddRemainingAmount(event.target.value)
                    }
                    placeholder={t("common.amount")}
                    disabled={createPackageTransaction.isPending}
                  />
                  <Input
                    value={addRemainingNote}
                    onChange={(event) =>
                      setAddRemainingNote(event.target.value)
                    }
                    placeholder={t("common.notes")}
                    disabled={createPackageTransaction.isPending}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleAddToRemainingAmount}
                    disabled={createPackageTransaction.isPending}
                  >
                    {createPackageTransaction.isPending
                      ? t("common.loading")
                      : t("patients.increaseRemainingAmount", {
                          defaultValue: "Increase remaining amount",
                        })}
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="text-sm font-semibold">
                    {t("patients.correctBalance", {
                      defaultValue: "Correct balance",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("patients.correctBalanceHint", {
                      defaultValue: "Set the balance to an exact value.",
                    })}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={setBalanceAmount}
                    onChange={(event) =>
                      setSetBalanceAmount(event.target.value)
                    }
                    placeholder={t("patients.newBalanceValue", {
                      defaultValue: "New balance value",
                    })}
                    disabled={createPackageTransaction.isPending}
                  />
                  <Input
                    value={setBalanceNote}
                    onChange={(event) => setSetBalanceNote(event.target.value)}
                    placeholder={t("common.notes")}
                    disabled={createPackageTransaction.isPending}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleSetBalance}
                    disabled={createPackageTransaction.isPending}
                  >
                    {createPackageTransaction.isPending
                      ? t("common.loading")
                      : t("patients.correctBalance", {
                          defaultValue: "Correct balance",
                        })}
                  </Button>
                </div>

                <div className="space-y-2 rounded-md border p-3">
                  <div className="text-sm font-semibold">
                    {t("patients.moveFromDueToBalance", {
                      defaultValue: "Move from due amount to balance",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("patients.moveFromDueToBalanceHint", {
                      defaultValue:
                        "Use this after collecting part of the due amount.",
                    })}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={transferAmount}
                    onChange={(event) => setTransferAmount(event.target.value)}
                    placeholder={t("common.amount")}
                    disabled={
                      createPackageTransaction.isPending ||
                      currentRemainingAmount <= 0
                    }
                  />
                  <Input
                    value={transferNote}
                    onChange={(event) => setTransferNote(event.target.value)}
                    placeholder={t("common.notes")}
                    disabled={
                      createPackageTransaction.isPending ||
                      currentRemainingAmount <= 0
                    }
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleMoveFromRemainingToBalance}
                    disabled={
                      createPackageTransaction.isPending ||
                      currentRemainingAmount <= 0
                    }
                  >
                    {createPackageTransaction.isPending
                      ? t("common.loading")
                      : t("patients.moveAmount", {
                          defaultValue: "Move amount",
                        })}
                  </Button>
                  {currentRemainingAmount <= 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("patients.noRemainingToMove", {
                        defaultValue: "No due amount to move right now.",
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedSupportsTreatmentPrograms && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{t("sessions.program")}</CardTitle>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isEditingPrograms
                    ? setIsEditingPrograms(false)
                    : handleStartEditPrograms()
                }
              >
                {isEditingPrograms ? t("common.close") : t("common.edit")}
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
                        {t("sessions.program")} #{index + 1}
                      </span>
                      {programItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProgramItem(index)}
                          disabled={updatePatientPrograms.isPending}
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      rows={4}
                      value={item}
                      onChange={(e) =>
                        handleChangeProgramItem(index, e.target.value)
                      }
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
                    + {t("common.create")}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditingPrograms(false)}
                      disabled={updatePatientPrograms.isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSavePrograms}
                      disabled={updatePatientPrograms.isPending}
                    >
                      {updatePatientPrograms.isPending
                        ? t("common.loading")
                        : t("common.save")}
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
              <p className="text-sm text-muted-foreground">
                {t("messages.noDataFound")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canViewBalanceLogs && (
        <Card ref={balanceLogsSectionRef}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              {t("patients.balanceLogs", { defaultValue: "Notes and history" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isBalanceLogsLoading ? (
              <LoadingSpinner />
            ) : balanceLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("messages.noDataFound")}
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
                          {log.createdAt
                            ? formatDateTime(log.createdAt, "PP p")
                            : "--"}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("common.amount", { defaultValue: "Amount" })}:{" "}
                        <span className="font-medium text-foreground">
                          {formatSignedAmount(log?.amount)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {describeBalanceLogChanges(log)}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {t("payments.recordedBy", {
                          defaultValue: "Recorded by",
                        })}
                        :{" "}
                        <span className="font-medium text-foreground">
                          {log.createdBy?.fullName || "--"}
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
                    {t("common.paginationSummary", {
                      from: balanceLogs.length
                        ? (balanceLogsPage - 1) * 10 + 1
                        : 0,
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
                        setBalanceLogsPage((previous) =>
                          Math.max(1, previous - 1),
                        )
                      }
                    >
                      {t("common.previous")}
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
                      {t("common.next")}
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
            {t("patients.patientSessionHistory")}
            <div className="flex items-center gap-2">
              <Badge
                variant="default"
                className="ml-2 mt-2 flex items-baseline gap-2 bg-green-600 hover:bg-green-700"
              >
                <span className="text-xs font-semibold leading-none">
                  {completedSessionsCount}
                </span>
                <span className="text-xs uppercase tracking-wide">
                  {t("sessions.completed", { defaultValue: "Completed" })}
                </span>
              </Badge>
              <Badge
                variant="default"
                className="mt-2 flex items-baseline gap-2 bg-red-600 hover:bg-red-700"
              >
                <span className="text-xs font-semibold leading-none">
                  {cancelledSessionsCount}
                </span>
                <span className="text-xs uppercase tracking-wide">
                  {t("sessions.cancelled", { defaultValue: "Cancelled" })}
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
              <table
                className="w-full text-sm"
                dir={i18n.language === "ar" ? "rtl" : "ltr"}
              >
                <thead>
                  <tr
                    className={`border-b bg-muted/50 text-xs uppercase text-muted-foreground ${
                      i18n.language === "ar" ? "text-right" : "text-left"
                    }`}
                  >
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.date")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.startedAt")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.arrivalTime")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.startTime", { defaultValue: "Start time" })}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.endTime", { defaultValue: "End time" })}
                    </th>
                    {supportsVisitCategories && (
                      <th className="px-4 py-3 font-medium">
                        {t("sessions.category", { defaultValue: "Category" })}
                      </th>
                    )}
                    <th className="px-4 py-3 font-medium">
                      {t("users.branch", { defaultValue: "Branch" })}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.status")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.doctor")}
                    </th>
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
                          {session.sessionDate
                            ? formatDate(session.sessionDate, "PP")
                            : "--"}
                          {supportsAssessmentTracking &&
                          session.isReassessment ? (
                            <Badge className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-teal-100 p-0 text-teal-800 dark:border-teal-800 dark:bg-teal-900/40 dark:text-teal-100">
                              <ClipboardCheck
                                className="h-5 w-5 text-teal-600"
                                aria-hidden="true"
                              />
                            </Badge>
                          ) : supportsAssessmentTracking &&
                            session.isAssessment ? (
                            <Badge className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-purple-200 bg-purple-100 p-0 text-purple-800 dark:border-purple-800 dark:bg-purple-900/40 dark:text-purple-100">
                              <Stethoscope
                                className="h-5 w-5 text-primary"
                                aria-hidden="true"
                              />
                            </Badge>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {session.sessionTime ? (
                          <span dir="ltr" className="inline-block font-mono">
                            {formatDateTime(
                              `${session.sessionDate}T${session.sessionTime}`,
                              "p",
                            )}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {session.arrivalTime ? (
                          <span dir="ltr" className="inline-block font-mono">
                            {formatDateTime(
                              `${session.sessionDate}T${session.arrivalTime}`,
                              "p",
                            )}
                          </span>
                        ) : (
                          "--"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeWithDate(
                            session.startTime,
                            session.sessionDate,
                          ) || "--"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeWithDate(
                            session.endTime,
                            session.sessionDate,
                          ) || "--"}
                        </span>
                      </td>
                      {supportsVisitCategories && (
                        <td className="px-4 py-3">
                          {session.category?.name || "--"}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{session.branch?.name || "--"}</span>
                          {patient.primaryBranchId != null &&
                            session.branchId != null &&
                            Number(patient.primaryBranchId) !==
                              Number(session.branchId) && (
                              <Badge variant="outline">
                                {t("patients.crossBranchService", {
                                  defaultValue: "Cross-branch",
                                })}
                              </Badge>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{session.status || "--"}</td>
                      <td className="px-4 py-3">
                        {session.doctor?.fullName || "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasNextPage && (
                <div ref={loadMoreRef} className="py-4 text-center">
                  {isFetchingNextPage ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("common.loadMore", { defaultValue: "Load more" })}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("sessions.noSessions")}
            </p>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={Boolean(relationshipToDeactivate)}
        onOpenChange={(open) => {
          if (!open) {
            setRelationshipToDeactivate(null);
          }
        }}
        title={t("patients.removeBranchRelationshipTitle", {
          defaultValue: "Remove patient from this branch?",
        })}
        description={t("patients.removeBranchRelationshipDescription", {
          defaultValue:
            "The patient will no longer appear in this branch. Their company patient record and other branch relationships will remain unchanged.",
        })}
        confirmText={t("patients.removeFromThisBranch", {
          defaultValue: "Remove from this branch",
        })}
        onConfirm={handleConfirmDeactivateRelationship}
        isLoading={deactivateRelationship.isPending}
      />
    </div>
  );
}
