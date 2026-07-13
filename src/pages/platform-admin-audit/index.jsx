import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  CreditCard,
  ExternalLink,
  Eye,
  FileSearch,
  RefreshCcw,
  Receipt,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { usePlatformAdminAuditEvents } from '@/hooks/usePlatformAdmin';
import { useUIStore } from '@/store/uiStore';
import { cn, formatDateTime as formatBusinessDateTime } from '@/lib/utils';
import { dateOnlyToUtcEndIso, dateOnlyToUtcStartIso } from '@/lib/time';

const areaIcons = {
  billing: Receipt,
  subscriptions: CreditCard,
  tenant_setup: Building2,
  governance: ShieldCheck,
};

const areaOptions = ['all', 'billing', 'subscriptions', 'tenant_setup', 'governance'];
const statusOptions = ['all', 'success', 'error'];
const limitOptions = [25, 50, 100];

export default function PlatformAdminAuditPage() {
  const { t } = useTranslation();
  const { platformAdminClinicId, setPlatformAdminClinicId } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('all');
  const [status, setStatus] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const branchIdParam = Number(searchParams.get('branchId') || 0);
  const branchId = Number.isFinite(branchIdParam) && branchIdParam > 0
    ? branchIdParam
    : null;

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      area,
      status,
      search: search.trim() || undefined,
      branchId: branchId ?? undefined,
      fromDate: fromDate ? dateOnlyToUtcStartIso(fromDate) : undefined,
      toDate: toDate ? dateOnlyToUtcEndIso(toDate) : undefined,
    }),
    [area, branchId, fromDate, limit, page, search, status, toDate],
  );

  const {
    data: auditData,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = usePlatformAdminAuditEvents(queryParams, {
    platformClinicId: platformAdminClinicId ?? null,
  });

  const events = auditData?.data || [];
  const meta = auditData?.meta || {};
  const totalPages = meta.totalPages || 1;
  const total = meta.total || 0;
  const hasFilters =
    search.trim().length > 0 ||
    area !== 'all' ||
    status !== 'all' ||
    limit !== 25 ||
    fromDate ||
    toDate ||
    branchId != null;
  const scopeLabel = platformAdminClinicId
    ? t('platformAdmin.scopedOverview', { defaultValue: 'Selected clinic scope' })
    : t('platformAdmin.allClinics', { defaultValue: 'All clinics' });

  useEffect(() => {
    setPage(1);
  }, [branchId]);

  const resetPage = (updater) => {
    setPage(1);
    updater();
  };

  const clearFilters = () => {
    setSearch('');
    setArea('all');
    setStatus('all');
    setFromDate('');
    setToDate('');
    setLimit(25);
    setPage(1);
    if (branchId != null) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete('branchId');
      setSearchParams(nextSearchParams, { replace: true });
    }
  };

  const handleOpenWorkbench = (event) => {
    const targetClinicId = Number(event?.target?.clinicId || 0);
    if (Number.isFinite(targetClinicId) && targetClinicId > 0) {
      setPlatformAdminClinicId(targetClinicId);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <FileSearch className="h-3.5 w-3.5 text-primary" />
            {t('platformAdmin.audit.badge', { defaultValue: 'Admin audit' })}
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">
            {t('platformAdmin.audit.title', { defaultValue: 'Audit trail' })}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t('platformAdmin.audit.description', {
              defaultValue:
                'Review platform billing, branch subscription, onboarding, and governance changes from the admin console.',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{scopeLabel}</Badge>
          {branchId != null && (
            <Badge variant="outline">
              {t('platformAdmin.audit.branchFilter', {
                id: branchId,
                defaultValue: 'Branch #{{id}}',
              })}
            </Badge>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label={t('platformAdmin.audit.refresh', {
              defaultValue: 'Refresh audit trail',
            })}
          >
            <RefreshCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <ImpactPanel
        tone="neutral"
        icon={FileSearch}
        title={t('platformAdmin.audit.scopeTitle', {
          defaultValue: 'Audit review scope',
        })}
        description={t('platformAdmin.audit.scopeDescription', {
          defaultValue:
            'Every listed event is tied back to its actor, target, reason, request, and workbench context.',
        })}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <ImpactMetric
            label={t('platformAdmin.adminScope', { defaultValue: 'Admin scope' })}
            value={scopeLabel}
          />
          <ImpactMetric
            label={t('platformAdmin.audit.eventsTitle', {
              defaultValue: 'Platform events',
            })}
            value={total.toLocaleString()}
          />
          <ImpactMetric
            label={t('platformAdmin.audit.filterState', {
              defaultValue: 'Filter state',
            })}
            value={
              hasFilters
                ? t('platformAdmin.audit.filtered', { defaultValue: 'Filtered' })
                : t('platformAdmin.audit.unfiltered', {
                    defaultValue: 'Unfiltered',
                  })
            }
          />
        </div>
      </ImpactPanel>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                {t('platformAdmin.audit.eventsTitle', {
                  defaultValue: 'Platform events',
                })}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('platformAdmin.audit.resultSummary', {
                  count: total.toLocaleString(),
                  defaultValue: '{{count}} recorded events',
                })}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_10rem_10rem_9rem_9rem_8rem_auto]">
              <div className="space-y-1">
                <Label htmlFor="platform-audit-search" className="text-xs">
                  {t('common.search')}
                </Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="platform-audit-search"
                    value={search}
                    onChange={(event) =>
                      resetPage(() => setSearch(event.target.value))
                    }
                    placeholder={t('platformAdmin.audit.searchPlaceholder', {
                      defaultValue: 'Search actor, branch, reason, URL...',
                    })}
                    className="h-9 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  {t('platformAdmin.audit.areaLabel', { defaultValue: 'Area' })}
                </Label>
                <Select
                  value={area}
                  onValueChange={(value) => resetPage(() => setArea(value))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {areaOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`platformAdmin.audit.areas.${option}`, {
                          defaultValue: option,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  {t('reports.columns.status', { defaultValue: 'Status' })}
                </Label>
                <Select
                  value={status}
                  onValueChange={(value) => resetPage(() => setStatus(value))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {t(`platformAdmin.audit.status.${option}`, {
                          defaultValue: option,
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">
                  {t('platformAdmin.audit.pageSize', {
                    defaultValue: 'Page size',
                  })}
                </Label>
                <Select
                  value={String(limit)}
                  onValueChange={(value) =>
                    resetPage(() => setLimit(Number(value)))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {limitOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="platform-audit-from-date" className="text-xs">
                  {t('platformAdmin.audit.fromDate', {
                    defaultValue: 'From date',
                  })}
                </Label>
                <Input
                  id="platform-audit-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) =>
                    resetPage(() => setFromDate(event.target.value))
                  }
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="platform-audit-to-date" className="text-xs">
                  {t('platformAdmin.audit.toDate', {
                    defaultValue: 'To date',
                  })}
                </Label>
                <Input
                  id="platform-audit-to-date"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) =>
                    resetPage(() => setToDate(event.target.value))
                  }
                  className="h-9"
                />
              </div>

              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-auto h-9"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4" />
                  {t('common.clear')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isError ? (
            <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {t('platformAdmin.audit.loadError', {
                defaultValue: 'Could not load platform audit events.',
              })}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-16 text-center text-muted-foreground">
              <FileSearch className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">
                {t('platformAdmin.audit.empty', {
                  defaultValue: 'No platform audit events match these filters.',
                })}
              </p>
              {hasFilters && (
                <Button variant="link" onClick={clearFilters}>
                  {t('common.clearFilters')}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 lg:hidden">
                {events.map((event) => (
                  <AuditEventCard
                    key={event.id}
                    event={event}
                    onInspect={() => setSelectedEvent(event)}
                    onOpenWorkbench={() => handleOpenWorkbench(event)}
                    t={t}
                  />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-md border lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-muted/50">
                      <tr className="border-b text-left text-xs font-semibold uppercase text-muted-foreground">
                        <th className="px-4 py-3">
                          {t('reports.columns.time')}
                        </th>
                        <th className="px-4 py-3">
                          {t('platformAdmin.audit.columns.area', {
                            defaultValue: 'Area',
                          })}
                        </th>
                        <th className="px-4 py-3">
                          {t('reports.columns.action')}
                        </th>
                        <th className="px-4 py-3">
                          {t('reports.columns.target', {
                            defaultValue: 'Target',
                          })}
                        </th>
                        <th className="px-4 py-3">
                          {t('platformAdmin.audit.columns.actor', {
                            defaultValue: 'Actor',
                          })}
                        </th>
                        <th className="px-4 py-3">
                          {t('platformAdmin.audit.columns.reason', {
                            defaultValue: 'Reason',
                          })}
                        </th>
                        <th className="px-4 py-3">
                          {t('reports.columns.status')}
                        </th>
                        <th className="px-4 py-3 text-right">
                          {t('common.actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {events.map((event) => (
                        <AuditEventRow
                          key={event.id}
                          event={event}
                          onInspect={() => setSelectedEvent(event)}
                          onOpenWorkbench={() => handleOpenWorkbench(event)}
                          t={t}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {t('common.paginationSummary', {
                    from: events.length ? (page - 1) * limit + 1 : 0,
                    to: (page - 1) * limit + events.length,
                    total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    {t('common.previous')}
                  </Button>
                  <span className="min-w-16 text-center">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AuditEventDetailsDialog
        event={selectedEvent}
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        t={t}
      />
    </div>
  );
}

function AuditEventRow({ event, onInspect, onOpenWorkbench, t }) {
  const AreaIcon = areaIcons[event.area] || FileSearch;
  const actionLabel = t(`platformAdmin.audit.actionLabels.${event.actionKey}`, {
    defaultValue: event.actionLabel || event.actionKey,
  });

  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
        {formatDateTime(event.createdAt)}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="gap-1.5">
          <AreaIcon className="h-3.5 w-3.5" />
          {t(`platformAdmin.audit.areas.${event.area}`, {
            defaultValue: event.area,
          })}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium">{actionLabel}</div>
        <div className="mt-0.5 font-mono text-xs text-muted-foreground">
          {event.requestMethod || '--'} {event.requestUrl || ''}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="max-w-[15rem] truncate font-medium" title={formatTarget(event)}>
          {formatTarget(event)}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium">{event.actor?.name || '--'}</div>
        <div className="max-w-[12rem] truncate text-xs text-muted-foreground">
          {event.actor?.email || ''}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="line-clamp-2 max-w-[15rem] text-muted-foreground">
          {event.reason || '--'}
        </span>
      </td>
      <td className="px-4 py-3">
        <Badge
          variant={event.status === 'error' ? 'destructive' : 'secondary'}
          className="capitalize"
        >
          {t(`platformAdmin.audit.status.${event.status}`, {
            defaultValue: event.status || '--',
          })}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onInspect}
            aria-label={t('platformAdmin.audit.inspect', {
              defaultValue: 'Inspect event',
            })}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link
              to={event.workbenchHref || '/platform-admin'}
              onClick={onOpenWorkbench}
              aria-label={t('platformAdmin.audit.openWorkbench', {
                defaultValue: 'Open workbench',
              })}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AuditEventCard({ event, onInspect, onOpenWorkbench, t }) {
  const AreaIcon = areaIcons[event.area] || FileSearch;
  const actionLabel = t(`platformAdmin.audit.actionLabels.${event.actionKey}`, {
    defaultValue: event.actionLabel || event.actionKey,
  });

  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge variant="outline" className="gap-1.5">
            <AreaIcon className="h-3.5 w-3.5" />
            {t(`platformAdmin.audit.areas.${event.area}`, {
              defaultValue: event.area,
            })}
          </Badge>
          <p className="mt-2 font-semibold">{actionLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(event.createdAt)}
          </p>
        </div>
        <Badge
          variant={event.status === 'error' ? 'destructive' : 'secondary'}
          className="shrink-0 capitalize"
        >
          {t(`platformAdmin.audit.status.${event.status}`, {
            defaultValue: event.status || '--',
          })}
        </Badge>
      </div>

      <div className="mt-3 grid gap-3">
        <DetailItem
          label={t('reports.columns.target', { defaultValue: 'Target' })}
          value={formatTarget(event)}
        />
        <DetailItem
          label={t('platformAdmin.audit.columns.actor', {
            defaultValue: 'Actor',
          })}
          value={event.actor?.name || '--'}
          helper={event.actor?.email}
        />
        <DetailBlock
          label={t('platformAdmin.audit.columns.reason', {
            defaultValue: 'Reason',
          })}
          value={event.reason || '--'}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onInspect}
        >
          <Eye className="h-4 w-4" />
          {t('platformAdmin.audit.inspect', {
            defaultValue: 'Inspect event',
          })}
        </Button>
        <Button asChild size="sm" className="flex-1">
          <Link
            to={event.workbenchHref || '/platform-admin'}
            onClick={onOpenWorkbench}
          >
            <ExternalLink className="h-4 w-4" />
            {t('platformAdmin.audit.openWorkbench', {
              defaultValue: 'Open workbench',
            })}
          </Link>
        </Button>
      </div>
    </div>
  );
}

function AuditEventDetailsDialog({ event, open, onOpenChange, t }) {
  if (!event) {
    return null;
  }

  const actionLabel = t(`platformAdmin.audit.actionLabels.${event.actionKey}`, {
    defaultValue: event.actionLabel || event.actionKey,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSearch className="h-4 w-4 text-muted-foreground" />
            {t('platformAdmin.audit.detailTitle', {
              defaultValue: 'Audit event',
            })}{' '}
            #{event.id}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem
              label={t('reports.columns.time')}
              value={formatDateTime(event.createdAt)}
            />
            <DetailItem
              label={t('reports.columns.action')}
              value={actionLabel}
            />
            <DetailItem
              label={t('platformAdmin.audit.columns.area', {
                defaultValue: 'Area',
              })}
              value={t(`platformAdmin.audit.areas.${event.area}`, {
                defaultValue: event.area,
              })}
            />
            <DetailItem
              label={t('reports.columns.status')}
              value={t(`platformAdmin.audit.status.${event.status}`, {
                defaultValue: event.status || '--',
              })}
            />
            <DetailItem
              label={t('platformAdmin.audit.columns.actor', {
                defaultValue: 'Actor',
              })}
              value={event.actor?.name || '--'}
              helper={event.actor?.email}
            />
            <DetailItem
              label={t('reports.columns.target', { defaultValue: 'Target' })}
              value={formatTarget(event)}
            />
          </div>

          <div className="mt-5 space-y-4">
            <DetailBlock
              label={t('platformAdmin.audit.columns.reason', {
                defaultValue: 'Reason',
              })}
              value={event.reason || '--'}
            />
            <DetailBlock
              label={t('reports.columns.description', {
                defaultValue: 'Description',
              })}
              value={event.description || '--'}
            />
            <DetailBlock
              label={t('platformAdmin.audit.request', {
                defaultValue: 'Request',
              })}
              value={`${event.requestMethod || '--'} ${event.requestUrl || ''}`}
              mono
            />
            {event.errorMessage && (
              <DetailBlock
                label={t('reports.columns.errorMessage', {
                  defaultValue: 'Error message',
                })}
                value={event.errorMessage}
                destructive
              />
            )}
            <JsonBlock
              label={t('reports.columns.payload', {
                defaultValue: 'Request payload',
              })}
              value={event.payload}
            />
            <JsonBlock
              label={t('reports.columns.changes', {
                defaultValue: 'Changes/Response data',
              })}
              value={event.changes}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value, helper }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value || '--'}</p>
      {helper && <p className="mt-0.5 truncate text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function DetailBlock({ label, value, mono = false, destructive = false }) {
  return (
    <div>
      <p
        className={cn(
          'mb-1 text-xs font-medium text-muted-foreground',
          destructive && 'text-destructive',
        )}
      >
        {label}
      </p>
      <div
        className={cn(
          'rounded-md border bg-muted/30 p-3 text-sm',
          mono && 'font-mono text-xs',
          destructive && 'border-destructive/30 bg-destructive/5 text-destructive',
        )}
      >
        {value || '--'}
      </div>
    </div>
  );
}

function JsonBlock({ label, value }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-xs">
        {value ? JSON.stringify(value, null, 2) : 'None'}
      </pre>
    </div>
  );
}

function formatTarget(event) {
  const clinicName = event.target?.clinicName;
  const branchName = event.target?.branchName;

  if (clinicName && branchName) return `${clinicName} / ${branchName}`;
  if (branchName) return branchName;
  if (clinicName) return clinicName;

  return '--';
}

function formatDateTime(value) {
  if (!value) return '--';

  return formatBusinessDateTime(value, 'MMM d, yyyy, p') || '--';
}
