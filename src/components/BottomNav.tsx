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
  activeClass: string;
};

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onChange }) => {
  const { t } = useTranslation();

  const navItems: NavItem[] = useMemo(
    () => [
      { id: "menu", icon: Menu, label: t("nav.menu", { defaultValue: "Menu" }), activeClass: "text-blue-700" },
      { id: "quick-tools", icon: Calculator, label: t("nav.quick_tools", { defaultValue: "Rapides" }), activeClass: "text-cyan-700" },
      { id: "projects", icon: FolderOpen, label: t("nav.projects", { defaultValue: "Projets" }), activeClass: "text-indigo-700" },
      { id: "house", icon: Hammer, label: t("nav.site", { defaultValue: "Chantier" }), activeClass: "text-amber-700" },
      { id: "materials", icon: Package, label: t("nav.materials", { defaultValue: "Matériaux" }), activeClass: "text-emerald-700" },
      { id: "settings", icon: Settings, label: t("nav.settings", { defaultValue: "Réglages" }), activeClass: "text-violet-700" },
    ],
    [t]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 no-print px-2 pb-2">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-t-3xl border border-white/70 bg-white/84 backdrop-blur-xl shadow-[0_-10px_35px_rgba(15,23,42,0.08)] safe-area-pb">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-200 via-cyan-200 to-emerald-200" />
        <div className="flex justify-between items-center h-16 min-w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className={`relative flex flex-col items-center justify-center min-w-[52px] flex-1 h-full space-y-1 transition-all ${
                  active ? item.activeClass : "text-slate-400 hover:text-slate-600"
                }`}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                type="button"
              >
                {active && <span className="absolute top-1 h-1.5 w-8 rounded-full bg-current/80" />}
                <span className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-all ${active ? "bg-current/10 shadow-sm" : ""}`}>
                  <Icon size={active ? 21 : 19} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className={`text-[10px] font-semibold ${active ? "text-current" : ""}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
