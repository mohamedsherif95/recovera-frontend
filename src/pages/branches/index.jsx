import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CreditCard,
  FileSearch,
  Layers3,
  Loader2,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBranches,
  useBranchCredits,
  useCreateBranch,
  useUpdateBranch,
  useReconcileBranchCredit,
} from '@/hooks/useBranches';
import { usePermissions } from '@/hooks/usePermissions';
import {
  BRANCH_SUBSCRIPTION_ACCESS_STATUS,
  PERMISSIONS,
} from '@/lib/constants';
import { getClinicProfileLabel } from '@/lib/clinicProfiles';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { resolveEffectiveClinicId } from '@/lib/branchScope';
import { formatCurrency } from '@/lib/utils';

const emptyBranchForm = {
  name: '',
  isActive: 'true',
  changeReason: '',
};

export default function BranchesPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { can } = usePermissions();
  const { user } = useAuthStore();
  const { clinicOverrideId, platformAdminClinicId } = useUIStore();
  const canViewBranches = can(PERMISSIONS['branches:view']);
  const canCreateBranches = can(PERMISSIONS['branches:create']);
  const canUpdateBranches = can(PERMISSIONS['branches:update']);
  const canViewCredits = can(PERMISSIONS['branchCredits:view']);
  const canReconcileCredits = can(PERMISSIONS['branchCredits:reconcile']);
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);
  const isPlatformAdminRoute = location.pathname.startsWith('/platform-admin');
  const effectiveClinicId = isPlatformAdminRoute
    ? platformAdminClinicId
    : resolveEffectiveClinicId(user, clinicOverrideId);
  const needsClinicSelection = Boolean(isPlatformAdmin && !effectiveClinicId);
  const platformScopeOptions =
    isPlatformAdminRoute && effectiveClinicId
      ? { platformClinicId: effectiveClinicId }
      : {};

  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchForm, setBranchForm] = useState(emptyBranchForm);
  const [creditsPage, setCreditsPage] = useState(1);
  const [creditStatus, setCreditStatus] = useState('all');
  const [creditFromBranchId, setCreditFromBranchId] = useState('all');
  const [creditToBranchId, setCreditToBranchId] = useState('all');
  const [branchSearch, setBranchSearch] = useState('');
  const [branchOperatingStatus, setBranchOperatingStatus] = useState('all');
  const [branchAccessStatus, setBranchAccessStatus] = useState('all');

  const {
    data: branchesData,
    isLoading: isBranchesLoading,
    isError: isBranchesError,
    refetch: refetchBranches,
    isFetching: isBranchesFetching,
  } = useBranches({
    enabled: Boolean(canViewBranches && !needsClinicSelection),
    ...platformScopeOptions,
  });
  const {
    data: branchCreditsData,
    isLoading: isCreditsLoading,
    refetch: refetchCredits,
    isFetching: isCreditsFetching,
  } = useBranchCredits(
    {
      page: creditsPage,
      limit: 10,
      status: creditStatus === 'all' ? undefined : creditStatus,
      fromBranchId:
        creditFromBranchId === 'all' ? undefined : Number(creditFromBranchId),
      toBranchId: creditToBranchId === 'all' ? undefined : Number(creditToBranchId),
    },
    Boolean(canViewCredits && !needsClinicSelection),
    platformScopeOptions,
  );

  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const reconcileBranchCredit = useReconcileBranchCredit();

  const branches = useMemo(() => {
    if (Array.isArray(branchesData)) return branchesData;
    if (Array.isArray(branchesData?.data)) return branchesData.data;
    return [];
  }, [branchesData]);

  const credits = Array.isArray(branchCreditsData?.data)
    ? branchCreditsData.data
    : [];
  const creditsMeta = branchCreditsData?.meta || {
    page: 1,
    totalPages: 1,
    total: credits.length,
  };

  const summary = useMemo(() => {
    const activeBranches = branches.filter((branch) => branch.isActive).length;
    const readOnlyBranches = branches.filter(
      (branch) =>
        branch.subscription?.accessStatus ===
        BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED,
    ).length;
    const branchesWithoutProfiles = branches.filter(
      (branch) => getEnabledProfiles(branch).length === 0,
    ).length;
    const pendingCredits = credits.filter((credit) => credit.status === 'pending');
    const pendingCreditTotal = pendingCredits.reduce(
      (sum, credit) => sum + Number(credit.amount || 0),
      0,
    );

    return {
      totalBranches: branches.length,
      activeBranches,
      inactiveBranches: branches.length - activeBranches,
      readOnlyBranches,
      branchesWithoutProfiles,
      pendingCredits: pendingCredits.length,
      pendingCreditTotal,
    };
  }, [branches, credits]);

  const filteredBranches = useMemo(() => {
    const normalizedSearch = branchSearch.trim().toLowerCase();

    return branches.filter((branch) => {
      const profiles = getEnabledProfiles(branch);
      const profileLabels = profiles
        .map((profile) => getProfileLabel(profile, t))
        .join(' ')
        .toLowerCase();
      const accessStatus = branch.subscription?.accessStatus || 'missing';
      const matchesSearch =
        !normalizedSearch ||
        branch.name?.toLowerCase().includes(normalizedSearch) ||
        String(branch.id).includes(normalizedSearch) ||
        profileLabels.includes(normalizedSearch);
      const matchesOperatingStatus =
        branchOperatingStatus === 'all' ||
        (branchOperatingStatus === 'active' && branch.isActive) ||
        (branchOperatingStatus === 'inactive' && !branch.isActive);
      const matchesAccessStatus =
        branchAccessStatus === 'all' || branchAccessStatus === accessStatus;

      return matchesSearch && matchesOperatingStatus && matchesAccessStatus;
    });
  }, [branchAccessStatus, branchOperatingStatus, branchSearch, branches, t]);

  const openCreateDialog = () => {
    setEditingBranch(null);
    setBranchForm(emptyBranchForm);
    setBranchDialogOpen(true);
  };

  const openEditDialog = (branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name || '',
      isActive: String(branch.isActive !== false),
      changeReason: '',
    });
    setBranchDialogOpen(true);
  };

  const handleBranchSubmit = (event) => {
    event.preventDefault();
    const payload = {
      name: branchForm.name.trim(),
      isActive: branchForm.isActive === 'true',
      ...(isPlatformAdminRoute
        ? { changeReason: branchForm.changeReason.trim() }
        : {}),
    };

    const mutation = editingBranch
      ? updateBranch.mutateAsync({
          id: editingBranch.id,
          data: payload,
          options: platformScopeOptions,
        })
      : createBranch.mutateAsync({
          data: payload,
          options: platformScopeOptions,
        });

    mutation.then(() => {
      setBranchDialogOpen(false);
    });
  };

  const branchColumns = useMemo(
    () => {
      if (isPlatformAdminRoute) {
        return [
          {
            key: 'name',
            header: t('users.branch', { defaultValue: 'Branch' }),
            cell: (row) => (
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  {row.isDefault && (
                    <Badge variant="secondary">
                      {t('branches.defaultBranch', { defaultValue: 'Default' })}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('platformAdmin.branchAdministration.branchId', {
                    id: row.id,
                    defaultValue: 'Branch #{{id}}',
                  })}
                </p>
              </div>
            ),
          },
          {
            key: 'operatingStatus',
            header: t('platformAdmin.branchAdministration.operatingStatus', {
              defaultValue: 'Operating status',
            }),
            cell: (row) => (
              <Badge variant={row.isActive ? 'default' : 'outline'}>
                {row.isActive
                  ? t('users.active', { defaultValue: 'Active' })
                  : t('users.inactive', { defaultValue: 'Inactive' })}
              </Badge>
            ),
          },
          {
            key: 'accessStatus',
            header: t('platformAdmin.branchAdministration.accessStatus', {
              defaultValue: 'Access status',
            }),
            cell: (row) => <BranchAccessBadge branch={row} t={t} />,
          },
          {
            key: 'profiles',
            header: t('platformAdmin.branchAdministration.enabledProfiles', {
              defaultValue: 'Enabled profiles',
            }),
            cell: (row) => <BranchProfileBadges branch={row} t={t} />,
          },
          {
            key: 'workbenches',
            header: t('platformAdmin.branchAdministration.workbenches', {
              defaultValue: 'Workbenches',
            }),
            className: 'text-right',
            cellClassName: 'text-right',
            cell: (row) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/platform-admin/branch-subscriptions?branchId=${row.id}`}>
                    <CreditCard className="h-4 w-4" />
                    {t('platformAdmin.branchAdministration.openSubscription', {
                      defaultValue: 'Subscription',
                    })}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/platform-admin/billing?branchId=${row.id}`}>
                    <Receipt className="h-4 w-4" />
                    {t('platformAdmin.branchAdministration.openBilling', {
                      defaultValue: 'Billing',
                    })}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/platform-admin/audit?branchId=${row.id}`}>
                    <FileSearch className="h-4 w-4" />
                    {t('platformAdmin.branchAdministration.openAudit', {
                      defaultValue: 'Audit',
                    })}
                  </Link>
                </Button>
                {canUpdateBranches && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(row)}
                  >
                    {t('common.edit', { defaultValue: 'Edit' })}
                  </Button>
                )}
              </div>
            ),
          },
        ];
      }

      return [
        {
          key: 'name',
          header: t('users.branch', { defaultValue: 'Branch' }),
          cell: (row) => (
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.name}</span>
              {row.isDefault && (
                <Badge variant="secondary">
                  {t('branches.defaultBranch', { defaultValue: 'Default' })}
                </Badge>
              )}
            </div>
          ),
        },
        {
          key: 'status',
          header: t('users.status'),
          cell: (row) => (
            <Badge variant={row.isActive ? 'default' : 'outline'}>
              {row.isActive
                ? t('users.active', { defaultValue: 'Active' })
                : t('users.inactive', { defaultValue: 'Inactive' })}
            </Badge>
          ),
        },
        {
          key: 'actions',
          header: t('common.actions', { defaultValue: 'Actions' }),
          cell: (row) =>
            canUpdateBranches ? (
              <Button size="sm" variant="outline" onClick={() => openEditDialog(row)}>
                {t('common.edit', { defaultValue: 'Edit' })}
              </Button>
            ) : (
              <span className="text-muted-foreground">--</span>
            ),
        },
      ];
    },
    [canUpdateBranches, isPlatformAdminRoute, t],
  );

  const creditColumns = useMemo(
    () => [
      {
        key: 'patient',
        header: t('patients.patient', { defaultValue: 'Patient' }),
        cell: (row) => row.patient?.fullName || `#${row.patientId}`,
      },
      {
        key: 'fromBranch',
        header: t('branches.fromBranch', { defaultValue: 'From branch' }),
        cell: (row) => row.fromBranch?.name || `#${row.fromBranchId}`,
      },
      {
        key: 'toBranch',
        header: t('branches.toBranch', { defaultValue: 'To branch' }),
        cell: (row) => row.toBranch?.name || `#${row.toBranchId}`,
      },
      {
        key: 'amount',
        header: t('payments.amount'),
        cell: (row) => Number(row.amount || 0),
      },
      {
        key: 'status',
        header: t('users.status'),
        cell: (row) => (
          <Badge variant={row.status === 'reconciled' ? 'default' : 'outline'}>
            {t(`branches.creditStatus.${row.status}`, {
              defaultValue: row.status,
            })}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions', { defaultValue: 'Actions' }),
        cell: (row) =>
          row.status === 'pending' && canReconcileCredits ? (
            <Button
              size="sm"
              onClick={() =>
                reconcileBranchCredit.mutate({
                  id: row.id,
                  data: {},
                  options: platformScopeOptions,
                })
              }
            >
              {t('branches.reconcileCredit', { defaultValue: 'Reconcile' })}
            </Button>
          ) : (
            <span className="text-muted-foreground">--</span>
          ),
      },
    ],
    [canReconcileCredits, reconcileBranchCredit, t],
  );

  const branchMetricCards = isPlatformAdminRoute
    ? [
        {
          key: 'totalBranches',
          title: t('branches.totalBranches', { defaultValue: 'Total branches' }),
          value: summary.totalBranches,
          helper: t('platformAdmin.branchAdministration.selectedScope', {
            defaultValue: 'Selected company scope',
          }),
          icon: Building2,
        },
        {
          key: 'activeBranches',
          title: t('branches.activeBranches', { defaultValue: 'Active branches' }),
          value: summary.activeBranches,
          helper: t('platformAdmin.branchAdministration.inactiveBranches', {
            count: summary.inactiveBranches,
            defaultValue: '{{count}} inactive',
          }),
          icon: ShieldCheck,
        },
        {
          key: 'readOnlyBranches',
          title: t('platformAdmin.branchAdministration.readOnlyBranches', {
            defaultValue: 'Read-only branches',
          }),
          value: summary.readOnlyBranches,
          helper: t('platformAdmin.branchAdministration.readOnlyHelper', {
            defaultValue: 'Access blocked for mutations',
          }),
          icon: CreditCard,
        },
        {
          key: 'missingProfiles',
          title: t('platformAdmin.branchAdministration.missingProfiles', {
            defaultValue: 'Without profiles',
          }),
          value: summary.branchesWithoutProfiles,
          helper: t('platformAdmin.branchAdministration.profileHelper', {
            defaultValue: 'Needs subscription profile setup',
          }),
          icon: Layers3,
        },
      ]
    : [
        {
          key: 'totalBranches',
          title: t('branches.totalBranches', { defaultValue: 'Total branches' }),
          value: summary.totalBranches,
        },
        {
          key: 'activeBranches',
          title: t('branches.activeBranches', { defaultValue: 'Active branches' }),
          value: summary.activeBranches,
        },
        {
          key: 'pendingCredits',
          title: t('branches.pendingCredits', { defaultValue: 'Pending credits' }),
          value: summary.pendingCredits,
        },
        {
          key: 'pendingCreditAmount',
          title: t('branches.pendingCreditAmount', {
            defaultValue: 'Pending credit amount',
          }),
          value: formatCurrency(summary.pendingCreditTotal),
        },
      ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isPlatformAdminRoute
            ? t('platformAdmin.branchAdministration.title', {
                defaultValue: 'Branch administration',
              })
            : t('nav.branches', { defaultValue: 'Branches' })
        }
        description={
          isPlatformAdminRoute
            ? t('platformAdmin.branchAdministration.description', {
                defaultValue:
                  'Manage the branch records that subscriptions, billing, and access controls attach to.',
              })
            : t('branches.description', {
                defaultValue:
                  'Manage clinic branches and review cross-branch balance credits.',
              })
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchBranches();
                refetchCredits();
              }}
              disabled={needsClinicSelection || isBranchesFetching || isCreditsFetching}
            >
              <RefreshCcw
                className={`h-4 w-4 ${
                  isBranchesFetching || isCreditsFetching ? 'animate-spin' : ''
                }`}
              />
            </Button>
            {isPlatformAdminRoute && !needsClinicSelection && (
              <>
                <Button variant="outline" asChild>
                  <Link to="/platform-admin/branch-subscriptions">
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t('platformAdmin.branchAdministration.subscriptions', {
                      defaultValue: 'Subscriptions',
                    })}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/platform-admin/billing">
                    <Receipt className="mr-2 h-4 w-4" />
                    {t('platformAdmin.branchAdministration.openBilling', {
                      defaultValue: 'Billing',
                    })}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/platform-admin/audit">
                    <FileSearch className="mr-2 h-4 w-4" />
                    {t('platformAdmin.branchAdministration.openAudit', {
                      defaultValue: 'Audit',
                    })}
                  </Link>
                </Button>
              </>
            )}
            {canCreateBranches && !needsClinicSelection && (
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {t('branches.createBranch', { defaultValue: 'Create branch' })}
              </Button>
            )}
          </div>
        }
      />

      {needsClinicSelection && (
        <Card className="border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="p-4 text-sm text-amber-900 dark:text-amber-100">
            {t('branches.selectClinicFirst', {
              defaultValue: 'Select a clinic in the top bar to manage its branches.',
            })}
          </CardContent>
        </Card>
      )}

      {isPlatformAdminRoute && !needsClinicSelection && (
        <Card className="border-primary/15 bg-muted/20">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">
              {t('platformAdmin.branchAdministration.clientUnitTitle', {
                defaultValue: 'Branch is the subscribed client unit.',
              })}
            </span>
            <span className="text-muted-foreground">
              {t('platformAdmin.branchAdministration.clientUnitDescription', {
                defaultValue:
                  'Pricing, suspension, invoice generation, and collections stay in dedicated branch workbenches.',
              })}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {branchMetricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.key}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tracking-normal">
                    {metric.value}
                  </p>
                  {metric.helper && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {metric.helper}
                    </p>
                  )}
                </div>
                {Icon && (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>
              {isPlatformAdminRoute
                ? t('platformAdmin.branchAdministration.registryTitle', {
                    defaultValue: 'Subscribed branch registry',
                  })
                : t('branches.branchDirectory', { defaultValue: 'Branch directory' })}
            </CardTitle>
            {isPlatformAdminRoute && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t('platformAdmin.branchAdministration.registryDescription', {
                  count: filteredBranches.length,
                  total: branches.length,
                  defaultValue: '{{count}} of {{total}} branches shown',
                })}
              </p>
            )}
          </div>
          {isPlatformAdminRoute && !needsClinicSelection && (
            <div className="grid w-full gap-2 md:grid-cols-3 lg:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={branchSearch}
                  onChange={(event) => setBranchSearch(event.target.value)}
                  placeholder={t(
                    'platformAdmin.branchAdministration.searchPlaceholder',
                    {
                      defaultValue: 'Search branch or profile...',
                    },
                  )}
                  className="h-9 pl-9"
                />
              </div>
              <Select
                value={branchOperatingStatus}
                onValueChange={setBranchOperatingStatus}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('platformAdmin.branchAdministration.allOperatingStatuses', {
                      defaultValue: 'All operating statuses',
                    })}
                  </SelectItem>
                  <SelectItem value="active">
                    {t('platformAdmin.branchAdministration.activeOnly', {
                      defaultValue: 'Active only',
                    })}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t('platformAdmin.branchAdministration.inactiveOnly', {
                      defaultValue: 'Inactive only',
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={branchAccessStatus} onValueChange={setBranchAccessStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('platformAdmin.branchAdministration.allAccessStatuses', {
                      defaultValue: 'All access states',
                    })}
                  </SelectItem>
                  <SelectItem value={BRANCH_SUBSCRIPTION_ACCESS_STATUS.ACTIVE}>
                    {t('branchSubscriptions.accessStatuses.active', {
                      defaultValue: 'Active',
                    })}
                  </SelectItem>
                  <SelectItem value={BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED}>
                    {t('branchSubscriptions.accessStatuses.readOnly', {
                      defaultValue: 'Read-only',
                    })}
                  </SelectItem>
                  <SelectItem value="missing">
                    {t('platformAdmin.branchAdministration.missingSubscription', {
                      defaultValue: 'Missing subscription',
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {needsClinicSelection ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('branches.selectClinicFirst', {
                defaultValue: 'Select a clinic in the top bar to manage its branches.',
              })}
            </div>
          ) : isBranchesLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isBranchesError ? (
            <div className="p-6 text-center text-destructive">
              {t('messages.errorOccurred', { defaultValue: 'Something went wrong.' })}
            </div>
          ) : branches.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('branches.noBranches', { defaultValue: 'No branches found.' })}
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('platformAdmin.branchAdministration.noFilteredBranches', {
                defaultValue: 'No branches match these filters.',
              })}
            </div>
          ) : (
            <DataTable
              columns={branchColumns}
              data={isPlatformAdminRoute ? filteredBranches : branches}
              getRowId={(row) => row.id}
              direction={i18n.language === 'ar' ? 'rtl' : 'ltr'}
            />
          )}
        </CardContent>
      </Card>

      {canViewCredits && (
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>
              {t('branches.creditQueue', { defaultValue: 'Branch credit queue' })}
            </CardTitle>
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
              <Select
                value={creditStatus}
                onValueChange={(value) => {
                  setCreditStatus(value);
                  setCreditsPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('common.all', { defaultValue: 'All' })}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t('branches.creditStatus.pending', { defaultValue: 'pending' })}
                  </SelectItem>
                  <SelectItem value="reconciled">
                    {t('branches.creditStatus.reconciled', {
                      defaultValue: 'reconciled',
                    })}
                  </SelectItem>
                </SelectContent>
              </Select>
              {branches.length > 1 && (
                <>
                  <Select
                    value={creditFromBranchId}
                    onValueChange={(value) => {
                      setCreditFromBranchId(value);
                      setCreditsPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue
                        placeholder={t('branches.fromBranch', {
                          defaultValue: 'From branch',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t('branches.allFromBranches', {
                          defaultValue: 'All source branches',
                        })}
                      </SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={`from-${branch.id}`} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={creditToBranchId}
                    onValueChange={(value) => {
                      setCreditToBranchId(value);
                      setCreditsPage(1);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue
                        placeholder={t('branches.toBranch', {
                          defaultValue: 'To branch',
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t('branches.allToBranches', {
                          defaultValue: 'All destination branches',
                        })}
                      </SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={`to-${branch.id}`} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {needsClinicSelection ? (
              <div className="p-6 text-center text-muted-foreground">
                {t('branches.selectClinicFirst', {
                  defaultValue: 'Select a clinic in the top bar to manage its branches.',
                })}
              </div>
            ) : isCreditsLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : credits.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                {t('branches.noCredits', {
                  defaultValue: 'No branch credits found for the selected filters.',
                })}
              </div>
            ) : (
              <>
                <DataTable
                  columns={creditColumns}
                  data={credits}
                  getRowId={(row) => row.id}
                  direction={i18n.language === 'ar' ? 'rtl' : 'ltr'}
                />
                <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <span>
                    {t('common.paginationSummary', {
                      defaultValue: '{{from}}-{{to}} of {{total}}',
                      from: credits.length ? (creditsMeta.page - 1) * 10 + 1 : 0,
                      to: (creditsMeta.page - 1) * 10 + credits.length,
                      total: creditsMeta.total || credits.length,
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={creditsMeta.page <= 1}
                      onClick={() => setCreditsPage((current) => Math.max(1, current - 1))}
                    >
                      {t('common.previous', { defaultValue: 'Previous' })}
                    </Button>
                    <span>
                      {creditsMeta.page} / {creditsMeta.totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={creditsMeta.page >= (creditsMeta.totalPages || 1)}
                      onClick={() => setCreditsPage((current) => current + 1)}
                    >
                      {t('common.next', { defaultValue: 'Next' })}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingBranch
                ? t('branches.editBranch', { defaultValue: 'Edit branch' })
                : t('branches.createBranch', { defaultValue: 'Create branch' })}
            </DialogTitle>
            <DialogDescription>
              {isPlatformAdminRoute
                ? t('platformAdmin.branchAdministration.dialogDescription', {
                    defaultValue:
                      'This changes the branch record only. Commercial terms and access status are managed from branch subscriptions.',
                  })
                : t('branches.dialogDescription', {
                    defaultValue:
                      'Every clinic starts with a default branch and can add more as operations grow.',
                  })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBranchSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">
                {t('users.branch', { defaultValue: 'Branch' })}
              </Label>
              <Input
                id="branch-name"
                value={branchForm.name}
                onChange={(event) =>
                  setBranchForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{t('users.status')}</Label>
              <Select
                value={branchForm.isActive}
                onValueChange={(value) =>
                  setBranchForm((current) => ({
                    ...current,
                    isActive: value,
                  }))
                }
                disabled={Boolean(editingBranch?.isDefault)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">
                    {t('users.active', { defaultValue: 'Active' })}
                  </SelectItem>
                  <SelectItem value="false">
                    {t('users.inactive', { defaultValue: 'Inactive' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isPlatformAdminRoute && (
              <div className="space-y-2">
                <Label htmlFor="branch-change-reason">
                  {t('platformAdmin.auditReason', {
                    defaultValue: 'Admin reason',
                  })}
                </Label>
                <Textarea
                  id="branch-change-reason"
                  value={branchForm.changeReason}
                  onChange={(event) =>
                    setBranchForm((current) => ({
                      ...current,
                      changeReason: event.target.value,
                    }))
                  }
                  placeholder={t('platformAdmin.auditReasonPlaceholder', {
                    defaultValue: 'Describe why this admin change is being made.',
                  })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('platformAdmin.auditReasonHint', {
                    defaultValue: 'Saved with the platform audit event.',
                  })}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  createBranch.isPending ||
                  updateBranch.isPending ||
                  (isPlatformAdminRoute &&
                    branchForm.changeReason.trim().length < 3)
                }
              >
                {(createBranch.isPending || updateBranch.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('common.save', { defaultValue: 'Save' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BranchAccessBadge({ branch, t }) {
  const accessStatus = branch.subscription?.accessStatus;

  if (!accessStatus) {
    return (
      <Badge variant="outline">
        {t('platformAdmin.branchAdministration.missingSubscription', {
          defaultValue: 'Missing subscription',
        })}
      </Badge>
    );
  }

  const isReadOnly =
    accessStatus === BRANCH_SUBSCRIPTION_ACCESS_STATUS.SUSPENDED;

  return (
    <Badge variant={isReadOnly ? 'secondary' : 'default'}>
      {isReadOnly
        ? t('branchSubscriptions.accessStatuses.readOnly', {
            defaultValue: 'Read-only',
          })
        : t('branchSubscriptions.accessStatuses.active', {
            defaultValue: 'Active',
          })}
    </Badge>
  );
}

function BranchProfileBadges({ branch, t }) {
  const profiles = getEnabledProfiles(branch);

  if (!profiles.length) {
    return (
      <Badge variant="outline">
        {t('platformAdmin.branchAdministration.noProfilesEnabled', {
          defaultValue: 'No profiles enabled',
        })}
      </Badge>
    );
  }

  const visibleProfiles = profiles.slice(0, 2);
  const hiddenCount = profiles.length - visibleProfiles.length;

  return (
    <div className="flex max-w-sm flex-wrap gap-1.5">
      {visibleProfiles.map((profile) => (
        <Badge key={profile} variant="secondary" className="max-w-48 truncate">
          {getProfileLabel(profile, t)}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge variant="outline">
          {t('platformAdmin.branchAdministration.moreProfiles', {
            count: hiddenCount,
            defaultValue: '+{{count}} more',
          })}
        </Badge>
      )}
    </div>
  );
}

function getEnabledProfiles(branch) {
  return (branch.subscription?.profiles || [])
    .filter((profile) => profile?.isEnabled !== false)
    .map((profile) =>
      typeof profile === 'string'
        ? profile
        : profile?.profile || profile?.profileCode || profile?.code || profile?.name,
    )
    .filter(Boolean);
}

function getProfileLabel(profile, t) {
  return getClinicProfileLabel(profile, t) || String(profile);
}
