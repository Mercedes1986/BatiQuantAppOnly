import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  FileText,
  FolderOpen,
  HardHat,
  LayoutGrid,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { getQuotes } from "../services/documentsStorage";
import { getHouseProjects, getProjects } from "../services/storage";
import type { HouseProject, Project, QuoteDocument } from "../types";

type SectionCard = {
  title: string;
  desc: string;
  path: string;
  icon: React.ReactNode;
  tone: string;
};

type RecentCardItem = {
  key: string;
  label: string;
  title: string;
  description: string;
  metaLabel: string;
  metaValue: string;
  dateLabel: string;
  path: string;
  icon: React.ReactNode;
  tone: string;
};

const sortByNewest = <T extends { createdAt?: string; date?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const dateA = new Date(a.createdAt || a.date || 0).getTime();
    const dateB = new Date(b.createdAt || b.date || 0).getTime();
    return dateB - dateA;
  });

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

const UtilityCard: React.FC<{ card: SectionCard; onClick: () => void }> = ({ card, onClick }) => (
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

const RecentCard: React.FC<{
  item: RecentCardItem;
  ctaLabel: string;
  onClick: () => void;
}> = ({ item, ctaLabel, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex h-full w-full flex-col rounded-[26px] border border-white/70 bg-white/68 p-4 text-left shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white/80"
  >
    <div className="flex items-start justify-between gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>{item.icon}</div>
      <span className="rounded-full bg-slate-900/4 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        {item.label}
      </span>
    </div>

    <div className="mt-4 text-lg font-extrabold leading-tight text-slate-900">{item.title}</div>
    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500">{item.description}</p>

    <div className="mt-4 space-y-2 rounded-[20px] bg-slate-50/80 p-3 text-xs text-slate-500">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-slate-500">{item.metaLabel}</span>
        <span className="truncate text-right font-extrabold text-slate-700">{item.metaValue}</span>
      </div>
      <div className="truncate text-[11px] font-semibold text-slate-400">{item.dateLabel}</div>
    </div>

    <div className="mt-4 inline-flex items-center text-sm font-extrabold text-blue-700">
      {ctaLabel}
      <ArrowUpRight size={16} className="ml-1 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </div>
  </button>
);

const StatCard: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="rounded-[22px] border border-white/70 bg-white/65 px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-xl">
    <div className="text-xl font-extrabold leading-none text-slate-900">{value}</div>
    <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
  </div>
);

const EmptyRecentState: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="rounded-[26px] border border-dashed border-white/70 bg-white/40 px-5 py-8 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur-md">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-slate-400 shadow-sm">
      <LayoutGrid size={24} />
    </div>
    <div className="mt-4 text-base font-extrabold text-slate-900">{title}</div>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">{text}</p>
  </div>
);

const getLatestQuoteCard = (
  quote: QuoteDocument | undefined,
  projectNameMap: Map<string, string>,
  euro: Intl.NumberFormat,
  formatDate: (value?: string) => string,
  t: (key: string, options?: Record<string, unknown>) => string
): RecentCardItem | null => {
  if (!quote) return null;

  const projectName = quote.projectId ? projectNameMap.get(quote.projectId) : "";
  const clientName = quote.client?.name?.trim();
  const description = projectName
    ? t("menu.recent.quote_desc_project", {
        defaultValue: "Linked to {{project}}.",
        project: projectName,
      })
    : t("menu.recent.quote_desc", {
        defaultValue: "Open the last generated quote and continue editing or export.",
      });

  return {
    key: `quote-${quote.id}`,
    label: t("menu.recent.quote_label", { defaultValue: "Last quote" }),
    title: quote.number,
    description,
    metaLabel: clientName
      ? t("menu.recent.client_label", { defaultValue: "Client" })
      : t("menu.recent.total_label", { defaultValue: "Amount" }),
    metaValue: clientName || euro.format(Number(quote.totalTTC) || 0),
    dateLabel: t("menu.recent.updated_on", {
      defaultValue: "Updated {{date}}",
      date: formatDate(quote.createdAt || quote.date),
    }),
    path: `/app/quotes/${quote.id}`,
    icon: <FileText size={18} className="text-rose-700" />,
    tone: "bg-rose-50 text-rose-700 border border-rose-100",
  };
};

const getLatestProjectCard = (
  project: Project | undefined,
  euro: Intl.NumberFormat,
  formatDate: (value?: string) => string,
  t: (key: string, options?: Record<string, unknown>) => string
): RecentCardItem | null => {
  if (!project) return null;

  const total = project.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);

  return {
    key: `project-${project.id}`,
    label: t("menu.recent.project_label", { defaultValue: "Last project" }),
    title: project.name,
    description: t("menu.recent.project_desc", {
      defaultValue: "Reopen the saved calculation and inspect materials, totals and print view.",
    }),
    metaLabel: t("menu.recent.total_label", { defaultValue: "Amount" }),
    metaValue: euro.format(total),
    dateLabel: t("menu.recent.updated_on", {
      defaultValue: "Updated {{date}}",
      date: formatDate(project.date),
    }),
    path: `/app/projects?id=${project.id}`,
    icon: <FolderOpen size={18} className="text-indigo-700" />,
    tone: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  };
};

const getLatestSiteCard = (
  site: HouseProject | undefined,
  formatDate: (value?: string) => string,
  t: (key: string, options?: Record<string, unknown>) => string
): RecentCardItem | null => {
  if (!site) return null;

  const savedSteps = Object.values(site.steps || {}).filter((step) => step?.status === "done").length;
  const surface = Number(site.params?.surfaceArea) || 0;

  return {
    key: `site-${site.id}`,
    label: t("menu.recent.site_label", { defaultValue: "Last site" }),
    title: site.name,
    description: t("menu.recent.site_desc", {
      defaultValue: "Continue the step-by-step worksite estimate and access generated quotes.",
    }),
    metaLabel: savedSteps > 0
      ? t("menu.recent.progress_label", { defaultValue: "Progress" })
      : t("menu.recent.surface_label", { defaultValue: "Surface" }),
    metaValue: savedSteps > 0
      ? t("menu.recent.site_meta", {
          defaultValue: "{{count}} saved steps",
          count: savedSteps,
        })
      : t("menu.recent.surface_value", {
          defaultValue: "{{value}} m²",
          value: surface,
        }),
    dateLabel: t("menu.recent.updated_on", {
      defaultValue: "Updated {{date}}",
      date: formatDate(site.date),
    }),
    path: `/app/house?id=${site.id}`,
    icon: <HardHat size={18} className="text-amber-700" />,
    tone: "bg-amber-50 text-amber-700 border border-amber-100",
  };
};

export const AppMenuPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const quotes = useMemo(() => sortByNewest(getQuotes()), []);
  const projects = useMemo(() => sortByNewest(getProjects()), []);
  const sites = useMemo(() => sortByNewest(getHouseProjects()), []);

  const quotesCount = quotes.length;
  const projectsCount = projects.length;
  const sitesCount = sites.length;

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }),
    [i18n.language]
  );

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString(i18n.language || undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const projectNameMap = useMemo(() => {
    const entries = [...projects, ...sites].map((item) => [item.id, item.name] as const);
    return new Map(entries);
  }, [projects, sites]);

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

  const utilityCards: SectionCard[] = useMemo(
    () => [
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
        title: t("menu.cards.backup.title", { defaultValue: "JSON backup" }),
        desc: t("menu.cards.backup.desc", {
          defaultValue: "Export or import your data to avoid any loss.",
        }),
        path: "/app/materials?tab=data",
        icon: <ShieldCheck size={18} className="text-slate-700" />,
        tone: "bg-slate-50 text-slate-700 border border-slate-100",
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
    ],
    [t]
  );

  const recentCards = useMemo(() => {
    const items = [
      getLatestQuoteCard(quotes[0], projectNameMap, euro, formatDate, t),
      getLatestProjectCard(projects[0], euro, formatDate, t),
      getLatestSiteCard(sites[0], formatDate, t),
    ].filter(Boolean) as RecentCardItem[];

    return items;
  }, [euro, projectNameMap, projects, quotes, sites, t]);

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

            <div className="space-y-2 sm:min-w-[320px]">
              <div className="grid grid-cols-3 gap-2.5">
                <StatCard value={quotesCount} label={t("menu.stats.quotes", { defaultValue: "Quotes" })} />
                <StatCard value={projectsCount} label={t("menu.stats.projects", { defaultValue: "Projects" })} />
                <StatCard value={sitesCount} label={t("menu.stats.sites", { defaultValue: "Sites" })} />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/app/quotes")}
                  className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition-colors hover:bg-white"
                >
                  <FileText size={14} className="mr-1.5" />
                  {t("menu.actions.quotes", { defaultValue: "All quotes" })}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/app/projects")}
                  className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition-colors hover:bg-white"
                >
                  <FolderOpen size={14} className="mr-1.5" />
                  {t("menu.actions.projects", { defaultValue: "All projects" })}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/app/house")}
                  className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition-colors hover:bg-white"
                >
                  <HardHat size={14} className="mr-1.5" />
                  {t("menu.actions.sites", { defaultValue: "All sites" })}
                </button>
              </div>
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
              {t("menu.recent.title", { defaultValue: "Resume activity" })}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {t("menu.recent.subtitle", {
                defaultValue: "Direct access to the latest quote, project or site used in the app.",
              })}
            </p>
          </div>

          {recentCards.length > 0 ? (
            <div className="grid gap-3 xl:grid-cols-3">
              {recentCards.map((item) => (
                <RecentCard
                  key={item.key}
                  item={item}
                  onClick={() => navigate(item.path)}
                  ctaLabel={t("menu.recent.continue", { defaultValue: "Continue" })}
                />
              ))}
            </div>
          ) : (
            <EmptyRecentState
              title={t("menu.recent.empty_title", { defaultValue: "No recent activity" })}
              text={t("menu.recent.empty_text", {
                defaultValue: "Create a project or a site to find your latest actions here.",
              })}
            />
          )}
        </section>

        <section className="app-card-soft rounded-[30px] p-4 sm:p-5">
          <div className="mb-3">
            <h2 className="text-lg font-extrabold text-slate-900">
              {t("menu.support.title", { defaultValue: "Tools and data" })}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {t("menu.support.subtitle", { defaultValue: "Materials, backup and app settings." })}
            </p>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {utilityCards.map((card) => (
              <UtilityCard key={card.path} card={card} onClick={() => navigate(card.path)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
