export const LANDING_BANNER_DEFAULTS = {
  enabled: false,
  kicker: "Platform update",
  message: "Recovera is ready for specialty-aware clinic operations.",
  details: "Book a walkthrough for your branch workflow.",
  ctaLabel: "Book a walkthrough",
  ctaHref:
    "https://wa.me/201508976776?text=Hello%20Recovera%2C%20I%20would%20like%20to%20book%20a%20walkthrough.",
  variant: "solid",
  density: "comfortable",
  backgroundColor: "#075985",
  textColor: "#ffffff",
  accentColor: "#facc15",
  accentTextColor: "#0f172a",
  borderColor: "#38bdf8",
  speedSeconds: 28,
  direction: "left",
  pauseOnHover: true,
  showIcon: true,
};

const variants = new Set(["solid", "soft", "outline"]);
const densities = new Set(["compact", "comfortable", "spacious"]);
const directions = new Set(["left", "right"]);
const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const cleanText = (value, fallback = "") =>
  typeof value === "string" ? value.trim() : fallback;

const cleanColor = (value, fallback) =>
  typeof value === "string" && hexColorPattern.test(value.trim())
    ? value.trim()
    : fallback;

const cleanNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function normalizeLandingBanner(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};

  return {
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : LANDING_BANNER_DEFAULTS.enabled,
    kicker: cleanText(source.kicker, LANDING_BANNER_DEFAULTS.kicker),
    message: cleanText(source.message, LANDING_BANNER_DEFAULTS.message),
    details: cleanText(source.details, LANDING_BANNER_DEFAULTS.details),
    ctaLabel: cleanText(source.ctaLabel, LANDING_BANNER_DEFAULTS.ctaLabel),
    ctaHref: cleanText(source.ctaHref, LANDING_BANNER_DEFAULTS.ctaHref),
    variant: variants.has(source.variant)
      ? source.variant
      : LANDING_BANNER_DEFAULTS.variant,
    density: densities.has(source.density)
      ? source.density
      : LANDING_BANNER_DEFAULTS.density,
    backgroundColor: cleanColor(
      source.backgroundColor,
      LANDING_BANNER_DEFAULTS.backgroundColor,
    ),
    textColor: cleanColor(source.textColor, LANDING_BANNER_DEFAULTS.textColor),
    accentColor: cleanColor(
      source.accentColor,
      LANDING_BANNER_DEFAULTS.accentColor,
    ),
    accentTextColor: cleanColor(
      source.accentTextColor,
      LANDING_BANNER_DEFAULTS.accentTextColor,
    ),
    borderColor: cleanColor(
      source.borderColor,
      LANDING_BANNER_DEFAULTS.borderColor,
    ),
    speedSeconds: Math.min(
      90,
      Math.max(
        10,
        cleanNumber(source.speedSeconds, LANDING_BANNER_DEFAULTS.speedSeconds),
      ),
    ),
    direction: directions.has(source.direction)
      ? source.direction
      : LANDING_BANNER_DEFAULTS.direction,
    pauseOnHover:
      typeof source.pauseOnHover === "boolean"
        ? source.pauseOnHover
        : LANDING_BANNER_DEFAULTS.pauseOnHover,
    showIcon:
      typeof source.showIcon === "boolean"
        ? source.showIcon
        : LANDING_BANNER_DEFAULTS.showIcon,
    updatedAt: source.updatedAt ?? null,
    updatedById: source.updatedById ?? null,
  };
}

export const getSafeLandingBannerHref = (href) => {
  const value = cleanText(href);
  if (!value) return "";

  if (
    value.startsWith("/") ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  ) {
    return value;
  }

  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
};
