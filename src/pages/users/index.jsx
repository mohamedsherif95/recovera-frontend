import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useUsers,
  useToggleUserActive,
  useSetUserRoles,
  useSetUserShifts,
  useUpdateUser,
  useCreateUser,
} from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS, DOCTOR_SHIFT, USER_ROLES } from '@/lib/constants';
import { useQuery } from '@tanstack/react-query';
import { accessApi } from '@/api/endpoints/access';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useClinics } from '@/hooks/useClinics';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, RefreshCcw, ShieldCheck, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveEffectiveClinicId } from '@/lib/branchScope';

const emptyCreateForm = {
  clinicId: '',
  branchIds: [],
  primaryBranchId: '',
  fullName: '',
  username: '',
  email: '',
  password: '',
  roleName: 'doctor',
  shifts: [],
  dailyOpnsOrder: '',
  canPerformAssessments: false,
};

const MANAGER_CREATE_ROLE_NAMES = [
  USER_ROLES.BRANCH_MANAGER,
  USER_ROLES.DOCTOR,
  USER_ROLES.SECRETARY,
];

const hasRoleName = (user, roleName) =>
  user?.roles?.some((role) => role?.name === roleName);

const isAdminAccount = (user) =>
  user?.isPlatformAdmin || hasRoleName(user, USER_ROLES.ADMIN);

function AdminMetric({ label, value }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { can } = usePermissions();
  const { user: currentUser } = useAuthStore();
  const { clinicOverrideId, platformAdminClinicId } = useUIStore();

  const isPlatformAdmin =
    currentUser?.isPlatformAdmin ||
    hasRoleName(currentUser, USER_ROLES.ADMIN);
  const isPlatformAdminRoute = location.pathname.startsWith('/platform-admin');
  const canCreateUser = can(PERMISSIONS['users:create']);
  const canManageRoles = isPlatformAdmin && can(PERMISSIONS['users:manageRoles']);
  const canToggleStatus = can(PERMISSIONS['users:update']);
  const effectiveClinicId = isPlatformAdminRoute
    ? platformAdminClinicId
    : resolveEffectiveClinicId(currentUser, clinicOverrideId);
  const needsClinicSelection = Boolean(isPlatformAdminRoute && !platformAdminClinicId);
  const platformScopeOptions =
    isPlatformAdminRoute && platformAdminClinicId
      ? { platformClinicId: platformAdminClinicId }
      : {};

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentUser, setAssignmentUser] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    branchIds: [],
    primaryBranchId: '',
  });

  const { data, isLoading, isError, refetch, isFetching } = useUsers(
    {
      page,
      limit: pageSize,
      branchId: branchFilter !== 'all' ? Number(branchFilter) : undefined,
    },
    {
      enabled: !needsClinicSelection,
      ...platformScopeOptions,
    },
  );

  const toggleActive = useToggleUserActive();
  const setUserRoles = useSetUserRoles();
  const setUserShifts = useSetUserShifts();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const { data: clinicsData } = useClinics(Boolean(isPlatformAdmin && canCreateUser));
  const { data: currentBranchesData } = useBranches({
    enabled: Boolean(effectiveClinicId),
    ...platformScopeOptions,
  });

  const { data: rolesPermissions } = useQuery({
    queryKey: ['access', 'roles-permissions'],
    queryFn: accessApi.getRolesPermissions,
    staleTime: 5 * 60 * 1000,
  });

  const allRoles = useMemo(() => {
    if (!Array.isArray(rolesPermissions)) return [];

    const seen = new Set();
    const roles = [];

    rolesPermissions.forEach((role) => {
      const name = role?.name || role?.roleName;
      const id = role?.id;
      if (!name || seen.has(name)) return;
      if (id == null) return; // avoid sending null IDs
      seen.add(name);
      roles.push({ id, name });
    });

    return roles;
  }, [rolesPermissions]);

  const clinics = useMemo(() => {
    if (Array.isArray(clinicsData)) return clinicsData;
    if (Array.isArray(clinicsData?.data)) return clinicsData.data;
    return [];
  }, [clinicsData]);
  const currentBranches = useMemo(() => {
    if (Array.isArray(currentBranchesData)) return currentBranchesData;
    if (Array.isArray(currentBranchesData?.data)) return currentBranchesData.data;
    return [];
  }, [currentBranchesData]);
  const selectedCreateClinicId = isPlatformAdminRoute
    ? platformAdminClinicId
    : isPlatformAdmin
      ? Number(createForm.clinicId || 0) || null
      : effectiveClinicId;
  const { data: createBranchesData } = useBranches({
    enabled: Boolean(canCreateUser && createDialogOpen && selectedCreateClinicId),
    platformClinicId: isPlatformAdmin ? selectedCreateClinicId ?? undefined : undefined,
  });
  const createBranches = useMemo(() => {
    if (!isPlatformAdmin) {
      return currentBranches;
    }

    if (Array.isArray(createBranchesData)) return createBranchesData;
    if (Array.isArray(createBranchesData?.data)) return createBranchesData.data;
    return [];
  }, [createBranchesData, currentBranches, isPlatformAdmin]);

  const createRoleOptions = useMemo(() => {
    return allRoles.filter((role) => {
      if (role.name === USER_ROLES.ADMIN) return false;
      if (isPlatformAdmin) {
        return [
          USER_ROLES.MANAGER,
          USER_ROLES.BRANCH_MANAGER,
          USER_ROLES.DOCTOR,
          USER_ROLES.SECRETARY,
        ].includes(role.name);
      }
      return MANAGER_CREATE_ROLE_NAMES.includes(role.name);
    });
  }, [allRoles, isPlatformAdmin]);

  const users = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.users)) return data.users;
    return [];
  }, [data]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (roleFilter !== 'all') {
        const hasRole = user.roles?.some((r) => r.name === roleFilter);
        if (!hasRole) return false;
      }

      if (statusFilter === 'active' && user.isActive === false) return false;
      if (statusFilter === 'inactive' && user.isActive === true) return false;

      return true;
    });
  }, [users, roleFilter, statusFilter]);

  const totalUsers = data?.total ?? data?.meta?.total ?? users.length;
  const totalPages = totalUsers ? Math.ceil(totalUsers / pageSize) : 1;
  const userSummary = useMemo(() => {
    const active = users.filter((user) => user.isActive !== false).length;
    const managers = users.filter(
      (user) =>
        hasRoleName(user, USER_ROLES.MANAGER) ||
        hasRoleName(user, USER_ROLES.BRANCH_MANAGER),
    ).length;
    const logisticsUsers = users.filter(
      (user) =>
        hasRoleName(user, USER_ROLES.SECRETARY) ||
        hasRoleName(user, USER_ROLES.DOCTOR),
    ).length;
    const admins = users.filter(isAdminAccount).length;

    return {
      total: totalUsers,
      active,
      managers,
      logisticsUsers,
      admins,
    };
  }, [totalUsers, users]);

  const getUserBranchIds = (user) => {
    if (Array.isArray(user?.branchAssignments) && user.branchAssignments.length > 0) {
      return user.branchAssignments
        .map((assignment) => assignment.branchId ?? assignment.branch?.id)
        .filter((branchId) => branchId != null)
        .map((branchId) => Number(branchId));
    }

    if (Array.isArray(user?.assignedBranches) && user.assignedBranches.length > 0) {
      return user.assignedBranches
        .map((branch) => branch?.id)
        .filter((branchId) => branchId != null)
        .map((branchId) => Number(branchId));
    }

    if (user?.branchId != null) return [Number(user.branchId)];
    if (user?.branch?.id != null) return [Number(user.branch.id)];
    return [];
  };

  const getUserPrimaryBranchId = (user) => {
    if (user?.primaryBranchId != null) return Number(user.primaryBranchId);

    const primaryAssignment = user?.branchAssignments?.find(
      (assignment) => assignment.isPrimary === true,
    );
    if (primaryAssignment?.branchId != null) return Number(primaryAssignment.branchId);
    if (primaryAssignment?.branch?.id != null) return Number(primaryAssignment.branch.id);

    const primaryAssignedBranch = user?.assignedBranches?.find(
      (branch) => branch.isPrimary === true,
    );
    if (primaryAssignedBranch?.id != null) return Number(primaryAssignedBranch.id);

    const branchIds = getUserBranchIds(user);
    return branchIds[0] ?? null;
  };

  const getBranchName = (branchId, fallback = null) => {
    const branch = currentBranches.find(
      (item) => Number(item.id) === Number(branchId),
    );
    return branch?.name || fallback || `#${branchId}`;
  };

  const handleToggleActive = (user) => {
    if (!canToggleStatus) return;
    const next = !user.isActive;
    toggleActive.mutate({ id: user.id, isActive: next, options: platformScopeOptions });
  };

  const handleRoleChange = (user, newRoleName) => {
    if (!canManageRoles) return;

    const currentNames = user.roles?.map((r) => r.name) || [];

    let nextNames;
    if (newRoleName === 'none') {
      nextNames = [];
    } else if (currentNames.includes(newRoleName)) {
      // toggle off
      nextNames = currentNames.filter((name) => name !== newRoleName);
    } else {
      // toggle on
      nextNames = [...currentNames, newRoleName];
    }

    const roleIds = allRoles
      .filter((r) => nextNames.includes(r.name))
      .map((r) => r.id);

    setUserRoles.mutate({ id: user.id, roleIds, options: platformScopeOptions });
  };

  const handleShiftToggle = (user, shiftValue) => {
    if (!canToggleStatus) return;
    const currentShifts = user.shifts || [];
    let newShifts;
    if (currentShifts.includes(shiftValue)) {
      // Remove shift
      newShifts = currentShifts.filter((s) => s !== shiftValue);
    } else {
      // Add shift
      newShifts = [...currentShifts, shiftValue];
    }
    setUserShifts.mutate({ id: user.id, shifts: newShifts, options: platformScopeOptions });
  };

  const handleDailyOpsOrderChange = (user, value) => {
    if (!canToggleStatus) return;
    const nextValue = Number.parseInt(value, 10);
    if (Number.isNaN(nextValue)) return;
    if (nextValue === user.dailyOpnsOrder) return;
    updateUser.mutate({
      id: user.id,
      data: { dailyOpnsOrder: nextValue },
      options: platformScopeOptions,
    });
  };

  const handleAssessmentPermissionToggle = (user) => {
    if (!canToggleStatus || !isDoctor(user)) return;
    updateUser.mutate({
      id: user.id,
      data: { canPerformAssessments: user.canPerformAssessments !== true },
      options: platformScopeOptions,
    });
  };

  const isDoctor = (user) => user.roles?.some((r) => r.name === 'doctor');

  const openCreateDialog = () => {
    setCreateForm({
      ...emptyCreateForm,
      clinicId: isPlatformAdminRoute
        ? String(platformAdminClinicId ?? '')
        : isPlatformAdmin
          ? ''
          : String(effectiveClinicId ?? ''),
      roleName: isPlatformAdmin ? USER_ROLES.MANAGER : USER_ROLES.DOCTOR,
    });
    setCreateDialogOpen(true);
  };

  useEffect(() => {
    if (branchFilter === 'all') return;

    const branchExists = currentBranches.some(
      (branch) => String(branch.id) === String(branchFilter),
    );
    if (!branchExists) {
      setBranchFilter('all');
    }
  }, [branchFilter, currentBranches]);

  useEffect(() => {
    if (!createDialogOpen) return;

    setCreateForm((current) => {
      if (!createBranches.length) {
        if (!current.branchIds.length && !current.primaryBranchId) return current;
        return { ...current, branchIds: [], primaryBranchId: '' };
      }

      const validBranchIds = current.branchIds.filter((branchId) =>
        createBranches.some((branch) => String(branch.id) === String(branchId)),
      );
      const primaryBranchExists = validBranchIds.some(
        (branchId) => String(branchId) === String(current.primaryBranchId),
      );
      if (validBranchIds.length > 0 && primaryBranchExists) {
        if (validBranchIds.length === current.branchIds.length) return current;
        return {
          ...current,
          branchIds: validBranchIds,
        };
      }

      const defaultBranch =
        createBranches.find((branch) => branch.isDefault) || createBranches[0];
      return {
        ...current,
        branchIds: defaultBranch ? [String(defaultBranch.id)] : [],
        primaryBranchId: defaultBranch ? String(defaultBranch.id) : '',
      };
    });
  }, [createBranches, createDialogOpen]);

  const toggleCreateBranch = (branchId) => {
    const normalizedBranchId = String(branchId);

    setCreateForm((current) => {
      const isAssigned = current.branchIds.includes(normalizedBranchId);
      const branchIds = isAssigned
        ? current.branchIds.filter((id) => id !== normalizedBranchId)
        : [...current.branchIds, normalizedBranchId];
      const primaryBranchId = branchIds.includes(current.primaryBranchId)
        ? current.primaryBranchId
        : branchIds[0] || '';

      return {
        ...current,
        branchIds,
        primaryBranchId,
      };
    });
  };

  const toggleCreateShift = (shiftValue) => {
    setCreateForm((current) => ({
      ...current,
      shifts: current.shifts.includes(shiftValue)
        ? current.shifts.filter((shift) => shift !== shiftValue)
        : [...current.shifts, shiftValue],
    }));
  };

  const handleCreateUser = (event) => {
    event.preventDefault();
    const role = createRoleOptions.find((item) => item.name === createForm.roleName);
    if (!role) {
      toast.error('Select a valid role');
      return;
    }

    const payload = {
      fullName: createForm.fullName.trim(),
      username: createForm.username.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      roleIds: [role.id],
      isActive: true,
      shifts: createForm.roleName === 'doctor' ? createForm.shifts : [],
      canPerformAssessments:
        createForm.roleName === 'doctor'
          ? createForm.canPerformAssessments === true
          : false,
      dailyOpnsOrder:
        createForm.roleName === 'doctor' && createForm.dailyOpnsOrder
          ? Number(createForm.dailyOpnsOrder)
          : undefined,
    };

    if (isPlatformAdmin) {
      payload.clinicId = isPlatformAdminRoute
        ? Number(platformAdminClinicId)
        : Number(createForm.clinicId);
    }
    if (createForm.branchIds.length > 0) {
      payload.branchIds = createForm.branchIds.map((branchId) => Number(branchId));
      payload.primaryBranchId = createForm.primaryBranchId
        ? Number(createForm.primaryBranchId)
        : payload.branchIds[0];
    }

    createUser
      .mutateAsync({ data: payload, options: platformScopeOptions })
      .then(() => {
        toast.success('User provisioned with forced first-login password change');
        setCreateDialogOpen(false);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Could not create user');
      });
  };

  const openAssignmentDialog = (user) => {
    const branchIds = getUserBranchIds(user).map((branchId) => String(branchId));
    const primaryBranchId = getUserPrimaryBranchId(user);

    setAssignmentUser(user);
    setAssignmentForm({
      branchIds,
      primaryBranchId: primaryBranchId != null ? String(primaryBranchId) : branchIds[0] || '',
    });
    setAssignmentDialogOpen(true);
  };

  const toggleAssignmentBranch = (branchId) => {
    const normalizedBranchId = String(branchId);

    setAssignmentForm((current) => {
      const isAssigned = current.branchIds.includes(normalizedBranchId);
      const branchIds = isAssigned
        ? current.branchIds.filter((id) => id !== normalizedBranchId)
        : [...current.branchIds, normalizedBranchId];
      const primaryBranchId = branchIds.includes(current.primaryBranchId)
        ? current.primaryBranchId
        : branchIds[0] || '';

      return {
        branchIds,
        primaryBranchId,
      };
    });
  };

  const handleSaveAssignments = () => {
    if (!assignmentUser) return;
    if (!assignmentForm.branchIds.length) {
      toast.error('Select at least one branch');
      return;
    }

    const branchIds = assignmentForm.branchIds.map((branchId) => Number(branchId));
    const primaryBranchId = assignmentForm.primaryBranchId
      ? Number(assignmentForm.primaryBranchId)
      : branchIds[0];

    updateUser
      .mutateAsync({
        id: assignmentUser.id,
        data: {
          branchIds,
          primaryBranchId,
        },
        options: platformScopeOptions,
      })
      .then(() => {
        toast.success('Branch assignments updated');
        setAssignmentDialogOpen(false);
        setAssignmentUser(null);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Could not update branch assignments');
      });
  };

  const columns = useMemo(
    () => [
      {
        key: 'fullName',
        header: t('users.fullName'),
        cell: (row) => row.fullName || row.username || `#${row.id}`,
      },
      {
        key: 'username',
        header: t('users.username'),
        cell: (row) => row.username || '--',
      },
      {
        key: 'email',
        header: t('users.email'),
        cell: (row) => row.email || '--',
      },
      {
        key: 'branch',
        header: t('users.branches', { defaultValue: 'Branches' }),
        cell: (row) => {
          const assignedBranchIds = getUserBranchIds(row);
          const primaryBranchId = getUserPrimaryBranchId(row);
          const assignedBranchLabels = assignedBranchIds.map((branchId) =>
            getBranchName(
              branchId,
              row.branchAssignments?.find(
                (assignment) => Number(assignment.branchId) === Number(branchId),
              )?.branch?.name,
            ),
          );
          const summary = assignedBranchLabels.length
            ? assignedBranchLabels.join(', ')
            : row.branch?.name || '--';
          const primaryLabel =
            primaryBranchId != null
              ? getBranchName(primaryBranchId, row.branch?.name)
              : null;
          const isPlatformAdminUser = isAdminAccount(row);
          const canEditBranchAssignment = canToggleStatus && !isPlatformAdminUser;

          return (
            <div className="flex min-w-[220px] items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{summary}</div>
                {primaryLabel && assignedBranchLabels.length > 1 && (
                  <div className="truncate text-[11px] text-muted-foreground">
                    {t('branches.primaryBranch', { defaultValue: 'Primary branch' })}: {primaryLabel}
                  </div>
                )}
              </div>
              {canEditBranchAssignment && currentBranches.length > 0 && (
                <Button
                  size="xs"
                  variant="outline"
                  className="h-7 px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAssignmentDialog(row);
                  }}
                >
                  {t('common.manage', { defaultValue: 'Manage' })}
                </Button>
              )}
            </div>
          );
        },
      },
      {
        key: 'roles',
        header: t('users.roles'),
        cell: (row) => {
          const names = row.roles?.map((r) => r.name) || [];
          if (!canManageRoles) {
            return names.length
              ? names
                  .map((name) =>
                    t(`users.${name}`, {
                      defaultValue: name,
                    }),
                  )
                  .join(', ')
              : '--';
          }

          return (
            <div className="flex flex-wrap gap-1">
              {isAdminAccount(row) && (
                <Badge variant="destructive" className="rounded-full px-3 py-1">
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Admin
                </Badge>
              )}
              {allRoles
                .filter((role) => role.name !== USER_ROLES.ADMIN)
                .map((role) => {
                const isAssigned = names.includes(role.name);
                return (
                  <Button
                    key={role.name}
                    size="xs"
                    variant={isAssigned ? 'default' : 'outline'}
                    className="px-4 py-1 rounded-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRoleChange(row, role.name);
                    }}
                  >
                    {t(`users.${role.name}`, { defaultValue: role.name })}
                  </Button>
                );
              })}
            </div>
          );
        },
      },
      {
        key: 'shifts',
        header: t('users.shifts', { defaultValue: 'Shifts' }),
        className: 'w-48',
        cellClassName: 'w-48',
        cell: (row) => {
          if (!isDoctor(row)) return '--';
          const shifts = row.shifts || [];
          if (!canToggleStatus) {
            return shifts.length
              ? shifts.map((s) => t(`shifts.${s}`, { defaultValue: s })).join(', ')
              : '--';
          }
          return (
            <div className="flex flex-wrap gap-1">
              {[DOCTOR_SHIFT.SATURDAY, DOCTOR_SHIFT.SUNDAY].map((shiftVal) => {
                const isAssigned = shifts.includes(shiftVal);
                return (
                  <Button
                    key={shiftVal}
                    size="xs"
                    variant={isAssigned ? 'default' : 'outline'}
                    className="px-3 py-1 rounded-full text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShiftToggle(row, shiftVal);
                    }}
                    disabled={setUserShifts.isPending}
                  >
                    {t(`shifts.${shiftVal}`, { defaultValue: shiftVal })}
                  </Button>
                );
              })}
            </div>
          );
        },
      },
      {
        key: 'canPerformAssessments',
        header: t('users.assessmentPermission', {
          defaultValue: 'Assessment permission',
        }),
        className: 'w-44',
        cellClassName: 'w-44',
        cell: (row) => {
          if (!isDoctor(row)) return '--';
          const canPerformAssessments = row.canPerformAssessments === true;

          if (!canToggleStatus) {
            return canPerformAssessments
              ? t('users.assessmentAllowed', { defaultValue: 'Allowed' })
              : t('users.assessmentNotAllowed', { defaultValue: 'Not allowed' });
          }

          return (
            <Button
              size="xs"
              variant={canPerformAssessments ? 'default' : 'outline'}
              className="h-7 rounded-full px-3 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleAssessmentPermissionToggle(row);
              }}
              disabled={updateUser.isPending}
            >
              {canPerformAssessments
                ? t('users.assessmentAllowed', { defaultValue: 'Allowed' })
                : t('users.assessmentNotAllowed', { defaultValue: 'Not allowed' })}
            </Button>
          );
        },
      },
      {
        key: 'dailyOpnsOrder',
        header: t('users.dailyOpsOrder', { defaultValue: 'Daily Ops Order' }),
        className: 'w-32',
        cellClassName: 'w-32',
        cell: (row) => {
          if (!isDoctor(row)) return '--';
          if (!canToggleStatus) return row.dailyOpnsOrder ?? '--';

          return (
            <Input
              key={`${row.id}-${row.dailyOpnsOrder ?? ''}`}
              type="number"
              min={1}
              defaultValue={row.dailyOpnsOrder ?? ''}
              className="h-8 w-24"
              onBlur={(e) => handleDailyOpsOrderChange(row, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              disabled={updateUser.isPending}
            />
          );
        },
      },
      {
        key: 'status',
        header: t('users.status'),
        className: 'w-32',
        cellClassName: 'w-32',
        cell: (row) => (
          <Button
            size="xs"
            variant={row.isActive ? 'default' : 'outline'}
            className="h-7 w-full rounded-full px-3 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(row);
            }}
            disabled={!canToggleStatus || toggleActive.isPending}
          >
            {row.isActive ? t('users.active') : t('users.inactive')}
          </Button>
        ),
      },
    ],
    [
      t,
      allRoles,
      canManageRoles,
      canToggleStatus,
      currentBranches,
      toggleActive.isPending,
      setUserShifts.isPending,
      updateUser.isPending,
    ]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          isPlatformAdminRoute
            ? 'User access administration'
            : t('users.title')
        }
        description={
          isPlatformAdminRoute
            ? 'Provision clinic managers and operational users for the selected clinic group.'
            : undefined
        }
        actions={
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching || needsClinicSelection}
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            {canCreateUser && (
              <Button onClick={openCreateDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                {isPlatformAdminRoute ? 'Provision user' : t('users.createUser')}
              </Button>
            )}
          </>
        }
      />

      {isPlatformAdminRoute && !needsClinicSelection && (
        <Card className="border-primary/15 bg-muted/20">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">Admin console user changes apply to the selected clinic group.</span>
            <span className="text-muted-foreground">
              Platform admin accounts are shown here, but admin role assignment is kept out of the routine clinic user directory.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric label="Users in scope" value={userSummary.total} />
        <AdminMetric label="Active users" value={userSummary.active} />
        <AdminMetric label="Managers" value={userSummary.managers} />
        <AdminMetric
          label={isPlatformAdminRoute ? 'Admin accounts' : 'Clinical/logistics'}
          value={isPlatformAdminRoute ? userSummary.admins : userSummary.logisticsUsers}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">
            {isPlatformAdminRoute ? 'Clinic user directory' : t('users.title')}
          </CardTitle>
          <Badge variant="outline">
            {filteredUsers.length} shown
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-y bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{t('users.role')}</span>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder={t('users.roles')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                    {allRoles.map((role) => (
                      <SelectItem key={role.name} value={role.name}>
                        {t(`users.${role.name}`, { defaultValue: role.name })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span>{t('users.status')}</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[160px]">
                    <SelectValue placeholder={t('users.status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                    <SelectItem value="active">{t('users.active')}</SelectItem>
                    <SelectItem value="inactive">{t('users.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {currentBranches.length > 0 && (
                <div className="flex items-center gap-2">
                  <span>{t('users.branch', { defaultValue: 'Branch' })}</span>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="h-8 w-[180px]">
                      <SelectValue
                        placeholder={t('users.branch', { defaultValue: 'Branch' })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                      {currentBranches.map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {needsClinicSelection ? (
            <div className="p-6 text-center text-muted-foreground">
              {t('platformAdmin.selectScopeFirst', {
                defaultValue: 'Select an admin scope before managing users.',
              })}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-destructive">{t('messages.errorOccurred')}</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">{t('users.noUsers')}</div>
          ) : (
            <>
              <DataTable
                columns={columns}
                data={filteredUsers}
                getRowId={(row) => row.id}
                direction={i18n.language === 'ar' ? 'rtl' : 'ltr'}
              />
              <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <span>
                  {t('common.paginationSummary', {
                    from: filteredUsers.length ? (page - 1) * pageSize + 1 : 0,
                    to: (page - 1) * pageSize + filteredUsers.length,
                    total: totalUsers,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    {t('common.previous')}
                  </Button>
                  <span>
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isPlatformAdminRoute ? 'Provision clinic user' : t('users.createUser')}
            </DialogTitle>
            <DialogDescription>
              {isPlatformAdminRoute
                ? 'Create a manager, branch manager, doctor, or secretary for this clinic group. Temporary passwords must be changed on first login.'
                : 'Users start with a temporary password and must set a permanent password on first login.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {isPlatformAdmin && !isPlatformAdminRoute && (
                <div className="space-y-2">
                  <Label>{t('users.clinic')}</Label>
                  <Select
                    value={createForm.clinicId}
                    onValueChange={(value) =>
                      setCreateForm((current) => ({
                        ...current,
                        clinicId: value,
                        branchIds: [],
                        primaryBranchId: '',
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
              )}

              {createBranches.length > 0 && (
                <div className="space-y-3 sm:col-span-2">
                  <Label>{t('users.branches', { defaultValue: 'Branches' })}</Label>
                  <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                    {createBranches.map((branch) => {
                      const branchId = String(branch.id);
                      return (
                        <label
                          key={branch.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                        >
                          <Checkbox
                            checked={createForm.branchIds.includes(branchId)}
                            onCheckedChange={() => toggleCreateBranch(branchId)}
                          />
                          <span>{branch.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {createForm.branchIds.length > 0 && (
                    <Select
                      value={createForm.primaryBranchId}
                      onValueChange={(value) =>
                        setCreateForm((current) => ({
                          ...current,
                          primaryBranchId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('branches.primaryBranch', {
                            defaultValue: 'Primary branch',
                          })}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {createBranches
                          .filter((branch) => createForm.branchIds.includes(String(branch.id)))
                          .map((branch) => (
                            <SelectItem key={branch.id} value={String(branch.id)}>
                              {branch.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select
                  value={createForm.roleName}
                  onValueChange={(value) =>
                    setCreateForm((current) => ({
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
                    {createRoleOptions.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {t(`users.${role.name}`, { defaultValue: role.name })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-fullName">{t('users.fullName')}</Label>
                <Input
                  id="create-fullName"
                  value={createForm.fullName}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-username">{t('users.username')}</Label>
                <Input
                  id="create-username"
                  value={createForm.username}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">{t('users.email')}</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">{t('users.temporaryPassword')}</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {createForm.roleName === 'doctor' && (
              <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('users.shifts')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {[DOCTOR_SHIFT.SATURDAY, DOCTOR_SHIFT.SUNDAY].map((shiftValue) => (
                      <Button
                        key={shiftValue}
                        type="button"
                        variant={createForm.shifts.includes(shiftValue) ? 'default' : 'outline'}
                        onClick={() => toggleCreateShift(shiftValue)}
                      >
                        {t(`shifts.${shiftValue}`, { defaultValue: shiftValue })}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-order">{t('users.dailyOpsOrder')}</Label>
                  <Input
                    id="create-order"
                    type="number"
                    min="1"
                    value={createForm.dailyOpnsOrder}
                    onChange={(event) =>
                      setCreateForm((current) => ({
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
                    variant={createForm.canPerformAssessments ? 'default' : 'outline'}
                    onClick={() =>
                      setCreateForm((current) => ({
                        ...current,
                        canPerformAssessments: !current.canPerformAssessments,
                      }))
                    }
                  >
                    {createForm.canPerformAssessments
                      ? t('users.assessmentAllowed', { defaultValue: 'Allowed' })
                      : t('users.assessmentNotAllowed', { defaultValue: 'Not allowed' })}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  createUser.isPending ||
                  (isPlatformAdminRoute && !platformAdminClinicId) ||
                  (isPlatformAdmin && !isPlatformAdminRoute && !createForm.clinicId) ||
                  (createBranches.length > 0 && createForm.branchIds.length === 0)
                }
              >
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('users.createUser')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={assignmentDialogOpen}
        onOpenChange={(open) => {
          setAssignmentDialogOpen(open);
          if (!open) {
            setAssignmentUser(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('users.manageBranches', { defaultValue: 'Manage branches' })}
            </DialogTitle>
            <DialogDescription>
              {assignmentUser?.fullName || assignmentUser?.username || ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2 rounded-md border p-3">
              {currentBranches.map((branch) => {
                const branchId = String(branch.id);
                return (
                  <label
                    key={branch.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                  >
                    <Checkbox
                      checked={assignmentForm.branchIds.includes(branchId)}
                      onCheckedChange={() => toggleAssignmentBranch(branchId)}
                    />
                    <span>{branch.name}</span>
                  </label>
                );
              })}
            </div>

            {assignmentForm.branchIds.length > 0 && (
              <div className="space-y-2">
                <Label>
                  {t('branches.primaryBranch', { defaultValue: 'Primary branch' })}
                </Label>
                <Select
                  value={assignmentForm.primaryBranchId}
                  onValueChange={(value) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      primaryBranchId: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('branches.primaryBranch', {
                        defaultValue: 'Primary branch',
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {currentBranches
                      .filter((branch) =>
                        assignmentForm.branchIds.includes(String(branch.id)),
                      )
                      .map((branch) => (
                        <SelectItem key={branch.id} value={String(branch.id)}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAssignmentDialogOpen(false)}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              onClick={handleSaveAssignments}
              disabled={updateUser.isPending || assignmentForm.branchIds.length === 0}
            >
              {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save', { defaultValue: 'Save' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
