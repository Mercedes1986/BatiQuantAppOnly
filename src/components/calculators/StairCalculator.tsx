import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  TrendingUp,
  Layers,
  Hammer,
  Info,
  AlertTriangle,
  CircleDollarSign,
  Check,
  Settings,
  ArrowRight,
  Activity,
} from "lucide-react";

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

type StairType = "straight" | "quarter" | "half";
type CalcMode = "auto" | "fixed_N";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const priceOr = (catalogKey: string, defaultKey: string | null, fallback: number) => {
  const c = getUnitPrice(catalogKey);
  if (typeof c === "number" && Number.isFinite(c) && c !== 0) return c;

  if (defaultKey) {
    const d = (DEFAULT_PRICES as any)?.[defaultKey];
    const nd = Number(d);
    if (d !== undefined && Number.isFinite(nd) && nd !== 0) return nd;
  }

  return fallback;
};

export const StairCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1) Type & Dimensions ---
  const [stairType, setStairType] = useState<StairType>("straight");
  const [height, setHeight] = useState<string>("280"); // cm
  const [width, setWidth] = useState<string>("90"); // cm
  const [run, setRun] = useState<string>("350"); // cm (projection horizontale dispo)
  const [landingDepth, setLandingDepth] = useState<string>("0"); // cm (palier)

  // --- 2) Steps & comfort ---
  const [calcMode, setCalcMode] = useState<CalcMode>("auto");
  const [numSteps, setNumSteps] = useState<number>(15);

  // derived
  const H_cm = useMemo(() => Math.max(0, toNum(height, 0)), [height]);
  const W_cm = useMemo(() => Math.max(0, toNum(width, 0)), [width]);
  const run_cm = useMemo(() => Math.max(0, toNum(run, 0)), [run]);
  const landing_cm = useMemo(() => Math.max(0, toNum(landingDepth, 0)), [landingDepth]);

  // computed riser/tread from geometry + N
  const riser = useMemo(() => (numSteps > 0 ? H_cm / numSteps : 0), [H_cm, numSteps]);

  /**
   * Giron:
   * - Droit: g = reculement / (N-1)
   * - Tournant: on applique un coef réducteur (perte de reculement utile)
   */
  const tread = useMemo(() => {
    if (numSteps <= 1) return 30;
    const base = run_cm / (numSteps - 1);
    const coef = stairType === "straight" ? 1 : stairType === "quarter" ? 0.92 : 0.88;
    return base * coef;
  }, [numSteps, run_cm, stairType]);

  const blondel = useMemo(() => 2 * riser + tread, [riser, tread]);

  // --- 3) Concrete structure ---
  const [slabThickness, setSlabThickness] = useState<string>("15"); // cm paillasse
  const [wasteConcrete, setWasteConcrete] = useState(5);

  // --- 4) Formwork & steel ---
  const [wasteForm, setWasteForm] = useState(10);
  const [steelRatio, setSteelRatio] = useState<number>(100); // kg/m3
  const [useProps, setUseProps] = useState(true); // étaiement

  // --- 5) Finishes ---
  const [finishTiling, setFinishTiling] = useState(false);
  const [finishRailing, setFinishRailing] = useState(false);
  const [finishCoating, setFinishCoating] = useState(false); // enduit sous-face

  // --- Prices ---
  const [prices, setPrices] = useState(() => ({
    concrete: priceOr("BPE_M3", "BPE_M3", 130),
    steel: priceOr("REBAR_KG", "REBAR_KG", 1.8),
    formwork: priceOr("FORM_PANEL_M2", "FORM_PANEL_M2", 12),
    formworkLabor: priceOr("LABOR_FORMWORK_M2", null, 45),
    prop: priceOr("PROP_UNIT", "PROP_UNIT", 18),
    tiling: priceOr("TILING_M2", null, 60),
    railing: priceOr("RAILING_ML", null, 150),
    coating: priceOr("COATING_M2", null, 35),
    pump: priceOr("PUMP_FEE", "PUMP_FEE", 250),
  }));

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- Auto choose N in auto mode ---
  useEffect(() => {
    if (calcMode !== "auto" || H_cm <= 0) return;

    // target riser ≈ 17.5 cm, clamp 10..22 steps
    const ideal = Math.round(H_cm / 17.5);
    const clamped = Math.max(10, Math.min(22, ideal));
    setNumSteps(clamped);
  }, [calcMode, H_cm]);

  // If user edits N, switch to fixed mode
  const decSteps = () => {
    setCalcMode("fixed_N");
    setNumSteps((n) => Math.max(1, n - 1));
  };
  const incSteps = () => {
    setCalcMode("fixed_N");
    setNumSteps((n) => n + 1);
  };

  // --- Global calculation ---
  const computed = useMemo(() => {
    const warnings: string[] = [];

    if (H_cm <= 0 || W_cm <= 0 || run_cm <= 0 || numSteps <= 0) {
      return {
        ok: false,
        warnings: ["Renseigne la hauteur, la largeur et le reculement pour obtenir un calcul."],
        details: [] as any[],
        materials: [] as any[],
        totalCost: 0,
        summary: "Escalier",
      };
    }

    // Geometry
    const slopeLen_cm = Math.sqrt(run_cm * run_cm + H_cm * H_cm);
    const slopeAngleDeg = Math.atan2(H_cm, run_cm) * (180 / Math.PI);

    // Convert to meters
    const Wm = W_cm / 100;
    const slabM = Math.max(0.01, toNum(slabThickness, 0) / 100);
    const slopeM = slopeLen_cm / 100;
    const landingM = landing_cm / 100;
    const riserM = riser / 100;
    const treadM = tread / 100;

    // Effective length factor for turns (approx)
    const turnCoef = stairType === "straight" ? 1 : stairType === "quarter" ? 1.1 : 1.2;
    const Ld = slopeM * turnCoef;

    // Concrete volumes
    const volSlab = Ld * Wm * slabM;
    const volSteps = (treadM * riserM / 2) * Wm * numSteps;
    const volLanding = landingM * Wm * slabM;

    const volTotalRaw = volSlab + volSteps + volLanding;
    const volTotal = volTotalRaw * (1 + Math.max(0, wasteConcrete) / 100);

    // Formwork areas (approx)
    const formUnder = Ld * Wm + landingM * Wm;
    const areaSideProfile = Ld * (slabM + riserM / 2); // simplified
    const formSides = areaSideProfile * 2;
    const formRisers = numSteps * riserM * Wm;

    const formTotalRaw = formUnder + formSides + formRisers;
    const formTotal = formTotalRaw * (1 + Math.max(0, wasteForm) / 100);

    // Steel
    const steelKg = volTotal * Math.max(0, steelRatio);

    // Finishes
    const areaTiling =
      treadM * Wm * numSteps + // marches
      riserM * Wm * numSteps + // contremarches
      landingM * Wm;

    const lenRailing = slopeM + landingM;
    const areaCoating = formUnder + formSides;

    // Costing
    const materials: any[] = [];
    let totalCost = 0;

    const costConc = volTotal * prices.concrete;
    totalCost += costConc;
    materials.push({
      id: "concrete",
      name: "Béton (paillasse + marches)",
      quantity: round2(volTotal),
      quantityRaw: volTotal,
      unit: Unit.M3,
      unitPrice: round2(prices.concrete),
      totalPrice: round2(costConc),
      category: CalculatorType.STAIRS,
      details: `Type: ${stairType === "straight" ? "droit" : stairType === "quarter" ? "1/4 tournant" : "1/2 tournant"}`,
    });

    const costSteel = steelKg * prices.steel;
    totalCost += costSteel;
    materials.push({
      id: "steel",
      name: `Armatures (${steelRatio} kg/m³)`,
      quantity: Math.ceil(steelKg),
      quantityRaw: steelKg,
      unit: Unit.KG,
      unitPrice: round2(prices.steel),
      totalPrice: round2(costSteel),
      category: CalculatorType.STAIRS,
    });

    const costFormMat = formTotal * prices.formwork;
    totalCost += costFormMat;
    materials.push({
      id: "formwork_mat",
      name: "Bois de coffrage (panneaux)",
      quantity: round2(formTotal),
      quantityRaw: formTotal,
      unit: Unit.M2,
      unitPrice: round2(prices.formwork),
      totalPrice: round2(costFormMat),
      category: CalculatorType.STAIRS,
    });

    if (proMode) {
      const costFormLab = formTotal * prices.formworkLabor;
      totalCost += costFormLab;
      materials.push({
        id: "formwork_lab",
        name: "Main d'œuvre coffrage",
        quantity: round2(formTotal),
        quantityRaw: formTotal,
        unit: Unit.M2,
        unitPrice: round2(prices.formworkLabor),
        totalPrice: round2(costFormLab),
        category: CalculatorType.STAIRS,
      });
    }

    if (useProps) {
      const props = Math.max(2, Math.ceil(formUnder / 1.5)); // rough
      const costProps = props * prices.prop;
      totalCost += costProps;
      materials.push({
        id: "props",
        name: "Étais / étaiement",
        quantity: props,
        quantityRaw: props,
        unit: Unit.PIECE,
        unitPrice: round2(prices.prop),
        totalPrice: round2(costProps),
        category: CalculatorType.STAIRS,
      });
    }

    // Pump: only if volume significant
    if (volTotal >= 2 && prices.pump > 0) {
      totalCost += prices.pump;
      materials.push({
        id: "pump",
        name: "Forfait pompe (si accès difficile / volume)",
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: round2(prices.pump),
        totalPrice: round2(prices.pump),
        category: CalculatorType.STAIRS,
      });
    }

    if (finishTiling) {
      const costT = areaTiling * prices.tiling;
      totalCost += costT;
      materials.push({
        id: "tiling",
        name: "Carrelage / revêtement",
        quantity: round2(areaTiling),
        quantityRaw: areaTiling,
        unit: Unit.M2,
        unitPrice: round2(prices.tiling),
        totalPrice: round2(costT),
        category: CalculatorType.STAIRS,
      });
    }

    if (finishRailing) {
      const costR = lenRailing * prices.railing;
      totalCost += costR;
      materials.push({
        id: "railing",
        name: "Garde-corps",
        quantity: round2(lenRailing),
        quantityRaw: lenRailing,
        unit: Unit.METER,
        unitPrice: round2(prices.railing),
        totalPrice: round2(costR),
        category: CalculatorType.STAIRS,
      });
    }

    if (finishCoating) {
      const costC = areaCoating * prices.coating;
      totalCost += costC;
      materials.push({
        id: "coating",
        name: "Enduit sous-face (finitions béton)",
        quantity: round2(areaCoating),
        quantityRaw: areaCoating,
        unit: Unit.M2,
        unitPrice: round2(prices.coating),
        totalPrice: round2(costC),
        category: CalculatorType.STAIRS,
      });
    }

    // Comfort warnings
    if (blondel < 60 || blondel > 64) warnings.push(`Blondel ${blondel.toFixed(1)} cm : confort moyen (idéal 60–64).`);
    if (riser > 19) warnings.push(`Marches hautes (${riser.toFixed(1)} cm) : escalier raide.`);
    if (riser < 15) warnings.push(`Marches basses (${riser.toFixed(1)} cm) : escalier long.`);
    if (tread < 22) warnings.push(`Giron court (${tread.toFixed(1)} cm) : appui réduit.`);
    if (slopeAngleDeg > 40) warnings.push(`Pente forte (${slopeAngleDeg.toFixed(0)}°).`);

    return {
      ok: true,
      summary: `${numSteps} marches • h=${riser.toFixed(1)}cm • g=${tread.toFixed(1)}cm`,
      details: [
        { label: "Hauteur totale", value: H_cm.toFixed(0), unit: "cm" },
        { label: "Reculement", value: run_cm.toFixed(0), unit: "cm" },
        { label: "Largeur", value: W_cm.toFixed(0), unit: "cm" },
        { label: "Giron", value: tread.toFixed(1), unit: "cm" },
        { label: "Blondel", value: blondel.toFixed(1), unit: "cm" },
        { label: "Volume béton", value: volTotal.toFixed(2), unit: "m³" },
        { label: "Surf. coffrage", value: formTotal.toFixed(1), unit: "m²" },
      ],
      materials,
      totalCost: round2(totalCost),
      warnings,
    };
  }, [
    H_cm,
    W_cm,
    run_cm,
    landing_cm,
    numSteps,
    riser,
    tread,
    blondel,
    stairType,
    slabThickness,
    wasteConcrete,
    wasteForm,
    steelRatio,
    useProps,
    finishTiling,
    finishRailing,
    finishCoating,
    prices,
    proMode,
  ]);

  // Push results
  useEffect(() => {
    onCalculate({
      summary: computed.summary,
      details: computed.details,
      materials: computed.materials,
      totalCost: computed.totalCost,
      warnings: computed.warnings?.length ? computed.warnings : undefined,
    });
  }, [computed, onCalculate]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Step Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Type"}
            {s === 2 && "2. Confort"}
            {s === 3 && "3. Béton"}
            {s === 4 && "4. Finitions"}
            {s === 5 && "5. Devis"}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez la forme et l’encombrement.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Forme</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStairType("straight")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  stairType === "straight" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <TrendingUp size={20} className="mb-1" /> Droit
              </button>
              <button
                type="button"
                onClick={() => setStairType("quarter")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  stairType === "quarter" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <TrendingUp size={20} className="mb-1 rotate-45" /> 1/4 tournant
              </button>
              <button
                type="button"
                onClick={() => setStairType("half")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  stairType === "half" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <TrendingUp size={20} className="mb-1 -rotate-90" /> 1/2 tournant
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur à monter (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Sol fini bas → sol fini haut</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Reculement (cm)</label>
              <input
                type="number"
                value={run}
                onChange={(e) => setRun(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Projection horizontale disponible</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (cm)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Palier (cm)</label>
              <input
                type="number"
                value={landingDepth}
                onChange={(e) => setLandingDepth(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Activity size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustez le nombre de marches. Blondel idéal : 60–64 cm.
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="text-sm text-slate-500 mb-1">Hauteur de marche</div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{riser.toFixed(1)} cm</div>

            <div className="flex justify-center items-center space-x-4 mt-4">
              <button
                type="button"
                onClick={decSteps}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200"
              >
                -
              </button>
              <div className="text-center">
                <span className="block text-xl font-bold text-blue-600">{numSteps}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Marches</span>
              </div>
              <button
                type="button"
                onClick={incSteps}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200"
              >
                +
              </button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCalcMode("auto")}
                className={`px-3 py-1 text-xs rounded border ${
                  calcMode === "auto" ? "bg-blue-50 border-blue-300 text-blue-700 font-bold" : "bg-white text-slate-500"
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => setCalcMode("fixed_N")}
                className={`px-3 py-1 text-xs rounded border ${
                  calcMode === "fixed_N" ? "bg-blue-50 border-blue-300 text-blue-700 font-bold" : "bg-white text-slate-500"
                }`}
              >
                Fixe
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="block text-xs text-slate-500 mb-1">Giron</span>
              <span className={`block text-lg font-bold ${tread < 22 ? "text-red-500" : "text-slate-800"}`}>
                {tread.toFixed(1)} cm
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="block text-xs text-slate-500 mb-1">Blondel (2h+g)</span>
              <span className={`block text-lg font-bold ${blondel < 60 || blondel > 64 ? "text-amber-500" : "text-emerald-600"}`}>
                {blondel.toFixed(1)} cm
              </span>
            </div>
          </div>

          {computed.warnings?.length ? (
            <div className="flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              <div className="space-y-1">
                {computed.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
              <Check size={14} className="mr-2 shrink-0" />
              <span>Confort optimal respecté.</span>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            Paramètres structure béton armé.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Épaisseur paillasse (cm)</label>
              <input
                type="number"
                value={slabThickness}
                onChange={(e) => setSlabThickness(e.target.value)}
                className="w-full p-2 border rounded bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Pertes béton (%)</label>
              <input
                type="number"
                value={wasteConcrete}
                onChange={(e) => setWasteConcrete(clamp(toNum(e.target.value, 0), 0, 30))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Ferraillage</h4>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Ratio (kg/m³)</label>
                <input
                  type="number"
                  value={steelRatio}
                  onChange={(e) => setSteelRatio(clamp(toNum(e.target.value, 100), 0, 300))}
                  className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                />
              </div>
              <div className="text-xs text-slate-500 italic">Standard : ~80–120 kg/m³.</div>
            </div>

            <label className="flex items-center justify-between mt-3 p-2 bg-white border rounded cursor-pointer">
              <span className="text-sm font-medium text-slate-700">Étaiement (étais)</span>
              <input
                type="checkbox"
                checked={useProps}
                onChange={(e) => setUseProps(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-500 mb-1">Pertes coffrage (%)</label>
              <input
                type="number"
                value={wasteForm}
                onChange={(e) => setWasteForm(clamp(toNum(e.target.value, 10), 0, 40))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Hammer size={16} className="mr-2 shrink-0 mt-0.5" />
            Options de finitions.
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <span className="text-sm font-bold text-slate-700">Carrelage / revêtement</span>
              <input
                type="checkbox"
                checked={finishTiling}
                onChange={(e) => setFinishTiling(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <span className="text-sm font-bold text-slate-700">Garde-corps</span>
              <input
                type="checkbox"
                checked={finishRailing}
                onChange={(e) => setFinishRailing(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <span className="text-sm font-bold text-slate-700">Enduit sous-face</span>
              <input
                type="checkbox"
                checked={finishCoating}
                onChange={(e) => setFinishCoating(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button type="button" onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustez les prix unitaires.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Tarifs</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? "Mode Pro" : "Mode Simple"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Béton (€/m³)</label>
                <input type="number" value={prices.concrete} onChange={(e) => updatePrice("concrete", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Acier (€/kg)</label>
                <input type="number" value={prices.steel} onChange={(e) => updatePrice("steel", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Coffrage (€/m²)</label>
                <input type="number" value={prices.formwork} onChange={(e) => updatePrice("formwork", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              {proMode && (
                <div>
                  <label className="block text-[10px] uppercase text-blue-600 font-bold mb-1">MO coffrage (€/m²)</label>
                  <input type="number" value={prices.formworkLabor} onChange={(e) => updatePrice("formworkLabor", e.target.value)} className="w-full p-2 border border-blue-200 rounded bg-white text-sm" />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Étais (€/u)</label>
                <input type="number" value={prices.prop} onChange={(e) => updatePrice("prop", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Pompe (forfait)</label>
                <input type="number" value={prices.pump} onChange={(e) => updatePrice("pump", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              {finishTiling && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Revêtement (€/m²)</label>
                  <input type="number" value={prices.tiling} onChange={(e) => updatePrice("tiling", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}

              {finishRailing && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Garde-corps (€/ml)</label>
                  <input type="number" value={prices.railing} onChange={(e) => updatePrice("railing", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}

              {finishCoating && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Enduit (€/m²)</label>
                  <input type="number" value={prices.coating} onChange={(e) => updatePrice("coating", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button type="button" className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> Terminé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};