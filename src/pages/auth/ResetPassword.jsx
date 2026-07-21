import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicAuthLayout } from '@/components/layout/PublicAuthLayout';
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { authApi } from '@/api/endpoints/auth';
import toast from 'react-hot-toast';

const resetPasswordSchema = z.object({
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

export default function ResetPassword() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data) => authApi.resetPassword({ token, newPassword: data.newPassword }),
    onSuccess: () => {
      setIsSuccess(true);
      toast.success(t('auth.passwordResetSuccess', { defaultValue: 'Password reset successfully!' }));
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to reset password';
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    resetPasswordMutation.mutate(data);
  };

  // No token provided
  if (!token) {
    return (
      <PublicAuthLayout>
        <Card className="w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {t('auth.invalidResetLink', { defaultValue: 'Invalid reset link' })}
            </CardTitle>
            <CardDescription>
              {t('auth.invalidResetLinkDesc', { defaultValue: 'This password reset link is invalid or has expired. Please request a new one.' })}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
            <Button asChild className="w-full">
              <Link to="/forgot-password">
                {t('auth.requestNewLink', { defaultValue: 'Request new link' })}
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('auth.backToLogin', { defaultValue: 'Back to login' })}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </PublicAuthLayout>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <PublicAuthLayout>
        <Card className="w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {t('auth.passwordResetComplete', { defaultValue: 'Password reset complete' })}
            </CardTitle>
            <CardDescription>
              {t('auth.passwordResetCompleteDesc', { defaultValue: 'Your password has been reset successfully. You can now login with your new password.' })}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/login">
                {t('auth.goToLogin', { defaultValue: 'Go to login' })}
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </PublicAuthLayout>
    );
  }

  return (
    <PublicAuthLayout>
      <Card className="w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.resetPassword')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.resetPasswordDesc', { defaultValue: 'Enter your new password below.' })}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('profile.newPassword', { defaultValue: 'New Password' })}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="pr-10"
                  {...register('newPassword')}
                  disabled={resetPasswordMutation.isPending}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('profile.passwordRequirements', { defaultValue: 'Must be at least 8 characters with uppercase, lowercase, and number' })}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('profile.confirmPassword', { defaultValue: 'Confirm Password' })}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="pr-10"
                  {...register('confirmPassword')}
                  disabled={resetPasswordMutation.isPending}
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
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.resetPassword')}
            </Button>

            <Link to="/login" className="text-sm text-center text-muted-foreground hover:text-primary">
              <ArrowLeft className="inline mr-1 h-4 w-4" />
              {t('auth.backToLogin', { defaultValue: 'Back to login' })}
            </Link>
          </CardFooter>
        </form>
      </Card>
    </PublicAuthLayout>
  );
}
