import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Search,
  ChevronRight,
  FolderOpen,
  FolderKanban,
  CircleDollarSign,
  CheckCircle2,
} from "lucide-react";

import { getQuotes } from "../../services/documentsStorage";
import { getHouseProjects, getProjects } from "../../services/storage";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  invoiced: "bg-blue-100 text-blue-700",
};

export const QuotesListPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const quotes = useMemo(
    () =>
      getQuotes().sort(
        (a, b) =>
          new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
      ),
    []
  );

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();

    getHouseProjects().forEach((project) => map.set(project.id, project.name));
    getProjects().forEach((project) => map.set(project.id, project.name));

    return map;
  }, []);

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
      }),
    [i18n.language]
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredQuotes = useMemo(() => {
    if (!normalizedSearch) return quotes;

    return quotes.filter((quote) => {
      const projectName = projectNameMap.get(quote.projectId || "") || "";
      const haystack = [
        quote.number,
        quote.client.name,
        quote.client.city,
        quote.client.address,
        projectName,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [normalizedSearch, projectNameMap, quotes]);

  const stats = useMemo(
    () => ({
      total: quotes.length,
      accepted: quotes.filter((quote) => quote.status === "accepted").length,
      totalAmount: quotes.reduce((sum, quote) => sum + (Number(quote.totalTTC) || 0), 0),
    }),
    [quotes]
  );

  return (
    <div className="app-shell app-shell--projects min-h-full bg-transparent p-4 safe-bottom-offset">
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-sm backdrop-blur-md md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">
                {t("quotes.title", { defaultValue: "My quotes" })}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("quotes.subtitle", {
                  defaultValue: "Find every quote created from your projects and sites in one place.",
                })}
              </p>
            </div>

            <button
              onClick={() => navigate("/app/menu")}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700"
              type="button"
            >
              <FolderOpen size={18} className="mr-2" />
              {t("quotes.back_to_menu", { defaultValue: "Back to menu" })}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <FileText size={18} />
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {t("quotes.stats.total", { defaultValue: "Total quotes" })}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.total}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <CheckCircle2 size={18} />
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {t("quotes.stats.accepted", { defaultValue: "Accepted" })}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.accepted}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/85 p-4">
              <div className="mb-2 flex items-center gap-2 text-slate-500">
                <CircleDollarSign size={18} />
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {t("quotes.stats.total_amount", { defaultValue: "Total amount" })}
                </span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{euro.format(stats.totalAmount)}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-sm backdrop-blur-md md:p-6">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("quotes.search", {
                defaultValue: "Search by quote number, client or project...",
              })}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 outline-none transition-colors focus:border-blue-200"
            />
          </div>
        </section>

        {filteredQuotes.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/65 py-16 text-center text-slate-400 backdrop-blur-sm">
            <FolderKanban size={64} className="mx-auto text-slate-300" />
            <p className="mt-4 font-medium text-slate-600">
              {quotes.length === 0
                ? t("quotes.empty", { defaultValue: "No quote has been created yet." })
                : t("quotes.empty_search", { defaultValue: "No quote matches your search." })}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredQuotes.map((quote) => {
              const projectName = projectNameMap.get(quote.projectId || "");
              const statusClass = STATUS_STYLES[quote.status] || "bg-slate-100 text-slate-600";

              return (
                <button
                  key={quote.id}
                  onClick={() => navigate(`/app/quotes/${quote.id}`)}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 rounded-[24px] border border-slate-200/80 bg-white/72 p-5 text-left shadow-sm transition-all hover:border-blue-200 active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-slate-800">{quote.number}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${statusClass}`}>
                        {t(`quote.status.${quote.status}`, { defaultValue: quote.status })}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-medium text-slate-700">{quote.client.name || t("quotes.no_client", { defaultValue: "Unnamed client" })}</div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        {t("quotes.created_on", { defaultValue: "Date" })}: {new Date(quote.date).toLocaleDateString(i18n.language || undefined)}
                      </span>
                      <span>
                        {t("quotes.project", { defaultValue: "Project" })}: {projectName || t("quotes.no_project", { defaultValue: "Not linked" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="whitespace-nowrap rounded-xl border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-sm font-extrabold text-slate-700">
                      {euro.format(Number(quote.totalTTC) || 0)}
                    </span>
                    <ChevronRight className="text-slate-300" size={20} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
