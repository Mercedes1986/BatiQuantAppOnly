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
      { id: "quick-tools", icon: Calculator, label: t("nav.quick_tools", { defaultValue: "Rapides" }) },
      { id: "projects", icon: FolderOpen, label: t("nav.projects", { defaultValue: "Projets" }) },
      { id: "house", icon: Hammer, label: t("nav.site", { defaultValue: "Chantier" }) },
      { id: "materials", icon: Package, label: t("nav.materials", { defaultValue: "Matériaux" }) },
      { id: "settings", icon: Settings, label: t("nav.settings", { defaultValue: "Réglages" }) },
    ],
    [t]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur border-t border-slate-200 safe-area-pb no-print z-50">
      <div className="grid grid-cols-6 h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center justify-center h-full transition-colors rounded-none ${
                active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              type="button"
            >
              <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 2.1} />
              <span className={`mt-1 text-[10px] leading-none font-semibold ${active ? "text-blue-700" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
