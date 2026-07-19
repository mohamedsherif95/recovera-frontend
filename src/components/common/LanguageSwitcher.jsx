import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const activeLanguage = String(i18n.resolvedLanguage || i18n.language || "ar")
    .toLowerCase()
    .startsWith("ar")
    ? "ar"
    : "en";

  const toggleLanguage = () => {
    const newLang = activeLanguage === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLanguage}>
      {activeLanguage === "en" ? "AR" : "EN"}
    </Button>
  );
}
