import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Building2,
  CalendarClock,
  Check,
  CreditCard,
  Database,
  FileClock,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PublicTopBar } from '@/components/layout/PublicTopBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const previewMetricIcons = {
  patients: Stethoscope,
  sessions: FileClock,
};

const previewHighlightIcons = {
  payments: CreditCard,
  access: ShieldCheck,
  reports: BarChart3,
};

const featureIcons = {
  operations: CalendarClock,
  billing: CreditCard,
  roles: ShieldCheck,
  reporting: BarChart3,
};

const planStyles = {
  free: 'border-border bg-card/92',
  standard: 'border-primary/25 bg-primary/10',
  premium: 'border-transparent bg-foreground text-background',
  hosted: 'border-border bg-secondary/75',
};

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const heroStats = t('marketing.hero.stats', { returnObjects: true });
  const previewMetrics = t('marketing.preview.metrics', { returnObjects: true });
  const previewHighlights = t('marketing.preview.highlights', { returnObjects: true });
  const featureCards = t('marketing.features.cards', { returnObjects: true });
  const workflowSteps = t('marketing.workflow.steps', { returnObjects: true });
  const plans = t('marketing.plans.items', { returnObjects: true });
  const hostedBenefits = t('marketing.hosted.benefits', { returnObjects: true });

  useEffect(() => {
    document.title = t('marketing.metaTitle');
  }, [t, i18n.language]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_38rem)]" />
      <div
        className={cn(
          'pointer-events-none absolute top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl',
          isRtl ? 'left-[-8rem]' : 'right-[-8rem]'
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute top-[28rem] -z-10 h-64 w-64 rounded-full bg-accent/70 blur-3xl',
          isRtl ? 'right-[-7rem]' : 'left-[-7rem]'
        )}
      />

      <PublicTopBar mode="landing" />

      <main className="relative">
        <section className="mx-auto grid max-w-7xl gap-14 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-24 lg:pt-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/85 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              {t('marketing.hero.eyebrow')}
            </div>

            <h1 className="mt-6 text-5xl font-black tracking-tight text-foreground sm:text-6xl">
              {t('marketing.hero.title')}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t('marketing.hero.description')}
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-semibold">
                <a href="#plans">
                  {t('marketing.hero.primaryCta')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-primary/20 bg-card/80 px-7 text-base font-semibold"
              >
                <a href="#hosted">{t('marketing.hero.secondaryCta')}</a>
              </Button>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {heroStats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-border bg-card/88 p-5 shadow-lg shadow-primary/5 backdrop-blur"
                >
                  <div className="text-3xl font-black text-foreground">{item.value}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] border border-border bg-card/92 p-6 shadow-2xl shadow-primary/10 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">
                    {t('marketing.preview.eyebrow')}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-foreground">
                    {t('marketing.preview.title')}
                  </h2>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                    {t('marketing.preview.planLabel')}
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    {t('marketing.preview.planValue')}
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {previewMetrics.map((item) => {
                  const Icon = previewMetricIcons[item.id];

                  return (
                    <div key={item.id} className="rounded-3xl border border-border bg-background/80 p-5">
                      <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm text-muted-foreground">{item.label}</p>
                          <p className="text-2xl font-black text-foreground">{item.value}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-3xl border border-border bg-background/85 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t('marketing.preview.revenueLabel')}
                    </p>
                    <p className="mt-1 text-3xl font-black text-foreground">
                      {t('marketing.preview.revenueValue')}
                    </p>
                  </div>
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    {t('marketing.preview.revenueGrowth')}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {previewHighlights.map((item) => {
                    const Icon = previewHighlightIcons[item.id];

                    return (
                      <div key={item.id} className="rounded-2xl border border-border bg-card/70 p-4">
                        <div className="flex items-center gap-2 text-primary">
                          <Icon className="h-4 w-4" />
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">
                            {item.label}
                          </p>
                        </div>
                        <p className="mt-3 text-sm font-medium leading-6 text-foreground">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              className={cn(
                'absolute -bottom-6 max-w-xs rounded-3xl border border-primary/20 bg-card/92 p-5 shadow-xl shadow-primary/10 backdrop-blur',
                isRtl ? '-right-4 sm:-right-6' : '-left-4 sm:-left-6'
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
                {t('marketing.preview.calloutEyebrow')}
              </p>
              <p className="mt-3 text-lg font-bold text-foreground">
                {t('marketing.preview.calloutTitle')}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t('marketing.preview.calloutDescription')}
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-primary">
              {t('marketing.features.eyebrow')}
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-foreground">
              {t('marketing.features.title')}
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {t('marketing.features.description')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {featureCards.map((feature) => {
              const Icon = featureIcons[feature.id];

              return (
                <article
                  key={feature.id}
                  className="rounded-[2rem] border border-border bg-card/90 p-7 shadow-lg shadow-primary/5"
                >
                  <div className="flex items-center gap-4">
                    <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{feature.title}</h3>
                      <p className="mt-1 text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {feature.points.map((point) => (
                      <div
                        key={point}
                        className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm font-medium text-foreground"
                      >
                        <BadgeCheck className="h-4 w-4 text-primary" />
                        {point}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="border-y border-border bg-card/35">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-primary">
                {t('marketing.workflow.eyebrow')}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-foreground">
                {t('marketing.workflow.title')}
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                {t('marketing.workflow.description')}
              </p>

              <div className="mt-8 rounded-[2rem] border border-primary/20 bg-primary/10 p-6 shadow-xl shadow-primary/5">
                <div className="flex items-center gap-4">
                  <span className="rounded-2xl bg-background p-3 text-primary">
                    <Database className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary/80">
                      {t('marketing.workflow.hostedCardEyebrow')}
                    </p>
                    <p className="text-xl font-bold text-foreground">
                      {t('marketing.workflow.hostedCardTitle')}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {t('marketing.workflow.hostedCardDescription')}
                </p>
              </div>
            </div>

            <div className="grid gap-5">
              {workflowSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[2rem] border border-border bg-card/90 p-7 shadow-lg shadow-primary/5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{item.title}</h3>
                      <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="plans" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-primary">
                {t('marketing.plans.eyebrow')}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-foreground">
                {t('marketing.plans.title')}
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                {t('marketing.plans.description')}
              </p>
            </div>

            <div className="rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              {t('marketing.plans.note')}
            </div>
          </div>

          <div className="mt-12 grid gap-6 xl:grid-cols-4">
            {plans.map((plan) => {
              const isPremium = plan.id === 'premium';
              const isHosted = plan.id === 'hosted';
              const buttonHref = isHosted ? '#hosted' : '/login';

              return (
                <article
                  key={plan.id}
                  className={cn(
                    'flex h-full flex-col rounded-[2rem] border p-7 shadow-xl shadow-primary/5',
                    planStyles[plan.id]
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={cn('text-2xl font-black', isPremium ? 'text-background' : 'text-foreground')}>
                        {plan.name}
                      </h3>
                      <p
                        className={cn(
                          'mt-3 text-sm leading-6',
                          isPremium ? 'text-background/75' : 'text-muted-foreground'
                        )}
                      >
                        {plan.summary}
                      </p>
                    </div>
                    {plan.featured && (
                      <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-primary-foreground">
                        {t('marketing.plans.popularBadge')}
                      </span>
                    )}
                  </div>

                  <div className="mt-8">
                    <div className={cn('text-4xl font-black', isPremium ? 'text-background' : 'text-foreground')}>
                      {plan.price}
                    </div>
                    <p
                      className={cn(
                        'mt-2 text-sm uppercase tracking-[0.24em]',
                        isPremium ? 'text-background/65' : 'text-muted-foreground'
                      )}
                    >
                      {plan.cadence}
                    </p>
                  </div>

                  <div className="mt-8 space-y-3">
                    {plan.points.map((point) => (
                      <div
                        key={point}
                        className={cn(
                          'flex items-start gap-3 rounded-2xl px-4 py-3',
                          isPremium
                            ? 'bg-background/10 text-background'
                            : 'border border-border bg-background/80 text-foreground'
                        )}
                      >
                        <Check className={cn('mt-0.5 h-4 w-4 shrink-0', isPremium ? 'text-background' : 'text-primary')} />
                        <span className="text-sm leading-6">{point}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-2">
                    <Button
                      asChild
                      size="lg"
                      variant={isPremium ? 'secondary' : plan.featured ? 'default' : 'outline'}
                      className={cn(
                        'h-12 w-full rounded-full font-semibold',
                        isPremium && 'bg-background text-foreground hover:bg-background/90',
                        plan.featured && !isPremium && 'shadow-md shadow-primary/15'
                      )}
                    >
                      {buttonHref.startsWith('/') ? (
                        <Link to={buttonHref}>{plan.ctaLabel}</Link>
                      ) : (
                        <a href={buttonHref}>{plan.ctaLabel}</a>
                      )}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section id="hosted" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <div className="rounded-[2.5rem] border border-primary/20 bg-[linear-gradient(135deg,_rgba(56,189,248,0.10),_rgba(255,255,255,0.94)_38%,_rgba(125,211,252,0.12)_100%)] p-8 shadow-2xl shadow-primary/10 dark:bg-[linear-gradient(135deg,_rgba(56,189,248,0.10),_rgba(30,41,59,0.92)_38%,_rgba(125,211,252,0.10)_100%)] lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-4 py-2 text-sm font-semibold text-primary">
                  <Building2 className="h-4 w-4" />
                  {t('marketing.hosted.eyebrow')}
                </div>

                <h2 className="mt-6 text-4xl font-black tracking-tight text-foreground">
                  {t('marketing.hosted.title')}
                </h2>
                <p className="mt-5 text-lg leading-8 text-muted-foreground">
                  {t('marketing.hosted.description')}
                </p>

                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-semibold">
                    <Link to="/login">{t('marketing.hosted.primaryCta')}</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-full border-primary/20 bg-card/80 px-7 text-base font-semibold"
                  >
                    <a href="#plans">{t('marketing.hosted.secondaryCta')}</a>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {hostedBenefits.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-4 rounded-[1.75rem] border border-border bg-card/88 p-5 shadow-lg shadow-primary/5"
                  >
                    <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Database className="h-5 w-5" />
                    </span>
                    <p className="text-base leading-7 text-foreground">{item}</p>
                  </div>
                ))}

                <div className="rounded-[1.75rem] border border-primary/20 bg-primary/10 p-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">
                      {t('marketing.hosted.bestFitEyebrow')}
                    </p>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-foreground">
                    {t('marketing.hosted.bestFitText')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
