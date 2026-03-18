import React, { useMemo, useState } from "react";
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
import { saveProject, generateId } from "../services/storage";

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
      className="w-full rounded-2xl border border-slate-200 bg-slate-50/85 px-3 py-3 text-center text-sm text-slate-500"
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

interface Props {
  type: CalculatorType;
  onBack: () => void;
  onNavigateProjects: () => void;
}

export const CalculatorPage: React.FC<Props> = ({ type, onBack, onNavigateProjects }) => {
  const { t, i18n } = useTranslation();

  const config = useMemo(() => {
    return getCalculators().find((x) => x.id === type) as CalculatorConfig | undefined;
  }, [type, i18n.language]);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showTips, setShowTips] = useState(false);

  const tips = (getStaticTips()[type] || []) as string[];
  const hasTips = tips.length > 0;

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
        return <PaintCalculator onCalculate={setResult} />;
      case CalculatorType.CONCRETE:
        return <ConcreteCalculator onCalculate={setResult} />;
      case CalculatorType.TILES:
        return <TileCalculator onCalculate={setResult} />;
      case CalculatorType.RAGREAGE:
        return <LevelingCalculator onCalculate={setResult} />;
      case CalculatorType.PLACO:
        return <PlacoCalculator onCalculate={setResult} />;
      case CalculatorType.STRUCTURAL:
        return <StructuralCalculator onCalculate={setResult} />;
      case CalculatorType.GROUNDWORK:
        return <StructuralCalculator onCalculate={setResult} initialMode="groundwork" hideTabs />;
      case CalculatorType.FOUNDATIONS:
        return <FoundationsCalculator onCalculate={setResult} />;
      case CalculatorType.WALLS:
        return <StructuralCalculator onCalculate={setResult} initialMode="walls" hideTabs />;
      case CalculatorType.SUBSTRUCTURE:
        return <SubstructureCalculator onCalculate={setResult} />;
      case CalculatorType.STAIRS:
        return <StairCalculator onCalculate={setResult} />;
      case CalculatorType.ROOF:
        return <RoofCalculator onCalculate={setResult} />;
      case CalculatorType.JOINERY:
        return <JoineryCalculator onCalculate={setResult} />;
      case CalculatorType.ELECTRICITY:
        return <ElectricityCalculator onCalculate={setResult} />;
      case CalculatorType.PLUMBING:
        return <PlumbingCalculator onCalculate={setResult} />;
      case CalculatorType.HVAC:
        return <HvacCalculator onCalculate={setResult} />;
      case CalculatorType.SCREED:
        return <ScreedCalculator onCalculate={setResult} />;
      case CalculatorType.FACADE:
        return <FacadeCalculator onCalculate={setResult} />;
      case CalculatorType.EXTERIOR:
        return <ExteriorCalculator onCalculate={setResult} />;
      case CalculatorType.QUICK_TOOLS:
        return <QuickToolsCalculator onCalculate={setResult} />;
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
${tips.map((x: string) => `- ${x}`).join("\n")}`
        : "";

    const project: Project = {
      id: generateId(),
      name: newProjectName || `${config.name} - ${dateLabel}`,
      date: new Date().toISOString(),
      items: result.materials,
      notes: projectNotes,
    };

    saveProject(project);
    setShowSaveModal(false);
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
        return m.details ? `${line}\n  (${m.details})` : line;
      })
      .join("\n");

    const warningsText =
      result.warnings && result.warnings.length > 0
        ? `\n${t("common.attention", { defaultValue: "ATTENTION" })}:\n${result.warnings.join("\n")}`
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
    <div className="app-shell app-shell--calculator min-h-screen bg-transparent">
      <div className="page-narrow space-y-4">
        <section className={`glass-panel sticky top-0 z-10 rounded-[28px] p-4 text-white shadow-md ${config.color}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 transition-colors hover:bg-white/20"
              type="button"
              aria-label={t("common.back", { defaultValue: "Back" })}
            >
              <ArrowLeft size={22} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold break-words">{config.name}</h1>
              <p className="text-xs opacity-90">
                {t("calculator.precision", { defaultValue: "Precision calculator" })}
              </p>
            </div>
          </div>
        </section>

        <section className="app-card rounded-[24px] p-3.5 sm:rounded-[30px] sm:p-5">
          {renderCalculator()}
        </section>

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="app-card rounded-[24px] border border-blue-200 p-4 sm:rounded-[30px] sm:p-6">
              <h2 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                {t("calculator.result_estimated", { defaultValue: "Estimated result" })}
              </h2>
              <p className="mb-5 break-words text-3xl font-extrabold leading-tight text-blue-600 sm:text-4xl">
                {result.summary}
              </p>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 sm:gap-4">
                {result.details.map((d, i) => (
                  <div key={i} className="min-w-0">
                    <span className="block text-slate-500">{d.label}</span>
                    <span className="font-semibold text-slate-800 break-words">
                      {d.value} {d.unit}
                    </span>
                  </div>
                ))}
              </div>

              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-4 bg-red-50 border border-red-200 p-3 rounded-lg text-sm text-red-700">
                  <div className="mb-1 flex items-center font-extrabold">
                    <AlertTriangle size={16} className="mr-2" />
                    {t("common.attention", { defaultValue: "Warning" })}
                  </div>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="app-card rounded-[24px] p-4 sm:rounded-[28px] sm:p-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-extrabold text-slate-800">
                  {t("calculator.materials_estimated", { defaultValue: "Estimated materials" })}
                </h3>
                <span className="text-lg font-extrabold text-emerald-600">
                  ~ {euro.format(result.totalCost)}
                </span>
              </div>

              <ul className="space-y-4 text-sm">
                {result.materials.map((m) => (
                  <li key={m.id} className="border-b border-slate-50 last:border-0 pb-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <span className="min-w-0 break-words font-medium text-slate-700">
                        {m.name}
                      </span>
                      <span className="inline-flex max-w-full items-center justify-center rounded-xl bg-slate-100 px-2.5 py-1 font-extrabold text-slate-800">
                        {m.quantity} {m.unit}
                      </span>
                    </div>

                    {m.details && (
                      <p className="mt-1 border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
                        {m.details}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {hasTips && (
                <button
                  type="button"
                  onClick={() => setShowTips(!showTips)}
                  className={`sm:col-span-2 flex items-center justify-center space-x-2 p-3 rounded-xl font-extrabold shadow-md active:scale-95 transition-all ${
                    showTips
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  <Lightbulb
                    size={20}
                    className={showTips ? "fill-amber-500 text-amber-500" : ""}
                  />
                  <span>
                    {showTips
                      ? t("calculator.hide_tips", { defaultValue: "Hide tips" })
                      : t("calculator.pro_tips", { defaultValue: "Pro tips" })}
                  </span>
                </button>
              )}

              {showTips && tips.length > 0 && (
                <div className="sm:col-span-2 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-900 animate-in fade-in slide-in-from-top-2">
                  <h4 className="mb-2 flex items-center font-extrabold">
                    <CheckCircle2 size={16} className="mr-2" />
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
                onClick={() => setShowSaveModal(true)}
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white p-3 rounded-xl font-extrabold shadow-md active:scale-95 transition-transform"
              >
                <Plus size={20} />
                <span>{t("common.save", { defaultValue: "Save" })}</span>
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

            <div className="pt-2">
              <MobileAdPlaceholder
                title={t("ads.placeholderTitle", { defaultValue: "Reserved ad placement" })}
                description={t("ads.placeholderDescription", {
                  defaultValue: "This area is kept for future mobile ad integration.",
                })}
                minHeight={156}
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
