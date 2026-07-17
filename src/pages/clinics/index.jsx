import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  CreditCard,
  FileSearch,
  FileText,
  Loader2,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useCreateClinic, useUpdateClinic } from '@/hooks/useClinics';
import { useCreateUser } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { usePermissions } from '@/hooks/usePermissions';
import { usePlatformClinicGroups } from '@/hooks/usePlatformAdmin';
import { accessApi } from '@/api/endpoints/access';
import { DOCTOR_SHIFT, PERMISSIONS, USER_ROLES } from '@/lib/constants';
import { useUIStore } from '@/store/uiStore';
import { formatCurrency } from '@/lib/utils';

const emptyClinicForm = {
  name: '',
  slug: '',
  status: 'active',
  billingNotes: '',
  changeReason: '',
};

const emptyUserForm = {
  clinicId: '',
  branchId: '',
  fullName: '',
  username: '',
  email: '',
  password: '',
  roleName: USER_ROLES.MANAGER,
  shifts: [],
  dailyOpnsOrder: '',
  canPerformAssessments: false,
  changeReason: '',
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function AdminMetric({ label, value, helper, icon: Icon = Building2, tone = 'default' }) {
  const toneClass =
    {
      default: 'bg-primary/10 text-primary',
      success: 'bg-emerald-500/10 text-emerald-700',
      warning: 'bg-amber-500/10 text-amber-700',
      muted: 'bg-muted text-muted-foreground',
    }[tone] || 'bg-primary/10 text-primary';

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className={`rounded-md p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {helper && <div className="mt-1 text-xs text-muted-foreground">{helper}</div>}
      </CardContent>
    </Card>
  );
}

function ClinicWorkbenchActions({ clinic, onSelectScope, t }) {
  const branchStats = clinic.branchStats || {};
  const hasNoBranches = (branchStats.totalBranches || 0) === 0;
  const hasSubscriptionGaps =
    (branchStats.missingSubscriptions || 0) > 0 ||
    (branchStats.branchesWithoutProfiles || 0) > 0 ||
    (branchStats.branchesMissingPricing || 0) > 0;
  const primaryWorkbench = hasNoBranches ? 'branches' : 'subscriptions';
  const summary = hasNoBranches
    ? t('platformAdmin.clinicGroups.workbenchSummaryNoBranches', {
        defaultValue:
          'Start with branch records before subscriptions can carry billing.',
      })
    : hasSubscriptionGaps
      ? t('platformAdmin.clinicGroups.workbenchSummarySubscriptionGaps', {
          defaultValue:
            'Finish profiles, access, and next-month pricing before handoff.',
        })
      : t('platformAdmin.clinicGroups.workbenchSummaryReady', {
          defaultValue: 'Scope operational workbenches to this company group.',
        });

  return (
    <div className="flex min-w-[340px] flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={primaryWorkbench === 'branches' ? 'default' : 'outline'}
          asChild
        >
          <Link to="/platform-admin/branches" onClick={() => onSelectScope(clinic)}>
            <Workflow className="h-4 w-4" />
            {t('platformAdmin.clinicGroups.openBranches', {
              defaultValue: 'Branches',
            })}
          </Link>
        </Button>
        <Button
          size="sm"
          variant={primaryWorkbench === 'subscriptions' ? 'default' : 'outline'}
          asChild
        >
          <Link
            to="/platform-admin/branch-subscriptions"
            onClick={() => onSelectScope(clinic)}
          >
            <CreditCard className="h-4 w-4" />
            {t('platformAdmin.clinicGroups.openSubscriptions', {
              defaultValue: 'Subscriptions',
            })}
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/platform-admin/billing" onClick={() => onSelectScope(clinic)}>
            <Receipt className="h-4 w-4" />
            {t('platformAdmin.clinicGroups.openBilling', {
              defaultValue: 'Billing',
            })}
          </Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/platform-admin/users" onClick={() => onSelectScope(clinic)}>
            <Users className="h-4 w-4" />
            {t('platformAdmin.clinicGroups.openUsers', {
              defaultValue: 'Users',
            })}
          </Link>
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <Link to="/platform-admin/audit" onClick={() => onSelectScope(clinic)}>
            <FileSearch className="h-4 w-4" />
            {t('platformAdmin.clinicGroups.openAudit', {
              defaultValue: 'Audit',
            })}
          </Link>
        </Button>
      </div>
      <p className="max-w-[24rem] text-[11px] leading-4 text-muted-foreground">
        {summary}
      </p>
    </div>
  );
}

function ClinicSetupActions({ clinic, onEditClinic, onProvisionUser, t }) {
  const managerUsers = Number(clinic.userStats?.managerUsers || 0);
  const needsManager = managerUsers === 0;
  const summary = needsManager
    ? t('platformAdmin.clinicGroups.setupSummaryNoManager', {
        defaultValue:
          'No manager yet; provision one before operational handoff.',
      })
    : t('platformAdmin.clinicGroups.setupSummaryReady', {
        defaultValue:
          'Provision adds active user access; settings update tenant metadata.',
      });

  return (
    <div className="flex min-w-[250px] flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={needsManager ? 'default' : 'outline'}
          onClick={(event) => {
            event.stopPropagation();
            onProvisionUser(clinic);
          }}
        >
          <UserPlus className="h-4 w-4" />
          {t('platformAdmin.clinicGroups.provisionUser', {
            defaultValue: 'Provision user',
          })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
            onEditClinic(clinic);
          }}
        >
          <Settings2 className="h-4 w-4" />
          {t('platformAdmin.clinicGroups.companySettings', {
            defaultValue: 'Company settings',
          })}
        </Button>
      </div>
      <p className="max-w-[18rem] text-[11px] leading-4 text-muted-foreground">
        {summary}
      </p>
    </div>
  );
}

export default function ClinicsPage() {
  const { t, i18n } = useTranslation();
  const { can } = usePermissions();
  const { setPlatformAdminClinicId } = useUIStore();
  const canViewBranches = can(PERMISSIONS['branches:view']);
  const [clinicDialogOpen, setClinicDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [clinicForm, setClinicForm] = useState(emptyClinicForm);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [clinicSearch, setClinicSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [readinessFilter, setReadinessFilter] = useState('all');
  const [notesFilter, setNotesFilter] = useState('all');

  const {
    data: clinicGroupsData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = usePlatformClinicGroups();
  const createClinic = useCreateClinic();
  const updateClinic = useUpdateClinic();
  const createUser = useCreateUser();

  const { data: rolesPermissions } = useQuery({
    queryKey: ['access', 'roles-permissions'],
    queryFn: accessApi.getRolesPermissions,
    staleTime: 5 * 60 * 1000,
  });
  const selectedProvisionClinicId = Number(userForm.clinicId || 0) || null;
  const { data: branchOptionsData } = useBranches({
    enabled: Boolean(canViewBranches && userDialogOpen && selectedProvisionClinicId),
    suppressPermissionToast: true,
    platformClinicId: selectedProvisionClinicId ?? undefined,
  });

  const clinics = useMemo(() => {
    if (Array.isArray(clinicGroupsData)) return clinicGroupsData;
    if (Array.isArray(clinicGroupsData?.data)) return clinicGroupsData.data;
    return [];
  }, [clinicGroupsData]);
  const readinessPricingMonth =
    !Array.isArray(clinicGroupsData) && clinicGroupsData?.readinessPricingMonth
      ? String(clinicGroupsData.readinessPricingMonth).slice(0, 7)
      : '';

  const filteredClinics = useMemo(() => {
    const normalizedSearch = clinicSearch.trim().toLowerCase();

    return clinics.filter((clinic) => {
      const hasBillingNotes = Boolean(clinic.billingNotes?.trim());
      const matchesSearch =
        !normalizedSearch ||
        clinic.name?.toLowerCase().includes(normalizedSearch) ||
        clinic.slug?.toLowerCase().includes(normalizedSearch) ||
        String(clinic.id).includes(normalizedSearch) ||
        clinic.billingNotes?.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all' || clinic.status === statusFilter;
      const matchesReadiness =
        readinessFilter === 'all' || clinic.readiness?.status === readinessFilter;
      const matchesNotes =
        notesFilter === 'all' ||
        (notesFilter === 'with_notes' && hasBillingNotes) ||
        (notesFilter === 'without_notes' && !hasBillingNotes);

      return matchesSearch && matchesStatus && matchesReadiness && matchesNotes;
    });
  }, [clinicSearch, clinics, notesFilter, readinessFilter, statusFilter]);

  const clinicSummary = useMemo(() => {
    const active = clinics.filter((clinic) => clinic.status === 'active').length;
    const suspended = clinics.filter(
      (clinic) => clinic.status === 'suspended',
    ).length;
    const withBillingNotes = clinics.filter((clinic) =>
      Boolean(clinic.billingNotes?.trim()),
    ).length;
    const needsSetup = clinics.filter(
      (clinic) => clinic.readiness?.status === 'attention',
    ).length;
    const reviewNeeded = clinics.filter(
      (clinic) => clinic.readiness?.status === 'review',
    ).length;
    const outstandingBalance = clinics.reduce(
      (sum, clinic) => sum + Number(clinic.billingStats?.outstandingBalance || 0),
      0,
    );
    const openInvoices = clinics.reduce(
      (sum, clinic) => sum + Number(clinic.billingStats?.openInvoices || 0),
      0,
    );

    return {
      total: clinics.length,
      active,
      suspended,
      withBillingNotes,
      withoutBillingNotes: clinics.length - withBillingNotes,
      needsSetup,
      reviewNeeded,
      outstandingBalance,
      openInvoices,
    };
  }, [clinics]);

  const provisionableRoles = useMemo(() => {
    if (!Array.isArray(rolesPermissions)) return [];
    return rolesPermissions
      .filter((role) =>
        [
          USER_ROLES.MANAGER,
          USER_ROLES.BRANCH_MANAGER,
          USER_ROLES.DOCTOR,
          USER_ROLES.SECRETARY,
        ].includes(role.name),
      )
      .map((role) => ({ id: role.id, name: role.name }));
  }, [rolesPermissions]);
  const branchOptions = useMemo(() => {
    if (Array.isArray(branchOptionsData)) return branchOptionsData;
    if (Array.isArray(branchOptionsData?.data)) return branchOptionsData.data;
    return [];
  }, [branchOptionsData]);

  const selectedRole = provisionableRoles.find((role) => role.name === userForm.roleName);
  const selectedProvisionClinic = clinics.find(
    (clinic) => String(clinic.id) === String(userForm.clinicId),
  );
  const selectedProvisionBranch = branchOptions.find(
    (branch) => String(branch.id) === String(userForm.branchId),
  );
  const selectedProvisionRoleLabel = userForm.roleName
    ? t(`users.${userForm.roleName}`, { defaultValue: userForm.roleName })
    : '--';

  useEffect(() => {
    if (!userDialogOpen) return;

    setUserForm((current) => {
      if (!branchOptions.length) {
        if (!current.branchId) return current;
        return { ...current, branchId: '' };
      }

      const branchStillExists = branchOptions.some(
        (branch) => String(branch.id) === String(current.branchId),
      );
      if (branchStillExists) {
        return current;
      }

      const defaultBranch =
        branchOptions.find((branch) => branch.isDefault) || branchOptions[0];

      return {
        ...current,
        branchId: defaultBranch ? String(defaultBranch.id) : '',
      };
    });
  }, [branchOptions, userDialogOpen]);

  const openCreateClinic = () => {
    setEditingClinic(null);
    setClinicForm(emptyClinicForm);
    setClinicDialogOpen(true);
  };

  const openEditClinic = useCallback((clinic) => {
    setEditingClinic(clinic);
    setClinicForm({
      name: clinic.name || '',
      slug: clinic.slug || '',
      status: clinic.status || 'active',
      billingNotes: clinic.billingNotes || '',
      changeReason: '',
    });
    setClinicDialogOpen(true);
  }, []);

  const updateClinicField = (field, value) => {
    setClinicForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && !editingClinic ? { slug: slugify(value) } : {}),
    }));
  };

  const handleClinicSubmit = (event) => {
    event.preventDefault();
    const payload = {
      name: clinicForm.name.trim(),
      slug: slugify(clinicForm.slug),
      status: clinicForm.status,
      billingNotes: clinicForm.billingNotes.trim() || null,
      changeReason: clinicForm.changeReason.trim(),
    };

    const mutation = editingClinic
      ? updateClinic.mutateAsync({ id: editingClinic.id, data: payload })
      : createClinic.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(
          editingClinic
            ? t('platformAdmin.clinicGroups.toasts.updated', {
                defaultValue: 'Clinic updated',
              })
            : t('platformAdmin.clinicGroups.toasts.created', {
                defaultValue: 'Clinic created',
              }),
        );
        setClinicDialogOpen(false);
      })
      .catch((error) => {
        toast.error(
          error?.response?.data?.message ||
            t('platformAdmin.clinicGroups.toasts.saveFailed', {
              defaultValue: 'Could not save clinic',
            }),
        );
      });
  };

  const openProvisionUser = useCallback((clinic) => {
    setUserForm({
      ...emptyUserForm,
      clinicId: clinic?.id ? String(clinic.id) : '',
    });
    setUserDialogOpen(true);
  }, []);

  const toggleUserShift = (shift) => {
    setUserForm((current) => ({
      ...current,
      shifts: current.shifts.includes(shift)
        ? current.shifts.filter((value) => value !== shift)
        : [...current.shifts, shift],
    }));
  };

  const handleUserSubmit = (event) => {
    event.preventDefault();
    if (!selectedRole) {
      toast.error(
        t('platformAdmin.clinicGroups.toasts.selectRole', {
          defaultValue: 'Select a role before provisioning the user',
        }),
      );
      return;
    }

    const payload = {
      clinicId: Number(userForm.clinicId),
      fullName: userForm.fullName.trim(),
      username: userForm.username.trim(),
      email: userForm.email.trim(),
      password: userForm.password,
      roleIds: [selectedRole.id],
      branchId: userForm.branchId ? Number(userForm.branchId) : undefined,
      shifts: userForm.roleName === 'doctor' ? userForm.shifts : [],
      canPerformAssessments:
        userForm.roleName === 'doctor'
          ? userForm.canPerformAssessments === true
          : false,
      dailyOpnsOrder:
        userForm.roleName === 'doctor' && userForm.dailyOpnsOrder
          ? Number(userForm.dailyOpnsOrder)
          : undefined,
      isActive: true,
      changeReason: userForm.changeReason.trim(),
    };

    createUser
      .mutateAsync(payload)
      .then(() => {
        toast.success(
          t('platformAdmin.clinicGroups.toasts.userProvisioned', {
            defaultValue: 'User provisioned with forced first-login password change',
          }),
        );
        setUserDialogOpen(false);
      })
      .catch((error) => {
        toast.error(
          error?.response?.data?.message ||
            t('platformAdmin.clinicGroups.toasts.provisionFailed', {
              defaultValue: 'Could not provision user',
            }),
        );
      });
  };

  const selectClinicScope = useCallback((clinic) => {
    if (!clinic?.id) return;
    setPlatformAdminClinicId(Number(clinic.id));
  }, [setPlatformAdminClinicId]);

  const columns = useMemo(
    () => [
      {
        key: 'company',
        header: t('platformAdmin.clinicGroups.columns.company', {
          defaultValue: 'Company group',
        }),
        cell: (clinic) => (
          <div className="flex min-w-[240px] items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1">
              <div className="truncate font-medium">{clinic.name}</div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{clinic.slug}</span>
                <span className="text-border">/</span>
                <span>
                  {t('platformAdmin.clinicGroups.clinicId', {
                    id: clinic.id,
                    defaultValue: 'Company #{{id}}',
                  })}
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'readiness',
        header: t('platformAdmin.clinicGroups.columns.readiness', {
          defaultValue: 'Next-month setup',
        }),
        cell: (clinic) => {
          const readinessStatus = clinic.readiness?.status || 'ready';
          const branchStats = clinic.branchStats || {};
          const userStats = clinic.userStats || {};
          const hasBillingNotes = Boolean(clinic.billingNotes?.trim());
          const issueItems = [
            {
              count: (branchStats.totalBranches || 0) === 0 ? 1 : 0,
              label: t('platformAdmin.clinicGroups.readiness.noBranches', {
                defaultValue: 'no branches',
              }),
            },
            {
              count: branchStats.missingSubscriptions || 0,
              label: t('platformAdmin.clinicGroups.readiness.missingSubscriptions', {
                defaultValue: 'missing subscriptions',
              }),
            },
            {
              count: branchStats.branchesWithoutProfiles || 0,
              label: t('platformAdmin.clinicGroups.readiness.missingProfiles', {
                defaultValue: 'without profiles',
              }),
            },
            {
              count: branchStats.branchesMissingPricing || 0,
              label: t('platformAdmin.clinicGroups.readiness.missingPricing', {
                defaultValue: 'next-month pricing missing',
              }),
            },
            {
              count: userStats.managerUsers > 0 ? 0 : 1,
              label: t('platformAdmin.clinicGroups.readiness.missingManager', {
                defaultValue: 'no manager',
              }),
            },
          ].filter((item) => item.count > 0);
          const readinessClass =
            readinessStatus === 'ready'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : readinessStatus === 'attention'
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-300 bg-slate-50 text-slate-700';

          return (
            <div className="min-w-[260px] space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`rounded-full px-2.5 py-1 ${readinessClass}`}>
                  {t(`platformAdmin.clinicGroups.readiness.${readinessStatus}`, {
                    defaultValue: readinessStatus,
                  })}
                </Badge>
                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                  <FileText className="mr-1 h-3 w-3" />
                  {hasBillingNotes
                    ? t('platformAdmin.clinicGroups.withBillingNotes', {
                        defaultValue: 'Notes saved',
                      })
                    : t('platformAdmin.clinicGroups.noBillingNotes', {
                        defaultValue: 'No admin notes',
                      })}
                </Badge>
              </div>
              {issueItems.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {issueItems.map((item) => (
                    <Badge
                      key={item.label}
                      variant="outline"
                      className="rounded-full border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800"
                    >
                      {item.count > 1 ? `${item.count} ` : ''}
                      {item.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {t('platformAdmin.clinicGroups.readiness.readyHelper', {
                    defaultValue: 'Next-month branch setup is in place.',
                  })}
                </div>
              )}
              <div className="line-clamp-1 text-xs text-muted-foreground">
                {hasBillingNotes
                  ? clinic.billingNotes
                  : t('platformAdmin.clinicGroups.companyRecordHint', {
                      defaultValue:
                        'Company identity only. Branch subscriptions and billing stay per branch.',
                    })}
              </div>
            </div>
          );
        },
      },
      {
        key: 'footprint',
        header: t('platformAdmin.clinicGroups.columns.footprint', {
          defaultValue: 'Footprint',
        }),
        cell: (clinic) => {
          const branchStats = clinic.branchStats || {};
          const userStats = clinic.userStats || {};

          return (
            <div className="min-w-[230px] space-y-2 text-xs">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                  <Building2 className="mr-1 h-3 w-3" />
                  {t('platformAdmin.clinicGroups.branchCount', {
                    count: branchStats.totalBranches || 0,
                    defaultValue: '{{count}} branches',
                  })}
                </Badge>
                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                  {t('platformAdmin.clinicGroups.activeBranchCount', {
                    count: branchStats.activeBranches || 0,
                    defaultValue: '{{count}} active',
                  })}
                </Badge>
                {(branchStats.suspendedBranches || 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-800"
                  >
                    {t('platformAdmin.clinicGroups.readOnlyBranchCount', {
                      count: branchStats.suspendedBranches || 0,
                      defaultValue: '{{count}} read-only',
                    })}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                  <Users className="mr-1 h-3 w-3" />
                  {t('platformAdmin.clinicGroups.userCount', {
                    count: userStats.totalUsers || 0,
                    defaultValue: '{{count}} users',
                  })}
                </Badge>
                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                  {t('platformAdmin.clinicGroups.managerCount', {
                    count: userStats.managerUsers || 0,
                    defaultValue: '{{count}} managers',
                  })}
                </Badge>
              </div>
            </div>
          );
        },
      },
      {
        key: 'billing',
        header: t('platformAdmin.clinicGroups.columns.billing', {
          defaultValue: 'Billing posture',
        }),
        cell: (clinic) => {
          const billingStats = clinic.billingStats || {};
          const outstandingBalance = Number(billingStats.outstandingBalance || 0);
          const openInvoices = Number(billingStats.openInvoices || 0);
          const overdueInvoices = Number(billingStats.overdueInvoices || 0);

          return (
            <div className="min-w-[190px] space-y-1.5">
              <div className="font-medium">{formatCurrency(outstandingBalance)}</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                  {t('platformAdmin.clinicGroups.openInvoiceCount', {
                    count: openInvoices,
                    defaultValue: '{{count}} open',
                  })}
                </Badge>
                {overdueInvoices > 0 && (
                  <Badge
                    variant="outline"
                    className="rounded-full border-destructive/30 bg-destructive/5 px-2.5 py-1 text-destructive"
                  >
                    {t('platformAdmin.clinicGroups.overdueInvoiceCount', {
                      count: overdueInvoices,
                      defaultValue: '{{count}} overdue',
                    })}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'workbenches',
        header: t('platformAdmin.clinicGroups.columns.workbenches', {
          defaultValue: 'Scoped workbenches',
        }),
        cell: (clinic) => (
          <ClinicWorkbenchActions
            clinic={clinic}
            onSelectScope={selectClinicScope}
            t={t}
          />
        ),
      },
      {
        key: 'setupActions',
        header: t('platformAdmin.clinicGroups.columns.setupActions', {
          defaultValue: 'Setup actions',
        }),
        cell: (clinic) => (
          <ClinicSetupActions
            clinic={clinic}
            onEditClinic={openEditClinic}
            onProvisionUser={openProvisionUser}
            t={t}
          />
        ),
      },
    ],
    [openEditClinic, openProvisionUser, selectClinicScope, t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformAdmin.clinicGroups.title', {
          defaultValue: 'Clinic groups',
        })}
        description={t('platformAdmin.clinicGroups.description', {
          defaultValue:
            'Company-level tenants. Branch subscriptions, billing, and access controls are managed per branch.',
        })}
        actions={
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric
          label={t('platformAdmin.clinicGroups.metrics.clinicGroups', {
            defaultValue: 'Clinic groups',
          })}
          value={clinicSummary.total}
          helper={t('platformAdmin.clinicGroups.totalCount', {
            count: filteredClinics.length,
            defaultValue: '{{count}} total',
          })}
          icon={Building2}
        />
        <AdminMetric
          label={t('platformAdmin.clinicGroups.metrics.active', {
            defaultValue: 'Active',
          })}
          value={clinicSummary.active}
          helper={t('platformAdmin.clinicGroups.metrics.activeHelper', {
            defaultValue: 'Can operate through branch workbenches',
          })}
          icon={ShieldCheck}
          tone="success"
        />
        <AdminMetric
          label={t('platformAdmin.clinicGroups.metrics.needsSetup', {
            defaultValue: 'Next-month setup',
          })}
          value={clinicSummary.needsSetup}
          helper={t('platformAdmin.clinicGroups.metrics.readinessMonthHelper', {
            count: clinicSummary.reviewNeeded,
            month: readinessPricingMonth || '--',
            defaultValue: 'Pricing month {{month}} / {{count}} company status review',
          })}
          icon={Workflow}
          tone={clinicSummary.needsSetup > 0 ? 'warning' : 'muted'}
        />
        <AdminMetric
          label={t('platformAdmin.clinicGroups.metrics.openBalance', {
            defaultValue: 'Open balance',
          })}
          value={formatCurrency(clinicSummary.outstandingBalance)}
          helper={t('platformAdmin.clinicGroups.metrics.openInvoiceHelper', {
            count: clinicSummary.openInvoices,
            defaultValue: '{{count}} open invoices',
          })}
          icon={Receipt}
          tone={clinicSummary.outstandingBalance > 0 ? 'warning' : 'muted'}
        />
      </div>

      <ImpactPanel
        tone={clinicSummary.needsSetup > 0 ? 'warning' : 'commercial'}
        icon={Building2}
        title={t('platformAdmin.clinicGroups.tenantBoundaryTitle', {
          defaultValue: 'Company groups own people and patients.',
        })}
        description={t('platformAdmin.clinicGroups.tenantBoundaryDescription', {
          defaultValue:
            'Branches remain the subscribed client units for profiles, pricing, access blocks, invoices, and collections.',
        })}
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-3 sm:grid-cols-3">
            <ImpactMetric
              label={t('platformAdmin.clinicGroups.metrics.active', {
                defaultValue: 'Active',
              })}
              value={clinicSummary.active}
            />
            <ImpactMetric
              label={t('platformAdmin.clinicGroups.metrics.needsSetup', {
                defaultValue: 'Next-month setup',
              })}
              value={clinicSummary.needsSetup}
            />
            <ImpactMetric
              label={t('platformAdmin.clinicGroups.metrics.openBalance', {
                defaultValue: 'Open balance',
              })}
              value={formatCurrency(clinicSummary.outstandingBalance)}
            />
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Button onClick={openCreateClinic}>
              <Plus className="h-4 w-4" />
              {t('platformAdmin.clinicGroups.createClinicGroup', {
                defaultValue: 'Create clinic group',
              })}
            </Button>
            <Button variant="outline" onClick={() => openProvisionUser()}>
              <UserPlus className="h-4 w-4" />
              {t('platformAdmin.clinicGroups.provisionUser', {
                defaultValue: 'Provision user',
              })}
            </Button>
          </div>
        </div>
      </ImpactPanel>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {t('platformAdmin.clinicGroups.directory', {
                defaultValue: 'Clinic group directory',
              })}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('platformAdmin.clinicGroups.directoryDescription', {
                month: readinessPricingMonth || '--',
                defaultValue:
                  'Select a company scope. Setup readiness checks {{month}} pricing; billing posture shows current invoice exposure.',
              })}
            </p>
          </div>
          <Badge variant="outline">
            {t('platformAdmin.clinicGroups.totalCount', {
              count: filteredClinics.length,
              defaultValue: '{{count}} total',
            })}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-y bg-muted/30 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clinicSearch}
                onChange={(event) => setClinicSearch(event.target.value)}
                placeholder={t('platformAdmin.clinicGroups.searchPlaceholder', {
                  defaultValue: 'Search company, slug, note, or ID...',
                })}
                className="h-9 pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{t('clinics.status')}</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder={t('clinics.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('platformAdmin.clinicGroups.allStatuses', {
                        defaultValue: 'All statuses',
                      })}
                    </SelectItem>
                    <SelectItem value="active">{t('clinics.active')}</SelectItem>
                    <SelectItem value="suspended">{t('clinics.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  {t('platformAdmin.clinicGroups.noteState', {
                    defaultValue: 'Admin notes',
                  })}
                </span>
                <Select value={notesFilter} onValueChange={setNotesFilter}>
                  <SelectTrigger className="h-8 w-[170px]">
                    <SelectValue
                      placeholder={t('platformAdmin.clinicGroups.noteState', {
                        defaultValue: 'Admin notes',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('platformAdmin.clinicGroups.allNoteStates', {
                        defaultValue: 'All note states',
                      })}
                    </SelectItem>
                    <SelectItem value="with_notes">
                      {t('platformAdmin.clinicGroups.withBillingNotes', {
                        defaultValue: 'Notes saved',
                      })}
                    </SelectItem>
                    <SelectItem value="without_notes">
                      {t('platformAdmin.clinicGroups.noBillingNotes', {
                        defaultValue: 'No admin notes',
                      })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span>
                  {t('platformAdmin.clinicGroups.readiness.label', {
                    defaultValue: 'Setup readiness',
                  })}
                </span>
                <Select value={readinessFilter} onValueChange={setReadinessFilter}>
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue
                      placeholder={t('platformAdmin.clinicGroups.readiness.label', {
                        defaultValue: 'Setup readiness',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('platformAdmin.clinicGroups.readiness.all', {
                        defaultValue: 'All setup readiness',
                      })}
                    </SelectItem>
                    <SelectItem value="ready">
                      {t('platformAdmin.clinicGroups.readiness.ready', {
                        defaultValue: 'Ready',
                      })}
                    </SelectItem>
                    <SelectItem value="attention">
                      {t('platformAdmin.clinicGroups.readiness.attention', {
                        defaultValue: 'Setup attention',
                      })}
                    </SelectItem>
                    <SelectItem value="review">
                      {t('platformAdmin.clinicGroups.readiness.review', {
                        defaultValue: 'Review',
                      })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(clinicSearch ||
                statusFilter !== 'all' ||
                readinessFilter !== 'all' ||
                notesFilter !== 'all') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setClinicSearch('');
                    setStatusFilter('all');
                    setReadinessFilter('all');
                    setNotesFilter('all');
                  }}
                >
                  {t('common.clearFilters', { defaultValue: 'Clear filters' })}
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-destructive">{t('messages.errorOccurred')}</div>
          ) : filteredClinics.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              {clinics.length === 0
                ? t('clinics.noClinics')
                : t('platformAdmin.clinicGroups.noFilteredClinics', {
                    defaultValue: 'No company groups match these filters.',
                  })}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredClinics}
              getRowId={(clinic) => clinic.id}
              direction={i18n.language === 'ar' ? 'rtl' : 'ltr'}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={clinicDialogOpen} onOpenChange={setClinicDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingClinic
                ? t('platformAdmin.clinicGroups.editClinicGroup', {
                    defaultValue: 'Edit clinic group',
                  })
                : t('platformAdmin.clinicGroups.createClinicGroup', {
                    defaultValue: 'Create clinic group',
                  })}
            </DialogTitle>
            <DialogDescription>
              {t('platformAdmin.clinicGroups.dialogSummary', {
                defaultValue:
                  'Update company-level identity and admin notes.',
              })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClinicSubmit} className="space-y-4">
            <ImpactPanel
              tone={clinicForm.status === 'suspended' ? 'warning' : 'neutral'}
              icon={Building2}
              title={t('platformAdmin.clinicGroups.tenantRecordImpactTitle', {
                defaultValue: 'Tenant record change',
              })}
              description={t('platformAdmin.clinicGroups.dialogDescription', {
                defaultValue:
                  'Company-level details live here. Branch pricing, access, and invoices are managed from branch workbenches.',
              })}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <ImpactMetric
                  label={t('platformAdmin.table.action', {
                    defaultValue: 'Action',
                  })}
                  value={
                    editingClinic
                      ? t('common.edit', { defaultValue: 'Edit' })
                      : t('platformAdmin.clinicGroups.createClinicGroup', {
                          defaultValue: 'Create clinic group',
                        })
                  }
                />
                <ImpactMetric
                  label={t('clinics.status')}
                  value={
                    clinicForm.status === 'active'
                      ? t('clinics.active')
                      : t('clinics.suspended')
                  }
                />
                <ImpactMetric
                  label={t('clinics.slug')}
                  value={clinicForm.slug || '--'}
                />
              </div>
            </ImpactPanel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinic-name">{t('clinics.name')}</Label>
                <Input
                  id="clinic-name"
                  value={clinicForm.name}
                  onChange={(event) => updateClinicField('name', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic-slug">{t('clinics.slug')}</Label>
                <Input
                  id="clinic-slug"
                  value={clinicForm.slug}
                  onChange={(event) => updateClinicField('slug', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('clinics.status')}</Label>
                <Select
                  value={clinicForm.status}
                  onValueChange={(value) => updateClinicField('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('clinics.active')}</SelectItem>
                    <SelectItem value="suspended">{t('clinics.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-notes">{t('clinics.billingNotes')}</Label>
              <Textarea
                id="billing-notes"
                value={clinicForm.billingNotes}
                onChange={(event) => updateClinicField('billingNotes', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinic-change-reason">
                {t('platformAdmin.auditReason', {
                  defaultValue: 'Admin reason',
                })}
              </Label>
              <Textarea
                id="clinic-change-reason"
                value={clinicForm.changeReason}
                onChange={(event) =>
                  updateClinicField('changeReason', event.target.value)
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
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  createClinic.isPending ||
                  updateClinic.isPending ||
                  clinicForm.changeReason.trim().length < 3
                }
              >
                {(createClinic.isPending || updateClinic.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t('platformAdmin.clinicGroups.provisionClinicUser', {
                defaultValue: 'Provision clinic user',
              })}
            </DialogTitle>
            <DialogDescription>
              {t('platformAdmin.clinicGroups.provisionSummary', {
                defaultValue:
                  'Create a scoped account with a forced first-login password change.',
              })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <ImpactPanel
              tone="warning"
              icon={UserPlus}
              title={t('platformAdmin.clinicGroups.userAccessImpactTitle', {
                defaultValue: 'Provision active user access',
              })}
              description={t('platformAdmin.clinicGroups.provisionDescription', {
                defaultValue:
                  'Create a manager, branch manager, doctor, or secretary under the selected clinic group. The temporary password must be changed on first login.',
              })}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <ImpactMetric
                  label={t('users.clinic')}
                  value={selectedProvisionClinic?.name || '--'}
                />
                <ImpactMetric
                  label={t('users.role')}
                  value={selectedProvisionRoleLabel}
                />
                <ImpactMetric
                  label={t('users.branch', { defaultValue: 'Branch' })}
                  value={
                    selectedProvisionBranch?.name ||
                    (selectedProvisionClinic
                      ? t('platformAdmin.clinicGroups.noBranchScope', {
                          defaultValue: 'No branch scope',
                        })
                      : '--')
                  }
                />
              </div>
            </ImpactPanel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('users.clinic')}</Label>
                <Select
                  value={userForm.clinicId}
                  onValueChange={(value) =>
                    setUserForm((current) => ({
                      ...current,
                      clinicId: value,
                      branchId: '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('clinics.selectOverride')} />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={String(clinic.id)}>
                        {clinic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {branchOptions.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('users.branch', { defaultValue: 'Branch' })}</Label>
                  <Select
                    value={userForm.branchId}
                    onValueChange={(value) =>
                      setUserForm((current) => ({ ...current, branchId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('users.branch', { defaultValue: 'Branch' })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {branchOptions.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select
                  value={userForm.roleName}
                  onValueChange={(value) =>
                    setUserForm((current) => ({
                      ...current,
                      roleName: value,
                      canPerformAssessments:
                        value === USER_ROLES.DOCTOR
                          ? current.canPerformAssessments
                          : false,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {provisionableRoles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {t(`users.${role.name}`, { defaultValue: role.name })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-full-name">{t('users.fullName')}</Label>
                <Input
                  id="user-full-name"
                  value={userForm.fullName}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-username">{t('users.username')}</Label>
                <Input
                  id="user-username"
                  value={userForm.username}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-email">{t('users.email')}</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temp-password">{t('users.temporaryPassword')}</Label>
                <Input
                  id="temp-password"
                  type="password"
                  value={userForm.password}
                  onChange={(event) =>
                    setUserForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {userForm.roleName === 'doctor' && (
              <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('users.shifts')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {[DOCTOR_SHIFT.SATURDAY, DOCTOR_SHIFT.SUNDAY].map((shift) => (
                      <Button
                        key={shift}
                        type="button"
                        variant={userForm.shifts.includes(shift) ? 'default' : 'outline'}
                        onClick={() => toggleUserShift(shift)}
                      >
                        {t(`shifts.${shift}`, { defaultValue: shift })}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-order">{t('users.dailyOpsOrder')}</Label>
                  <Input
                    id="daily-order"
                    type="number"
                    min="1"
                    value={userForm.dailyOpnsOrder}
                    onChange={(event) =>
                      setUserForm((current) => ({
                        ...current,
                        dailyOpnsOrder: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('users.assessmentPermission', { defaultValue: 'Assessment permission' })}</Label>
                  <Button
                    type="button"
                    variant={userForm.canPerformAssessments ? 'default' : 'outline'}
                    onClick={() =>
                      setUserForm((current) => ({
                        ...current,
                        canPerformAssessments: !current.canPerformAssessments,
                      }))
                    }
                  >
                    {userForm.canPerformAssessments
                      ? t('users.assessmentAllowed', { defaultValue: 'Allowed' })
                      : t('users.assessmentNotAllowed', { defaultValue: 'Not allowed' })}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="user-provision-change-reason">
                {t('platformAdmin.auditReason', {
                  defaultValue: 'Admin reason',
                })}
              </Label>
              <Textarea
                id="user-provision-change-reason"
                value={userForm.changeReason}
                onChange={(event) =>
                  setUserForm((current) => ({
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

            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  createUser.isPending ||
                  !userForm.clinicId ||
                  userForm.changeReason.trim().length < 3
                }
              >
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('users.createUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
