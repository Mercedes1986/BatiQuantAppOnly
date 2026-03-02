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
    // Important: when the user selects English, do NOT fall back to French.
    // Missing keys should fall back to English defaults in code (defaultValue) instead.
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED],
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },

    returnNull: false,
    returnEmptyString: false,

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    react: { useSuspense: false },

    // (Optionnel) utile pour détecter les clés manquantes pendant dev
    // saveMissing: true,
    // missingKeyHandler: (_, __, key) => console.warn("[i18n missing]", key),
  });

// ✅ synchronise <html lang="...">
const syncHtmlLang = (lng: string) => {
  try {
    const short = String(lng || "en").split("-")[0];
    document.documentElement.setAttribute("lang", short);
  } catch {
    // ignore
  }
};

syncHtmlLang(i18n.language);
i18n.on("languageChanged", (lng) => syncHtmlLang(lng));

export default i18n;