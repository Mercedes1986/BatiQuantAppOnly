
function MobileAdPlaceholder({
  title,
  description,
  minHeight = 96,
}: {
  title: string;
  description: string;
  minHeight?: number;
}) {
  return (
    <div
      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-sm text-slate-500"
      style={{ minHeight }}
      data-ad-platform="mobile-ready-placeholder"
      role="complementary"
      aria-label={title}
    >
      <div className="flex h-full items-center justify-center">
        <div>
          <div className="font-medium text-slate-600">{title}</div>
          <div className="mt-1 text-xs text-slate-400">{description}</div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Plus,
  Share2,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import {
  CalculatorType,
  CalculatorConfig,
  CalculationResult,
  Project,
} from "../types";
import { getCalculators, getStaticTips } from "../constants";

import { PaintCalculator } from "../components/calculators/PaintCalculator";
import { ConcreteCalculator } from "../components/calculators/ConcreteCalculator";
import { TileCalculator } from "../components/calculators/TileCalculator";
import { LevelingCalculator } from "../components/calculators/LevelingCalculator";
import { PlacoCalculator } from "../components/calculators/PlacoCalculator";
import { StructuralCalculator } from "../components/calculators/StructuralCalculator";
import { SubstructureCalculator } from "../components/calculators/SubstructureCalculator";
import { RoofCalculator } from "../components/calculators/RoofCalculator";
import { JoineryCalculator } from "../components/calculators/JoineryCalculator";
import { ElectricityCalculator } from "../components/calculators/ElectricityCalculator";
import { PlumbingCalculator } from "../components/calculators/PlumbingCalculator";
import { HvacCalculator } from "../components/calculators/HvacCalculator";
import { ScreedCalculator } from "../components/calculators/ScreedCalculator";
import { FacadeCalculator } from "../components/calculators/FacadeCalculator";
import { ExteriorCalculator } from "../components/calculators/ExteriorCalculator";
import { StairCalculator } from "../components/calculators/StairCalculator";
import { FoundationsCalculator } from "../components/calculators/FoundationsCalculator";
import { QuickToolsCalculator } from "../components/calculators/QuickToolsCalc";
import { getProjects, saveProject, generateId } from "../services/storage";

interface Props {
  type: CalculatorType;
  onBack: () => void;
  onNavigateProjects: () => void;
}

export const CalculatorPage: React.FC<Props> = ({ type, onBack, onNavigateProjects }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId");
  const returnQuoteId = searchParams.get("returnQuoteId");

  const config = useMemo(() => {
    const c = getCalculators().find((x) => x.id === type) as CalculatorConfig | undefined;
    return c;
  }, [type, i18n.language]);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showTips, setShowTips] = useState(false);

  const tips = (getStaticTips()[type] || []) as string[];
  const hasTips = tips.length > 0;


  const existingProject = useMemo(() => {
    if (!projectId) return null;
    return getProjects().find((project) => project.id === projectId) || null;
  }, [projectId]);

  const initialSnapshot = existingProject?.calculatorSnapshot;

  useEffect(() => {
    if (existingProject?.name) setNewProjectName(existingProject.name);
  }, [existingProject?.name]);

  const handleBack = () => {
    if (returnQuoteId) {
      navigate(`/app/quotes/${returnQuoteId}`);
      return;
    }
    if (projectId) {
      navigate(`/app/projects?projectId=${projectId}`);
      return;
    }
    onBack();
  };

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
      }),
    [i18n.language]
  );

  if (!config) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-6 text-center text-slate-600">
        {t("calculator.missing_config", { defaultValue: "Calculator unavailable." })}
      </div>
    );
  }

  const renderCalculator = () => {
    switch (type) {
      case CalculatorType.PAINT:
        return <PaintCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.CONCRETE:
        return <ConcreteCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.TILES:
        return <TileCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.RAGREAGE:
        return <LevelingCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.PLACO:
        return <PlacoCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      // Legacy fallback
      case CalculatorType.STRUCTURAL:
        return <StructuralCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      // Specific structural modes
      case CalculatorType.GROUNDWORK:
        return <StructuralCalculator onCalculate={setResult} initialMode="groundwork" hideTabs initialSnapshot={initialSnapshot} />;

      case CalculatorType.FOUNDATIONS:
        return <FoundationsCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.WALLS:
        return <StructuralCalculator onCalculate={setResult} initialMode="walls" hideTabs initialSnapshot={initialSnapshot} />;

      case CalculatorType.SUBSTRUCTURE:
        return <SubstructureCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.STAIRS:
        return <StairCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.ROOF:
        return <RoofCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.JOINERY:
        return <JoineryCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.ELECTRICITY:
        return <ElectricityCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.PLUMBING:
        return <PlumbingCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.HVAC:
        return <HvacCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.SCREED:
        return <ScreedCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.FACADE:
        return <FacadeCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.EXTERIOR:
        return <ExteriorCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      case CalculatorType.QUICK_TOOLS:
        return <QuickToolsCalculator onCalculate={setResult} initialSnapshot={initialSnapshot} />;

      default:
        return (
          <div className="p-4 text-center text-slate-500">
            {t("calculator.in_dev", { defaultValue: "Calculator in development..." })}
          </div>
        );
    }
  };

  const handleAddToProject = () => {
    if (!result) return;

    const dateLabel = new Date().toLocaleDateString(i18n.language || "en-GB");
    const projectNotes =
      tips.length > 0
        ? `${t("calculator.tips_prefix", { defaultValue: "Pro tips:" })}
${tips
            .map((x: string) => `- ${x}`)
            .join("\n")}`
        : "";

    const project: Project = {
      id: existingProject?.id || generateId(),
      name: newProjectName || existingProject?.name || `${config.name} - ${dateLabel}`,
      date: existingProject?.date || new Date().toISOString(),
      items: result.materials,
      notes: projectNotes || existingProject?.notes || "",
      calculatorType: type,
      calculatorLabel: config.name,
      calculatorSnapshot: result.snapshot,
    };

    saveProject(project);
    setShowSaveModal(false);

    if (returnQuoteId) {
      navigate(`/app/quotes/${returnQuoteId}`);
      return;
    }

    if (existingProject) {
      navigate(`/app/projects?projectId=${project.id}`);
      return;
    }

    onNavigateProjects();
  };

  const handleShare = async () => {
    if (!result) return;

    const detailsText = result.details
      .map((d) => `• ${d.label}: ${d.value} ${d.unit || ""}`.trim())
      .join("\n");

    const materialsText = result.materials
      .map((m) => {
        const line = `- ${m.name}: ${m.quantity} ${m.unit}`;
        return m.details ? `${line}
  (${m.details})` : line;
      })
      .join("\n");

    const warningsText =
      result.warnings && result.warnings.length > 0
        ? `
${t("common.attention", { defaultValue: "ATTENTION" })}:
${result.warnings.join("\n")}`
        : "";

    const text = [
      `${t("app.name", { defaultValue: "BatiQuant" })} - ${config.name}`,
      "-------------------------",
      result.summary,
      `${t("calculator.estimated_cost", { defaultValue: "Estimated cost" })}: ~ ${euro.format(result.totalCost)}`,
      "-------------------------",
      "",
      `${t("calculator.tech_details", { defaultValue: "TECHNICAL DETAILS" })}:`,
      detailsText,
      "",
      `${t("calculator.shopping_list", { defaultValue: "SHOPPING LIST" })}:`,
      materialsText,
      warningsText,
      "",
      `${t("calculator.generated_by", { defaultValue: "Generated by BatiQuant (Offline)" })}`,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${t("calculator.share_title", { defaultValue: "Calculation" })} ${config.name}`,
          text,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto no-scrollbar">
      <div className={`sticky top-0 z-10 flex items-center p-4 ${config.color} text-white shadow-md`}>
        <button
          onClick={handleBack}
          className="mr-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          type="button"
          aria-label={t("common.back", { defaultValue: "Back" })}
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex-1">
          <h1 className="text-xl font-extrabold">{config.name}</h1>
          <p className="text-xs opacity-90">
            {t("calculator.precision", { defaultValue: "Precision calculator" })}
          </p>
          {returnQuoteId ? (
            <button
              type="button"
              onClick={() => navigate(`/app/quotes/${returnQuoteId}`)}
              className="mt-1 text-[11px] font-semibold text-white/90 underline underline-offset-2"
            >
              {t("common.back_to_quote", { defaultValue: "Back to quote" })}
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          {renderCalculator()}
        </div>

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-600 relative overflow-hidden">
              <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-1">
                {t("calculator.result_estimated", { defaultValue: "Estimated result" })}
              </h2>
              <p className="text-4xl font-extrabold text-blue-600 mb-4">{result.summary}</p>

              <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
                {result.details.map((d, i) => (
                  <div key={i}>
                    <span className="block text-slate-500">{d.label}</span>
                    <span className="font-semibold text-slate-800">
                      {d.value} {d.unit}
                    </span>
                  </div>
                ))}
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-700">
                  <div className="flex items-center mb-1 font-extrabold">
                    <AlertTriangle size={16} className="mr-2" />{" "}
                    {t("common.attention", { defaultValue: "Warning" })}
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-slate-800">
                  {t("calculator.materials_estimated", { defaultValue: "Estimated materials" })}
                </h3>
                <span className="text-emerald-600 font-extrabold text-lg">
                  ~ {euro.format(result.totalCost)}
                </span>
              </div>

              <ul className="space-y-4 text-sm">
                {result.materials.map((m) => {
                  return (
                    <li key={m.id} className="border-b border-slate-50 last:border-0 pb-2">
                      <div className="flex justify-between items-start gap-3">
                        <span className="font-medium text-slate-700 min-w-0 truncate">
                          {m.name}
                        </span>

                        <span className="font-extrabold bg-slate-100 px-2 py-0.5 rounded text-slate-800 whitespace-nowrap">
                          {m.quantity} {m.unit}
                        </span>
                      </div>

                      {m.details && (
                        <p className="text-xs text-slate-500 mt-1 italic pl-2 border-l-2 border-slate-200">
                          {m.details}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {hasTips && (
                <button
                  type="button"
                  onClick={() => setShowTips(!showTips)}
                  className={`col-span-2 flex items-center justify-center space-x-2 p-3 rounded-xl font-extrabold shadow-md active:scale-95 transition-all ${
                    showTips
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  <Lightbulb size={20} className={showTips ? "fill-amber-500 text-amber-500" : ""} />
                  <span>
                    {showTips
                      ? t("calculator.hide_tips", { defaultValue: "Hide tips" })
                      : t("calculator.pro_tips", { defaultValue: "Pro tips" })}
                  </span>
                </button>
              )}

              {showTips && tips.length > 0 && (
                <div className="col-span-2 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-900 animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-extrabold mb-2 flex items-center">
                    <CheckCircle2 size={16} className="mr-2" />{" "}
                    {t("calculator.best_practices", { defaultValue: "Best practices" })}
                  </h4>
                  <ul className="space-y-2">
                    {tips.map((tip: string, idx: number) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={() => (existingProject ? handleAddToProject() : setShowSaveModal(true))}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white p-3 rounded-xl font-extrabold shadow-md active:scale-95 transition-transform"
              >
                <Plus size={20} />
                <span>{existingProject ? t("common.update", { defaultValue: "Update" }) : t("common.save", { defaultValue: "Save" })}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center space-x-2 bg-white text-slate-700 border border-slate-200 p-3 rounded-xl font-extrabold active:scale-95 transition-transform"
              >
                <Share2 size={20} />
                <span>{t("common.share", { defaultValue: "Share" })}</span>
              </button>
            </div>

            <div className="pt-4">
              <MobileAdPlaceholder
            title={t("ads.placeholderTitle", { defaultValue: "Reserved ad placement" })}
            description={t("ads.placeholderDescription", {
              defaultValue: "This area is kept for future mobile ad integration.",
            })}
            minHeight={180}
          />
            </div>
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-extrabold mb-4">
              {t("calculator.project_name", { defaultValue: "Project name" })}
            </h3>

            <input
              autoFocus
              type="text"
              placeholder={t("calculator.project_placeholder", {
                defaultValue: "e.g. Living room renovation",
              })}
              className="w-full p-3 border border-slate-300 rounded-lg mb-4 bg-white text-slate-900"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 p-3 text-slate-600 font-extrabold"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>

              <button
                type="button"
                onClick={handleAddToProject}
                className="flex-1 p-3 bg-blue-600 text-white rounded-lg font-extrabold shadow-lg"
              >
                {t("common.save", { defaultValue: "Save" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};