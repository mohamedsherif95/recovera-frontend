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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CLINIC_PROFILES, PERMISSIONS, USER_ROLES } from "@/lib/constants";
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
import { SessionFormDrawer } from "../sessions/SessionFormDrawer";
import { useCreateSession } from "@/hooks/useSessions";
import {
  cn,
  formatDate,
  formatDateTime,
  formatTimeWithDate,
  formatWesternNumber,
} from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { ImpactMetric, ImpactPanel } from "@/components/common/ImpactPanel";
import { VisitImageGallery } from "@/components/visit-images/VisitImageGallery";
import {
  Activity,
  BellRing,
  Building2,
  ClipboardCheck,
  FileText,
  Stethoscope,
  Wallet,
  CircleOff,
  XCircle,
  ArrowRightLeft,
} from "lucide-react";
import toast from "react-hot-toast";

const BALANCE_ACTION_TYPES = {
  ADD_BALANCE: "add_balance",
  ADD_DUE: "add_due",
  CORRECT_BALANCE: "correct_balance",
  MOVE_DUE_TO_BALANCE: "move_due_to_balance",
  WRITE_OFF_DUE: "write_off_due",
};

const normalizeTextItems = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? "" : String(item.note || item).trim()))
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
  const [createSessionDueConfirmOpen, setCreateSessionDueConfirmOpen] =
    useState(false);
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
  const [balanceSheetOpen, setBalanceSheetOpen] = useState(false);
  const [balanceActionType, setBalanceActionType] = useState(
    BALANCE_ACTION_TYPES.ADD_BALANCE,
  );
  const [balanceActionAmount, setBalanceActionAmount] = useState("");
  const [balanceTargetAmount, setBalanceTargetAmount] = useState("");
  const [balanceActionNote, setBalanceActionNote] = useState("");
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
  const hasOutstandingAmountDue =
    selectedSupportsTreatmentPackages && currentRemainingAmount > 0;
  const formatAmount = (value) => formatWesternNumber(value);
  const formatSignedAmount = (value) => {
    const numericValue = Number(value || 0);
    if (numericValue > 0) return `+${formatAmount(numericValue)}`;
    if (numericValue < 0) return `-${formatAmount(Math.abs(numericValue))}`;
    return formatAmount(0);
  };
  const getPreviewDeltaBadgeClass = (value, negativeIsGood = false) => {
    const numericValue = Number(value || 0);

    if (numericValue === 0) {
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300";
    }

    const isPositiveOutcome = negativeIsGood
      ? numericValue < 0
      : numericValue > 0;

    return isPositiveOutcome
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
  };
  const balanceActionOptions = useMemo(
    () => [
      {
        value: BALANCE_ACTION_TYPES.ADD_BALANCE,
        label: t("patients.balanceActionAddBalance", {
          defaultValue: "Add additional balance",
        }),
        description: t("patients.balanceActionAddBalanceHint", {
          defaultValue: "Use when the patient pays into a package balance.",
        }),
        amountLabel: t("common.amount", { defaultValue: "Amount" }),
      },
      {
        value: BALANCE_ACTION_TYPES.ADD_DUE,
        label: t("patients.balanceActionAddDue", {
          defaultValue: "Add amount due",
        }),
        description: t("patients.balanceActionAddDueHint", {
          defaultValue:
            "Use this when the patient has an unpaid amount that should be tracked.",
        }),
        amountLabel: t("common.amount", { defaultValue: "Amount" }),
      },
      {
        value: BALANCE_ACTION_TYPES.MOVE_DUE_TO_BALANCE,
        label: t("patients.balanceActionMoveDue", {
          defaultValue: "Move due amount to balance",
        }),
        description: t("patients.balanceActionMoveDueHint", {
          defaultValue: "Use after collecting part of the amount due.",
        }),
        amountLabel: t("common.amount", { defaultValue: "Amount" }),
      },
      {
        value: BALANCE_ACTION_TYPES.WRITE_OFF_DUE,
        label: t("patients.balanceActionWriteOffDue", {
          defaultValue: "Write off amount due",
        }),
        description: t("patients.balanceActionWriteOffDueHint", {
          defaultValue:
            "Use this when part of the due amount should be removed without becoming balance.",
        }),
        amountLabel: t("patients.writeOffAmount", {
          defaultValue: "Write-off amount",
        }),
        requiresNote: true,
      },
      {
        value: BALANCE_ACTION_TYPES.CORRECT_BALANCE,
        label: t("patients.balanceActionCorrectBalance", {
          defaultValue: "correct available balance",
        }),
        description: t("patients.balanceActionCorrectBalanceHint", {
          defaultValue: "Set the available balance to an exact value.",
        }),
        amountLabel: t("patients.newBalanceValue", {
          defaultValue: "New balance value",
        }),
        usesTargetAmount: true,
        requiresNote: true,
      },
    ],
    [t],
  );
  const selectedBalanceAction =
    balanceActionOptions.find((option) => option.value === balanceActionType) ||
    balanceActionOptions[0];
  const balanceAdjustmentPreview = useMemo(() => {
    const amount = Number.parseInt(balanceActionAmount, 10);
    const targetAmount = Number.parseInt(balanceTargetAmount, 10);
    let balanceDelta = 0;
    let remainingDelta = 0;
    let reason = "remaining_adjustment";

    if (balanceActionType === BALANCE_ACTION_TYPES.ADD_BALANCE) {
      balanceDelta = Number.isNaN(amount) ? 0 : amount;
      reason = "package_payment";
    } else if (balanceActionType === BALANCE_ACTION_TYPES.ADD_DUE) {
      remainingDelta = Number.isNaN(amount) ? 0 : amount;
    } else if (balanceActionType === BALANCE_ACTION_TYPES.MOVE_DUE_TO_BALANCE) {
      balanceDelta = Number.isNaN(amount) ? 0 : amount;
      remainingDelta = Number.isNaN(amount) ? 0 : -amount;
    } else if (balanceActionType === BALANCE_ACTION_TYPES.WRITE_OFF_DUE) {
      remainingDelta = Number.isNaN(amount) ? 0 : -amount;
    } else if (balanceActionType === BALANCE_ACTION_TYPES.CORRECT_BALANCE) {
      balanceDelta = Number.isNaN(targetAmount)
        ? 0
        : targetAmount - currentBalance;
      reason = "manual_correction";
    }

    return {
      balanceDelta,
      remainingDelta,
      reason,
      nextBalance: currentBalance + balanceDelta,
      nextRemainingAmount: currentRemainingAmount + remainingDelta,
    };
  }, [
    balanceActionAmount,
    balanceActionType,
    balanceTargetAmount,
    currentBalance,
    currentRemainingAmount,
  ]);

  const validateBalanceAdjustment = () => {
    const amount = Number.parseInt(balanceActionAmount, 10);
    const targetAmount = Number.parseInt(balanceTargetAmount, 10);
    const note = balanceActionNote.trim();

    if (selectedBalanceAction?.requiresNote && !note) {
      return t("patients.balanceAdjustmentReasonRequired", {
        defaultValue: "Enter a reason before saving this adjustment.",
      });
    }

    if (selectedBalanceAction?.usesTargetAmount) {
      if (Number.isNaN(targetAmount) || targetAmount < 0) {
        return t("patients.enterValidTargetBalance", {
          defaultValue: "Enter a valid balance value.",
        });
      }

      if (targetAmount === currentBalance) {
        return t("patients.noBalanceChange", {
          defaultValue: "New value is the same as current balance.",
        });
      }

      return null;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      return t("patients.enterValidAmount", {
        defaultValue: "Enter a valid amount.",
      });
    }

    if (
      [
        BALANCE_ACTION_TYPES.MOVE_DUE_TO_BALANCE,
        BALANCE_ACTION_TYPES.WRITE_OFF_DUE,
      ].includes(balanceActionType) &&
      amount > currentRemainingAmount
    ) {
      return t("patients.transferExceedsRemaining", {
        defaultValue: "Amount is higher than the remaining due amount.",
      });
    }

    return null;
  };

  const buildBalanceAdjustmentDefaultNote = () => {
    const amount = Number.parseInt(balanceActionAmount, 10);
    const targetAmount = Number.parseInt(balanceTargetAmount, 10);

    if (balanceActionType === BALANCE_ACTION_TYPES.ADD_BALANCE) {
      return t("patients.addedToBalanceNote", {
        defaultValue: "Added {{amount}} to patient balance",
        amount: formatAmount(amount),
      });
    }

    if (balanceActionType === BALANCE_ACTION_TYPES.ADD_DUE) {
      return t("patients.increaseRemainingNote", {
        defaultValue: "Increased amount due by {{amount}}",
        amount: formatAmount(amount),
      });
    }

    if (balanceActionType === BALANCE_ACTION_TYPES.MOVE_DUE_TO_BALANCE) {
      return t("patients.transferFromRemainingNote", {
        defaultValue: "Moved {{amount}} from amount due to balance",
        amount: formatAmount(amount),
      });
    }

    if (balanceActionType === BALANCE_ACTION_TYPES.WRITE_OFF_DUE) {
      return t("patients.writeOffRemainingNote", {
        defaultValue: "Wrote off {{amount}} from amount due",
        amount: formatAmount(amount),
      });
    }

    if (balanceActionType === BALANCE_ACTION_TYPES.CORRECT_BALANCE) {
      return t("patients.balanceCorrectedNote", {
        defaultValue: "Balance corrected from {{from}} to {{to}}",
        from: formatAmount(currentBalance),
        to: formatAmount(targetAmount),
      });
    }

    return balanceActionNote.trim();
  };

  const handleSubmitBalanceAdjustment = () => {
    const validationMessage = validateBalanceAdjustment();
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const note =
      balanceActionNote.trim() || buildBalanceAdjustmentDefaultNote();
    createPackageTransaction.mutate(
      {
        patientId: id,
        data: {
          reason: balanceAdjustmentPreview.reason,
          balanceDelta:
            balanceAdjustmentPreview.balanceDelta !== 0
              ? balanceAdjustmentPreview.balanceDelta
              : undefined,
          remainingDelta:
            balanceAdjustmentPreview.remainingDelta !== 0
              ? balanceAdjustmentPreview.remainingDelta
              : undefined,
          notes: note || undefined,
        },
      },
      {
        onSuccess: () => {
          setBalanceSheetOpen(false);
          resetBalanceAdjustmentForm();
        },
      },
    );
  };

  const handleCreateSessionClick = () => {
    if (isCreatingSession) {
      setIsCreatingSession(false);
      return;
    }

    if (hasOutstandingAmountDue) {
      setCreateSessionDueConfirmOpen(true);
      return;
    }

    setIsCreatingSession(true);
  };

  const handleConfirmCreateSessionWithDue = () => {
    setCreateSessionDueConfirmOpen(false);
    setIsCreatingSession(true);
  };

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

  const resetBalanceAdjustmentForm = () => {
    setBalanceActionType(BALANCE_ACTION_TYPES.ADD_BALANCE);
    setBalanceActionAmount("");
    setBalanceTargetAmount("");
    setBalanceActionNote("");
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
  const sessionHistoryShowsCategories = useMemo(
    () =>
      sessions.some((session) =>
        clinicProfileSupportsWorkflow(
          session?.profile ||
            activeClinicalProfile ||
            CLINIC_PROFILES.PHYSIOTHERAPY,
          CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
        ),
      ),
    [activeClinicalProfile, sessions],
  );

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
  const currentBranchRelationship = useMemo(() => {
    if (effectiveBranchId == null) return null;

    return activeBranchRelationships.find(
      (relationship) =>
        Number(relationship?.branchId) === Number(effectiveBranchId),
    );
  }, [activeBranchRelationships, effectiveBranchId]);
  const activeBranchNames = activeBranchRelationships
    .map((relationship) => relationship?.branch?.name)
    .filter(Boolean)
    .join(", ");
  const clinicalProfilesValue = clinicalProfiles.length
    ? clinicalProfiles
        .map((profile) => getClinicProfileLabel(profile, t))
        .join(", ")
    : t("patients.noEnabledClinicalProfiles");
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
  const describeBalanceLogAction = (log) => {
    if (!log) return t("common.update", { defaultValue: "Update" });

    if (log.type === "session_payment") {
      return t("patients.logActionSessionUsedBalance", {
        defaultValue: "Visit used balance",
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
      Number(log.remainingDelta || 0) < 0
    ) {
      return t("patients.logActionReducedRemaining", {
        defaultValue: "Reduced amount due",
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
                onClick={handleCreateSessionClick}
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

      {hasOutstandingAmountDue && (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-medium">
            {t("patients.amountDueVisibleNotice", {
              amount: formatAmount(currentRemainingAmount),
              defaultValue:
                "This patient still has {{amount}} due. Review the balance before creating new visits.",
            })}
          </div>
          {canViewBalanceLogs && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                balanceLogsSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className="border-amber-300 bg-background text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-950"
            >
              {t("patients.reviewBalance", {
                defaultValue: "Review balance",
              })}
            </Button>
          )}
        </div>
      )}

      <ImpactPanel
        icon={Building2}
        title={t("patients.patientOperationalContextTitle")}
        description={t("patients.patientOperationalContextDescription")}
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ImpactMetric
            label={t("patients.contextCompanyRecord")}
            value={patient.patientCode ? `#${patient.patientCode}` : "--"}
          />
          <ImpactMetric
            label={t("patients.contextCurrentBranch")}
            value={
              currentBranchRelationship?.branch?.name ||
              (effectiveBranchId == null
                ? t("patients.noBranchScope")
                : t("patients.notLinkedToCurrentBranch"))
            }
          />
          <ImpactMetric
            label={t("patients.contextBranchReach")}
            value={
              activeBranchRelationships.length
                ? t("patients.branchReachCount", {
                    count: activeBranchRelationships.length,
                  })
                : "--"
            }
          />
          <ImpactMetric
            label={t("patients.contextClinicalProfiles")}
            value={clinicalProfilesValue}
          />
        </div>
      </ImpactPanel>

      {canCreateSession && (
        <SessionFormDrawer
          open={isCreatingSession}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreatingSession(false);
            }
          }}
          description={t("patients.createVisitDrawerDescription", {
            defaultValue: "Create a new visit for this patient.",
          })}
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
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <ProfileMetric
                label={t("patients.fullName")}
                value={patient.fullName}
              />
              <ProfileMetric
                label={t("patients.patientId")}
                value={patient.patientCode ? `#${patient.patientCode}` : "--"}
              />
              <ProfileMetric
                label={t("patients.phone")}
                value={patient.phone || "--"}
              />
              <ProfileMetric
                label={t("patients.age")}
                value={patient.age != null ? patient.age : "--"}
              />
              <ProfileMetric
                label={t("patients.job", { defaultValue: "Job" })}
                value={patient.job || "--"}
              />
              <ProfileMetric
                label={t("patients.referral", { defaultValue: "Referral" })}
                value={patient.referral || "--"}
              />
            </div>

            <div className="rounded-md border bg-muted/20 p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {t("patients.address")}
              </div>
              <div className="mt-1 break-words">{patient.address || "--"}</div>
            </div>

            <div className="rounded-md border p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {t("patients.branchRelationships", {
                      defaultValue: "Branch relationships",
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {activeBranchNames || "--"}
                  </div>
                </div>
                <Badge variant="outline">
                  {t("patients.branchReachCount", {
                    count: activeBranchRelationships.length,
                  })}
                </Badge>
              </div>

              {activeBranchRelationships.length > 0 && (
                <div className="mt-3 space-y-2">
                  {activeBranchRelationships.map((relationship) => (
                    <div
                      key={relationship.id}
                      className="flex flex-col gap-3 rounded-md border bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                          {currentBranchRelationship?.id ===
                            relationship.id && (
                            <Badge variant="outline">
                              {t("patients.currentBranch", {
                                defaultValue: "Current branch",
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
                          className="w-full justify-start text-destructive hover:text-destructive sm:w-auto"
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
            </div>
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
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {t("patients.balanceAndPackages", {
                defaultValue: "Balance and package amount",
              })}
            </CardTitle>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                onClick={() => setBalanceSheetOpen(true)}
                disabled={createPackageTransaction.isPending}
                className="w-full sm:w-auto"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {t("patients.adjustBalance", {
                  defaultValue: "Adjust balance",
                })}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  {t("patients.currentBalance", {
                    defaultValue: "Available balance",
                  })}
                </div>
                <div className="mt-1 text-2xl font-bold text-primary">
                  {formatAmount(currentBalance)}
                </div>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  {t("patients.amountStillDue", {
                    defaultValue: "Amount still due",
                  })}
                </div>
                <div
                  className={cn(
                    "mt-1 text-2xl font-bold",
                    currentRemainingAmount > 0 &&
                      "text-amber-700 dark:text-amber-300",
                  )}
                >
                  {formatAmount(currentRemainingAmount)}
                </div>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <div className="text-xs text-muted-foreground">
                  {t("patients.lastFinancialActivity", {
                    defaultValue: "Last financial activity",
                  })}
                </div>
                <div className="mt-1 truncate text-sm font-semibold">
                  {isBalanceLogsLoading
                    ? t("common.loading")
                    : balanceLogs[0]
                      ? describeBalanceLogAction(balanceLogs[0])
                      : t("messages.noDataFound")}
                </div>
                {balanceLogs[0]?.createdAt ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(balanceLogs[0].createdAt, "PP p")}
                  </div>
                ) : null}
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
          </CardContent>
        </Card>
      )}

      {!isDoctorOnly && selectedSupportsTreatmentPackages && (
        <Sheet
          open={balanceSheetOpen}
          onOpenChange={(open) => {
            setBalanceSheetOpen(open);
            if (!open && !createPackageTransaction.isPending) {
              resetBalanceAdjustmentForm();
            }
          }}
        >
          <SheetContent className="w-full sm:max-w-xl lg:max-w-2xl">
            <SheetHeader className="border-b px-6 py-5 pe-12">
              <SheetTitle>
                {t("patients.adjustBalance", {
                  defaultValue: "Adjust balance",
                })}
              </SheetTitle>
              <SheetDescription>
                {t("patients.adjustBalanceDescription", {
                  defaultValue:
                    "Choose one financial action, review the result, then save it to the patient ledger.",
                })}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="balance-action-type">
                  {t("patients.balanceActionType", {
                    defaultValue: "Action type",
                  })}
                </Label>
                <Select
                  value={balanceActionType}
                  onValueChange={(value) => {
                    setBalanceActionType(value);
                    setBalanceActionAmount("");
                    setBalanceTargetAmount("");
                    setBalanceActionNote("");
                  }}
                  disabled={createPackageTransaction.isPending}
                >
                  <SelectTrigger id="balance-action-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {balanceActionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBalanceAction?.description && (
                  <p className="text-xs text-muted-foreground">
                    {selectedBalanceAction.description}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="balance-action-amount">
                    {selectedBalanceAction?.amountLabel ||
                      t("common.amount", { defaultValue: "Amount" })}
                  </Label>
                  <Input
                    id="balance-action-amount"
                    type="number"
                    min={selectedBalanceAction?.usesTargetAmount ? 0 : 1}
                    step={1}
                    value={
                      selectedBalanceAction?.usesTargetAmount
                        ? balanceTargetAmount
                        : balanceActionAmount
                    }
                    onChange={(event) => {
                      if (selectedBalanceAction?.usesTargetAmount) {
                        setBalanceTargetAmount(event.target.value);
                      } else {
                        setBalanceActionAmount(event.target.value);
                      }
                    }}
                    disabled={createPackageTransaction.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="balance-action-note">
                    {selectedBalanceAction?.requiresNote
                      ? t("patients.reasonRequired", {
                          defaultValue: "Reason",
                        })
                      : t("common.notes", { defaultValue: "Notes" })}
                  </Label>
                  <Textarea
                    id="balance-action-note"
                    rows={3}
                    value={balanceActionNote}
                    onChange={(event) =>
                      setBalanceActionNote(event.target.value)
                    }
                    placeholder={
                      selectedBalanceAction?.requiresNote
                        ? t("patients.reasonRequiredPlaceholder", {
                            defaultValue: "Required for this adjustment",
                          })
                        : t("common.notes", { defaultValue: "Notes" })
                    }
                    disabled={createPackageTransaction.isPending}
                  />
                </div>
              </div>

              <div className="rounded-md border bg-muted/20 p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {t("patients.adjustmentPreview", {
                      defaultValue: "Adjustment preview",
                    })}
                  </div>
                  <Badge
                    variant="outline"
                    className="max-w-full truncate rounded-full border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                  >
                    {selectedBalanceAction?.label}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {t("patients.currentBalance", {
                          defaultValue: "Available balance",
                        })}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          getPreviewDeltaBadgeClass(
                            balanceAdjustmentPreview.balanceDelta,
                          ),
                        )}
                      >
                        {t("patients.changeValue", {
                          defaultValue: "Change: {{value}}",
                          value: formatSignedAmount(
                            balanceAdjustmentPreview.balanceDelta,
                          ),
                        })}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          {t("patients.previewCurrent", {
                            defaultValue: "Current",
                          })}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">
                          {formatAmount(currentBalance)}
                        </div>
                      </div>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 text-end">
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          {t("patients.previewAfter", {
                            defaultValue: "After",
                          })}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">
                          {formatAmount(balanceAdjustmentPreview.nextBalance)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border bg-background p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      >
                        {t("patients.amountStillDue", {
                          defaultValue: "Amount still due",
                        })}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full",
                          getPreviewDeltaBadgeClass(
                            balanceAdjustmentPreview.remainingDelta,
                            true,
                          ),
                        )}
                      >
                        {t("patients.changeValue", {
                          defaultValue: "Change: {{value}}",
                          value: formatSignedAmount(
                            balanceAdjustmentPreview.remainingDelta,
                          ),
                        })}
                      </Badge>
                    </div>

                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          {t("patients.previewCurrent", {
                            defaultValue: "Current",
                          })}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">
                          {formatAmount(currentRemainingAmount)}
                        </div>
                      </div>
                      <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0 text-end">
                        <div className="text-[11px] font-medium uppercase text-muted-foreground">
                          {t("patients.previewAfter", {
                            defaultValue: "After",
                          })}
                        </div>
                        <div className="mt-1 truncate text-sm font-semibold">
                          {formatAmount(
                            balanceAdjustmentPreview.nextRemainingAmount,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SheetFooter className="border-t bg-background px-6 py-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBalanceSheetOpen(false)}
                disabled={createPackageTransaction.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSubmitBalanceAdjustment}
                disabled={createPackageTransaction.isPending}
              >
                {createPackageTransaction.isPending
                  ? t("common.loading")
                  : t("patients.saveAdjustment", {
                      defaultValue: "Save adjustment",
                    })}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
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

      <VisitImageGallery patientId={id} />

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
                    <th className="px-4 py-3 font-medium">
                      {t("sessions.profile", {
                        defaultValue: "Clinic profile",
                      })}
                    </th>
                    {sessionHistoryShowsCategories && (
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
                      {t("clinicProfiles.providerGeneric", {
                        defaultValue: "Doctor",
                      })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => {
                    const sessionProfile =
                      session.profile ||
                      activeClinicalProfile ||
                      CLINIC_PROFILES.PHYSIOTHERAPY;
                    const rowSupportsAssessmentTracking =
                      clinicProfileSupportsWorkflow(
                        sessionProfile,
                        CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
                      );
                    const rowSupportsVisitCategories =
                      clinicProfileSupportsWorkflow(
                        sessionProfile,
                        CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
                      );

                    return (
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
                            {rowSupportsAssessmentTracking &&
                            session.isReassessment ? (
                              <Badge className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-teal-200 bg-teal-100 p-0 text-teal-800 dark:border-teal-800 dark:bg-teal-900/40 dark:text-teal-100">
                                <ClipboardCheck
                                  className="h-5 w-5 text-teal-600"
                                  aria-hidden="true"
                                />
                              </Badge>
                            ) : rowSupportsAssessmentTracking &&
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
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {getClinicProfileLabel(sessionProfile, t)}
                          </Badge>
                        </td>
                        {sessionHistoryShowsCategories && (
                          <td className="px-4 py-3">
                            {rowSupportsVisitCategories
                              ? session.category?.name || "--"
                              : "--"}
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
                    );
                  })}
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
        open={createSessionDueConfirmOpen}
        onOpenChange={setCreateSessionDueConfirmOpen}
        title={t("patients.createVisitAmountDueTitle", {
          defaultValue: "Create visit with amount due?",
        })}
        description={t("patients.createVisitAmountDueDescription", {
          defaultValue:
            "{{patient}} still has {{amount}} due. Confirm before creating a new visit.",
          patient: patient.fullName,
          amount: formatAmount(currentRemainingAmount),
        })}
        confirmText={t("patients.createVisitAmountDueConfirm", {
          defaultValue: "Create visit",
        })}
        cancelText={t("common.cancel")}
        variant="default"
        onConfirm={handleConfirmCreateSessionWithDue}
      />
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
