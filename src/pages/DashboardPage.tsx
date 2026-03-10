
import React from "react";
import { useTranslation } from "react-i18next";
import { CalculatorCard } from "../components/ui/CalculatorCard";
import { getCalculators } from "../constants";
import { CalculatorType } from "../types";
interface DashboardPageProps {
  onSelectCalc: (id: CalculatorType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectCalc }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-transparent animate-in fade-in">
      <div className="max-w-7xl mx-auto p-4 pb-24">
        <header className="mb-6 mt-2 px-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("app.name", { defaultValue: "Bati" })}
            <span className="text-blue-600">
              {t("app.name_suffix", { defaultValue: "Quant" })}
            </span>
          </h1>
          <p className="text-slate-500 text-sm">
            {t("dashboard.subtitle", {
              defaultValue: "The go-to tool for your job sites.",
            })}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-2 lg:grid-cols-3">
          {getCalculators()
            .filter((calc) => calc.id !== CalculatorType.QUICK_TOOLS)
            .map((calc) => (
              <CalculatorCard
                key={calc.id}
                config={calc}
                onClick={() => onSelectCalc(calc.id)}
              />
            ))}
        </div>

        <div className="mt-10">
          <MobileAdPlaceholder
            title={t("ads.placeholderTitle", { defaultValue: "Reserved ad placement" })}
            description={t("ads.placeholderDescription", {
              defaultValue: "This area is kept for future mobile ad integration.",
            })}
            minHeight={180}
          />
        </div>
      </div>
    </div>
  );
};
