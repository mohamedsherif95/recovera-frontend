import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import {
  Activity,
  CalendarClock,
  MoreHorizontal,
  Stethoscope,
  BellRing,
  ClipboardCheck,
  CircleOff,
  ListChecks,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/common/PageHeader";
import { LocalizedDatePicker } from "@/components/common/LocalizedDatePicker";
import { useDailyOperations } from "@/hooks/useDashboard";
import { useUpdateSessionStatus } from "@/hooks/useSessions";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchAccessState } from "@/hooks/useBranchAccessState";
import {
  CLINIC_PROFILES,
  PERMISSIONS,
  DOCTOR_SHIFT,
  USER_ROLES,
  SESSION_STATUS,
} from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ImpactMetric, ImpactPanel } from "@/components/common/ImpactPanel";
import {
  getAllowedStatusTransitions,
  buildStatusUpdatePayload,
} from "@/lib/sessionRules";
import {
  CLINIC_PROFILE_WORKFLOWS,
  clinicProfileSupportsWorkflow,
  getClinicProfileLabel,
} from "@/lib/clinicProfiles";
import { dateOnlyToDate, getClinicTodayDateOnly } from "@/lib/time";

// Static time slots; API returns a flat sessions array with `slot` matching these labels (24h).
// Rows are fixed from 10:00 to 24:00.
const HOURS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "24:00",
];

const STATUS_STYLES = {
  // Borders + soft background are colored by status in a theme-friendly way
  // Light mode: slightly stronger tint; Dark mode: darker, subtle tint
  scheduled: "border-amber-400 bg-amber-100 dark:bg-amber-900/30",
  arrived: "border-purple-400 bg-purple-100 dark:bg-purple-900/30",
  in_progress: "border-blue-400 bg-blue-100 dark:bg-blue-900/30",
  completed: "border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
  cancelled: "border-red-400 bg-red-100 dark:bg-red-900/30",
};

const STATUS_BADGE_STYLES = {
  scheduled:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
  arrived:
    "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-100",
  in_progress:
    "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100",
  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
  cancelled:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
};

const STATUS_ORDER = [
  "scheduled",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
];

const getStatusBadgeClass = (status) =>
  STATUS_BADGE_STYLES[status] || "border-border bg-muted/30";

const formatHourLabel = (hour) => {
  const [hStr] = hour.split(":");
  let h = parseInt(hStr, 10);
  if (h === 24) return "12 AM";
  const suffix = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return `${h} ${suffix}`;
};

const getStatusActionLabel = (statusKey, t) => {
  if (statusKey === SESSION_STATUS.ARRIVED) {
    return t("sessions.markArrival", { defaultValue: "Mark patient arrival" });
  }
  if (statusKey === SESSION_STATUS.IN_PROGRESS) {
    return t("status.start");
  }
  if (statusKey === SESSION_STATUS.COMPLETED) {
    return t("sessions.completeSession", { defaultValue: "Complete Visit" });
  }
  if (statusKey === SESSION_STATUS.CANCELLED) {
    return t("status.cancelled");
  }
  return t(`status.${statusKey}`, { defaultValue: statusKey });
};

const getSlotSortIndex = (slot) => {
  const index = HOURS.indexOf(slot);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

export default function DailyOperationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(() => {
    const fromUrl = searchParams.get("date");
    if (fromUrl) return fromUrl;
    return getClinicTodayDateOnly();
  });

  const [shiftFilter, setShiftFilterState] = useState(() => {
    const param = searchParams.get("shift");
    if (
      param === "all" ||
      param === DOCTOR_SHIFT.SATURDAY ||
      param === DOCTOR_SHIFT.SUNDAY
    ) {
      return param;
    }
    return undefined; // auto-detect based on day
  });
  const [profileFilter, setProfileFilter] = useState("all");

  const { hasAnyRole } = useAuthStore();
  const canFilterShift = hasAnyRole([USER_ROLES.MANAGER, USER_ROLES.SECRETARY]);
  const isAdmin = hasAnyRole([USER_ROLES.MANAGER]);

  const updateFiltersInUrl = (nextDate, nextShift) => {
    const params = {};
    if (nextDate) params.date = nextDate;
    if (nextShift) params.shift = nextShift;
    setSearchParams(params, { replace: true });
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    updateFiltersInUrl(newDate, shiftFilter);
  };

  const handleShiftChange = (newShift) => {
    const value = newShift === "auto" ? undefined : newShift;
    setShiftFilterState(value);
    updateFiltersInUrl(selectedDate, value);
  };

  const locale = useMemo(() => {
    if (i18n.language === "ar") return arSA;
    return enUS;
  }, [i18n.language]);

  const selectedDateObj = useMemo(() => {
    return dateOnlyToDate(selectedDate) || dateOnlyToDate(getClinicTodayDateOnly());
  }, [selectedDate]);

  const isRtl = i18n.language === "ar";

  const { hasPermission } = usePermissions();
  const canUpdateStatus =
    hasPermission(PERMISSIONS["sessions:updateStatus"]) ||
    hasPermission(PERMISSIONS["sessions:updateStatusOwn"]);

  const updateStatus = useUpdateSessionStatus();
  const {
    isReadOnlyBranch,
    readOnlyTitle,
    readOnlyTitleKey,
  } = useBranchAccessState();
  const readOnlyTooltip = t(readOnlyTitleKey, { defaultValue: readOnlyTitle });

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingCancelSessionId, setPendingCancelSessionId] = useState(null);
  const [pendingCancelSession, setPendingCancelSession] = useState(null);

  useEffect(() => {
    if (isReadOnlyBranch) {
      setCancelConfirmOpen(false);
      setPendingCancelSessionId(null);
      setPendingCancelSession(null);
    }
  }, [isReadOnlyBranch]);

  const { data, refetch, isFetching } = useDailyOperations(
    { date: selectedDate, shift: shiftFilter },
    {
      keepPreviousData: true,
      refetchInterval: 3 * 60 * 1000,
    },
  );

  const rawSessions = useMemo(() => data?.sessions ?? [], [data?.sessions]);
  const doctors = useMemo(() => data?.doctors ?? [], [data?.doctors]);
  const doctorById = useMemo(() => {
    const map = new Map();
    doctors.forEach((doctor) => {
      map.set(Number(doctor.id), doctor);
    });
    return map;
  }, [doctors]);
  const profileOptions = useMemo(() => {
    const seen = new Set();
    rawSessions.forEach((session) => {
      const profile = session.profile || CLINIC_PROFILES.PHYSIOTHERAPY;
      seen.add(profile);
    });
    return Array.from(seen).sort();
  }, [rawSessions]);
  const effectiveProfileFilter =
    profileFilter === "all" || profileOptions.includes(profileFilter)
      ? profileFilter
      : "all";
  const sessions = useMemo(
    () =>
      rawSessions.filter((session) => {
        if (effectiveProfileFilter === "all") return true;
        return (
          (session.profile || CLINIC_PROFILES.PHYSIOTHERAPY) ===
          effectiveProfileFilter
        );
      }),
    [effectiveProfileFilter, rawSessions],
  );
  const statusCounts = useMemo(
    () =>
      sessions.reduce((acc, session) => {
        const status = session.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    [sessions],
  );
  const activeCount =
    (statusCounts[SESSION_STATUS.ARRIVED] || 0) +
    (statusCounts[SESSION_STATUS.IN_PROGRESS] || 0);
  const filteredProfileLabel =
    effectiveProfileFilter === "all"
      ? t("dailyOps.allProfiles", { defaultValue: "All profiles" })
      : getClinicProfileLabel(effectiveProfileFilter, t);
  const providerWorkload = useMemo(
    () =>
      doctors.map((doctor) => {
        const providerSessions = sessions.filter(
          (session) => Number(session.doctorId) === Number(doctor.id),
        );
        return {
          ...doctor,
          total: providerSessions.length,
          active:
            providerSessions.filter(
              (session) =>
                session.status === SESSION_STATUS.ARRIVED ||
                session.status === SESSION_STATUS.IN_PROGRESS,
            ).length || 0,
        };
      }),
    [doctors, sessions],
  );
  const agendaSessions = useMemo(
    () =>
      [...sessions].sort((left, right) => {
        const leftSlot = left.slot || left.sessionTime;
        const rightSlot = right.slot || right.sessionTime;
        const slotCompare =
          getSlotSortIndex(leftSlot) - getSlotSortIndex(rightSlot);
        if (slotCompare !== 0) return slotCompare;
        return String(left.patientName || "").localeCompare(
          String(right.patientName || ""),
        );
      }),
    [sessions],
  );

  const sessionsByDoctorSlot = useMemo(() => {
    const acc = {};
    sessions.forEach((s) => {
      if (!acc[s.doctorId]) acc[s.doctorId] = {};
      if (!acc[s.doctorId][s.slot]) acc[s.doctorId][s.slot] = [];
      acc[s.doctorId][s.slot].push({
        id: s.id,
        status: s.status,
        profile: s.profile,
        patientName: s.patientName,
        patientCode: s.patientCode,
        arrivalTime: s.arrivalTime,
        sessionTime: s.slot || s.sessionTime,
        startTime: s.startTime,
        endTime: s.endTime,
        isAssessment: s.isAssessment,
        isReassessment: s.isReassessment,
        sessionsUntilReassessment: s.sessionsUntilReassessment,
        sessionCategoryName: s.sessionCategoryName,
        isPackageSession:
          s.isPackageSession === true || s.isPackageSession === "true",
        packageLabel: s.packageLabel || null,
        isBalanceExhaustedAfterUse:
          s.isBalanceExhaustedAfterUse === true ||
          s.isBalanceExhaustedAfterUse === "true",
      });
    });
    return acc;
  }, [sessions]);

  const handleChangeStatus = (session, newStatus) => {
    if (isReadOnlyBranch || !canUpdateStatus || !newStatus || !session) return;
    if (newStatus === SESSION_STATUS.CANCELLED) {
      setPendingCancelSessionId(session.id);
      setPendingCancelSession(session);
      setCancelConfirmOpen(true);
      return;
    }
    const payload = buildStatusUpdatePayload(session, newStatus);
    updateStatus.mutate(
      { sessionId: session.id, data: payload },
      {
        onSuccess: () => {
          refetch();
          if (newStatus === SESSION_STATUS.COMPLETED) {
            navigate(`/payments?sessionId=${session.id}`);
          }
        },
      },
    );
  };

  const confirmCancel = () => {
    if (isReadOnlyBranch || !pendingCancelSessionId || !pendingCancelSession) return;
    const payload = buildStatusUpdatePayload(
      pendingCancelSession,
      SESSION_STATUS.CANCELLED,
    );
    updateStatus.mutate(
      { sessionId: pendingCancelSessionId, data: payload },
      {
        onSuccess: () => {
          refetch();
          setCancelConfirmOpen(false);
          setPendingCancelSessionId(null);
          setPendingCancelSession(null);
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <ImpactPanel
        icon={Activity}
        title={t("dailyOps.operationsWorkbenchTitle", {
          defaultValue: "Daily operations workbench",
        })}
        description={t("dailyOps.operationsWorkbenchDescription", {
          defaultValue:
            "Monitor today's patient flow by doctor, time, and clinic profile.",
        })}
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <ImpactMetric
            label={t("dailyOps.visibleVisits", {
              defaultValue: "Visible visits",
            })}
            value={sessions.length}
          />
          <ImpactMetric
            label={t("dailyOps.activeFlow", {
              defaultValue: "Arrived or in progress",
            })}
            value={activeCount}
          />
          <ImpactMetric
            label={t("status.completed")}
            value={statusCounts[SESSION_STATUS.COMPLETED] || 0}
          />
          <ImpactMetric
            label={t("status.cancelled")}
            value={statusCounts[SESSION_STATUS.CANCELLED] || 0}
          />
          <ImpactMetric
            label={t("dailyOps.resourceCoverage", {
              defaultValue: "Doctors with visits",
            })}
            value={`${providerWorkload.filter((provider) => provider.total > 0).length}/${doctors.length || 0}`}
          />
        </div>
      </ImpactPanel>

      <Card>
        <PageHeader
          title={t("dailyOps.title", { defaultValue: "Daily Operations" })}
          description={t("dailyOps.description", {
            defaultValue:
              "Command center view of today's workload by doctor and hour.",
          })}
          className="mx-4 mt-4 sm:mx-6"
          actions={
            <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-none xl:flex xl:flex-wrap xl:items-end xl:justify-end">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {t("dailyOps.dateLabel", { defaultValue: "Select day" })}
                </div>
                <LocalizedDatePicker
                  id="operations-date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="h-9 w-full xl:w-[180px]"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {t("dailyOps.profileFilter", {
                    defaultValue: "Clinic profile",
                  })}
                </div>
                <Select
                  value={effectiveProfileFilter}
                  onValueChange={setProfileFilter}
                >
                  <SelectTrigger className="h-9 w-full xl:w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("dailyOps.allProfiles", {
                        defaultValue: "All profiles",
                      })}
                    </SelectItem>
                    {profileOptions.map((profile) => (
                      <SelectItem key={profile} value={profile}>
                        {getClinicProfileLabel(profile, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canFilterShift && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("dailyOps.shiftFilter", { defaultValue: "Shift" })}
                  </div>
                  <Select
                    value={shiftFilter || "auto"}
                    onValueChange={handleShiftChange}
                  >
                    <SelectTrigger className="h-9 w-full xl:w-[180px]">
                      <SelectValue
                        placeholder={t("dailyOps.shiftFilter", {
                          defaultValue: "Shift",
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        {t("dailyOps.shiftAuto", {
                          defaultValue: "Auto (by day)",
                        })}
                      </SelectItem>
                      <SelectItem value={DOCTOR_SHIFT.SATURDAY}>
                        {t("shifts.saturday", {
                          defaultValue: "Saturday shift",
                        })}
                      </SelectItem>
                      <SelectItem value={DOCTOR_SHIFT.SUNDAY}>
                        {t("shifts.sunday", { defaultValue: "Sunday shift" })}
                      </SelectItem>
                      <SelectItem value="all">
                        {t("common.all", { defaultValue: "All" })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                className="h-9 w-full xl:w-auto"
              >
                {isFetching
                  ? t("common.loading")
                  : t("dailyOps.refresh", { defaultValue: "Refresh" })}
              </Button>
            </div>
          }
        />
        <CardContent className="p-0">
          <div className="space-y-3 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                {filteredProfileLabel}
              </Badge>
              {STATUS_ORDER.map((statusKey) => (
                <Badge
                  key={statusKey}
                  variant="outline"
                  className={getStatusBadgeClass(statusKey)}
                >
                  {t(`status.${statusKey}`)}: {statusCounts[statusKey] || 0}
                </Badge>
              ))}
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {providerWorkload
                .filter((provider) => provider.total > 0)
                .slice(0, 4)
                .map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0 truncate font-medium">
                      {provider.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {t("dailyOps.providerLoadValue", {
                        defaultValue: "{{active}} active / {{total}} total",
                        active: provider.active,
                        total: provider.total,
                      })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <div className="lg:hidden">
            <div className="border-b bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-primary" />
                {t("dailyOps.mobileAgendaTitle", {
                  defaultValue: "Today's agenda",
                })}
              </div>
            </div>
            {agendaSessions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("dailyOps.noAgendaVisits", {
                  defaultValue: "No visits match the selected filters.",
                })}
              </div>
            ) : (
              <div className="divide-y">
                {agendaSessions.map((session) => {
                  const sessionProfile =
                    session.profile || CLINIC_PROFILES.PHYSIOTHERAPY;
                  const profileLabel = getClinicProfileLabel(sessionProfile, t);
                  const provider = doctorById.get(Number(session.doctorId));
                  const nextRoutineStatus = getAllowedStatusTransitions(
                    session.status,
                    {
                      isAdmin,
                    },
                  ).find(
                    (statusKey) => statusKey !== SESSION_STATUS.CANCELLED,
                  );

                  return (
                    <div key={session.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={getStatusBadgeClass(session.status)}
                            >
                              {t(`status.${session.status}`)}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                              {formatHourLabel(session.slot || session.sessionTime)}
                            </span>
                          </div>
                          <div className="mt-2 break-words text-base font-semibold">
                            {session.patientName || "--"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {session.patientCode || "--"} |{" "}
                            {provider?.name || "--"} | {profileLabel}
                          </div>
                        </div>
                        <Users className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/sessions/${session.id}`)}
                          className="w-full sm:w-auto"
                        >
                          {t("dailyOps.openVisit", {
                            defaultValue: "Open visit",
                          })}
                        </Button>
                        {canUpdateStatus && nextRoutineStatus && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() =>
                              handleChangeStatus(session, nextRoutineStatus)
                            }
                            disabled={isReadOnlyBranch || updateStatus.isPending}
                            title={isReadOnlyBranch ? readOnlyTooltip : undefined}
                            className="w-full sm:w-auto"
                          >
                            {getStatusActionLabel(nextRoutineStatus, t)}
                          </Button>
                        )}
                        {canUpdateStatus &&
                          getAllowedStatusTransitions(session.status, {
                            isAdmin,
                          }).includes(SESSION_STATUS.CANCELLED) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleChangeStatus(
                                  session,
                                  SESSION_STATUS.CANCELLED,
                                )
                              }
                              disabled={isReadOnlyBranch || updateStatus.isPending}
                              title={isReadOnlyBranch ? readOnlyTooltip : undefined}
                              className="w-full text-destructive hover:text-destructive sm:w-auto"
                            >
                              {t("status.cancelled")}
                            </Button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="hidden overflow-auto lg:block max-h-[calc(100vh-260px)]">
            <table className="min-w-full text-sm" dir={isRtl ? "rtl" : "ltr"}>
              <thead className="sticky top-0 z-20 bg-muted/95 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="sticky left-0 z-30 bg-muted/95 px-3 py-2 font-medium text-left">
                    {t("dailyOps.hourColumn", { defaultValue: "Time" })}
                  </th>
                  {doctors.map((doctor) => (
                    <th
                      key={doctor.id}
                      className="px-3 py-2 font-medium text-center bg-muted/95"
                    >
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{doctor.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} className="border-b last:border-b-0">
                    <td className="sticky left-0 z-10 bg-background px-3 py-3 text-sm font-semibold text-muted-foreground">
                      <span dir="ltr">{formatHourLabel(hour)}</span>
                    </td>
                    {doctors.map((doctor) => {
                      const slotSessionsRaw =
                        sessionsByDoctorSlot[doctor.id]?.[hour];
                      const [topSession, bottomSession] = Array.isArray(
                        slotSessionsRaw,
                      )
                        ? [slotSessionsRaw[0], slotSessionsRaw[1] || null]
                        : [slotSessionsRaw || null, null];

                      const renderBox = (session) => {
                        if (!session) {
                          // Empty slot: visible neutral bordered box, clickable to create a session for this doctor
                          return (
                            <button
                              type="button"
                              aria-label={t("dailyOps.createSlotAria", {
                                defaultValue:
                                  "Create visit for {{doctor}} at {{time}}",
                                doctor: doctor.name,
                                time: formatHourLabel(hour),
                              })}
                              onClick={() =>
                                !isReadOnlyBranch &&
                                navigate(
                                  `/sessions?returnDate=${selectedDate}${shiftFilter ? `&returnShift=${shiftFilter}` : ""}`,
                                  {
                                    state: {
                                      initialDoctorId: doctor.id,
                                      initialDoctorName: doctor.name,
                                      initialDate: selectedDate,
                                      initialSlot: hour,
                                    },
                                  },
                                )
                              }
                              disabled={isReadOnlyBranch}
                              title={isReadOnlyBranch ? readOnlyTooltip : undefined}
                              className="group flex min-h-[52px] flex-1 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-card px-3 py-3 text-xs text-muted-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-card"
                            >
                              <span className="opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                {t("dailyOps.freeSlot", { defaultValue: "Free" })}
                              </span>
                            </button>
                          );
                        }

                        const statusClass =
                          STATUS_STYLES[session.status] ||
                          STATUS_STYLES.scheduled;
                        const sessionProfile =
                          session.profile || CLINIC_PROFILES.PHYSIOTHERAPY;
                        const supportsAssessmentTracking =
                          clinicProfileSupportsWorkflow(
                            sessionProfile,
                            CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
                          );
                        const profileLabel = getClinicProfileLabel(
                          sessionProfile,
                          t,
                        );
                        const packageBadgeValue = (() => {
                          if (!session.isPackageSession) return null;
                          const label =
                            session.packageLabel ||
                            session.sessionCategoryName ||
                            t("sessions.package", { defaultValue: "Package" });
                          const matched = String(label).match(/\d+/);
                          return matched?.[0] || null;
                        })();
                        const nextRoutineStatus = getAllowedStatusTransitions(
                          session.status,
                          {
                            isAdmin,
                          },
                        ).find(
                          (statusKey) => statusKey !== SESSION_STATUS.CANCELLED,
                        );

                        return (
                          <div className="relative flex-1">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/sessions/${session.id}`)
                              }
                              className={`w-full h-full rounded-md border ${statusClass} px-3 py-2 min-h-[52px] flex flex-col items-center justify-center text-center cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40`}
                            >
                              {supportsAssessmentTracking &&
                              session.isReassessment ? (
                                <span
                                  className="absolute left-1 top-1 inline-flex items-center justify-center rounded-full border border-teal-300 bg-teal-100 p-1 text-teal-800 shadow-sm dark:border-teal-700 dark:bg-teal-900/70 dark:text-teal-50"
                                  title={t("sessions.isReassessment", {
                                    defaultValue: "Reassessment",
                                  })}
                                >
                                  <ClipboardCheck
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : supportsAssessmentTracking &&
                                session.isAssessment ? (
                                <span
                                  className="absolute left-1 top-1 inline-flex items-center justify-center rounded-full border border-purple-300 bg-purple-100 p-1 text-purple-800 shadow-sm dark:border-purple-700 dark:bg-purple-900/70 dark:text-purple-50"
                                  title={t("sessions.isAssessment", {
                                    defaultValue: "Assessment",
                                  })}
                                >
                                  <Stethoscope
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : null}
                              <div className="flex w-full items-center justify-center gap-1 overflow-hidden text-base font-semibold leading-tight text-foreground">
                                <span className="max-w-full truncate">
                                  {session.patientName}
                                </span>
                                {supportsAssessmentTracking &&
                                  session.sessionsUntilReassessment === 0 &&
                                  !session.isAssessment &&
                                  !session.isReassessment && (
                                    <span className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50">
                                      <BellRing
                                        className="h-4 w-4 text-sky-500 dark:text-sky-400 flex-shrink-0"
                                        aria-hidden="true"
                                        title={t("patients.reassessmentDue", {
                                          defaultValue: "Reassessment due",
                                        })}
                                      />
                                    </span>
                                  )}
                                {session.isBalanceExhaustedAfterUse && (
                                  <span className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 p-1 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50">
                                    <CircleOff
                                      className="h-4 w-4 text-sky-600 dark:text-sky-300"
                                      aria-hidden="true"
                                      title={t(
                                        "patients.balanceExhaustedAfterUse",
                                        {
                                          defaultValue:
                                            "Previously had balance, now exhausted",
                                        },
                                      )}
                                    />
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 max-w-full truncate text-xs font-mono text-foreground">
                                {session.patientCode}
                              </div>
                              <div className="mt-1 max-w-full truncate text-[11px] text-muted-foreground">
                                {t(`status.${session.status}`)} | {profileLabel}
                              </div>
                              {canUpdateStatus && !isReadOnlyBranch && nextRoutineStatus && (
                                <div className="mt-1 max-w-full truncate text-[11px] font-medium text-foreground">
                                  {getStatusActionLabel(nextRoutineStatus, t)}
                                </div>
                              )}
                            </button>
                            {packageBadgeValue && (
                              <span
                                className="pointer-events-none absolute bottom-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-indigo-300 bg-indigo-100 text-[10px] font-bold leading-none text-indigo-700 shadow-sm dark:border-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-100"
                                title={
                                  session.packageLabel ||
                                  session.sessionCategoryName ||
                                  t("sessions.package", {
                                    defaultValue: "Package",
                                  })
                                }
                              >
                                {packageBadgeValue}
                              </span>
                            )}
                            {canUpdateStatus && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={isReadOnlyBranch}
                                    title={isReadOnlyBranch ? readOnlyTooltip : undefined}
                                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow hover:bg-background hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align={isRtl ? "start" : "end"}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getAllowedStatusTransitions(session.status, {
                                    isAdmin,
                                  }).map((statusKey) => (
                                    <DropdownMenuItem
                                      key={statusKey}
                                      disabled={isReadOnlyBranch || updateStatus.isPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleChangeStatus(session, statusKey);
                                      }}
                                    >
                                      {getStatusActionLabel(statusKey, t)}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        );
                      };

                      return (
                        <td
                          key={doctor.id}
                          className="px-3 py-3 align-top min-w-[180px] border-l border-border first:border-l-0"
                        >
                          <div className="h-32 flex flex-col gap-2">
                            {renderBox(topSession)}
                            {renderBox(bottomSession)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title={t("sessions.cancelConfirmTitle", {
          defaultValue: "Cancel visit?",
        })}
        description={t("sessions.cancelConfirmDesc", {
          defaultValue:
            "Are you sure you want to cancel this visit? This action cannot be undone.",
        })}
        confirmText={t("status.cancelled")}
        onConfirm={confirmCancel}
        isLoading={updateStatus.isPending}
        confirmProps={{
          disabled: isReadOnlyBranch || updateStatus.isPending,
          title: isReadOnlyBranch ? readOnlyTooltip : undefined,
        }}
      />
    </div>
  );
}
