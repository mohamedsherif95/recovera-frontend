import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicAuthLayout } from '@/components/layout/PublicAuthLayout';
import { Loader2, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { authApi } from '@/api/endpoints/auth';
import toast from 'react-hot-toast';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (email) => authApi.forgotPassword(email),
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to send reset email';
      toast.error(message);
    },
  });

  const onSubmit = (data) => {
    forgotPasswordMutation.mutate(data.email);
  };

  if (isSubmitted) {
    return (
      <PublicAuthLayout>
        <Card className="w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {t('auth.checkYourEmail', { defaultValue: 'Check your email' })}
            </CardTitle>
            <CardDescription>
              {t('auth.resetEmailSent', { defaultValue: 'If an account exists with that email, we have sent password reset instructions.' })}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-4">
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

  return (
    <PublicAuthLayout>
      <Card className="w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {t('auth.forgotPassword')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.forgotPasswordDesc', { defaultValue: 'Enter your email address and we will send you a link to reset your password.' })}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10"
                  {...register('email')}
                  disabled={forgotPasswordMutation.isPending}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={forgotPasswordMutation.isPending}>
              {forgotPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.sendResetLink', { defaultValue: 'Send reset link' })}
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
