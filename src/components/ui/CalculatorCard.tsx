import React from "react";
import * as Icons from "lucide-react";
import { CalculatorConfig } from "../../../types";
import { useTranslation } from "react-i18next";

interface CalculatorCardProps {
  config: CalculatorConfig;
  onClick: () => void;
}

/**
 * Update goals:
 * - Keep the same i18n key: calculator.open
 * - Replace FR defaultValue -> EN to prevent FR fallback ("Franglais") if EN key is missing
 * - Minor a11y: add type="button"
 */
export const CalculatorCard: React.FC<CalculatorCardProps> = ({ config, onClick }) => {
  const { t } = useTranslation();
  const IconComponent = (Icons as any)[config.icon] || Icons.Calculator;
  const [imgOk, setImgOk] = React.useState(true);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 hover:shadow-md active:scale-[0.99] transition-all overflow-hidden"
    >
      <div className="relative h-[92px] sm:h-[104px]">
        {config.imageSrc && imgOk ? (
          <img
            src={config.imageSrc}
            alt={config.imageAlt || config.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
        )}

        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

        <div className="relative h-full p-3 pr-14 flex flex-col justify-center">
          <h3 className="text-[15px] sm:text-base font-extrabold text-white leading-tight drop-shadow-sm truncate">
            {config.name}
          </h3>
          <p className="text-[12px] sm:text-sm text-white/90 leading-snug line-clamp-2 drop-shadow-sm">
            {config.description}
          </p>
        </div>

        <div
          className={`absolute top-3 right-3 p-2 rounded-xl ${config.color} text-white shadow-md border border-white/70`}
        >
          <IconComponent size={16} />
        </div>

        <div className="absolute bottom-3 right-3 text-white/80 group-hover:text-white transition-colors drop-shadow">
          <Icons.ChevronRight size={18} />
        </div>
      </div>

      <div className="h-10 px-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Icons.Sparkles size={14} className="text-slate-300" />
          <span className="truncate">
            {t("calculator.open", { defaultValue: "Open calculator" })}
          </span>
        </div>
        <span className="text-[11px] text-slate-400"> </span>
      </div>
    </button>
  );
};