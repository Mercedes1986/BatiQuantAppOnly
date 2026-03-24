import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr.json";
import en from "./locales/en.json";
import { getPreferredLanguage } from "../services/persistentStorage";

const SUPPORTED = ["fr", "en"] as const;

export type SupportedLanguage = (typeof SUPPORTED)[number];
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = SUPPORTED;

const normalizeLanguage = (raw: string | null | undefined): SupportedLanguage | null => {
  const value = String(raw || "").toLowerCase();
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("en")) return "en";
  return null;
};

const stored = normalizeLanguage(getPreferredLanguage());
const browser =
  normalizeLanguage(typeof navigator !== "undefined" ? navigator.language : null) ||
  (typeof navigator !== "undefined" && Array.isArray(navigator.languages)
    ? normalizeLanguage(navigator.languages[0])
    : null);

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  fallbackLng: "en",
  supportedLngs: [...SUPPORTED],
  nonExplicitSupportedLngs: true,
  load: "languageOnly",
  lng: stored || browser || "en",
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
  react: { useSuspense: false },
});

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
