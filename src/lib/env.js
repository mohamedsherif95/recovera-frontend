const readString = (key, fallback = "") => {
  const value = import.meta.env[key];
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
};

const readBoolean = (key, fallback = false) => {
  const value = readString(key);
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const readPositiveInteger = (key, fallback) => {
  const value = Number(readString(key));
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

export const env = Object.freeze({
  apiBaseUrl: readString("VITE_API_BASE_URL", "http://localhost:8080"),
  apiTimeoutMs: readPositiveInteger("VITE_API_TIMEOUT_MS", 30000),
  appName: readString("VITE_APP_NAME", "Recovera"),
  businessTimeZone: readString("VITE_APP_BUSINESS_TIME_ZONE", "Africa/Cairo"),
  gtmId: readString("VITE_GTM_ID"),
  analyticsDebug: readBoolean("VITE_ANALYTICS_DEBUG"),
});
