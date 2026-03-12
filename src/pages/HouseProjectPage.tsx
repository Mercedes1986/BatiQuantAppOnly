import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronRight,
  Plus,
  Ruler,
  FileText,
  Layers,
  X,
  FileCheck,
  AlertTriangle,
  Pencil,
  Home,
  Trash2,
} from "lucide-react";
import {
  getHouseProjects,
  saveHouseProject,
  deleteHouseProject,
  generateId,
} from "../services/storage";
import { HouseProject, ConstructionStepId, ClientInfo } from "../types";
import { getConstructionSteps, type ConstructionStepDef, type ConstructionStepGroup } from "../constants";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QuotePanel } from "../components/quote/QuotePanel";
import { calculateQuote } from "../services/quote";
import { createQuoteFromProject } from "../services/documentLogic";
import { getCompanyProfile, getQuotes } from "../services/documentsStorage";
import { ClientModal } from "../components/documents/ClientModal";
import { useTranslation } from "react-i18next";

/**
 * Update goals:
 * - Keep the same i18n keys (house.*, common.*)
 * - Replace ALL defaultValue FR -> EN to avoid FR fallback when EN key is missing (prevents "Franglais")
 * - Do not change logic / routing / data model
 * - Make "House" list page visually consistent with "Projects" (hero CTA + same list cards)
 */
export const HouseProjectPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get("id");

  const [projects, setProjects] = useState<HouseProject[]>([]);
  const [currentProject, setCurrentProject] = useState<HouseProject | null>(null);

  const [activeTab, setActiveTab] = useState<"steps" | "quote">("steps");

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSurface, setNewSurface] = useState("");

  const [isEditingParams, setIsEditingParams] = useState(false);
  const [editParams, setEditParams] = useState({ surface: "", perimeter: "", height: "" });

  const [showClientModal, setShowClientModal] = useState(false);

  // Hero image (same spirit as Projects page)
  const heroImageSrc = "/images/chantiers/creer-chantier.png";

  const constructionSteps = useMemo<readonly ConstructionStepGroup[]>(() => getConstructionSteps(), [i18n.language]);

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
      }),
    [i18n.language]
  );

  const refreshAll = () => {
    const allProjects = getHouseProjects();
    setProjects(allProjects);

    if (projectIdFromUrl) {
      const p = allProjects.find((x) => x.id === projectIdFromUrl);
      if (p) setCurrentProject(p);
      else setSearchParams({}, { replace: true });
    } else {
      setCurrentProject(null);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdFromUrl]);

  const selectProject = (p: HouseProject) => {
    setSearchParams({ id: p.id }, { replace: true });
  };

  const closeProject = () => {
    setSearchParams({}, { replace: true });
  };

  const projectQuotes = useMemo(() => {
    if (!currentProject) return [];
    return getQuotes()
      .filter((q) => q.projectId === currentProject.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentProject]);

  const handleCreate = () => {
    if (!newName.trim()) return;

    const surface = parseFloat(newSurface) || 100;

    const newProj: HouseProject = {
      id: generateId(),
      name: newName.trim(),
      date: new Date().toISOString(),
      params: {
        surfaceArea: surface,
        groundArea: surface,
        perimeter: Math.sqrt(surface) * 4,
        levels: 1,
        ceilingHeight: 2.5,
      },
      steps: {},
    };

    saveHouseProject(newProj);
    setIsCreating(false);
    setNewName("");
    setNewSurface("");
    setProjects(getHouseProjects());
    selectProject(newProj);
  };

  const handleDelete = (id: string) => {
    const ok = window.confirm(t("house.confirm_delete", { defaultValue: "Delete this site?" }));
    if (!ok) return;

    deleteHouseProject(id);
    setProjects(getHouseProjects());
    if (currentProject?.id === id) closeProject();
  };

  const startEditParams = () => {
    if (!currentProject) return;
    setEditParams({
      surface: String(currentProject.params.surfaceArea ?? ""),
      perimeter: String(currentProject.params.perimeter ?? ""),
      height: String(currentProject.params.ceilingHeight ?? ""),
    });
    setIsEditingParams(true);
  };

  const saveEditedParams = () => {
    if (!currentProject) return;

    const updated: HouseProject = { ...currentProject };
    updated.params = { ...updated.params };

    updated.params.surfaceArea = Math.max(0, parseFloat(editParams.surface) || 0);
    updated.params.perimeter = Math.max(0, parseFloat(editParams.perimeter) || 0);
    updated.params.ceilingHeight = Math.max(0, parseFloat(editParams.height) || 0);

    saveHouseProject(updated);
    setProjects(getHouseProjects());
    setCurrentProject(updated);
    setIsEditingParams(false);
  };

  const openStepCalculator = (stepId: ConstructionStepId, calcType: any) => {
    if (!currentProject || !calcType) return;
    navigate(`/app/calculator?calc=${calcType}&projectId=${currentProject.id}&stepId=${stepId}`);
  };

  const reloadProject = () => {
    const updated = getHouseProjects().find((p) => p.id === currentProject?.id);
    if (updated) setCurrentProject(updated);
  };

  const handleStartOfficialQuote = () => {
    const profile = getCompanyProfile();
    if (!profile || !profile.name) {
      const ok = window.confirm(
        t("house.need_company_profile", {
          defaultValue: "You must first set up your company profile in Settings. Go there now?",
        })
      );
      if (ok) navigate("/app/settings");
      return;
    }
    setShowClientModal(true);
  };

  const generateOfficialQuote = (clientInfo: ClientInfo) => {
    if (!currentProject) return;
    const profile = getCompanyProfile();
    if (!profile) return;

    try {
      const computed = calculateQuote(currentProject);
      const quoteId = createQuoteFromProject(currentProject, computed, profile, clientInfo);
      setShowClientModal(false);
      navigate(`/app/quotes/${quoteId}`);
    } catch (e) {
      console.error("Quote generation error:", e);
      window.alert(
        t("house.quote_error", {
          defaultValue: "An error occurred while creating the quote.",
        })
      );
    }
  };

  const getProjectTotal = (p: HouseProject) => {
    return (Object.values(p.steps) as any[]).reduce((sum, s) => sum + (s?.cost || 0), 0);
  };

  if (currentProject) {
    const totalBudget = getProjectTotal(currentProject);

    return (
      <div className="app-shell app-shell--house min-h-screen pb-20">
        <div className="sticky top-0 z-20 border-b border-slate-200/80 glass-panel shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <button
              onClick={closeProject}
              className="flex items-center text-slate-500 font-medium hover:text-blue-600"
              type="button"
            >
              <ArrowLeft size={20} className="mr-1" />{" "}
              {t("common.back", { defaultValue: "Back" })}
            </button>

            <div className="text-right">
              <h1 className="text-lg font-extrabold text-slate-800">{currentProject.name}</h1>
              <p className="text-xs text-slate-500">
                {t("house.budget_steps", { defaultValue: "Steps budget" })}:{" "}
                {euro.format(totalBudget).replace(/\s/g, " ")}
              </p>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="mx-auto w-fit max-w-full">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar rounded-xl bg-slate-200/80 p-1.5 shadow-sm border border-slate-200">
            <button
              onClick={() => setActiveTab("steps")}
              className={`px-4 py-2 text-sm font-extrabold rounded-xl whitespace-nowrap transition-colors flex items-center ${
                activeTab === "steps"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-700 hover:bg-white/84"
              }`}
              type="button"
            >
              <Layers size={18} className="mr-2" />{" "}
              {t("house.tabs.steps", { defaultValue: "Steps" })}
            </button>

            <button
              onClick={() => setActiveTab("quote")}
              className={`px-4 py-2 text-sm font-extrabold rounded-xl whitespace-nowrap transition-colors flex items-center ${
                activeTab === "quote"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-700 hover:bg-white/84"
              }`}
              type="button"
            >
              <FileText size={18} className="mr-2" />{" "}
              {t("house.tabs.quote", { defaultValue: "Quote" })}
            </button>
              </div>
            </div>
          </div>
        </div>

        <div className="page-frame space-y-4">
          {activeTab === "steps" && (
            <>
              {isEditingParams ? (
                <div className="app-card rounded-[28px] shadow-sm border border-blue-100 p-5 mb-4 animate-in fade-in">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-extrabold text-blue-600 uppercase">
                      {t("house.edit_data", { defaultValue: "Edit data" })}
                    </h2>
                    <button onClick={() => setIsEditingParams(false)} type="button">
                      <X size={20} className="text-slate-400" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 mb-1">
                        {t("house.surface", { defaultValue: "Area (m²)" })}
                      </label>
                      <input
                        type="number"
                        value={editParams.surface}
                        onChange={(e) => setEditParams({ ...editParams, surface: e.target.value })}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 mb-1">
                        {t("house.perimeter", { defaultValue: "Perimeter (m)" })}
                      </label>
                      <input
                        type="number"
                        value={editParams.perimeter}
                        onChange={(e) =>
                          setEditParams({ ...editParams, perimeter: e.target.value })
                        }
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold text-slate-500 mb-1">
                        {t("house.ceiling_height", { defaultValue: "Ceiling height (m)" })}
                      </label>
                      <input
                        type="number"
                        value={editParams.height}
                        onChange={(e) => setEditParams({ ...editParams, height: e.target.value })}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    onClick={saveEditedParams}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-extrabold shadow-sm"
                    type="button"
                  >
                    {t("common.save", { defaultValue: "Save" })}
                  </button>
                </div>
              ) : (
                <div className="app-card rounded-[28px] shadow-sm border border-slate-200/80 p-5 mb-4 relative group">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-sm font-extrabold text-slate-400 uppercase flex items-center">
                      <Ruler size={16} className="mr-2" />{" "}
                      {t("house.site_data", { defaultValue: "Site data" })}
                    </h2>
                    <button
                      onClick={startEditParams}
                      className="p-1.5 bg-transparent text-slate-400 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      type="button"
                      aria-label={t("house.edit", { defaultValue: "Edit" })}
                    >
                      <Pencil size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-slate-500 text-xs">
                        {t("house.surface_living", { defaultValue: "Living area" })}
                      </span>
                      <span className="font-extrabold text-slate-800 text-lg">
                        {currentProject.params.surfaceArea} m²
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-500 text-xs">
                        {t("house.perimeter_label", { defaultValue: "Perimeter" })}
                      </span>
                      <span className="font-extrabold text-slate-800 text-lg">
                        {Number(currentProject.params.perimeter || 0).toFixed(1)} m
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-500 text-xs">
                        {t("house.ceiling_height_label", { defaultValue: "Ceiling height" })}
                      </span>
                      <span className="font-extrabold text-slate-800">
                        {currentProject.params.ceilingHeight} m
                      </span>
                    </div>

                    <div>
                      <span className="block text-slate-500 text-xs">
                        {t("house.levels", { defaultValue: "Levels" })}
                      </span>
                      <span className="font-extrabold text-slate-800">
                        {currentProject.params.levels === 1
                          ? t("house.single_storey", { defaultValue: "Single-storey" })
                          : `R+${currentProject.params.levels - 1}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-[28px] border border-slate-200/80 bg-white/60 backdrop-blur-sm shadow-sm p-4 md:p-5"><div className="space-y-6">
                {constructionSteps.map((group: ConstructionStepGroup) => (
                  <div key={group.id}>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-3 px-1">
                      {group.label}
                    </h3>
                    <div className="space-y-2">
                      {group.steps.map((step: ConstructionStepDef) => {
                        const stepData = currentProject.steps[step.id];
                        const isDone = stepData?.status === "done";
                        const Icon = step.icon;

                        return (
                          <button
                            key={step.id}
                            onClick={() => openStepCalculator(step.id, step.calc)}
                            disabled={!step.calc}
                            type="button"
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isDone ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                            } ${
                              !step.calc
                                ? "opacity-60 cursor-not-allowed"
                                : "hover:border-blue-300 active:scale-[0.99]"
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`p-2 rounded-lg ${
                                  isDone
                                    ? "bg-emerald-100 text-emerald-600"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                <Icon size={20} />
                              </div>

                              <div className="text-left">
                                <span
                                  className={`block font-medium ${
                                    isDone ? "text-emerald-900" : "text-slate-700"
                                  }`}
                                >
                                  {step.label}
                                </span>

                                {stepData && stepData.cost > 0 && (
                                  <span className="text-xs text-emerald-600 font-extrabold">
                                    {euro.format(stepData.cost)}
                                  </span>
                                )}

                                {!step.calc && (
                                  <span className="text-[10px] text-slate-400">
                                    {t("house.coming_soon", { defaultValue: "Coming soon" })}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isDone ? (
                              <CheckCircle2 size={20} className="text-emerald-500" />
                            ) : (
                              <Circle size={20} className="text-slate-300" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div></div>
            </>
          )}

          {activeTab === "quote" && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-slate-800 text-lg flex items-center">
                    <FileCheck className="mr-2 text-emerald-600" size={20} />{" "}
                    {t("house.official_docs", { defaultValue: "Official documents" })}
                  </h3>

                  <button
                    onClick={handleStartOfficialQuote}
                    className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-extrabold shadow-sm hover:bg-emerald-700 transition-colors flex items-center"
                    type="button"
                  >
                    <Plus size={16} className="mr-1" />{" "}
                    {t("house.generate_quote", { defaultValue: "Generate quote" })}
                  </button>
                </div>

                {projectQuotes.length > 0 ? (
                  <div className="space-y-3">
                    {projectQuotes.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => navigate(`/app/quotes/${q.id}`)}
                        className="bg-white/85 p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer hover:border-blue-300"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-slate-800">{q.number}</span>
                            <span
                              className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                                q.status === "draft"
                                  ? "bg-slate-100 text-slate-500"
                                  : q.status === "accepted"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : q.status === "invoiced"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {q.status === "draft"
                                ? t("house.quote_status.draft", { defaultValue: "Draft" })
                                : q.status === "invoiced"
                                ? t("house.quote_status.invoiced", { defaultValue: "Invoiced" })
                                : String(q.status)}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 mt-1">
                            {new Date(q.date).toLocaleDateString(i18n.language || undefined)} •{" "}
                            {q.client.name}
                          </div>
                        </div>

                        <span className="font-extrabold text-slate-700">
                          {euro.format(q.totalTTC)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/84 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-sm">
                    {t("house.no_official_docs", { defaultValue: "No official document created." })}
                  </div>
                )}
              </section>

              <hr className="border-slate-200" />

              <section>
                <h3 className="font-extrabold text-slate-800 text-lg mb-4 flex items-center">
                  <AlertTriangle className="mr-2 text-amber-500" size={20} />{" "}
                  {t("house.quick_estimator", { defaultValue: "Quick estimator" })}
                </h3>
                <QuotePanel project={currentProject} onUpdate={reloadProject} />
              </section>
            </div>
          )}
        </div>

        <ClientModal
          isOpen={showClientModal}
          onClose={() => setShowClientModal(false)}
          onConfirm={generateOfficialQuote}
        />
      </div>
    );
  }

  // ===== LIST PAGE (same aesthetic as Projects) =====
  return (
    <div className="app-shell app-shell--house min-h-screen p-4 pb-20">
      <div className="page-frame space-y-4">
      <section className="rounded-[28px] border border-slate-200/80 app-card shadow-sm p-5 md:p-6">
      <div className="mb-3">
        <h1 className="text-2xl font-extrabold text-slate-800">
          {t("house.my_sites", { defaultValue: "My sites (full estimate)" })}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t("house.my_sites_subtitle", {
            defaultValue: "Créez un chantier et enregistrez les résultats étape par étape (suivi complet).",
          })}
        </p>
      </div>

      {/* HERO CTA (like Projects) */}
      {!isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform active:scale-[0.98] hover:shadow-md w-full mb-5"
          type="button"
        >
          <div className="absolute inset-0">
            <img
              src={heroImageSrc}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/images/menu/fallback.jpg";
              }}
            />
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
          </div>

          <div className="relative z-10 w-full p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/90 border border-white/60 flex items-center justify-center shadow-sm">
                <Plus className="text-blue-600" size={22} />
              </div>
              <div className="text-left">
                <div className="text-white font-extrabold text-base leading-tight">
                  {t("house.create_site", { defaultValue: "Create a site" })}
                </div>
                <div className="text-white/80 text-xs font-semibold mt-0.5">
                  {t("house.new_project", { defaultValue: "New project" })}
                </div>
              </div>
            </div>

            <div className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
              <ChevronRight className="text-white" size={18} />
            </div>
          </div>
        </button>
      )}

      </section>

      {isCreating ? (
        <div className="app-card p-5 rounded-[28px] shadow-sm border border-blue-100 animate-in zoom-in-95">
          <h2 className="font-extrabold text-lg mb-4">
            {t("house.new_site", { defaultValue: "New site" })}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1">
                {t("house.project_name", { defaultValue: "Project name" })}
              </label>
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("house.project_placeholder", { defaultValue: "e.g. New house build" })}
                className="w-full p-3 border rounded-lg bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 mb-1">
                {t("house.surface_living_m2", { defaultValue: "Living area (m²)" })}
              </label>
              <input
                type="number"
                value={newSurface}
                onChange={(e) => setNewSurface(e.target.value)}
                placeholder="100"
                className="w-full p-3 border rounded-lg bg-white text-slate-900"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsCreating(false)}
                className="flex-1 py-3 text-slate-500 font-extrabold"
                type="button"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>

              <button
                onClick={handleCreate}
                className="flex-1 py-3 bg-blue-600 text-white font-extrabold rounded-lg shadow-md"
                type="button"
              >
                {t("house.create", { defaultValue: "Create" })}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const total = getProjectTotal(p);
            return (
              <div
                key={p.id}
                onClick={() => selectProject(p)}
                className="bg-white/72 backdrop-blur-sm p-4 rounded-[24px] shadow-sm border border-slate-200/80 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform hover:border-blue-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                    <Home size={24} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800">{p.name}</h3>
                    <p className="text-xs text-slate-500">
                      {p.params.surfaceArea} m² •{" "}
                      {new Date(p.date).toLocaleDateString(i18n.language || undefined)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-700 bg-transparent border border-slate-200 px-3 py-1 rounded-lg">
                    {euro.format(total)}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(p.id);
                    }}
                    className="p-2 text-slate-300 hover:text-red-400"
                    type="button"
                    aria-label={t("common.delete", { defaultValue: "Delete" })}
                  >
                    <Trash2 size={18} />
                  </button>

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