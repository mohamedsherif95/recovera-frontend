import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Navigate,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { LocalizedDatePicker } from "@/components/common/LocalizedDatePicker";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ImpactMetric, ImpactPanel } from "@/components/common/ImpactPanel";
import {
  useSessions,
  useCreateSession,
  useSessionCategories,
  useDeleteSession,
} from "@/hooks/useSessions";
import { useDebounce } from "@/hooks/useDebounce";
import { usePermissions } from "@/hooks/usePermissions";
import { useBranchAccessState } from "@/hooks/useBranchAccessState";
import {
  CLINIC_PROFILES,
  PERMISSIONS,
  USER_ROLES,
  SESSION_STATUS,
} from "@/lib/constants";
import {
  formatDate,
  formatTimeTo12Hour,
  formatTimeWithDate,
} from "@/lib/utils";
import { getClinicTodayDateOnly } from "@/lib/time";
import {
  Loader2,
  CalendarClock,
  RefreshCcw,
  Trash2,
  Stethoscope,
  BellRing,
  ClipboardCheck,
  Plus,
} from "lucide-react";
import { SessionFormDrawer } from "./SessionFormDrawer";
import { useAuthStore } from "@/store/authStore";
import {
  CLINIC_PROFILE_WORKFLOWS,
  clinicProfileSupportsWorkflow,
  getClinicProfileLabel,
} from "@/lib/clinicProfiles";
import {
  getClinicProfileBadgeVariant,
  getSessionStatusBadgeVariant,
} from "@/lib/visualTokens";

export default function SessionsPage() {
  const { t, i18n } = useTranslation();
  const { canAny, can } = usePermissions();
  const {
    isReadOnlyBranch,
    readOnlyTitle,
    readOnlyTitleKey,
  } = useBranchAccessState();
  const readOnlyTooltip = t(readOnlyTitleKey, { defaultValue: readOnlyTitle });
  const { hasAnyRole } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialFromState = useMemo(
    () => location.state || {},
    [location.state],
  );
  const initialFilters = initialFromState.initialFilters || {};
  const lockDoctor = !!initialFromState.initialDoctorId;

  const returnDate = searchParams.get("returnDate");
  const returnShift = searchParams.get("returnShift");

  const canView = canAny([
    PERMISSIONS["sessions:viewAll"],
    PERMISSIONS["sessions:viewOwn"],
  ]);

  const canSeeFinancialAndCategory = hasAnyRole([
    USER_ROLES.MANAGER,
    USER_ROLES.SECRETARY,
  ]);
  const canViewCategories = canSeeFinancialAndCategory;

  const [page, setPage] = useState(1);
  const pageSize = 10;

  const todayIso = useMemo(() => getClinicTodayDateOnly(), []);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState(
    initialFilters.status ?? "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [fromDate, setFromDate] = useState(initialFilters.fromDate ?? todayIso);
  const [toDate, setToDate] = useState(initialFilters.toDate ?? todayIso);

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, statusFilter, categoryFilter, debouncedSearch]);

  const { data, isLoading, isError, refetch } = useSessions({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    categoryId: categoryFilter !== "all" ? Number(categoryFilter) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const categoriesQuery = useSessionCategories({
    enabled: canViewCategories,
    suppressPermissionToast: true,
  });

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
      params.set("date", returnDate);
      if (returnShift) {
        params.set("shift", returnShift);
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
      sessionDate: initialFromState.initialDate ?? "",
      sessionTime: initialFromState.initialSlot ?? "",
      cost: undefined,
      doctorName: initialFromState.initialDoctorName ?? undefined,
      isAssessment: false,
    }),
    [initialFromState],
  );

  const [showForm, setShowForm] = useState(
    !isReadOnlyBranch &&
      !!(
        initialFromState.initialDoctorId ||
        initialFromState.initialDate ||
        initialFromState.initialSlot
      ),
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
  const statusCounts = useMemo(
    () =>
      sessions.reduce((acc, session) => {
        const status = session.status || "unknown";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
    [sessions],
  );
  const activeVisitCount =
    (statusCounts[SESSION_STATUS.ARRIVED] || 0) +
    (statusCounts[SESSION_STATUS.IN_PROGRESS] || 0);

  const statusOptions = useMemo(() => {
    return Object.values(SESSION_STATUS);
  }, []);

  const deleteSession = useDeleteSession();
  const isAdmin = hasAnyRole([USER_ROLES.MANAGER]);
  const [sessionPendingDelete, setSessionPendingDelete] = useState(null);

  useEffect(() => {
    if (isReadOnlyBranch) {
      setShowForm(false);
      setSessionPendingDelete(null);
    }
  }, [isReadOnlyBranch]);

  const handleConfirmDelete = () => {
    if (isReadOnlyBranch || !sessionPendingDelete) return;
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
        key: "patientCode",
        header: t("patients.patientId"),
        cell: (row) => row.patient?.patientCode || "--",
      },
      {
        key: "patient",
        header: t("sessions.patient"),
        cell: (row) => (
          <span className="flex items-center gap-2">
            {row.patient?.fullName || "--"}
            {clinicProfileSupportsWorkflow(
              row.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
              CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
            ) &&
              row.patient?.sessionsUntilReassessment === 0 &&
              !row.isAssessment &&
              !row.isReassessment && (
                <Badge
                  variant="warning"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center p-0"
                  title={t("patients.reassessmentDue", {
                    defaultValue: "Reassessment due",
                  })}
                >
                  <BellRing
                    className="h-3 w-3"
                    aria-hidden="true"
                  />
                </Badge>
              )}
          </span>
        ),
      },
      {
        key: "profile",
        header: t("sessions.profile", { defaultValue: "Clinic profile" }),
        cell: (row) => (
          <Badge
            variant={getClinicProfileBadgeVariant(
              row.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
            )}
          >
            {getClinicProfileLabel(
              row.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
              t,
            )}
          </Badge>
        ),
      },
      {
        key: "doctor",
        header: t("clinicProfiles.providerGeneric", {
          defaultValue: "Doctor",
        }),
        cell: (row) => row.doctor?.fullName || "--",
      },
      {
        key: "date",
        header: t("sessions.date"),
        cell: (row) => {
          const date = row.sessionDate || row.date;
          return date ? formatDate(date, "PP") : "--";
        },
      },
      {
        key: "sessionTime",
        header: t("sessions.startedAt"),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeTo12Hour(row.sessionTime)}
          </span>
        ),
      },
      {
        key: "arrivalTime",
        header: t("sessions.arrivalTime"),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeTo12Hour(row.arrivalTime)}
          </span>
        ),
      },
      {
        key: "startTime",
        header: t("sessions.startTime", { defaultValue: "Start time" }),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeWithDate(row.startTime, row.sessionDate || row.date) ||
              "--"}
          </span>
        ),
      },
      {
        key: "endTime",
        header: t("sessions.endTime", { defaultValue: "End time" }),
        cell: (row) => (
          <span dir="ltr" className="inline-block font-mono">
            {formatTimeWithDate(row.endTime, row.sessionDate || row.date) ||
              "--"}
          </span>
        ),
      },
      {
        key: "status",
        header: t("sessions.status"),
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Badge variant={getSessionStatusBadgeVariant(row.status)}>
              {t(`status.${row.status}`)}
            </Badge>
            {clinicProfileSupportsWorkflow(
              row.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
              CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
            ) && row.isReassessment ? (
              <Badge className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-teal-200 bg-teal-100 p-0 text-teal-800 dark:border-teal-800 dark:bg-teal-900/40 dark:text-teal-100">
                <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
              </Badge>
            ) : clinicProfileSupportsWorkflow(
                row.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
                CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
              ) && row.isAssessment ? (
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
              key: "category",
              header: t("sessions.category", { defaultValue: "Category" }),
              cell: (row) =>
                clinicProfileSupportsWorkflow(
                  row.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
                  CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
                )
                  ? row.category?.name || "--"
                  : "--",
            },
            {
              key: "cost",
              header: t("sessions.cost"),
              cell: (row) => (row.cost != null ? row.cost : "--"),
            },
          ]
        : []),
      ...(isAdmin
        ? [
            {
              key: "actions",
              header: "",
              className: "w-[80px]",
              cell: (row) => (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isReadOnlyBranch) return;
                      setSessionPendingDelete(row);
                    }}
                    disabled={isReadOnlyBranch || deleteSession.isPending}
                    title={isReadOnlyBranch ? readOnlyTooltip : undefined}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">{t("common.delete")}</span>
                  </Button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [
      t,
      canSeeFinancialAndCategory,
      isAdmin,
      deleteSession.isPending,
      isReadOnlyBranch,
      readOnlyTooltip,
    ],
  );

  if (!canView) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("sessions.title")}
        onBack={returnDate ? handleCancelForm : undefined}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="w-full sm:w-9"
              aria-label={t("common.refresh", { defaultValue: "Refresh" })}
            >
              <RefreshCcw className="h-4 w-4" />
            </Button>
            {can(PERMISSIONS["sessions:create"]) && (
              <Button
                onClick={() => {
                  if (isReadOnlyBranch) return;
                  setShowForm(true);
                }}
                disabled={isReadOnlyBranch}
                title={isReadOnlyBranch ? readOnlyTooltip : undefined}
                className="w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("sessions.createSession")}
              </Button>
            )}
          </div>
        }
      />

      <ImpactPanel
        icon={CalendarClock}
        title={t("sessions.visitOperationsTitle")}
        description={t("sessions.visitOperationsDescription")}
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <ImpactMetric
            label={t("sessions.operationsMetricVisible")}
            value={sessions.length}
          />
          <ImpactMetric
            label={t("sessions.operationsMetricWaiting")}
            value={statusCounts[SESSION_STATUS.SCHEDULED] || 0}
          />
          <ImpactMetric
            label={t("sessions.operationsMetricActive")}
            value={activeVisitCount}
          />
          <ImpactMetric
            label={t("sessions.operationsMetricCompleted")}
            value={statusCounts[SESSION_STATUS.COMPLETED] || 0}
          />
          <ImpactMetric
            label={t("sessions.operationsMetricCancelled")}
            value={statusCounts[SESSION_STATUS.CANCELLED] || 0}
          />
        </div>
      </ImpactPanel>

      {!isReadOnlyBranch && can(PERMISSIONS["sessions:create"]) && (
        <SessionFormDrawer
          open={showForm}
          onOpenChange={(open) => {
            if (!open) {
              handleCancelForm();
            } else {
              setShowForm(true);
            }
          }}
          initialValues={initialFormValues}
          lockDoctor={lockDoctor}
          onSubmit={(values) => {
            if (isReadOnlyBranch) return;
            createSession.mutate(values, {
              onSuccess: () => {
                if (returnDate) {
                  const params = new URLSearchParams();
                  params.set("date", returnDate);
                  if (returnShift) {
                    params.set("shift", returnShift);
                  }
                  navigate(`/daily-operations?${params.toString()}`);
                } else {
                  setShowForm(false);
                }
              },
            });
          }}
          onCancel={handleCancelForm}
          isSubmitting={createSession.isPending}
        />
      )}

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-3 xl:flex-row xl:items-end xl:justify-between">
            <Input
              placeholder={t("sessions.filters.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full xl:max-w-xs"
            />
            <div className="grid w-full gap-3 text-xs text-muted-foreground sm:grid-cols-2 xl:w-auto xl:flex xl:flex-wrap xl:items-center xl:justify-end">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span>{t("sessions.filters.statusLabel")}</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[150px]">
                    <SelectValue
                      placeholder={t("sessions.filters.statusAll")}
                    />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="all">
                      {t("sessions.filters.statusAll")}
                    </SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {t(`status.${status}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canSeeFinancialAndCategory && (
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <span>
                    {t("sessions.filters.categoryLabel", {
                      defaultValue: "Category",
                    })}
                  </span>
                  <Select
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                  >
                    <SelectTrigger className="h-9 w-full sm:w-[160px]">
                      <SelectValue
                        placeholder={t("sessions.filters.categoryAll", {
                          defaultValue: "All categories",
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="all">
                        {t("sessions.filters.categoryAll", {
                          defaultValue: "All categories",
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

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span>
                  {t("sessions.filters.fromDateLabel", {
                    defaultValue: "From",
                  })}
                </span>
                <LocalizedDatePicker
                  id="sessions-from-date"
                  value={fromDate}
                  onChange={(value) => setFromDate(value || "")}
                  className="w-full sm:w-[160px]"
                />
              </div>

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span>
                  {t("sessions.filters.toDateLabel", { defaultValue: "To" })}
                </span>
                <LocalizedDatePicker
                  id="sessions-to-date"
                  value={toDate}
                  onChange={(value) => setToDate(value || "")}
                  className="w-full sm:w-[160px]"
                />
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-destructive">
              {t("messages.errorOccurred")}
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {t("sessions.noSessions")}
            </div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={sessions}
                getRowId={(row) => row.id}
                onRowClick={(row) => navigate(`/sessions/${row.id}`)}
                direction={i18n.language === "ar" ? "rtl" : "ltr"}
                mobileCard={(row) => {
                  const rowProfile =
                    row.profile || CLINIC_PROFILES.PHYSIOTHERAPY;
                  const supportsAssessmentTracking =
                    clinicProfileSupportsWorkflow(
                      rowProfile,
                      CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
                    );
                  const supportsVisitCategories =
                    clinicProfileSupportsWorkflow(
                      rowProfile,
                      CLINIC_PROFILE_WORKFLOWS.VISIT_CATEGORIES,
                    );

                  return (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">
                            {row.patient?.fullName || "--"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.patient?.patientCode
                              ? `#${row.patient.patientCode}`
                              : t("patients.patientId")}
                          </div>
                        </div>
                        <Badge
                          variant={getClinicProfileBadgeVariant(rowProfile)}
                          className="shrink-0"
                        >
                          {getClinicProfileLabel(rowProfile, t)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <div className="text-muted-foreground">
                            {t("clinicProfiles.providerGeneric", {
                              defaultValue: "Doctor",
                            })}
                          </div>
                          <div className="mt-1 font-medium">
                            {row.doctor?.fullName || "--"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            {t("sessions.date")}
                          </div>
                          <div className="mt-1 font-medium" dir="ltr">
                            {row.sessionDate || row.date
                              ? formatDate(row.sessionDate || row.date, "PP")
                              : "--"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            {t("sessions.scheduledTime", {
                              defaultValue: "Scheduled time",
                            })}
                          </div>
                          <div className="mt-1 font-mono font-medium" dir="ltr">
                            {formatTimeTo12Hour(row.sessionTime)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">
                            {t("sessions.status")}
                          </div>
                          <div className="mt-1 flex items-center gap-2 font-medium">
                            <Badge
                              variant={getSessionStatusBadgeVariant(row.status)}
                            >
                              <span>{t(`status.${row.status}`)}</span>
                            </Badge>
                            {supportsAssessmentTracking &&
                            row.isReassessment ? (
                              <ClipboardCheck
                                className="h-4 w-4 text-teal-600"
                                aria-hidden="true"
                              />
                            ) : supportsAssessmentTracking &&
                              row.isAssessment ? (
                              <Stethoscope
                                className="h-4 w-4 text-primary"
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {canSeeFinancialAndCategory && (
                        <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
                          <div>
                            <div className="text-muted-foreground">
                              {t("sessions.category", {
                                defaultValue: "Category",
                              })}
                            </div>
                            <div className="mt-1 font-medium">
                              {supportsVisitCategories
                                ? row.category?.name || "--"
                                : "--"}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">
                              {t("sessions.cost")}
                            </div>
                            <div className="mt-1 font-medium">
                              {row.cost != null ? row.cost : "--"}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <div className="flex flex-col gap-3 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {t("common.paginationSummary", {
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
                    {t("common.previous")}
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
                    {t("common.next")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        title={t("sessions.deleteTitle", { defaultValue: "Delete visit" })}
        description={t("sessions.deleteDescription", {
          defaultValue:
            "Are you sure you want to delete this visit? This action cannot be undone.",
        })}
        confirmText={t("common.delete")}
        cancelText={t("common.cancel")}
        open={!!sessionPendingDelete}
        onOpenChange={(open) => {
          if (!open) setSessionPendingDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        confirmProps={{
          variant: "destructive",
          disabled: isReadOnlyBranch || deleteSession.isPending,
          title: isReadOnlyBranch ? readOnlyTooltip : undefined,
        }}
      />
    </div>
  );
}
