import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PERMISSIONS } from '@/lib/constants';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { resolveEffectiveClinicId } from '@/lib/branchScope';
import { formatCurrency } from '@/lib/utils';

const emptyBranchForm = {
  name: '',
  isActive: 'true',
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
    const pendingCredits = credits.filter((credit) => credit.status === 'pending');
    const pendingCreditTotal = pendingCredits.reduce(
      (sum, credit) => sum + Number(credit.amount || 0),
      0,
    );

    return {
      totalBranches: branches.length,
      activeBranches,
      pendingCredits: pendingCredits.length,
      pendingCreditTotal,
    };
  }, [branches, credits]);

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
    });
    setBranchDialogOpen(true);
  };

  const handleBranchSubmit = (event) => {
    event.preventDefault();
    const payload = {
      name: branchForm.name.trim(),
      isActive: branchForm.isActive === 'true',
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
    () => [
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
    ],
    [canUpdateBranches, t],
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isPlatformAdminRoute
            ? 'Branch administration'
            : t('nav.branches', { defaultValue: 'Branches' })
        }
        description={
          isPlatformAdminRoute
            ? 'Manage the branch records that subscriptions, billing, and access controls attach to.'
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
              <Button variant="outline" asChild>
                <Link to="/platform-admin/branch-subscriptions">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Subscriptions
                </Link>
              </Button>
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
            <span className="font-medium">Branch is the subscribed client unit.</span>
            <span className="text-muted-foreground">
              Pricing, suspension, invoice generation, and collections stay in dedicated branch workbenches.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('branches.totalBranches', { defaultValue: 'Total branches' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.totalBranches}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('branches.activeBranches', { defaultValue: 'Active branches' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.activeBranches}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('branches.pendingCredits', { defaultValue: 'Pending credits' })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary.pendingCredits}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('branches.pendingCreditAmount', {
                defaultValue: 'Pending credit amount',
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(summary.pendingCreditTotal)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('branches.branchDirectory', { defaultValue: 'Branch directory' })}
          </CardTitle>
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
          ) : (
            <DataTable
              columns={branchColumns}
              data={branches}
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
                ? 'This changes the branch record only. Commercial terms and access status are managed from branch subscriptions.'
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
            <DialogFooter>
              <Button
                type="submit"
                disabled={createBranch.isPending || updateBranch.isPending}
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
