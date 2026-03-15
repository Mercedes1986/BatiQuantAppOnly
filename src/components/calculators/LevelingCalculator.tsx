import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES, LEVELING_PRODUCTS, LEVELING_SUBSTRATES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  Layers,
  Plus,
  Trash2,
  Settings,
  Check,
  ArrowRight,
  AlertTriangle,
  ScanLine,
  Construction,
  Clock,
  CircleDollarSign,
} from "lucide-react";

type ThicknessMode = "avg" | "minmax";

interface LevelingZone {
  id: string;
  label: string;
  area: number;
  substrate: string;
  thicknessMode: ThicknessMode;
  thicknessVal: number; // mm avg
  thicknessMin?: number;
  thicknessMax?: number;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const LevelingCalculator: React.FC<Props> = ({ onCalculate }) => {
  const { t } = useTranslation();

  // --- i18n (dynamic labels; avoids constants being stuck in EN after language switch) ---
  const substrateLabel = (id: string) => {
    const def = (LEVELING_SUBSTRATES as any[]).find((x: any) => x.id === id);
    return t(`leveling.substrates.${id}`, { defaultValue: String(def?.label ?? id) });
  };

  const substrateWarning = (id: string) => {
    const def = (LEVELING_SUBSTRATES as any[]).find((x: any) => x.id === id);
    if (!def?.warning) return "";
    // if warning is already a translated string from constants, keep it as defaultValue
    return t(`leveling.warnings.${id}`, { defaultValue: String(def.warning) });
  };

  const productLabel = (id: string) => {
    const def = (LEVELING_PRODUCTS as any[]).find((x: any) => x.id === id);
    return t(`leveling.products.${id}`, { defaultValue: String(def?.label ?? id) });
  };

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones ---
  const [zones, setZones] = useState<LevelingZone[]>([]);
  const [newZoneLabel, setNewZoneLabel] = useState("");
  const [newZoneArea, setNewZoneArea] = useState("");
  const [newZoneSubstrate, setNewZoneSubstrate] = useState("concrete");

  const [newZoneThicknessMode, setNewZoneThicknessMode] = useState<ThicknessMode>("avg");
  const [newZoneThickAvg, setNewZoneThickAvg] = useState("5");
  const [newZoneThickMin, setNewZoneThickMin] = useState("3");
  const [newZoneThickMax, setNewZoneThickMax] = useState("8");

  // --- 2. Product ---
  const [productId, setProductId] = useState("standard");
  const [bagSize, setBagSize] = useState(25); // kg
  const [wastePct, setWastePct] = useState(5);

  // --- 3. Preparation ---
  const [usePrimer, setUsePrimer] = useState(true);
  const [primerLayers, setPrimerLayers] = useState(1);
  const [usePeripheralBand, setUsePeripheralBand] = useState(true);
  const [useMesh, setUseMesh] = useState(false);

  // ✅ helper: catalogue > DEFAULT_PRICES > fallback
  const priceOr = (key: string, fallback: number) => {
    const v = getUnitPrice(key);
    if (typeof v === "number" && !Number.isNaN(v) && v !== 0) return v;

    const d = (DEFAULT_PRICES as any)[key];
    if (d !== undefined) {
      const nd = Number(d);
      if (!Number.isNaN(nd)) return nd;
    }
    return fallback;
  };

  // --- 4. Pricing ---
  const [prices, setPrices] = useState(() => ({
    compoundBag: priceOr("RAGREAGE_BAG_25KG", 18),
    compoundFibre: priceOr("RAGREAGE_FIBRE_25KG", 24),
    primerL: priceOr("PRIMER_FLOOR_LITER", 12),
    bandM: priceOr("PERIPHERAL_BAND_M", 1.2),
    meshRoll: priceOr("MESH_FIBERGLASS_ROLL_50M2", 40),
    laborM2: priceOr("LABOR_LEVELING_M2", 25),
    laborPrep: priceOr("LABOR_PREP_M2", 8),
  }));

  type PriceKey = keyof typeof prices;
  const updatePrice = (key: PriceKey, val: string) => setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));

  // --- Helpers ---
  const addZone = () => {
    const area = toNum(newZoneArea, 0);
    if (!(area > 0)) return;

    const id = Date.now().toString();
    const label = (newZoneLabel || t("calc.leveling.default_zone")).trim();

    if (newZoneThicknessMode === "avg") {
      const th = toNum(newZoneThickAvg, 0);
      if (!(th > 0)) return;

      setZones((prev) => [
        ...prev,
        {
          id,
          label,
          area,
          substrate: newZoneSubstrate,
          thicknessMode: "avg",
          thicknessVal: th,
        },
      ]);
    } else {
      const tMin = toNum(newZoneThickMin, 0);
      const tMax = toNum(newZoneThickMax, 0);
      if (!(tMin > 0) || !(tMax > 0) || tMax < tMin) return;

      const tAvg = (tMin + tMax) / 2;

      setZones((prev) => [
        ...prev,
        {
          id,
          label,
          area,
          substrate: newZoneSubstrate,
          thicknessMode: "minmax",
          thicknessVal: tAvg,
          thicknessMin: tMin,
          thicknessMax: tMax,
        },
      ]);
    }

    setNewZoneArea("");
  };

  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));

  // --- Auto recommendations ---
  const [autoProductLocked, setAutoProductLocked] = useState(true);

  useEffect(() => {
    if (!autoProductLocked) return;
    if (zones.length === 0) return;

    const hasWood = zones.some((z) => z.substrate === "wood");
    const hasTile = zones.some((z) => z.substrate === "tile");
    const maxThick = Math.max(...zones.map((z) => z.thicknessVal), 0);

    if (hasWood || hasTile) {
      setProductId("fibre");
      if (hasWood) setUseMesh(true);
    } else if (maxThick > 15) {
      setProductId("thicks");
    } else {
      setProductId("standard");
    }
  }, [zones, autoProductLocked]);

  // --- Calculation engine ---
  const calculationData = useMemo(() => {
    const materialsList: any[] = [];
    const warnings: string[] = [];

    const productDef =
      (LEVELING_PRODUCTS as any[]).find((p: any) => p?.id === productId) ||
      ((LEVELING_PRODUCTS as any[])[0] as any) || {
        id: "standard",
        label: t("calc.leveling.product_fallback_label"),
        minThick: 1,
        maxThick: 50,
        density: 1.6,
      };

    let totalArea = 0;
    let perimeterTotal = 0;
    let totalWeight = 0; // kg

    zones.forEach((z) => {
      totalArea += z.area;
      perimeterTotal += Math.sqrt(z.area) * 4;

      const th = z.thicknessVal;
      const density = toNum((productDef as any).density, 1.6);
      totalWeight += z.area * th * density;

      const minTh = toNum((productDef as any).minThick, 1);
      const maxTh = toNum((productDef as any).maxThick, 50);

      if (th < minTh) {
        warnings.push(
          t("calc.leveling.warn_thickness_too_low", { label: z.label, th, minTh, product: String(productDef.label ?? "") })
        );
      }
      if (th > maxTh) {
        warnings.push(
          t("calc.leveling.warn_thickness_too_high", { label: z.label, th, maxTh, product: String(productDef.label ?? "") })
        );
      }

      if (z.thicknessMode === "minmax" && z.thicknessMin !== undefined && z.thicknessMax !== undefined) {
        if (z.thicknessMax - z.thicknessMin >= 10) {
          warnings.push(
            t("calc.leveling.warn_minmax_gap", {
              label: z.label,
              tMin: z.thicknessMin,
              tMax: z.thicknessMax,
            })
          );
        }
      }

      if (z.substrate === "wood" && !useMesh) warnings.push(t("calc.leveling.warn_wood_mesh", { label: z.label }));
      if (z.substrate === "tile" && !usePrimer) warnings.push(t("calc.leveling.warn_tile_primer", { label: z.label }));
    });

    const totalWeightWithWaste = totalWeight * (1 + wastePct / 100);

    // Compound
    const bags = totalWeightWithWaste > 0 ? Math.ceil(totalWeightWithWaste / bagSize) : 0;
    const pricePerBag = productId === "fibre" ? prices.compoundFibre : prices.compoundBag;
    const costCompound = bags * pricePerBag;

    if (bags > 0) {
      materialsList.push({
        id: "compound",
        name: t("calc.leveling.mat_compound", { product: String(productDef.label ?? "") }),
        quantity: bags,
        quantityRaw: totalWeightWithWaste,
        unit: Unit.BAG,
        unitPrice: round2(pricePerBag),
        totalPrice: round2(costCompound),
        category: CalculatorType.RAGREAGE,
        details: t("calc.leveling.mat_compound_details", {
          kg: totalWeightWithWaste.toFixed(0),
          bagSize,
        }),
      });
    }

    // Primer
    let costPrimer = 0;
    if (usePrimer && totalArea > 0) {
      const literPerM2 = 0.15 * primerLayers;
      const totalL = totalArea * literPerM2 * 1.1;
      const litersRounded = Math.max(0, Math.ceil(totalL));
      costPrimer = litersRounded * prices.primerL;

      materialsList.push({
        id: "primer",
        name: t("calc.leveling.mat_primer", { layers: primerLayers }),
        quantity: litersRounded,
        quantityRaw: totalL,
        unit: Unit.LITER,
        unitPrice: round2(prices.primerL),
        totalPrice: round2(costPrimer),
        category: CalculatorType.RAGREAGE,
      });
    }

    // Mesh
    let costMesh = 0;
    if (useMesh && totalArea > 0) {
      const meshArea = totalArea * 1.1;
      const rolls = Math.ceil(meshArea / 50);
      costMesh = rolls * prices.meshRoll;

      materialsList.push({
        id: "mesh",
        name: t("calc.leveling.mat_mesh"),
        quantity: rolls,
        quantityRaw: meshArea,
        unit: Unit.ROLL,
        unitPrice: round2(prices.meshRoll),
        totalPrice: round2(costMesh),
        category: CalculatorType.RAGREAGE,
        details: t("calc.leveling.mat_mesh_details"),
      });
    }

    // Peripheral band
    let costBand = 0;
    if (usePeripheralBand && perimeterTotal > 0) {
      const len = Math.ceil(perimeterTotal * 1.05);
      costBand = len * prices.bandM;

      materialsList.push({
        id: "band",
        name: t("calc.leveling.mat_band"),
        quantity: len,
        quantityRaw: perimeterTotal,
        unit: Unit.METER,
        unitPrice: round2(prices.bandM),
        totalPrice: round2(costBand),
        category: CalculatorType.RAGREAGE,
      });
    }

    // Labor
    let costLabor = 0;
    if (proMode && totalArea > 0) {
      const labPrep = totalArea * prices.laborPrep;
      const labApp = totalArea * prices.laborM2;
      costLabor = labPrep + labApp;

      materialsList.push(
        {
          id: "lab_prep",
          name: t("calc.leveling.mat_labor_prep"),
          quantity: round2(totalArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborPrep),
          totalPrice: round2(labPrep),
          category: CalculatorType.RAGREAGE,
        },
        {
          id: "lab_app",
          name: t("calc.leveling.mat_labor_pour"),
          quantity: round2(totalArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborM2),
          totalPrice: round2(labApp),
          category: CalculatorType.RAGREAGE,
        }
      );
    }

    const totalCost = costCompound + costPrimer + costMesh + costBand + costLabor;

    const avgThick = zones.length > 0 ? zones.reduce((a, b) => a + b.thicknessVal, 0) / zones.length : 0;
    if (zones.length === 0) warnings.push(t("calc.leveling.warn_add_zone"));

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      totalArea,
      avgThick,
      warnings,
      bags,
      totalWeightWithWaste,
      productLabel: String(productDef.label ?? t("calc.leveling.product_fallback_label")),
    };
  }, [t, zones, productId, bagSize, wastePct, usePrimer, primerLayers, usePeripheralBand, useMesh, prices, proMode]);

  useEffect(() => {
    onCalculate({
      summary: t("calc.leveling.summary", { area: calculationData.totalArea.toFixed(1) }),
      details: [
        { label: t("calc.leveling.detail_area"), value: calculationData.totalArea.toFixed(1), unit: "m²" },
        { label: t("calc.leveling.detail_avg_thickness"), value: calculationData.avgThick.toFixed(1), unit: "mm" },
        { label: t("calc.leveling.detail_product"), value: calculationData.productLabel, unit: "" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, t]);

  const stepLabel = (s: number) => {
    if (s === 1) return t("calc.leveling.step_1");
    if (s === 2) return t("calc.leveling.step_2");
    if (s === 3) return t("calc.leveling.step_3");
    return t("calc.leveling.step_4");
  };

  return (
    <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/72 p-3 sm:p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:p-6">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner overflow-x-auto no-scrollbar backdrop-blur-xl">
        {[1, 2, 3, 4].map((s) => (
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
            <ScanLine size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.leveling.help_step1")}
          </div>

          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <span className="font-bold text-slate-700 block break-words">{z.label}</span>
                  <span className="text-xs text-slate-500">
                    {t("calc.leveling.zone_line", {
                      area: z.area,
                      thicknessText:
                        z.thicknessMode === "avg"
                          ? t("calc.leveling.thickness_avg_value", { mm: z.thicknessVal })
                          : t("calc.leveling.thickness_minmax_value", {
                              min: z.thicknessMin,
                              max: z.thicknessMax,
                              avg: z.thicknessVal.toFixed(1),
                            }),
                      substrate:
                        substrateLabel(z.substrate),
                    })}
                  </span>
                </div>
                <button type="button" onClick={() => removeZone(z.id)} className="text-red-400 p-2" aria-label={t("common.remove")}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {zones.length === 0 && <div className="text-center text-sm text-slate-400 py-4 italic">{t("calc.leveling.empty_zones")}</div>}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 space-y-2">
            <input
              type="text"
              placeholder={t("calc.leveling.ph_zone_name")}
              value={newZoneLabel}
              onChange={(e) => setNewZoneLabel(e.target.value)}
              className="w-full p-2 text-xs border rounded bg-white text-slate-900"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="number"
                placeholder={t("calc.leveling.ph_area")}
                value={newZoneArea}
                onChange={(e) => setNewZoneArea(e.target.value)}
                className="p-2 text-xs border rounded bg-white text-slate-900"
              />

              <select
                value={newZoneSubstrate}
                onChange={(e) => setNewZoneSubstrate(e.target.value)}
                className="p-2 text-xs border rounded bg-white text-slate-900"
              >
                {(LEVELING_SUBSTRATES as any[]).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {substrateLabel(String(s.id))}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setNewZoneThicknessMode("avg")}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${newZoneThicknessMode === "avg" ? "bg-white shadow" : "text-slate-500"}`}
              >
                {t("calc.leveling.thickness_mode_avg")}
              </button>
              <button
                type="button"
                onClick={() => setNewZoneThicknessMode("minmax")}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${newZoneThicknessMode === "minmax" ? "bg-white shadow" : "text-slate-500"}`}
              >
                {t("calc.leveling.thickness_mode_minmax")}
              </button>
            </div>

            {newZoneThicknessMode === "avg" ? (
              <input
                type="number"
                placeholder={t("calc.leveling.ph_thickness_avg")}
                value={newZoneThickAvg}
                onChange={(e) => setNewZoneThickAvg(e.target.value)}
                className="w-full p-2 text-xs border rounded bg-white text-slate-900"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder={t("calc.leveling.ph_thickness_min")}
                  value={newZoneThickMin}
                  onChange={(e) => setNewZoneThickMin(e.target.value)}
                  className="p-2 text-xs border rounded bg-white text-slate-900"
                />
                <input
                  type="number"
                  placeholder={t("calc.leveling.ph_thickness_max")}
                  value={newZoneThickMax}
                  onChange={(e) => setNewZoneThickMax(e.target.value)}
                  className="p-2 text-xs border rounded bg-white text-slate-900"
                />
              </div>
            )}

            <button
              type="button"
              onClick={addZone}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs flex justify-center items-center"
            >
              <Plus size={14} className="mr-1" /> {t("calc.leveling.btn_add_zone")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center mt-2"
          >
            {t("common.next")} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.leveling.help_step2")}{" "}
            <span className="font-bold ml-1">{autoProductLocked ? t("common.on") : t("common.off")}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.leveling.product_title")}</h4>
              <label className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={autoProductLocked} onChange={(e) => setAutoProductLocked(e.target.checked)} />
                {t("common.auto")}
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {(LEVELING_PRODUCTS as any[]).map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProductId(p.id);
                    setAutoProductLocked(false);
                  }}
                  className={`p-3 text-left rounded border flex justify-between items-center ${
                    productId === p.id ? "bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500" : "bg-white text-slate-600"
                  }`}
                >
                  <div>
                    <span className="font-bold block text-sm">{productLabel(String(p.id))}</span>
                    <span className="text-[11px] opacity-75">
                      {t("calc.leveling.product_specs", {
                        min: p.minThick,
                        max: p.maxThick,
                        density: p.density,
                      })}
                    </span>
                  </div>
                  {productId === p.id && <Check size={16} />}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.leveling.bag_size")}</label>
                <select value={bagSize} onChange={(e) => setBagSize(toNum(e.target.value, 25))} className="w-full p-2 border rounded bg-white text-sm text-slate-900">
                  <option value={20}>{t("calc.leveling.bag_kg", { kg: 20 })}</option>
                  <option value={25}>{t("calc.leveling.bag_kg", { kg: 25 })}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.leveling.waste_pct")}</label>
                <input
                  type="number"
                  value={wastePct}
                  onChange={(e) => setWastePct(clamp(toNum(e.target.value, 0), 0, 30))}
                  className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              {t("calc.leveling.estimate_line", {
                bags: calculationData.bags,
                kg: calculationData.totalWeightWithWaste.toFixed(0),
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back")}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Construction size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.leveling.help_step3")}
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white border rounded-lg">
              <label className="flex flex-wrap items-center justify-between gap-2 cursor-pointer mb-2">
                <span className="text-sm font-bold text-slate-700">{t("calc.leveling.opt_primer")}</span>
                <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>

              {usePrimer && (
                <div className="pl-2 flex items-center space-x-3">
                  <span className="text-xs text-slate-500">{t("calc.leveling.layers")}:</span>
                  <div className="flex bg-slate-100 rounded p-0.5">
                    <button type="button" onClick={() => setPrimerLayers(1)} className={`px-3 py-1 text-xs rounded ${primerLayers === 1 ? "bg-white shadow font-bold" : ""}`}>
                      1
                    </button>
                    <button type="button" onClick={() => setPrimerLayers(2)} className={`px-3 py-1 text-xs rounded ${primerLayers === 2 ? "bg-white shadow font-bold" : ""}`}>
                      2
                    </button>
                  </div>
                </div>
              )}
            </div>

            <label className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">{t("calc.leveling.opt_band")}</span>
                <p className="text-[11px] text-slate-400">{t("calc.leveling.opt_band_help")}</p>
              </div>
              <input type="checkbox" checked={usePeripheralBand} onChange={(e) => setUsePeripheralBand(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">{t("calc.leveling.opt_mesh")}</span>
                <p className="text-[11px] text-slate-400">{t("calc.leveling.opt_mesh_help")}</p>
              </div>
              <input type="checkbox" checked={useMesh} onChange={(e) => setUseMesh(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg flex items-start text-xs text-slate-600">
            <Clock size={16} className="mr-2 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block mb-1">{t("calc.leveling.drying_title")}</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>{t("calc.leveling.drying_walk")}</li>
                <li>{t("calc.leveling.drying_tile")}</li>
                <li>{t("calc.leveling.drying_floor")}</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back")}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.leveling.help_step4")}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.leveling.prices_title")}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? t("common.pro_mode") : t("common.simple_mode")}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">{t("calc.leveling.price_compound_std")}</label>
                <input type="number" value={prices.compoundBag} onChange={(e) => updatePrice("compoundBag", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">{t("calc.leveling.price_compound_fibre")}</label>
                <input type="number" value={prices.compoundFibre} onChange={(e) => updatePrice("compoundFibre", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">{t("calc.leveling.price_primer")}</label>
                <input type="number" value={prices.primerL} onChange={(e) => updatePrice("primerL", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
              </div>

              {useMesh && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.leveling.price_mesh")}</label>
                  <input type="number" value={prices.meshRoll} onChange={(e) => updatePrice("meshRoll", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {usePeripheralBand && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.leveling.price_band")}</label>
                  <input type="number" value={prices.bandM} onChange={(e) => updatePrice("bandM", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-blue-600 font-bold mb-1">{t("calc.leveling.price_labor_pour")}</label>
                  <input type="number" value={prices.laborM2} onChange={(e) => updatePrice("laborM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl" />
                </div>
                <div>
                  <label className="block text-[11px] text-blue-600 font-bold mb-1">{t("calc.leveling.price_labor_prep")}</label>
                  <input type="number" value={prices.laborPrep} onChange={(e) => updatePrice("laborPrep", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl" />
                </div>
              </div>
            )}
          </div>

          {calculationData.warnings.length > 0 && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
              {calculationData.warnings.map((w, i) => (
                <div key={i} className="flex items-center">
                  <AlertTriangle size={12} className="mr-2" /> {w}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back")}
            </button>
            <button type="button" disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold shadow-sm flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("common.calculated")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};