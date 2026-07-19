export const LANDING_BANNER_DEFAULTS = {
  enabled: false,
  kicker: {
    en: "Platform update",
    ar: "تحديث المنصة",
  },
  message: {
    en: "Recovera is ready for specialty-aware clinic operations.",
    ar: "ريكوفيرا جاهزة لتشغيل العيادات حسب كل تخصص.",
  },
  details: {
    en: "Book a walkthrough for your branch workflow.",
    ar: "احجز جولة تعريفية تناسب سير عمل فرعك.",
  },
  ctaLabel: {
    en: "Book a walkthrough",
    ar: "احجز جولة",
  },
  ctaHref: {
    en: "https://wa.me/201508976776?text=Hello%20Recovera%2C%20I%20would%20like%20to%20book%20a%20walkthrough.",
    ar: "https://wa.me/201508976776?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%20%D8%B1%D9%8A%D9%83%D9%88%D9%81%D9%8A%D8%B1%D8%A7%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AD%D8%AC%D8%B2%20%D8%AC%D9%88%D9%84%D8%A9%20%D8%AA%D8%B9%D8%B1%D9%8A%D9%81%D9%8A%D8%A9.",
  },
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

const cleanLocalizedText = (value, fallback) => {
  if (value === null) return { en: "", ar: "" };

  if (typeof value === "string") {
    return {
      en: cleanText(value, fallback.en),
      ar: fallback.ar,
    };
  }

  const source = value && typeof value === "object" ? value : {};

  return {
    en: cleanText(source.en, fallback.en),
    ar: cleanText(source.ar, fallback.ar),
  };
};

export const getLandingBannerLanguage = (language = "ar") =>
  String(language || "ar")
    .toLowerCase()
    .startsWith("ar")
    ? "ar"
    : "en";

export const getLocalizedLandingBannerValue = (value, language = "ar") => {
  const normalizedLanguage = getLandingBannerLanguage(language);
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";

  return value[normalizedLanguage] || value.ar || value.en || "";
};

export function normalizeLandingBanner(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};

  return {
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : LANDING_BANNER_DEFAULTS.enabled,
    kicker: cleanLocalizedText(source.kicker, LANDING_BANNER_DEFAULTS.kicker),
    message: cleanLocalizedText(
      source.message,
      LANDING_BANNER_DEFAULTS.message,
    ),
    details: cleanLocalizedText(
      source.details,
      LANDING_BANNER_DEFAULTS.details,
    ),
    ctaLabel: cleanLocalizedText(
      source.ctaLabel,
      LANDING_BANNER_DEFAULTS.ctaLabel,
    ),
    ctaHref: cleanLocalizedText(
      source.ctaHref,
      LANDING_BANNER_DEFAULTS.ctaHref,
    ),
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

export const resolveLandingBannerContent = (banner, language = "ar") => ({
  ...banner,
  kicker: getLocalizedLandingBannerValue(banner.kicker, language),
  message: getLocalizedLandingBannerValue(banner.message, language),
  details: getLocalizedLandingBannerValue(banner.details, language),
  ctaLabel: getLocalizedLandingBannerValue(banner.ctaLabel, language),
  ctaHref: getLocalizedLandingBannerValue(banner.ctaHref, language),
});
