import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/common/DataTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Loader2, RefreshCcw, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveEffectiveClinicId } from '@/lib/branchScope';

const emptyCreateForm = {
  clinicId: '',
  branchId: '',
  fullName: '',
  username: '',
  email: '',
  password: '',
  roleName: 'doctor',
  shifts: [],
  dailyOpnsOrder: '',
  canPerformAssessments: false,
};

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const { can } = usePermissions();
  const { user: currentUser } = useAuthStore();
  const { clinicOverrideId } = useUIStore();

  const isSuperAdmin =
    currentUser?.isSuperAdmin ||
    currentUser?.roles?.some((role) => role?.name === USER_ROLES.SUPER_ADMIN);
  const canCreateUser = can(PERMISSIONS['users:create']);
  const canManageRoles = isSuperAdmin && can(PERMISSIONS['users:manageRoles']);
  const canToggleStatus = can(PERMISSIONS['users:update']);
  const effectiveClinicId = resolveEffectiveClinicId(currentUser, clinicOverrideId);

  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);

  const { data, isLoading, isError, refetch, isFetching } = useUsers({
    page,
    limit: pageSize,
    branchId: branchFilter !== 'all' ? Number(branchFilter) : undefined,
  });

  const toggleActive = useToggleUserActive();
  const setUserRoles = useSetUserRoles();
  const setUserShifts = useSetUserShifts();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const { data: clinicsData } = useClinics(Boolean(isSuperAdmin && canCreateUser));
  const { data: currentBranchesData } = useBranches({
    enabled: Boolean(effectiveClinicId),
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
  const selectedCreateClinicId = isSuperAdmin
    ? Number(createForm.clinicId || 0) || null
    : effectiveClinicId;
  const { data: createBranchesData } = useBranches({
    enabled: Boolean(canCreateUser && createDialogOpen && selectedCreateClinicId),
    clinicOverrideId: isSuperAdmin ? selectedCreateClinicId ?? undefined : undefined,
  });
  const createBranches = useMemo(() => {
    if (!isSuperAdmin) {
      return currentBranches;
    }

    if (Array.isArray(createBranchesData)) return createBranchesData;
    if (Array.isArray(createBranchesData?.data)) return createBranchesData.data;
    return [];
  }, [createBranchesData, currentBranches, isSuperAdmin]);

  const createRoleOptions = useMemo(() => {
    return allRoles.filter((role) => {
      if (role.name === USER_ROLES.SUPER_ADMIN) return false;
      if (isSuperAdmin) {
        return [
          USER_ROLES.ADMIN,
          USER_ROLES.BRANCH_MANAGER,
          USER_ROLES.DOCTOR,
          USER_ROLES.SECRETARY,
        ].includes(role.name);
      }
      return role.name === USER_ROLES.DOCTOR;
    });
  }, [allRoles, isSuperAdmin]);

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

  const handleToggleActive = (user) => {
    if (!canToggleStatus) return;
    const next = !user.isActive;
    toggleActive.mutate({ id: user.id, isActive: next });
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

    setUserRoles.mutate({ id: user.id, roleIds });
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
    setUserShifts.mutate({ id: user.id, shifts: newShifts });
  };

  const handleDailyOpsOrderChange = (user, value) => {
    if (!canToggleStatus) return;
    const nextValue = Number.parseInt(value, 10);
    if (Number.isNaN(nextValue)) return;
    if (nextValue === user.dailyOpnsOrder) return;
    updateUser.mutate({ id: user.id, data: { dailyOpnsOrder: nextValue } });
  };

  const handleAssessmentPermissionToggle = (user) => {
    if (!canToggleStatus || !isDoctor(user)) return;
    updateUser.mutate({
      id: user.id,
      data: { canPerformAssessments: user.canPerformAssessments !== true },
    });
  };

  const isDoctor = (user) => user.roles?.some((r) => r.name === 'doctor');

  const openCreateDialog = () => {
    setCreateForm({
      ...emptyCreateForm,
      clinicId: isSuperAdmin ? '' : String(effectiveClinicId ?? ''),
      roleName: isSuperAdmin ? USER_ROLES.ADMIN : USER_ROLES.DOCTOR,
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
        if (!current.branchId) return current;
        return { ...current, branchId: '' };
      }

      const branchExists = createBranches.some(
        (branch) => String(branch.id) === String(current.branchId),
      );
      if (branchExists) {
        return current;
      }

      const defaultBranch =
        createBranches.find((branch) => branch.isDefault) || createBranches[0];
      return {
        ...current,
        branchId: defaultBranch ? String(defaultBranch.id) : '',
      };
    });
  }, [createBranches, createDialogOpen]);

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

    if (isSuperAdmin) {
      payload.clinicId = Number(createForm.clinicId);
    }
    if (createForm.branchId) {
      payload.branchId = Number(createForm.branchId);
    }

    createUser
      .mutateAsync(payload)
      .then(() => {
        toast.success('User provisioned with forced first-login password change');
        setCreateDialogOpen(false);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Could not create user');
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
        header: t('users.branch', { defaultValue: 'Branch' }),
        cell: (row) => {
          if (!currentBranches.length) {
            return row.branch?.name || '--';
          }

          const branchValue =
            row.branchId != null
              ? String(row.branchId)
              : row.branch?.id != null
                ? String(row.branch.id)
                : '';
          const canEditBranchAssignment = canToggleStatus && (isSuperAdmin || isDoctor(row));

          if (!canEditBranchAssignment) {
            return row.branch?.name || '--';
          }

          return (
            <Select
              value={branchValue}
              onValueChange={(value) => {
                if (String(value) === String(branchValue)) return;
                updateUser.mutate({
                  id: row.id,
                  data: { branchId: Number(value) },
                });
              }}
            >
              <SelectTrigger className="h-8 w-[170px]" onClick={(e) => e.stopPropagation()}>
                <SelectValue
                  placeholder={t('users.branch', { defaultValue: 'Branch' })}
                />
              </SelectTrigger>
              <SelectContent>
                {currentBranches.map((branch) => (
                  <SelectItem key={branch.id} value={String(branch.id)}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {allRoles.map((role) => {
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
      isSuperAdmin,
      toggleActive.isPending,
      setUserShifts.isPending,
      updateUser.isPending,
    ]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('users.title')}
        actions={
          <>
            {canCreateUser && (
              <Button onClick={openCreateDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('users.createUser')}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

          {isLoading ? (
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
            <DialogTitle>{t('users.createUser')}</DialogTitle>
            <DialogDescription>
              Users start with a temporary password and must set a permanent password on first login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>{t('users.clinic')}</Label>
                  <Select
                    value={createForm.clinicId}
                    onValueChange={(value) =>
                      setCreateForm((current) => ({
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
              )}

              {createBranches.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('users.branch', { defaultValue: 'Branch' })}</Label>
                  <Select
                    value={createForm.branchId}
                    onValueChange={(value) =>
                      setCreateForm((current) => ({ ...current, branchId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('users.branch', { defaultValue: 'Branch' })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {createBranches.map((branch) => (
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
              <Button type="submit" disabled={createUser.isPending || (isSuperAdmin && !createForm.clinicId)}>
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
