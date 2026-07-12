import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  FileWarning,
  FileSearch,
  History,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  Users,
  Workflow,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { usePermissions } from '@/hooks/usePermissions';
import { usePlatformAdminOverview } from '@/hooks/usePlatformAdmin';
import { useUIStore } from '@/store/uiStore';
import { PERMISSIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const modules = [
  {
    titleKey: 'platformAdmin.modules.onboarding.title',
    titleDefault: 'Branch onboarding',
    descriptionKey: 'platformAdmin.modules.onboarding.description',
    descriptionDefault:
      'Launch a company, subscribed branch, manager account, profiles, and first pricing terms in one workflow.',
    href: '/platform-admin/onboarding',
    icon: ClipboardCheck,
    permission: PERMISSIONS['clinics:create'],
  },
  {
    titleKey: 'platformAdmin.modules.clinics.title',
    titleDefault: 'Clinics',
    descriptionKey: 'platformAdmin.modules.clinics.description',
    descriptionDefault: 'Create clinic groups and provision their first manager users.',
    href: '/platform-admin/clinics',
    icon: Building2,
    permission: PERMISSIONS['clinics:viewAll'],
  },
  {
    titleKey: 'platformAdmin.modules.branches.title',
    titleDefault: 'Branches',
    descriptionKey: 'platformAdmin.modules.branches.description',
    descriptionDefault: 'Review branch setup and cross-branch reconciliation queues.',
    href: '/platform-admin/branches',
    icon: Workflow,
    permission: PERMISSIONS['branches:view'],
    requiresScope: true,
  },
  {
    titleKey: 'platformAdmin.modules.users.title',
    titleDefault: 'Users',
    descriptionKey: 'platformAdmin.modules.users.description',
    descriptionDefault: 'Provision managers and branch staff from the admin console.',
    href: '/platform-admin/users',
    icon: Users,
    permission: PERMISSIONS['users:viewAll'],
    requiresScope: true,
  },
  {
    titleKey: 'platformAdmin.modules.governance.title',
    titleDefault: 'Governance',
    descriptionKey: 'platformAdmin.modules.governance.description',
    descriptionDefault: 'Audit role permissions and manage platform admin access.',
    href: '/platform-admin/governance',
    icon: ShieldCheck,
    permission: PERMISSIONS['users:manageRoles'],
  },
  {
    titleKey: 'platformAdmin.modules.audit.title',
    titleDefault: 'Audit trail',
    descriptionKey: 'platformAdmin.modules.audit.description',
    descriptionDefault:
      'Review platform billing, subscription, onboarding, and governance changes.',
    href: '/platform-admin/audit',
    icon: FileSearch,
    permission: PERMISSIONS['users:manageRoles'],
  },
  {
    titleKey: 'platformAdmin.modules.branchSubscriptions.title',
    titleDefault: 'Branch subscriptions',
    descriptionKey: 'platformAdmin.modules.branchSubscriptions.description',
    descriptionDefault: 'Control branch access, enabled clinic profiles, and pricing terms.',
    href: '/platform-admin/branch-subscriptions',
    icon: CreditCard,
    permission: PERMISSIONS['branchSubscriptions:view'],
    requiresScope: true,
  },
  {
    titleKey: 'platformAdmin.modules.platformBilling.title',
    titleDefault: 'Platform billing',
    descriptionKey: 'platformAdmin.modules.platformBilling.description',
    descriptionDefault: 'Generate branch invoices, download artifacts, and record collections.',
    href: '/platform-admin/billing',
    icon: Receipt,
    permission: PERMISSIONS['platformBilling:view'],
    requiresScope: true,
  },
];

export default function PlatformAdminPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { platformAdminClinicId, setPlatformAdminClinicId } = useUIStore();
  const {
    data: overview,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = usePlatformAdminOverview({
    platformClinicId: platformAdminClinicId ?? null,
  });
  const visibleModules = modules.filter((module) => can(module.permission));
  const metrics = overview?.metrics || {};
  const workQueues = overview?.workQueues || {};
  const scopeLabel = platformAdminClinicId
    ? t('platformAdmin.scopedOverview', { defaultValue: 'Selected clinic scope' })
    : t('platformAdmin.allClinics', { defaultValue: 'All clinics' });
  const handleQueueItemOpen = (item) => {
    const targetClinicId = Number(item?.clinicId || 0);
    if (Number.isFinite(targetClinicId) && targetClinicId > 0) {
      setPlatformAdminClinicId(targetClinicId);
    }
  };
  const metricCards = [
    {
      title: t('platformAdmin.metrics.clinicGroups', {
        defaultValue: 'Clinic groups',
      }),
      value: formatNumber(metrics.totalClinics),
      helper: t('platformAdmin.metrics.activeCount', {
        count: formatNumber(metrics.activeClinics),
        defaultValue: '{{count}} active',
      }),
      icon: Building2,
      href: '/platform-admin/clinics',
    },
    {
      title: t('platformAdmin.metrics.branches', { defaultValue: 'Branches' }),
      value: formatNumber(metrics.totalBranches),
      helper: t('platformAdmin.metrics.activeCount', {
        count: formatNumber(metrics.activeBranches),
        defaultValue: '{{count}} active',
      }),
      icon: Workflow,
      href: '/platform-admin/branches',
    },
    {
      title: t('platformAdmin.metrics.readyToInvoice', {
        defaultValue: 'Ready to invoice',
      }),
      value: formatNumber(metrics.branchesReadyToInvoice),
      helper: t('platformAdmin.metrics.readyAcrossMonths', {
        current: formatNumber(metrics.branchesReadyToInvoiceCurrent),
        previous: formatNumber(metrics.branchesReadyToInvoicePrevious),
        defaultValue: '{{current}} current / {{previous}} previous',
      }),
      icon: CheckCircle2,
      href: '/platform-admin/billing',
    },
    {
      title: t('platformAdmin.metrics.suspendedBranches', {
        defaultValue: 'Suspended branches',
      }),
      value: formatNumber(metrics.suspendedBranches),
      helper: t('platformAdmin.metrics.readOnlyBranches', {
        defaultValue: 'Read-only access blocks',
      }),
      icon: Clock3,
      href: '/platform-admin/branch-subscriptions',
    },
    {
      title: t('platformAdmin.metrics.outstandingBalance', {
        defaultValue: 'Outstanding balance',
      }),
      value: formatMoney(metrics.outstandingBalance),
      helper: t('platformAdmin.metrics.openInvoices', {
        count: formatNumber(metrics.openInvoices),
        defaultValue: '{{count}} open invoices',
      }),
      icon: Banknote,
      href: '/platform-admin/billing',
    },
    {
      title: t('platformAdmin.metrics.overdueInvoices', {
        defaultValue: 'Overdue invoices',
      }),
      value: formatNumber(metrics.overdueInvoices),
      helper: t('platformAdmin.metrics.overdueBalance', {
        amount: formatMoney(metrics.overdueBalance),
        defaultValue: '{{amount}} overdue',
      }),
      icon: FileWarning,
      href: '/platform-admin/billing',
    },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            {t('platformAdmin.modeLabel', { defaultValue: 'Platform mode' })}
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">
            {t('platformAdmin.overviewTitle', {
              defaultValue: 'Platform admin console',
            })}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t('platformAdmin.overviewDescription', {
              defaultValue:
                'Use this area for tenant setup, branch subscriptions, and billing operations without entering a clinic workspace.',
            })}
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {scopeLabel}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-normal">
            {t('platformAdmin.operations.title', {
              defaultValue: 'Platform operations',
            })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {overview?.generatedAt
              ? t('platformAdmin.operations.updatedAt', {
                  value: formatDateTime(overview.generatedAt),
                  defaultValue: 'Updated {{value}}',
                })
              : t('platformAdmin.operations.description', {
                  defaultValue: 'Live branch access, pricing, and billing status.',
                })}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label={t('platformAdmin.operations.refresh', {
            defaultValue: 'Refresh platform overview',
          })}
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('platformAdmin.operations.loadError', {
              defaultValue: 'Could not load the platform overview.',
            })}
          </CardContent>
        </Card>
      ) : (
        <>
          <ImpactPanel
            tone={
              Number(metrics.overdueInvoices || 0) > 0 ||
              Number(metrics.branchesMissingPricing || 0) > 0
                ? 'warning'
                : 'neutral'
            }
            icon={Activity}
            title={t('platformAdmin.operations.priorityTitle', {
              defaultValue: 'Operating priorities',
            })}
            description={t('platformAdmin.operations.priorityDescription', {
              defaultValue:
                'Start with billing blockers, access blocks, and overdue invoices before routine setup review.',
            })}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ImpactMetric
                label={t('platformAdmin.metrics.readyToInvoice', {
                  defaultValue: 'Ready to invoice',
                })}
                value={formatNumber(metrics.branchesReadyToInvoice)}
              />
              <ImpactMetric
                label={t('platformAdmin.billingPosture.missingPricing', {
                  defaultValue: 'Missing pricing',
                })}
                value={formatNumber(metrics.branchesMissingPricing)}
              />
              <ImpactMetric
                label={t('platformAdmin.metrics.suspendedBranches', {
                  defaultValue: 'Suspended branches',
                })}
                value={formatNumber(metrics.suspendedBranches)}
              />
              <ImpactMetric
                label={t('platformAdmin.metrics.overdueInvoices', {
                  defaultValue: 'Overdue invoices',
                })}
                value={formatNumber(metrics.overdueInvoices)}
              />
            </div>
          </ImpactPanel>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <Link key={metric.title} to={metric.href} className="block">
                  <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/30">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase text-muted-foreground">
                          {metric.title}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tracking-normal">
                          {isLoading ? '--' : metric.value}
                        </p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {isLoading ? t('common.loading') : metric.helper}
                        </p>
                      </div>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <WorkQueueCard
              title={t('platformAdmin.queues.readyInvoiceBranches.title', {
                defaultValue: 'Ready to invoice',
              })}
              icon={CheckCircle2}
              items={workQueues.readyInvoiceBranches}
              empty={t('platformAdmin.queues.readyInvoiceBranches.empty', {
                defaultValue: 'No current or previous branch-month is ready.',
              })}
              href="/platform-admin/billing"
              reviewLabel={t('platformAdmin.queues.openBilling', {
                defaultValue: 'Open billing',
              })}
              tone="commercial"
              onOpenItem={handleQueueItemOpen}
              renderItem={(item) => (
                <>
                  <div>
                    <p className="font-medium">{item.branchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.clinicName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatMonth(item.billingMonth)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.packageName ||
                        t('platformAdmin.queues.flexiblePlan', {
                          defaultValue: 'Flexible plan',
                        })}
                    </p>
                  </div>
                </>
              )}
            />

            <WorkQueueCard
              title={t('platformAdmin.queues.missingPricingBranches.title', {
                defaultValue: 'Branches needing pricing',
              })}
              icon={AlertTriangle}
              items={workQueues.missingPricingBranches}
              empty={t('platformAdmin.queues.missingPricingBranches.empty', {
                defaultValue: 'All active branches have usable pricing.',
              })}
              href="/platform-admin/branch-subscriptions"
              reviewLabel={t('platformAdmin.queues.review', {
                defaultValue: 'Review',
              })}
              tone="warning"
              onOpenItem={handleQueueItemOpen}
              renderItem={(item) => (
                <>
                  <div>
                    <p className="font-medium">{item.branchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.clinicName}
                    </p>
                  </div>
                  <Badge variant="outline" className="max-w-[12rem] truncate">
                    {item.reason}
                  </Badge>
                </>
              )}
            />

            <WorkQueueCard
              title={t('platformAdmin.queues.overdueInvoices.title', {
                defaultValue: 'Overdue invoices',
              })}
              icon={FileWarning}
              items={workQueues.overdueInvoices}
              empty={t('platformAdmin.queues.overdueInvoices.empty', {
                defaultValue: 'No older open invoices need attention.',
              })}
              href="/platform-admin/billing"
              reviewLabel={t('platformAdmin.queues.openBilling', {
                defaultValue: 'Open billing',
              })}
              tone="danger"
              onOpenItem={handleQueueItemOpen}
              renderItem={(item) => (
                <>
                  <div>
                    <p className="font-medium">{item.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.clinicName} / {item.branchName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(item.balanceAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMonth(item.billingMonth)}
                    </p>
                  </div>
                </>
              )}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <WorkQueueCard
              title={t('platformAdmin.queues.suspendedBranches.title', {
                defaultValue: 'Suspended branches',
              })}
              icon={Clock3}
              items={workQueues.suspendedBranches}
              empty={t('platformAdmin.queues.suspendedBranches.empty', {
                defaultValue: 'No branches are currently read-only.',
              })}
              href="/platform-admin/branch-subscriptions"
              reviewLabel={t('platformAdmin.queues.review', {
                defaultValue: 'Review',
              })}
              tone="danger"
              onOpenItem={handleQueueItemOpen}
              renderItem={(item) => (
                <>
                  <div>
                    <p className="font-medium">{item.branchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.clinicName}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {t('platformAdmin.queues.readOnly', {
                      defaultValue: 'Read-only',
                    })}
                  </Badge>
                </>
              )}
            />

            <WorkQueueCard
              title={t('platformAdmin.queues.openInvoices.title', {
                defaultValue: 'Open invoices',
              })}
              icon={Receipt}
              items={workQueues.openInvoices}
              empty={t('platformAdmin.queues.openInvoices.empty', {
                defaultValue: 'No issued invoices have an outstanding balance.',
              })}
              href="/platform-admin/billing"
              reviewLabel={t('platformAdmin.queues.review', {
                defaultValue: 'Review',
              })}
              tone="commercial"
              onOpenItem={handleQueueItemOpen}
              renderItem={(item) => (
                <>
                  <div>
                    <p className="font-medium">{item.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.clinicName} / {item.branchName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(item.balanceAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMonth(item.billingMonth)}
                    </p>
                  </div>
                </>
              )}
            />

            <WorkQueueCard
              title={t('platformAdmin.queues.recentHighImpactActions.title', {
                defaultValue: 'Recent high-impact changes',
              })}
              icon={Activity}
              items={workQueues.recentHighImpactActions}
              empty={t('platformAdmin.queues.recentHighImpactActions.empty', {
                defaultValue: 'No platform admin changes recorded yet.',
              })}
              href="/platform-admin/audit"
              getItemHref={(item) =>
                buildScopedWorkbenchHref(
                  item.workbenchHref || '/platform-admin/audit',
                  item,
                )
              }
              reviewLabel={t('platformAdmin.queues.openAudit', {
                defaultValue: 'Open audit',
              })}
              tone="warning"
              onOpenItem={handleQueueItemOpen}
              renderItem={(item) => (
                <>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.actionLabel}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.branchName || item.clinicName || item.actorName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold">{item.actorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </>
              )}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-muted-foreground" />
                    {t('platformAdmin.collections.recent', {
                      defaultValue: 'Recent collections',
                    })}
                  </CardTitle>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/platform-admin/billing">
                      {t('platformAdmin.queues.openBilling', {
                        defaultValue: 'Open billing',
                      })}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(workQueues.recentCollections || []).length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    {t('platformAdmin.collections.empty', {
                      defaultValue: 'No collections recorded yet.',
                    })}
                  </p>
                ) : (
                  workQueues.recentCollections.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.invoiceNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {item.clinicName} / {item.branchName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatMoney(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(item.collectedAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t('platformAdmin.billingPosture.title', {
                    defaultValue: 'Billing posture',
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t('platformAdmin.billingPosture.missingPricing', {
                      defaultValue: 'Missing pricing',
                    })}
                  </span>
                  <span className="font-semibold">
                    {formatNumber(metrics.branchesMissingPricing)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t('platformAdmin.billingPosture.partiallyPaid', {
                      defaultValue: 'Partially paid',
                    })}
                  </span>
                  <span className="font-semibold">
                    {formatNumber(metrics.partiallyPaidInvoices)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t('platformAdmin.billingPosture.overdueInvoices', {
                      defaultValue: 'Overdue invoices',
                    })}
                  </span>
                  <span className="font-semibold">
                    {formatNumber(metrics.overdueInvoices)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t('platformAdmin.billingPosture.collectedTotal', {
                      defaultValue: 'Collected total',
                    })}
                  </span>
                  <span className="font-semibold">
                    {formatMoney(metrics.totalCollected)}
                  </span>
                </div>
                <Button asChild size="sm" className="mt-2 w-full">
                  <Link to="/platform-admin/billing">
                    {t('platformAdmin.billingPosture.openBilling', {
                      defaultValue: 'Open billing',
                    })}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleModules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} to={module.href} className="block">
              <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/40">
                <CardHeader className="space-y-3 pb-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-base">
                    {t(module.titleKey, { defaultValue: module.titleDefault })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    {t(module.descriptionKey, {
                      defaultValue: module.descriptionDefault,
                    })}
                  </p>
                  {module.requiresScope && (
                    <Badge variant="outline" className="text-[11px]">
                      {t('platformAdmin.scopeRequired', {
                        defaultValue: 'Uses admin scope',
                      })}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WorkQueueCard({
  title,
  icon: Icon,
  items = [],
  empty,
  href,
  getItemHref,
  reviewLabel = 'Review',
  onOpenItem,
  renderItem,
  tone = 'neutral',
}) {
  const toneClasses = {
    neutral: '',
    commercial: 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/10',
    warning: 'border-amber-200/80 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/15',
    danger: 'border-destructive/30 bg-destructive/[0.04]',
  };

  return (
    <Card className={cn(toneClasses[tone])}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Icon
          className={cn(
            'h-4 w-4',
            tone === 'danger'
              ? 'text-destructive'
              : tone === 'warning'
                ? 'text-amber-700 dark:text-amber-300'
                : tone === 'commercial'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-muted-foreground',
          )}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <Link
              key={`${title}-${item.id ?? item.branchId}-${item.billingMonth ?? item.createdAt ?? ''}`}
              to={getItemHref ? getItemHref(item) : buildScopedWorkbenchHref(href, item)}
              onClick={() => onOpenItem?.(item)}
              className="flex min-h-14 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              {renderItem(item)}
            </Link>
          ))
        )}
        <Button asChild variant="outline" size="sm" className="mt-2 w-full">
          <Link to={href}>
            {reviewLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function buildScopedWorkbenchHref(href, item = {}) {
  const [path, query = ''] = String(href || '/platform-admin').split('?');
  const params = new URLSearchParams(query);

  if (item.branchId) {
    params.set('branchId', String(item.branchId));
  }

  if (path === '/platform-admin/billing' && item.billingMonth) {
    params.set('month', toMonthInputValue(item.billingMonth));
  }

  const serializedParams = params.toString();
  return serializedParams ? `${path}?${serializedParams}` : path;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
}

function formatMonth(value) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

function toMonthInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 7);
}

function formatDate(value) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '--';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
