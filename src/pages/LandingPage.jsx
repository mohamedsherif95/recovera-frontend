import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  HeartPulse,
  Layers3,
  ReceiptText,
  Smile,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { WhatsAppLogo } from "@/components/common/WhatsAppLogo";
import { LandingBanner } from "@/components/marketing/LandingBanner";
import { PublicTopBar } from "@/components/layout/PublicTopBar";
import { Button } from "@/components/ui/button";
import { usePublicLandingBanner } from "@/hooks/usePublicContent";
import { trackContactClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { WHATSAPP_HREF } from "@/lib/whatsapp";
import "@/styles/landing.css";

const asArray = (value) => (Array.isArray(value) ? value : []);

const profileIcons = {
  physiotherapy: Activity,
  medical: Stethoscope,
  dental: Smile,
  dermatology: Sparkles,
};

const profileTones = {
  physiotherapy: "sky",
  medical: "emerald",
  dental: "amber",
  dermatology: "rose",
};

const experienceIcons = {
  reception: CalendarCheck,
  care: HeartPulse,
  insight: BarChart3,
};

const aboutIcons = {
  operatingSystem: Building2,
  specialtyAware: HeartPulse,
  ownerClarity: BadgeCheck,
};

const workIcons = {
  recovera: ClipboardCheck,
  custom: Layers3,
  operations: BarChart3,
};

const pricingIcons = {
  allowance: ClipboardCheck,
  packages: Layers3,
};

const partnerIcons = {
  owners: Building2,
  doctors: Stethoscope,
  frontDesk: CalendarCheck,
  groups: Users,
};

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const progressRef = useRef(null);
  const { data: landingBanner } = usePublicLandingBanner();

  const profiles = asArray(
    t("marketing.profiles.items", { returnObjects: true }),
  );
  const experienceSteps = asArray(
    t("marketing.experience.steps", { returnObjects: true }),
  );
  const aboutPrinciples = asArray(
    t("marketing.about.principles", { returnObjects: true }),
  );
  const workItems = asArray(
    t("marketing.works.items", { returnObjects: true }),
  );
  const pricingModels = asArray(
    t("marketing.pricing.models", { returnObjects: true }),
  );
  const customSystemPoints = asArray(
    t("marketing.customSystem.points", { returnObjects: true }),
  );
  const customSystemVisualItems = asArray(
    t("marketing.customSystem.visual.items", { returnObjects: true }),
  );
  const partnerItems = asArray(
    t("marketing.partners.items", { returnObjects: true }),
  );
  const [activeProfileId, setActiveProfileId] = useState("physiotherapy");
  const [activePricingId, setActivePricingId] = useState("allowance");

  const activeProfile = useMemo(
    () =>
      profiles.find((profile) => profile.id === activeProfileId) || profiles[0],
    [activeProfileId, profiles],
  );
  const activePricing = useMemo(
    () =>
      pricingModels.find((model) => model.id === activePricingId) ||
      pricingModels[0],
    [activePricingId, pricingModels],
  );

  useLandingMotion(i18n.language, progressRef);

  useEffect(() => {
    document.title = t("marketing.metaTitle");
  }, [t, i18n.language]);

  useEffect(() => {
    if (
      profiles.length &&
      !profiles.some((profile) => profile.id === activeProfileId)
    ) {
      setActiveProfileId(profiles[0].id);
    }
  }, [activeProfileId, profiles]);

  useEffect(() => {
    if (
      pricingModels.length &&
      !pricingModels.some((model) => model.id === activePricingId)
    ) {
      setActivePricingId(pricingModels[0].id);
    }
  }, [activePricingId, pricingModels]);

  return (
    <div className="landing-page min-h-screen bg-background text-foreground">
      <div
        ref={progressRef}
        aria-hidden="true"
        className="landing-scroll-progress"
        style={{ transformOrigin: isRtl ? "right center" : "left center" }}
      />
      <PublicTopBar mode="landing" />
      <LandingBanner
        settings={landingBanner}
        isRtl={isRtl}
        language={i18n.language}
      />

      <main>
        <section className="landing-hero relative isolate overflow-hidden border-b border-sky-200/70 bg-[#f4fbfc] dark:border-slate-700 dark:bg-[#172329]">
          <ClinicDayScene t={t} isRtl={isRtl} />

          <div className="relative mx-auto flex max-w-7xl items-center px-4 py-10 sm:px-6 sm:py-16 lg:min-h-[42rem] lg:px-8 lg:py-20">
            <div className="max-w-3xl lg:max-w-[56%]" data-landing-reveal>
              <div className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-white/90 px-3 py-2 text-sm font-semibold text-sky-900 shadow-sm dark:border-sky-900 dark:bg-slate-900/85 dark:text-sky-200">
                <HeartPulse className="h-4 w-4" />
                {t("marketing.hero.eyebrow")}
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                {t("marketing.hero.title")}
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-700 sm:text-lg dark:text-slate-200">
                {t("marketing.hero.description")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 text-base font-semibold"
                >
                  <a href="#profiles">
                    {t("marketing.hero.primaryCta")}
                    <ArrowRight
                      className={cn("h-4 w-4", isRtl && "rotate-180")}
                    />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-slate-300 bg-white/85 px-6 text-base font-semibold text-slate-900 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-white dark:hover:bg-slate-900"
                >
                  <Link to="/login">{t("marketing.hero.secondaryCta")}</Link>
                </Button>
              </div>

              <ul className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-700 sm:grid-cols-3 dark:text-slate-200">
                {asArray(
                  t("marketing.hero.proofs", { returnObjects: true }),
                ).map((proof) => (
                  <li key={proof} className="flex items-start gap-2 leading-6">
                    <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{proof}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="about"
          className="scroll-mt-24 border-b border-border bg-background"
        >
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-start lg:px-8 lg:py-24">
            <div data-landing-reveal>
              <SectionIntro
                eyebrow={t("marketing.about.eyebrow")}
                title={t("marketing.about.title")}
                description={t("marketing.about.description")}
              />
              <div className="mt-8 rounded-lg border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-sky-950 dark:border-sky-900 dark:bg-sky-950/35 dark:text-sky-100">
                <strong className="block text-base">
                  {t("marketing.about.promiseTitle")}
                </strong>
                <span>{t("marketing.about.promise")}</span>
              </div>
            </div>

            <div
              className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"
              data-landing-reveal
              style={{ "--reveal-delay": "120ms" }}
            >
              {aboutPrinciples.map((item) => {
                const Icon = aboutIcons[item.id] || BadgeCheck;

                return (
                  <article
                    key={item.id}
                    className="group rounded-lg border border-border bg-card p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-sky-950/70">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-black leading-tight">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="profiles"
          className="scroll-mt-24 border-b border-border bg-background"
        >
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <SectionIntro
              eyebrow={t("marketing.profiles.eyebrow")}
              title={t("marketing.profiles.title")}
              description={t("marketing.profiles.description")}
            />

            <div
              className="mt-10 overflow-hidden rounded-lg border border-border bg-card shadow-sm lg:grid lg:grid-cols-[0.72fr_1.28fr]"
              data-landing-reveal
            >
              <div
                role="tablist"
                aria-label={t("marketing.profiles.tabsLabel")}
                onKeyDown={(event) =>
                  handleTabListKeyDown(event, {
                    items: profiles,
                    activeId: activeProfileId,
                    setActiveId: setActiveProfileId,
                    tabIdPrefix: "profile-tab",
                    isRtl,
                  })
                }
                className="landing-mobile-tab-rail flex snap-x snap-mandatory gap-3 overflow-x-auto border-b border-border p-3 sm:grid sm:grid-cols-2 sm:gap-0 sm:p-0 lg:block lg:border-b-0 lg:border-e"
              >
                {profiles.map((profile) => {
                  const Icon = profileIcons[profile.id] || HeartPulse;
                  const isActive = activeProfile?.id === profile.id;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      role="tab"
                      id={`profile-tab-${profile.id}`}
                      aria-selected={isActive}
                      aria-controls={`profile-panel-${profile.id}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={(event) => {
                        setActiveProfileId(profile.id);
                        keepMobileTabInView(event.currentTarget);
                      }}
                      className={cn(
                        "group flex min-h-[5.5rem] w-[82%] shrink-0 snap-center items-center gap-4 rounded-lg border border-border p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-24 sm:w-full sm:rounded-none sm:border-x-0 sm:border-t-0 sm:p-5",
                        "sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+2)]:border-b lg:last:border-b-0",
                        isActive
                          ? "bg-sky-50 text-sky-950 dark:bg-sky-950/35 dark:text-sky-100"
                          : "bg-card text-foreground hover:bg-muted/60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors",
                          isActive
                            ? "border-sky-300 bg-sky-600 text-white dark:border-sky-700"
                            : "border-border bg-background text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-base font-bold">
                          {profile.title}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                          {profile.short}
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "ms-auto hidden h-5 w-5 shrink-0 text-muted-foreground transition-transform sm:block",
                          isRtl && "rotate-180",
                          isActive &&
                            (isRtl ? "-translate-x-1" : "translate-x-1"),
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              {activeProfile && (
                <div
                  key={`${i18n.language}-${activeProfile.id}`}
                  role="tabpanel"
                  id={`profile-panel-${activeProfile.id}`}
                  aria-labelledby={`profile-tab-${activeProfile.id}`}
                  className={cn(
                    "landing-switch-panel relative overflow-hidden p-5 sm:p-8 lg:p-10",
                    `landing-profile-tone-${profileTones[activeProfile.id] || "sky"}`,
                  )}
                >
                  <div className="relative z-10 max-w-3xl">
                    <p className="text-sm font-bold text-current/70">
                      {activeProfile.kicker}
                    </p>
                    <h3 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                      {activeProfile.title}
                    </h3>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-current/75">
                      {activeProfile.description}
                    </p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                      {asArray(activeProfile.points).map((point) => (
                        <div
                          key={point}
                          className="flex items-start gap-3 border-t border-current/15 pt-4 text-sm leading-6"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>

                    <div
                      className="mt-9 flex flex-wrap items-center gap-2"
                      aria-label={activeProfile.flowLabel}
                    >
                      {asArray(activeProfile.flow).map((step, index) => (
                        <div key={step} className="flex items-center gap-2">
                          <span className="rounded-md border border-current/20 bg-white/45 px-3 py-2 text-sm font-bold dark:bg-slate-950/20">
                            {step}
                          </span>
                          {index < asArray(activeProfile.flow).length - 1 && (
                            <ArrowRight
                              className={cn(
                                "h-4 w-4 opacity-50",
                                isRtl && "rotate-180",
                              )}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="experience"
          className="scroll-mt-24 border-b border-slate-700 bg-[#102a33] text-white"
        >
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <SectionIntro
              eyebrow={t("marketing.experience.eyebrow")}
              title={t("marketing.experience.title")}
              description={t("marketing.experience.description")}
              tone="dark"
            />

            <div className="mt-12 grid border-y border-white/15 lg:grid-cols-3">
              {experienceSteps.map((step, index) => {
                const Icon = experienceIcons[step.id] || Users;

                return (
                  <article
                    key={step.id}
                    className="group relative border-b border-white/15 py-7 last:border-b-0 sm:py-8 lg:border-b-0 lg:border-e lg:px-7 lg:first:ps-0 lg:last:border-e-0 lg:last:pe-0"
                    data-landing-reveal
                    style={{ "--reveal-delay": `${index * 110}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-sm font-black text-sky-300">
                        0{index + 1}
                      </span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sky-200 transition-transform duration-300 group-hover:-translate-y-1">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-2xl font-black leading-tight">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      {step.description}
                    </p>
                    <p className="mt-6 border-s-2 border-emerald-400 ps-4 text-sm font-semibold leading-6 text-emerald-100">
                      {step.result}
                    </p>
                  </article>
                );
              })}
            </div>

            <div
              className="mt-10 flex flex-col gap-5 rounded-lg border border-white/15 bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
              data-landing-reveal
            >
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-emerald-300">
                    {t("marketing.experience.spotlight.label")}
                  </p>
                  <h3 className="mt-2 text-xl font-black sm:text-2xl">
                    {t("marketing.experience.spotlight.title")}
                  </h3>
                </div>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-300">
                {t("marketing.experience.spotlight.description")}
              </p>
            </div>
          </div>
        </section>

        <section
          id="works"
          className="scroll-mt-24 border-b border-border bg-background"
        >
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <SectionIntro
                eyebrow={t("marketing.works.eyebrow")}
                title={t("marketing.works.title")}
                description={t("marketing.works.description")}
              />
              <p
                className="max-w-xl border-s-4 border-emerald-500 ps-5 text-sm leading-7 text-muted-foreground"
                data-landing-reveal
              >
                {t("marketing.works.note")}
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {workItems.map((item, index) => {
                const Icon = workIcons[item.id] || ClipboardCheck;

                return (
                  <article
                    key={item.id}
                    className="relative overflow-hidden rounded-lg border border-border bg-card p-6 shadow-sm"
                    data-landing-reveal
                    style={{ "--reveal-delay": `${index * 110}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {item.kicker}
                      </span>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-sky-700 dark:text-sky-300">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <h3 className="mt-8 text-2xl font-black leading-tight">
                      {item.title}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="mt-7 border-t border-border pt-5 text-sm font-bold text-foreground">
                      {item.result}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 border-b border-border bg-[#f8faf9] dark:bg-[#182126]"
        >
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
              <SectionIntro
                eyebrow={t("marketing.pricing.eyebrow")}
                title={t("marketing.pricing.title")}
                description={t("marketing.pricing.description")}
              />
              <div
                className="border-s-4 border-amber-400 ps-5 text-sm leading-7 text-slate-700 dark:text-slate-300"
                data-landing-reveal
              >
                <strong className="block text-base text-slate-950 dark:text-white">
                  {t("marketing.pricing.noteTitle")}
                </strong>
                {t("marketing.pricing.note")}
              </div>
            </div>

            <div
              className="mt-10 overflow-hidden rounded-lg border border-border bg-card shadow-sm"
              data-landing-reveal
            >
              <div
                role="tablist"
                aria-label={t("marketing.pricing.tabsLabel")}
                onKeyDown={(event) =>
                  handleTabListKeyDown(event, {
                    items: pricingModels,
                    activeId: activePricingId,
                    setActiveId: setActivePricingId,
                    tabIdPrefix: "pricing-tab",
                    isRtl,
                  })
                }
                className="grid grid-cols-2 border-b border-border"
              >
                {pricingModels.map((model) => {
                  const Icon = pricingIcons[model.id] || ReceiptText;
                  const isActive = activePricing?.id === model.id;

                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="tab"
                      id={`pricing-tab-${model.id}`}
                      aria-selected={isActive}
                      aria-controls={`pricing-panel-${model.id}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setActivePricingId(model.id)}
                      className={cn(
                        "flex min-h-16 items-center justify-center gap-2 border-e border-border px-3 py-3 text-center text-xs leading-5 transition-colors last:border-e-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-20 sm:justify-start sm:gap-3 sm:px-5 sm:py-4 sm:text-start sm:text-base",
                        isActive
                          ? "bg-slate-950 text-white dark:bg-sky-950/55"
                          : "bg-card text-foreground hover:bg-muted/60",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5 shrink-0",
                          isActive && "text-sky-300",
                        )}
                      />
                      <span className="font-bold">{model.tab}</span>
                    </button>
                  );
                })}
              </div>

              {activePricing && (
                <div
                  key={`${i18n.language}-${activePricing.id}`}
                  role="tabpanel"
                  id={`pricing-panel-${activePricing.id}`}
                  aria-labelledby={`pricing-tab-${activePricing.id}`}
                  className="landing-switch-panel grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-10"
                >
                  <div>
                    <p className="text-sm font-bold text-sky-700 dark:text-sky-300">
                      {activePricing.label}
                    </p>
                    <h3 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-foreground sm:text-4xl">
                      {activePricing.title}
                    </h3>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">
                      {activePricing.description}
                    </p>

                    <div className="mt-8 border-s-2 border-sky-500 ps-5">
                      <p className="text-sm font-bold text-foreground">
                        {activePricing.bestFor}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {activePricing.bestForValue}
                      </p>
                    </div>

                    <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                      {asArray(activePricing.points).map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-3 text-sm leading-6 text-foreground"
                        >
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <PricingVisual model={activePricing} />
                </div>
              )}
            </div>
          </div>
        </section>

        <section
          id="custom-system"
          className="scroll-mt-24 border-b border-border bg-[#eef8f4] text-slate-950 dark:bg-[#102421] dark:text-white"
        >
          <div className="mx-auto grid max-w-7xl gap-9 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-20">
            <div data-landing-reveal>
              <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white/80 px-3 py-2 text-sm font-bold text-emerald-800 shadow-sm dark:border-emerald-900 dark:bg-slate-950/35 dark:text-emerald-200">
                <Layers3 className="h-4 w-4" />
                {t("marketing.customSystem.eyebrow")}
              </div>
              <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                {t("marketing.customSystem.title")}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700 dark:text-slate-300">
                {t("marketing.customSystem.description")}
              </p>

              <ul className="mt-7 grid gap-3">
                {customSystemPoints.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-3 text-sm leading-6 text-slate-800 dark:text-slate-200"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 text-base font-semibold"
                >
                  <a href="#pricing">
                    {t("marketing.customSystem.primaryCta")}
                    <ArrowRight
                      className={cn("h-4 w-4", isRtl && "rotate-180")}
                    />
                  </a>
                </Button>
                <p className="max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {t("marketing.customSystem.hint")}
                </p>
              </div>
            </div>

            <div
              className="landing-custom-system-preview overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-xl shadow-emerald-950/10 dark:border-emerald-900/80 dark:bg-slate-950/70 dark:shadow-black/20"
              data-landing-reveal
              style={{ "--reveal-delay": "120ms" }}
            >
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  {t("marketing.customSystem.visual.label")}
                </p>
                <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  {t("marketing.customSystem.visual.mode")}
                </span>
              </div>

              <div className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-black uppercase tracking-normal text-emerald-700 dark:text-emerald-300">
                      {t("marketing.customSystem.visual.badge")}
                    </p>
                    <h3 className="mt-2 max-w-lg text-2xl font-black leading-tight text-slate-950 dark:text-white">
                      {t("marketing.customSystem.visual.title")}
                    </h3>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                    <Layers3 className="h-6 w-6" />
                  </span>
                </div>

                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t("marketing.customSystem.visual.description")}
                </p>

                <div className="mt-6 grid gap-3">
                  {customSystemVisualItems.map((item, index) => (
                    <div
                      key={item.label}
                      className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center dark:border-slate-800 dark:bg-slate-900/70"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-sm font-black text-emerald-700 shadow-sm dark:bg-slate-950 dark:text-emerald-300">
                        0{index + 1}
                      </span>
                      <span>
                        <span className="block text-sm font-black text-slate-950 dark:text-white">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {item.description}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="partners"
          className="scroll-mt-24 border-b border-border bg-[#f7fbff] dark:bg-[#101b24]"
        >
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <SectionIntro
                eyebrow={t("marketing.partners.eyebrow")}
                title={t("marketing.partners.title")}
                description={t("marketing.partners.description")}
              />
              <div
                className="grid gap-3 sm:grid-cols-2"
                data-landing-reveal
                style={{ "--reveal-delay": "120ms" }}
              >
                {partnerItems.map((item) => {
                  const Icon = partnerIcons[item.id] || Users;

                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-border bg-card p-5 shadow-sm"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-5 text-lg font-black">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div
              className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"
              data-landing-reveal
            >
              <div className="max-w-3xl">
                <p className="text-sm font-bold text-sky-300">
                  {t("marketing.final.eyebrow")}
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                  {t("marketing.final.title")}
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-300">
                  {t("marketing.final.description")}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-6 text-base font-semibold"
                >
                  <a href="#profiles">
                    {t("marketing.final.primaryCta")}
                    <ArrowRight
                      className={cn("h-4 w-4", isRtl && "rotate-180")}
                    />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-slate-600 bg-slate-900 px-6 text-base font-semibold text-white hover:bg-slate-800"
                >
                  <Link to="/login">{t("marketing.final.secondaryCta")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-bold text-foreground">Recovera</p>
          <p>{t("marketing.footer.tagline")}</p>
        </div>
      </footer>

      <WhatsAppFloatingCta t={t} />
    </div>
  );
}

function SectionIntro({ eyebrow, title, description, tone = "light" }) {
  const isDark = tone === "dark";

  return (
    <div className="max-w-3xl" data-landing-reveal>
      <p
        className={cn(
          "text-sm font-bold",
          isDark ? "text-sky-300" : "text-sky-700 dark:text-sky-300",
        )}
      >
        {eyebrow}
      </p>
      <h2
        className={cn(
          "mt-4 text-3xl font-black leading-tight sm:text-4xl",
          isDark ? "text-white" : "text-foreground",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-5 text-base leading-8",
          isDark ? "text-slate-300" : "text-muted-foreground",
        )}
      >
        {description}
      </p>
    </div>
  );
}

function ClinicDayScene({ t, isRtl }) {
  const rows = asArray(t("marketing.hero.scene.rows", { returnObjects: true }));

  return (
    <div
      aria-hidden="true"
      className={cn(
        "landing-hero-scene absolute inset-0 -z-10",
        isRtl && "landing-hero-scene-rtl",
      )}
    >
      <div className="landing-scene-shell absolute top-16 w-[36rem] overflow-hidden rounded-lg border border-sky-200/80 bg-white/95 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold text-sky-700 dark:text-sky-300">
              {t("marketing.hero.scene.branch")}
            </p>
            <p className="mt-1 text-base font-black text-slate-950 dark:text-white">
              {t("marketing.hero.scene.title")}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <span className="landing-live-dot h-2 w-2 rounded-full bg-emerald-500" />
            {t("marketing.hero.scene.status")}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_12rem]">
          <div className="border-e border-slate-200 p-5 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-950 dark:text-white">
                {t("marketing.hero.scene.schedule")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("marketing.hero.scene.summary")}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {rows.map((row, index) => (
                <div
                  key={`${row.time}-${row.patient}`}
                  className={cn(
                    "grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-md border px-3 py-3",
                    index === 1
                      ? "landing-scene-active border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/35"
                      : "border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-800/60",
                  )}
                >
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Clock3 className="h-3 w-3" />
                    {row.time}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-950 dark:text-white">
                      {row.patient}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      {row.type}
                    </span>
                  </span>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("marketing.hero.scene.glance")}
            </p>
            <div className="mt-5 space-y-5">
              {asArray(
                t("marketing.hero.scene.metrics", { returnObjects: true }),
              ).map((metric) => (
                <div key={metric.label}>
                  <p className="text-2xl font-black text-slate-950 dark:text-white">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingVisual({ model }) {
  const isAllowance = model.id === "allowance";

  return (
    <div className="self-stretch rounded-lg border border-border bg-muted/35 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-foreground">
          {model.visual?.title}
        </p>
        <ReceiptText className="h-5 w-5 text-sky-600 dark:text-sky-300" />
      </div>

      {isAllowance ? (
        <div className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {model.visual?.base}
              </p>
              <p className="mt-1 text-2xl font-black text-foreground">
                {model.visual?.steady}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="mt-7 flex h-12 overflow-hidden rounded-md border border-border bg-background">
            <div className="flex w-[72%] items-center justify-center bg-sky-600 px-3 text-center text-xs font-bold text-white">
              {model.visual?.included}
            </div>
            <div className="flex flex-1 items-center justify-center bg-amber-100 px-2 text-center text-xs font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              {model.visual?.extra}
            </div>
          </div>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            {model.visual?.note}
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-4">
          {asArray(model.visual?.tiers).map((tier, index) => (
            <div key={tier.label}>
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="font-bold text-foreground">{tier.label}</span>
                <span className="text-muted-foreground">{tier.range}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-sm bg-background">
                <div
                  className={cn(
                    "h-full rounded-sm",
                    index === 0
                      ? "w-[42%] bg-sky-500"
                      : index === 1
                        ? "w-[68%] bg-emerald-500"
                        : "w-full bg-amber-500",
                  )}
                />
              </div>
            </div>
          ))}
          <p className="pt-2 text-xs leading-6 text-muted-foreground">
            {model.visual?.note}
          </p>
        </div>
      )}
    </div>
  );
}

function WhatsAppFloatingCta({ t }) {
  const handleClick = () => {
    trackContactClick({
      contact_method: "whatsapp",
      cta_location: "landing_floating_cta",
      cta_label: t("marketing.whatsapp.label"),
      destination_url: WHATSAPP_HREF,
    });
  };

  return (
    <a
      href={WHATSAPP_HREF}
      target="_blank"
      rel="noreferrer"
      className="landing-whatsapp-float"
      aria-label={t("marketing.whatsapp.aria")}
      onClick={handleClick}
    >
      <span className="landing-whatsapp-icon" aria-hidden="true">
        <WhatsAppLogo className="h-6 w-6" />
      </span>
      <span className="hidden text-sm font-black sm:inline">
        {t("marketing.whatsapp.label")}
      </span>
    </a>
  );
}

function keepMobileTabInView(tab) {
  if (!tab || !window.matchMedia("(max-width: 639px)").matches) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  tab.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "nearest",
    inline: "center",
  });
}

function handleTabListKeyDown(
  event,
  { items, activeId, setActiveId, tabIdPrefix, isRtl },
) {
  const supportedKeys = ["ArrowLeft", "ArrowRight", "Home", "End"];
  if (!supportedKeys.includes(event.key) || items.length === 0) return;

  event.preventDefault();
  const currentIndex = Math.max(
    0,
    items.findIndex((item) => item.id === activeId),
  );
  let nextIndex = currentIndex;

  if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = items.length - 1;
  } else {
    const forwardKey = isRtl ? "ArrowLeft" : "ArrowRight";
    const delta = event.key === forwardKey ? 1 : -1;
    nextIndex = (currentIndex + delta + items.length) % items.length;
  }

  const nextId = items[nextIndex].id;
  setActiveId(nextId);
  window.requestAnimationFrame(() => {
    const nextTab = document.getElementById(`${tabIdPrefix}-${nextId}`);
    nextTab?.focus({ preventScroll: true });
    keepMobileTabInView(nextTab);
  });
}

function useLandingMotion(language, progressRef) {
  useEffect(() => {
    const revealNodes = Array.from(
      document.querySelectorAll("[data-landing-reveal]"),
    );
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          } else {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );

    revealNodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    let frameId = null;

    const updateProgress = () => {
      frameId = null;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`;
      }
    };

    const handleScroll = () => {
      if (frameId == null) {
        frameId = window.requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frameId != null) window.cancelAnimationFrame(frameId);
    };
  }, [progressRef]);
}
