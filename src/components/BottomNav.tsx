import React, { useMemo } from "react";
import { FolderOpen, Settings, Hammer, Package, Menu } from "lucide-react";
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
      {
        id: "projects",
        icon: FolderOpen,
        label: t("nav.projects", { defaultValue: "Projects" }),
      },
      { id: "house", icon: Hammer, label: t("nav.site", { defaultValue: "Site" }) },
      { id: "materials", icon: Package, label: t("nav.materials", { defaultValue: "Mat." }) },
      { id: "settings", icon: Settings, label: t("nav.settings", { defaultValue: "Settings" }) },
    ],
    [t]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-pb no-print z-50 overflow-x-auto no-scrollbar">
      <div className="flex justify-between items-center h-16 min-w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`flex flex-col items-center justify-center min-w-[50px] flex-1 h-full space-y-1 transition-colors ${
                active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              type="button"
            >
              <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-medium ${active ? "text-blue-700" : ""}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
