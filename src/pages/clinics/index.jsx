import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, Plus, RefreshCcw, UserPlus } from 'lucide-react';
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
import { useClinics, useCreateClinic, useUpdateClinic } from '@/hooks/useClinics';
import { useCreateUser } from '@/hooks/useUsers';
import { useBranches } from '@/hooks/useBranches';
import { accessApi } from '@/api/endpoints/access';
import { DOCTOR_SHIFT, USER_ROLES } from '@/lib/constants';

const emptyClinicForm = {
  name: '',
  slug: '',
  status: 'active',
  billingNotes: '',
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
};

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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

export default function ClinicsPage() {
  const { t, i18n } = useTranslation();
  const [clinicDialogOpen, setClinicDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [clinicForm, setClinicForm] = useState(emptyClinicForm);
  const [userForm, setUserForm] = useState(emptyUserForm);

  const { data, isLoading, isError, refetch, isFetching } = useClinics();
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
    enabled: Boolean(userDialogOpen && selectedProvisionClinicId),
    platformClinicId: selectedProvisionClinicId ?? undefined,
  });

  const clinics = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }, [data]);
  const clinicSummary = useMemo(() => {
    const active = clinics.filter((clinic) => clinic.status === 'active').length;
    const suspended = clinics.filter(
      (clinic) => clinic.status === 'suspended',
    ).length;
    const withBillingNotes = clinics.filter((clinic) =>
      Boolean(clinic.billingNotes?.trim()),
    ).length;

    return {
      total: clinics.length,
      active,
      suspended,
      withBillingNotes,
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

  const openEditClinic = (clinic) => {
    setEditingClinic(clinic);
    setClinicForm({
      name: clinic.name || '',
      slug: clinic.slug || '',
      status: clinic.status || 'active',
      billingNotes: clinic.billingNotes || '',
    });
    setClinicDialogOpen(true);
  };

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
    };

    const mutation = editingClinic
      ? updateClinic.mutateAsync({ id: editingClinic.id, data: payload })
      : createClinic.mutateAsync(payload);

    mutation
      .then(() => {
        toast.success(editingClinic ? 'Clinic updated' : 'Clinic created');
        setClinicDialogOpen(false);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Could not save clinic');
      });
  };

  const openProvisionUser = (clinic) => {
    setUserForm({
      ...emptyUserForm,
      clinicId: clinic?.id ? String(clinic.id) : '',
    });
    setUserDialogOpen(true);
  };

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
      toast.error('Select a role before provisioning the user');
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
    };

    createUser
      .mutateAsync(payload)
      .then(() => {
        toast.success('User provisioned with forced first-login password change');
        setUserDialogOpen(false);
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Could not provision user');
      });
  };

  const columns = useMemo(
    () => [
      {
        key: 'name',
        header: t('clinics.name'),
        cell: (clinic) => (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium">{clinic.name}</div>
              <div className="text-xs text-muted-foreground">{clinic.slug}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('clinics.status'),
        cell: (clinic) => (
          <Badge
            variant={clinic.status === 'active' ? 'default' : 'outline'}
            className={
              clinic.status === 'active'
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'border-slate-300 text-slate-600'
            }
          >
            {t(`clinics.${clinic.status}`, { defaultValue: clinic.status })}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        cell: (clinic) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation();
                openEditClinic(clinic);
              }}
            >
              Company settings
            </Button>
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                openProvisionUser(clinic);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Provision user
            </Button>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinic groups"
        description="Company-level tenants. Branch subscriptions, billing, and access controls are managed per branch."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={openCreateClinic}>
              <Plus className="mr-2 h-4 w-4" />
              Create clinic group
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <AdminMetric label="Clinic groups" value={clinicSummary.total} />
        <AdminMetric label="Active" value={clinicSummary.active} />
        <AdminMetric label="Suspended" value={clinicSummary.suspended} />
        <AdminMetric label="Billing notes" value={clinicSummary.withBillingNotes} />
      </div>

      <Card className="border-primary/15 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Clinic group directory</CardTitle>
          <Badge variant="outline">{clinicSummary.total} total</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="p-6 text-center text-destructive">{t('messages.errorOccurred')}</div>
          ) : clinics.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">{t('clinics.noClinics')}</div>
          ) : (
            <DataTable
              columns={columns}
              data={clinics}
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
              {editingClinic ? 'Edit clinic group' : 'Create clinic group'}
            </DialogTitle>
            <DialogDescription>
              Company-level details live here. Branch pricing, access, and invoices are managed from branch workbenches.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleClinicSubmit} className="space-y-4">
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
            <DialogFooter>
              <Button type="submit" disabled={createClinic.isPending || updateClinic.isPending}>
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
            <DialogTitle>Provision clinic user</DialogTitle>
            <DialogDescription>
              Create a manager, branch manager, doctor, or secretary under the selected clinic group. The temporary password must be changed on first login.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUserSubmit} className="space-y-4">
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

            <DialogFooter>
              <Button type="submit" disabled={createUser.isPending || !userForm.clinicId}>
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
