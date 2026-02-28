import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import fr from "./locales/fr.json";
import en from "./locales/en.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: localStorage.getItem("i18nextLng") || "fr",
    fallbackLng: "fr",
    interpolation: { escapeValue: false },

    // ✅ indispensable pour viser 100%
    returnNull: false,
    returnEmptyString: false,

    // ✅ log des clés manquantes
    saveMissing: true,
    missingKeyHandler: (_lng, _ns, key) => {
      // clé manquante = à ajouter dans fr/en
      // eslint-disable-next-line no-console
      console.warn("[i18n missing]", key);
    },
  });

export default i18n;