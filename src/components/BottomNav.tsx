import React, { useMemo } from "react";
import { Calculator, FolderOpen, Hammer, LayoutGrid, Package } from "lucide-react";
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
      { id: "menu", icon: LayoutGrid, label: t("nav.menu", { defaultValue: "Home" }) },
      { id: "quick-tools", icon: Calculator, label: t("nav.quick_tools", { defaultValue: "Express" }) },
      { id: "projects", icon: FolderOpen, label: t("nav.calculators", { defaultValue: "Calculators" }) },
      { id: "house", icon: Hammer, label: t("nav.site", { defaultValue: "Site" }) },
      { id: "materials", icon: Package, label: t("nav.materials", { defaultValue: "Materials" }) },
    ],
    [t]
  );

  return (
    <div className="no-print mx-auto w-full max-w-[620px]">
      <div className="rounded-[30px] border border-white/75 bg-white/82 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <div className="grid h-[72px] grid-cols-5 gap-1.5">
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
                className={`flex h-full min-w-0 flex-col items-center justify-center rounded-[20px] px-1 transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-b from-blue-600 to-blue-500 text-white shadow-[0_10px_24px_rgba(37,99,235,0.35)]"
                    : "text-slate-600 hover:bg-white/72 hover:text-slate-800"
                }`}
              >
                <Icon size={active ? 20 : 18} strokeWidth={active ? 2.35 : 2.1} />
                <span
                  className={`mt-1 line-clamp-2 text-center text-[11px] font-extrabold leading-tight ${
                    active ? "text-white" : ""
                  }`}
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
