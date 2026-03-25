import React from "react";
import { useTranslation } from "react-i18next";

import AdPlacementBlock from "../components/ads/AdPlacementBlock";
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
            {t("app.name", { defaultValue: "Bati" })}
            <span className="text-blue-600">
              {t("app.name_suffix", { defaultValue: "Quant" })}
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            {t("dashboard.subtitle", {
              defaultValue: "The go-to tool for your job sites.",
            })}
          </p>
        </section>

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <AdPlacementBlock
            placement="dashboard_banner"
            variant="inline"
            minHeight={180}
          />
        </div>
      </div>
    </div>
  );
};
