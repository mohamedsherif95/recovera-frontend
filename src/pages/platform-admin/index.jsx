import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
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
import { usePermissions } from '@/hooks/usePermissions';
import { usePlatformAdminOverview } from '@/hooks/usePlatformAdmin';
import { useUIStore } from '@/store/uiStore';
import { PERMISSIONS } from '@/lib/constants';

const modules = [
  {
    title: 'Clinics',
    description: 'Create clinic groups and provision their first admin users.',
    href: '/platform-admin/clinics',
    icon: Building2,
    permission: PERMISSIONS['clinics:viewAll'],
  },
  {
    title: 'Branches',
    description: 'Review branch setup and cross-branch reconciliation queues.',
    href: '/platform-admin/branches',
    icon: Workflow,
    permission: PERMISSIONS['branches:view'],
    requiresScope: true,
  },
  {
    title: 'Users',
    description: 'Provision managers and branch staff from the admin console.',
    href: '/platform-admin/users',
    icon: Users,
    permission: PERMISSIONS['users:viewAll'],
    requiresScope: true,
  },
  {
    title: 'Governance',
    description: 'Audit role permissions and manage platform admin access.',
    href: '/platform-admin/governance',
    icon: ShieldCheck,
    permission: PERMISSIONS['users:manageRoles'],
  },
  {
    title: 'Branch subscriptions',
    description: 'Control branch access, enabled clinic profiles, and pricing terms.',
    href: '/platform-admin/branch-subscriptions',
    icon: CreditCard,
    permission: PERMISSIONS['branchSubscriptions:view'],
    requiresScope: true,
  },
  {
    title: 'Platform billing',
    description: 'Generate branch invoices, download artifacts, and record collections.',
    href: '/platform-admin/billing',
    icon: Receipt,
    permission: PERMISSIONS['platformBilling:view'],
    requiresScope: true,
  },
];

export default function PlatformAdminPage() {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const { platformAdminClinicId } = useUIStore();
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
  const metricCards = [
    {
      title: 'Clinic groups',
      value: formatNumber(metrics.totalClinics),
      helper: `${formatNumber(metrics.activeClinics)} active`,
      icon: Building2,
      href: '/platform-admin/clinics',
    },
    {
      title: 'Branches',
      value: formatNumber(metrics.totalBranches),
      helper: `${formatNumber(metrics.activeBranches)} active`,
      icon: Workflow,
      href: '/platform-admin/branches',
    },
    {
      title: 'Ready to invoice',
      value: formatNumber(metrics.branchesReadyToInvoice),
      helper: overview?.billingMonth
        ? `Billing month ${formatMonth(overview.billingMonth)}`
        : 'Current billing month',
      icon: CheckCircle2,
      href: '/platform-admin/billing',
    },
    {
      title: 'Outstanding balance',
      value: formatMoney(metrics.outstandingBalance),
      helper: `${formatNumber(metrics.openInvoices)} open invoices`,
      icon: Banknote,
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
            Platform operations
          </h3>
          <p className="text-sm text-muted-foreground">
            {overview?.generatedAt
              ? `Updated ${formatDateTime(overview.generatedAt)}`
              : 'Live branch access, pricing, and billing status.'}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh platform overview"
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isError ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Could not load the platform overview.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
                          {isLoading ? 'Loading' : metric.helper}
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
              title="Branches needing pricing"
              icon={AlertTriangle}
              items={workQueues.missingPricingBranches}
              empty="All active branches have usable pricing."
              href="/platform-admin/branch-subscriptions"
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
              title="Suspended branches"
              icon={Clock3}
              items={workQueues.suspendedBranches}
              empty="No branches are currently read-only."
              href="/platform-admin/branch-subscriptions"
              renderItem={(item) => (
                <>
                  <div>
                    <p className="font-medium">{item.branchName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.clinicName}
                    </p>
                  </div>
                  <Badge variant="secondary">Read-only</Badge>
                </>
              )}
            />

            <WorkQueueCard
              title="Open invoices"
              icon={Receipt}
              items={workQueues.openInvoices}
              empty="No issued invoices have an outstanding balance."
              href="/platform-admin/billing"
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent collections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(workQueues.recentCollections || []).length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    No collections recorded yet.
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
                <CardTitle className="text-base">Billing posture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Missing pricing</span>
                  <span className="font-semibold">
                    {formatNumber(metrics.branchesMissingPricing)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Partially paid</span>
                  <span className="font-semibold">
                    {formatNumber(metrics.partiallyPaidInvoices)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Collected total</span>
                  <span className="font-semibold">
                    {formatMoney(metrics.totalCollected)}
                  </span>
                </div>
                <Button asChild size="sm" className="mt-2 w-full">
                  <Link to="/platform-admin/billing">
                    Open billing
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
                  <CardTitle className="text-base">{module.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{module.description}</p>
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

function WorkQueueCard({ title, icon: Icon, items = [], empty, href, renderItem }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <div
              key={`${title}-${item.branchId ?? item.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
            >
              {renderItem(item)}
            </div>
          ))
        )}
        <Button asChild variant="outline" size="sm" className="mt-2 w-full">
          <Link to={href}>
            Review
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
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
