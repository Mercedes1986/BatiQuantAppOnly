import React, { useEffect, useMemo, useState } from "react";
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

/**
 * ✅ MAJ / FIX
 * - Évite NaN (prix, boxSize, surfaces)
 * - Conso colle + primaire + SPEC basées sur surfaces utiles
 * - Pattern label + fallback si TILE_PATTERNS ne contient pas l’id
 * - Auto double encollage non destructif (ne repasse pas à false si l’utilisateur a coché)
 * - Avertissements support (bois/ancien carrelage) + zone humide sans SPEC
 * - Coûts plus cohérents : carrelage au m², cartons (Unit.BOX) avec prix du carton
 */

export const TileCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones ---
  const [zones, setZones] = useState<TileZone[]>([]);
  const [newZoneType, setNewZoneType] = useState<"floor" | "wall">("floor");
  const [newZoneLabel, setNewZoneLabel] = useState("Salon");
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
  const [prices, setPrices] = useState({
    tileM2: getUnitPrice("TILE_M2") || 30,
    glueBag: getUnitPrice("GLUE_BAG_25KG") || 18,
    groutBag: getUnitPrice("GROUT_BAG_5KG") || 12,
    epoxyKit: 60, // 3kg
    primerL: getUnitPrice("PRIMER_LITER") || 10,
    specKit: 75, // kit ~6m2
    levelingKit: getUnitPrice("SPACERS_BOX") || 12, // sachet / boîte
    skirtingM: getUnitPrice("SKIRTING_METER") || 8,
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
        label: (newZoneLabel || (newZoneType === "floor" ? "Sol" : "Mur")).trim(),
        area,
        perimeter: perim,
        isWet: newZoneWet,
        substrate: newZoneSubstrate,
      },
    ]);

    setNewZoneArea("");
    setNewZonePerim("");
    setNewZoneWet(false);
    setNewZoneLabel(newZoneType === "floor" ? "Chambre" : "Douche (Murs)");
    setNewZoneSubstrate("screed");
  };

  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));

  const patternDef = useMemo(() => {
    return TILE_PATTERNS.find((p: any) => p.id === patternId) || TILE_PATTERNS[0] || { id: "straight", label: "Pose droite", waste: 10 };
  }, [patternId]);

  // Waste based on pattern
  useEffect(() => {
    const w = toNum((patternDef as any).waste, 10);
    setWastePct(clamp(w, 0, 30));
  }, [patternDef]);

  // Auto double gluing suggestion (grand format) — non destructif
  const [autoDoubleSuggested, setAutoDoubleSuggested] = useState(false);
  useEffect(() => {
    const isLarge = Math.max(tileLength, tileWidth) >= 45;
    if (isLarge && !doubleGluing) setAutoDoubleSuggested(true);
    if (!isLarge) setAutoDoubleSuggested(false);
  }, [tileLength, tileWidth, doubleGluing]);

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
  warnings: ["Ajoutez au moins une zone."],
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
    const patLabel = String((patternDef as any).label ?? "Pose");

    materials.push({
      id: "tiles",
      name: `Carrelage ${tileLabel} — ${patLabel}`,
      quantity: boxes,
      quantityRaw: areaWithWaste,
      unit: Unit.BOX,
      unitPrice: round2(prices.tileM2 * safeBox), // prix du carton
      totalPrice: round2(costTiles),
      category: CalculatorType.TILES,
      details: `Commandé: ${m2Ordered.toFixed(2)} m² (pertes ${safeWaste}%)`,
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
      name: `Colle ${glueType} (25kg) — peigne ${combSize}mm${doubleGluing ? " + double encollage" : ""}`,
      quantity: glueBags,
      quantityRaw: glueKg,
      unit: Unit.BAG,
      unitPrice: round2(prices.glueBag),
      totalPrice: round2(costGlue),
      category: CalculatorType.TILES,
      details: `Conso ≈ ${glueConsump.toFixed(1)} kg/m² • total ≈ ${glueKg.toFixed(0)} kg`,
    });

    // --- Grout ---
    const L_mm = Math.max(1, tileLength) * 10;
    const W_mm = Math.max(1, tileWidth) * 10;
    const jw = clamp(toNum(jointWidth, 3), 1, 15);
    const th = clamp(toNum(tileThickness, 9), 4, 30);

    // Approx grout kg/m²
    const groutKgM2 = ((L_mm + W_mm) / (L_mm * W_mm)) * jw * th * 1.6;
    const totalGroutKg = totalArea * groutKgM2 * 1.1;

    if (jointType === "epoxy") {
      const kits = Math.ceil(totalGroutKg / 3);
      const costEpoxy = kits * prices.epoxyKit;
      totalCost += costEpoxy;

      materials.push({
        id: "grout_epoxy",
        name: "Joint époxy (kit 3kg)",
        quantity: kits,
        quantityRaw: totalGroutKg,
        unit: Unit.BOX,
        unitPrice: round2(prices.epoxyKit),
        totalPrice: round2(costEpoxy),
        category: CalculatorType.TILES,
        details: `≈ ${totalGroutKg.toFixed(1)} kg`,
      });
    } else {
      const bags = Math.ceil(totalGroutKg / 5);
      const costGrout = bags * prices.groutBag;
      totalCost += costGrout;

      materials.push({
        id: "grout_cem",
        name: `Joint ciment ${jw}mm (sac 5kg)`,
        quantity: bags,
        quantityRaw: totalGroutKg,
        unit: Unit.BAG,
        unitPrice: round2(prices.groutBag),
        totalPrice: round2(costGrout),
        category: CalculatorType.TILES,
        details: `≈ ${totalGroutKg.toFixed(1)} kg`,
      });
    }

    // --- Primer ---
    if (usePrimer) {
      // rule of thumb: 8–10 m²/L. Keep 8 to be conservative.
      const liters = Math.max(1, Math.ceil(totalArea / 8));
      const costPrimer = liters * prices.primerL;
      totalCost += costPrimer;

      materials.push({
        id: "primer",
        name: "Primaire d'accrochage",
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
        name: "Kit étanchéité (SPEC)",
        quantity: kits,
        quantityRaw: wetArea,
        unit: Unit.BOX,
        unitPrice: round2(prices.specKit),
        totalPrice: round2(costSpec),
        category: CalculatorType.TILES,
        details: `Zones humides: ${wetArea.toFixed(1)} m²`,
      });
    } else if (wetArea > 0 && !useWaterproofing) {
      warnings.push("Zone humide détectée sans étanchéité (SPEC).");
    }

    // --- Skirting ---
    if (useSkirting && totalPerimeter > 0) {
      const lm = Math.ceil(totalPerimeter * 1.05);
      const costSkirt = lm * prices.skirtingM;
      totalCost += costSkirt;

      materials.push({
        id: "skirting",
        name: "Plinthes assorties",
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
      const clipsCount = Math.ceil(tilesCount * 4); // ~4 clips/tile (approx)
      const bags = Math.max(1, Math.ceil(clipsCount / 250)); // 250 clips/box
      const costLev = bags * prices.levelingKit;
      totalCost += costLev;

      materials.push({
        id: "leveling",
        name: "Système de nivellement (boîte/sachet)",
        quantity: bags,
        quantityRaw: clipsCount,
        unit: Unit.BAG,
        unitPrice: round2(prices.levelingKit),
        totalPrice: round2(costLev),
        category: CalculatorType.TILES,
        details: `≈ ${clipsCount} clips`,
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
        name: "Main d'œuvre (pose carrelage)",
        quantity: round2(totalArea),
        unit: Unit.M2,
        unitPrice: round2(prices.laborM2),
        totalPrice: round2(labTiling),
        category: CalculatorType.TILES,
      });

      if (labSkirt > 0) {
        materials.push({
          id: "labor_skirt",
          name: "Main d'œuvre (plinthes)",
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
          name: "Main d'œuvre (étanchéité)",
          quantity: round2(wetArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborSpec),
          totalPrice: round2(labSpec),
          category: CalculatorType.TILES,
        });
      }
    }

    // --- Warnings (supports) ---
    if (areaOnWood > 0) warnings.push("Support bois détecté : primaire + colle flex (C2S1) et/ou désolidarisation recommandés.");
    if (areaOnOldTile > 0) warnings.push("Pose sur ancien carrelage : dégraissage/ponçage + primaire d’adhérence recommandés.");
    if (autoDoubleSuggested) warnings.push("Grand format : double encollage recommandé.");
    if (safeBox <= 0.2) warnings.push("m²/carton très faible : vérifiez la valeur du carton.");

    return {
      totalArea,
      totalCost: round2(totalCost),
      materials,
      warnings,
      wetArea,
      totalPerimeter,
    };
  }, [
    zones,
    tileLength,
    tileWidth,
    tileThickness,
    patternDef,
    patternId,
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
  ]);

  // Pass results
  useEffect(() => {
    onCalculate({
      summary: `${calculationData.totalArea.toFixed(1)} m² de carrelage`,
      details: [
        { label: "Surface totale", value: calculationData.totalArea.toFixed(1), unit: "m²" },
        { label: "Format", value: `${tileLength}x${tileWidth}`, unit: "cm" },
        { label: "Pose", value: String((patternDef as any)?.label ?? "Pose"), unit: "" },
        { label: "Zones humides", value: calculationData.wetArea.toFixed(1), unit: "m²" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, tileLength, tileWidth, patternDef]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Zones"}
            {s === 2 && "2. Carreaux"}
            {s === 3 && "3. Pose"}
            {s === 4 && "4. Finitions"}
            {s === 5 && "5. Devis"}
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
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Home size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez les surfaces à carreler (sols et murs).
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
                    {z.area} m²
                    {z.type === "floor" ? ` • P: ${z.perimeter.toFixed(1)}m` : ""}
                    {z.isWet ? <span className="text-blue-600 font-bold"> • Humide</span> : null}
                    {" • "}
                    {z.substrate}
                  </span>
                </div>
                <button onClick={() => removeZone(z.id)} className="text-red-400 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {zones.length === 0 && <div className="text-center text-sm text-slate-400 py-4 italic">Aucune zone ajoutée.</div>}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
            <div className="flex bg-white rounded p-1 mb-3 border border-slate-200">
              <button
                onClick={() => {
                  setNewZoneType("floor");
                  setNewZoneLabel("Sol salon");
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${
                  newZoneType === "floor" ? "bg-blue-100 text-blue-700" : "text-slate-500"
                }`}
              >
                Sol
              </button>
              <button
                onClick={() => {
                  setNewZoneType("wall");
                  setNewZoneLabel("Mur SDB");
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${
                  newZoneType === "wall" ? "bg-blue-100 text-blue-700" : "text-slate-500"
                }`}
              >
                Mur
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input
                type="text"
                placeholder="Nom"
                value={newZoneLabel}
                onChange={(e) => setNewZoneLabel(e.target.value)}
                className="col-span-2 w-full p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder="Surface (m²)"
                value={newZoneArea}
                onChange={(e) => setNewZoneArea(e.target.value)}
                className="w-full p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder="Périm. (m) (plinthes)"
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
                <option value="screed">Chape</option>
                <option value="tile">Ancien carrelage</option>
                <option value="plaster">Plâtre / BA13</option>
                <option value="wood">Bois</option>
              </select>
              <label className="flex items-center space-x-2 px-2">
                <input
                  type="checkbox"
                  checked={newZoneWet}
                  onChange={(e) => setNewZoneWet(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-xs text-slate-600">Zone humide</span>
              </label>
            </div>

            <button
              onClick={addZone}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs flex justify-center items-center"
            >
              <Plus size={14} className="mr-1" /> Ajouter zone
            </button>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: TILES SPECS */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Grid3X3 size={16} className="mr-2 shrink-0 mt-0.5" />
            Format et type de pose.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (cm)</label>
              <input
                type="number"
                value={tileLength}
                onChange={(e) => setTileLength(clamp(toNum(e.target.value, 60), 1, 200))}
                className="w-full p-2 border rounded bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (cm)</label>
              <input
                type="number"
                value={tileWidth}
                onChange={(e) => setTileWidth(clamp(toNum(e.target.value, 60), 1, 200))}
                className="w-full p-2 border rounded bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Épaisseur (mm)</label>
              <input
                type="number"
                value={tileThickness}
                onChange={(e) => setTileThickness(clamp(toNum(e.target.value, 9), 4, 30))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">m² / carton</label>
              <input
                type="number"
                value={boxSize}
                onChange={(e) => setBoxSize(clamp(toNum(e.target.value, 1.44), 0.1, 10))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type de pose</label>
            <div className="grid grid-cols-3 gap-2">
              {(TILE_PATTERNS || []).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setPatternId(p.id)}
                  className={`p-2 rounded border text-xs font-medium text-center ${
                    patternId === p.id
                      ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {String(p.label ?? p.id)}
                  <span className="block text-[10px] opacity-70">+{toNum(p.waste, 10)}%</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: GLUE & GROUT */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            Colle, joints et nivellement.
          </div>

          {autoDoubleSuggested && (
            <div className="flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              Grand format détecté : double encollage recommandé.
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Encollage</h4>

            <div className="flex justify-between items-center bg-white p-2 rounded border">
              <span className="text-sm font-medium">Double encollage</span>
              <input
                type="checkbox"
                checked={doubleGluing}
                onChange={(e) => setDoubleGluing(e.target.checked)}
                className="h-5 w-5 rounded text-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Type colle</label>
                <select
                  value={glueType}
                  onChange={(e) => setGlueType(e.target.value as any)}
                  className="w-full p-2 text-sm border rounded bg-white text-slate-900"
                >
                  <option value="C2">C2 (standard)</option>
                  <option value="Flex">C2S1 (flex)</option>
                  <option value="Dispersion">Dispersion (murs)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Peigne (mm)</label>
                <select
                  value={combSize}
                  onChange={(e) => setCombSize(clamp(toNum(e.target.value, 10), 4, 14))}
                  className="w-full p-2 text-sm border rounded bg-white text-slate-900"
                >
                  <option value={6}>6 mm</option>
                  <option value={8}>8 mm</option>
                  <option value={10}>10 mm</option>
                  <option value={12}>12 mm</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Joints & accessoires</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Largeur (mm)</label>
                <input
                  type="number"
                  value={jointWidth}
                  onChange={(e) => setJointWidth(clamp(toNum(e.target.value, 3), 1, 15))}
                  className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Type</label>
                <select
                  value={jointType}
                  onChange={(e) => setJointType(e.target.value as any)}
                  className="w-full p-2 text-sm border rounded bg-white text-slate-900"
                >
                  <option value="cement">Ciment</option>
                  <option value="epoxy">Époxy</option>
                </select>
              </div>
            </div>

            <label className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                checked={useLevelingSystem}
                onChange={(e) => setUseLevelingSystem(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span className="text-sm text-slate-700">Système de nivellement</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FINISHES */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <PaintBucket size={16} className="mr-2 shrink-0 mt-0.5" />
            Préparation, étanchéité et plinthes.
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">Primaire d'accrochage</span>
                <p className="text-[10px] text-slate-400">Recommandé sur support poreux / rénovation</p>
              </div>
              <input
                type="checkbox"
                checked={usePrimer}
                onChange={(e) => setUsePrimer(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700 flex items-center">
                  <Droplets size={14} className="mr-1 text-blue-500" /> Étanchéité (SPEC)
                </span>
                <p className="text-[10px] text-slate-400">Uniquement zones humides</p>
              </div>
              <input
                type="checkbox"
                checked={useWaterproofing}
                onChange={(e) => setUseWaterproofing(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">Plinthes</span>
                <p className="text-[10px] text-slate-400">Sur les zones sol</p>
              </div>
              <input
                type="checkbox"
                checked={useSkirting}
                onChange={(e) => setUseSkirting(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PRICING */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustez les prix unitaires.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Tarifs unitaires</h4>
              <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? "Mode Pro" : "Mode Simple"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Carrelage (€/m²)</label>
                <input
                  type="number"
                  value={prices.tileM2}
                  onChange={(e) => updatePrice("tileM2", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Colle (25kg)</label>
                <input
                  type="number"
                  value={prices.glueBag}
                  onChange={(e) => updatePrice("glueBag", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Joint ciment (5kg)</label>
                <input
                  type="number"
                  value={prices.groutBag}
                  onChange={(e) => updatePrice("groutBag", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Époxy (kit 3kg)</label>
                <input
                  type="number"
                  value={prices.epoxyKit}
                  onChange={(e) => updatePrice("epoxyKit", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>

              {usePrimer && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Primaire (€/L)</label>
                  <input
                    type="number"
                    value={prices.primerL}
                    onChange={(e) => updatePrice("primerL", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {useSkirting && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Plinthe (€/ml)</label>
                  <input
                    type="number"
                    value={prices.skirtingM}
                    onChange={(e) => updatePrice("skirtingM", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {useWaterproofing && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Kit SPEC (€)</label>
                  <input
                    type="number"
                    value={prices.specKit}
                    onChange={(e) => updatePrice("specKit", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {useLevelingSystem && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Nivellement (boîte)</label>
                  <input
                    type="number"
                    value={prices.levelingKit}
                    onChange={(e) => updatePrice("levelingKit", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose carrelage (€/m²)</label>
                  <input
                    type="number"
                    value={prices.laborM2}
                    onChange={(e) => updatePrice("laborM2", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose plinthes (€/ml)</label>
                  <input
                    type="number"
                    value={prices.laborSkirting}
                    onChange={(e) => updatePrice("laborSkirting", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose SPEC (€/m²)</label>
                  <input
                    type="number"
                    value={prices.laborSpec}
                    onChange={(e) => updatePrice("laborSpec", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> Terminé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};