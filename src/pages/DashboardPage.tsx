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
    <div className="min-h-full bg-transparent animate-in fade-in safe-bottom-offset">
      <div className="max-w-7xl mx-auto p-4">
        <section className="glass-panel mb-4 rounded-[32px] px-5 py-5">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {t("dashboard.hero_title", { defaultValue: "Detailed estimators" })}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t("dashboard.hero_subtitle", {
              defaultValue:
                "Use the full calculators when you need detailed quantities, materials and cost breakdowns for a real job-site estimate.",
            })}
          </p>
        </section>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {getCalculators()
            .filter((calc) => calc.id !== CalculatorType.QUICK_TOOLS)
            .map((calc) => (
              <CalculatorCard key={calc.id} config={calc} onClick={() => onSelectCalc(calc.id)} />
            ))}
        </div>
      </div>
    </div>
  );
};
