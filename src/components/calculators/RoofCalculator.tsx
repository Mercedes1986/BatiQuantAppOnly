import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  Home,
  Ruler,
  Layers,
  Droplets,
  Info,
  CircleDollarSign,
  Check,
  Settings,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

type RoofType = "1pan" | "2pans" | "4pans" | "flat";
type CoverMaterial = "tile_mech" | "tile_flat" | "slate" | "steel" | "zinc";
type GutterType = "pvc" | "zinc" | "alu" | "copper";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const priceOr = (key: string, fallback: number) => {
  const c = getUnitPrice(key);
  if (typeof c === "number" && Number.isFinite(c) && c !== 0) return c;
  const d = (DEFAULT_PRICES as any)?.[key];
  const nd = Number(d);
  if (d !== undefined && Number.isFinite(nd) && nd !== 0) return nd;
  return fallback;
};

export const RoofCalculator: React.FC<Props> = ({ onCalculate }) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Geometry & Type ---
  const [roofType, setRoofType] = useState<RoofType>("2pans");
  const [dimL, setDimL] = useState<string>(""); // m
  const [dimW, setDimW] = useState<string>(""); // m
  const [overhang, setOverhang] = useState<string>("30"); // cm
  const [slope, setSlope] = useState<string>("35"); // %

  // --- 2. Covering ---
  const [coverMaterial, setCoverMaterial] = useState<CoverMaterial>("tile_mech");
  const [wastePct, setWastePct] = useState(10);

  // --- 3. Underlayers ---
  const [useScreen, setUseScreen] = useState(true);
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState("200"); // mm
  const [useVapor, setUseVapor] = useState(false);

  // --- 4. Rainwater & Zinc ---
  const [gutterType, setGutterType] = useState<GutterType>("pvc");
  const [downspouts, setDownspouts] = useState<number>(4);
  const [valleyLen, setValleyLen] = useState<string>("0"); // m

  const coverLabel = (m: CoverMaterial) => t(`calc.roof.cover.${m}`, { defaultValue: m });
  const gutterLabel = (g: GutterType) => t(`calc.roof.gutter.${g}`, { defaultValue: g });
  const roofTypeLabel = (rt: RoofType) => t(`calc.roof.type.${rt}`, { defaultValue: rt });

  // --- 5. Pricing ---
  const [prices, setPrices] = useState(() => ({
    coverM2: 25,
    ridgeM: 15,
    vergeM: 12,
    hipM: 15,
    valleyM: 25,
    screenM2:
      (DEFAULT_PRICES as any)?.UNDERLAY_ROLL_75M2
        ? Number((DEFAULT_PRICES as any).UNDERLAY_ROLL_75M2) / 75
        : priceOr("UNDERLAY_M2", 1.4),
    insulM2: priceOr("INSULATION_M2", 15),
    vaporM2: priceOr("VAPOR_BARRIER_M2", 1.2),
    gutterM: 15,
    downspoutU: 40,
    laborM2: 45,
    counterBattenM: priceOr("COUNTER_BATTEN_M", 0.8),
  }));

  // --- Auto-update Defaults based on Cover Material (non-destructive) ---
  useEffect(() => {
    setPrices((p) => {
      if (coverMaterial === "tile_mech") return { ...p, coverM2: 25, ridgeM: 15, vergeM: 12, hipM: 15, valleyM: 25 };
      if (coverMaterial === "tile_flat") return { ...p, coverM2: 45, ridgeM: 18, vergeM: 15, hipM: 18, valleyM: 30 };
      if (coverMaterial === "slate") return { ...p, coverM2: 60, ridgeM: 20, vergeM: 15, hipM: 20, valleyM: 35 };
      if (coverMaterial === "steel") return { ...p, coverM2: 20, ridgeM: 12, vergeM: 10, hipM: 12, valleyM: 22 };
      return { ...p, coverM2: 120, ridgeM: 30, vergeM: 25, hipM: 30, valleyM: 45 }; // zinc
    });
  }, [coverMaterial]);

  // --- Auto-update Defaults based on Gutter Material ---
  useEffect(() => {
    setPrices((p) => {
      if (gutterType === "pvc") return { ...p, gutterM: 15, downspoutU: 40 };
      if (gutterType === "alu") return { ...p, gutterM: 22, downspoutU: 55 };
      if (gutterType === "zinc") return { ...p, gutterM: 28, downspoutU: 70 };
      return { ...p, gutterM: 45, downspoutU: 110 }; // copper
    });
  }, [gutterType]);

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    const L_g = toNum(dimL, 0);
    const W_g = toNum(dimW, 0);

    const warnings: string[] = [];

    if (L_g <= 0 || W_g <= 0) {
      return {
        ok: false,
        projectedArea: 0,
        realArea: 0,
        ridgeLen: 0,
        eavesLen: 0,
        vergeLen: 0,
        hipLen: 0,
        totalAreaWithWaste: 0,
        materials: [] as any[],
        totalCost: 0,
        warnings,
      };
    }

    // 1) geometry with overhang
    const oh_m = clamp(toNum(overhang, 30), 0, 200) / 100;
    const L = L_g + 2 * oh_m;
    const W = W_g + 2 * oh_m;

    const slopePct = clamp(toNum(slope, 0), 0, 200);
    const angleRad = Math.atan(slopePct / 100);
    const slopeFactor = roofType === "flat" ? 1 : 1 / Math.cos(angleRad);

    const projectedArea = L * W;

    let realArea = 0;
    let ridgeLen = 0;
    let eavesLen = 0;
    let vergeLen = 0;
    let hipLen = 0;

    if (roofType === "flat") {
      realArea = projectedArea;
      eavesLen = (L + W) * 2;
    } else if (roofType === "1pan") {
      realArea = projectedArea * slopeFactor;
      ridgeLen = L; // high side
      eavesLen = L; // low side
      const slopeLen = W * slopeFactor;
      vergeLen = slopeLen * 2;
    } else if (roofType === "2pans") {
      realArea = projectedArea * slopeFactor;
      ridgeLen = L;
      eavesLen = L * 2;
      const slopeLen = (W / 2) * slopeFactor;
      vergeLen = slopeLen * 4;
    } else {
      // 4 pans (approx)
      realArea = projectedArea * slopeFactor;
      eavesLen = (L + W) * 2;
      const slopeLen = (W / 2) * slopeFactor;
      ridgeLen = Math.max(0, L - W);
      hipLen = slopeLen * 1.5 * 4;
    }

    const totalAreaWithWaste = realArea * (1 + clamp(wastePct, 0, 40) / 100);

    const materials: any[] = [];
    let totalCost = 0;

    // Cover
    const costCover = totalAreaWithWaste * prices.coverM2;
    totalCost += costCover;
    materials.push({
      id: "cover",
      name: coverLabel(coverMaterial),
      quantity: Math.ceil(totalAreaWithWaste),
      quantityRaw: totalAreaWithWaste,
      unit: Unit.M2,
      unitPrice: round2(prices.coverM2),
      totalPrice: round2(costCover),
      category: CalculatorType.ROOF,
      details: t("calc.roof.mat.cover_details", {
        real: realArea.toFixed(1),
        waste: clamp(wastePct, 0, 40),
        defaultValue: `Real area: ${realArea.toFixed(1)} m² (+${clamp(wastePct, 0, 40)}%)`,
      }),
    });

    // Ridge
    if (ridgeLen > 0) {
      const costRidge = ridgeLen * prices.ridgeM;
      totalCost += costRidge;
      materials.push({
        id: "ridge",
        name: t("calc.roof.mat.ridge", { defaultValue: "Ridge" }),
        quantity: round2(ridgeLen),
        quantityRaw: ridgeLen,
        unit: Unit.METER,
        unitPrice: round2(prices.ridgeM),
        totalPrice: round2(costRidge),
        category: CalculatorType.ROOF,
      });
    }

    // Verges
    if (vergeLen > 0) {
      const costVerge = vergeLen * prices.vergeM;
      totalCost += costVerge;
      materials.push({
        id: "verge",
        name: t("calc.roof.mat.verge", { defaultValue: "Verges / edges" }),
        quantity: round2(vergeLen),
        quantityRaw: vergeLen,
        unit: Unit.METER,
        unitPrice: round2(prices.vergeM),
        totalPrice: round2(costVerge),
        category: CalculatorType.ROOF,
      });
    }

    // Hips
    if (hipLen > 0) {
      const costHip = hipLen * prices.hipM;
      totalCost += costHip;
      materials.push({
        id: "hip",
        name: t("calc.roof.mat.hip", { defaultValue: "Hips" }),
        quantity: round2(hipLen),
        quantityRaw: hipLen,
        unit: Unit.METER,
        unitPrice: round2(prices.hipM),
        totalPrice: round2(costHip),
        category: CalculatorType.ROOF,
      });
    }

    // Valleys
    const vLen = clamp(toNum(valleyLen, 0), 0, 10_000);
    if (vLen > 0) {
      const costValley = vLen * prices.valleyM;
      totalCost += costValley;
      materials.push({
        id: "valley",
        name: t("calc.roof.mat.valley", { defaultValue: "Valleys (zincwork)" }),
        quantity: round2(vLen),
        quantityRaw: vLen,
        unit: Unit.METER,
        unitPrice: round2(prices.valleyM),
        totalPrice: round2(costValley),
        category: CalculatorType.ROOF,
      });
    }

    // Underlay screen
    if (useScreen && roofType !== "flat") {
      const screenArea = realArea * 1.1;
      const costScreen = screenArea * prices.screenM2;
      totalCost += costScreen;
      materials.push({
        id: "screen",
        name: t("calc.roof.mat.screen", { defaultValue: "Underlay (HPV)" }),
        quantity: Math.ceil(screenArea),
        quantityRaw: screenArea,
        unit: Unit.M2,
        unitPrice: round2(prices.screenM2),
        totalPrice: round2(costScreen),
        category: CalculatorType.ROOF,
      });

      const cbLen = realArea * 1.5;
      const costCB = cbLen * prices.counterBattenM;
      totalCost += costCB;
      materials.push({
        id: "counter_batten",
        name: t("calc.roof.mat.counter_batten", { defaultValue: "Counter-battens" }),
        quantity: Math.ceil(cbLen),
        quantityRaw: cbLen,
        unit: Unit.METER,
        unitPrice: round2(prices.counterBattenM),
        totalPrice: round2(costCB),
        category: CalculatorType.ROOF,
      });
    }

    // Insulation + vapor
    if (useInsulation) {
      const insulArea = realArea * 1.05;
      const costInsul = insulArea * prices.insulM2;
      totalCost += costInsul;
      materials.push({
        id: "insulation",
        name: t("calc.roof.mat.insulation", {
          thick: insulThick,
          defaultValue: `Insulation (${insulThick}mm)`,
        }),
        quantity: Math.ceil(insulArea),
        quantityRaw: insulArea,
        unit: Unit.M2,
        unitPrice: round2(prices.insulM2),
        totalPrice: round2(costInsul),
        category: CalculatorType.ROOF,
      });

      if (useVapor) {
        const vaporArea = realArea * 1.05;
        const costVapor = vaporArea * prices.vaporM2;
        totalCost += costVapor;
        materials.push({
          id: "vapor",
          name: t("calc.roof.mat.vapor", { defaultValue: "Vapor barrier" }),
          quantity: Math.ceil(vaporArea),
          quantityRaw: vaporArea,
          unit: Unit.M2,
          unitPrice: round2(prices.vaporM2),
          totalPrice: round2(costVapor),
          category: CalculatorType.ROOF,
        });
      }
    }

    // Rainwater (gutters on eaves)
    if (eavesLen > 0) {
      const costGutter = eavesLen * prices.gutterM;
      totalCost += costGutter;
      materials.push({
        id: "gutter",
        name: t("calc.roof.mat.gutter", { defaultValue: "Gutters" }),
        quantity: Math.ceil(eavesLen),
        quantityRaw: eavesLen,
        unit: Unit.METER,
        unitPrice: round2(prices.gutterM),
        totalPrice: round2(costGutter),
        category: CalculatorType.ROOF,
        details: t("calc.roof.mat.gutter_details", {
          type: gutterLabel(gutterType),
          defaultValue: `Type: ${gutterLabel(gutterType)} • hooks included (approx.)`,
        }),
      });

      const ds = Math.max(0, Math.floor(downspouts));
      if (ds > 0) {
        const costDS = ds * prices.downspoutU;
        totalCost += costDS;
        materials.push({
          id: "downspouts",
          name: t("calc.roof.mat.downspouts", { defaultValue: "Downspouts" }),
          quantity: ds,
          unit: Unit.PIECE,
          unitPrice: round2(prices.downspoutU),
          totalPrice: round2(costDS),
          category: CalculatorType.ROOF,
        });
      }
    }

    // Labor
    if (proMode) {
      const costLabor = realArea * prices.laborM2;
      totalCost += costLabor;
      materials.push({
        id: "labor",
        name: t("calc.roof.mat.labor", { defaultValue: "Labor (roofing)" }),
        quantity: round2(realArea),
        quantityRaw: realArea,
        unit: Unit.M2,
        unitPrice: round2(prices.laborM2),
        totalPrice: round2(costLabor),
        category: CalculatorType.ROOF,
      });
    }

    // Warnings
    if (roofType !== "flat") {
      if (coverMaterial.startsWith("tile") && slopePct < 10) warnings.push(t("calc.roof.warn.low_slope_tiles", { defaultValue: "Low slope (<10%) for a tiled roof." }));
      if (coverMaterial === "zinc" && slopePct < 5) warnings.push(t("calc.roof.warn.low_slope_zinc", { defaultValue: "Standing seam zinc: very low slope, check manufacturer specs." }));
    } else {
      if (coverMaterial !== "steel" && coverMaterial !== "zinc") {
        warnings.push(t("calc.roof.warn.flat_roof_material", { defaultValue: "Flat roof: steel/zinc/EPDM are usually more suitable than tiles." }));
      }
    }

    return {
      ok: true,
      projectedArea,
      realArea,
      ridgeLen,
      eavesLen,
      vergeLen,
      hipLen,
      totalAreaWithWaste,
      materials,
      totalCost: round2(totalCost),
      warnings,
    };
  }, [
    t,
    roofType,
    dimL,
    dimW,
    overhang,
    slope,
    coverMaterial,
    wastePct,
    useScreen,
    useInsulation,
    insulThick,
    useVapor,
    gutterType,
    downspouts,
    valleyLen,
    prices,
    proMode,
    coverLabel,
    gutterLabel,
  ]);

  useEffect(() => {
    if (!calculationData.ok) {
      onCalculate({
        summary: t("calc.roof.title", { defaultValue: "Roof" }),
        details: [],
        materials: [],
        totalCost: 0,
        warnings: [t("calc.roof.warn.fill_dims", { defaultValue: "Fill in Length and Width to calculate the roof." })],
      });
      return;
    }

    onCalculate({
      summary: t("calc.roof.summary", {
        area: calculationData.realArea.toFixed(1),
        defaultValue: `${calculationData.realArea.toFixed(1)} m²`,
      }),
      details: [
        { label: t("calc.roof.detail.projected_area", { defaultValue: "Projected area" }), value: calculationData.projectedArea.toFixed(1), unit: "m²" },
        { label: t("calc.roof.detail.slope", { defaultValue: "Slope" }), value: slope, unit: "%" },
        { label: t("calc.roof.detail.real_area", { defaultValue: "Roof area" }), value: calculationData.realArea.toFixed(1), unit: "m²" },
        { label: t("calc.roof.detail.ridge", { defaultValue: "Ridge" }), value: calculationData.ridgeLen.toFixed(1), unit: "m" },
        { label: t("calc.roof.detail.eaves", { defaultValue: "Eaves" }), value: calculationData.eavesLen.toFixed(1), unit: "m" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, slope, t]);

  const stepTitle = (s: number) => t(`calc.roof.steps.${s}`, { defaultValue: String(s) });

  return (
    <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/72 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner overflow-x-auto backdrop-blur-xl">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-extrabold rounded-2xl transition-all ${
              step === s ? "bg-white text-slate-950 shadow-[0_14px_32px_rgba(59,130,246,0.18)]" : "text-slate-400"
            }`}
          >
            {stepTitle(s)}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.roof.ui.step1_hint", { defaultValue: "Define roof shape and footprint dimensions." })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("calc.roof.ui.roof_type", { defaultValue: "Roof type" })}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(["1pan", "2pans", "4pans", "flat"] as RoofType[]).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setRoofType(rt)}
                  className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                    roofType === rt ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500" : "bg-white text-slate-500"
                  }`}
                >
                  {rt === "flat" ? <Layers size={18} className="mb-1" /> : <Home size={18} className="mb-1" />}
                  {roofTypeLabel(rt)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.roof.ui.length_m", { defaultValue: "Length (m)" })}</label>
              <input
                type="number"
                value={dimL}
                onChange={(e) => setDimL(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                placeholder={t("calc.roof.ui.ph_length", { defaultValue: "e.g. 10" })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.roof.ui.width_m", { defaultValue: "Width (m)" })}</label>
              <input
                type="number"
                value={dimW}
                onChange={(e) => setDimW(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                placeholder={t("calc.roof.ui.ph_width", { defaultValue: "e.g. 8" })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.roof.ui.slope_pct", { defaultValue: "Slope (%)" })}</label>
              <input type="number" value={slope} onChange={(e) => setSlope(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.roof.ui.overhang_cm", { defaultValue: "Overhang (cm)" })}</label>
              <input type="number" value={overhang} onChange={(e) => setOverhang(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900" />
            </div>
          </div>

          <button type="button" onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center">
            {t("common.next", { defaultValue: "Next" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Ruler size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.roof.ui.step2_hint", { defaultValue: "Choose covering and waste." })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t("calc.roof.ui.cover_material", { defaultValue: "Covering material" })}</label>
            <select
              value={coverMaterial}
              onChange={(e) => setCoverMaterial(e.target.value as any)}
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
            >
              {(["tile_mech", "tile_flat", "slate", "steel", "zinc"] as CoverMaterial[]).map((m) => (
                <option key={m} value={m}>
                  {coverLabel(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.roof.ui.waste_pct", { defaultValue: "Waste (%)" })}</label>
              <input
                type="number"
                value={wastePct}
                onChange={(e) => setWastePct(clamp(toNum(e.target.value, 10), 0, 40))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex gap-3">
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
            {t("calc.roof.ui.step3_hint", { defaultValue: "Underlay, insulation and vapor barrier." })}
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <span className="text-sm font-bold text-slate-700">{t("calc.roof.ui.screen", { defaultValue: "Underlay screen (HPV)" })}</span>
              <input type="checkbox" checked={useScreen} onChange={(e) => setUseScreen(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <span className="text-sm font-bold text-slate-700">{t("calc.roof.ui.insulation", { defaultValue: "Rafter insulation" })}</span>
              <input type="checkbox" checked={useInsulation} onChange={(e) => setUseInsulation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            {useInsulation && (
              <div className="bg-white border rounded-lg p-3 space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{t("calc.roof.ui.insul_thick_mm", { defaultValue: "Insulation thickness (mm)" })}</label>
                  <input type="number" value={insulThick} onChange={(e) => setInsulThick(e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">{t("calc.roof.ui.vapor", { defaultValue: "Vapor barrier" })}</span>
                    <span className="text-[10px] text-slate-400">{t("calc.roof.ui.vapor_help", { defaultValue: "Included only if enabled" })}</span>
                  </div>
                  <input type="checkbox" checked={useVapor} onChange={(e) => setUseVapor(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>
              </div>
            )}
          </div>

          <div className="flex gap-3">
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
            <Droplets size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.roof.ui.step4_hint", { defaultValue: "Gutters, downspouts and valleys." })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t("calc.roof.ui.gutters", { defaultValue: "Gutters" })}</label>
            <select value={gutterType} onChange={(e) => setGutterType(e.target.value as any)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900">
              {(["pvc", "alu", "zinc", "copper"] as GutterType[]).map((g) => (
                <option key={g} value={g}>
                  {gutterLabel(g)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.roof.ui.downspouts", { defaultValue: "Downspouts" })}</label>
              <input
                type="number"
                value={downspouts}
                onChange={(e) => setDownspouts(clamp(toNum(e.target.value, 0), 0, 20))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.roof.ui.valleys_m", { defaultValue: "Valleys (m)" })}</label>
              <input type="number" value={valleyLen} onChange={(e) => setValleyLen(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900" />
            </div>
          </div>

          <div className="flex gap-3">
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
            {t("calc.roof.ui.step5_hint", { defaultValue: "Adjust unit prices." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.roof.ui.prices_title", { defaultValue: "Prices" })}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" />{" "}
                {proMode ? t("common.pro_mode", { defaultValue: "Pro mode" }) : t("common.simple_mode", { defaultValue: "Simple mode" })}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.roof.price.cover_m2", { defaultValue: "Covering (€/m²)" })}</label>
                <input type="number" value={prices.coverM2} onChange={(e) => updatePrice("coverM2", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.roof.price.gutter_m", { defaultValue: "Gutter (€/m)" })}</label>
                <input type="number" value={prices.gutterM} onChange={(e) => updatePrice("gutterM", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.roof.price.ridge_m", { defaultValue: "Ridge (€/m)" })}</label>
                <input type="number" value={prices.ridgeM} onChange={(e) => updatePrice("ridgeM", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.roof.price.valley_m", { defaultValue: "Valleys (€/m)" })}</label>
                <input type="number" value={prices.valleyM} onChange={(e) => updatePrice("valleyM", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
              </div>

              {useScreen && roofType !== "flat" && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.roof.price.screen_m2", { defaultValue: "Underlay (€/m²)" })}</label>
                  <input type="number" value={prices.screenM2} onChange={(e) => updatePrice("screenM2", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}

              {useInsulation && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{t("calc.roof.price.insul_m2", { defaultValue: "Insulation (€/m²)" })}</label>
                  <input type="number" value={prices.insulM2} onChange={(e) => updatePrice("insulM2", e.target.value)} className="w-full p-2 border rounded bg-white text-sm" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.roof.price.labor_m2", { defaultValue: "Labor (€/m²)" })}</label>
                  <input type="number" value={prices.laborM2} onChange={(e) => updatePrice("laborM2", e.target.value)} className="w-full p-2 border border-blue-200 rounded bg-white text-sm" />
                </div>
              </div>
            )}
          </div>

          {calculationData.ok && calculationData.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-xs text-amber-800">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              <div className="space-y-1">
                {calculationData.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
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