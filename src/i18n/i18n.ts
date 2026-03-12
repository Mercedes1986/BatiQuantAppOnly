import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr.json";
import en from "./locales/en.json";

const normalizeLng = (raw: string | null | undefined) => {
  const v = String(raw || "").toLowerCase();
  if (v.startsWith("fr")) return "fr";
  if (v.startsWith("en")) return "en";
  return null;
};

const stored = normalizeLng(localStorage.getItem("i18nextLng"));
const browser =
  normalizeLng(navigator.language) ||
  (Array.isArray(navigator.languages) ? normalizeLng(navigator.languages[0]) : null);

// ✅ IMPORTANT:
// - lng default = "en" (so a fresh install is EN)
// - fallbackLng = "en" (never fall back to FR when a key is missing)
// - supportedLngs to avoid weird values like "en-US" being stored as-is
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

  // ✅ indispensable pour viser 100%
  returnNull: false,
  returnEmptyString: false,

  // ✅ log des clés manquantes (utile en dev)
  saveMissing: true,
  missingKeyHandler: (_lng, _ns, key) => {
    // eslint-disable-next-line no-console
    console.warn("[i18n missing]", key);
  },
});

export default i18n;