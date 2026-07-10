import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';
import { MoreHorizontal, Stethoscope, BellRing, ClipboardCheck, CircleOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/common/PageHeader';
import { LocalizedDatePicker } from '@/components/common/LocalizedDatePicker';
import { useDailyOperations } from '@/hooks/useDashboard';
import { useUpdateSessionStatus } from '@/hooks/useSessions';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS, DOCTOR_SHIFT, USER_ROLES, SESSION_STATUS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { getAllowedStatusTransitions, buildStatusUpdatePayload } from '@/lib/sessionRules';

// Static time slots; API returns a flat sessions array with `slot` matching these labels (24h).
// Rows are fixed from 10:00 to 24:00.
const HOURS = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
  '24:00',
];

const STATUS_STYLES = {
  // Borders + soft background are colored by status in a theme-friendly way
  // Light mode: slightly stronger tint; Dark mode: darker, subtle tint
  scheduled: 'border-amber-400 bg-amber-100 dark:bg-amber-900/30',
  arrived: 'border-purple-400 bg-purple-100 dark:bg-purple-900/30',
  in_progress: 'border-blue-400 bg-blue-100 dark:bg-blue-900/30',
  completed: 'border-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  cancelled: 'border-red-400 bg-red-100 dark:bg-red-900/30',
};

const STATUS_ORDER = ['scheduled', 'arrived', 'in_progress', 'completed', 'cancelled'];

const formatHourLabel = (hour) => {
  const [hStr] = hour.split(':');
  let h = parseInt(hStr, 10);
  if (h === 24) return '12 AM';
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return `${h} ${suffix}`;
};

export default function DailyOperationsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(() => {
    const fromUrl = searchParams.get('date');
    if (fromUrl) return fromUrl;
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const [shiftFilter, setShiftFilterState] = useState(() => {
    const param = searchParams.get('shift');
    if (param === 'all' || param === DOCTOR_SHIFT.SATURDAY || param === DOCTOR_SHIFT.SUNDAY) {
      return param;
    }
    return undefined; // auto-detect based on day
  });

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
    const value = newShift === 'auto' ? undefined : newShift;
    setShiftFilterState(value);
    updateFiltersInUrl(selectedDate, value);
  };

  const locale = useMemo(() => {
    if (i18n.language === 'ar') return arSA;
    return enUS;
  }, [i18n.language]);

  const selectedDateObj = useMemo(() => {
    try {
      return new Date(selectedDate);
    } catch {
      return new Date();
    }
  }, [selectedDate]);

  const isRtl = i18n.language === 'ar';

  const { hasPermission } = usePermissions();
  const canUpdateStatus =
    hasPermission(PERMISSIONS['sessions:updateStatus']) ||
    hasPermission(PERMISSIONS['sessions:updateStatusOwn']);

  const updateStatus = useUpdateSessionStatus();

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [pendingCancelSessionId, setPendingCancelSessionId] = useState(null);
  const [pendingCancelSession, setPendingCancelSession] = useState(null);

  const { data, refetch, isFetching } = useDailyOperations(
    { date: selectedDate, shift: shiftFilter },
    {
      keepPreviousData: true,
      refetchInterval: 3 * 60 * 1000,
    }
  );

  const sessions = data?.sessions ?? [];
  const doctors = data?.doctors ?? [];
  const currentShift = data?.shift ?? 'all';

  const sessionsByDoctorSlot = useMemo(() => {
    const acc = {};
    sessions.forEach((s) => {
      if (!acc[s.doctorId]) acc[s.doctorId] = {};
      if (!acc[s.doctorId][s.slot]) acc[s.doctorId][s.slot] = [];
      acc[s.doctorId][s.slot].push({
        id: s.id,
        status: s.status,
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
        isPackageSession: s.isPackageSession === true || s.isPackageSession === 'true',
        packageLabel: s.packageLabel || null,
        isBalanceExhaustedAfterUse:
          s.isBalanceExhaustedAfterUse === true ||
          s.isBalanceExhaustedAfterUse === 'true',
        });
      });
    return acc;
  }, [sessions]);


  const handleChangeStatus = (session, newStatus) => {
    if (!canUpdateStatus || !newStatus || !session) return;
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
      }
    );
  };

  const confirmCancel = () => {
    if (!pendingCancelSessionId || !pendingCancelSession) return;
    const payload = buildStatusUpdatePayload(pendingCancelSession, SESSION_STATUS.CANCELLED);
    updateStatus.mutate(
      { sessionId: pendingCancelSessionId, data: payload },
      {
        onSuccess: () => {
          refetch();
          setCancelConfirmOpen(false);
          setPendingCancelSessionId(null);
          setPendingCancelSession(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6">

      <Card>
        <PageHeader
          title={t('dailyOps.title', { defaultValue: 'Daily Operations' })}
          description={t('dailyOps.description', {
            defaultValue: 'Command center view of today\'s workload by doctor and hour.',
          })}
          className="mx-6 mt-4"
          actions={
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 min-w-[220px]">
                <LocalizedDatePicker
                  id="operations-date"
                  value={selectedDate}
                  onChange={handleDateChange}
                />
                <div className="text-md text-muted-foreground mt-6">
                  {format(selectedDateObj, 'PPPP', { locale })}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-8">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {t('dailyOps.refresh', { defaultValue: 'Refresh' })}
                </Button>
                {canFilterShift && (
                  <Select
                    value={shiftFilter || 'auto'}
                    onValueChange={handleShiftChange}
                  >
                    <SelectTrigger className="h-9 w-[180px]">
                      <SelectValue placeholder={t('dailyOps.shiftFilter', { defaultValue: 'Shift' })} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        {t('dailyOps.shiftAuto', { defaultValue: 'Auto (by day)' })}
                      </SelectItem>
                      <SelectItem value={DOCTOR_SHIFT.SATURDAY}>
                        {t('shifts.saturday', { defaultValue: 'Saturday shift' })}
                      </SelectItem>
                      <SelectItem value={DOCTOR_SHIFT.SUNDAY}>
                        {t('shifts.sunday', { defaultValue: 'Sunday shift' })}
                      </SelectItem>
                      <SelectItem value="all">
                        {t('common.all', { defaultValue: 'All' })}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          }
        />
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-b border-border">
            {STATUS_ORDER.map((statusKey) => (
              <div
                key={statusKey}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <span
                  className={`inline-block h-3 w-10 rounded-full border ${STATUS_STYLES[statusKey]}`}
                />
                <span>{t(`status.${statusKey}`)}</span>
              </div>
            ))}
          </div>
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="min-w-full text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
              <thead className="sticky top-0 z-20 bg-muted/95 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="sticky left-0 z-30 bg-muted/95 px-3 py-2 font-medium text-left">
                    {t('dailyOps.hourColumn', { defaultValue: 'Time' })}
                  </th>
                  {doctors.map((doctor) => (
                    <th key={doctor.id} className="px-3 py-2 font-medium text-center bg-muted/95">
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
                    <td
                      className="sticky left-0 z-10 bg-background px-3 py-3 text-sm font-semibold text-muted-foreground"
                    >
                      <span dir="ltr">{formatHourLabel(hour)}</span>
                    </td>
                    {doctors.map((doctor) => {
                      const slotSessionsRaw = sessionsByDoctorSlot[doctor.id]?.[hour];
                      const [topSession, bottomSession] = Array.isArray(slotSessionsRaw)
                        ? [slotSessionsRaw[0], slotSessionsRaw[1] || null]
                        : [slotSessionsRaw || null, null];

                      const renderBox = (session) => {
                        if (!session) {
                          // Empty slot: visible neutral bordered box, clickable to create a session for this doctor
                          return (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/sessions?returnDate=${selectedDate}${shiftFilter ? `&returnShift=${shiftFilter}` : ''}`, {
                                  state: {
                                    initialDoctorId: doctor.id,
                                    initialDoctorName: doctor.name,
                                    initialDate: selectedDate,
                                    initialSlot: hour,
                                  },
                                })
                              }
                              className="flex-1 rounded-md border border-border bg-card px-3 py-3 min-h-[52px] flex items-center justify-center cursor-pointer hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                          );
                        }

                        const statusClass = STATUS_STYLES[session.status] || STATUS_STYLES.scheduled;
                        const packageBadgeValue = (() => {
                          if (!session.isPackageSession) return null;
                          const label =
                            session.packageLabel ||
                            session.sessionCategoryName ||
                            t('sessions.package', { defaultValue: 'Package' });
                          const matched = String(label).match(/\d+/);
                          return matched?.[0] || null;
                        })();

                        return (
                          <div className="relative flex-1">
                            <button
                              type="button"
                              onClick={() => navigate(`/sessions/${session.id}`)}
                              className={`w-full h-full rounded-md border ${statusClass} px-3 py-2 min-h-[52px] flex flex-col items-center justify-center text-center cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40`}
                            >
                              {session.isReassessment ? (
                                <span
                                  className="absolute left-1 top-1 inline-flex items-center justify-center rounded-full border border-teal-300 bg-teal-100 p-1 text-teal-800 shadow-sm dark:border-teal-700 dark:bg-teal-900/70 dark:text-teal-50"
                                  title={t('sessions.isReassessment', { defaultValue: 'Reassessment' })}
                                >
                                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : session.isAssessment ? (
                                <span
                                  className="absolute left-1 top-1 inline-flex items-center justify-center rounded-full border border-purple-300 bg-purple-100 p-1 text-purple-800 shadow-sm dark:border-purple-700 dark:bg-purple-900/70 dark:text-purple-50"
                                  title={t('sessions.isAssessment', { defaultValue: 'Assessment' })}
                                >
                                  <Stethoscope className="h-5 w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                              <div className="flex w-full items-center justify-center gap-1 overflow-hidden text-base font-semibold leading-tight text-foreground">
                                <span className="max-w-full truncate">{session.patientName}</span>
                                {session.sessionsUntilReassessment === 0 &&
                                  !session.isAssessment &&
                                  !session.isReassessment && (
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
                                {session.isBalanceExhaustedAfterUse && (
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
                              </div>
                              <div className="mt-1 max-w-full truncate text-xs font-mono text-foreground">
                                {session.patientCode}
                              </div>
                            </button>
                            {packageBadgeValue && (
                              <span
                                className="pointer-events-none absolute bottom-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-indigo-300 bg-indigo-100 text-[10px] font-bold leading-none text-indigo-700 shadow-sm dark:border-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-100"
                                title={session.packageLabel || session.sessionCategoryName || t('sessions.package', { defaultValue: 'Package' })}
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
                                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow hover:bg-background hover:text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                  >
                                    <MoreHorizontal className="h-3 w-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align={isRtl ? 'start' : 'end'}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getAllowedStatusTransitions(session.status, {
                                    isAdmin,
                                  }).map((statusKey) => (
                                    <DropdownMenuItem
                                      key={statusKey}
                                      disabled={updateStatus.isPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleChangeStatus(session, statusKey);
                                      }}
                                    >
                                      {statusKey === 'in_progress' ? t(`status.start`) : t(`status.${statusKey}`)}
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
        title={t('sessions.cancelConfirmTitle', { defaultValue: 'Cancel session?' })}
        description={t('sessions.cancelConfirmDesc', { defaultValue: 'Are you sure you want to cancel this session? This action cannot be undone.' })}
        confirmText={t('status.cancelled')}
        onConfirm={confirmCancel}
        isLoading={updateStatus.isPending}
      />
    </div>
  );
}
