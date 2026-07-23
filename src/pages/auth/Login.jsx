import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validators';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { WhatsAppLogo } from '@/components/common/WhatsAppLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicAuthLayout } from '@/components/layout/PublicAuthLayout';
import { Loader2 } from 'lucide-react';
import { trackContactClick } from '@/lib/analytics';
import { WHATSAPP_HREF } from '@/lib/whatsapp';

export default function Login() {
  const { t } = useTranslation();
  const { login, isLoggingIn } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => {
    login(data);
  };

  const handleWhatsAppClick = () => {
    trackContactClick({
      contact_method: 'whatsapp',
      cta_location: 'login_direct_chat',
      cta_label: t('auth.access.chatDirectly'),
      destination_url: WHATSAPP_HREF,
    });
  };

  return (
    <PublicAuthLayout>
      <Card className="w-full max-w-md border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-primary">
            {t('app.name')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('auth.signInToContinue')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('auth.username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={t('auth.username')}
                {...register('username')}
                disabled={isLoggingIn}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t('auth.password')}
                {...register('password')}
                disabled={isLoggingIn}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.login')}
            </Button>

            <div className="w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-center text-sm text-muted-foreground">
              <p className="leading-6">
                <span className="font-medium ">
                  {t('auth.access.needAccess')}
                </span>{' '}
                {t('auth.access.submitPrompt')}{' '}
                <span className="font-medium text-primary hover:underline">
                  <Link to="/join-us">{t('auth.access.joinRequest')}</Link>{' '}
                </span>{' '}
                {t('auth.access.touchSoon')}
              </p>

              <div className="my-3 flex items-center gap-3 text-xs font-black uppercase text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                {t('auth.access.or')}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button asChild variant="outline" className="h-11 w-full">
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noreferrer"
                  onClick={handleWhatsAppClick}
                >
                  <WhatsAppLogo className="h-5 w-5 rounded-sm object-cover" />
                  {t('auth.access.chatDirectly')}
                </a>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </PublicAuthLayout>
  );
}
