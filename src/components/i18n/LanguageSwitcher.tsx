import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n, { SUPPORTED_LANGUAGES, SupportedLanguage } from "@/i18n";
import { I18N_KEYS } from "@/i18n/keys";

type Props = {
  className?: string;
  label?: boolean;
};

type Option = {
  value: SupportedLanguage;
  label: string;
};

export function LanguageSwitcher({ className, label = true }: Props) {
  const { t } = useTranslation();

  const current = ((i18n.language || "fr").split("-")[0] || "fr") as SupportedLanguage;

  const options: Option[] = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((lng: SupportedLanguage) => ({
        value: lng,
        label: t(I18N_KEYS.language[lng]),
      })),
    [t]
  );

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lng = e.target.value as SupportedLanguage;
    await i18n.changeLanguage(lng);
    try {
      // cohérent avec i18next-browser-languagedetector
      localStorage.setItem("i18nextLng", lng);
    } catch {
      // ignore
    }
  };

  return (
    <div className={className} style={{ display: "grid", gap: 8 }}>
      {label && (
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          {t(I18N_KEYS.settings.languageTitle)}
        </div>
      )}

      <select
        value={current}
        onChange={onChange}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.2)",
          background: "transparent",
        }}
        aria-label={t(I18N_KEYS.common.language)}
      >
        {options.map((opt: Option) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        {t(I18N_KEYS.settings.languageHelp)}
      </div>
    </div>
  );
}