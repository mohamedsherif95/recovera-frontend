import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTimeTo12Hour } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/cards/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDashboard, usePatientsReport } from '@/hooks/useDashboard';
import { useAuthStore } from '@/store/authStore';
import { CLINIC_PROFILES } from '@/lib/constants';
import {
  CLINIC_PROFILE_WORKFLOWS,
  clinicProfileSupportsWorkflow,
  getClinicProfileLabel,
} from '@/lib/clinicProfiles';
import {
  Users,
  Calendar,
  UserCheck,
  RefreshCcw,
  AlertCircle,
  Timer,
  Activity,
  BellRing,
  ListChecks,
  Stethoscope,
} from 'lucide-react';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data, isLoading, isError, refetch, isFetching } = useDashboard();
  const { data: patientsReport } = usePatientsReport();

  const isDoctor = user?.roles?.every((r) => r.name === 'doctor');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('messages.errorOccurred')}
        description={t('dashboard.loadError')}
        action={() => refetch()}
        actionLabel={t('common.refresh')}
      />
    );
  }

  const stats = data || {};
  const overview = stats.overview || {};
  const today = stats.today || {};
  const todaySessions = stats.todaySessions || [];
  const sessionsByStatus = stats.sessionsByStatus || {};
  const averages = stats.averages || {};
  const upcomingSessions = stats.upcomingSessions || [];
  const alerts = stats.alerts || {};
  const followUps = alerts.followUpPatients || [];
  const isRtl = i18n.language === 'ar';
  const todayIso = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = (() => {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return date.toISOString().split('T')[0];
  })();

  const totalPatients = overview.totalPatients ?? patientsReport?.totalPatients ?? 0;
  const sessionsToday = today.totalSessionsToday ?? stats.sessionsToday ?? 0;
  const completedToday = today.completedSessionsToday ?? stats.completedToday ?? 0;
  const doctorsInSessions = today.doctorsInSessions ?? 0;
  const totalDoctors = overview.totalDoctors ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            {t('dashboard.welcome')}, {user?.fullName}
          </h1>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t('dashboard.totalPatients')}
          value={totalPatients}
          icon={Users}
          description={t('dashboard.totalPatientsDescription')}
          onClick={() => navigate('/patients')}
        />

        <StatCard
          title={isDoctor ? t('dashboard.mySessionsToday') : t('dashboard.sessionsToday')}
          value={sessionsToday}
          icon={Calendar}
          description={t('dashboard.completedCount', { count: completedToday })}
          onClick={() => navigate('/sessions')}
        />

        <StatCard
          title={t('dashboard.doctorsInSession')}
          value={`${doctorsInSessions} / ${totalDoctors || 0}`}
          icon={UserCheck}
          description={t('dashboard.currentlyInSession')}
          onClick={() => navigate('/doctors')}
        />
      </div>

            <Card className="border-none bg-gradient-to-br from-background via-muted to-background shadow-sm">
        <CardHeader className="flex items-center justify-between space-y-0">
          <CardTitle className="mb-2">{t('dashboard.sessionsToday')}</CardTitle>
          {today.date && (
            <span className="rounded-full bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              {formatDate(today.date, 'PP')}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {todaySessions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead>
                  <tr
                    className={`border-b bg-muted/50 text-xs uppercase text-muted-foreground ${
                      isRtl ? 'text-right' : 'text-left'
                    }`}
                  >
                    <th className="px-3 py-2 font-medium">{t('sessions.startedAt')}</th>
                    <th className="px-3 py-2 font-medium">{t('sessions.arrivalTime')}</th>
                    <th className="px-3 py-2 font-medium">{t('sessions.startTime', { defaultValue: 'Start time' })}</th>
                    <th className="px-3 py-2 font-medium">{t('sessions.endTime', { defaultValue: 'End time' })}</th>
                    <th className="px-3 py-2 font-medium">{t('sessions.patient')}</th>
                    <th className="px-3 py-2 font-medium">
                      {t('clinicProfiles.providerGeneric', { defaultValue: 'Provider' })}
                    </th>
                    <th className="px-3 py-2 font-medium">{t('sessions.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySessions.map((session) => (
                    <tr
                      key={session.id}
                      className="border-b last:border-b-0 cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/sessions/${session.id}`)}
                    >
                      <td className="px-3 py-2">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeTo12Hour(session.sessionTime)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeTo12Hour(session.arrivalTime)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeTo12Hour(session.startTime)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span dir="ltr" className="inline-block font-mono">
                          {formatTimeTo12Hour(session.endTime)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1">
                            {session.patientName}
                            {clinicProfileSupportsWorkflow(
                              session.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
                              CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
                            ) &&
                              session.sessionsUntilReassessment === 0 &&
                              !session.isAssessment &&
                              !session.isReassessment && (
                                <span className="inline-flex items-center justify-center rounded-full border border-sky-300 bg-sky-100 text-sky-800 shadow-sm dark:border-sky-700 dark:bg-sky-900/70 dark:text-sky-50">
                                  <BellRing
                                    className="h-4 w-4 text-sky-500 dark:text-sky-400 flex-shrink-0"
                                    aria-hidden="true"
                                    title={t('patients.reassessmentDue', { defaultValue: 'Reassessment due' })}
                                  />
                                </span>
                              )}
                          </span>
                          {session.patientCode && (
                            <span className="text-xs text-muted-foreground">#{session.patientCode}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {getClinicProfileLabel(session.profile || CLINIC_PROFILES.PHYSIOTHERAPY, t)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{session.doctorName}</td>
                      <td className="px-3 py-2 text-xs uppercase text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>{session.status || '--'}</span>
                          {clinicProfileSupportsWorkflow(
                            session.profile || CLINIC_PROFILES.PHYSIOTHERAPY,
                            CLINIC_PROFILE_WORKFLOWS.ASSESSMENT_TRACKING,
                          ) &&
                            session.isAssessment && (
                              <span
                                className="inline-flex items-center justify-center rounded-full border border-purple-300 bg-purple-100 p-1 text-purple-800 shadow-sm dark:border-purple-700 dark:bg-purple-900/70 dark:text-purple-50"
                                title={t('sessions.isAssessment', { defaultValue: 'Assessment' })}
                              >
                                <Stethoscope className="h-4 w-4" aria-hidden="true" />
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('dashboard.noSessionsToday', { defaultValue: 'No visits scheduled for today.' })}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="col-span-1 border bg-muted/30">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              {t('dashboard.avgTimingTitle')}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-background p-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t('dashboard.avgWait')}
                </p>
                <p className="text-2xl font-bold">{averages.avgWaitMinutes ?? 0}m</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary"
                onClick={() => navigate('/daily-operations')}
              >
                {t('dashboard.viewFlow')}
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background p-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {t('dashboard.avgDuration')}
                </p>
                <p className="text-2xl font-bold">{averages.avgDurationMinutes ?? 0}m</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {t('dashboard.last30Days')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">{t('dashboard.sessionsSnapshot')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('dashboard.sessionsSnapshotHint')}</p>
            </div>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {['scheduled', 'in_progress', 'completed', 'cancelled'].map((key) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">
                  {t(`status.${key}`, { defaultValue: key.replace('_', ' ') })}
                </span>
                <span className="font-semibold">{sessionsByStatus[key] ?? 0}</span>
              </div>
            ))}
            <Button onClick={() => navigate('/sessions')} size="sm" className="w-full">
              {t('dashboard.viewSessions')}
            </Button>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.followUpsTitle')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('dashboard.followUpsHint')}</p>
            </div>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.noFollowUps')}</p>
            ) : (
              followUps.map((patient) => (
                <div
                  key={patient.patientId}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-semibold">{patient.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('dashboard.lastSeen')} {patient.lastSessionDate ? formatDate(patient.lastSessionDate, 'PP') : '--'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigate('/sessions', {
                        state: { initialPatientId: patient.patientId },
                      })
                    }
                  >
                    {t('dashboard.schedule')}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.upcomingTitle')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('dashboard.upcomingHint')}</p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.noUpcoming')}</p>
            ) : (
              upcomingSessions.map((session) => {
                const sessionProfile = session.profile || CLINIC_PROFILES.PHYSIOTHERAPY;

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{session.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {getClinicProfileLabel(sessionProfile, t)}
                        {session.doctorName ? ` - ${session.doctorName}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" dir="ltr">
                        {formatDate(session.sessionDate, 'MMM d')}
                      </p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {formatTimeTo12Hour(session.sessionTime)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate('/sessions')}>
              {t('dashboard.viewAllSessions')}
            </Button>
          </CardContent>
        </Card>

        <Card className="border bg-muted/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.alertsTitle')}</CardTitle>
              <p className="text-xs text-muted-foreground">{t('dashboard.alertsHint')}</p>
            </div>
            <BellRing className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-background p-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">{t('dashboard.cancellations')}</p>
                <p className="text-2xl font-bold text-destructive">{alerts.cancellationsLast7Days ?? 0}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  navigate('/sessions', {
                    state: {
                      initialFilters: {
                        status: 'cancelled',
                        fromDate: sevenDaysAgo,
                        toDate: todayIso,
                      },
                    },
                  })
                }
              >
                {t('dashboard.review')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
