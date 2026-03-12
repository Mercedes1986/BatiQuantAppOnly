import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { TILE_PATTERNS } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  Grid3X3,
  Plus,
  Trash2,
  Home,
  Layers,
  Settings,
  Check,
  ArrowRight,
  Droplets,
  AlignLeft,
  CircleDollarSign,
  PaintBucket,
  AlertTriangle,
} from "lucide-react";

interface TileZone {
  id: string;
  type: "floor" | "wall";
  label: string;
  area: number;
  perimeter: number; // for skirting (mainly floor)
  isWet: boolean; // Needs waterproofing
  substrate: "screed" | "tile" | "plaster" | "wood";
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

export const TileCalculator: React.FC<Props> = ({ onCalculate }) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones ---
  const [zones, setZones] = useState<TileZone[]>([]);
  const [newZoneType, setNewZoneType] = useState<"floor" | "wall">("floor");
  const [newZoneLabel, setNewZoneLabel] = useState("");
  const [newZoneArea, setNewZoneArea] = useState("");
  const [newZonePerim, setNewZonePerim] = useState("");
  const [newZoneWet, setNewZoneWet] = useState(false);
  const [newZoneSubstrate, setNewZoneSubstrate] = useState<TileZone["substrate"]>("screed");

  // --- 2. Tile Specs ---
  const [tileLength, setTileLength] = useState(60); // cm
  const [tileWidth, setTileWidth] = useState(60); // cm
  const [tileThickness, setTileThickness] = useState(9); // mm
  const [patternId, setPatternId] = useState("straight");
  const [boxSize, setBoxSize] = useState(1.44); // m2 per box
  const [wastePct, setWastePct] = useState(10);

  // --- 3. Glue & Grout ---
  const [glueType, setGlueType] = useState<"C2" | "Flex" | "Dispersion">("C2");
  const [combSize, setCombSize] = useState(10); // mm
  const [doubleGluing, setDoubleGluing] = useState(false);
  const [jointWidth, setJointWidth] = useState(3); // mm
  const [jointType, setJointType] = useState<"cement" | "epoxy">("cement");
  const [useLevelingSystem, setUseLevelingSystem] = useState(false);

  // --- 4. Finishes ---
  const [useSkirting, setUseSkirting] = useState(true);
  const [useWaterproofing, setUseWaterproofing] = useState(true);
  const [usePrimer, setUsePrimer] = useState(true);

  // --- 5. Pricing ---
  // NOTE: keep this logic, but avoid hard text elsewhere. Prices are numbers, ok.
  const [prices, setPrices] = useState({
    tileM2: (getUnitPrice("TILE_M2") as number) || 30,
    glueBag: (getUnitPrice("GLUE_BAG_25KG") as number) || 18,
    groutBag: (getUnitPrice("GROUT_BAG_5KG") as number) || 12,
    epoxyKit: 60, // 3kg
    primerL: (getUnitPrice("PRIMER_LITER") as number) || 10,
    specKit: 75, // kit ~6m2
    levelingKit: (getUnitPrice("SPACERS_BOX") as number) || 12, // sachet / boîte
    skirtingM: (getUnitPrice("SKIRTING_METER") as number) || 8,
    laborM2: 45,
    laborSkirting: 10,
    laborSpec: 15,
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- Helpers ---
  const addZone = () => {
    const area = toNum(newZoneArea, 0);
    if (!(area > 0)) return;

    const perim = toNum(newZonePerim, 0) || Math.sqrt(area) * 4;

    setZones((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: newZoneType,
        label: (newZoneLabel || t(`calc.tile.default_zone.${newZoneType}`, { defaultValue: "Zone" })).trim(),
        area,
        perimeter: perim,
        isWet: newZoneWet,
        substrate: newZoneSubstrate,
      },
    ]);

    setNewZoneArea("");
    setNewZonePerim("");
    setNewZoneWet(false);
    setNewZoneLabel("");
    setNewZoneSubstrate("screed");
  };

  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));

  const patternDef = useMemo(() => {
    return (
      TILE_PATTERNS.find((p: any) => p.id === patternId) ||
      TILE_PATTERNS[0] ||
      { id: "straight", label: "Pose droite", waste: 10 } // label will be ignored in UI via i18n below
    );
  }, [patternId]);

  // Waste based on pattern
  useEffect(() => {
    const w = toNum((patternDef as any).waste, 10);
    setWastePct(clamp(w, 0, 30));
  }, [patternDef]);

  // Auto double gluing suggestion (large format) — non destructive
  const [autoDoubleSuggested, setAutoDoubleSuggested] = useState(false);
  useEffect(() => {
    const isLarge = Math.max(tileLength, tileWidth) >= 45;
    if (isLarge && !doubleGluing) setAutoDoubleSuggested(true);
    if (!isLarge) setAutoDoubleSuggested(false);
  }, [tileLength, tileWidth, doubleGluing]);

  const zoneTypeLabel = (tp: "floor" | "wall") => t(`calc.tile.zone_type.${tp}`, { defaultValue: tp });
  const substrateLabel = (s: TileZone["substrate"]) => t(`calc.tile.substrate.${s}`, { defaultValue: s });
  const glueTypeLabel = (g: "C2" | "Flex" | "Dispersion") => t(`calc.tile.glue_type.${g}`, { defaultValue: g });
  const jointTypeLabel = (j: "cement" | "epoxy") => t(`calc.tile.joint_type.${j}`, { defaultValue: j });

  const patternLabel = useMemo(() => {
    // Prefer pattern key if you have it in constants, else fallback to label or id
    const key = `calc.tile.pattern.${patternId}`;
    const fallback = String((patternDef as any)?.label ?? patternId);
    return t(key, { defaultValue: fallback });
  }, [t, patternId, patternDef]);

  const stepLabel = (s: number) => {
    if (s === 1) return t("calc.tile.steps.1", { defaultValue: "1" });
    if (s === 2) return t("calc.tile.steps.2", { defaultValue: "2" });
    if (s === 3) return t("calc.tile.steps.3", { defaultValue: "3" });
    if (s === 4) return t("calc.tile.steps.4", { defaultValue: "4" });
    return t("calc.tile.steps.5", { defaultValue: "5" });
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalArea = 0;
    let totalPerimeter = 0;
    let wetArea = 0;

    let areaOnWood = 0;
    let areaOnOldTile = 0;

    const warnings: string[] = [];
    const materials: any[] = [];
    let totalCost = 0;

    zones.forEach((z) => {
      totalArea += z.area;
      if (z.type === "floor") totalPerimeter += z.perimeter;
      if (z.isWet) wetArea += z.area;

      if (z.substrate === "wood") areaOnWood += z.area;
      if (z.substrate === "tile") areaOnOldTile += z.area;
    });

    if (totalArea <= 0) {
      return {
        totalArea: 0,
        totalCost: 0,
        materials,
        warnings: [t("calc.tile.warn_add_zone", { defaultValue: "Add at least one zone." })],
        wetArea: 0,
        totalPerimeter: 0,
      };
    }

    const safeBox = Math.max(0.1, toNum(boxSize, 1.44));
    const safeWaste = clamp(toNum(wastePct, 10), 0, 30);

    // --- Tiles ---
    const areaWithWaste = totalArea * (1 + safeWaste / 100);
    const boxes = Math.ceil(areaWithWaste / safeBox);
    const m2Ordered = boxes * safeBox;

    const costTiles = m2Ordered * prices.tileM2;
    totalCost += costTiles;

    const tileLabel = `${tileLength}x${tileWidth}cm`;

    materials.push({
      id: "tiles",
      name: t("calc.tile.mat.tiles", { defaultValue: "Tiles" }),
      quantity: boxes,
      quantityRaw: areaWithWaste,
      unit: Unit.BOX,
      unitPrice: round2(prices.tileM2 * safeBox), // price per box
      totalPrice: round2(costTiles),
      category: CalculatorType.TILES,
      details: t("calc.tile.mat.tiles_details", {
        size: tileLabel,
        pattern: patternLabel,
        ordered: m2Ordered.toFixed(2),
        waste: safeWaste,
        defaultValue: `Size: ${tileLabel} • Pattern: ${patternLabel} • Ordered: ${m2Ordered.toFixed(2)} m² (waste ${safeWaste}%)`,
      }),
    });

    // --- Glue ---
    let glueConsump = 3.5; // kg/m2 default for ~10mm
    if (combSize <= 6) glueConsump = 2.5;
    else if (combSize <= 8) glueConsump = 3.0;
    else if (combSize >= 12) glueConsump = 5.0;
    if (doubleGluing) glueConsump += 2.5;

    const glueKg = totalArea * glueConsump * 1.05;
    const glueBags = Math.ceil(glueKg / 25);
    const costGlue = glueBags * prices.glueBag;
    totalCost += costGlue;

    materials.push({
      id: "glue",
      name: t("calc.tile.mat.glue", { defaultValue: "Tile adhesive" }),
      quantity: glueBags,
      quantityRaw: glueKg,
      unit: Unit.BAG,
      unitPrice: round2(prices.glueBag),
      totalPrice: round2(costGlue),
      category: CalculatorType.TILES,
      details: t("calc.tile.mat.glue_details", {
        type: glueTypeLabel(glueType),
        comb: combSize,
        double: doubleGluing ? t("calc.tile.double_yes", { defaultValue: "yes" }) : t("calc.tile.double_no", { defaultValue: "no" }),
        cons: glueConsump.toFixed(1),
        total: glueKg.toFixed(0),
        defaultValue: `Type: ${glueType} • Comb: ${combSize}mm • Double: ${doubleGluing ? "yes" : "no"} • ~${glueConsump.toFixed(
          1
        )} kg/m² • ~${glueKg.toFixed(0)} kg`,
      }),
    });

    // --- Grout ---
    const L_mm = Math.max(1, tileLength) * 10;
    const W_mm = Math.max(1, tileWidth) * 10;
    const jw = clamp(toNum(jointWidth, 3), 1, 15);
    const th = clamp(toNum(tileThickness, 9), 4, 30);

    const groutKgM2 = ((L_mm + W_mm) / (L_mm * W_mm)) * jw * th * 1.6;
    const totalGroutKg = totalArea * groutKgM2 * 1.1;

    if (jointType === "epoxy") {
      const kits = Math.ceil(totalGroutKg / 3);
      const costEpoxy = kits * prices.epoxyKit;
      totalCost += costEpoxy;

      materials.push({
        id: "grout_epoxy",
        name: t("calc.tile.mat.grout_epoxy", { defaultValue: "Epoxy grout (3kg kit)" }),
        quantity: kits,
        quantityRaw: totalGroutKg,
        unit: Unit.BOX,
        unitPrice: round2(prices.epoxyKit),
        totalPrice: round2(costEpoxy),
        category: CalculatorType.TILES,
        details: t("calc.tile.mat.grout_qty", {
          kg: totalGroutKg.toFixed(1),
          defaultValue: `≈ ${totalGroutKg.toFixed(1)} kg`,
        }),
      });
    } else {
      const bags = Math.ceil(totalGroutKg / 5);
      const costGrout = bags * prices.groutBag;
      totalCost += costGrout;

      materials.push({
        id: "grout_cem",
        name: t("calc.tile.mat.grout_cement", { defaultValue: "Cement grout (5kg bag)" }),
        quantity: bags,
        quantityRaw: totalGroutKg,
        unit: Unit.BAG,
        unitPrice: round2(prices.groutBag),
        totalPrice: round2(costGrout),
        category: CalculatorType.TILES,
        details: t("calc.tile.mat.grout_details", {
          jw,
          kg: totalGroutKg.toFixed(1),
          defaultValue: `Width: ${jw}mm • ≈ ${totalGroutKg.toFixed(1)} kg`,
        }),
      });
    }

    // --- Primer ---
    if (usePrimer) {
      const liters = Math.max(1, Math.ceil(totalArea / 8));
      const costPrimer = liters * prices.primerL;
      totalCost += costPrimer;

      materials.push({
        id: "primer",
        name: t("calc.tile.mat.primer", { defaultValue: "Primer" }),
        quantity: liters,
        quantityRaw: liters,
        unit: Unit.LITER,
        unitPrice: round2(prices.primerL),
        totalPrice: round2(costPrimer),
        category: CalculatorType.TILES,
      });
    }

    // --- Waterproofing (SPEC) ---
    if (wetArea > 0 && useWaterproofing) {
      const kits = Math.max(1, Math.ceil(wetArea / 6));
      const costSpec = kits * prices.specKit;
      totalCost += costSpec;

      materials.push({
        id: "spec",
        name: t("calc.tile.mat.spec", { defaultValue: "Waterproofing kit (SPEC)" }),
        quantity: kits,
        quantityRaw: wetArea,
        unit: Unit.BOX,
        unitPrice: round2(prices.specKit),
        totalPrice: round2(costSpec),
        category: CalculatorType.TILES,
        details: t("calc.tile.mat.spec_details", {
          wet: wetArea.toFixed(1),
          defaultValue: `Wet areas: ${wetArea.toFixed(1)} m²`,
        }),
      });
    } else if (wetArea > 0 && !useWaterproofing) {
      warnings.push(t("calc.tile.warn_wet_no_spec", { defaultValue: "Wet area detected without waterproofing (SPEC)." }));
    }

    // --- Skirting ---
    if (useSkirting && totalPerimeter > 0) {
      const lm = Math.ceil(totalPerimeter * 1.05);
      const costSkirt = lm * prices.skirtingM;
      totalCost += costSkirt;

      materials.push({
        id: "skirting",
        name: t("calc.tile.mat.skirting", { defaultValue: "Skirting" }),
        quantity: lm,
        quantityRaw: totalPerimeter,
        unit: Unit.METER,
        unitPrice: round2(prices.skirtingM),
        totalPrice: round2(costSkirt),
        category: CalculatorType.TILES,
      });
    }

    // --- Leveling system ---
    if (useLevelingSystem) {
      const tileArea = Math.max(0.01, (tileLength / 100) * (tileWidth / 100));
      const tilesCount = totalArea / tileArea;
      const clipsCount = Math.ceil(tilesCount * 4);
      const bags = Math.max(1, Math.ceil(clipsCount / 250));
      const costLev = bags * prices.levelingKit;
      totalCost += costLev;

      materials.push({
        id: "leveling",
        name: t("calc.tile.mat.leveling", { defaultValue: "Leveling system (clips)" }),
        quantity: bags,
        quantityRaw: clipsCount,
        unit: Unit.BAG,
        unitPrice: round2(prices.levelingKit),
        totalPrice: round2(costLev),
        category: CalculatorType.TILES,
        details: t("calc.tile.mat.leveling_details", {
          clips: clipsCount,
          defaultValue: `≈ ${clipsCount} clips`,
        }),
      });
    }

    // --- Labor ---
    if (proMode) {
      const labTiling = totalArea * prices.laborM2;
      const labSkirt = (useSkirting ? totalPerimeter : 0) * prices.laborSkirting;
      const labSpec = (useWaterproofing ? wetArea : 0) * prices.laborSpec;

      totalCost += labTiling + labSkirt + labSpec;

      materials.push({
        id: "labor_tiling",
        name: t("calc.tile.mat.labor_tiling", { defaultValue: "Labor (tiling)" }),
        quantity: round2(totalArea),
        unit: Unit.M2,
        unitPrice: round2(prices.laborM2),
        totalPrice: round2(labTiling),
        category: CalculatorType.TILES,
      });

      if (labSkirt > 0) {
        materials.push({
          id: "labor_skirt",
          name: t("calc.tile.mat.labor_skirting", { defaultValue: "Labor (skirting)" }),
          quantity: round2(totalPerimeter),
          unit: Unit.METER,
          unitPrice: round2(prices.laborSkirting),
          totalPrice: round2(labSkirt),
          category: CalculatorType.TILES,
        });
      }

      if (labSpec > 0) {
        materials.push({
          id: "labor_spec",
          name: t("calc.tile.mat.labor_spec", { defaultValue: "Labor (waterproofing)" }),
          quantity: round2(wetArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborSpec),
          totalPrice: round2(labSpec),
          category: CalculatorType.TILES,
        });
      }
    }

    // --- Warnings (supports) ---
    if (areaOnWood > 0) warnings.push(t("calc.tile.warn_wood", { defaultValue: "Wood substrate: primer + flexible adhesive and/or decoupling recommended." }));
    if (areaOnOldTile > 0) warnings.push(t("calc.tile.warn_old_tile", { defaultValue: "Tiling over old tiles: degrease/sand + bonding primer recommended." }));
    if (autoDoubleSuggested) warnings.push(t("calc.tile.warn_double", { defaultValue: "Large format: double buttering recommended." }));
    if (safeBox <= 0.2) warnings.push(t("calc.tile.warn_box_small", { defaultValue: "m²/box seems too small: please check the value." }));

    return {
      totalArea,
      totalCost: round2(totalCost),
      materials,
      warnings,
      wetArea,
      totalPerimeter,
    };
  }, [
    t,
    zones,
    tileLength,
    tileWidth,
    tileThickness,
    patternDef,
    patternId,
    patternLabel,
    boxSize,
    wastePct,
    glueType,
    combSize,
    doubleGluing,
    jointWidth,
    jointType,
    useLevelingSystem,
    useSkirting,
    useWaterproofing,
    usePrimer,
    prices,
    proMode,
    autoDoubleSuggested,
    glueTypeLabel,
  ]);

  // Pass results
  useEffect(() => {
    onCalculate({
      summary: t("calc.tile.summary", {
        area: calculationData.totalArea.toFixed(1),
        defaultValue: `${calculationData.totalArea.toFixed(1)} m²`,
      }),
      details: [
        { label: t("calc.tile.detail.total_area", { defaultValue: "Total area" }), value: calculationData.totalArea.toFixed(1), unit: "m²" },
        { label: t("calc.tile.detail.format", { defaultValue: "Format" }), value: `${tileLength}x${tileWidth}`, unit: "cm" },
        { label: t("calc.tile.detail.pattern", { defaultValue: "Pattern" }), value: patternLabel, unit: "" },
        { label: t("calc.tile.detail.wet_area", { defaultValue: "Wet areas" }), value: calculationData.wetArea.toFixed(1), unit: "m²" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, t, tileLength, tileWidth, patternLabel]);

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
            {stepLabel(s)}
          </button>
        ))}
      </div>

      {/* Warnings */}
      {calculationData.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-xs text-amber-800">
          <AlertTriangle size={16} className="mr-2 shrink-0" />
          <div className="space-y-1">
            {calculationData.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: ZONES */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Home size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.tile.ui.step1_hint", { defaultValue: "Define the areas to tile (floors and walls)." })}
          </div>

          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-700 flex items-center">
                    {z.type === "floor" ? (
                      <AlignLeft size={14} className="mr-1 rotate-90" />
                    ) : (
                      <AlignLeft size={14} className="mr-1" />
                    )}
                    {z.label}
                  </span>
                  <span className="text-xs text-slate-500">
                    {t("calc.tile.ui.zone_line", {
                      area: z.area,
                      perim: z.type === "floor" ? z.perimeter.toFixed(1) : "",
                      wet: z.isWet ? t("calc.tile.ui.wet", { defaultValue: "Wet" }) : "",
                      substrate: substrateLabel(z.substrate),
                      type: zoneTypeLabel(z.type),
                      defaultValue: `${z.area} m²`,
                    })}
                    {z.type === "floor" ? ` • ${t("calc.tile.ui.perimeter_short", { defaultValue: "P" })}: ${z.perimeter.toFixed(1)}m` : ""}
                    {z.isWet ? <span className="text-blue-600 font-bold"> • {t("calc.tile.ui.wet", { defaultValue: "Wet" })}</span> : null}
                    {" • "}
                    {substrateLabel(z.substrate)}
                  </span>
                </div>
                <button type="button" onClick={() => removeZone(z.id)} className="text-red-400 p-2" aria-label={t("common.remove", { defaultValue: "Remove" })}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-4 italic">
                {t("calc.tile.ui.no_zone", { defaultValue: "No zone added." })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
            <div className="flex bg-white rounded p-1 mb-3 border border-slate-200">
              <button
                type="button"
                onClick={() => setNewZoneType("floor")}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${
                  newZoneType === "floor" ? "bg-blue-100 text-blue-700" : "text-slate-500"
                }`}
              >
                {zoneTypeLabel("floor")}
              </button>
              <button
                type="button"
                onClick={() => setNewZoneType("wall")}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${
                  newZoneType === "wall" ? "bg-blue-100 text-blue-700" : "text-slate-500"
                }`}
              >
                {zoneTypeLabel("wall")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder={t("calc.tile.ui.ph_name", { defaultValue: "Name" })}
                value={newZoneLabel}
                onChange={(e) => setNewZoneLabel(e.target.value)}
                className="col-span-2 w-full p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder={t("calc.tile.ui.ph_area", { defaultValue: "Area (m²)" })}
                value={newZoneArea}
                onChange={(e) => setNewZoneArea(e.target.value)}
                className="w-full p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder={t("calc.tile.ui.ph_perimeter", { defaultValue: "Perimeter (m) (skirting)" })}
                value={newZonePerim}
                onChange={(e) => setNewZonePerim(e.target.value)}
                className="w-full p-2 text-xs border rounded bg-white text-slate-900"
                disabled={newZoneType !== "floor"}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={newZoneSubstrate}
                onChange={(e) => setNewZoneSubstrate(e.target.value as any)}
                className="w-full p-2 text-xs border rounded bg-white text-slate-900"
              >
                <option value="screed">{substrateLabel("screed")}</option>
                <option value="tile">{substrateLabel("tile")}</option>
                <option value="plaster">{substrateLabel("plaster")}</option>
                <option value="wood">{substrateLabel("wood")}</option>
              </select>

              <label className="flex items-center space-x-2 px-2">
                <input
                  type="checkbox"
                  checked={newZoneWet}
                  onChange={(e) => setNewZoneWet(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-xs text-slate-600">{t("calc.tile.ui.wet_zone", { defaultValue: "Wet area" })}</span>
              </label>
            </div>

            <button
              type="button"
              onClick={addZone}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs flex justify-center items-center"
            >
              <Plus size={14} className="mr-1" /> {t("calc.tile.ui.add_zone", { defaultValue: "Add zone" })}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center mt-2"
          >
            {t("common.next", { defaultValue: "Next" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: TILES SPECS */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Grid3X3 size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.tile.ui.step2_hint", { defaultValue: "Tile format and pattern." })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.tile.ui.length_cm", { defaultValue: "Length (cm)" })}</label>
              <input
                type="number"
                value={tileLength}
                onChange={(e) => setTileLength(clamp(toNum(e.target.value, 60), 1, 200))}
                className="w-full p-2 border rounded bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.tile.ui.width_cm", { defaultValue: "Width (cm)" })}</label>
              <input
                type="number"
                value={tileWidth}
                onChange={(e) => setTileWidth(clamp(toNum(e.target.value, 60), 1, 200))}
                className="w-full p-2 border rounded bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.tile.ui.thickness_mm", { defaultValue: "Thickness (mm)" })}</label>
              <input
                type="number"
                value={tileThickness}
                onChange={(e) => setTileThickness(clamp(toNum(e.target.value, 9), 4, 30))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.tile.ui.box_m2", { defaultValue: "m² / box" })}</label>
              <input
                type="number"
                value={boxSize}
                onChange={(e) => setBoxSize(clamp(toNum(e.target.value, 1.44), 0.1, 10))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t("calc.tile.ui.pattern", { defaultValue: "Pattern" })}</label>
            <div className="grid grid-cols-3 gap-2">
              {(TILE_PATTERNS || []).map((p: any) => {
                const lbl = t(`calc.tile.pattern.${String(p.id)}`, { defaultValue: String(p.label ?? p.id) });
                const w = toNum(p.waste, 10);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPatternId(p.id)}
                    className={`p-2 rounded border text-xs font-medium text-center ${
                      patternId === p.id
                        ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    {lbl}
                    <span className="block text-[10px] opacity-70">
                      {t("calc.tile.ui.waste_add", { pct: w, defaultValue: `+${w}%` })}
                    </span>
                  </button>
                );
              })}
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

      {/* STEP 3: GLUE & GROUT */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.tile.ui.step3_hint", { defaultValue: "Adhesive, grout and leveling." })}
          </div>

          {autoDoubleSuggested && (
            <div className="flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              {t("calc.tile.ui.double_suggested", { defaultValue: "Large format detected: double buttering recommended." })}
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.tile.ui.glue_title", { defaultValue: "Adhesive" })}</h4>

            <div className="flex justify-between items-center bg-white p-2 rounded border">
              <span className="text-sm font-medium">{t("calc.tile.ui.double_glue", { defaultValue: "Double buttering" })}</span>
              <input type="checkbox" checked={doubleGluing} onChange={(e) => setDoubleGluing(e.target.checked)} className="h-5 w-5 rounded text-blue-600" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("calc.tile.ui.glue_type", { defaultValue: "Adhesive type" })}</label>
                <select value={glueType} onChange={(e) => setGlueType(e.target.value as any)} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                  <option value="C2">{glueTypeLabel("C2")}</option>
                  <option value="Flex">{glueTypeLabel("Flex")}</option>
                  <option value="Dispersion">{glueTypeLabel("Dispersion")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("calc.tile.ui.comb_mm", { defaultValue: "Notch trowel (mm)" })}</label>
                <select value={combSize} onChange={(e) => setCombSize(clamp(toNum(e.target.value, 10), 4, 14))} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                  {[6, 8, 10, 12].map((v) => (
                    <option key={v} value={v}>
                      {v} mm
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.tile.ui.grout_title", { defaultValue: "Grout & accessories" })}</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("calc.tile.ui.joint_width_mm", { defaultValue: "Joint width (mm)" })}</label>
                <input type="number" value={jointWidth} onChange={(e) => setJointWidth(clamp(toNum(e.target.value, 3), 1, 15))} className="w-full p-2 border rounded bg-white text-sm text-slate-900" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">{t("calc.tile.ui.joint_type", { defaultValue: "Type" })}</label>
                <select value={jointType} onChange={(e) => setJointType(e.target.value as any)} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                  <option value="cement">{jointTypeLabel("cement")}</option>
                  <option value="epoxy">{jointTypeLabel("epoxy")}</option>
                </select>
              </div>
            </div>

            <label className="flex items-center space-x-2 pt-1">
              <input type="checkbox" checked={useLevelingSystem} onChange={(e) => setUseLevelingSystem(e.target.checked)} className="rounded text-blue-600" />
              <span className="text-sm text-slate-700">{t("calc.tile.ui.leveling", { defaultValue: "Leveling system" })}</span>
            </label>
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

      {/* STEP 4: FINISHES */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <PaintBucket size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.tile.ui.step4_hint", { defaultValue: "Primer, waterproofing and skirting." })}
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">{t("calc.tile.ui.primer", { defaultValue: "Primer" })}</span>
                <p className="text-[10px] text-slate-400">{t("calc.tile.ui.primer_help", { defaultValue: "Recommended on porous substrate / renovation" })}</p>
              </div>
              <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700 flex items-center">
                  <Droplets size={14} className="mr-1 text-blue-500" /> {t("calc.tile.ui.spec", { defaultValue: "Waterproofing (SPEC)" })}
                </span>
                <p className="text-[10px] text-slate-400">{t("calc.tile.ui.spec_help", { defaultValue: "Wet areas only" })}</p>
              </div>
              <input type="checkbox" checked={useWaterproofing} onChange={(e) => setUseWaterproofing(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">{t("calc.tile.ui.skirting", { defaultValue: "Skirting" })}</span>
                <p className="text-[10px] text-slate-400">{t("calc.tile.ui.skirting_help", { defaultValue: "For floor zones" })}</p>
              </div>
              <input type="checkbox" checked={useSkirting} onChange={(e) => setUseSkirting(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
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

      {/* STEP 5: PRICING */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.tile.ui.step5_hint", { defaultValue: "Adjust unit prices." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.tile.ui.prices_title", { defaultValue: "Unit prices" })}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" />{" "}
                {proMode ? t("common.pro_mode", { defaultValue: "Pro mode" }) : t("common.simple_mode", { defaultValue: "Simple mode" })}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.tile_m2", { defaultValue: "Tiles (€/m²)" })}</label>
                <input type="number" value={prices.tileM2} onChange={(e) => updatePrice("tileM2", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.glue_bag", { defaultValue: "Adhesive (25kg)" })}</label>
                <input type="number" value={prices.glueBag} onChange={(e) => updatePrice("glueBag", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.grout_bag", { defaultValue: "Cement grout (5kg)" })}</label>
                <input type="number" value={prices.groutBag} onChange={(e) => updatePrice("groutBag", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.epoxy_kit", { defaultValue: "Epoxy (3kg kit)" })}</label>
                <input type="number" value={prices.epoxyKit} onChange={(e) => updatePrice("epoxyKit", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
              </div>

              {usePrimer && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.primer_l", { defaultValue: "Primer (€/L)" })}</label>
                  <input type="number" value={prices.primerL} onChange={(e) => updatePrice("primerL", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {useSkirting && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.skirting_m", { defaultValue: "Skirting (€/m)" })}</label>
                  <input type="number" value={prices.skirtingM} onChange={(e) => updatePrice("skirtingM", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {useWaterproofing && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.spec_kit", { defaultValue: "SPEC kit (€)" })}</label>
                  <input type="number" value={prices.specKit} onChange={(e) => updatePrice("specKit", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {useLevelingSystem && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.tile.price.leveling", { defaultValue: "Leveling (box)" })}</label>
                  <input type="number" value={prices.levelingKit} onChange={(e) => updatePrice("levelingKit", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.tile.price.labor_tiling", { defaultValue: "Labor tiling (€/m²)" })}</label>
                  <input type="number" value={prices.laborM2} onChange={(e) => updatePrice("laborM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl" />
                </div>

                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.tile.price.labor_skirting", { defaultValue: "Labor skirting (€/m)" })}</label>
                  <input type="number" value={prices.laborSkirting} onChange={(e) => updatePrice("laborSkirting", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl" />
                </div>

                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.tile.price.labor_spec", { defaultValue: "Labor SPEC (€/m²)" })}</label>
                  <input type="number" value={prices.laborSpec} onChange={(e) => updatePrice("laborSpec", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl" />
                </div>
              </div>
            )}
          </div>

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