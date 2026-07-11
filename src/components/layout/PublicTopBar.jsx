import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, LogIn, ReceiptText, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '#profiles', key: 'profiles', icon: Activity },
  { href: '#experience', key: 'experience', icon: Users },
  { href: '#pricing', key: 'pricing', icon: ReceiptText },
];

export function PublicTopBar({ mode = 'landing' }) {
  const { t, i18n } = useTranslation();
  const isLanding = mode === 'landing';
  const isRtl = i18n.dir() === 'rtl';
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    if (!isLanding || !('IntersectionObserver' in window)) return undefined;

    const sections = navItems
      .map((item) => document.querySelector(item.href))
      .filter(Boolean);
    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        const visible = Array.from(visibleSections.entries()).sort(
          (a, b) => b[1] - a[1],
        )[0];

        setActiveSection(visible?.[0] || '');
      },
      { rootMargin: '-18% 0px -58% 0px', threshold: [0, 0.2, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isLanding]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:gap-4 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-base font-black text-primary-foreground shadow-lg shadow-primary/20 sm:h-11 sm:w-11 sm:text-lg">
              R
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-lg font-black tracking-normal text-primary">{t('app.name')}</p>
              <p className="hidden text-xs font-semibold uppercase tracking-normal text-muted-foreground sm:block">
                {t('marketing.topbar.tagline')}
              </p>
            </div>
          </Link>

          {isLanding && (
            <nav className="hidden items-center gap-1 text-sm font-medium text-muted-foreground lg:flex">
              {navItems.map((item) => (
                <a
                  key={item.key}
                  href={item.href}
                  aria-current={activeSection === item.href.slice(1) ? 'location' : undefined}
                  className={cn(
                    'relative rounded-md px-3 py-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    activeSection === item.href.slice(1) &&
                      'bg-sky-50 text-sky-800 dark:bg-sky-950/45 dark:text-sky-200',
                  )}
                >
                  {t(`marketing.nav.${item.key}`)}
                </a>
              ))}
            </nav>
          )}

          <div className="ms-auto flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card/80 p-1 shadow-sm">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>

            {isLanding ? (
              <>
                <Button asChild variant="ghost" className="hidden lg:inline-flex">
                  <Link to="/login">{t('auth.login')}</Link>
                </Button>
                <Button asChild className="hidden px-5 lg:inline-flex">
                  <a href="#pricing">
                    {t('marketing.topbar.viewPlans')}
                    <ArrowRight className={cn('h-4 w-4', isRtl && 'rotate-180')} />
                  </a>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline" className={cn('px-5')}>
                <Link to="/">{t('marketing.topbar.backHome')}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {isLanding && (
        <nav
          aria-label={t('marketing.nav.mobileLabel')}
          className="landing-mobile-dock fixed inset-x-0 bottom-0 z-[60] grid grid-cols-4 border-t border-border bg-background/95 px-2 pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur lg:hidden"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.href.slice(1);

            return (
              <a
                key={item.key}
                href={item.href}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center text-[11px] font-semibold leading-4 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive && 'bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(`marketing.nav.${item.key}`)}</span>
              </a>
            );
          })}
          <Link
            to="/login"
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 text-center text-[11px] font-semibold leading-4 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogIn className={cn('h-5 w-5', isRtl && 'rotate-180')} />
            <span>{t('auth.login')}</span>
          </Link>
        </nav>
      )}
    </>
  );
}
