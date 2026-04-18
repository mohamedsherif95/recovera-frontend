import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Key, Pencil, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/endpoints/auth';

// Validation schemas
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser, logout } = useAuthStore();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const roles = user?.roles || [];

  // Profile form
  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
    },
  });

  // Password form
  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      updateUser({
        fullName: data.fullName,
        email: data.email,
      });
      toast.success(t('profile.profileUpdated', { defaultValue: 'Profile updated successfully' }));
      setIsEditingProfile(false);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to update profile';
      toast.error(message);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success(t('profile.passwordChanged', { defaultValue: 'Password changed successfully. Please login again.' }));
      setIsChangingPassword(false);
      passwordForm.reset();
      // Logout user after password change for security
      setTimeout(() => {
        logout();
      }, 2000);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to change password';
      toast.error(message);
    },
  });

  const handleProfileSubmit = (values) => {
    updateProfileMutation.mutate(values);
  };

  const handlePasswordSubmit = (values) => {
    changePasswordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  const openEditProfile = () => {
    profileForm.reset({
      fullName: user?.fullName || '',
      email: user?.email || '',
    });
    setIsEditingProfile(true);
  };

  const openChangePassword = () => {
    passwordForm.reset();
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsChangingPassword(true);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'destructive';
      case 'doctor':
        return 'default';
      case 'secretary':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('profile.title')} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{t('profile.personalInfo', { defaultValue: 'Personal Information' })}</CardTitle>
              <CardDescription>
                {t('profile.personalInfoDesc', { defaultValue: 'Manage your personal details' })}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openEditProfile}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                {getInitials(user?.fullName)}
              </div>
              <div>
                <h3 className="text-xl font-semibold">{user?.fullName || t('profile.title')}</h3>
                <p className="text-sm text-muted-foreground">@{user?.username}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.username', { defaultValue: 'Username' })}</p>
                  <p className="font-medium">{user?.username || '--'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.email', { defaultValue: 'Email' })}</p>
                  <p className="font-medium">{user?.email || '--'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles & Security Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('profile.roles', { defaultValue: 'Roles' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <Badge key={role.id} variant={getRoleBadgeVariant(role.name)} className="capitalize">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('profile.noRoles', { defaultValue: 'No roles assigned' })}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t('profile.security', { defaultValue: 'Security' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={openChangePassword}>
                {t('profile.changePassword', { defaultValue: 'Change Password' })}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.editProfile', { defaultValue: 'Edit Profile' })}</DialogTitle>
            <DialogDescription>
              {t('profile.editProfileDesc', { defaultValue: 'Update your personal information' })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('profile.fullName', { defaultValue: 'Full Name' })}</Label>
                <Input
                  id="fullName"
                  {...profileForm.register('fullName')}
                  disabled={updateProfileMutation.isPending}
                />
                {profileForm.formState.errors.fullName && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.email', { defaultValue: 'Email' })}</Label>
                <Input
                  id="email"
                  type="email"
                  {...profileForm.register('email')}
                  disabled={updateProfileMutation.isPending}
                />
                {profileForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditingProfile(false)}
                disabled={updateProfileMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isChangingPassword} onOpenChange={setIsChangingPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.changePassword', { defaultValue: 'Change Password' })}</DialogTitle>
            <DialogDescription>
              {t('profile.changePasswordDesc', { defaultValue: 'Enter your current password and choose a new one' })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('profile.currentPassword', { defaultValue: 'Current Password' })}</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="pr-10"
                    {...passwordForm.register('currentPassword')}
                    disabled={changePasswordMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('profile.newPassword', { defaultValue: 'New Password' })}</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    className="pr-10"
                    {...passwordForm.register('newPassword')}
                    disabled={changePasswordMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('profile.passwordRequirements', { defaultValue: 'Must be at least 8 characters with uppercase, lowercase, and number' })}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('profile.confirmPassword', { defaultValue: 'Confirm New Password' })}</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="pr-10"
                    {...passwordForm.register('confirmPassword')}
                    disabled={changePasswordMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsChangingPassword(false)}
                disabled={changePasswordMutation.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? t('common.loading') : t('profile.changePassword', { defaultValue: 'Change Password' })}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
