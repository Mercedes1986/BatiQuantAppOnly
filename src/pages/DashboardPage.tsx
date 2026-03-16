import React from "react";
import { useTranslation } from "react-i18next";
import { CalculatorCard } from "../components/ui/CalculatorCard";
import { getCalculators } from "../constants";
import { CalculatorType } from "../types";

function MobileAdPlaceholder({
  title,
  description,
  minHeight = 96,
}: {
  title: string;
  description: string;
  minHeight?: number;
}) {
  return (
    <div
      className="w-full rounded-2xl border border-slate-200 bg-slate-50/85 px-3 py-3 text-center text-sm text-slate-500"
      style={{ minHeight }}
      data-ad-platform="mobile-ready-placeholder"
      role="complementary"
      aria-label={title}
    >
      <div className="flex h-full items-center justify-center">
        <div>
          <div className="font-medium text-slate-600">{title}</div>
          <div className="mt-1 text-xs text-slate-400">{description}</div>
        </div>
      </div>
    </div>
  );
}

interface DashboardPageProps {
  onSelectCalc: (id: CalculatorType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectCalc }) => {
  const { t } = useTranslation();

  return (
    <div className="app-shell app-shell--dashboard min-h-screen bg-transparent animate-in fade-in">
      <div className="page-frame space-y-4">
        <section className="glass-panel rounded-[28px] px-4 py-4 sm:rounded-[32px] sm:px-5 sm:py-5">
          <div className="page-header-chip mb-3">
            {t("dashboard.header_chip", { defaultValue: "Construction calculators" })}
          </div>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[34px]">
            {t("app.name", { defaultValue: "Bati" })}
            <span className="text-blue-600">{t("app.name_suffix", { defaultValue: "Quant" })}</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-[15px]">
            {t("dashboard.subtitle", {
              defaultValue: "The go-to tool for your job sites.",
            })}
          </p>
        </section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {getCalculators()
            .filter((calc) => calc.id !== CalculatorType.QUICK_TOOLS)
            .map((calc) => (
              <CalculatorCard key={calc.id} config={calc} onClick={() => onSelectCalc(calc.id)} />
            ))}
        </div>

        <div className="pt-2">
          <MobileAdPlaceholder
            title={t("ads.placeholderTitle", { defaultValue: "Reserved ad placement" })}
            description={t("ads.placeholderDescription", {
              defaultValue: "This area is kept for future mobile ad integration.",
            })}
            minHeight={140}
          />
        </div>
      </div>
    </div>
  );
};
