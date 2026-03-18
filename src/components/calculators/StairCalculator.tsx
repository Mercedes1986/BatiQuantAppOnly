import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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
   * Tread (giron):
   * - Straight: g = run / (N-1)
   * - Turning: apply reducing coefficient (loss of usable run)
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

  const stairTypeLabel = (tp: StairType) => t(`calc.stairs.shape.${tp}`, { defaultValue: tp });
  const calcModeLabel = (m: CalcMode) => t(`calc.stairs.calc_mode.${m}`, { defaultValue: m });

  const stepLabel = (s: number) => {
    if (s === 1) return t("calc.stairs.steps.1", { defaultValue: "1" });
    if (s === 2) return t("calc.stairs.steps.2", { defaultValue: "2" });
    if (s === 3) return t("calc.stairs.steps.3", { defaultValue: "3" });
    if (s === 4) return t("calc.stairs.steps.4", { defaultValue: "4" });
    return t("calc.stairs.steps.5", { defaultValue: "5" });
  };

  // --- Global calculation ---
  const computed = useMemo(() => {
    const warnings: string[] = [];

    if (H_cm <= 0 || W_cm <= 0 || run_cm <= 0 || numSteps <= 0) {
      return {
        ok: false,
        warnings: [t("calc.stairs.warn_missing_dims", { defaultValue: "Please fill height, width and run to get a result." })],
        details: [] as any[],
        materials: [] as any[],
        totalCost: 0,
        summary: t("calc.stairs.summary_fallback", { defaultValue: "Staircase" }),
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
    const areaTiling = treadM * Wm * numSteps + riserM * Wm * numSteps + landingM * Wm;
    const lenRailing = slopeM + landingM;
    const areaCoating = formUnder + formSides;

    // Costing
    const materials: any[] = [];
    let totalCost = 0;

    const costConc = volTotal * prices.concrete;
    totalCost += costConc;
    materials.push({
      id: "concrete",
      name: t("calc.stairs.mat.concrete", { defaultValue: "Concrete (slab + steps)" }),
      quantity: round2(volTotal),
      quantityRaw: volTotal,
      unit: Unit.M3,
      unitPrice: round2(prices.concrete),
      totalPrice: round2(costConc),
      category: CalculatorType.STAIRS,
      details: t("calc.stairs.mat.concrete_details", {
        type: stairTypeLabel(stairType),
        defaultValue: `Type: ${stairType}`,
      }),
    });

    const costSteel = steelKg * prices.steel;
    totalCost += costSteel;
    materials.push({
      id: "steel",
      name: t("calc.stairs.mat.steel", { ratio: steelRatio, defaultValue: `Rebar (${steelRatio} kg/m³)` }),
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
      name: t("calc.stairs.mat.formwork_panels", { defaultValue: "Formwork panels" }),
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
        name: t("calc.stairs.mat.formwork_labor", { defaultValue: "Formwork labor" }),
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
        name: t("calc.stairs.mat.props", { defaultValue: "Props / shoring" }),
        quantity: props,
        quantityRaw: props,
        unit: Unit.PIECE,
        unitPrice: round2(prices.prop),
        totalPrice: round2(costProps),
        category: CalculatorType.STAIRS,
      });
    }

    if (volTotal >= 2 && prices.pump > 0) {
      totalCost += prices.pump;
      materials.push({
        id: "pump",
        name: t("calc.stairs.mat.pump", { defaultValue: "Pump flat fee" }),
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
        name: t("calc.stairs.mat.tiling", { defaultValue: "Tiling / flooring" }),
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
        name: t("calc.stairs.mat.railing", { defaultValue: "Railing / guardrail" }),
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
        name: t("calc.stairs.mat.coating", { defaultValue: "Underside coating / finish" }),
        quantity: round2(areaCoating),
        quantityRaw: areaCoating,
        unit: Unit.M2,
        unitPrice: round2(prices.coating),
        totalPrice: round2(costC),
        category: CalculatorType.STAIRS,
      });
    }

    // Comfort warnings
    if (blondel < 60 || blondel > 64) warnings.push(t("calc.stairs.warn_blondel", { v: blondel.toFixed(1), defaultValue: `Blondel ${blondel.toFixed(1)} cm: comfort not ideal (60–64).` }));
    if (riser > 19) warnings.push(t("calc.stairs.warn_riser_high", { v: riser.toFixed(1), defaultValue: `High riser (${riser.toFixed(1)} cm): steep stairs.` }));
    if (riser < 15) warnings.push(t("calc.stairs.warn_riser_low", { v: riser.toFixed(1), defaultValue: `Low riser (${riser.toFixed(1)} cm): long stairs.` }));
    if (tread < 22) warnings.push(t("calc.stairs.warn_tread_short", { v: tread.toFixed(1), defaultValue: `Short tread (${tread.toFixed(1)} cm): reduced footing.` }));
    if (slopeAngleDeg > 40) warnings.push(t("calc.stairs.warn_slope", { v: slopeAngleDeg.toFixed(0), defaultValue: `Steep angle (${slopeAngleDeg.toFixed(0)}°).` }));

    return {
      ok: true,
      summary: t("calc.stairs.summary", {
        n: numSteps,
        h: riser.toFixed(1),
        g: tread.toFixed(1),
        defaultValue: `${numSteps} steps • h=${riser.toFixed(1)}cm • g=${tread.toFixed(1)}cm`,
      }),
      details: [
        { label: t("calc.stairs.detail.total_height", { defaultValue: "Total height" }), value: H_cm.toFixed(0), unit: "cm" },
        { label: t("calc.stairs.detail.run", { defaultValue: "Run" }), value: run_cm.toFixed(0), unit: "cm" },
        { label: t("calc.stairs.detail.width", { defaultValue: "Width" }), value: W_cm.toFixed(0), unit: "cm" },
        { label: t("calc.stairs.detail.tread", { defaultValue: "Tread" }), value: tread.toFixed(1), unit: "cm" },
        { label: t("calc.stairs.detail.blondel", { defaultValue: "Blondel" }), value: blondel.toFixed(1), unit: "cm" },
        { label: t("calc.stairs.detail.concrete_vol", { defaultValue: "Concrete volume" }), value: volTotal.toFixed(2), unit: "m³" },
        { label: t("calc.stairs.detail.formwork_area", { defaultValue: "Formwork area" }), value: formTotal.toFixed(1), unit: "m²" },
      ],
      materials,
      totalCost: round2(totalCost),
      warnings,
    };
  }, [
    t,
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
    <div className="space-y-5 rounded-[28px] border border-white/70 bg-white/74 p-3.5 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-5">
      {/* Step Navigation */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner backdrop-blur-xl no-scrollbar">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-extrabold rounded-2xl transition-all ${
              step === s ? "bg-white text-slate-950 shadow-[0_14px_32px_rgba(59,130,246,0.18)]" : "text-slate-400"
            }`}
          >
            {stepLabel(s)}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.stairs.ui.step1_hint", { defaultValue: "Define the shape and overall dimensions." })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("calc.stairs.ui.shape", { defaultValue: "Shape" })}
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setStairType("straight")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  stairType === "straight" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <TrendingUp size={20} className="mb-1" /> {stairTypeLabel("straight")}
              </button>
              <button
                type="button"
                onClick={() => setStairType("quarter")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  stairType === "quarter" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <TrendingUp size={20} className="mb-1 rotate-45" /> {stairTypeLabel("quarter")}
              </button>
              <button
                type="button"
                onClick={() => setStairType("half")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  stairType === "half" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <TrendingUp size={20} className="mb-1 -rotate-90" /> {stairTypeLabel("half")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.stairs.ui.height_cm", { defaultValue: "Height to climb (cm)" })}
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {t("calc.stairs.ui.height_help", { defaultValue: "Finished floor (down) → finished floor (up)" })}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.stairs.ui.run_cm", { defaultValue: "Run (cm)" })}
              </label>
              <input
                type="number"
                value={run}
                onChange={(e) => setRun(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {t("calc.stairs.ui.run_help", { defaultValue: "Available horizontal projection" })}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.stairs.ui.width_cm", { defaultValue: "Width (cm)" })}
              </label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.stairs.ui.landing_cm", { defaultValue: "Landing (cm)" })}
              </label>
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
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center"
          >
            {t("common.next", { defaultValue: "Next" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Activity size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.stairs.ui.step2_hint", { defaultValue: "Adjust the number of steps. Ideal Blondel: 60–64 cm." })}
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/88 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl text-center">
            <div className="text-sm text-slate-500 mb-1">
              {t("calc.stairs.ui.riser_label", { defaultValue: "Riser height" })}
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{riser.toFixed(1)} cm</div>

            <div className="flex justify-center items-center space-x-4 mt-4">
              <button
                type="button"
                onClick={decSteps}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200"
                aria-label={t("calc.stairs.ui.decrease", { defaultValue: "Decrease" })}
              >
                -
              </button>
              <div className="text-center">
                <span className="block text-xl font-bold text-blue-600">{numSteps}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold">
                  {t("calc.stairs.ui.steps_count", { defaultValue: "Steps" })}
                </span>
              </div>
              <button
                type="button"
                onClick={incSteps}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200"
                aria-label={t("calc.stairs.ui.increase", { defaultValue: "Increase" })}
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
                {calcModeLabel("auto")}
              </button>
              <button
                type="button"
                onClick={() => setCalcMode("fixed_N")}
                className={`px-3 py-1 text-xs rounded border ${
                  calcMode === "fixed_N" ? "bg-blue-50 border-blue-300 text-blue-700 font-bold" : "bg-white text-slate-500"
                }`}
              >
                {calcModeLabel("fixed_N")}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="block text-xs text-slate-500 mb-1">{t("calc.stairs.ui.tread", { defaultValue: "Tread" })}</span>
              <span className={`block text-lg font-bold ${tread < 22 ? "text-red-500" : "text-slate-800"}`}>
                {tread.toFixed(1)} cm
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="block text-xs text-slate-500 mb-1">{t("calc.stairs.ui.blondel", { defaultValue: "Blondel (2r+t)" })}</span>
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
              <span>{t("calc.stairs.ui.comfort_ok", { defaultValue: "Comfort range is respected." })}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.stairs.ui.step3_hint", { defaultValue: "Concrete structure parameters." })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.stairs.ui.slab_thickness_cm", { defaultValue: "Slab thickness (cm)" })}
              </label>
              <input
                type="number"
                value={slabThickness}
                onChange={(e) => setSlabThickness(e.target.value)}
                className="w-full p-2 border rounded bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.stairs.ui.waste_concrete_pct", { defaultValue: "Concrete waste (%)" })}
              </label>
              <input
                type="number"
                value={wasteConcrete}
                onChange={(e) => setWasteConcrete(clamp(toNum(e.target.value, 0), 0, 30))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
              {t("calc.stairs.ui.rebar_title", { defaultValue: "Rebar" })}
            </h4>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("calc.stairs.ui.steel_ratio", { defaultValue: "Ratio (kg/m³)" })}
                </label>
                <input
                  type="number"
                  value={steelRatio}
                  onChange={(e) => setSteelRatio(clamp(toNum(e.target.value, 100), 0, 300))}
                  className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                />
              </div>
              <div className="text-xs text-slate-500 italic">
                {t("calc.stairs.ui.steel_ratio_hint", { defaultValue: "Typical: ~80–120 kg/m³." })}
              </div>
            </div>

            <label className="flex items-center justify-between mt-3 p-2 bg-white border rounded cursor-pointer">
              <span className="text-sm font-medium text-slate-700">
                {t("calc.stairs.ui.use_props", { defaultValue: "Shoring (props)" })}
              </span>
              <input
                type="checkbox"
                checked={useProps}
                onChange={(e) => setUseProps(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.stairs.ui.waste_form_pct", { defaultValue: "Formwork waste (%)" })}
              </label>
              <input
                type="number"
                value={wasteForm}
                onChange={(e) => setWasteForm(clamp(toNum(e.target.value, 10), 0, 40))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Hammer size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.stairs.ui.step4_hint", { defaultValue: "Finishing options." })}
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <span className="text-sm font-bold text-slate-700">
                {t("calc.stairs.ui.finish_tiling", { defaultValue: "Tiling / flooring" })}
              </span>
              <input type="checkbox" checked={finishTiling} onChange={(e) => setFinishTiling(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <span className="text-sm font-bold text-slate-700">
                {t("calc.stairs.ui.finish_railing", { defaultValue: "Railing / guardrail" })}
              </span>
              <input type="checkbox" checked={finishRailing} onChange={(e) => setFinishRailing(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <span className="text-sm font-bold text-slate-700">
                {t("calc.stairs.ui.finish_coating", { defaultValue: "Underside coating" })}
              </span>
              <input type="checkbox" checked={finishCoating} onChange={(e) => setFinishCoating(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button type="button" onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.stairs.ui.step5_hint", { defaultValue: "Adjust unit prices." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.stairs.ui.prices_title", { defaultValue: "Prices" })}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? t("common.pro_mode", { defaultValue: "Pro mode" }) : t("common.simple_mode", { defaultValue: "Simple mode" })}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.concrete", { defaultValue: "Concrete (€/m³)" })}</label>
                <input type="number" value={prices.concrete} onChange={(e) => updatePrice("concrete", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.steel", { defaultValue: "Steel (€/kg)" })}</label>
                <input type="number" value={prices.steel} onChange={(e) => updatePrice("steel", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.formwork", { defaultValue: "Formwork (€/m²)" })}</label>
                <input type="number" value={prices.formwork} onChange={(e) => updatePrice("formwork", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              {proMode && (
                <div>
                  <label className="block text-[10px] uppercase text-blue-600 font-bold mb-1">{t("calc.stairs.price.formwork_labor", { defaultValue: "Formwork labor (€/m²)" })}</label>
                  <input type="number" value={prices.formworkLabor} onChange={(e) => updatePrice("formworkLabor", e.target.value)} className="w-full p-2 border border-blue-200 rounded bg-white text-sm" />
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.props", { defaultValue: "Props (€/unit)" })}</label>
                <input type="number" value={prices.prop} onChange={(e) => updatePrice("prop", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.pump", { defaultValue: "Pump (flat fee)" })}</label>
                <input type="number" value={prices.pump} onChange={(e) => updatePrice("pump", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              {finishTiling && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.tiling", { defaultValue: "Flooring (€/m²)" })}</label>
                  <input type="number" value={prices.tiling} onChange={(e) => updatePrice("tiling", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}

              {finishRailing && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.railing", { defaultValue: "Railing (€/m)" })}</label>
                  <input type="number" value={prices.railing} onChange={(e) => updatePrice("railing", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}

              {finishCoating && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.stairs.price.coating", { defaultValue: "Coating (€/m²)" })}</label>
                  <input type="number" value={prices.coating} onChange={(e) => updatePrice("coating", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button type="button" className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold shadow-sm flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("common.done", { defaultValue: "Done" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};