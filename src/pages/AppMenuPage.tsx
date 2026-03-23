import React, { useEffect, useMemo, useState } from "react";
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
  Clock3,
  ArrowUpRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { getQuotes, onDocumentsChanged } from "../services/documentsStorage";
import { getHouseProjects, getProjects, onProjectsChanged } from "../services/storage";
import type { HouseProject, Project, QuoteDocument } from "../types";

type ActionCard = {
  title: string;
  desc: string;
  path: string;
  icon: React.ReactNode;
  tone: string;
};

type Shortcut = {
  label: string;
  path: string;
  icon: React.ReactNode;
};

type ResumeCardData = {
  label: string;
  title: string;
  meta: string;
  path?: string;
};

const formatDateValue = (value?: string | null, locale?: string) => {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleDateString(locale || undefined);
};

const byNewest = <T,>(items: T[], getDate: (item: T) => string | undefined) =>
  [...items].sort((a, b) => {
    const aTime = new Date(getDate(a) || 0).getTime();
    const bTime = new Date(getDate(b) || 0).getTime();
    return bTime - aTime;
  });

const CompactStatCard: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="rounded-[22px] border border-white/70 bg-white/70 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl">
    <div className="text-xl font-extrabold leading-none text-slate-900">{value}</div>
    <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
  </div>
);

const ResumeCard: React.FC<{ card: ResumeCardData; onClick?: () => void; ctaLabel: string }> = ({ card, onClick, ctaLabel }) => {
  const isDisabled = !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`flex w-full items-center gap-3 rounded-[24px] border px-4 py-3.5 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all ${
        isDisabled
          ? "cursor-default border-white/60 bg-white/55 text-slate-400"
          : "border-white/70 bg-white/72 hover:-translate-y-0.5 hover:bg-white/82"
      }`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isDisabled ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-700"}`}>
        <Clock3 size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{card.label}</div>
        <div className="mt-1 truncate text-sm font-extrabold text-slate-900">{card.title}</div>
        <div className="mt-1 truncate text-xs font-medium text-slate-500">{card.meta}</div>
      </div>

      <div className={`shrink-0 text-xs font-extrabold ${isDisabled ? "text-slate-300" : "text-blue-700"}`}>{ctaLabel}</div>
    </button>
  );
};

const PrimaryActionCard: React.FC<{ card: ActionCard; onClick: () => void; ctaLabel: string }> = ({ card, onClick, ctaLabel }) => (
  <button
    onClick={onClick}
    type="button"
    className="group app-card w-full rounded-[28px] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
  >
    <div className="flex items-start justify-between gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>{card.icon}</div>
      <ArrowUpRight size={17} className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </div>

    <div className="mt-4 text-lg font-extrabold leading-tight text-slate-900">{card.title}</div>
    <p className="mt-2 text-sm leading-relaxed text-slate-500">{card.desc}</p>
    <div className="mt-4 inline-flex items-center text-sm font-extrabold text-blue-700">
      {ctaLabel}
      <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-0.5" />
    </div>
  </button>
);

const ShortcutPill: React.FC<{ item: Shortcut; onClick: () => void }> = ({ item, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-white/70 px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-colors hover:bg-white/82"
  >
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">{item.icon}</span>
      <span className="truncate text-sm font-extrabold text-slate-800">{item.label}</span>
    </span>
    <ChevronRight size={17} className="shrink-0 text-slate-400" />
  </button>
);

export const AppMenuPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshKey((value) => value + 1);
    const unsubscribeProjects = onProjectsChanged(refresh);
    const unsubscribeDocs = onDocumentsChanged(refresh);

    window.addEventListener("storage", refresh);
    return () => {
      unsubscribeProjects();
      unsubscribeDocs();
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const dashboard = useMemo(() => {
    const quotes = byNewest<QuoteDocument>(getQuotes(), (quote) => quote.createdAt || quote.date);
    const projects = byNewest<Project>(getProjects(), (project) => project.date);
    const sites = byNewest<HouseProject>(getHouseProjects(), (site) => site.date);

    return {
      quotesCount: quotes.length,
      projectsCount: projects.length,
      sitesCount: sites.length,
      latestQuote: quotes[0] ?? null,
      latestProject: projects[0] ?? null,
      latestSite: sites[0] ?? null,
    };
  }, [refreshKey]);

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }),
    [i18n.language]
  );

  const primaryCards: ActionCard[] = useMemo(
    () => [
      {
        title: t("menu.cards.quicktools.title", { defaultValue: "Quick site tools" }),
        desc: t("menu.cards.quicktools.desc", {
          defaultValue: "Fast calculators for conversions, slopes, packaging and instant checks.",
        }),
        path: "/app/quick-tools",
        icon: <Sparkles size={18} className="text-blue-700" />,
        tone: "bg-blue-50 text-blue-700 border border-blue-100",
      },
      {
        title: t("menu.cards.house.title", { defaultValue: "Site" }),
        desc: t("menu.cards.house.desc", {
          defaultValue: "Create or continue a site with its steps, costs and document links.",
        }),
        path: dashboard.latestSite ? `/app/house?id=${dashboard.latestSite.id}` : "/app/house",
        icon: <HardHat size={18} className="text-amber-700" />,
        tone: "bg-amber-50 text-amber-700 border border-amber-100",
      },
    ],
    [dashboard.latestSite, t]
  );

  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        label: t("menu.shortcuts.all_quotes", { defaultValue: "All quotes" }),
        path: "/app/quotes",
        icon: <FileText size={18} />,
      },
      {
        label: t("menu.shortcuts.all_projects", { defaultValue: "All projects" }),
        path: "/app/projects",
        icon: <FolderOpen size={18} />,
      },
      {
        label: t("menu.shortcuts.materials", { defaultValue: "Materials & pricing" }),
        path: "/app/materials",
        icon: <Boxes size={18} />,
      },
      {
        label: t("menu.shortcuts.settings", { defaultValue: "Settings" }),
        path: "/app/settings",
        icon: <SettingsIcon size={18} />,
      },
      {
        label: t("menu.shortcuts.backup", { defaultValue: "JSON backup" }),
        path: "/app/materials?tab=data",
        icon: <ShieldCheck size={18} />,
      },
    ],
    [t]
  );

  const latestQuoteTotal = dashboard.latestQuote ? euro.format(Number(dashboard.latestQuote.totalTTC) || 0) : "";
  const latestProjectTotal = dashboard.latestProject
    ? euro.format(
        dashboard.latestProject.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0)
      )
    : "";
  const latestSiteSteps = dashboard.latestSite ? Object.keys(dashboard.latestSite.steps || {}).length : 0;

  const resumeCards: ResumeCardData[] = [
    dashboard.latestQuote
      ? {
          label: t("menu.resume.quote_label", { defaultValue: "Last quote" }),
          title: dashboard.latestQuote.number,
          meta: [
            dashboard.latestQuote.client?.name || t("quotes.no_client", { defaultValue: "Unnamed client" }),
            formatDateValue(dashboard.latestQuote.createdAt || dashboard.latestQuote.date, i18n.language),
            latestQuoteTotal,
          ]
            .filter(Boolean)
            .join(" • "),
          path: `/app/quotes/${dashboard.latestQuote.id}`,
        }
      : {
          label: t("menu.resume.quote_label", { defaultValue: "Last quote" }),
          title: t("menu.resume.no_quote_title", { defaultValue: "No quote yet" }),
          meta: t("menu.resume.no_quote_meta", {
            defaultValue: "Create a quote from a project or a site to find it here.",
          }),
        },
    dashboard.latestProject
      ? {
          label: t("menu.resume.project_label", { defaultValue: "Last project" }),
          title: dashboard.latestProject.name,
          meta: [
            formatDateValue(dashboard.latestProject.date, i18n.language),
            `${dashboard.latestProject.items.length} ${t("projects.items", { defaultValue: "items" })}`,
            latestProjectTotal,
          ]
            .filter(Boolean)
            .join(" • "),
          path: `/app/projects?id=${dashboard.latestProject.id}`,
        }
      : {
          label: t("menu.resume.project_label", { defaultValue: "Last project" }),
          title: t("menu.resume.no_project_title", { defaultValue: "No saved project" }),
          meta: t("menu.resume.no_project_meta", {
            defaultValue: "Save a calculator result to continue it later from here.",
          }),
        },
    dashboard.latestSite
      ? {
          label: t("menu.resume.site_label", { defaultValue: "Last site" }),
          title: dashboard.latestSite.name,
          meta: [
            formatDateValue(dashboard.latestSite.date, i18n.language),
            t("menu.resume.site_steps", {
              defaultValue: "{{count}} saved steps",
              count: latestSiteSteps,
            }),
          ]
            .filter(Boolean)
            .join(" • "),
          path: `/app/house?id=${dashboard.latestSite.id}`,
        }
      : {
          label: t("menu.resume.site_label", { defaultValue: "Last site" }),
          title: t("menu.resume.no_site_title", { defaultValue: "No site yet" }),
          meta: t("menu.resume.no_site_meta", {
            defaultValue: "Create a site to track steps, costs and documents in one place.",
          }),
        },
  ];

  return (
    <div className="app-shell app-shell--menu min-h-screen bg-transparent pb-6">
      <div className="page-narrow space-y-3.5">
        <section className="glass-panel rounded-[30px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="page-header-chip">{t("menu.dashboard_badge", { defaultValue: "Quick resume" })}</div>
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
                  <LayoutGrid size={20} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-[30px]">
                    {t("menu.title", { defaultValue: "Worksite dashboard" })}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                    {t("menu.subtitle", {
                      defaultValue: "Resume your recent items and open the most useful actions without extra navigation.",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[312px]">
              <CompactStatCard value={dashboard.quotesCount} label={t("menu.stats.quotes", { defaultValue: "Quotes" })} />
              <CompactStatCard value={dashboard.projectsCount} label={t("menu.stats.projects", { defaultValue: "Projects" })} />
              <CompactStatCard value={dashboard.sitesCount} label={t("menu.stats.sites", { defaultValue: "Sites" })} />
            </div>
          </div>

          <div className="mt-4 grid gap-2.5 xl:grid-cols-3">
            {resumeCards.map((card) => (
              <ResumeCard
                key={`${card.label}-${card.title}`}
                card={card}
                ctaLabel={card.path ? t("menu.resume.open_last", { defaultValue: "Continue" }) : t("menu.resume.empty_cta", { defaultValue: "Ready" })}
                onClick={card.path ? () => navigate(card.path as string) : undefined}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t("menu.primary.title", { defaultValue: "Priority actions" })}
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {t("menu.primary.subtitle", { defaultValue: "Open the useful tools immediately." })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {primaryCards.map((card) => (
              <PrimaryActionCard
                key={card.title}
                card={card}
                onClick={() => navigate(card.path)}
                ctaLabel={t("menu.open", { defaultValue: "Open" })}
              />
            ))}
          </div>
        </section>

        <section className="app-card-soft rounded-[28px] p-4">
          <div className="mb-3 px-1">
            <h2 className="text-base font-extrabold text-slate-900">
              {t("menu.shortcuts.title", { defaultValue: "Useful shortcuts" })}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {t("menu.shortcuts.subtitle", {
                defaultValue: "Quotes, projects, materials, settings and backup in one compact block.",
              })}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {shortcuts.map((item) => (
              <ShortcutPill key={item.path} item={item} onClick={() => navigate(item.path)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
