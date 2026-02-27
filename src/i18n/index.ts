import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import fr from "./locales/fr.json";
import en from "./locales/en.json";

const SUPPORTED = ["fr", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED)[number];
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = SUPPORTED;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: "fr",
    supportedLngs: [...SUPPORTED],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    react: { useSuspense: false },
  });

// ✅ synchronise <html lang="...">
const syncHtmlLang = (lng: string) => {
  try {
    const short = String(lng || "fr").split("-")[0];
    document.documentElement.setAttribute("lang", short);
  } catch {
    // ignore
  }
};

syncHtmlLang(i18n.language);
i18n.on("languageChanged", (lng) => syncHtmlLang(lng));

export default i18n;