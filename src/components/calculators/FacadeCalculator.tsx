// src/components/calculators/FacadeCalculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES, OPENING_PRESETS } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";

import {
  PaintRoller,
  LayoutTemplate,
  Layers,
  Hammer,
  Settings,
  Check,
  ArrowRight,
  Home,
  CircleDollarSign,
  Eraser,
  BrickWall,
  Box,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";

interface FacadeOpening {
  id: string;
  type: "window" | "door" | "garage" | "bay";
  label: string;
  width: number;
  height: number;
  quantity: number;
  revealDepth: number; // cm (Tableau)
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

const n2 = (v: number) => (Number.isFinite(v) ? Number(v.toFixed(2)) : 0);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const FacadeCalculator: React.FC<Props> = ({ onCalculate }) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Geometry ---
  const [geoMode, setGeoMode] = useState<"rect" | "simple">("rect"); // House (L/W) or Perimeter
  const [dimL, setDimL] = useState("");
  const [dimW, setDimW] = useState("");
  const [dimH, setDimH] = useState("3"); // Height under eaves
  const [perimeter, setPerimeter] = useState("");

  const [hasGables, setHasGables] = useState(false);
  const [gableHeight, setGableHeight] = useState("1.5");
  const [numGables, setNumGables] = useState(2);

  // --- 2. Openings ---
  const [openings, setOpenings] = useState<FacadeOpening[]>([]);
  const [newOpType, setNewOpType] = useState<FacadeOpening["type"]>("window");
  const [newOpW, setNewOpW] = useState("1.20");
  const [newOpH, setNewOpH] = useState("1.25");
  const [newOpReveal, setNewOpReveal] = useState("20"); // cm

  // --- 3. Works Selection ---
  const [doCleaning, setDoCleaning] = useState(true);
  const [doRepair, setDoRepair] = useState(false);
  const [doCoating, setDoCoating] = useState(false); // Render
  const [doPaint, setDoPaint] = useState(false);
  const [doITE, setDoITE] = useState(false); // Isolation
  const [doCladding, setDoCladding] = useState(false); // Bardage

  // --- 4. Specs ---
  // Cleaning
  const [cleanType, setCleanType] = useState<"wash" | "moss" | "strip">("moss");
  // Repair
  const [crackLen, setCrackLen] = useState("0"); // ml
  // Coating
  const [coatingType, setCoatingType] = useState<"mono" | "rpe">("mono");
  const [coatingThick, setCoatingThick] = useState(15); // mm
  // Paint
  const [paintType, setPaintType] = useState<"acry" | "plio" | "silo">("silo");
  const [paintLayers, setPaintLayers] = useState(2);
  // ITE
  const [iteThick, setIteThick] = useState(120); // mm
  const [iteType, setIteType] = useState("pse");
  // Cladding
  const [claddingType, setCladdingType] = useState<"wood" | "composite">("wood");

  // Access
  const [scaffold, setScaffold] = useState(false);

  // -------- Pricing helpers (catalog > default > fallback) ----------
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

  // --- 5. Pricing ---
  const [prices, setPrices] = useState(() => ({
    cleanM2: 5.0,
    mossM2: 8.0,
    stripM2: 14.0,
    repairMl: 15.0,
    coatingBag: priceOr("FACADE_COATING_BAG", Number(DEFAULT_PRICES.FACADE_COATING_BAG ?? 18)),
    angleBar: 5.0, // 3m
    paintL: 15.0,
    iteM2: 60.0,
    iteRail: 15.0, // 2.5m
    claddingM2: 45.0,
    battenMl: 2.0,
    scaffoldFixed: 1000.0,
    laborM2: 45.0,
    laborScaffold: 15.0,
  }));

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers ---
  const makeOpeningLabel = (type: FacadeOpening["type"]) => {
    if (type === "window") return t("facade.opening.window", { defaultValue: "Window" });
    if (type === "door") return t("facade.opening.door", { defaultValue: "Door" });
    if (type === "bay") return t("facade.opening.bay", { defaultValue: "Sliding bay" });
    return t("facade.opening.garage", { defaultValue: "Garage door" });
  };

  const applyPreset = (type: FacadeOpening["type"]) => {
    const preset =
      (OPENING_PRESETS as any)?.[type] ||
      (type === "window"
        ? { w: 1.2, h: 1.25, reveal: 20 }
        : type === "door"
        ? { w: 0.9, h: 2.15, reveal: 20 }
        : type === "bay"
        ? { w: 2.4, h: 2.15, reveal: 20 }
        : { w: 2.4, h: 2.0, reveal: 20 });

    setNewOpW(String(preset.w));
    setNewOpH(String(preset.h));
    setNewOpReveal(String(preset.reveal ?? 20));
  };

  const addOpening = () => {
    const w = parseFloat(newOpW) || 0;
    const h = parseFloat(newOpH) || 0;
    const rev = parseFloat(newOpReveal) || 0;
    if (!(w > 0) || !(h > 0)) return;

    setOpenings((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: newOpType,
        label: makeOpeningLabel(newOpType),
        width: w,
        height: h,
        quantity: 1,
        revealDepth: clamp(rev, 0, 60),
      },
    ]);
  };

  const removeOpening = (id: string) => setOpenings((prev) => prev.filter((o) => o.id !== id));

  const updateOpeningQty = (id: string, delta: number) => {
    setOpenings((prev) =>
      prev.map((o) => (o.id === id ? { ...o, quantity: Math.max(1, o.quantity + delta) } : o))
    );
  };

  const safeLiterUnit = ((Unit as any).LITER ?? Unit.PIECE) as Unit;
  const safeBarUnit = ((Unit as any).BAR ?? Unit.PIECE) as Unit;

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let grossArea = 0;
    let totalPerimeter = 0;

    const h = parseFloat(dimH) || 0;

    // 1) Geometry
    if (geoMode === "rect") {
      const L = parseFloat(dimL) || 0;
      const W = parseFloat(dimW) || 0;
      totalPerimeter = (L + W) * 2;
      grossArea = totalPerimeter * h;

      if (hasGables) {
        const hG = parseFloat(gableHeight) || 0;
        const gableArea = 0.5 * W * hG * (numGables || 0);
        grossArea += gableArea;
      }
    } else {
      totalPerimeter = parseFloat(perimeter) || 0;
      grossArea = totalPerimeter * h;
    }

    // 2) Deductions + reveals
    let openingsArea = 0;
    let revealsArea = 0;
    let revealsLinear = 0;

    openings.forEach((op) => {
      const q = op.quantity || 1;
      openingsArea += op.width * op.height * q;

      const perimOp = op.height * 2 + op.width; // 2H + W
      const revSurf = perimOp * (op.revealDepth / 100) * q;
      revealsArea += revSurf;
      revealsLinear += perimOp * q;
    });

    const netArea = Math.max(0, grossArea - openingsArea);
    const treatableArea = netArea + revealsArea;

    // 3) Works
    const materialsList: any[] = [];
    let totalCost = 0;
    const warnings: string[] = [];

    const add = (row: any) => materialsList.push(row);

    if (h <= 0 || totalPerimeter <= 0 || grossArea <= 0) {
      warnings.push(
        t("facade.warn_geometry", {
          defaultValue: "Insufficient dimensions: enter the geometry (height + perimeter).",
        })
      );
    }

    // A) Cleaning
    if (doCleaning && treatableArea > 0) {
      const unitPrice =
        cleanType === "moss" ? prices.mossM2 : cleanType === "strip" ? prices.stripM2 : prices.cleanM2;

      const cost = treatableArea * unitPrice;
      totalCost += cost;

      add({
        id: "clean",
        name:
          cleanType === "moss"
            ? t("facade.clean.moss", { defaultValue: "Cleaning + moss treatment" })
            : cleanType === "strip"
            ? t("facade.clean.strip", { defaultValue: "Facade stripping" })
            : t("facade.clean.wash", { defaultValue: "Pressure washing" }),
        quantity: Math.ceil(treatableArea),
        quantityRaw: treatableArea,
        unit: Unit.M2,
        unitPrice,
        totalPrice: n2(cost),
        category: CalculatorType.FACADE,
      });
    }

    // B) Repair
    if (doRepair) {
      const cracks = parseFloat(crackLen) || 0;
      if (cracks > 0) {
        const cost = cracks * prices.repairMl;
        totalCost += cost;

        add({
          id: "repair",
          name: t("facade.repair.title", { defaultValue: "Crack treatment" }),
          quantity: n2(cracks),
          unit: Unit.METER,
          unitPrice: prices.repairMl,
          totalPrice: n2(cost),
          category: CalculatorType.FACADE,
          details: t("facade.repair.details", { defaultValue: "Opening + sealant / mortar" }),
        });
      } else {
        warnings.push(
          t("facade.warn_repair_zero", { defaultValue: "Repairs enabled but crack length = 0." })
        );
      }
    }

    // C) Coating
    if (doCoating && treatableArea > 0) {
      const thick = Number(coatingThick) || 15;
      const kgPerM2 = coatingType === "rpe" ? 3 : 1.5 * thick; // approx
      const totalKg = treatableArea * kgPerM2 * 1.05; // +5%
      const bags = Math.ceil(totalKg / 25);

      const costCoat = bags * prices.coatingBag;
      totalCost += costCoat;

      add({
        id: "coating",
        name:
          coatingType === "rpe"
            ? t("facade.coating.rpe", { defaultValue: "Thick plastic coating (RPE)" })
            : t("facade.coating.mono", { defaultValue: "Single-coat render" }) + ` (${thick}mm)`,
        quantity: bags,
        quantityRaw: totalKg,
        unit: Unit.BAG,
        unitPrice: prices.coatingBag,
        totalPrice: n2(costCoat),
        category: CalculatorType.FACADE,
      });

      const anglesBase = 4;
      const revealAngles = Math.ceil(revealsLinear / 3);
      const totalAngles = anglesBase + revealAngles;

      const costAngles = totalAngles * prices.angleBar;
      totalCost += costAngles;

      add({
        id: "angles",
        name: t("facade.coating.angles", { defaultValue: "Angle beads (3m)" }),
        quantity: totalAngles,
        unit: safeBarUnit,
        unitPrice: prices.angleBar,
        totalPrice: n2(costAngles),
        category: CalculatorType.FACADE,
        details: t("facade.coating.angles_details", { defaultValue: "Angles + reveals" }),
      });
    }

    // D) Paint
    if (doPaint && treatableArea > 0) {
      const coverage = 6; // m²/L/layer
      const layers = Math.max(1, paintLayers || 1);
      const totalL = (treatableArea * layers) / coverage;

      const costPaint = Math.ceil(totalL) * prices.paintL;
      totalCost += costPaint;

      add({
        id: "paint",
        name: t("facade.paint.title", { defaultValue: "Facade paint" }) + ` (${paintType.toUpperCase()})`,
        quantity: Math.ceil(totalL),
        quantityRaw: totalL,
        unit: safeLiterUnit,
        unitPrice: prices.paintL,
        totalPrice: n2(costPaint),
        category: CalculatorType.FACADE,
        details: t("facade.paint.layers", { defaultValue: "Coats" }) + `: ${layers}`,
      });
    }

    // E) ITE
    if (doITE && netArea > 0) {
      const costIte = netArea * prices.iteM2;
      totalCost += costIte;

      add({
        id: "ite",
        name: t("facade.ite.title", { defaultValue: "External insulation system" }) + ` (${iteThick}mm ${iteType.toUpperCase()})`,
        quantity: Math.ceil(netArea),
        quantityRaw: netArea,
        unit: Unit.M2,
        unitPrice: prices.iteM2,
        totalPrice: n2(costIte),
        category: CalculatorType.FACADE,
        details: t("facade.ite.details", { defaultValue: "Insulation + adhesive + mesh + render" }),
      });

      const rails = Math.ceil(totalPerimeter / 2.5);
      const costRails = rails * prices.iteRail;
      totalCost += costRails;

      add({
        id: "ite_rail",
        name: t("facade.ite.rail", { defaultValue: "Starter rails (2.5m)" }),
        quantity: rails,
        unit: Unit.PIECE,
        unitPrice: prices.iteRail,
        totalPrice: n2(costRails),
        category: CalculatorType.FACADE,
      });
    }

    // F) Cladding
    if (doCladding && netArea > 0) {
      const costClad = netArea * prices.claddingM2;
      totalCost += costClad;

      add({
        id: "cladding",
        name:
          t("facade.cladding.title", { defaultValue: "Cladding" }) +
          ` (${claddingType === "wood" ? t("facade.cladding.wood", { defaultValue: "Wood" }) : t("facade.cladding.composite", { defaultValue: "Composite" })})`,
        quantity: Math.ceil(netArea),
        quantityRaw: netArea,
        unit: Unit.M2,
        unitPrice: prices.claddingM2,
        totalPrice: n2(costClad),
        category: CalculatorType.FACADE,
      });

      const battens = Math.ceil(netArea * 3); // ~3 ml/m²
      const costBat = battens * prices.battenMl;
      totalCost += costBat;

      add({
        id: "battens",
        name: t("facade.cladding.battens", { defaultValue: "Battens / subframe" }),
        quantity: battens,
        unit: Unit.METER,
        unitPrice: prices.battenMl,
        totalPrice: n2(costBat),
        category: CalculatorType.FACADE,
      });
    }

    // G) Scaffold
    const shouldScaffold = scaffold || h > 3;
    if (shouldScaffold && grossArea > 0) {
      const scafArea = grossArea;
      const costScaf = prices.scaffoldFixed + (proMode ? scafArea * prices.laborScaffold : 0);
      totalCost += costScaf;

      add({
        id: "scaffold",
        name: t("facade.scaffold.title", { defaultValue: "Scaffolding (fixed)" }),
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: n2(costScaf),
        totalPrice: n2(costScaf),
        category: CalculatorType.FACADE,
        details: h > 6 ? t("facade.scaffold.tall", { defaultValue: "High elevation" }) : t("facade.scaffold.std", { defaultValue: "Standard" }),
      });

      if (h > 3 && !scaffold) {
        warnings.push(t("facade.warn_scaffold_auto", { defaultValue: "Height > 3m: scaffolding added automatically." }));
      }
    }

    // H) Labor (General)
    if (proMode && netArea > 0) {
      const costLab = netArea * prices.laborM2;
      totalCost += costLab;

      add({
        id: "labor_main",
        name: t("facade.labor.title", { defaultValue: "Labor (facade contractor)" }),
        quantity: n2(netArea),
        unit: Unit.M2,
        unitPrice: prices.laborM2,
        totalPrice: n2(costLab),
        category: CalculatorType.FACADE,
      });
    }

    if (openings.length === 0 && (doCoating || doPaint || doITE || doCladding)) {
      warnings.push(t("facade.warn_no_openings", { defaultValue: "No openings deducted: area may be overestimated." }));
    }
    if (doCoating && doPaint) {
      warnings.push(t("facade.warn_coat_paint", { defaultValue: "Render + paint: check primer/compatibility." }));
    }

    return {
      totalCost: n2(totalCost),
      materials: materialsList,
      grossArea: n2(grossArea),
      netArea: n2(netArea),
      treatableArea: n2(treatableArea),
      warnings,
    };
  }, [
    geoMode,
    dimL,
    dimW,
    dimH,
    perimeter,
    hasGables,
    gableHeight,
    numGables,
    openings,
    doCleaning,
    cleanType,
    doRepair,
    crackLen,
    doCoating,
    coatingType,
    coatingThick,
    doPaint,
    paintType,
    paintLayers,
    doITE,
    iteThick,
    iteType,
    doCladding,
    claddingType,
    scaffold,
    prices,
    proMode,
    t,
  ]);

  useEffect(() => {
    onCalculate({
      summary: `${calculationData.netArea.toFixed(1)} m²`,
      details: [
        { label: t("facade.details.gross", { defaultValue: "Gross area" }), value: calculationData.grossArea.toFixed(1), unit: "m²" },
        { label: t("facade.details.net", { defaultValue: "Net area" }), value: calculationData.netArea.toFixed(1), unit: "m²" },
        { label: t("facade.details.treatable", { defaultValue: "Treated area" }), value: calculationData.treatableArea.toFixed(1), unit: "m²" },
        {
          label: t("facade.details.works", { defaultValue: "Works" }),
          value: [
            doCleaning ? t("facade.work.cleaning", { defaultValue: "Cleaning" }) : "",
            doCoating ? t("facade.work.coating", { defaultValue: "Render" }) : "",
            doPaint ? t("facade.work.paint", { defaultValue: "Paint" }) : "",
            doITE ? t("facade.work.ite", { defaultValue: "ITE" }) : "",
            doCladding ? t("facade.work.cladding", { defaultValue: "Cladding" }) : "",
          ]
            .filter(Boolean)
            .join(", "),
          unit: "",
        },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, doCleaning, doCoating, doPaint, doITE, doCladding, t]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Navigation */}
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
            {s === 1 && t("facade.steps.1", { defaultValue: "1. Walls" })}
            {s === 2 && t("facade.steps.2", { defaultValue: "2. Ouver." })}
            {s === 3 && t("facade.steps.3", { defaultValue: "3. Works" })}
            {s === 4 && t("facade.steps.4", { defaultValue: "4. Details" })}
            {s === 5 && t("facade.steps.5", { defaultValue: "5. Pricing" })}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Home size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("facade.step1.hint", { defaultValue: "Define the house geometry." })}
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setGeoMode("rect")}
              className={`flex-1 py-2 text-xs font-bold rounded ${
                geoMode === "rect" ? "bg-white shadow text-indigo-600" : "text-slate-500"
              }`}
            >
              {t("facade.geo.rect", { defaultValue: "Maison (L x l)" })}
            </button>
            <button
              type="button"
              onClick={() => setGeoMode("simple")}
              className={`flex-1 py-2 text-xs font-bold rounded ${
                geoMode === "simple" ? "bg-white shadow text-indigo-600" : "text-slate-500"
              }`}
            >
              {t("facade.geo.perimeter", { defaultValue: "Perimeter" })}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {geoMode === "rect" ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t("facade.geo.length", { defaultValue: "Length (m)" })}</label>
                  <input
                    type="number"
                    value={dimL}
                    onChange={(e) => setDimL(e.target.value)}
                    className="w-full p-2 border rounded bg-white font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t("facade.geo.width", { defaultValue: "Largeur (m)" })}</label>
                  <input
                    type="number"
                    value={dimW}
                    onChange={(e) => setDimW(e.target.value)}
                    className="w-full p-2 border rounded bg-white font-bold text-slate-900"
                  />
                </div>
              </>
            ) : (
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">{t("facade.geo.perimeter_total", { defaultValue: "Total perimeter (m)" })}</label>
                <input
                  type="number"
                  value={perimeter}
                  onChange={(e) => setPerimeter(e.target.value)}
                  className="w-full p-2 border rounded bg-white font-bold text-slate-900"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("facade.geo.height", { defaultValue: "Wall height under eaves (m)" })}</label>
              <input
                type="number"
                value={dimH}
                onChange={(e) => setDimH(e.target.value)}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          {geoMode === "rect" && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={hasGables}
                  onChange={(e) => setHasGables(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm font-bold text-slate-700">{t("facade.geo.gables", { defaultValue: "Ajouter pignons" })}</span>
              </label>

              {hasGables && (
                <div className="grid grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.geo.gable_height", { defaultValue: "Gable height (m)" })}</label>
                    <input
                      type="number"
                      value={gableHeight}
                      onChange={(e) => setGableHeight(e.target.value)}
                      className="w-full p-1.5 text-sm border rounded bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.geo.gable_count", { defaultValue: "Nombre" })}</label>
                    <select
                      value={numGables}
                      onChange={(e) => setNumGables(Number(e.target.value))}
                      className="w-full p-1.5 text-sm border rounded bg-white text-slate-900"
                    >
                      {[1, 2, 3, 4].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
          >
            {t("common.next", { defaultValue: "Suivant" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <LayoutTemplate size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("facade.step2.hint", {
              defaultValue: "Add openings. They will be deducted from the surface, but reveals will still be counted.",
            })}
          </div>

          <div className="space-y-2">
            {openings.map((op) => (
              <div key={op.id} className="flex justify-between items-center p-2 bg-white border rounded shadow-sm">
                <div className="min-w-0">
                  <span className="font-bold text-sm block truncate">
                    {op.label} ×{op.quantity}
                  </span>
                  <span className="text-xs text-slate-500">
                    {op.width}×{op.height}m • {t("facade.opening.reveal", { defaultValue: "Tableau" })}: {op.revealDepth}cm
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateOpeningQty(op.id, -1)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded border text-slate-600 hover:bg-slate-100"
                    title={t("common.minus", { defaultValue: "Diminuer" })}
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => updateOpeningQty(op.id, 1)}
                    className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded border text-slate-600 hover:bg-slate-100"
                    title={t("common.plus", { defaultValue: "Augmenter" })}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOpening(op.id)}
                    className="text-red-400 p-2"
                    title={t("common.delete", { defaultValue: "Supprimer" })}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {openings.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-4 italic">
                {t("facade.opening.none", { defaultValue: "Aucune ouverture." })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
            <div className="flex gap-2 mb-2 items-center">
              <select
                value={newOpType}
                onChange={(e) => {
                  const next = e.target.value as FacadeOpening["type"];
                  setNewOpType(next);
                  applyPreset(next);
                }}
                className="flex-1 p-1.5 text-xs border rounded bg-white text-slate-900"
              >
                <option value="window">{t("facade.opening.window", { defaultValue: "Window" })}</option>
                <option value="door">{t("facade.opening.door", { defaultValue: "Door" })}</option>
                <option value="bay">{t("facade.opening.bay", { defaultValue: "Sliding bay" })}</option>
                <option value="garage">{t("facade.opening.garage", { defaultValue: "Garage door" })}</option>
              </select>

              <button type="button" className="text-xs text-blue-600 underline" onClick={() => applyPreset(newOpType)}>
                {t("common.preset", { defaultValue: "Preset" })}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              <input
                type="number"
                placeholder={t("facade.opening.width", { defaultValue: "Larg" })}
                value={newOpW}
                onChange={(e) => setNewOpW(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder={t("facade.opening.height", { defaultValue: "Haut" })}
                value={newOpH}
                onChange={(e) => setNewOpH(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder={t("facade.opening.reveal_cm", { defaultValue: "Tab (cm)" })}
                value={newOpReveal}
                onChange={(e) => setNewOpReveal(e.target.value)}
                className="p-1.5 text-xs border rounded bg-white text-slate-900"
                title={t("facade.opening.reveal_title", { defaultValue: "Profondeur tableau" })}
              />
            </div>

            <button
              type="button"
              onClick={addOpening}
              className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded text-xs flex justify-center items-center"
            >
              <Plus size={14} className="mr-1" /> {t("facade.opening.add", { defaultValue: "Ajouter ouverture" })}
            </button>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Check size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("facade.step3.hint", { defaultValue: "Select the works to carry out." })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doCleaning ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-slate-500"}`}>
              <Eraser size={24} className="mb-2" />
              <span className="font-bold text-sm">{t("facade.work.cleaning", { defaultValue: "Cleaning" })}</span>
              <input type="checkbox" checked={doCleaning} onChange={(e) => setDoCleaning(e.target.checked)} className="hidden" />
            </label>

            <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doRepair ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-slate-500"}`}>
              <Hammer size={24} className="mb-2" />
              <span className="font-bold text-sm">{t("facade.work.repair", { defaultValue: "Repairs" })}</span>
              <input type="checkbox" checked={doRepair} onChange={(e) => setDoRepair(e.target.checked)} className="hidden" />
            </label>

            <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doCoating ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-slate-500"}`}>
              <BrickWall size={24} className="mb-2" />
              <span className="font-bold text-sm">{t("facade.work.coating", { defaultValue: "Render" })}</span>
              <input type="checkbox" checked={doCoating} onChange={(e) => setDoCoating(e.target.checked)} className="hidden" />
            </label>

            <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doPaint ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-slate-500"}`}>
              <PaintRoller size={24} className="mb-2" />
              <span className="font-bold text-sm">{t("facade.work.paint", { defaultValue: "Paint" })}</span>
              <input type="checkbox" checked={doPaint} onChange={(e) => setDoPaint(e.target.checked)} className="hidden" />
            </label>

            <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doITE ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-slate-500"}`}>
              <Layers size={24} className="mb-2" />
              <span className="font-bold text-sm">{t("facade.work.ite", { defaultValue: "Isolation ITE" })}</span>
              <input type="checkbox" checked={doITE} onChange={(e) => setDoITE(e.target.checked)} className="hidden" />
            </label>

            <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doCladding ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white text-slate-500"}`}>
              <Box size={24} className="mb-2" />
              <span className="font-bold text-sm">{t("facade.work.cladding", { defaultValue: "Cladding" })}</span>
              <input type="checkbox" checked={doCladding} onChange={(e) => setDoCladding(e.target.checked)} className="hidden" />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Settings size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("facade.step4.hint", { defaultValue: "Configure the details of the selected works." })}
          </div>

          {doCleaning && (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("facade.clean.title", { defaultValue: "Cleaning" })}</h4>
              <select value={cleanType} onChange={(e) => setCleanType(e.target.value as any)} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                <option value="moss">{t("facade.clean.moss_opt", { defaultValue: "Moss treatment" })}</option>
                <option value="wash">{t("facade.clean.wash_opt", { defaultValue: "Lavage haute pression" })}</option>
                <option value="strip">{t("facade.clean.strip_opt", { defaultValue: "Chemical stripping" })}</option>
              </select>
            </div>
          )}

          {doRepair && (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("facade.repair.title", { defaultValue: "Repairs" })}</h4>
              <label className="block text-xs mb-1">{t("facade.repair.cracks_ml", { defaultValue: "Crack length (lm)" })}</label>
              <input type="number" value={crackLen} onChange={(e) => setCrackLen(e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
            </div>
          )}

          {doCoating && (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("facade.coating.title", { defaultValue: "Render" })}</h4>
              <div className="grid grid-cols-2 gap-3">
                <select value={coatingType} onChange={(e) => setCoatingType(e.target.value as any)} className="p-2 text-sm border rounded bg-white text-slate-900">
                  <option value="mono">{t("facade.coating.mono_opt", { defaultValue: "Monocouche" })}</option>
                  <option value="rpe">{t("facade.coating.rpe_opt", { defaultValue: "RPE" })}</option>
                </select>

                <div className="flex items-center">
                  <input type="number" value={coatingThick} onChange={(e) => setCoatingThick(Number(e.target.value))} className="w-16 p-2 text-sm border rounded bg-white text-slate-900" />
                  <span className="ml-2 text-xs">mm</span>
                </div>
              </div>
            </div>
          )}

          {doPaint && (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("facade.paint.title", { defaultValue: "Paint" })}</h4>
              <div className="grid grid-cols-2 gap-3">
                <select value={paintType} onChange={(e) => setPaintType(e.target.value as any)} className="p-2 text-sm border rounded bg-white text-slate-900">
                  <option value="acry">{t("facade.paint.acry", { defaultValue: "Acrylique" })}</option>
                  <option value="plio">{t("facade.paint.plio", { defaultValue: "Pliolite" })}</option>
                  <option value="silo">{t("facade.paint.silo", { defaultValue: "Siloxane" })}</option>
                </select>

                <select value={paintLayers} onChange={(e) => setPaintLayers(Number(e.target.value))} className="p-2 text-sm border rounded bg-white text-slate-900">
                  {[1, 2, 3].map((v) => (
                    <option key={v} value={v}>
                      {t("facade.paint.layers_n", { defaultValue: "{{n}} couche(s)", n: v })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {doITE && (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("facade.ite.title", { defaultValue: "Isolation (ITE)" })}</h4>
              <div className="grid grid-cols-2 gap-3">
                <select value={iteType} onChange={(e) => setIteType(e.target.value)} className="p-2 text-sm border rounded bg-white text-slate-900">
                  <option value="pse">{t("facade.ite.pse", { defaultValue: "Polystyrene (EPS)" })}</option>
                  <option value="rock">{t("facade.ite.rock", { defaultValue: "Laine de roche" })}</option>
                </select>

                <div className="flex items-center">
                  <input type="number" value={iteThick} onChange={(e) => setIteThick(Number(e.target.value))} className="w-16 p-2 text-sm border rounded bg-white text-slate-900" />
                  <span className="ml-2 text-xs">mm</span>
                </div>
              </div>
            </div>
          )}

          {doCladding && (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("facade.cladding.title", { defaultValue: "Cladding" })}</h4>
              <select value={claddingType} onChange={(e) => setCladdingType(e.target.value as any)} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                <option value="wood">{t("facade.cladding.wood", { defaultValue: "Wood" })}</option>
                <option value="composite">{t("facade.cladding.composite", { defaultValue: "Composite" })}</option>
              </select>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-700">{t("facade.scaffold.toggle", { defaultValue: "Scaffolding" })}</span>
              <input type="checkbox" checked={scaffold} onChange={(e) => setScaffold(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("facade.step5.hint", { defaultValue: "Ajustez les prix unitaires pour finaliser le devis." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("facade.prices.title", { defaultValue: "Tarifs unitaires" })}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? t("struct.common.pro_mode", { defaultValue: "Mode Pro" }) : t("struct.common.simple_mode", { defaultValue: "Mode Simple" })}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {doCleaning && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    {cleanType === "moss"
                      ? t("facade.prices.moss", { defaultValue: "Moss treatment (€/m²)" })
                      : cleanType === "strip"
                      ? t("facade.prices.strip", { defaultValue: "Stripping (€/m²)" })
                      : t("facade.prices.wash", { defaultValue: "Lavage (€/m²)" })}
                  </label>
                  <input
                    type="number"
                    value={cleanType === "moss" ? prices.mossM2 : cleanType === "strip" ? prices.stripM2 : prices.cleanM2}
                    onChange={(e) =>
                      cleanType === "moss"
                        ? updatePrice("mossM2", e.target.value)
                        : cleanType === "strip"
                        ? updatePrice("stripM2", e.target.value)
                        : updatePrice("cleanM2", e.target.value)
                    }
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {doRepair && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.repair", { defaultValue: "Crack repairs (€/lm)" })}</label>
                  <input type="number" value={prices.repairMl} onChange={(e) => updatePrice("repairMl", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              {doCoating && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.coating_bag", { defaultValue: "Sac enduit (€/u)" })}</label>
                    <input type="number" value={prices.coatingBag} onChange={(e) => updatePrice("coatingBag", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.angle", { defaultValue: "Angle bead 3m (€/u)" })}</label>
                    <input type="number" value={prices.angleBar} onChange={(e) => updatePrice("angleBar", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                  </div>
                </>
              )}

              {doPaint && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.paint", { defaultValue: "Paint (€/L)" })}</label>
                  <input type="number" value={prices.paintL} onChange={(e) => updatePrice("paintL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              {doITE && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.ite_m2", { defaultValue: "ITE complet (€/m²)" })}</label>
                    <input type="number" value={prices.iteM2} onChange={(e) => updatePrice("iteM2", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.ite_rail", { defaultValue: "Starter rail 2.5m (€/u)" })}</label>
                    <input type="number" value={prices.iteRail} onChange={(e) => updatePrice("iteRail", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                  </div>
                </>
              )}

              {doCladding && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.cladding_m2", { defaultValue: "Cladding (€/m²)" })}</label>
                    <input type="number" value={prices.claddingM2} onChange={(e) => updatePrice("claddingM2", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.batten_ml", { defaultValue: "Tasseaux (€/ml)" })}</label>
                    <input type="number" value={prices.battenMl} onChange={(e) => updatePrice("battenMl", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                  </div>
                </>
              )}

              {(scaffold || parseFloat(dimH) > 3) && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("facade.prices.scaffold", { defaultValue: "Scaffolding (fixed)" })}</label>
                  <input type="number" value={prices.scaffoldFixed} onChange={(e) => updatePrice("scaffoldFixed", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("facade.prices.labor_m2", { defaultValue: "Facade labor (€/m²)" })}</label>
                  <input type="number" value={prices.laborM2} onChange={(e) => updatePrice("laborM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("facade.prices.labor_scaffold", { defaultValue: "Scaffolding labor (€/m²)" })}</label>
                  <input type="number" value={prices.laborScaffold} onChange={(e) => updatePrice("laborScaffold", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
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
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("struct.common.calculated", { defaultValue: "Calculated" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};