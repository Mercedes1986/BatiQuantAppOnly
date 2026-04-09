import React, { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Printer,
  ChevronRight,
  FileText,
  FolderOpen,
  Plus,
  Calculator,
  Package,
  FileStack,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { deleteProject, getProjects, onProjectsChanged } from "../services/storage";
import { createQuoteFromSimpleProject } from "../services/documentLogic";
import { getCompanyProfile } from "../services/documentsStorage";
import type { ClientInfo, Project } from "../types";
import { ClientModal } from "../components/documents/ClientModal";

const CHART_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
] as const;

const sortProjects = (items: Project[]) =>
  [...items].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

const toSafeNumber = (value: unknown): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getSafeItems = (project: Project | null | undefined): Project["items"] =>
  Array.isArray(project?.items) ? project.items : [];

const getProjectTotal = (project: Project | null | undefined): number =>
  getSafeItems(project).reduce((sum, item) => sum + toSafeNumber(item?.totalPrice), 0);

const getItemCount = (project: Project | null | undefined): number => getSafeItems(project).length;

const getProjectBreakdown = (project: Project | null | undefined) => {
  const items = getSafeItems(project);
  if (items.length === 0) return [];

  const total = getProjectTotal(project);
  if (total <= 0) return [];

  return items
    .map((item) => ({
      id: item.id,
      name: item.name || "Item",
      value: Math.max(0, toSafeNumber(item.totalPrice)),
      quantity: toSafeNumber(item.quantity),
      unit: item.unit || "",
      unitPrice: Math.max(0, toSafeNumber(item.unitPrice)),
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map((item, index) => ({
      ...item,
      ratio: Math.max(6, Math.round((item.value / total) * 100)),
      tone: CHART_COLORS[index % CHART_COLORS.length],
    }));
};

const formatProjectDate = (value: string, locale?: string): string => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return "-";
  return new Date(parsed).toLocaleDateString(locale || undefined);
};

export const ProjectsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }),
    [i18n.language]
  );

  useEffect(() => {
    const refreshProjects = () => {
      try {
        setProjects(sortProjects(getProjects()));
      } catch (error) {
        console.error("Failed to load projects:", error);
        setProjects([]);
      }
    };

    refreshProjects();

    const unsubscribe = onProjectsChanged((detail) => {
      if (detail.key === "projects") {
        refreshProjects();
      }
    });

    return unsubscribe;
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  useEffect(() => {
    if (selectedProjectId && !selectedProject) {
      setSelectedProjectId(null);
      setShowClientModal(false);
    }
  }, [selectedProject, selectedProjectId]);

  const openProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setShowClientModal(false);
  };

  const closeProject = () => {
    setSelectedProjectId(null);
    setShowClientModal(false);
  };

  const handleDelete = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const ok = window.confirm(
      t("projects.confirm_delete", {
        defaultValue: "Delete this project permanently?",
      })
    );
    if (!ok) return;

    try {
      deleteProject(id);
    } catch (error) {
      console.error("Failed to delete project:", error);
      window.alert(
        t("projects.delete_error", {
          defaultValue: "Unable to delete this project.",
        })
      );
      return;
    }

    if (selectedProject?.id === id) {
      closeProject();
    }
  };

  const handlePrint = () => window.print();

  const handleGenerateQuote = () => {
    const profile = getCompanyProfile();
    if (!profile || !profile.name) {
      const ok = window.confirm(
        t("projects.need_company_profile", {
          defaultValue:
            "To create a quote, you must first set up your company profile (Name, SIRET, etc.). Go to settings now?",
        })
      );
      if (ok) navigate("/app/settings");
      return;
    }
    setShowClientModal(true);
  };

  const onConfirmClient = (client: ClientInfo) => {
    if (!selectedProject) return;
    const profile = getCompanyProfile();
    if (!profile) return;

    try {
      const quoteId = createQuoteFromSimpleProject(selectedProject, profile, client);
      setShowClientModal(false);
      navigate(`/app/quotes/${quoteId}`);
    } catch (error) {
      console.error(error);
      window.alert(
        t("projects.quote_error", {
          defaultValue: "Error while creating the quote.",
        })
      );
    }
  };

  if (selectedProject) {
    const totalCost = getProjectTotal(selectedProject);
    const breakdown = getProjectBreakdown(selectedProject);
    const items = getSafeItems(selectedProject);

    return (
      <div className="app-shell app-shell--projects min-h-full bg-transparent safe-bottom-offset">
        <div className="page-narrow space-y-4">
          <div className="no-print">
            <section className="glass-panel rounded-[30px] px-4 py-3 shadow-sm sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={closeProject}
                  className="inline-flex items-center font-extrabold text-slate-600 transition-colors hover:text-blue-600"
                  type="button"
                >
                  <ChevronRight className="mr-1 rotate-180" size={20} />
                  {t("common.back", { defaultValue: "Back" })}
                </button>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    onClick={() => navigate("/app/quotes")}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700"
                    type="button"
                  >
                    <FileStack size={18} className="mr-2" />
                    {t("projects.all_quotes", { defaultValue: "All quotes" })}
                  </button>

                  <button
                    onClick={handleGenerateQuote}
                    className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
                    type="button"
                  >
                    <FileText size={18} className="mr-2" />
                    {t("projects.quote", { defaultValue: "Quote" })}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="rounded-2xl p-2.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title={t("projects.print", { defaultValue: "Print" })}
                    type="button"
                  >
                    <Printer size={22} />
                  </button>

                  <button
                    onClick={(event) => handleDelete(selectedProject.id, event)}
                    className="rounded-2xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title={t("common.delete", { defaultValue: "Delete" })}
                    type="button"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="printable-content space-y-4">
            <section className="glass-panel rounded-[32px] p-5 print:bg-white md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                    <Calculator size={14} />
                    {t("projects.title", { defaultValue: "My projects (calculations)" })}
                  </div>
                  <h1 className="mb-1 break-words text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">{selectedProject.name}</h1>
                  <p className="text-sm font-medium text-slate-500">
                    {t("projects.created_on", { defaultValue: "Created on" })}{" "}
                    {formatProjectDate(selectedProject.date, i18n.language)}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 md:self-auto">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-blue-600 shadow-sm">
                    <Package size={20} />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {t("projects.total_estimated", { defaultValue: "Estimated total" })}
                    </div>
                    <div className="text-xl font-extrabold text-slate-800">{euro.format(totalCost)}</div>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 md:gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <section className="glass-panel rounded-[30px] p-5 print:bg-white md:p-6">
                <h2 className="mb-4 flex items-center text-lg font-extrabold text-slate-800">
                  {t("projects.materials_list", { defaultValue: "Materials list" })}
                </h2>

                <ul className="space-y-3">
                  {items.length > 0 ? (
                    items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3.5 print:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <span className="block break-words text-sm font-extrabold text-slate-700">{item.name}</span>
                          <span className="text-xs font-medium text-slate-500">
                            {toSafeNumber(item.quantity)} {item.unit} × {euro.format(toSafeNumber(item.unitPrice))}
                          </span>
                        </div>

                        <span className="self-end rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-1 font-extrabold text-slate-800 sm:self-auto">
                          {euro.format(toSafeNumber(item.totalPrice))}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                      {t("projects.empty_details", { defaultValue: "No saved materials in this project yet." })}
                    </li>
                  )}
                </ul>
              </section>

              <div className="space-y-4 print:hidden">
                <section className="glass-panel rounded-[30px] p-5 md:p-6">
                  <h2 className="mb-4 flex items-center text-lg font-extrabold text-slate-800">
                    <BarChart3 className="mr-2 text-slate-400" size={20} />
                    {t("projects.cost_breakdown", { defaultValue: "Cost breakdown" })}
                  </h2>

                  {breakdown.length > 0 ? (
                    <div className="space-y-3">
                      {breakdown.map((item) => (
                        <div key={item.id} className="space-y-1.5 rounded-2xl border border-slate-200/80 bg-white/80 p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="break-words text-sm font-extrabold text-slate-800">{item.name}</div>
                              <div className="text-xs text-slate-500">
                                {item.quantity} {item.unit} • {euro.format(item.unitPrice)}
                              </div>
                            </div>
                            <div className="text-sm font-extrabold text-slate-800 sm:whitespace-nowrap">
                              {euro.format(item.value)}
                            </div>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.ratio}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                      {t("projects.no_breakdown", {
                        defaultValue: "The cost breakdown will appear once the saved lines contain amounts.",
                      })}
                    </div>
                  )}
                </section>

                <section className="rounded-[28px] border border-blue-100 bg-blue-50/90 p-5 shadow-sm print:border-slate-900 print:bg-transparent md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-extrabold text-blue-900">
                      {t("projects.total_estimated", { defaultValue: "Estimated total" })}
                    </span>
                    <span className="text-2xl font-extrabold text-blue-600 print:text-black">{euro.format(totalCost)}</span>
                  </div>
                </section>
              </div>
            </div>

            {selectedProject.notes && (
              <div className="rounded-[28px] border border-amber-100 bg-amber-50/90 p-5 shadow-sm print:border-slate-300 md:p-6">
                <h3 className="mb-2 font-extrabold text-amber-800 print:text-black">
                  {t("projects.notes", { defaultValue: "Notes & tips" })}
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-amber-900/80 print:text-black">
                  {selectedProject.notes}
                </p>
              </div>
            )}

            <div className="mt-12 hidden text-center text-xs text-slate-400 print:block">
              {t("projects.print_footer", {
                defaultValue: "Document generated by BatiQuant - Non-contractual estimates.",
              })}
            </div>
          </div>

          <ClientModal isOpen={showClientModal} onClose={() => setShowClientModal(false)} onConfirm={onConfirmClient} />
        </div>
      </div>
    );
  }

  const projectsTotalEstimate = projects.reduce((sum, project) => sum + getProjectTotal(project), 0);

  return (
    <div className="app-shell app-shell--projects min-h-full bg-transparent safe-bottom-offset">
      <div className="page-narrow space-y-4">
        <section className="glass-panel rounded-[32px] p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                  <Calculator size={14} />
                  {t("projects.title", { defaultValue: "My projects (calculations)" })}
                </div>
                <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900">
                  {t("projects.page_heading", { defaultValue: "Projects & saved calculations" })}
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {t("projects.subtitle", {
                    defaultValue: "Saved from individual calculators (single calculations).",
                  })}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  onClick={() => navigate("/app/calculators")}
                  className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
                  type="button"
                >
                  <Plus size={18} className="mr-2" />
                  {t("projects.create_new", { defaultValue: "Create a calculation" })}
                </button>

                <button
                  onClick={() => navigate("/app/quotes")}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700"
                  type="button"
                >
                  <FileStack size={18} className="mr-2" />
                  {t("projects.all_quotes", { defaultValue: "All quotes" })}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-blue-600">
                  <FolderOpen size={18} />
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {t("projects.saved_count", { defaultValue: "Saved projects" })}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">{projects.length}</div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-blue-600">
                  <Package size={18} />
                </div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {t("projects.total_estimated", { defaultValue: "Estimated total" })}
                </div>
                <div className="mt-1 text-2xl font-extrabold text-slate-900">{euro.format(projectsTotalEstimate)}</div>
              </div>

              <div className="hidden rounded-2xl border border-blue-100 bg-blue-50/90 p-4 shadow-sm xl:block">
                <div className="text-sm font-extrabold text-blue-900">
                  {t("projects.create_new_hint", {
                    defaultValue: "Choose a calculator and save the result here",
                  })}
                </div>
                <button
                  onClick={() => navigate("/app/calculators")}
                  className="mt-3 inline-flex items-center rounded-xl bg-white px-3 py-2 text-sm font-extrabold text-blue-700 shadow-sm"
                  type="button"
                >
                  <ChevronRight size={16} className="mr-1" />
                  {t("projects.create_new", { defaultValue: "Create a calculation" })}
                </button>
              </div>
            </div>
          </div>
        </section>

        {projects.length === 0 ? (
          <div className="glass-panel rounded-[30px] py-14 text-center text-slate-400">
            <FolderOpen size={60} className="mx-auto text-slate-300" />
            <p className="mt-4 font-medium text-slate-500">
              {t("projects.empty", { defaultValue: "No saved calculations." })}
            </p>
            <button
              onClick={() => navigate("/app/calculators")}
              className="mt-5 inline-flex items-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
              type="button"
            >
              <Plus size={18} className="mr-2" />
              {t("projects.create_new", { defaultValue: "Create a calculation" })}
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map((project) => {
              const total = getProjectTotal(project);
              return (
                <button
                  key={project.id}
                  onClick={() => openProject(project)}
                  className="glass-panel flex w-full min-w-0 flex-col items-start gap-3 rounded-[24px] p-5 text-left transition-all hover:border-blue-200 active:scale-[0.98] sm:flex-row sm:items-center sm:justify-between"
                  type="button"
                >
                  <div className="min-w-0">
                    <h3 className="break-words text-lg font-extrabold leading-tight text-slate-800">{project.name}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {formatProjectDate(project.date, i18n.language)} • {getItemCount(project)}{" "}
                      {t("projects.items", { defaultValue: "items" })}
                    </p>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 sm:ml-3 sm:w-auto sm:justify-end">
                    <span className="rounded-xl border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-sm font-extrabold text-slate-700 sm:whitespace-nowrap">
                      {euro.format(total)}
                    </span>
                    <ChevronRight className="shrink-0 text-slate-300" size={20} />
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
