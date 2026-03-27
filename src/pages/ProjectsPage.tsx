import React, { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Printer,
  ChevronRight,
  PieChart,
  FileText,
  FolderOpen,
  Plus,
  Calculator,
  Package,
  FileStack,
} from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getProjects, deleteProject } from "../services/storage";
import { createQuoteFromSimpleProject } from "../services/documentLogic";
import { getCompanyProfile } from "../services/documentsStorage";
import { Project, ClientInfo } from "../types";
import { ClientModal } from "../components/documents/ClientModal";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"] as const;

const sortProjects = (items: Project[]) =>
  [...items].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

export const ProjectsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);

  const selectedProjectId = searchParams.get("id");

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
    setProjects(sortProjects(getProjects()));
  }, [selectedProject]);

  useEffect(() => {
    if (!selectedProjectId) return;
    const match = getProjects().find((project) => project.id === selectedProjectId);
    if (match) setSelectedProject(match);
  }, [selectedProjectId]);

  const openProject = (project: Project) => {
    setSelectedProject(project);
    setSearchParams({ id: project.id }, { replace: true });
  };

  const closeProject = () => {
    setSelectedProject(null);
    setSearchParams({}, { replace: true });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = window.confirm(
      t("projects.confirm_delete", {
        defaultValue: "Delete this project permanently?",
      })
    );
    if (!ok) return;

    deleteProject(id);
    setProjects(sortProjects(getProjects()));
    if (selectedProject?.id === id) closeProject();
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
    } catch (e) {
      console.error(e);
      window.alert(
        t("projects.quote_error", {
          defaultValue: "Error while creating the quote.",
        })
      );
    }
  };

  if (selectedProject) {
    const totalCost = selectedProject.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const chartData = selectedProject.items.map((item) => ({
      name: item.name,
      value: item.totalPrice,
    }));

    return (
      <div className="relative min-h-full bg-transparent safe-bottom-offset">
        <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 shadow-sm backdrop-blur-xl no-print">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <button
              onClick={closeProject}
              className="flex items-center font-extrabold text-slate-500 transition-colors hover:text-blue-600"
              type="button"
            >
              <ChevronRight className="mr-1 rotate-180" size={20} />
              {t("common.back", { defaultValue: "Back" })}
            </button>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => navigate("/app/quotes")}
                className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700"
                type="button"
              >
                <FileStack size={18} className="mr-2" />
                {t("projects.all_quotes", { defaultValue: "All quotes" })}
              </button>

              <button
                onClick={handleGenerateQuote}
                className="flex items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-extrabold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
                type="button"
              >
                <FileText size={18} className="mr-2" />
                {t("projects.quote", { defaultValue: "Quote" })}
              </button>

              <button
                onClick={handlePrint}
                className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                title={t("projects.print", { defaultValue: "Print" })}
                type="button"
              >
                <Printer size={22} />
              </button>

              <button
                onClick={(e) => handleDelete(selectedProject.id, e)}
                className="rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title={t("common.delete", { defaultValue: "Delete" })}
                type="button"
              >
                <Trash2 size={22} />
              </button>
            </div>
          </div>
        </div>

        <div className="printable-content mx-auto max-w-6xl space-y-4 p-4 md:p-6">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/72 shadow-sm backdrop-blur-md print:bg-white">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                  <Calculator size={14} />
                  {t("projects.title", { defaultValue: "My projects (calculations)" })}
                </div>
                <h1 className="mb-1 text-3xl font-extrabold text-slate-900">{selectedProject.name}</h1>
                <p className="text-sm font-medium text-slate-500">
                  {t("projects.created_on", { defaultValue: "Created on" })}{" "}
                  {new Date(selectedProject.date).toLocaleDateString(i18n.language || undefined)}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 md:self-auto">
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
            <section className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-sm backdrop-blur-md print:bg-white md:p-6">
              <h2 className="mb-4 flex items-center text-lg font-extrabold text-slate-800">
                {t("projects.materials_list", { defaultValue: "Materials list" })}
              </h2>

              <ul className="space-y-3">
                {selectedProject.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/85 p-3.5 print:border-slate-300"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-slate-700">{item.name}</span>
                      <span className="text-xs font-medium text-slate-500">
                        {item.quantity} {item.unit} × {euro.format(item.unitPrice)}
                      </span>
                    </div>

                    <span className="whitespace-nowrap font-extrabold text-slate-800">{euro.format(item.totalPrice)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="space-y-4 print:hidden">
              <section className="rounded-[28px] border border-slate-200/80 bg-white/72 p-5 shadow-sm backdrop-blur-md md:p-6">
                <h2 className="mb-4 flex items-center text-lg font-extrabold text-slate-800">
                  <PieChart className="mr-2 text-slate-400" size={20} />
                  {t("projects.cost_breakdown", { defaultValue: "Cost breakdown" })}
                </h2>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={82} paddingAngle={5} dataKey="value">
                        {chartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => euro.format(value)}
                        contentStyle={{
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
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
    );
  }

  const projectsTotalEstimate = projects.reduce(
    (sum, project) => sum + project.items.reduce((projectSum, item) => projectSum + item.totalPrice, 0),
    0
  );

  return (
    <div className="-mt-1 min-h-full bg-transparent px-4 pb-4 safe-bottom-offset sm:-mt-2">
      <div className="mx-auto max-w-6xl space-y-2.5">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/72 px-5 pb-5 pt-4 shadow-sm backdrop-blur-md md:px-6 md:pb-6 md:pt-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                  <Calculator size={14} />
                  {t("projects.title", { defaultValue: "My projects (calculations)" })}
                </div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  {t("projects.page_heading", { defaultValue: "Projects & saved calculations" })}
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
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
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/65 py-14 text-center text-slate-400 backdrop-blur-sm">
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
              const total = project.items.reduce((sum, item) => sum + item.totalPrice, 0);
              return (
                <div
                  key={project.id}
                  onClick={() => openProject(project)}
                  className="flex cursor-pointer items-center justify-between rounded-[24px] border border-slate-200/80 bg-white/72 p-5 shadow-sm transition-all hover:border-blue-200 active:scale-[0.98]"
                >
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">{project.name}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {new Date(project.date).toLocaleDateString(i18n.language || undefined)} • {project.items.length}{" "}
                      {t("projects.items", { defaultValue: "items" })}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="rounded-xl border border-slate-200 bg-slate-100/90 px-3 py-1.5 text-sm font-extrabold text-slate-700">
                      {euro.format(total)}
                    </span>
                    <ChevronRight className="text-slate-300" size={20} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
