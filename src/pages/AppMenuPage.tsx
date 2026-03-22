import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ShieldCheck,
  HardHat,
  FolderOpen,
  Boxes,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
  FileText,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { getQuotes } from "../services/documentsStorage";
import { getHouseProjects, getProjects } from "../services/storage";

type SectionCard = {
  title: string;
  desc: string;
  path: string;
  icon: React.ReactNode;
  tone: string;
};

const PrimaryCard: React.FC<{
  card: SectionCard;
  onClick: () => void;
  ctaLabel: string;
}> = ({ card, onClick, ctaLabel }) => (
  <button
    onClick={onClick}
    type="button"
    className="group app-card w-full rounded-[28px] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
  >
    <div className="mb-6 flex items-start justify-between gap-3">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}>{card.icon}</div>
      <ChevronRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </div>

    <div className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-[28px]">{card.title}</div>
    <p className="mt-3 text-sm leading-relaxed text-slate-500">{card.desc}</p>
    <div className="mt-5 inline-flex items-center text-sm font-extrabold text-blue-700">
      {ctaLabel}
      <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-0.5" />
    </div>
  </button>
);

const SecondaryCard: React.FC<{ card: SectionCard; onClick: () => void }> = ({ card, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center gap-3 rounded-[22px] border border-white/70 bg-white/62 px-4 py-4 text-left shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-colors hover:bg-white/78"
  >
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${card.tone}`}>{card.icon}</div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-extrabold text-slate-900">{card.title}</div>
      <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{card.desc}</div>
    </div>
    <ChevronRight size={18} className="shrink-0 text-slate-400" />
  </button>
);

const StatCard: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="rounded-[22px] border border-white/70 bg-white/65 px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl">
    <div className="text-xl font-extrabold leading-none text-slate-900">{value}</div>
    <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
  </div>
);

export const AppMenuPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const quotesCount = getQuotes().length;
  const projectsCount = getProjects().length;
  const sitesCount = getHouseProjects().length;

  const primaryCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.quicktools.title", { defaultValue: "Quick site tools" }),
        desc: t("menu.cards.quicktools.desc", {
          defaultValue: "Open the fast calculators for conversions, slopes, packaging and instant checks.",
        }),
        path: "/app/quick-tools",
        icon: <Sparkles size={18} className="text-blue-700" />,
        tone: "bg-blue-50 text-blue-700 border border-blue-100",
      },
      {
        title: t("menu.cards.house.title", { defaultValue: "Site" }),
        desc: t("menu.cards.house.desc", {
          defaultValue: "Create a site and save each step to keep a full estimate history.",
        }),
        path: "/app/house",
        icon: <HardHat size={18} className="text-amber-700" />,
        tone: "bg-amber-50 text-amber-700 border border-amber-100",
      },
    ],
    [t]
  );

  const secondaryCards: SectionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.projects.title", { defaultValue: "Projects" }),
        desc: t("menu.cards.projects.desc", {
          defaultValue: "Find your saved calculations, materials and totals.",
        }),
        path: "/app/projects",
        icon: <FolderOpen size={18} className="text-indigo-700" />,
        tone: "bg-indigo-50 text-indigo-700 border border-indigo-100",
      },
      {
        title: t("menu.cards.quotes.title", { defaultValue: "My quotes" }),
        desc: t("menu.cards.quotes.desc", {
          defaultValue: "See every quote created from projects and sites in one place.",
        }),
        path: "/app/quotes",
        icon: <FileText size={18} className="text-rose-700" />,
        tone: "bg-rose-50 text-rose-700 border border-rose-100",
      },
      {
        title: t("menu.cards.materials.title", { defaultValue: "Materials & Pricing" }),
        desc: t("menu.cards.materials.desc", {
          defaultValue: "Adjust prices, custom materials, labor and data.",
        }),
        path: "/app/materials",
        icon: <Boxes size={18} className="text-emerald-700" />,
        tone: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      },
      {
        title: t("menu.cards.settings.title", { defaultValue: "Settings" }),
        desc: t("menu.cards.settings.desc", {
          defaultValue: "Configure the app, company profile and preferences.",
        }),
        path: "/app/settings",
        icon: <SettingsIcon size={18} className="text-violet-700" />,
        tone: "bg-violet-50 text-violet-700 border border-violet-100",
      },
      {
        title: t("menu.cards.backup.title", { defaultValue: "JSON backup" }),
        desc: t("menu.cards.backup.desc", {
          defaultValue: "Export or import your data to avoid any loss.",
        }),
        path: "/app/materials?tab=data",
        icon: <ShieldCheck size={18} className="text-slate-700" />,
        tone: "bg-slate-50 text-slate-700 border border-slate-100",
      },
    ],
    [t]
  );

  return (
    <div className="app-shell app-shell--menu min-h-screen bg-transparent pb-6">
      <div className="page-narrow space-y-4">
        <section className="glass-panel rounded-[32px] p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="page-header-chip">{t("menu.dashboard_badge", { defaultValue: "Worksite dashboard" })}</div>
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
                  <LayoutGrid size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 sm:text-[32px]">
                    {t("menu.title", { defaultValue: "Main menu" })}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                    {t("menu.subtitle", {
                      defaultValue: "Open the tools you use most often without losing time in extra navigation.",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:min-w-[320px]">
              <StatCard value={quotesCount} label={t("menu.stats.quotes", { defaultValue: "Quotes" })} />
              <StatCard value={projectsCount} label={t("menu.stats.projects", { defaultValue: "Projects" })} />
              <StatCard value={sitesCount} label={t("menu.stats.sites", { defaultValue: "Sites" })} />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t("menu.primary.title", { defaultValue: "Priority actions" })}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {t("menu.primary.subtitle", { defaultValue: "The most useful entries for daily work." })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {primaryCards.map((card) => (
              <PrimaryCard
                key={card.path}
                card={card}
                onClick={() => navigate(card.path)}
                ctaLabel={t("menu.open", { defaultValue: "Open" })}
              />
            ))}
          </div>
        </section>

        <section className="app-card-soft rounded-[30px] p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-lg font-extrabold text-slate-900">
              {t("menu.secondary.title", { defaultValue: "Continue" })}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {t("menu.secondary.subtitle", { defaultValue: "Quotes, projects, materials and app options." })}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {secondaryCards.map((card) => (
              <SecondaryCard key={card.path} card={card} onClick={() => navigate(card.path)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
