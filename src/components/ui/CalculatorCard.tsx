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
      className="group relative w-full overflow-hidden rounded-[28px] border border-white/70 bg-white/86 text-left backdrop-blur-xl shadow-[0_18px_44px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(37,99,235,0.14)] focus:outline-none focus:ring-2 focus:ring-blue-300/70"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/28 via-transparent to-blue-50/35 opacity-70" />

      <div className="relative flex min-h-[196px] flex-col">
        <div className="relative h-[116px] overflow-hidden">
          {config.imageSrc && imgOk ? (
            <img
              src={config.imageSrc}
              alt={config.imageAlt || config.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/72 via-slate-900/36 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/15 to-transparent" />

          <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/75 bg-white/88 text-slate-900 shadow-lg backdrop-blur-md">
            <div className={`${config.color} rounded-xl p-2 text-white shadow-sm`}>
              <IconComponent size={16} />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-4 pr-16">
            <h3 className="truncate text-[18px] font-extrabold leading-tight text-white drop-shadow-sm">
              {config.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/88 drop-shadow-sm">
              {config.description}
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-between px-4 py-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[12px] font-bold text-blue-700">
            <Icons.Sparkles size={13} />
            <span>{t("calculator.open", { defaultValue: "Open calculator" })}</span>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            <Icons.ChevronRight size={18} />
          </div>
        </div>
      </div>
    </button>
  );
};
