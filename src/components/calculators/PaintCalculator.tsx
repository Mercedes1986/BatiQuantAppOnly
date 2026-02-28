import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  PaintBucket,
  Plus,
  Trash2,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  AlertTriangle,
  Eraser,
  CircleDollarSign,
  BoxSelect,
} from "lucide-react";

interface PaintRoom {
  id: string;
  label: string;
  length: number;
  width: number;
  height: number;
  doors: number;
  windows: number;
  includeCeiling: boolean;
  includeWalls: boolean;
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
 * ✅ MAJ:
 * - prix: getUnitPrice > DEFAULT_PRICES > fallback (évite NaN/0)
 * - correction boiseries (portes 2 faces + plinthes)
 * - si aucune surface, pas de "kit outils" automatique
 * - warning si ouvertures > surface murale
 * - UI: portes/fenêtres + toggles murs/plafond par pièce
 */
export const PaintCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Rooms ---
  const [rooms, setRooms] = useState<PaintRoom[]>([]);
  const [newRoomLabel, setNewRoomLabel] = useState("Salon");
  const [newL, setNewL] = useState("");
  const [newW, setNewW] = useState("");
  const [newH, setNewH] = useState("2.5");

  // --- 2. Prep & State ---
  const [substrateState, setSubstrateState] = useState<"good" | "medium" | "bad">("good");
  const [usePrimer, setUsePrimer] = useState(true);
  const [useFiller, setUseFiller] = useState(false);
  const [useSmoothing, setUseSmoothing] = useState(false);

  // --- 3. Paint Specs ---
  const [ceilingLayers, setCeilingLayers] = useState(2);
  const [wallLayers, setWallLayers] = useState(2);
  const [paintTypeWall, setPaintTypeWall] = useState<"acry_mat" | "acry_satin" | "velours">("velours");
  const [paintTypeCeiling, setPaintTypeCeiling] = useState<"acry_mat" | "acry_satin">("acry_mat");
  const [paintWood, setPaintWood] = useState(false);

  // --- 4. Supplies ---
  const [protectFloor, setProtectFloor] = useState(true);
  const [useTape, setUseTape] = useState(true);

  // ✅ helper prix: override catalogue > DEFAULT_PRICES > fallback
  const priceOr = (key: string, fallback: number) => {
    const v = getUnitPrice(key);
    if (typeof v === "number" && !Number.isNaN(v) && v !== 0) return v;

    const d = (DEFAULT_PRICES as any)[key];
    if (d !== undefined) {
      const nd = Number(d);
      if (!Number.isNaN(nd) && nd !== 0) return nd;
    }
    return fallback;
  };

  // --- 5. Pricing ---
  const [prices, setPrices] = useState(() => ({
    primerL: priceOr("PRIMER_LITER", 8), // €/L
    paintWallL: priceOr("PAINT_LITER", 12),
    paintCeilingL: priceOr("PAINT_CEILING_LITER", priceOr("PAINT_LITER", 12) * 0.9),
    paintWoodL: priceOr("PAINT_WOOD_LITER", 25),
    fillerKg: priceOr("FILLER_KG", 4),
    smoothingKg: priceOr("SMOOTHING_KG", 3),
    tapeRoll: priceOr("MASKING_TAPE_ROLL", 4),
    tarpUnit: priceOr("PROTECT_TARP_UNIT", 15),
    kitTools: priceOr("PAINT_TOOLS_KIT", 45),
    laborPrepM2: priceOr("LABOR_PREP_M2", 15),
    laborPaintM2: priceOr("LABOR_PAINT_M2", 25),
  }));

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- Helpers ---
  const addRoom = () => {
    const l = toNum(newL, 0);
    const w = toNum(newW, 0);
    const h = toNum(newH, 0);
    if (!(l > 0) || !(w > 0) || !(h > 0)) return;

    setRooms((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: (newRoomLabel || `Pièce ${prev.length + 1}`).trim(),
        length: l,
        width: w,
        height: h,
        doors: 1,
        windows: 1,
        includeCeiling: true,
        includeWalls: true,
      },
    ]);

    setNewL("");
    setNewW("");
    setNewRoomLabel("Chambre");
  };

  const removeRoom = (id: string) => setRooms((prev) => prev.filter((r) => r.id !== id));
  const updateRoom = (id: string, field: keyof PaintRoom, val: any) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  // Auto-prep suggestions
  useEffect(() => {
    if (substrateState === "good") {
      setUseFiller(false);
      setUseSmoothing(false);
    } else if (substrateState === "medium") {
      setUseFiller(true);
      setUseSmoothing(false);
    } else {
      setUseFiller(true);
      setUseSmoothing(true);
    }
  }, [substrateState]);

  // --- Calculation engine ---
  const calculationData = useMemo(() => {
    let areaWalls = 0;
    let areaCeiling = 0;
    let areaWood = 0;
    let perimeterTotal = 0;
    const warnings: string[] = [];

    // Assumptions
    const DOOR_W = 0.83;
    const DOOR_H = 2.04;
    const WINDOW_W = 1.2;
    const WINDOW_H = 1.25;

    rooms.forEach((r) => {
      const floorArea = r.length * r.width;
      const perimeter = 2 * (r.length + r.width);
      const grossWallArea = perimeter * r.height;

      const doorArea = DOOR_W * DOOR_H;
      const windowArea = WINDOW_W * WINDOW_H;

      const deductions = r.doors * doorArea + r.windows * windowArea;
      const netWallArea = Math.max(0, grossWallArea - deductions);

      if (r.includeWalls) areaWalls += netWallArea;
      if (r.includeCeiling) areaCeiling += floorArea;

      perimeterTotal += perimeter;

      if (paintWood) {
        // portes 2 faces + plinthes ~10cm
        areaWood += r.doors * doorArea * 2;
        areaWood += perimeter * 0.1;
      }

      if (grossWallArea <= 0) warnings.push(`${r.label}: dimensions invalides.`);
      if (deductions > grossWallArea) warnings.push(`${r.label}: trop d'ouvertures → murs à 0 m².`);
    });

    const totalPaintArea = areaWalls + areaCeiling;

    const materialsList: any[] = [];
    let totalCost = 0;

    // Preparation (only if something to paint)
    if (totalPaintArea > 0) {
      if (useFiller) {
        const kgFiller = totalPaintArea * 0.2;
        const qty = Math.max(0, Math.ceil(kgFiller));
        const cost = qty * prices.fillerKg;
        totalCost += cost;
        materialsList.push({
          id: "filler",
          name: "Enduit de rebouchage",
          quantity: qty,
          unit: Unit.KG,
          unitPrice: round2(prices.fillerKg),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      if (useSmoothing) {
        const kgSmooth = totalPaintArea * 1.5;
        const qty = Math.max(0, Math.ceil(kgSmooth));
        const cost = qty * prices.smoothingKg;
        totalCost += cost;
        materialsList.push({
          id: "smooth",
          name: "Enduit de lissage (ratissage)",
          quantity: qty,
          unit: Unit.KG,
          unitPrice: round2(prices.smoothingKg),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      if (usePrimer) {
        const vol = totalPaintArea / 10; // 10 m²/L
        const qty = Math.max(0, Math.ceil(vol));
        const cost = qty * prices.primerL;
        totalCost += cost;
        materialsList.push({
          id: "primer",
          name: "Sous-couche (impression)",
          quantity: qty,
          unit: Unit.LITER,
          unitPrice: round2(prices.primerL),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }
    }

    // Paints (10 m²/L/couche)
    if (areaCeiling > 0) {
      const vol = (areaCeiling * ceilingLayers) / 10;
      const qty = Math.max(0, Math.ceil(vol));
      const cost = qty * prices.paintCeilingL;
      totalCost += cost;
      materialsList.push({
        id: "paint_ceil",
        name: `Peinture plafond (${paintTypeCeiling})`,
        quantity: qty,
        unit: Unit.LITER,
        unitPrice: round2(prices.paintCeilingL),
        totalPrice: round2(cost),
        category: CalculatorType.PAINT,
        details: `${ceilingLayers} couche${ceilingLayers > 1 ? "s" : ""}`,
      });
    }

    if (areaWalls > 0) {
      const vol = (areaWalls * wallLayers) / 10;
      const qty = Math.max(0, Math.ceil(vol));
      const cost = qty * prices.paintWallL;
      totalCost += cost;
      materialsList.push({
        id: "paint_wall",
        name: `Peinture murs (${paintTypeWall})`,
        quantity: qty,
        unit: Unit.LITER,
        unitPrice: round2(prices.paintWallL),
        totalPrice: round2(cost),
        category: CalculatorType.PAINT,
        details: `${wallLayers} couche${wallLayers > 1 ? "s" : ""}`,
      });
    }

    if (areaWood > 0) {
      const vol = (areaWood * 2) / 12; // 2 couches, 12 m²/L
      const qty = Math.max(0, Math.ceil(vol));
      const cost = qty * prices.paintWoodL;
      totalCost += cost;
      materialsList.push({
        id: "paint_wood",
        name: "Peinture boiseries (laque)",
        quantity: qty,
        unit: Unit.LITER,
        unitPrice: round2(prices.paintWoodL),
        totalPrice: round2(cost),
        category: CalculatorType.PAINT,
        details: "2 couches",
      });
    }

    // Consumables + tools (only if something to paint)
    if (totalPaintArea > 0) {
      if (protectFloor) {
        const floorTotal = rooms.reduce((acc, r) => acc + r.length * r.width, 0);
        const tarps = Math.max(0, Math.ceil(floorTotal / 20));
        const cost = tarps * prices.tarpUnit;
        totalCost += cost;
        materialsList.push({
          id: "tarp",
          name: "Bâches de protection",
          quantity: tarps,
          unit: Unit.PIECE,
          unitPrice: round2(prices.tarpUnit),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      if (useTape) {
        const tapeM = perimeterTotal * 3;
        const rolls = Math.max(0, Math.ceil(tapeM / 50));
        const cost = rolls * prices.tapeRoll;
        totalCost += cost;
        materialsList.push({
          id: "tape",
          name: "Ruban de masquage",
          quantity: rolls,
          unit: Unit.PIECE,
          unitPrice: round2(prices.tapeRoll),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      totalCost += prices.kitTools;
      materialsList.push({
        id: "tools",
        name: "Kit rouleaux / pinceaux / bacs",
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: round2(prices.kitTools),
        totalPrice: round2(prices.kitTools),
        category: CalculatorType.PAINT,
      });
    }

    // Labor
    if (proMode && totalPaintArea > 0) {
      const coef = substrateState === "bad" ? 1.5 : 1;
      const costLabPrep = totalPaintArea * prices.laborPrepM2 * coef;
      const costLabPaint = totalPaintArea * prices.laborPaintM2;
      totalCost += costLabPrep + costLabPaint;

      materialsList.push(
        {
          id: "lab_prep",
          name: "Main d'œuvre préparation",
          quantity: round2(totalPaintArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborPrepM2),
          totalPrice: round2(costLabPrep),
          category: CalculatorType.PAINT,
          details: coef > 1 ? "Support dégradé (coef 1.5)" : undefined,
        },
        {
          id: "lab_paint",
          name: "Main d'œuvre mise en peinture",
          quantity: round2(totalPaintArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborPaintM2),
          totalPrice: round2(costLabPaint),
          category: CalculatorType.PAINT,
        }
      );
    }

    if (rooms.length === 0) warnings.push("Ajoutez au moins une pièce.");
    if (totalPaintArea <= 0 && rooms.length > 0) warnings.push("Aucune surface sélectionnée (murs/plafonds).");

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      areaWalls,
      areaCeiling,
      areaWood,
      warnings,
    };
  }, [
    rooms,
    substrateState,
    usePrimer,
    useFiller,
    useSmoothing,
    ceilingLayers,
    wallLayers,
    paintTypeWall,
    paintTypeCeiling,
    paintWood,
    protectFloor,
    useTape,
    prices,
    proMode,
  ]);

  useEffect(() => {
    const totalSurface = calculationData.areaWalls + calculationData.areaCeiling;
    onCalculate({
      summary: `${totalSurface.toFixed(1)} m² à peindre`,
      details: [
        { label: "Surface murs", value: calculationData.areaWalls.toFixed(1), unit: "m²" },
        { label: "Surface plafonds", value: calculationData.areaCeiling.toFixed(1), unit: "m²" },
        {
          label: "État support",
          value: substrateState === "good" ? "Bon" : substrateState === "medium" ? "Moyen" : "Mauvais",
          unit: "",
        },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, substrateState]);

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
            {s === 1 && "1. Zones"}
            {s === 2 && "2. État"}
            {s === 3 && "3. Peinture"}
            {s === 4 && "4. Outils"}
            {s === 5 && "5. Devis"}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez les pièces pour calculer précisément murs et plafonds.
          </div>

          <div className="space-y-3">
            {rooms.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-700">{r.label}</span>
                  <button type="button" onClick={() => removeRoom(r.id)} className="text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="text-xs text-slate-500 mb-2">
                  {r.length}×{r.width} m • H: {r.height} m
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-between bg-slate-50 border rounded p-2">
                    <span>Portes</span>
                    <input
                      type="number"
                      min={0}
                      value={r.doors}
                      onChange={(e) => updateRoom(r.id, "doors", clamp(toNum(e.target.value, 0), 0, 20))}
                      className="w-16 p-1 border rounded bg-white text-right"
                    />
                  </label>
                  <label className="flex items-center justify-between bg-slate-50 border rounded p-2">
                    <span>Fenêtres</span>
                    <input
                      type="number"
                      min={0}
                      value={r.windows}
                      onChange={(e) => updateRoom(r.id, "windows", clamp(toNum(e.target.value, 0), 0, 50))}
                      className="w-16 p-1 border rounded bg-white text-right"
                    />
                  </label>
                </div>

                <div className="flex gap-3 border-t pt-2 mt-2">
                  <label className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={r.includeCeiling}
                      onChange={(e) => updateRoom(r.id, "includeCeiling", e.target.checked)}
                      className="mr-1 rounded text-blue-600"
                    />
                    Plafond
                  </label>
                  <label className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={r.includeWalls}
                      onChange={(e) => updateRoom(r.id, "includeWalls", e.target.checked)}
                      className="mr-1 rounded text-blue-600"
                    />
                    Murs
                  </label>
                </div>
              </div>
            ))}

            <div className="bg-slate-50 p-3 rounded-lg border border-blue-200">
              <input
                type="text"
                placeholder="Nom (ex: Salon)"
                value={newRoomLabel}
                onChange={(e) => setNewRoomLabel(e.target.value)}
                className="w-full p-2 mb-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="number"
                  placeholder="L (m)"
                  value={newL}
                  onChange={(e) => setNewL(e.target.value)}
                  className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                />
                <input
                  type="number"
                  placeholder="l (m)"
                  value={newW}
                  onChange={(e) => setNewW(e.target.value)}
                  className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                />
                <input
                  type="number"
                  placeholder="H (m)"
                  value={newH}
                  onChange={(e) => setNewH(e.target.value)}
                  className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={addRoom}
                className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm flex justify-center items-center"
              >
                <Plus size={16} className="mr-1" /> Ajouter
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Eraser size={16} className="mr-2 shrink-0 mt-0.5" />
            État des supports et préparation.
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">État général</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSubstrateState("good")}
                className={`p-2 rounded border text-xs font-bold ${
                  substrateState === "good" ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-white"
                }`}
              >
                Bon
              </button>
              <button
                type="button"
                onClick={() => setSubstrateState("medium")}
                className={`p-2 rounded border text-xs font-bold ${
                  substrateState === "medium" ? "bg-amber-50 border-amber-500 text-amber-800" : "bg-white"
                }`}
              >
                Moyen
              </button>
              <button
                type="button"
                onClick={() => setSubstrateState("bad")}
                className={`p-2 rounded border text-xs font-bold ${
                  substrateState === "bad" ? "bg-red-50 border-red-500 text-red-800" : "bg-white"
                }`}
              >
                Mauvais
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Préparation</h4>

            <label className="flex items-center justify-between">
              <span className="text-sm">Rebouchage (trous)</span>
              <input type="checkbox" checked={useFiller} onChange={(e) => setUseFiller(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">Lissage / ratissage</span>
              <input type="checkbox" checked={useSmoothing} onChange={(e) => setUseSmoothing(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm block">Sous-couche (impression)</span>
                <span className="text-[10px] text-slate-400">Bloque le fond et uniformise</span>
              </div>
              <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

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
            <PaintBucket size={16} className="mr-2 shrink-0 mt-0.5" />
            Configuration des finitions.
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Plafonds</h4>
            <div className="flex gap-2">
              <select value={paintTypeCeiling} onChange={(e) => setPaintTypeCeiling(e.target.value as any)} className="flex-1 p-2 text-sm border rounded bg-white text-slate-900">
                <option value="acry_mat">Mat</option>
                <option value="acry_satin">Satin</option>
              </select>
              <select value={ceilingLayers} onChange={(e) => setCeilingLayers(toNum(e.target.value, 2))} className="w-24 p-2 text-sm border rounded bg-white text-slate-900">
                <option value={1}>1 couche</option>
                <option value={2}>2 couches</option>
                <option value={3}>3 couches</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Murs</h4>
            <div className="flex gap-2">
              <select value={paintTypeWall} onChange={(e) => setPaintTypeWall(e.target.value as any)} className="flex-1 p-2 text-sm border rounded bg-white text-slate-900">
                <option value="acry_mat">Mat</option>
                <option value="velours">Velours</option>
                <option value="acry_satin">Satin</option>
              </select>
              <select value={wallLayers} onChange={(e) => setWallLayers(toNum(e.target.value, 2))} className="w-24 p-2 text-sm border rounded bg-white text-slate-900">
                <option value={1}>1 couche</option>
                <option value={2}>2 couches</option>
                <option value={3}>3 couches</option>
              </select>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-700">Peindre boiseries (portes + plinthes)</span>
              <input type="checkbox" checked={paintWood} onChange={(e) => setPaintWood(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
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
            <BoxSelect size={16} className="mr-2 shrink-0 mt-0.5" />
            Protections et consommables.
          </div>

          <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
              <div>
                <span className="text-sm font-medium block">Protection sol (bâches)</span>
                <span className="text-[10px] text-slate-400">Basé sur surfaces au sol</span>
              </div>
              <input type="checkbox" checked={protectFloor} onChange={(e) => setProtectFloor(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
              <div>
                <span className="text-sm font-medium block">Ruban masquage</span>
                <span className="text-[10px] text-slate-400">Estimation périmètres</span>
              </div>
              <input type="checkbox" checked={useTape} onChange={(e) => setUseTape(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <div className="p-2 bg-slate-50 rounded text-xs text-slate-600">
              Kit outillage inclus (rouleaux, pinceaux, bacs) : {round2(prices.kitTools)}€
            </div>
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
                <label className="block text-[10px] text-slate-500 mb-1">Peinture murs (€/L)</label>
                <input type="number" value={prices.paintWallL} onChange={(e) => updatePrice("paintWallL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Peinture plafonds (€/L)</label>
                <input type="number" value={prices.paintCeilingL} onChange={(e) => updatePrice("paintCeilingL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              {usePrimer && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Sous-couche (€/L)</label>
                  <input type="number" value={prices.primerL} onChange={(e) => updatePrice("primerL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              {useFiller && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Enduit rebouchage (€/kg)</label>
                  <input type="number" value={prices.fillerKg} onChange={(e) => updatePrice("fillerKg", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              {useSmoothing && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Enduit lissage (€/kg)</label>
                  <input type="number" value={prices.smoothingKg} onChange={(e) => updatePrice("smoothingKg", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Bâche (€/u)</label>
                <input type="number" value={prices.tarpUnit} onChange={(e) => updatePrice("tarpUnit", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Ruban (€/rlx)</label>
                <input type="number" value={prices.tapeRoll} onChange={(e) => updatePrice("tapeRoll", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              {paintWood && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Peinture boiseries (€/L)</label>
                  <input type="number" value={prices.paintWoodL} onChange={(e) => updatePrice("paintWoodL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO prépa (€/m²)</label>
                  <input type="number" value={prices.laborPrepM2} onChange={(e) => updatePrice("laborPrepM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO peinture (€/m²)</label>
                  <input type="number" value={prices.laborPaintM2} onChange={(e) => updatePrice("laborPaintM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
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
              Retour
            </button>
            <button type="button" disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> Calculé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};