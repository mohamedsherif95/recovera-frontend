import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { ImpactMetric, ImpactPanel } from '@/components/common/ImpactPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';
import { accessApi } from '@/api/endpoints/access';
import { useSetUserRoles, useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/authStore';
import { USER_ROLES } from '@/lib/constants';

const ROLE_ORDER = [
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.DOCTOR,
  USER_ROLES.SECRETARY,
];

const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: {
    key: 'users.admin',
    defaultValue: 'Admin',
  },
  [USER_ROLES.MANAGER]: {
    key: 'users.manager',
    defaultValue: 'Manager',
  },
  [USER_ROLES.BRANCH_MANAGER]: {
    key: 'users.branch_manager',
    defaultValue: 'Branch manager',
  },
  [USER_ROLES.DOCTOR]: {
    key: 'users.doctor',
    defaultValue: 'Doctor',
  },
  [USER_ROLES.SECRETARY]: {
    key: 'users.secretary',
    defaultValue: 'Secretary',
  },
};

const PERMISSION_GROUPS = [
  'platform',
  'tenantSetup',
  'branchCommercial',
  'clinicOperations',
  'finance',
  'reporting',
  'other',
];

const PERMISSION_GROUP_LABELS = {
  platform: {
    key: 'platformGovernance.permissionGroups.platform',
    defaultValue: 'Platform',
  },
  tenantSetup: {
    key: 'platformGovernance.permissionGroups.tenantSetup',
    defaultValue: 'Tenant setup',
  },
  branchCommercial: {
    key: 'platformGovernance.permissionGroups.branchCommercial',
    defaultValue: 'Branch commercial',
  },
  clinicOperations: {
    key: 'platformGovernance.permissionGroups.clinicOperations',
    defaultValue: 'Clinic operations',
  },
  finance: {
    key: 'platformGovernance.permissionGroups.finance',
    defaultValue: 'Finance',
  },
  reporting: {
    key: 'platformGovernance.permissionGroups.reporting',
    defaultValue: 'Reporting',
  },
  other: {
    key: 'platformGovernance.permissionGroups.other',
    defaultValue: 'Other',
  },
};

const formatRole = (roleName, t) => {
  const label = ROLE_LABELS[roleName];
  if (label) return t(label.key, { defaultValue: label.defaultValue });

  return (
    String(roleName || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (value) => value.toUpperCase())
  );
};

const formatPermissionGroup = (group, t) => {
  const label = PERMISSION_GROUP_LABELS[group];
  if (!label) return group;
  return t(label.key, { defaultValue: label.defaultValue });
};

const getUsers = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.users)) return response.users;
  return [];
};

const hasRole = (user, roleName) =>
  user?.roles?.some((role) => role?.name === roleName);

const getRoleIds = (user) =>
  (user?.roles || [])
    .map((role) => role?.id)
    .filter((roleId) => roleId != null)
    .map((roleId) => Number(roleId));

const groupPermission = (permission) => {
  if (
    permission.startsWith('clinics:') ||
    permission.startsWith('users:') ||
    permission.startsWith('access:')
  ) {
    return 'tenantSetup';
  }

  if (
    permission.startsWith('branches:') ||
    permission.startsWith('branchSubscriptions:') ||
    permission.startsWith('branchCredits:')
  ) {
    return 'branchCommercial';
  }

  if (
    permission.startsWith('patients:') ||
    permission.startsWith('sessions:') ||
    permission.startsWith('schedules:')
  ) {
    return 'clinicOperations';
  }

  if (
    permission.startsWith('platformBilling:') ||
    permission.startsWith('payments:') ||
    permission.startsWith('invoices:')
  ) {
    return 'finance';
  }

  if (permission.startsWith('reports:')) {
    return 'reporting';
  }

  if (permission.includes('manage') || permission.includes('override')) {
    return 'platform';
  }

  return 'other';
};

function Metric({ label, value }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function StatusBadge({ active }) {
  const { t } = useTranslation();

  return (
    <Badge variant={active ? 'default' : 'outline'}>
      {active ? t('users.active') : t('users.inactive')}
    </Badge>
  );
}

function UserIdentity({ user }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">
        {user.fullName || user.username || `#${user.id}`}
      </p>
      <p className="truncate text-xs text-muted-foreground">
        {user.email || user.username || '--'}
      </p>
    </div>
  );
}

function UserRoleBadges({ user, t }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(user.roles || []).map((role) => (
        <Badge key={role.id || role.name} variant="secondary">
          {formatRole(role.name, t)}
        </Badge>
      ))}
    </div>
  );
}

function RoleChangeDialog({
  pendingChange,
  onOpenChange,
  onConfirm,
  isLoading,
  changeReason,
  onChangeReason,
}) {
  const { t } = useTranslation();
  const user = pendingChange?.user;
  const isGrant = pendingChange?.type === 'grant';

  return (
    <Dialog open={Boolean(pendingChange)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isGrant
              ? t('platformGovernance.dialog.grantTitle', {
                  defaultValue: 'Grant admin role',
                })
              : t('platformGovernance.dialog.removeTitle', {
                  defaultValue: 'Remove admin role',
                })}
          </DialogTitle>
          <DialogDescription>
            {isGrant
              ? t('platformGovernance.dialog.grantDescription', {
                  defaultValue:
                    'This user will gain access to the platform admin console and cross-clinic administration.',
                })
              : t('platformGovernance.dialog.removeDescription', {
                  defaultValue:
                    'This user will lose platform admin access. Existing non-admin roles will remain assigned.',
                })}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <ImpactPanel
            tone={isGrant ? 'warning' : 'danger'}
            icon={isGrant ? KeyRound : AlertTriangle}
            title={t('platformGovernance.dialog.impactTitle', {
              defaultValue: 'Platform access impact',
            })}
            description={
              isGrant
                ? t('platformGovernance.dialog.grantImpact', {
                    defaultValue:
                      'Granting admin access gives this account platform-wide administrative reach.',
                  })
                : t('platformGovernance.dialog.removeImpact', {
                    defaultValue:
                      'Removing admin access takes this account out of platform administration.',
                  })
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <ImpactMetric
                label={t('platformGovernance.dialog.targetAccount', {
                  defaultValue: 'Target account',
                })}
                value={user.fullName || user.username || `#${user.id}`}
              />
              <ImpactMetric
                label={t('platformGovernance.dialog.resultingAccess', {
                  defaultValue: 'Resulting access',
                })}
                value={
                  isGrant
                    ? t('users.admin', { defaultValue: 'Admin' })
                    : t('platformGovernance.dialog.nonAdminAccess', {
                        defaultValue: 'Non-admin roles only',
                      })
                }
              />
            </div>
            <div className="mt-3 rounded-md border bg-background/80 p-3">
              <UserIdentity user={user} />
              <div className="mt-3">
                <UserRoleBadges user={user} t={t} />
              </div>
            </div>
          </ImpactPanel>
        )}

        <div className="space-y-2">
          <label htmlFor="admin-role-change-reason" className="text-sm font-medium">
            {t('platformAdmin.auditReason', {
              defaultValue: 'Admin reason',
            })}
          </label>
          <Textarea
            id="admin-role-change-reason"
            value={changeReason}
            onChange={(event) => onChangeReason(event.target.value)}
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
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={isGrant ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={isLoading || changeReason.trim().length < 3}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGrant
              ? t('platformGovernance.actions.grantAdmin', {
                  defaultValue: 'Grant admin',
                })
              : t('platformGovernance.actions.removeAdmin', {
                  defaultValue: 'Remove admin',
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformGovernancePage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState(USER_ROLES.ADMIN);
  const [pendingChange, setPendingChange] = useState(null);
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const setUserRoles = useSetUserRoles();

  const rolesQuery = useQuery({
    queryKey: ['access', 'roles-permissions'],
    queryFn: accessApi.getRolesPermissions,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useUsers({
    page: 1,
    limit: 100,
  });

  const candidatesQuery = useUsers({
    page: 1,
    limit: 100,
    search: candidateSearch.trim() || undefined,
  });

  const roles = useMemo(() => {
    const roleList = Array.isArray(rolesQuery.data) ? rolesQuery.data : [];
    return roleList.map((role) => ({
      ...role,
      permissions: role.permissions || [],
    })).sort((left, right) => {
      const leftIndex = ROLE_ORDER.indexOf(left.name);
      const rightIndex = ROLE_ORDER.indexOf(right.name);
      return (
        (leftIndex === -1 ? 99 : leftIndex) -
        (rightIndex === -1 ? 99 : rightIndex)
      );
    });
  }, [rolesQuery.data]);
  const adminRole = roles.find((role) => role.name === USER_ROLES.ADMIN);
  const adminUsers = useMemo(
    () => getUsers(usersQuery.data).filter((user) => hasRole(user, USER_ROLES.ADMIN)),
    [usersQuery.data],
  );
  const candidateUsers = useMemo(() => {
    const normalizedSearch = candidateSearch.trim().toLowerCase();
    return getUsers(candidatesQuery.data)
      .filter((user) => !hasRole(user, USER_ROLES.ADMIN))
      .filter((user) => {
        if (!normalizedSearch) return true;
        return [user.fullName, user.username, user.email, user.clinic?.name]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
      .slice(0, 8);
  }, [candidateSearch, candidatesQuery.data]);
  const selectedRole =
    roles.find((role) => role.name === selectedRoleName) || roles[0] || null;
  const selectedRoleGroups = useMemo(() => {
    const groups = {};
    for (const permission of selectedRole?.permissions || []) {
      const group = groupPermission(permission);
      groups[group] = [...(groups[group] || []), permission];
    }
    return groups;
  }, [selectedRole]);

  const allPermissions = useMemo(
    () => new Set(roles.flatMap((role) => role.permissions || [])).size,
    [roles],
  );
  const platformPermissions = useMemo(
    () =>
      new Set(
        roles
        .flatMap((role) => role.permissions || [])
        .filter((permission) => groupPermission(permission) === 'platform'),
      ).size,
    [roles],
  );

  const refresh = () => {
    rolesQuery.refetch();
    usersQuery.refetch();
    candidatesQuery.refetch();
  };

  const openGrantDialog = (user) => {
    setRoleChangeReason('');
    setPendingChange({ type: 'grant', user });
  };

  const openRevokeDialog = (user) => {
    setRoleChangeReason('');
    setPendingChange({ type: 'revoke', user });
  };

  const confirmRoleChange = () => {
    if (
      !pendingChange?.user ||
      !adminRole ||
      roleChangeReason.trim().length < 3
    ) {
      return;
    }

    const user = pendingChange.user;
    const existingRoleIds = getRoleIds(user);
    const roleIds =
      pendingChange.type === 'grant'
        ? Array.from(new Set([...existingRoleIds, adminRole.id]))
        : existingRoleIds.filter((roleId) => Number(roleId) !== Number(adminRole.id));

    setUserRoles.mutate(
      { id: user.id, roleIds, changeReason: roleChangeReason.trim() },
      {
        onSuccess: () => {
          toast.success(
            pendingChange.type === 'grant'
              ? t('platformGovernance.toasts.adminGranted', {
                  defaultValue: 'Admin role granted',
                })
              : t('platformGovernance.toasts.adminRemoved', {
                  defaultValue: 'Admin role removed',
                }),
          );
          setPendingChange(null);
          setRoleChangeReason('');
          refresh();
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message ||
              t('platformGovernance.toasts.updateFailed', {
                defaultValue: 'Could not update roles',
              }),
          );
        },
      },
    );
  };

  const canMutateAdminRole = Boolean(adminRole);
  const isLoading =
    rolesQuery.isLoading || usersQuery.isLoading || candidatesQuery.isLoading;
  const adminCustodyTone = adminUsers.length <= 1 ? 'warning' : 'neutral';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('platformGovernance.title', {
          defaultValue: 'Platform governance',
        })}
        description={t('platformGovernance.description', {
          defaultValue:
            'Audit role permissions and manage platform admin access outside clinic user operations.',
        })}
        actions={
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={
              rolesQuery.isFetching ||
              usersQuery.isFetching ||
              candidatesQuery.isFetching
            }
            aria-label={t('platformGovernance.refreshAria', {
              defaultValue: 'Refresh governance data',
            })}
          >
            <RefreshCcw
              className={`h-4 w-4 ${
                rolesQuery.isFetching ||
                usersQuery.isFetching ||
                candidatesQuery.isFetching
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric
          label={t('platformGovernance.metrics.adminAccounts', {
            defaultValue: 'Admin accounts',
          })}
          value={adminUsers.length}
        />
        <Metric
          label={t('platformGovernance.metrics.roles', {
            defaultValue: 'Roles',
          })}
          value={roles.length}
        />
        <Metric
          label={t('platformGovernance.metrics.permissions', {
            defaultValue: 'Permissions',
          })}
          value={allPermissions}
        />
        <Metric
          label={t('platformGovernance.metrics.platformControls', {
            defaultValue: 'Platform controls',
          })}
          value={platformPermissions}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                {t('platformGovernance.adminCustody.title', {
                  defaultValue: 'Admin role custody',
                })}
              </CardTitle>
              <Badge variant="outline">
                {t('platformGovernance.adminCustody.currentCount', {
                  count: adminUsers.length,
                  defaultValue: '{{count}} current',
                })}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImpactPanel
                tone={adminCustodyTone}
                icon={ShieldCheck}
                title={t('platformGovernance.adminCustody.impactTitle', {
                  defaultValue: 'Admin access is platform-wide',
                })}
                description={t('platformGovernance.adminCustody.impactDescription', {
                  defaultValue:
                    'Granting or removing this role changes who can operate the admin console across clinic groups.',
                })}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <ImpactMetric
                    label={t('platformGovernance.metrics.adminAccounts', {
                      defaultValue: 'Admin accounts',
                    })}
                    value={adminUsers.length}
                  />
                  <ImpactMetric
                    label={t('platformGovernance.metrics.platformControls', {
                      defaultValue: 'Platform controls',
                    })}
                    value={platformPermissions}
                  />
                  <ImpactMetric
                    label={t('platformGovernance.adminCustody.auditRequirement', {
                      defaultValue: 'Audit requirement',
                    })}
                    value={t('platformGovernance.adminCustody.reasonRequired', {
                      defaultValue: 'Reason required',
                    })}
                  />
                </div>
              </ImpactPanel>

              {!canMutateAdminRole && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t('platformGovernance.adminCustody.missingRole', {
                      defaultValue: 'The admin role was not found in role metadata.',
                    })}
                  </span>
                </div>
              )}

              {usersQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('platformGovernance.adminCustody.loading', {
                    defaultValue: 'Loading admin accounts...',
                  })}
                </div>
              ) : adminUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('platformGovernance.adminCustody.empty', {
                    defaultValue: 'No admin accounts were returned.',
                  })}
                </p>
              ) : (
                <>
                <div className="hidden overflow-x-auto rounded-md border md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          {t('platformGovernance.table.user', {
                            defaultValue: 'User',
                          })}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t('platformGovernance.table.clinic', {
                            defaultValue: 'Clinic',
                          })}
                        </th>
                        <th className="px-3 py-2 font-medium">
                          {t('platformGovernance.table.status', {
                            defaultValue: 'Status',
                          })}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t('platformGovernance.table.action', {
                            defaultValue: 'Action',
                          })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map((user) => {
                        const isSelf = Number(user.id) === Number(currentUser?.id);
                        const isLastAdmin = adminUsers.length <= 1;
                        return (
                          <tr key={user.id} className="border-t">
                            <td className="px-3 py-2">
                              <UserIdentity user={user} />
                            </td>
                            <td className="px-3 py-2">
                              {user.clinic?.name ||
                                t('platformGovernance.platformClinic', {
                                  defaultValue: 'Platform',
                                })}
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge active={user.isActive !== false} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={isSelf || isLastAdmin || !canMutateAdminRole}
                                onClick={() => openRevokeDialog(user)}
                              >
                                {t('platformGovernance.actions.removeAdmin', {
                                  defaultValue: 'Remove admin',
                                })}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 md:hidden">
                  {adminUsers.map((user) => {
                    const isSelf = Number(user.id) === Number(currentUser?.id);
                    const isLastAdmin = adminUsers.length <= 1;
                    return (
                      <div key={user.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <UserIdentity user={user} />
                          <StatusBadge active={user.isActive !== false} />
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">
                          {user.clinic?.name ||
                            t('platformGovernance.platformClinic', {
                              defaultValue: 'Platform',
                            })}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="mt-3 w-full"
                          disabled={isSelf || isLastAdmin || !canMutateAdminRole}
                          onClick={() => openRevokeDialog(user)}
                        >
                          {t('platformGovernance.actions.removeAdmin', {
                            defaultValue: 'Remove admin',
                          })}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="h-4 w-4" />
                {t('platformGovernance.grant.title', {
                  defaultValue: 'Grant admin role',
                })}
              </CardTitle>
              <Badge variant="secondary">
                {t('platformGovernance.grant.badge', {
                  defaultValue: 'Global access',
                })}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImpactPanel
                tone="warning"
                icon={KeyRound}
                title={t('platformGovernance.grant.impactTitle', {
                  defaultValue: 'Grant with deliberate custody',
                })}
                description={t('platformGovernance.grant.impactDescription', {
                  defaultValue:
                    'Only grant this role to accounts that should perform platform administration outside clinic workspaces.',
                })}
              />

              <Input
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
                placeholder={t('platformGovernance.grant.searchPlaceholder', {
                  defaultValue: 'Filter by name, email, username, or clinic',
                })}
              />

              {candidatesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('platformGovernance.grant.loading', {
                    defaultValue: 'Loading candidate users...',
                  })}
                </div>
              ) : candidateUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('platformGovernance.grant.empty', {
                    defaultValue: 'No non-admin users match this filter.',
                  })}
                </p>
              ) : (
                <div className="rounded-md border">
                  {candidateUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-3 border-b p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <UserIdentity user={user} />
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(user.roles || []).map((role) => (
                            <Badge key={role.id || role.name} variant="outline">
                              {formatRole(role.name, t)}
                            </Badge>
                          ))}
                          {user.clinic?.name && (
                            <Badge variant="secondary">{user.clinic.name}</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={
                          user.isActive === false || !canMutateAdminRole
                        }
                        onClick={() => openGrantDialog(user)}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t('platformGovernance.actions.grantAdmin', {
                          defaultValue: 'Grant admin',
                        })}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('platformGovernance.matrix.title', {
                  defaultValue: 'Role permission matrix',
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rolesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('platformGovernance.matrix.loading', {
                    defaultValue: 'Loading role permissions...',
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          {t('platformGovernance.table.role', {
                            defaultValue: 'Role',
                          })}
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          {t('platformGovernance.table.total', {
                            defaultValue: 'Total',
                          })}
                        </th>
                        {PERMISSION_GROUPS.slice(0, 6).map((group) => (
                          <th
                            key={group}
                            className="px-3 py-2 text-right font-medium"
                          >
                            {formatPermissionGroup(group, t)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {roles.map((role) => {
                        const counts = PERMISSION_GROUPS.reduce((acc, group) => {
                          acc[group] = (role.permissions || []).filter(
                            (permission) => groupPermission(permission) === group,
                          ).length;
                          return acc;
                        }, {});
                        return (
                          <tr
                            key={role.id || role.name}
                            className="cursor-pointer border-t hover:bg-muted/40"
                            onClick={() => setSelectedRoleName(role.name)}
                          >
                            <td className="px-3 py-2 font-medium">
                              {formatRole(role.name, t)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {(role.permissions || []).length}
                            </td>
                            {PERMISSION_GROUPS.slice(0, 6).map((group) => (
                              <td key={group} className="px-3 py-2 text-right">
                                {counts[group] || 0}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">
                {selectedRole
                  ? formatRole(selectedRole.name, t)
                  : t('platformGovernance.detail.fallbackTitle', {
                      defaultValue: 'Role detail',
                    })}
              </CardTitle>
              {selectedRole && (
                <Badge variant="outline">
                  {t('platformGovernance.detail.permissionsCount', {
                    count: (selectedRole.permissions || []).length,
                    defaultValue: '{{count}} permissions',
                  })}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <Button
                    key={role.id || role.name}
                    type="button"
                    size="sm"
                    variant={
                      role.name === selectedRoleName ? 'default' : 'outline'
                    }
                    onClick={() => setSelectedRoleName(role.name)}
                  >
                    {formatRole(role.name, t)}
                  </Button>
                ))}
              </div>

              {selectedRole ? (
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => {
                    const permissions = selectedRoleGroups[group] || [];
                    if (!permissions.length) return null;
                    return (
                      <div key={group} className="space-y-2">
                        <p className="text-sm font-semibold">
                          {formatPermissionGroup(group, t)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {permissions.map((permission) => (
                            <Badge key={permission} variant="secondary">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('platformGovernance.detail.selectRole', {
                    defaultValue: 'Select a role to inspect permissions.',
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RoleChangeDialog
        pendingChange={pendingChange}
        onOpenChange={(open) => {
          if (!open) setPendingChange(null);
          if (!open) setRoleChangeReason('');
        }}
        onConfirm={confirmRoleChange}
        isLoading={setUserRoles.isPending}
        changeReason={roleChangeReason}
        onChangeReason={setRoleChangeReason}
      />

      {isLoading && (
        <p className="text-xs text-muted-foreground">
          {t('platformGovernance.loadingData', {
            defaultValue: 'Loading governance data...',
          })}
        </p>
      )}
    </div>
  );
}
