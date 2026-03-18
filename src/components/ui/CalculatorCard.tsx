import React from "react";
import * as Icons from "lucide-react";
import { CalculatorConfig } from "../../../types";
import { useTranslation } from "react-i18next";

interface CalculatorCardProps {
  config: CalculatorConfig;
  onClick: () => void;
}

export const CalculatorCard: React.FC<CalculatorCardProps> = ({ config, onClick }) => {
  const { t } = useTranslation();
  const IconComponent = (Icons as any)[config.icon] || Icons.Calculator;
  const [imgOk, setImgOk] = React.useState(true);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group app-card w-full overflow-hidden rounded-[24px] text-left transition-all hover:border-blue-200 hover:shadow-md active:scale-[0.99]"
    >
      <div className="relative h-[98px] sm:h-[108px]">
        {config.imageSrc && imgOk ? (
          <img
            src={config.imageSrc}
            alt={config.imageAlt || config.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200" />
        )}

        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/38 to-transparent" />

        <div className="relative flex h-full flex-col justify-center p-3 pr-12 sm:p-4 sm:pr-14">
          <h3 className="line-clamp-2 text-[15px] font-extrabold leading-tight text-white drop-shadow-sm sm:text-base">
            {config.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/90 drop-shadow-sm sm:text-sm">
            {config.description}
          </p>
        </div>

        <div className={`absolute right-3 top-3 rounded-xl border border-white/70 p-2 ${config.color} text-white shadow-md`}>
          <IconComponent size={16} />
        </div>

        <div className="absolute bottom-3 right-3 text-white/80 transition-colors drop-shadow group-hover:text-white">
          <Icons.ChevronRight size={18} />
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
