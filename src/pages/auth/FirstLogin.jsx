import { useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { firstLoginSchema } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PublicAuthLayout } from '@/components/layout/PublicAuthLayout';
import { Loader2 } from 'lucide-react';

export default function FirstLogin() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { completeFirstLogin, isCompletingFirstLogin } = useAuth();

  const pendingSetup = useMemo(() => {
    if (location.state?.setupToken) return location.state;

    try {
      return JSON.parse(sessionStorage.getItem('recovera-first-login') || 'null');
    } catch {
      return null;
    }
  }, [location.state]);

  const setupToken = pendingSetup?.setupToken || searchParams.get('token');
  const user = pendingSetup?.user || null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(firstLoginSchema),
  });

  const onSubmit = (data) => {
    if (!setupToken) return;
    completeFirstLogin({ token: setupToken, newPassword: data.password });
  };

  return (
    <PublicAuthLayout>
      <Card className="w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
            R
          </div>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {t('auth.firstLoginTitle')}
          </CardTitle>
          <CardDescription className="text-center">
            {user?.fullName ? `${user.fullName}, ` : ''}
            {t('auth.firstLoginDesc')}
          </CardDescription>
        </CardHeader>

        {!setupToken ? (
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Your setup session is missing or expired. Please login again with your temporary password.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('profile.newPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register('password')}
                  disabled={isCompletingFirstLogin}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                  disabled={isCompletingFirstLogin}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" className="w-full" disabled={isCompletingFirstLogin}>
                {isCompletingFirstLogin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </PublicAuthLayout>
  );
}
