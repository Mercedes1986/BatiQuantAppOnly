import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  HardHat,
  LayoutGrid,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { getInvoices, getQuotes, onDocumentsChanged } from "../services/documentsStorage";
import { getHouseProjects, getProjects, onProjectsChanged } from "../services/storage";
import type { HouseProject, InvoiceDocument, Project, QuoteDocument } from "../types";

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

type FollowUpCard = {
  label: string;
  value: number;
  tone: string;
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
  <div className="min-w-0 rounded-[22px] border border-white/70 bg-white/74 px-3 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-4">
    <div className="truncate text-xl font-extrabold leading-none text-slate-900">{value}</div>
    <div className="mt-1 break-words text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-600 sm:text-[11px]">
      {label}
    </div>
  </div>
);

const ResumeCard: React.FC<{ card: ResumeCardData; onClick?: () => void; ctaLabel: string }> = ({
  card,
  onClick,
  ctaLabel,
}) => {
  const isDisabled = !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`group flex w-full min-w-0 flex-col gap-3 rounded-[24px] border px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-all sm:flex-row sm:items-center ${
        isDisabled
          ? "cursor-default border-white/60 bg-white/56 text-slate-400"
          : "border-white/70 bg-white/76 hover:-translate-y-0.5 hover:bg-white/88"
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          isDisabled ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-700"
        }`}
      >
        <Clock3 size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{card.label}</div>
        <div className="mt-1 break-words text-[15px] font-extrabold text-slate-900">{card.title}</div>
        <div className="mt-1 break-words text-[13px] font-medium leading-relaxed text-slate-600">{card.meta}</div>
      </div>

      <div
        className={`inline-flex h-9 shrink-0 self-start items-center gap-1 rounded-full border px-3 text-xs font-extrabold transition-colors sm:self-center ${
          isDisabled
            ? "border-slate-200 bg-slate-100 text-slate-400"
            : "border-blue-200 bg-blue-50 text-blue-700 group-hover:bg-blue-100"
        }`}
      >
        {ctaLabel}
        {!isDisabled ? <ChevronRight size={14} /> : null}
      </div>
    </button>
  );
};

const PrimaryActionCard: React.FC<{ card: ActionCard; onClick: () => void; ctaLabel: string }> = ({
  card,
  onClick,
  ctaLabel,
}) => (
  <button
    onClick={onClick}
    type="button"
    className="group app-card w-full rounded-[28px] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
  >
    <div className="flex items-start justify-between gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${card.tone}`}>{card.icon}</div>
      <ArrowUpRight
        size={17}
        className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </div>

    <div className="mt-4 text-lg font-extrabold leading-tight text-slate-900">{card.title}</div>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.desc}</p>
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
    className="flex items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-white/74 px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl transition-colors hover:bg-white/86"
  >
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        {item.icon}
      </span>
      <span className="break-words text-sm font-extrabold leading-tight text-slate-800">{item.label}</span>
    </span>
    <ChevronRight size={17} className="shrink-0 text-slate-400" />
  </button>
);

const FollowUpPill: React.FC<{ item: FollowUpCard }> = ({ item }) => (
  <div
    className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-full border px-3.5 py-2 text-sm font-semibold shadow-[0_8px_20px_rgba(15,23,42,0.04)] sm:inline-flex sm:w-auto sm:min-w-[112px] ${item.tone}`}
  >
    <span className="min-w-0 flex-1 break-words leading-tight">{item.label}</span>
    <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-xs font-extrabold text-slate-900">{item.value}</span>
  </div>
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
    const invoices = byNewest<InvoiceDocument>(getInvoices(), (invoice) => invoice.createdAt || invoice.date);
    const projects = byNewest<Project>(getProjects(), (project) => project.date);
    const sites = byNewest<HouseProject>(getHouseProjects(), (site) => site.date);

    const activeSitesCount = sites.filter((site) => Object.keys(site.steps || {}).length > 0).length;
    const totalSavedSteps = sites.reduce((sum, site) => sum + Object.keys(site.steps || {}).length, 0);

    return {
      quotesCount: quotes.length,
      projectsCount: projects.length,
      sitesCount: sites.length,
      latestQuote: quotes[0] ?? null,
      latestProject: projects[0] ?? null,
      latestSite: sites[0] ?? null,
      draftQuotesCount: quotes.filter((quote) => quote.status === "draft").length,
      acceptedQuotesCount: quotes.filter((quote) => quote.status === "accepted").length,
      lateInvoicesCount: invoices.filter((invoice) => invoice.status === "late").length,
      activeSitesCount,
      totalSavedSteps,
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
        title: t("menu.cards.quicktools.title", { defaultValue: "Quick checks" }),
        desc: t("menu.cards.quicktools.desc", {
          defaultValue: "Fast tools for conversions, packaging, slopes and one-shot answers in under a minute.",
        }),
        path: "/app/quick-tools",
        icon: <Sparkles size={18} className="text-blue-700" />,
        tone: "border border-blue-100 bg-blue-50 text-blue-700",
      },
      {
        title: t("menu.cards.house.title", { defaultValue: "Site" }),
        desc: t("menu.cards.house.desc", {
          defaultValue: "Create or continue a site with its steps, costs and document links.",
        }),
        path: dashboard.latestSite ? `/app/house?id=${dashboard.latestSite.id}` : "/app/house",
        icon: <HardHat size={18} className="text-amber-700" />,
        tone: "border border-amber-100 bg-amber-50 text-amber-700",
      },
    ],
    [dashboard.latestSite, t]
  );

  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        label: t("menu.shortcuts.estimators", { defaultValue: "Detailed estimators" }),
        path: "/app/calculators",
        icon: <LayoutGrid size={18} />,
      },
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
    ? euro.format(dashboard.latestProject.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0))
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

  const followUpCards: FollowUpCard[] = [
    {
      label: t("menu.followup.draft_quotes", { defaultValue: "Draft quotes" }),
      value: dashboard.draftQuotesCount,
      tone: "border-amber-200/90 bg-amber-50/92 text-amber-800",
    },
    {
      label: t("menu.followup.accepted_quotes", { defaultValue: "Accepted quotes" }),
      value: dashboard.acceptedQuotesCount,
      tone: "border-emerald-200/90 bg-emerald-50/92 text-emerald-800",
    },
    {
      label: t("menu.followup.late_invoices", { defaultValue: "Late invoices" }),
      value: dashboard.lateInvoicesCount,
      tone: "border-rose-200/90 bg-rose-50/92 text-rose-800",
    },
    {
      label: t("menu.followup.active_sites", { defaultValue: "Active sites" }),
      value: dashboard.activeSitesCount,
      tone: "border-blue-200/90 bg-blue-50/92 text-blue-800",
    },
  ].filter((item) => item.value > 0);

  return (
    <div className="app-shell app-shell--menu min-h-full bg-transparent safe-bottom-offset">
      <div className="page-narrow space-y-4">
        <section className="glass-panel rounded-[30px] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="page-header-chip">{t("menu.dashboard_badge", { defaultValue: "Overview" })}</div>

              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
                  <LayoutGrid size={20} />
                </div>

                <div className="min-w-0">
                  <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-[30px]">
                    {t("menu.title", { defaultValue: "Worksite dashboard" })}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                    {t("menu.subtitle", {
                      defaultValue:
                        "Resume your recent items and open the most useful actions without extra navigation.",
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:min-w-[312px]">
              <CompactStatCard value={dashboard.quotesCount} label={t("menu.stats.quotes", { defaultValue: "Quotes" })} />
              <CompactStatCard value={dashboard.projectsCount} label={t("menu.stats.projects", { defaultValue: "Projects" })} />
              <CompactStatCard value={dashboard.sitesCount} label={t("menu.stats.sites", { defaultValue: "Sites" })} />
            </div>
          </div>

          <div className="mt-4 rounded-[24px] border border-white/60 bg-white/50 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <AlertTriangle size={17} />
                </div>
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {t("menu.followup.title", { defaultValue: "Follow-up" })}
                  </div>
                  <div className="text-xs text-slate-600">
                    {followUpCards.length > 0
                      ? t("menu.followup.subtitle", {
                          defaultValue: "Keep an eye on the items that still need action.",
                        })
                      : t("menu.followup.up_to_date_hint", {
                          defaultValue: "No quote or invoice needs immediate action.",
                        })}
                  </div>
                </div>
              </div>

              {followUpCards.length === 0 ? (
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-extrabold text-emerald-800">
                  {t("menu.followup.up_to_date", { defaultValue: "Everything is up to date" })}
                </div>
              ) : null}
            </div>

            {followUpCards.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {followUpCards.map((item) => (
                  <FollowUpPill key={item.label} item={item} />
                ))}
                {dashboard.totalSavedSteps > 0 ? (
                  <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-full border border-slate-200/90 bg-slate-50/92 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.04)] sm:inline-flex sm:w-auto sm:min-w-[112px]">
                    <span className="min-w-0 flex-1 break-words leading-tight">{t("menu.followup.saved_steps", { defaultValue: "Saved steps" })}</span>
                    <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-extrabold text-slate-900">
                      {dashboard.totalSavedSteps}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2.5 xl:grid-cols-3">
            {resumeCards.map((card) => (
              <ResumeCard
                key={`${card.label}-${card.title}`}
                card={card}
                ctaLabel={
                  card.path
                    ? t("menu.resume.open_last", { defaultValue: "Open" })
                    : t("menu.resume.empty_cta", { defaultValue: "Create" })
                }
                onClick={card.path ? () => navigate(card.path as string) : undefined}
              />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {t("menu.primary.title", { defaultValue: "Essential tools" })}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {t("menu.primary.subtitle", {
                  defaultValue: "Launch the most useful tools without any extra steps.",
                })}
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
            <p className="mt-0.5 text-sm text-slate-600">
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
