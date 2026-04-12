import React from "react";
import * as Icons from "lucide-react";
import { CalculatorConfig } from "@/types";
import { useTranslation } from "react-i18next";

interface CalculatorCardProps {
  config: CalculatorConfig;
  onClick: () => void;
}

export const CalculatorCard: React.FC<CalculatorCardProps> = ({ config, onClick }) => {
  const { t } = useTranslation();
  const IconComponent = (Icons as any)[config.icon] || Icons.Calculator;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group app-card w-full overflow-hidden rounded-[24px] text-left transition-all hover:border-blue-200 hover:shadow-md active:scale-[0.99]"
    >
      <div className="relative min-h-[108px] bg-gradient-to-br from-slate-50 via-white to-slate-100 p-3 sm:min-h-[118px] sm:p-4">
        <div className="absolute right-3 top-3 text-slate-300 transition-colors group-hover:text-slate-400">
          <Icons.ChevronRight size={18} />
        </div>

        <div className="flex h-full items-start gap-3 pr-8 sm:gap-4 sm:pr-10">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/80 ${config.color} text-white shadow-sm sm:h-16 sm:w-16`}>
            <IconComponent size={24} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-extrabold leading-tight text-slate-900 sm:text-base">
              {config.name}
            </h3>
            <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-slate-600 sm:text-sm">
              {config.description}
            </p>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <Icons.Sparkles size={12} className="text-slate-400" />
              {t("calculator.ready", { defaultValue: "Ready to use" })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-[44px] items-center justify-between px-3 py-2.5 sm:min-h-[46px] sm:px-4">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-600">
          <Icons.Sparkles size={14} className="shrink-0 text-slate-300" />
          <span className="line-clamp-2 leading-tight">
            {t("calculator.open", { defaultValue: "Open calculator" })}
          </span>
        </div>
        <span className="text-[11px] text-slate-400" />
      </div>
    </button>
  );
};
