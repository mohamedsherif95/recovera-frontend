const GTM_SCRIPT_ID = "recovera-gtm-script";
const DATA_LAYER_NAME = "dataLayer";

let analyticsStarted = false;
let routerUnsubscribe = null;
let lastTrackedUrl = "";

export const ANALYTICS_EVENTS = Object.freeze({
  PAGE_VIEW: "app_page_view",
  CONTACT_CLICK: "contact_click",
  LANDING_BANNER_HOVER: "landing_banner_hover",
  LANDING_BANNER_CTA_CLICK: "landing_banner_cta_click",
});

const getWindow = () => (typeof window === "undefined" ? null : window);

const getGtmId = () => String(import.meta.env.VITE_GTM_ID || "").trim();

const getAnalyticsDebugEnabled = () =>
  String(import.meta.env.VITE_ANALYTICS_DEBUG || "").toLowerCase() === "true";

export const createAnalyticsEventId = () => {
  const currentWindow = getWindow();
  const randomUuid = currentWindow?.crypto?.randomUUID;

  if (typeof randomUuid === "function") {
    return randomUuid.call(currentWindow.crypto);
  }

  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export const initDataLayer = () => {
  const currentWindow = getWindow();
  if (!currentWindow) return null;

  currentWindow[DATA_LAYER_NAME] = currentWindow[DATA_LAYER_NAME] || [];
  return currentWindow[DATA_LAYER_NAME];
};

const cleanPayload = (payload) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null),
  );

export const pushDataLayerEvent = (event, payload = {}) => {
  const dataLayer = initDataLayer();
  if (!dataLayer || !event) return null;

  const analyticsEvent = cleanPayload({
    event,
    event_id: payload.event_id || createAnalyticsEventId(),
    app_name: "recovera",
    ...payload,
  });

  dataLayer.push(analyticsEvent);

  if (getAnalyticsDebugEnabled()) {
    console.info("[analytics]", analyticsEvent);
  }

  return analyticsEvent;
};

export const initGoogleTagManager = () => {
  const currentWindow = getWindow();
  if (!currentWindow || typeof document === "undefined") return;

  const gtmId = getGtmId();
  initDataLayer();

  if (!gtmId || document.getElementById(GTM_SCRIPT_ID)) return;

  currentWindow[DATA_LAYER_NAME].push({
    "gtm.start": Date.now(),
    event: "gtm.js",
  });

  const script = document.createElement("script");
  script.id = GTM_SCRIPT_ID;
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
};

const getPageArea = (pathname) => {
  if (pathname === "/") return "marketing";
  if (
    [
      "/login",
      "/first-login",
      "/forgot-password",
      "/reset-password",
      "/unauthorized",
    ].includes(pathname)
  ) {
    return "auth";
  }
  if (pathname.startsWith("/platform-admin")) return "platform_admin";
  return "app";
};

const getCurrentPagePayload = (location, previousUrl = "") => {
  const currentWindow = getWindow();
  const pathname = location?.pathname || currentWindow?.location?.pathname || "/";
  const search = location?.search || currentWindow?.location?.search || "";
  const hash = location?.hash || currentWindow?.location?.hash || "";
  const pageArea = getPageArea(pathname);

  return {
    page_location: currentWindow?.location?.href || "",
    page_path: pathname,
    page_search: search,
    page_hash: hash,
    page_title: typeof document === "undefined" ? "" : document.title,
    page_referrer: typeof document === "undefined" ? "" : document.referrer,
    previous_page_location: previousUrl,
    page_area: pageArea,
    is_public_page: pageArea === "marketing" || pageArea === "auth",
  };
};

export const trackPageView = ({ location, previousUrl = "", source = "router" } = {}) =>
  pushDataLayerEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    ...getCurrentPagePayload(location, previousUrl),
    page_view_source: source,
  });

const schedulePageView = ({ location, previousUrl, source }) => {
  const currentWindow = getWindow();
  const track = () => trackPageView({ location, previousUrl, source });

  if (currentWindow) {
    currentWindow.setTimeout(track, 0);
    return;
  }

  track();
};

export const startAnalytics = (router) => {
  const currentWindow = getWindow();
  if (!currentWindow || analyticsStarted) return;

  analyticsStarted = true;
  initGoogleTagManager();

  const currentLocation = router?.state?.location || currentWindow.location;
  lastTrackedUrl = currentWindow.location.href;
  schedulePageView({
    location: currentLocation,
    previousUrl: document.referrer || "",
    source: "initial",
  });

  if (typeof router?.subscribe === "function") {
    routerUnsubscribe = router.subscribe((state) => {
      const nextLocation = state.location;
      const nextUrl = currentWindow.location.href;
      if (nextUrl === lastTrackedUrl) return;

      const previousUrl = lastTrackedUrl;
      lastTrackedUrl = nextUrl;
      schedulePageView({
        location: nextLocation,
        previousUrl,
        source: "router",
      });
    });
  }

  currentWindow.addEventListener("hashchange", () => {
    const nextUrl = currentWindow.location.href;
    if (nextUrl === lastTrackedUrl) return;

    const previousUrl = lastTrackedUrl;
    lastTrackedUrl = nextUrl;
    schedulePageView({
      location: currentWindow.location,
      previousUrl,
      source: "hashchange",
    });
  });
};

export const stopAnalytics = () => {
  if (typeof routerUnsubscribe === "function") {
    routerUnsubscribe();
  }
  routerUnsubscribe = null;
  analyticsStarted = false;
};

export const getAnalyticsDestinationType = (href = "") => {
  const value = String(href || "").trim();
  if (!value) return "unknown";
  if (value.startsWith("#")) return "section_anchor";
  if (value.startsWith("/")) return "internal";
  if (value.startsWith("mailto:")) return "email";
  if (value.startsWith("tel:")) return "phone";

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (hostname === "wa.me" || hostname.endsWith(".whatsapp.com")) {
      return "whatsapp";
    }

    if (hostname === getWindow()?.location?.hostname?.toLowerCase()) {
      return "internal";
    }

    return "external";
  } catch {
    return "unknown";
  }
};

const withDestinationContext = (payload = {}) => {
  const href = payload.destination_url || payload.cta_href || payload.banner_cta_href || "";
  const destinationType = getAnalyticsDestinationType(href);

  return cleanPayload({
    ...payload,
    destination_type: payload.destination_type || destinationType,
    recommended_meta_event:
      payload.recommended_meta_event ||
      (["whatsapp", "email", "phone"].includes(destinationType) ? "Contact" : undefined),
  });
};

export const trackContactClick = (payload = {}) =>
  pushDataLayerEvent(
    ANALYTICS_EVENTS.CONTACT_CLICK,
    withDestinationContext({
      interaction_type: "click",
      ...payload,
    }),
  );

export const trackLandingBannerHover = (payload = {}) =>
  pushDataLayerEvent(ANALYTICS_EVENTS.LANDING_BANNER_HOVER, {
    interaction_type: "hover",
    ...payload,
  });

export const trackLandingBannerCtaClick = (payload = {}) =>
  pushDataLayerEvent(
    ANALYTICS_EVENTS.LANDING_BANNER_CTA_CLICK,
    withDestinationContext({
      interaction_type: "click",
      ...payload,
    }),
  );
