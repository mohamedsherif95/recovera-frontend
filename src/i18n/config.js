import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const normalizeLanguage = (lng) =>
  String(lng || "ar")
    .toLowerCase()
    .startsWith("ar")
    ? "ar"
    : "en";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: "ar",
    supportedLngs: ["en", "ar"],
    load: "languageOnly",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
    },
  });

// Set HTML dir attribute based on language
i18n.on("languageChanged", (lng) => {
  const normalizedLng = normalizeLanguage(lng);
  const dir = normalizedLng === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", normalizedLng);
});

// Set initial direction
const currentLang = normalizeLanguage(i18n.resolvedLanguage || i18n.language);
const dir = currentLang === "ar" ? "rtl" : "ltr";
document.documentElement.setAttribute("dir", dir);
document.documentElement.setAttribute("lang", currentLang);

export default i18n;
