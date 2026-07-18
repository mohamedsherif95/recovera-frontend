import { ArrowRight, Sparkles } from "lucide-react";
import {
  getSafeLandingBannerHref,
  normalizeLandingBanner,
} from "@/lib/landingBanner";
import { cn } from "@/lib/utils";
import "@/styles/landing.css";

function BannerMessage({ banner }) {
  return (
    <span className="landing-config-banner-item">
      {banner.showIcon && <Sparkles className="h-4 w-4 shrink-0" />}
      {banner.kicker && (
        <span className="landing-config-banner-kicker">{banner.kicker}</span>
      )}
      <span className="landing-config-banner-message">{banner.message}</span>
      {banner.details && (
        <span className="landing-config-banner-details">{banner.details}</span>
      )}
    </span>
  );
}

export function LandingBanner({ settings, isRtl = false, preview = false }) {
  const banner = normalizeLandingBanner(settings);
  const href = getSafeLandingBannerHref(banner.ctaHref);

  if (!preview && (!banner.enabled || !banner.message)) {
    return null;
  }

  return (
    <section
      aria-label={banner.kicker || "Site announcement"}
      className={cn(
        "landing-config-banner",
        `landing-config-banner-${banner.variant}`,
        `landing-config-banner-${banner.density}`,
        banner.direction === "right" && "landing-config-banner-dir-right",
        banner.pauseOnHover && "landing-config-banner-pause",
        !banner.enabled && preview && "landing-config-banner-disabled",
      )}
      style={{
        "--banner-bg": banner.backgroundColor,
        "--banner-fg": banner.textColor,
        "--banner-accent": banner.accentColor,
        "--banner-accent-fg": banner.accentTextColor,
        "--banner-border": banner.borderColor,
        "--banner-speed": `${banner.speedSeconds}s`,
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <p className="sr-only">
          {[banner.kicker, banner.message, banner.details, banner.ctaLabel]
            .filter(Boolean)
            .join(" ")}
        </p>
        <div className="landing-config-banner-mask" aria-hidden="true">
          <div className="landing-config-banner-track">
            <BannerMessage banner={banner} />
            <BannerMessage banner={banner} />
            <BannerMessage banner={banner} />
            <BannerMessage banner={banner} />
          </div>
        </div>

        {banner.ctaLabel && href && (
          <a
            href={href}
            className="landing-config-banner-cta"
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
          >
            <span>{banner.ctaLabel}</span>
            <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
          </a>
        )}
      </div>
    </section>
  );
}
