import { useRef } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  getSafeLandingBannerHref,
  normalizeLandingBanner,
  resolveLandingBannerContent,
} from "@/lib/landingBanner";
import {
  trackLandingBannerCtaClick,
  trackLandingBannerHover,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";
import "@/styles/landing.css";

const BANNER_HOVER_THROTTLE_MS = 2000;

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

export function LandingBanner({
  settings,
  isRtl = false,
  language = "ar",
  preview = false,
}) {
  const lastHoverTrackedAtRef = useRef(0);
  const banner = resolveLandingBannerContent(
    normalizeLandingBanner(settings),
    language,
  );
  const href = getSafeLandingBannerHref(banner.ctaHref);

  if (!preview && (!banner.enabled || !banner.message)) {
    return null;
  }

  const trackingPayload = {
    banner_language: language,
    banner_variant: banner.variant,
    banner_density: banner.density,
    banner_direction: banner.direction,
    banner_pause_on_hover: banner.pauseOnHover,
    banner_show_icon: banner.showIcon,
    banner_has_cta: Boolean(banner.ctaLabel && href),
    banner_cta_label: banner.ctaLabel || "",
    banner_cta_href: href || "",
  };

  const handleBannerHover = () => {
    if (preview) return;

    const now = Date.now();
    if (now - lastHoverTrackedAtRef.current < BANNER_HOVER_THROTTLE_MS) return;

    lastHoverTrackedAtRef.current = now;
    trackLandingBannerHover(trackingPayload);
  };

  const handleBannerCtaClick = () => {
    if (preview) return;
    trackLandingBannerCtaClick(trackingPayload);
  };

  return (
    <section
      aria-label={banner.kicker || "Site announcement"}
      onPointerEnter={handleBannerHover}
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
            onClick={handleBannerCtaClick}
          >
            <span>{banner.ctaLabel}</span>
            <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
          </a>
        )}
      </div>
    </section>
  );
}
