import React, { useMemo } from "react";
import { FolderOpen, Settings, Hammer, Package, Menu, Calculator } from "lucide-react";
import { useTranslation } from "react-i18next";

interface BottomNavProps {
  currentTab: string;
  onChange: (tab: string) => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChange }) => {
  const { t } = useTranslation();

  const navItems: NavItem[] = useMemo(
    () => [
      { id: "menu", icon: Menu, label: t("nav.menu", { defaultValue: "Menu" }) },
      { id: "quick-tools", icon: Calculator, label: t("nav.quick_tools", { defaultValue: "Quick" }) },
      { id: "projects", icon: FolderOpen, label: t("nav.projects", { defaultValue: "Projects" }) },
      { id: "house", icon: Hammer, label: t("nav.site", { defaultValue: "Site" }) },
      { id: "materials", icon: Package, label: t("nav.materials", { defaultValue: "Materials" }) },
      { id: "settings", icon: Settings, label: t("nav.settings", { defaultValue: "Settings" }) },
    ],
    [t]
  );

  return (
    <div className="no-print fixed bottom-2 left-1/2 z-50 w-[min(97vw,700px)] -translate-x-1/2 px-1 sm:bottom-3 sm:px-0">
      <div className="rounded-[28px] border border-white/70 bg-white/74 p-1.5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
        <div className="grid min-h-[78px] grid-cols-6 gap-1 sm:min-h-[72px] sm:gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={[
                  "flex h-full min-w-0 flex-col items-center justify-center rounded-[18px] px-1 py-2 text-center transition-all duration-200",
                  active
                    ? "bg-gradient-to-b from-blue-600 to-blue-500 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-700",
                ].join(" ")}
              >
                <Icon size={active ? 19 : 18} strokeWidth={active ? 2.3 : 2.1} />
                <span
                  className={[
                    "mt-1 line-clamp-2 min-h-[22px] max-w-full px-0.5 text-center text-[9px] font-extrabold leading-[1.05] sm:min-h-[24px] sm:text-[10px]",
                    active ? "text-white" : "",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
