import React, { useState } from "react";
import { ArrowLeft, Plus, Share2, Lightbulb, CheckCircle2, AlertTriangle } from "lucide-react";
import { CalculatorType, CalculatorConfig, CalculationResult, Project } from "../types";
import { CALCULATORS, STATIC_TIPS } from "../constants";

// ✅ Chemins corrects depuis src/pages/CalculatorPage.tsx
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

import { AdSlot } from "../components/ads/AdSlot";
import { saveProject, generateId } from "../services/storage";

interface Props {
  type: CalculatorType;
  onBack: () => void;
  onNavigateProjects: () => void;
}

export const CalculatorPage: React.FC<Props> = ({ type, onBack, onNavigateProjects }) => {
  const config = CALCULATORS.find((c) => c.id === type) as CalculatorConfig;

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showTips, setShowTips] = useState(false);

  const tips = STATIC_TIPS[type] || [];

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

      // Legacy fallback
      case CalculatorType.STRUCTURAL:
        return <StructuralCalculator onCalculate={setResult} />;

      // Specific structural modes
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

      // New modules
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

      default:
        return <div className="p-4 text-center text-slate-500">Calculateur en cours de développement...</div>;
    }
  };

  const handleAddToProject = () => {
    if (!result) return;

    const projectNotes = tips.length > 0 ? "Conseils Pro:\n" + tips.map((t: string) => `- ${t}`).join("\n") : "";

    const project: Project = {
      id: generateId(),
      name: newProjectName || `${config.name} - ${new Date().toLocaleDateString("fr-FR")}`,
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

    const text = `BatiQuant - ${config.name}
-------------------------
${result.summary}
Coût estimé: ~${result.totalCost} €
-------------------------

DÉTAILS TECHNIQUES:
${result.details.map((d) => `• ${d.label}: ${d.value} ${d.unit || ""}`).join("\n")}

LISTE D'ACHAT:
${result.materials
  .map((m) => {
    const line = `- ${m.name}: ${m.quantity} ${m.unit}`;
    return m.details ? `${line}\n  (${m.details})` : line;
  })
  .join("\n")}

${result.warnings ? "\nATTENTION:\n" + result.warnings.join("\n") : ""}

Généré par BatiQuant (Offline)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Calcul ${config.name}`,
          text,
        });
      } catch {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Résultat copié dans le presse-papier !");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-20 overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className={`sticky top-0 z-10 flex items-center p-4 ${config.color} text-white shadow-md`}>
        <button
          onClick={onBack}
          className="mr-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          type="button"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="flex-1">
          <h1 className="text-xl font-bold">{config.name}</h1>
          <p className="text-xs opacity-90">Calculateur de précision</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">{renderCalculator()}</div>

        {/* Results Section */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-600 relative overflow-hidden">
              <h2 className="text-sm uppercase tracking-wider text-slate-500 mb-1">Résultat estimé</h2>
              <p className="text-4xl font-bold text-blue-600 mb-4">{result.summary}</p>

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
                  <div className="flex items-center mb-1 font-bold">
                    <AlertTriangle size={16} className="mr-2" /> Attention
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
                <h3 className="font-bold text-slate-800">Matériaux estimés</h3>
                <span className="text-emerald-600 font-bold text-lg">~ {result.totalCost.toFixed(2)} €</span>
              </div>

              <ul className="space-y-4 text-sm">
                {result.materials.map((m) => (
                  <li key={m.id} className="border-b border-slate-50 last:border-0 pb-2">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-slate-700">{m.name}</span>
                      <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                        {m.quantity} {m.unit}
                      </span>
                    </div>

                    {m.details && (
                      <p className="text-xs text-slate-500 mt-1 italic pl-2 border-l-2 border-slate-200">
                        {m.details}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowTips(!showTips)}
                className={`col-span-2 flex items-center justify-center space-x-2 p-3 rounded-xl font-semibold shadow-md active:scale-95 transition-all ${
                  showTips
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                <Lightbulb size={20} className={showTips ? "fill-amber-500 text-amber-500" : ""} />
                <span>{showTips ? "Masquer les conseils" : "Conseils Pro"}</span>
              </button>

              {showTips && tips.length > 0 && (
                <div className="col-span-2 bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-amber-900 animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-bold mb-2 flex items-center">
                    <CheckCircle2 size={16} className="mr-2" /> Bonnes pratiques
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
                className="flex items-center justify-center space-x-2 bg-blue-600 text-white p-3 rounded-xl font-semibold shadow-md active:scale-95 transition-transform"
              >
                <Plus size={20} />
                <span>Sauvegarder</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center justify-center space-x-2 bg-white text-slate-700 border border-slate-200 p-3 rounded-xl font-semibold active:scale-95 transition-transform"
              >
                <Share2 size={20} />
                <span>Partager</span>
              </button>
            </div>

            {/* AdSlot Safe Zone */}
            <div className="pt-4">
              <AdSlot slotId="APP_RESULT_SLOT" variant="safe" minHeight={280} />
            </div>
          </div>
        )}
      </div>

      {/* Save Modal Overlay */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Nom du projet</h3>

            <input
              autoFocus
              type="text"
              placeholder="Ex: Rénovation Salon"
              className="w-full p-3 border border-slate-300 rounded-lg mb-4 bg-white text-slate-900"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />

            <div className="flex gap-3">
              <button type="button" onClick={() => setShowSaveModal(false)} className="flex-1 p-3 text-slate-600 font-medium">
                Annuler
              </button>

              <button type="button" onClick={handleAddToProject} className="flex-1 p-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};