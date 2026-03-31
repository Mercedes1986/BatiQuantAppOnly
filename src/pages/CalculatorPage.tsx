import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lightbulb,
  Plus,
  Share2,
} from "lucide-react";

import { ConcreteCalculator } from "../components/calculators/ConcreteCalculator";
import { ElectricityCalculator } from "../components/calculators/ElectricityCalculator";
import { ExteriorCalculator } from "../components/calculators/ExteriorCalculator";
import { FacadeCalculator } from "../components/calculators/FacadeCalculator";
import { FoundationsCalculator } from "../components/calculators/FoundationsCalculator";
import { HvacCalculator } from "../components/calculators/HvacCalculator";
import { JoineryCalculator } from "../components/calculators/JoineryCalculator";
import { LevelingCalculator } from "../components/calculators/LevelingCalculator";
import { PaintCalculator } from "../components/calculators/PaintCalculator";
import { PlacoCalculator } from "../components/calculators/PlacoCalculator";
import { PlumbingCalculator } from "../components/calculators/PlumbingCalculator";
import { QuickToolsCalculator } from "../components/calculators/QuickToolsCalc";
import { RoofCalculator } from "../components/calculators/RoofCalculator";
import { ScreedCalculator } from "../components/calculators/ScreedCalculator";
import { StairCalculator } from "../components/calculators/StairCalculator";
import { StructuralCalculator } from "../components/calculators/StructuralCalculator";
import { SubstructureCalculator } from "../components/calculators/SubstructureCalculator";
import { TileCalculator } from "../components/calculators/TileCalculator";
import { getCalculators, getStaticTips, localizeLegacyText } from "../constants";
import { armInterstitialAfterCalculation, clearPendingInterstitial, showPendingInterstitialIfReady } from "../services/adsService";
import { generateId, saveProject } from "../services/storage";
import { CalculatorType } from "../types";
import type {
  CalculationResult,
  CalculatorConfig,
  Project,
} from "../types";

interface Props {
  type: CalculatorType;
  onBack: () => void;
  onNavigateProjects: () => void;
}

export const CalculatorPage: React.FC<Props> = ({ type, onBack, onNavigateProjects }) => {
  const { t, i18n } = useTranslation();

  const config = useMemo(() => {
    const found = getCalculators().find((entry) => entry.id === type) as
      | CalculatorConfig
      | undefined;
    return found;
  }, [type, i18n.language]);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showTips, setShowTips] = useState(false);

  const calculationSequenceRef = useRef(0);

  const tips = (getStaticTips()[type] || []) as string[];
  const hasTips = tips.length > 0;

  const displayResult = useMemo(() => {
    if (!result) return null;
    return {
      ...result,
      summary: localizeLegacyText(result.summary),
      details: result.details.map((detail) => ({
        ...detail,
        label: localizeLegacyText(detail.label),
        value:
          typeof detail.value === "string"
            ? localizeLegacyText(detail.value)
            : detail.value,
      })),
      materials: result.materials.map((material) => ({
        ...material,
        name: localizeLegacyText(material.name),
        details: material.details ? localizeLegacyText(material.details) : material.details,
      })),
      warnings: result.warnings?.map((warning) => localizeLegacyText(warning)),
    };
  }, [result, i18n.language]);

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
      }),
    [i18n.language],
  );

  const handleCalculated = useCallback((nextResult: CalculationResult) => {
    const sequence = ++calculationSequenceRef.current;

    const resultKey = JSON.stringify({
      type,
      summary: nextResult.summary,
      totalCost: Number(nextResult.totalCost || 0),
      materials: nextResult.materials.length,
    });

    if (sequence !== calculationSequenceRef.current) return;
    setResult(nextResult);
    armInterstitialAfterCalculation("calculator_interstitial", { contextKey: resultKey });
  }, [type]);


  useEffect(() => {
    return () => {
      clearPendingInterstitial("calculator_interstitial");
    };
  }, []);

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-6 text-center text-slate-600">
        {t("calculator.missing_config", { defaultValue: "Calculator unavailable." })}
      </div>
    );
  }

  const renderCalculator = () => {
    switch (type) {
      case CalculatorType.PAINT:
        return <PaintCalculator onCalculate={handleCalculated} />;
      case CalculatorType.CONCRETE:
        return <ConcreteCalculator onCalculate={handleCalculated} />;
      case CalculatorType.TILES:
        return <TileCalculator onCalculate={handleCalculated} />;
      case CalculatorType.RAGREAGE:
        return <LevelingCalculator onCalculate={handleCalculated} />;
      case CalculatorType.PLACO:
        return <PlacoCalculator onCalculate={handleCalculated} />;
      case CalculatorType.STRUCTURAL:
        return <StructuralCalculator onCalculate={handleCalculated} />;
      case CalculatorType.GROUNDWORK:
        return <StructuralCalculator onCalculate={handleCalculated} initialMode="groundwork" hideTabs />;
      case CalculatorType.FOUNDATIONS:
        return <FoundationsCalculator onCalculate={handleCalculated} />;
      case CalculatorType.WALLS:
        return <StructuralCalculator onCalculate={handleCalculated} initialMode="walls" hideTabs />;
      case CalculatorType.SUBSTRUCTURE:
        return <SubstructureCalculator onCalculate={handleCalculated} />;
      case CalculatorType.STAIRS:
        return <StairCalculator onCalculate={handleCalculated} />;
      case CalculatorType.ROOF:
        return <RoofCalculator onCalculate={handleCalculated} />;
      case CalculatorType.JOINERY:
        return <JoineryCalculator onCalculate={handleCalculated} />;
      case CalculatorType.ELECTRICITY:
        return <ElectricityCalculator onCalculate={handleCalculated} />;
      case CalculatorType.PLUMBING:
        return <PlumbingCalculator onCalculate={handleCalculated} />;
      case CalculatorType.HVAC:
        return <HvacCalculator onCalculate={handleCalculated} />;
      case CalculatorType.SCREED:
        return <ScreedCalculator onCalculate={handleCalculated} />;
      case CalculatorType.FACADE:
        return <FacadeCalculator onCalculate={handleCalculated} />;
      case CalculatorType.EXTERIOR:
        return <ExteriorCalculator onCalculate={handleCalculated} />;
      case CalculatorType.QUICK_TOOLS:
        return <QuickToolsCalculator onCalculate={handleCalculated} />;
      default:
        return (
          <div className="p-4 text-center text-slate-500">
            {t("calculator.in_dev", {
              defaultValue: "Calculator in development...",
            })}
          </div>
        );
    }
  };

  const handleBackClick = useCallback(async () => {
    if (displayResult) {
      await showPendingInterstitialIfReady("calculator_interstitial");
    }
    onBack();
  }, [displayResult, onBack]);

  const handleAddToProject = () => {
    if (!displayResult) return;

    const dateLabel = new Date().toLocaleDateString(i18n.language || "en-GB");
    const projectNotes =
      tips.length > 0
        ? `${t("calculator.tips_prefix", { defaultValue: "Pro tips:" })}\n${tips
            .map((entry: string) => `- ${entry}`)
            .join("\n")}`
        : "";

    const project: Project = {
      id: generateId(),
      name: newProjectName || `${config.name} - ${dateLabel}`,
      date: new Date().toISOString(),
      items: displayResult.materials,
      notes: projectNotes,
    };

    saveProject(project);
    clearPendingInterstitial("calculator_interstitial");
    setShowSaveModal(false);
    setNewProjectName("");
    onNavigateProjects();
  };

  const handleShare = async () => {
    if (!displayResult) return;

    const text = [
      `${config.name} — BatiQuant`,
      displayResult.summary,
      "",
      t("calculator.materials_estimated", { defaultValue: "Estimated materials" }),
      ...displayResult.materials.map(
        (material) => `• ${material.name}: ${material.quantity} ${material.unit}`,
      ),
      "",
      `${t("common.total", { defaultValue: "Total" })}: ${euro.format(
        Number(displayResult.totalCost || 0),
      )}`,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${config.name} — BatiQuant`,
          text,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        alert(
          t("calculator.share_copied", {
            defaultValue: "Result copied to clipboard.",
          }),
        );
        return;
      }
    } catch {
      // fall through to alert below
    }

    alert(
      t("calculator.share_unavailable", {
        defaultValue: "Sharing is unavailable on this device.",
      }),
    );
  };

  return (
    <div className="app-shell app-shell--calculator min-h-full bg-transparent p-4 safe-bottom-offset">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="glass-panel rounded-[30px] p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackClick}
              className="inline-flex items-center rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-sm font-extrabold text-slate-700 shadow-sm transition-colors hover:bg-white"
            >
              <ArrowLeft size={18} className="mr-2" />
              {t("common.back", { defaultValue: "Back" })}
            </button>

            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                BatiQuant
              </p>
              <h1 className="text-xl font-extrabold text-slate-900">{config.name}</h1>
            </div>
          </div>

          <div className="app-card rounded-[26px] p-4">{renderCalculator()}</div>
        </section>

        {displayResult && (
          <div className="animate-in slide-in-from-bottom-2 space-y-4">
            <div className="app-card rounded-[28px] border-l-4 border-blue-600 p-6">
              <h2 className="mb-1 text-sm uppercase tracking-wider text-slate-500">
                {t("calculator.result_estimated", {
                  defaultValue: "Estimated result",
                })}
              </h2>
              <p className="mb-4 text-3xl font-bold text-slate-900">{displayResult.summary}</p>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm">
                {Array.isArray(displayResult.details) &&
                  displayResult.details.map((detail: any, index: number) => (
                    <div key={index}>
                      <span className="block text-slate-500">{detail.label}</span>
                      <span className="font-semibold text-slate-800">
                        {detail.value} {detail.unit}
                      </span>
                    </div>
                  ))}
              </div>

              {Array.isArray(displayResult.warnings) && displayResult.warnings.length > 0 && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <div className="mb-1 flex items-center font-extrabold">
                    <AlertTriangle size={16} className="mr-2" />
                    {t("common.attention", { defaultValue: "Warning" })}
                  </div>
                  <ul className="list-disc space-y-1 pl-4">
                    {displayResult.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="app-card rounded-[28px] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800">
                  {t("calculator.materials_estimated", {
                    defaultValue: "Estimated materials",
                  })}
                </h3>
                <span className="text-lg font-extrabold text-emerald-600">
                  ~ {euro.format(Number(displayResult.totalCost || 0))}
                </span>
              </div>

              <ul className="space-y-3 text-sm">
                {Array.isArray(displayResult.materials) &&
                  displayResult.materials.map((material: any) => (
                    <li key={material.id} className="border-b border-slate-50 pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex items-start gap-3">
                          <span className="truncate font-medium text-slate-700">
                            {material.name}
                          </span>
                        </div>

                        <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-0.5 font-extrabold text-slate-800">
                          {material.quantity} {material.unit}
                        </span>
                      </div>
                      {material.details && (
                        <p className="mt-1 border-l-2 border-slate-200 pl-2 text-xs italic text-slate-500">
                          {material.details}
                        </p>
                      )}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="rounded-[28px] border border-blue-100 bg-blue-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                {hasTips && (
                  <button
                    type="button"
                    onClick={() => setShowTips(!showTips)}
                    className={`col-span-2 flex items-center justify-center space-x-2 rounded-xl p-3 font-extrabold shadow-md transition-all active:scale-95 ${
                      showTips
                        ? "border-amber-200 bg-amber-100 text-amber-800"
                        : "border border-slate-200 bg-white text-slate-700"
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
                  <div className="col-span-2 animate-in fade-in slide-in-from-top-2 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                    <h4 className="mb-2 flex items-center font-extrabold">
                      <CheckCircle2 size={16} className="mr-2" />
                      {t("calculator.best_practices", { defaultValue: "Best practices" })}
                    </h4>
                    <ul className="space-y-2">
                      {tips.map((tip: string, index: number) => (
                        <li key={index} className="flex items-start">
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
                  className="flex items-center justify-center space-x-2 rounded-xl bg-blue-600 p-3 font-extrabold text-white shadow-md transition-transform active:scale-95"
                >
                  <Plus size={20} />
                  <span>{t("common.save", { defaultValue: "Save" })}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center space-x-2 rounded-xl border border-slate-200 bg-white p-3 font-extrabold text-slate-700 transition-transform active:scale-95"
                >
                  <Share2 size={20} />
                  <span>{t("common.share", { defaultValue: "Share" })}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6">
            <h3 className="mb-4 text-lg font-extrabold">
              {t("calculator.project_name", { defaultValue: "Project name" })}
            </h3>

            <input
              autoFocus
              type="text"
              placeholder={t("calculator.project_placeholder", {
                defaultValue: "e.g. Living room renovation",
              })}
              className="mb-4 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 p-3 font-extrabold text-slate-600"
              >
                {t("common.cancel", { defaultValue: "Cancel" })}
              </button>

              <button
                type="button"
                onClick={handleAddToProject}
                className="flex-1 rounded-lg bg-blue-600 p-3 font-extrabold text-white shadow-lg"
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
