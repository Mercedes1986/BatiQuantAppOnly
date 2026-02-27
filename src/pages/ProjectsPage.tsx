import React, { useState, useEffect, useMemo } from "react";
import {
  Trash2,
  Printer,
  ChevronRight,
  PieChart,
  FileText,
  FolderOpen,
} from "lucide-react";
import { getProjects, deleteProject } from "../services/storage";
import { Project, ClientInfo } from "../types";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { createQuoteFromSimpleProject } from "../services/documentLogic";
import { getCompanyProfile } from "../services/documentsStorage";
import { useNavigate } from "react-router-dom";
import { ClientModal } from "../components/documents/ClientModal";
import { useTranslation } from "react-i18next";

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"] as const;

export const ProjectsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
    setProjects(getProjects());
  }, [selectedProject]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = window.confirm(
      t("projects.confirm_delete", {
        defaultValue: "Supprimer définitivement ce projet ?",
      })
    );
    if (!ok) return;

    deleteProject(id);
    setProjects(getProjects());
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  const handlePrint = () => window.print();

  const handleGenerateQuote = () => {
    const profile = getCompanyProfile();
    if (!profile || !profile.name) {
      const ok = window.confirm(
        t("projects.need_company_profile", {
          defaultValue:
            "Pour créer un devis, vous devez d'abord configurer votre profil entreprise (Nom, SIRET...). Aller aux réglages ?",
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
      const quoteId = createQuoteFromSimpleProject(
        selectedProject,
        profile,
        client
      );
      setShowClientModal(false);
      navigate(`/app/quotes/${quoteId}`);
    } catch (e) {
      console.error(e);
      window.alert(
        t("projects.quote_error", {
          defaultValue: "Erreur lors de la création du devis.",
        })
      );
    }
  };

  if (selectedProject) {
    const totalCost = selectedProject.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    const chartData = selectedProject.items.map((item) => ({
      name: item.name,
      value: item.totalPrice,
    }));

    return (
      <div className="pb-20 bg-white min-h-screen relative">
        <div className="sticky top-0 bg-white/95 backdrop-blur z-30 border-b border-slate-100 p-4 flex items-center justify-between no-print shadow-sm">
          <button
            onClick={() => setSelectedProject(null)}
            className="text-slate-500 font-extrabold flex items-center hover:text-blue-600 transition-colors"
            type="button"
          >
            <ChevronRight className="rotate-180 mr-1" size={20} />{" "}
            {t("common.back", { defaultValue: "Retour" })}
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleGenerateQuote}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-extrabold shadow-md hover:bg-blue-700 active:scale-95 transition-all"
              type="button"
            >
              <FileText size={18} className="mr-2" />{" "}
              {t("projects.quote", { defaultValue: "Devis" })}
            </button>

            <button
              onClick={handlePrint}
              className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              title={t("projects.print", { defaultValue: "Imprimer" })}
              type="button"
            >
              <Printer size={22} />
            </button>

            <button
              onClick={(e) => handleDelete(selectedProject.id, e)}
              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title={t("common.delete", { defaultValue: "Supprimer" })}
              type="button"
            >
              <Trash2 size={22} />
            </button>
          </div>
        </div>

        <div className="p-6 max-w-3xl mx-auto printable-content">
          <div className="mb-8 border-b-2 border-slate-800 pb-4">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
              {selectedProject.name}
            </h1>
            <p className="text-slate-500 font-medium">
              {t("projects.created_on", { defaultValue: "Créé le" })}{" "}
              {new Date(selectedProject.date).toLocaleDateString(
                i18n.language || undefined
              )}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-lg font-extrabold mb-4 flex items-center text-slate-800">
                {t("projects.materials_list", {
                  defaultValue: "Liste des matériaux",
                })}
              </h2>

              <ul className="space-y-3">
                {selectedProject.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 print:border-slate-300"
                  >
                    <div>
                      <span className="font-extrabold text-slate-700 block text-sm">
                        {item.name}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {item.quantity} {item.unit} ×{" "}
                        {euro.format(item.unitPrice)}
                      </span>
                    </div>
                    <span className="font-extrabold text-slate-800">
                      {euro.format(item.totalPrice)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 p-5 bg-blue-50 rounded-2xl flex justify-between items-center print:bg-transparent print:border-t-2 print:border-slate-900">
                <span className="font-extrabold text-xl text-blue-900">
                  {t("projects.total_estimated", {
                    defaultValue: "Total Estimé",
                  })}
                </span>
                <span className="font-extrabold text-2xl text-blue-600 print:text-black">
                  {euro.format(totalCost)}
                </span>
              </div>
            </div>

            <div className="print:hidden">
              <h2 className="text-lg font-extrabold mb-4 flex items-center text-slate-800">
                <PieChart className="mr-2 text-slate-400" size={20} />{" "}
                {t("projects.cost_breakdown", {
                  defaultValue: "Répartition des coûts",
                })}
              </h2>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      formatter={(value: number) => euro.format(value)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {selectedProject.notes && (
            <div className="mt-10 p-5 bg-amber-50 border border-amber-100 rounded-2xl print:border-slate-300">
              <h3 className="font-extrabold text-amber-800 mb-2 print:text-black">
                {t("projects.notes", { defaultValue: "Notes & Conseils" })}
              </h3>
              <p className="text-sm text-amber-900/80 whitespace-pre-line print:text-black leading-relaxed">
                {selectedProject.notes}
              </p>
            </div>
          )}

          <div className="mt-12 text-center text-xs text-slate-400 print:block hidden">
            {t("projects.print_footer", {
              defaultValue:
                "Document généré par BatiQuant - Estimations non contractuelles.",
            })}
          </div>
        </div>

        <ClientModal
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          onConfirm={onConfirmClient}
        />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6 px-2">
        {t("projects.title", { defaultValue: "Mes Projets (Calculs)" })}
      </h1>

      {projects.length === 0 ? (
        <div className="text-center py-20 opacity-50">
          <FolderOpen size={64} className="mx-auto text-slate-300" />
          <p className="mt-4 text-slate-500 font-medium">
            {t("projects.empty", { defaultValue: "Aucun calcul sauvegardé." })}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const total = project.items.reduce((s, i) => s + i.totalPrice, 0);
            return (
              <div
                key={project.id}
                onClick={() => setSelectedProject(project)}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer hover:border-blue-200"
              >
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {new Date(project.date).toLocaleDateString(
                      i18n.language || undefined
                    )}{" "}
                    • {project.items.length}{" "}
                    {t("projects.items", { defaultValue: "éléments" })}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg text-sm">
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
  );
};