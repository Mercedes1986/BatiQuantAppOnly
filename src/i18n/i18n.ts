import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr.json";
import en from "./locales/en.json";
import { getPreferredLanguage } from "../services/persistentStorage";

const normalizeLng = (raw: string | null | undefined) => {
  const value = String(raw || "").toLowerCase();
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("en")) return "en";
  return null;
};

const stored = normalizeLng(getPreferredLanguage());
const browser =
  normalizeLng(typeof navigator !== "undefined" ? navigator.language : null) ||
  (typeof navigator !== "undefined" && Array.isArray(navigator.languages)
    ? normalizeLng(navigator.languages[0])
    : null);

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  supportedLngs: ["en", "fr"],
  nonExplicitSupportedLngs: true,
  lng: stored || browser || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
  returnEmptyString: false,
  saveMissing: true,
  missingKeyHandler: (_lng, _ns, key) => {
    console.warn("[i18n missing]", key);
  },
});

export default i18n;
