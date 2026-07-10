import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
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
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.MANAGER]: 'Manager',
  [USER_ROLES.BRANCH_MANAGER]: 'Branch manager',
  [USER_ROLES.DOCTOR]: 'Doctor',
  [USER_ROLES.SECRETARY]: 'Secretary',
};

const PERMISSION_GROUPS = [
  'Platform',
  'Tenant setup',
  'Branch commercial',
  'Clinic operations',
  'Finance',
  'Reporting',
  'Other',
];

const formatRole = (roleName) =>
  ROLE_LABELS[roleName] ||
  String(roleName || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());

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
    return 'Tenant setup';
  }

  if (
    permission.startsWith('branches:') ||
    permission.startsWith('branchSubscriptions:') ||
    permission.startsWith('branchCredits:')
  ) {
    return 'Branch commercial';
  }

  if (
    permission.startsWith('patients:') ||
    permission.startsWith('sessions:') ||
    permission.startsWith('schedules:')
  ) {
    return 'Clinic operations';
  }

  if (
    permission.startsWith('platformBilling:') ||
    permission.startsWith('payments:') ||
    permission.startsWith('invoices:')
  ) {
    return 'Finance';
  }

  if (permission.startsWith('reports:')) {
    return 'Reporting';
  }

  if (permission.includes('manage') || permission.includes('override')) {
    return 'Platform';
  }

  return 'Other';
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
  return (
    <Badge variant={active ? 'default' : 'outline'}>
      {active ? 'Active' : 'Inactive'}
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

function RoleChangeDialog({
  pendingChange,
  onOpenChange,
  onConfirm,
  isLoading,
}) {
  const user = pendingChange?.user;
  const isGrant = pendingChange?.type === 'grant';

  return (
    <Dialog open={Boolean(pendingChange)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isGrant ? 'Grant admin role' : 'Remove admin role'}
          </DialogTitle>
          <DialogDescription>
            {isGrant
              ? 'This user will gain access to the platform admin console and cross-clinic administration.'
              : 'This user will lose platform admin access. Existing non-admin roles will remain assigned.'}
          </DialogDescription>
        </DialogHeader>

        {user && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <UserIdentity user={user} />
            <div className="mt-3 flex flex-wrap gap-2">
              {(user.roles || []).map((role) => (
                <Badge key={role.id || role.name} variant="secondary">
                  {formatRole(role.name)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={isGrant ? 'default' : 'destructive'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGrant ? 'Grant admin' : 'Remove admin'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PlatformGovernancePage() {
  const { user: currentUser } = useAuthStore();
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedRoleName, setSelectedRoleName] = useState(USER_ROLES.ADMIN);
  const [pendingChange, setPendingChange] = useState(null);
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
    return [...roleList].sort((left, right) => {
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
        .filter((permission) => groupPermission(permission) === 'Platform'),
      ).size,
    [roles],
  );

  const refresh = () => {
    rolesQuery.refetch();
    usersQuery.refetch();
    candidatesQuery.refetch();
  };

  const openGrantDialog = (user) => {
    setPendingChange({ type: 'grant', user });
  };

  const openRevokeDialog = (user) => {
    setPendingChange({ type: 'revoke', user });
  };

  const confirmRoleChange = () => {
    if (!pendingChange?.user || !adminRole) return;

    const user = pendingChange.user;
    const existingRoleIds = getRoleIds(user);
    const roleIds =
      pendingChange.type === 'grant'
        ? Array.from(new Set([...existingRoleIds, adminRole.id]))
        : existingRoleIds.filter((roleId) => Number(roleId) !== Number(adminRole.id));

    setUserRoles.mutate(
      { id: user.id, roleIds },
      {
        onSuccess: () => {
          toast.success(
            pendingChange.type === 'grant'
              ? 'Admin role granted'
              : 'Admin role removed',
          );
          setPendingChange(null);
          refresh();
        },
        onError: (error) => {
          toast.error(error?.response?.data?.message || 'Could not update roles');
        },
      },
    );
  };

  const canMutateAdminRole = Boolean(adminRole);
  const isLoading =
    rolesQuery.isLoading || usersQuery.isLoading || candidatesQuery.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform governance"
        description="Audit role permissions and manage platform admin access outside clinic user operations."
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
            aria-label="Refresh governance data"
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
        <Metric label="Admin accounts" value={adminUsers.length} />
        <Metric label="Roles" value={roles.length} />
        <Metric label="Permissions" value={allPermissions} />
        <Metric label="Platform controls" value={platformPermissions} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Admin role custody
              </CardTitle>
              <Badge variant="outline">{adminUsers.length} current</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canMutateAdminRole && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>The admin role was not found in role metadata.</span>
                </div>
              )}

              {usersQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading admin accounts...
                </div>
              ) : adminUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No admin accounts were returned.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">User</th>
                        <th className="px-3 py-2 font-medium">Clinic</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 text-right font-medium">Action</th>
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
                              {user.clinic?.name || 'Platform'}
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
                                Remove admin
                              </Button>
                            </td>
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
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="h-4 w-4" />
                Grant admin role
              </CardTitle>
              <Badge variant="secondary">Global access</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
                placeholder="Filter by name, email, username, or clinic"
              />

              {candidatesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading candidate users...
                </div>
              ) : candidateUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No non-admin users match this filter.
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
                              {formatRole(role.name)}
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
                        disabled={
                          user.isActive === false || !canMutateAdminRole
                        }
                        onClick={() => openGrantDialog(user)}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        Grant admin
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
              <CardTitle className="text-base">Role permission matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {rolesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading role permissions...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Role</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                        {PERMISSION_GROUPS.slice(0, 6).map((group) => (
                          <th
                            key={group}
                            className="px-3 py-2 text-right font-medium"
                          >
                            {group}
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
                              {formatRole(role.name)}
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
                {selectedRole ? formatRole(selectedRole.name) : 'Role detail'}
              </CardTitle>
              {selectedRole && (
                <Badge variant="outline">
                  {(selectedRole.permissions || []).length} permissions
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
                    {formatRole(role.name)}
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
                        <p className="text-sm font-semibold">{group}</p>
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
                  Select a role to inspect permissions.
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
        }}
        onConfirm={confirmRoleChange}
        isLoading={setUserRoles.isPending}
      />

      {isLoading && (
        <p className="text-xs text-muted-foreground">
          Loading governance data...
        </p>
      )}
    </div>
  );
}
