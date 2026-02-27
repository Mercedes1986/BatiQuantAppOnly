import React, { useEffect, useMemo, useState } from "react";
import {
  CalculatorType,
  CalculationResult,
  Unit,
  FoundationProjectInputs,
  PadConfig,
  FoundationType,
} from "../../../types";
import { SOIL_PROPERTIES } from "../../constants";
import { calculateFoundations } from "../../services/foundationsEngine";
import { getUnitPrice } from "../../services/materialsService";
import {
  Warehouse,
  ArrowRight,
  Check,
  AlertTriangle,
  Settings,
  Ruler,
  Shovel,
  Plus,
  Trash2,
  BoxSelect,
  Combine,
  ArrowLeft,
} from "lucide-react";

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialMode?: "simple" | "pro";
}

const inputClass =
  "w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-sm font-medium placeholder:text-slate-400";
const labelClass = "block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide";
const sectionClass =
  "bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 animate-in fade-in slide-in-from-bottom-2";

const toNum = (v: string, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type PriceKeys =
  | "CONC_M3"
  | "STEEL_KG"
  | "EXCAV_M3"
  | "WASTE_M3"
  | "LEANCONC_M3"
  | "FORMWORK_M2"
  | "DRAIN_ML"
  | "GRAVEL_M3";

export const FoundationsCalculator: React.FC<Props> = ({ onCalculate, initialMode = "simple" }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(initialMode === "pro");

  // --- INPUTS STATE ---
  const [type, setType] = useState<FoundationType>("strip");

  // Geometry: Strip
  const [totalLengthMl, setTotalLengthMl] = useState("40");
  const [stripWidthCm, setStripWidthCm] = useState("50");
  const [stripHeightCm, setStripHeightCm] = useState("35");

  // Geometry: Pads
  const [pads, setPads] = useState<PadConfig[]>([
    { id: "1", count: 4, lengthCm: 60, widthCm: 60, heightCm: 40, depthCm: 80 },
  ]);

  // Site
  const [excavationDepthCm, setExcavationDepthCm] = useState("80");
  const [trenchOverwidthCm, setTrenchOverwidthCm] = useState("20");
  const [soilType, setSoilType] = useState("soil");
  const [frostDepthCm, setFrostDepthCm] = useState("0"); // 0 = unknown/auto
  const [groundwater, setGroundwater] = useState(false);

  // Options
  const [cleanConcrete, setCleanConcrete] = useState(true);
  const [cleanConcreteThickCm, setCleanConcreteThickCm] = useState("5");
  const [formwork, setFormwork] = useState(false);
  const [drainage, setDrainage] = useState(false);
  const [drainageGravel, setDrainageGravel] = useState(true);

  // Logistics
  const [evacuateSpoil, setEvacuateSpoil] = useState(true);
  const [reuseSpoil, setReuseSpoil] = useState(false);

  // Reinforcement
  const [steelRatio, setSteelRatio] = useState("85"); // kg/m3 default for strip

  // Pricing (local override possible)
  const [prices, setPrices] = useState<Record<PriceKeys, number>>({
    CONC_M3: getUnitPrice("BPE_M3") || 130,
    STEEL_KG: getUnitPrice("REBAR_KG") || 1.8,
    EXCAV_M3: getUnitPrice("EXCAVATION_M3") || 35,
    WASTE_M3: getUnitPrice("EVACUATION_M3") || 25,
    LEANCONC_M3: getUnitPrice("CLEAN_CONCRETE_M3") || 110,
    FORMWORK_M2: getUnitPrice("FORM_PANEL_M2") || 12,
    DRAIN_ML: (getUnitPrice("DRAIN_PIPE_50M") || 70) / 50 || 1.4,
    GRAVEL_M3: (getUnitPrice("GRAVEL_FOUNDATION_TON") || 45) * 1.5 || 67.5, // ton -> m3 approx
  });

  const updatePrice = (key: PriceKeys, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- HELPERS ---
  useEffect(() => {
    if (type === "strip") setSteelRatio("85");
    if (type === "pad") setSteelRatio("70");
    if (type === "grade_beam") setSteelRatio("100");
  }, [type]);

  // Keep step bounds safe if someone changes step programmatically
  useEffect(() => setStep((s) => clamp(s, 1, 6)), []);

  const addPad = () => {
    const d = toNum(excavationDepthCm, 80) || 80;
    setPads((prev) => [
      ...prev,
      { id: Date.now().toString(), count: 1, lengthCm: 60, widthCm: 60, heightCm: 40, depthCm: d },
    ]);
  };

  const updatePad = (id: string, field: keyof PadConfig, val: number) => {
    setPads((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)));
  };

  const removePad = (id: string) => setPads((prev) => prev.filter((p) => p.id !== id));

  const foundationTypeLabel = (t: FoundationType) =>
    t === "strip" ? "Filantes" : t === "pad" ? "Isolées" : "Longrines";

  // --- CALCULATE ---
  const results = useMemo(() => {
    const inputs: FoundationProjectInputs = {
      mode: proMode ? "pro" : "simple",
      type,
      totalLengthMl: Math.max(0, toNum(totalLengthMl, 0)),
      stripWidthCm: Math.max(0, toNum(stripWidthCm, 0)),
      stripHeightCm: Math.max(0, toNum(stripHeightCm, 0)),
      pads: (pads || []).map((p) => ({
        ...p,
        count: Math.max(0, Number(p.count) || 0),
        lengthCm: Math.max(0, Number(p.lengthCm) || 0),
        widthCm: Math.max(0, Number(p.widthCm) || 0),
        heightCm: Math.max(0, Number(p.heightCm) || 0),
        depthCm: Math.max(0, Number(p.depthCm) || 0),
      })),
      excavationDepthCm: Math.max(0, toNum(excavationDepthCm, 0)),
      trenchOverwidthCm: Math.max(0, toNum(trenchOverwidthCm, 0)),
      soilType,
      frostDepthCm: Math.max(0, toNum(frostDepthCm, 0)),
      groundwater,
      cleanConcrete,
      cleanConcreteThickCm: Math.max(0, toNum(cleanConcreteThickCm, 0)),
      formwork,
      drainage,
      drainageGravel,
      evacuateSpoil,
      reuseSpoil,
      steelRatio: Math.max(0, toNum(steelRatio, 0)),
    };

    // calculateFoundations is your engine. We just ensure prices are numeric + non-negative.
    const safePrices: Record<string, number> = Object.fromEntries(
      Object.entries(prices).map(([k, v]) => [k, Math.max(0, Number(v) || 0)])
    );

    return calculateFoundations(inputs, safePrices);
  }, [
    proMode,
    type,
    totalLengthMl,
    stripWidthCm,
    stripHeightCm,
    pads,
    excavationDepthCm,
    trenchOverwidthCm,
    soilType,
    frostDepthCm,
    groundwater,
    cleanConcrete,
    cleanConcreteThickCm,
    formwork,
    drainage,
    drainageGravel,
    evacuateSpoil,
    reuseSpoil,
    steelRatio,
    prices,
  ]);

  // Pass to parent
  useEffect(() => {
    const total = round2(results.materials.reduce((sum: number, m: any) => sum + (Number(m.totalPrice) || 0), 0));

    onCalculate({
      summary: `${(results.volumes?.concrete ?? 0).toFixed(1)} m³ de fondations`,
      details: [
        { label: "Type", value: foundationTypeLabel(type), unit: "" },
        { label: "Béton", value: (results.volumes?.concrete ?? 0).toFixed(1), unit: "m³" },
        { label: "Acier", value: (results.quantities?.steel ?? 0).toFixed(0), unit: "kg" },
        { label: "Terrassement", value: (results.volumes?.excavation ?? 0).toFixed(1), unit: "m³" },
      ],
      materials: results.materials || [],
      totalCost: total,
      warnings: results.warnings,
    });
  }, [results, type, onCalculate]);

  const soilObj = useMemo(
    () => SOIL_PROPERTIES.find((s) => s.id === soilType) || SOIL_PROPERTIES[0],
    [soilType]
  );

  // --- RENDER ---
  return (
    <div className="space-y-6 pb-20">
      {/* Navigation */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex flex-col items-center justify-center min-w-[60px] py-2 rounded-lg transition-all ${
              step === s
                ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200"
                : "text-slate-400 hover:bg-slate-50"
            }`}
          >
            <span className="text-xs font-bold mb-0.5">
              {s === 1 ? "Type" : s === 2 ? "Géo." : s === 3 ? "Sol" : s === 4 ? "Acier" : s === 5 ? "Ops." : "Prix"}
            </span>
            <div className={`h-1 w-8 rounded-full ${step === s ? "bg-blue-600" : "bg-transparent"}`} />
          </button>
        ))}
      </div>

      {/* STEP 1: TYPE */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 text-blue-800 text-sm rounded-xl flex items-start border border-blue-100">
            <Warehouse size={20} className="mr-3 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Module Fondations Ultra-Précis</p>
              <p className="opacity-80 mt-1">
                Calculez le béton, l’acier, le terrassement et l’évacuation en une seule fois.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => setType("strip")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                type === "strip" ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-200" : "border-slate-100 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-lg mr-3 ${type === "strip" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Combine size={24} />
                </div>
                <div>
                  <span className="block font-bold text-slate-800">Semelles filantes</span>
                  <span className="text-xs text-slate-500">Pour murs porteurs linéaires</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setType("pad")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                type === "pad" ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-200" : "border-slate-100 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center mb-2">
                <div className={`p-2 rounded-lg mr-3 ${type === "pad" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <BoxSelect size={24} />
                </div>
                <div>
                  <span className="block font-bold text-slate-800">Semelles isolées</span>
                  <span className="text-xs text-slate-500">Pour poteaux ponctuels</span>
                </div>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <Settings size={20} className={proMode ? "text-blue-600" : "text-slate-400"} />
              <span className="font-bold text-slate-700">Mode Expert</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={proMode} onChange={(e) => setProMode(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center shadow-lg shadow-blue-200 active:scale-[0.98] transition-transform"
          >
            Commencer <ArrowRight size={20} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: GEOMETRY */}
      {step === 2 && (
        <div className="space-y-4">
          <div className={sectionClass}>
            <h3 className="flex items-center font-bold text-slate-800 text-lg">
              <Ruler className="mr-2 text-blue-500" /> Dimensions
            </h3>

            {type === "strip" && (
              <>
                <div>
                  <label className={labelClass}>Longueur totale (ml)</label>
                  <input
                    type="number"
                    value={totalLengthMl}
                    onChange={(e) => setTotalLengthMl(e.target.value)}
                    className={inputClass}
                    placeholder="Ex: 45"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Largeur (cm)</label>
                    <input
                      type="number"
                      value={stripWidthCm}
                      onChange={(e) => setStripWidthCm(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hauteur (cm)</label>
                    <input
                      type="number"
                      value={stripHeightCm}
                      onChange={(e) => setStripHeightCm(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}

            {type === "pad" && (
              <div className="space-y-4">
                {pads.map((pad, idx) => (
                  <div key={pad.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-sm text-slate-700">Type {idx + 1}</span>
                      {pads.length > 1 && (
                        <button type="button" onClick={() => removePad(pad.id)} className="text-red-400 p-1">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className={labelClass}>Quantité</label>
                        <input
                          type="number"
                          value={pad.count}
                          onChange={(e) => updatePad(pad.id, "count", Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Prof. fouille (cm)</label>
                        <input
                          type="number"
                          value={pad.depthCm}
                          onChange={(e) => updatePad(pad.id, "depthCm", Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelClass}>L (cm)</label>
                        <input
                          type="number"
                          value={pad.lengthCm}
                          onChange={(e) => updatePad(pad.id, "lengthCm", Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>l (cm)</label>
                        <input
                          type="number"
                          value={pad.widthCm}
                          onChange={(e) => updatePad(pad.id, "widthCm", Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>H (cm)</label>
                        <input
                          type="number"
                          value={pad.heightCm}
                          onChange={(e) => updatePad(pad.id, "heightCm", Number(e.target.value))}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPad}
                  className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold flex justify-center items-center hover:bg-slate-50 hover:text-blue-500 hover:border-blue-300 transition-colors"
                >
                  <Plus size={18} className="mr-2" /> Ajouter un type de plot
                </button>
              </div>
            )}
          </div>

          <div className={sectionClass}>
            <h3 className="flex items-center font-bold text-slate-800 text-lg">
              <Shovel className="mr-2 text-amber-600" /> Fouilles
            </h3>

            {type !== "pad" && (
              <div>
                <label className={labelClass}>Profondeur fouille (cm)</label>
                <input
                  type="number"
                  value={excavationDepthCm}
                  onChange={(e) => setExcavationDepthCm(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label className={labelClass}>Marge travail / surlargeur (cm)</label>
              <input
                type="number"
                value={trenchOverwidthCm}
                onChange={(e) => setTrenchOverwidthCm(e.target.value)}
                className={inputClass}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Espace supplémentaire de chaque côté de la semelle.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500"
              aria-label="Retour"
            >
              <ArrowLeft />
            </button>
            <button type="button" onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SOIL */}
      {step === 3 && (
        <div className="space-y-4">
          <div className={sectionClass}>
            <h3 className="font-bold text-slate-800 text-lg mb-4">Nature du terrain</h3>
            <label className={labelClass}>Type de sol</label>
            <select value={soilType} onChange={(e) => setSoilType(e.target.value)} className={inputClass}>
              {SOIL_PROPERTIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} (Foisonnement x{s.bulkingFactor})
                </option>
              ))}
            </select>

            {soilObj?.id === "clay" && (
              <div className="flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded-lg mt-2 border border-amber-100">
                <AlertTriangle size={16} className="mr-2 shrink-0" />
                Sol argileux : risque de retrait-gonflement. Étude de sol G2 recommandée.
              </div>
            )}
          </div>

          <div className={sectionClass}>
            <h3 className="font-bold text-slate-800 text-lg mb-4">Contraintes</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Hors-gel (cm)</label>
                <input
                  type="number"
                  value={frostDepthCm}
                  onChange={(e) => setFrostDepthCm(e.target.value)}
                  className={inputClass}
                  placeholder="0 si inconnu"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groundwater}
                    onChange={(e) => setGroundwater(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded mr-3"
                  />
                  <span className="text-sm font-medium text-slate-700">Nappe phréatique</span>
                </label>
              </div>
            </div>

            {toNum(frostDepthCm, 0) > 0 &&
              type !== "pad" &&
              toNum(excavationDepthCm, 0) > 0 &&
              toNum(excavationDepthCm, 0) < toNum(frostDepthCm, 0) && (
                <div className="flex items-start text-xs text-red-700 bg-red-50 p-3 rounded-lg border border-red-100">
                  <AlertTriangle size={16} className="mr-2 shrink-0" />
                  Profondeur insuffisante pour le hors-gel ({frostDepthCm}cm requis).
                </div>
              )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500"
              aria-label="Retour"
            >
              <ArrowLeft />
            </button>
            <button type="button" onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: STEEL */}
      {step === 4 && (
        <div className="space-y-4">
          <div className={sectionClass}>
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center">
              <Combine className="mr-2 text-slate-500" /> Ferraillage
            </h3>

            <div>
              <div className="flex justify-between mb-1">
                <label className={labelClass}>Densité d’acier (kg/m³)</label>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 rounded">{steelRatio} kg/m³</span>
              </div>

              <input
                type="range"
                min="40"
                max="150"
                step="5"
                value={steelRatio}
                onChange={(e) => setSteelRatio(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />

              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Léger (40)</span>
                <span>Standard (85)</span>
                <span>Lourd (150)</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 mt-4">
              <p className="mb-1">
                <span className="font-bold">Estimation Pro :</span> le calcul se base sur un ratio moyen au m³ de béton.
              </p>
              <p>Pour des semelles filantes standard, visez entre 70 et 90 kg/m³.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500"
              aria-label="Retour"
            >
              <ArrowLeft />
            </button>
            <button type="button" onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: OPTIONS */}
      {step === 5 && (
        <div className="space-y-4">
          <div className={sectionClass}>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Technique</h3>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-slate-700 block">Béton de propreté</span>
                  <span className="text-xs text-slate-400">Sous les fondations (rec. 5cm)</span>
                </div>
                <input type="checkbox" checked={cleanConcrete} onChange={(e) => setCleanConcrete(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>

              {cleanConcrete && (
                <div className="grid grid-cols-2 gap-3 pl-1">
                  <div>
                    <label className={labelClass}>Épaisseur (cm)</label>
                    <input
                      type="number"
                      value={cleanConcreteThickCm}
                      onChange={(e) => setCleanConcreteThickCm(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-slate-700 block">Coffrage</span>
                  <span className="text-xs text-slate-400">Si terrain instable ou hors-sol</span>
                </div>
                <input type="checkbox" checked={formwork} onChange={(e) => setFormwork(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-slate-700 block">Drainage périphérique</span>
                  <span className="text-xs text-slate-400">Drain + gravier + géotextile</span>
                </div>
                <input type="checkbox" checked={drainage} onChange={(e) => setDrainage(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>

              {drainage && (
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <div>
                    <span className="font-bold text-sm text-slate-700 block">Gravier drainage</span>
                    <span className="text-xs text-slate-400">Lit drainant autour du drain</span>
                  </div>
                  <input type="checkbox" checked={drainageGravel} onChange={(e) => setDrainageGravel(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>
              )}
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className="font-bold text-slate-800 text-lg mb-2">Logistique</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-slate-700 block">Évacuation des terres</span>
                  <span className="text-xs text-slate-400">Mise en décharge (foisonné)</span>
                </div>
                <input type="checkbox" checked={evacuateSpoil} onChange={(e) => setEvacuateSpoil(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>

              <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                <div>
                  <span className="font-bold text-sm text-slate-700 block">Réutilisation sur site</span>
                  <span className="text-xs text-slate-400">Garder une partie pour remblai</span>
                </div>
                <input type="checkbox" checked={reuseSpoil} onChange={(e) => setReuseSpoil(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500"
              aria-label="Retour"
            >
              <ArrowLeft />
            </button>
            <button type="button" onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: PRICING */}
      {step === 6 && (
        <div className="space-y-4">
          <div className={sectionClass}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Prix unitaires</h3>
              <div className="text-xs text-slate-400 italic">Modifiables pour ce calcul</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Béton (€/m³)</label>
                <input type="number" value={prices.CONC_M3} onChange={(e) => updatePrice("CONC_M3", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Acier (€/kg)</label>
                <input type="number" value={prices.STEEL_KG} onChange={(e) => updatePrice("STEEL_KG", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fouilles (€/m³)</label>
                <input type="number" value={prices.EXCAV_M3} onChange={(e) => updatePrice("EXCAV_M3", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Évacuation (€/m³)</label>
                <input type="number" value={prices.WASTE_M3} onChange={(e) => updatePrice("WASTE_M3", e.target.value)} className={inputClass} />
              </div>

              {cleanConcrete && (
                <div>
                  <label className={labelClass}>Béton propreté (€/m³)</label>
                  <input
                    type="number"
                    value={prices.LEANCONC_M3}
                    onChange={(e) => updatePrice("LEANCONC_M3", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {formwork && (
                <div>
                  <label className={labelClass}>Coffrage (€/m²)</label>
                  <input
                    type="number"
                    value={prices.FORMWORK_M2}
                    onChange={(e) => updatePrice("FORMWORK_M2", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {drainage && (
                <>
                  <div>
                    <label className={labelClass}>Drain (€/ml)</label>
                    <input type="number" value={prices.DRAIN_ML} onChange={(e) => updatePrice("DRAIN_ML", e.target.value)} className={inputClass} />
                  </div>
                  {drainageGravel && (
                    <div>
                      <label className={labelClass}>Gravier drainage (€/m³)</label>
                      <input type="number" value={prices.GRAVEL_M3} onChange={(e) => updatePrice("GRAVEL_M3", e.target.value)} className={inputClass} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {results?.warnings?.length ? (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
              {results.warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-center">
                  <AlertTriangle size={12} className="mr-2" /> {w}
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500"
              aria-label="Retour"
            >
              <ArrowLeft />
            </button>
            <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={20} className="mr-2" /> Calculé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};