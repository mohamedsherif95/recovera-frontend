import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '#features', key: 'features' },
  { href: '#workflow', key: 'workflow' },
  { href: '#plans', key: 'plans' },
  { href: '#hosted', key: 'hosted' },
];

export function PublicTopBar({ mode = 'landing' }) {
  const { t } = useTranslation();
  const isLanding = mode === 'landing';

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-lg shadow-primary/20">
            R
          </span>
          <div className="leading-tight">
            <p className="text-lg font-black tracking-tight text-primary">{t('app.name')}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {t('marketing.topbar.tagline')}
            </p>
          </div>
        </Link>

        {isLanding && (
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {navItems.map((item) => (
              <a key={item.key} href={item.href} className="transition hover:text-foreground">
                {t(`marketing.nav.${item.key}`)}
              </a>
            ))}
          </nav>
        )}

        <div className="ms-auto flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-card/80 p-1 shadow-sm">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>

          {isLanding ? (
            <>
              <Button asChild variant="ghost" className="hidden md:inline-flex">
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
              <Button asChild className="rounded-full px-5">
                <a href="#plans">
                  {t('marketing.topbar.viewPlans')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" className={cn('rounded-full px-5')}>
              <Link to="/">{t('marketing.topbar.backHome')}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
