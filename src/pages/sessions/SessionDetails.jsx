import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useSession,
  useUpdateSession,
  useUpdateSessionPrograms,
  useUpdateSessionNotes,
  useUpdateSessionStatus,
  useDeleteSession,
} from "@/hooks/useSessions";
import { useSessionPayments, useDeletePayment } from "@/hooks/usePayments";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CLINIC_PROFILES,
  PERMISSIONS,
  SESSION_STATUS,
  USER_ROLES,
} from "@/lib/constants";
import { StatBox } from "@/components/common/StatBox";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { SessionForm } from "./SessionForm";
import { ProfileDetailsPanel } from "./ProfileDetailsPanel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Stethoscope,
  ClipboardCheck,
  Plus,
  Minus,
} from "lucide-react";
import {
  getAllowedStatusTransitions,
  buildStatusUpdatePayload,
} from "@/lib/sessionRules";
import { invoicesApi } from "@/api/endpoints/invoices";
import { downloadInvoicePdf } from "@/lib/invoices/pdf";
import {
  CLINIC_PROFILE_WORKFLOWS,
  clinicProfileSupportsWorkflow,
  getClinicProfileLabel,
  getClinicProfileProviderLabel,
} from "@/lib/clinicProfiles";

export default function SessionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { canAny, can, isOwnSession } = usePermissions();
  const { hasAnyRole, user } = useAuthStore();
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const isAdmin = hasAnyRole([USER_ROLES.MANAGER]);

  const {
    data: session,
    isLoading,
    isError,
  } = useSession(id, {
    enabled: Boolean(id) && !isDeletingSession,
  });

  const canView = canAny([
    PERMISSIONS["sessions:viewAll"],
    PERMISSIONS["sessions:viewOwn"],
  ]);

  const canEditSessionCore = can(PERMISSIONS["sessions:update"]);

  const canEditProgramsAndNotes =
    can(PERMISSIONS["sessions:updateProgram"]) &&
    (isOwnSession(session) || isAdmin);

  const canUpdateAnyStatus = can(PERMISSIONS["sessions:updateStatus"]);
  const canUpdateOwnStatus = can(PERMISSIONS["sessions:updateStatusOwn"]);

  const canUpdateStatusFor = (sess) => {
    if (canUpdateAnyStatus) return true;
    if (canUpdateOwnStatus) return isOwnSession(sess);
    return false;
  };

  const canUpdateStatus = canUpdateStatusFor(session);

  const canViewPaymentsSection = canAny([
    PERMISSIONS["payments:viewAll"],
    PERMISSIONS["payments:viewReports"],
  ]);

  const canViewCostCard = hasAnyRole([
    USER_ROLES.MANAGER,
    USER_ROLES.SECRETARY,
  ]);

  const isDoctorOnly = useMemo(() => {
    const roles = user?.roles?.map((r) => r.name?.toLowerCase()) || [];
    return roles.length > 0 && roles.every((r) => r === USER_ROLES.DOCTOR);
  }, [user]);

  const [isEditingSession, setIsEditingSession] = useState(false);
  const [isEditingPrograms, setIsEditingPrograms] = useState(false);
  const [programItems, setProgramItems] = useState([]);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesItems, setNotesItems] = useState([]);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [diagnosisFontSize, setDiagnosisFontSize] = useState(18);
  const [programFontSize, setProgramFontSize] = useState(18);
  const [notesFontSize, setNotesFontSize] = useState(18);

  const clampSize = (value) => Math.min(26, Math.max(10, value));
  const incDiagnosis = () => setDiagnosisFontSize((v) => clampSize(v + 1));
  const decDiagnosis = () => setDiagnosisFontSize((v) => clampSize(v - 1));
  const incProgram = () => setProgramFontSize((v) => clampSize(v + 1));
  const decProgram = () => setProgramFontSize((v) => clampSize(v - 1));
  const incNotes = () => setNotesFontSize((v) => clampSize(v + 1));
  const decNotes = () => setNotesFontSize((v) => clampSize(v - 1));

  const updateSession = useUpdateSession();
  const updatePrograms = useUpdateSessionPrograms();
  const updateNotes = useUpdateSessionNotes();
  const updateStatus = useUpdateSessionStatus();
  const deleteSession = useDeleteSession();

  const patient = useMemo(() => {
    const rawPatient = session?.patient || {};
    if (
      rawPatient.primaryBranchId ||
      !Array.isArray(rawPatient.branchRelationships)
    ) {
      return rawPatient;
    }

    const primaryRelationship =
      rawPatient.branchRelationships.find(
        (relationship) => relationship.isPrimary,
      ) || rawPatient.branchRelationships[0];

    return {
      ...rawPatient,
      primaryBranchId: primaryRelationship?.branchId ?? null,
      primaryBranch: primaryRelationship?.branch ?? null,
    };
  }, [session?.patient]);
  const doctor = session?.doctor || {};
  const sessionProfile = session?.profile || CLINIC_PROFILES.PHYSIOTHERAPY;
  const providerLabel = getClinicProfileProviderLabel(sessionProfile, t);
  const profileLabel = getClinicProfileLabel(sessionProfile, t);
  const supportsAssessmentTracking = clinicProfileSupportsWorkflow(
    sessionProfile,
    CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
  );
  const supportsTreatmentPrograms = clinicProfileSupportsWorkflow(
    sessionProfile,
    CLINIC_PROFILE_WORKFLOWS.AUTO_FOLLOW_UP_VISITS,
  );
  const supportsVisitCategories = clinicProfileSupportsWorkflow(
    sessionProfile,
    CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
  );
  const isCrossBranchSession =
    session?.branchId != null &&
    patient?.primaryBranchId != null &&
    Number(session.branchId) !== Number(patient.primaryBranchId);

  const formatTimeForDisplay = (time) => {
    if (!time || !session?.sessionDate) return time || "--";
    return formatDateTime(`${session.sessionDate}T${time}`, "p");
  };

  const currentPrograms = useMemo(() => {
    if (!session || session.programs == null) return [];
    if (Array.isArray(session.programs)) {
      return session.programs
        .map((item) => (item == null ? "" : String(item)))
        .filter((item) => item.trim().length > 0);
    }
    const single = String(session.programs);
    return single.trim().length ? [single] : [];
  }, [session]);

  const currentNotes = (() => {
    if (!session || session.notes == null) return [];
    if (Array.isArray(session.notes)) {
      return session.notes
        .map((item) => (item == null ? "" : String(item)))
        .filter((item) => item.trim().length > 0);
    }
    const single = String(session.notes);
    return single.trim().length ? [single] : [];
  })();

  const normalizeIsoDate = (value) => {
    if (!value) return "";
    const asString = String(value);
    return asString.includes("T") ? asString.split("T")[0] : asString;
  };

  const normalizeTimeHHmm = (value) => {
    if (!value) return "";
    const asString = String(value);
    // API can return HH:mm:ss but the TimePicker expects HH:mm
    return asString.length >= 5 ? asString.slice(0, 5) : asString;
  };

  const sessionFormInitialValues = useMemo(
    () => ({
      doctorId: session?.doctorId ?? session?.doctor?.id ?? undefined,
      patientId: session?.patientId ?? patient?.id ?? undefined,
      sessionDate: normalizeIsoDate(session?.sessionDate),
      sessionTime: normalizeTimeHHmm(session?.sessionTime),
      cost:
        typeof session?.cost === "string"
          ? Number(session.cost)
          : (session?.cost ?? undefined),
      categoryId: session?.categoryId ?? session?.category?.id ?? undefined,
      categoryNotes: session?.categoryNotes ?? "",
      profile: session?.profile ?? undefined,
      visitType: session?.visitType ?? "",
      profileDetails: session?.profileDetail?.details ?? {},
      isAssessment: session?.isAssessment ?? false,
      isNewAssessment: session?.isAssessment
        ? session?.isReassessment !== true
        : false,
    }),
    [session, patient?.id],
  );

  const renderPatientCard = () => (
    <Card
      className="lg:col-span-1 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => patient.id && navigate(`/patients/${patient.id}`)}
    >
      <CardHeader>
        <CardTitle>{t("patients.patientDetails")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3">
          <StatBox
            label={t("patients.fullName")}
            value={patient.fullName || "--"}
          />
          <StatBox
            label={t("patients.patientId")}
            value={patient.patientCode || "--"}
          />
          <StatBox
            label={t("patients.primaryBranch", {
              defaultValue: "Primary branch",
            })}
            value={patient.primaryBranch?.name || "--"}
          />
          {patient.medicalHistory && patient.medicalHistory.length > 0 && (
            <StatBox
              blackAndWhiteText={true}
              label={t("patients.medicalHistory", {
                defaultValue: "Patient Diagnosis",
              })}
              value={
                <div className="flex items-start gap-2">
                  <div
                    className="flex-1"
                    style={{ fontSize: `${diagnosisFontSize}px` }}
                  >
                    {Array.isArray(patient.medicalHistory) ? (
                      <ul className="list-disc list-inside space-y-1">
                        {patient.medicalHistory.map((item, idx) => (
                          <li key={idx}>
                            {typeof item === "string"
                              ? item
                              : item.condition ||
                                item.diagnosis ||
                                JSON.stringify(item)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>{patient.medicalHistory}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        incDiagnosis();
                      }}
                      className="h-7 w-7"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        decDiagnosis();
                      }}
                      className="h-7 w-7"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSessionInfoCard = () => (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          {t("sessions.sessionInfo")}
          <Badge variant="outline" className="mx-3 align-middle">
            {profileLabel}
          </Badge>
          {supportsAssessmentTracking && session.isReassessment ? (
            <span
              className="inline-flex items-center justify-center rounded-full mx-4 border border-teal-300 bg-teal-100 p-1 text-teal-800 shadow-sm dark:border-teal-700 dark:bg-teal-900/70 dark:text-teal-50"
              title={t("sessions.isReassessment", {
                defaultValue: "Reassessment",
              })}
            >
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : supportsAssessmentTracking && session.isAssessment ? (
            <span
              className="inline-flex items-center justify-center rounded-full mx-4 border border-purple-300 bg-purple-100 p-1 text-purple-800 shadow-sm dark:border-purple-700 dark:bg-purple-900/70 dark:text-purple-50"
              title={t("sessions.isAssessment", { defaultValue: "Assessment" })}
            >
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
        </CardTitle>
        {canEditSessionCore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingSession((prev) => !prev)}
          >
            {isEditingSession ? t("common.close") : t("common.edit")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditingSession && canEditSessionCore ? (
          <SessionForm
            key={`edit-session-${session.id}-${isEditingSession}`}
            isEditing
            isSubmitting={updateSession.isPending}
            initialValues={sessionFormInitialValues}
            fixedPatient={patient}
            onSubmit={handleUpdateSession}
            onCancel={() => setIsEditingSession(false)}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {!isDoctorOnly && (
              <>
                <StatBox
                  label={providerLabel}
                  value={doctor.fullName || "--"}
                />
                <StatBox
                  label={t("sessions.date")}
                  value={session.sessionDate || "--"}
                />
                <StatBox
                  label={t("sessions.scheduledTime", {
                    defaultValue: "Scheduled time",
                  })}
                >
                  <span dir="ltr" className="inline-block font-mono">
                    {formatTimeForDisplay(session.sessionTime) || "--"}
                  </span>
                </StatBox>
                <StatBox
                  label={t("users.branch", { defaultValue: "Service branch" })}
                  value={session.branch?.name || "--"}
                />
              </>
            )}

            <StatBox label={t("sessions.arrivalTime")}>
              <span dir="ltr" className="inline-block font-mono">
                {formatTimeForDisplay(session.arrivalTime) || "--"}
              </span>
            </StatBox>
            <StatBox
              label={t("sessions.startTime", { defaultValue: "Start time" })}
            >
              <span dir="ltr" className="inline-block font-mono">
                {formatTimeForDisplay(session.startTime) || "--"}
              </span>
            </StatBox>
            <StatBox
              label={t("sessions.endTime", { defaultValue: "End time" })}
            >
              <span dir="ltr" className="inline-block font-mono">
                {formatTimeForDisplay(session.endTime) || "--"}
              </span>
            </StatBox>

            {!isDoctorOnly && canViewCostCard && (
              <>
                <StatBox
                  label={t("sessions.cost")}
                  value={session.cost != null ? session.cost : "--"}
                />
                {supportsVisitCategories && (
                  <StatBox
                    label={t("sessions.category", {
                      defaultValue: "Category",
                    })}
                    value={session.category?.name || "--"}
                  >
                    {session.category?.name ? (
                      <div className="flex flex-col">
                        <span>{session.category.name}</span>
                        {session.categoryNotes && (
                          <span className="text-xs text-muted-foreground">
                            {session.categoryNotes}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span>--</span>
                    )}
                  </StatBox>
                )}
              </>
            )}

            <StatBox
              label={t("sessions.status")}
              value={session.status ? t(`status.${session.status}`) : "--"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderProgramNotesCard = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>
          {supportsTreatmentPrograms
            ? t("sessions.programAndNotes")
            : t("sessions.notes")}
        </CardTitle>
        {canEditProgramsAndNotes && (
          <div className="flex items-center gap-2">
            {supportsTreatmentPrograms && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  isEditingPrograms
                    ? setIsEditingPrograms(false)
                    : handleStartEditPrograms()
                }
              >
                {isEditingPrograms ? t("common.close") : t("common.edit")}{" "}
                {t("sessions.program")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                isEditingNotes
                  ? setIsEditingNotes(false)
                  : handleStartEditNotes()
              }
            >
              {isEditingNotes ? t("common.close") : t("common.edit")}{" "}
              {t("sessions.notes")}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {supportsTreatmentPrograms && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t("sessions.program")}
            </h2>
            {isEditingPrograms && canEditProgramsAndNotes ? (
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
                          disabled={updatePrograms.isPending}
                        >
                          {t("common.delete")}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      rows={3}
                      value={item}
                      onChange={(e) =>
                        handleChangeProgramItem(index, e.target.value)
                      }
                      disabled={updatePrograms.isPending}
                    />
                  </div>
                ))}

                <div className="flex justify-between items-center pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddProgramItem}
                    disabled={updatePrograms.isPending}
                  >
                    + {t("common.create")}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditingPrograms(false)}
                      disabled={updatePrograms.isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSavePrograms}
                      disabled={updatePrograms.isPending}
                    >
                      {updatePrograms.isPending
                        ? t("common.loading")
                        : t("common.save")}
                    </Button>
                  </div>
                </div>
              </div>
            ) : currentPrograms.length ? (
              <ul className="space-y-2 text-sm list-disc pl-5">
                <div className="flex items-start gap-2">
                  <ul
                    className="flex-1 list-disc pl-5"
                    style={{ fontSize: `${programFontSize}px` }}
                  >
                    {currentPrograms.map((item, index) => (
                      <li key={index} className="whitespace-pre-line">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        incProgram();
                      }}
                      className="h-7 w-7"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        decProgram();
                      }}
                      className="h-7 w-7"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("messages.noDataFound")}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("sessions.notes")}
          </h2>
          {isEditingNotes && canEditProgramsAndNotes ? (
            <div className="space-y-4">
              {notesItems.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t("sessions.notes")} #{index + 1}
                    </span>
                    {notesItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveNoteItem(index)}
                        disabled={updateNotes.isPending}
                      >
                        {t("common.delete")}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    rows={3}
                    value={item}
                    onChange={(e) =>
                      handleChangeNoteItem(index, e.target.value)
                    }
                    disabled={updateNotes.isPending}
                  />
                </div>
              ))}

              <div className="flex justify-between items-center pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddNoteItem}
                  disabled={updateNotes.isPending}
                >
                  + {t("common.create")}
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditingNotes(false)}
                    disabled={updateNotes.isPending}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={updateNotes.isPending}
                  >
                    {updateNotes.isPending
                      ? t("common.loading")
                      : t("common.save")}
                  </Button>
                </div>
              </div>
            </div>
          ) : currentNotes.length ? (
            <ul className="space-y-2 text-sm list-disc pl-5">
              <div className="flex items-start gap-2">
                <ul
                  className="flex-1 list-disc pl-5"
                  style={{ fontSize: `${notesFontSize}px` }}
                >
                  {currentNotes.map((item, index) => (
                    <li key={index} className="whitespace-pre-line">
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      incNotes();
                    }}
                    className="h-7 w-7"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      decNotes();
                    }}
                    className="h-7 w-7"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("messages.noDataFound")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const handleUpdateSession = (values) => {
    const payload = { ...(values || {}) };
    delete payload.patientId;
    updateSession.mutate(
      {
        sessionId: id,
        data: payload,
      },
      {
        onSuccess: () => {
          setIsEditingSession(false);
        },
      },
    );
  };

  const handleStartEditPrograms = () => {
    setProgramItems(currentPrograms.length ? currentPrograms : [""]);
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

    updatePrograms.mutate(
      {
        sessionId: id,
        data: { programs: cleaned },
      },
      {
        onSuccess: () => {
          setIsEditingPrograms(false);
        },
      },
    );
  };

  const handleStartEditNotes = () => {
    setNotesItems(currentNotes.length ? currentNotes : [""]);
    setIsEditingNotes(true);
  };

  const handleChangeNoteItem = (index, value) => {
    setNotesItems((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddNoteItem = () => {
    setNotesItems((prev) => [...prev, ""]);
  };

  const handleRemoveNoteItem = (index) => {
    setNotesItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveNotes = () => {
    const cleaned = notesItems
      .map((item) => (item == null ? "" : item.trim()))
      .filter((item) => item.length > 0);

    updateNotes.mutate(
      {
        sessionId: id,
        data: { notes: cleaned },
      },
      {
        onSuccess: () => {
          setIsEditingNotes(false);
        },
      },
    );
  };

  if (!canView) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !session) {
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
        title={t("visitDetails.title", { defaultValue: "Visit details" })}
        description={`${profileLabel} · ${t("sessions.date")}: ${
          session.sessionDate || "--"
        }`}
        onBack={() => navigate(-1)}
        actions={
          <>
            {isAdmin && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteSession.isPending}
              >
                {t("common.delete")}
              </Button>
            )}
            {canUpdateStatus &&
              getAllowedStatusTransitions(session.status, {
                isAdmin,
              }).length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={updateStatus.isPending}
                    >
                      {t("sessions.changeStatus", {
                        defaultValue: "Change status",
                      })}
                      <ChevronDown className="ms-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {getAllowedStatusTransitions(session.status, {
                      isAdmin,
                    }).map((statusKey) => (
                      <DropdownMenuItem
                        key={statusKey}
                        onClick={() => {
                          if (statusKey === SESSION_STATUS.CANCELLED) {
                            setPendingStatus(statusKey);
                            setCancelConfirmOpen(true);
                          } else {
                            const payload = buildStatusUpdatePayload(
                              session,
                              statusKey,
                            );
                            updateStatus.mutate(
                              { sessionId: session.id, data: payload },
                              {
                                onSuccess: (updatedSession) => {
                                  if (statusKey === SESSION_STATUS.COMPLETED) {
                                    if (!updatedSession.paidInFull) {
                                      const totalPaid =
                                        updatedSession.payments?.reduce(
                                          (sum, p) => sum + Number(p.amount),
                                          0,
                                        ) || 0;
                                      const remaining =
                                        updatedSession.cost - totalPaid;
                                      navigate(
                                        `/payments?sessionId=${session.id}&amount=${remaining}`,
                                      );
                                    }
                                  }
                                },
                              },
                            );
                          }
                        }}
                      >
                        {statusKey === SESSION_STATUS.IN_PROGRESS
                          ? t("status.start")
                          : t(`status.${statusKey}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
          </>
        }
      />

      {isCrossBranchSession && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          {t("sessions.crossBranchContext", {
            defaultValue:
              "This visit was served in {{serviceBranch}} while the patient primary branch is {{primaryBranch}}.",
            serviceBranch: session.branch?.name || "--",
            primaryBranch: patient.primaryBranch?.name || "--",
          })}
        </div>
      )}

      {isDoctorOnly ? (
        <>
          {renderPatientCard()}
          {renderProgramNotesCard()}
          <ProfileDetailsPanel
            session={session}
            canEdit={canEditProgramsAndNotes}
          />
          {renderSessionInfoCard()}
        </>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {renderPatientCard()}
            {renderSessionInfoCard()}
          </div>
          <ProfileDetailsPanel
            session={session}
            canEdit={canEditProgramsAndNotes}
          />
          {renderProgramNotesCard()}
        </>
      )}

      {canViewPaymentsSection && (
        <SessionPaymentsSection
          sessionId={session.id}
          isAdmin={isAdmin}
          isDoctorOnly={isDoctorOnly}
        />
      )}
      {/* Delete/Cancel Dialogs (same as original, but I'll make sure they are here) */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t("common.confirmDelete")}
        description={t("sessions.deleteDescription")}
        onConfirm={() => {
          setIsDeletingSession(true);
          deleteSession.mutate(id, {
            onSuccess: () => navigate("/sessions"),
            onError: () => setIsDeletingSession(false),
          });
        }}
      />

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title={t("common.confirmCancel")}
        description={t("sessions.cancelDescription")}
        onConfirm={() => {
          const payload = buildStatusUpdatePayload(session, pendingStatus);
          updateStatus.mutate({ sessionId: id, data: payload });
          setCancelConfirmOpen(false);
          setPendingStatus(null);
        }}
      />
    </div>
  );
}

function SessionPaymentsSection({ sessionId, isAdmin, isDoctorOnly }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const { data: paymentSummary, isLoading: isPaymentsLoading } =
    useSessionPayments(sessionId);

  const canCreatePayment = can(PERMISSIONS["payments:create"]);
  const canViewInvoices = can(PERMISSIONS["invoices:view"]);
  const canUseInvoiceActions = canViewInvoices && !isDoctorOnly;
  const deletePayment = useDeletePayment();
  const [paymentPendingDelete, setPaymentPendingDelete] = useState(null);
  const [invoiceLoadingPaymentId, setInvoiceLoadingPaymentId] = useState(null);

  const handleDownloadPaymentInvoice = async (payment) => {
    if (!payment?.id) return;
    try {
      setInvoiceLoadingPaymentId(payment.id);
      const invoice = await invoicesApi.getByPaymentSource(payment.id);
      downloadInvoicePdf(invoice);
    } catch (error) {
      if (error?.response?.status === 404) {
        toast.error(
          t("reports.invoiceNotFound", {
            defaultValue: "No invoice found for this payment.",
          }),
        );
      } else {
        toast.error(
          error?.response?.data?.message ||
            t("reports.failedInvoiceDownload", {
              defaultValue: "Failed to load invoice.",
            }),
        );
      }
    } finally {
      setInvoiceLoadingPaymentId(null);
    }
  };

  const isRtl = i18n.language === "ar";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{t("payments.paymentDetails")}</CardTitle>
        {canCreatePayment && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/payments?sessionId=${sessionId}`)}
          >
            {t("payments.createPayment")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {isPaymentsLoading && (
          <p className="text-muted-foreground">{t("messages.loadingData")}</p>
        )}

        {paymentSummary && (
          <div className="grid gap-3 md:grid-cols-4">
            <StatBox
              label={t("sessions.cost")}
              value={
                paymentSummary.sessionCost != null
                  ? paymentSummary.sessionCost
                  : "--"
              }
            />
            <StatBox
              label={t("payments.totalPaid")}
              value={
                paymentSummary.totalPaid != null
                  ? paymentSummary.totalPaid
                  : "--"
              }
            />
            <StatBox
              label={t("payments.remaining")}
              value={
                paymentSummary.remaining != null
                  ? paymentSummary.remaining
                  : "--"
              }
            />
            <StatBox
              label={t("payments.paidInFull")}
              value={
                paymentSummary.paidInFull ? t("common.yes") : t("common.no")
              }
            />
          </div>
        )}

        {paymentSummary &&
          Array.isArray(paymentSummary.payments) &&
          (paymentSummary.payments.length ? (
            <div className="overflow-x-auto">
              <table
                className="w-full text-xs md:text-sm"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <thead>
                  <tr
                    className={`border-b bg-muted/50 text-xs uppercase text-muted-foreground ${
                      isRtl ? "text-right" : "text-left"
                    }`}
                  >
                    <th className="px-3 py-2 font-medium">
                      {t("payments.amount")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("payments.method")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("payments.paymentDate")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("sessions.notes")}
                    </th>
                    {(isAdmin || canUseInvoiceActions) && (
                      <th className="px-3 py-2 font-medium text-right">
                        {t("common.actions")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paymentSummary.payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="px-3 py-2">{p.amount}</td>
                      <td className="px-3 py-2">{p.paymentMethod}</td>
                      <td className="px-3 py-2">
                        {p.paymentDate ? formatDate(p.paymentDate, "PP") : "--"}
                      </td>
                      <td className="px-3 py-2">{p.notes || "--"}</td>
                      {(isAdmin || canUseInvoiceActions) && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            {canUseInvoiceActions && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadPaymentInvoice(p)}
                                disabled={invoiceLoadingPaymentId === p.id}
                              >
                                {invoiceLoadingPaymentId === p.id
                                  ? t("common.loading")
                                  : t("nav.invoices", {
                                      defaultValue: "Invoice",
                                    })}
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setPaymentPendingDelete(p)}
                                disabled={deletePayment.isPending}
                              >
                                {t("common.delete")}
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">{t("payments.noPayments")}</p>
          ))}
      </CardContent>
      <ConfirmDialog
        title={t("payments.deleteTitle", { defaultValue: "Delete payment" })}
        description={t("payments.deleteDescription", {
          defaultValue:
            "Are you sure you want to delete this payment? This action cannot be undone.",
        })}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        open={!!paymentPendingDelete}
        onOpenChange={(open) => {
          if (!open) setPaymentPendingDelete(null);
        }}
        onConfirm={() => {
          if (!paymentPendingDelete) return;
          deletePayment.mutate(
            { paymentId: paymentPendingDelete.id, sessionId },
            {
              onSuccess: () => setPaymentPendingDelete(null),
              onError: () => setPaymentPendingDelete(null),
            },
          );
        }}
        confirmProps={{
          variant: "destructive",
          disabled: deletePayment.isPending,
        }}
      />
    </Card>
  );
}
