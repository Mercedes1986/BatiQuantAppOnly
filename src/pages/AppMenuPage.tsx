import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ArrowLeft,
  ShieldCheck,
  HardHat,
  FolderOpen,
  Boxes,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

type SectionCard = {
  title: string;
  desc: string;
  path: string;
  icon: React.ReactNode;
  tone: string;
};

const MainCard: React.FC<{ card: SectionCard; onClick: () => void }> = ({ card, onClick }) => (
  <button
    onClick={onClick}
    type="button"
    className="group app-card w-full rounded-[28px] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
  >
    <div className="mb-8 flex items-start justify-between gap-3">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>{card.icon}</div>
      <ChevronRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </div>
    <div className="text-[30px] font-extrabold leading-none text-slate-900 sm:text-[32px]">{card.title}</div>
    <p className="mt-3 text-sm leading-relaxed text-slate-500">{card.desc}</p>
    <div className="mt-5 text-sm font-extrabold text-blue-700">Open</div>
  </button>
);

const SecondaryCard: React.FC<{ card: SectionCard; onClick: () => void }> = ({ card, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-3 rounded-[22px] border border-white/70 bg-white/62 px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-colors hover:bg-white/78"
  >
    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone}`}>{card.icon}</div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-extrabold text-slate-900 truncate">{card.title}</div>
      <div className="text-xs text-slate-500 line-clamp-1">{card.desc}</div>
    </div>
    <ChevronRight size={18} className="text-slate-400" />
  </button>
);

export const AppMenuPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const mainCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.quicktools.title", { defaultValue: "Quick tools" }),
        desc: t("menu.cards.quicktools.desc", { defaultValue: "Dedicated quick calculators: conversions, slopes, packaging and other fast checks." }),
        path: "/app/quick-tools",
        icon: <Sparkles size={18} className="text-blue-700" />,
        tone: "bg-blue-50 text-blue-700 border border-blue-100",
      },
      {
        title: t("menu.cards.house.title", { defaultValue: "Site" }),
        desc: t("menu.cards.house.desc", { defaultValue: "Create a site and save results step-by-step (full tracking)." }),
        path: "/app/house",
        icon: <HardHat size={18} className="text-amber-700" />,
        tone: "bg-amber-50 text-amber-700 border border-amber-100",
      },
      {
        title: t("menu.cards.projects.title", { defaultValue: "Projects" }),
        desc: t("menu.cards.projects.desc", { defaultValue: "Find your saved calculations (estimates, materials, costs)." }),
        path: "/app/projects",
        icon: <FolderOpen size={18} className="text-indigo-700" />,
        tone: "bg-indigo-50 text-indigo-700 border border-indigo-100",
      },
      {
        title: t("menu.cards.materials.title", { defaultValue: "Materials & Pricing" }),
        desc: t("menu.cards.materials.desc", { defaultValue: "Adjust prices, create custom materials, labor + data." }),
        path: "/app/materials",
        icon: <Boxes size={18} className="text-emerald-700" />,
        tone: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      },
    ],
    [t]
  );

  const secondaryCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.settings.title", { defaultValue: "Settings" }),
        desc: t("menu.cards.settings.desc", { defaultValue: "Configure the app (options, preferences, display)." }),
        path: "/app/settings",
        icon: <SettingsIcon size={18} className="text-violet-700" />,
        tone: "bg-violet-50 text-violet-700 border border-violet-100",
      },
      {
        title: t("menu.cards.backup.title", { defaultValue: "JSON backup" }),
        desc: t("menu.cards.backup.desc", { defaultValue: "Export/import your data to avoid any loss (recommended)." }),
        path: "/app/materials?tab=data",
        icon: <ShieldCheck size={18} className="text-slate-700" />,
        tone: "bg-slate-50 text-slate-700 border border-slate-100",
      },
    ],
    [t]
  );

  return (
    <div className="app-shell app-shell--menu min-h-screen bg-transparent pb-24">
      <div className="page-narrow">
        <section className="glass-panel rounded-[32px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
                <LayoutGrid size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[30px] font-extrabold tracking-tight text-slate-900 sm:text-[32px]">
                  {t("menu.title", { defaultValue: "App menu" })}
                </h1>
                <p className="truncate text-sm text-slate-500">
                  {t("menu.subtitle", { defaultValue: "Quick access to sections + tools" })}
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/app/projects")}
              className="inline-flex shrink-0 items-center rounded-[22px] border border-white/70 bg-white/70 px-4 py-3 text-sm font-extrabold text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-colors hover:bg-white/85"
              type="button"
            >
              <ArrowLeft size={16} className="mr-2" />
              {t("menu.back_dashboard", { defaultValue: "Dashboard" })}
            </button>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {mainCards.map((card) => (
            <MainCard key={card.path} card={card} onClick={() => navigate(card.path)} />
          ))}
        </div>

        <section className="app-card-soft mt-4 rounded-[30px] p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-xl font-extrabold text-slate-900">
              {t("menu.secondary.title", { defaultValue: "More options" })}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("menu.secondary.subtitle", { defaultValue: "Backup and app settings." })}
            </p>
          </div>
          <div className="grid gap-2.5">
            {secondaryCards.map((card) => (
              <SecondaryCard key={card.path} card={card} onClick={() => navigate(card.path)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
