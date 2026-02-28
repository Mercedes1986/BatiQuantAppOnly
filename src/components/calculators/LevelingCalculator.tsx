import React, { useEffect, useMemo, useState } from "react";
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
  substrate: string; // 'concrete', 'tile', 'wood', 'anhydrite', ...
  thicknessMode: ThicknessMode;
  thicknessVal: number; // mm (avg)
  thicknessMin?: number; // mm
  thicknessMax?: number; // mm
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
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones ---
  const [zones, setZones] = useState<LevelingZone[]>([]);
  const [newZoneLabel, setNewZoneLabel] = useState("Salon");
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
    meshRoll: priceOr("MESH_FIBERGLASS_ROLL_50M2", 40), // roll ~50m²
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

    if (newZoneThicknessMode === "avg") {
      const th = toNum(newZoneThickAvg, 0);
      if (!(th > 0)) return;

      setZones((prev) => [
        ...prev,
        {
          id,
          label: (newZoneLabel || "Zone").trim(),
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
          label: (newZoneLabel || "Zone").trim(),
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

  // --- Auto recommendations (non-destructive) ---
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
      ((LEVELING_PRODUCTS as any[])[0] as any) ||
      { id: "standard", label: "Standard", minThick: 1, maxThick: 50, density: 1.6 };

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

      if (th < minTh) warnings.push(`${z.label}: épaisseur ${th}mm trop faible pour ${productDef.label}.`);
      if (th > maxTh) warnings.push(`${z.label}: épaisseur ${th}mm trop élevée pour ${productDef.label}.`);

      if (z.thicknessMode === "minmax" && z.thicknessMin !== undefined && z.thicknessMax !== undefined) {
        if (z.thicknessMax - z.thicknessMin >= 10) {
          warnings.push(`${z.label}: écart min/max important (${z.thicknessMin}-${z.thicknessMax}mm) → prévoir passes.`);
        }
      }

      if (z.substrate === "wood" && !useMesh) warnings.push(`${z.label}: support bois → treillis conseillé.`);
      if (z.substrate === "tile" && !usePrimer) warnings.push(`${z.label}: carrelage → primaire conseillé.`);
    });

    const totalWeightWithWaste = totalWeight * (1 + wastePct / 100);

    // Compound
    const bags = totalWeightWithWaste > 0 ? Math.ceil(totalWeightWithWaste / bagSize) : 0;
    const pricePerBag = productId === "fibre" ? prices.compoundFibre : prices.compoundBag;
    const costCompound = bags * pricePerBag;

    if (bags > 0) {
      materialsList.push({
        id: "compound",
        name: `Ragréage ${productDef.label}`,
        quantity: bags,
        quantityRaw: totalWeightWithWaste,
        unit: Unit.BAG,
        unitPrice: round2(pricePerBag),
        totalPrice: round2(costCompound),
        category: CalculatorType.RAGREAGE,
        details: `${totalWeightWithWaste.toFixed(0)}kg • sac ${bagSize}kg`,
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
        name: `Primaire d'accrochage (${primerLayers} couche${primerLayers > 1 ? "s" : ""})`,
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
        name: "Treillis de verre (renfort)",
        quantity: rolls,
        quantityRaw: meshArea,
        unit: Unit.ROLL,
        unitPrice: round2(prices.meshRoll),
        totalPrice: round2(costMesh),
        category: CalculatorType.RAGREAGE,
        details: "≈ 50m² / rouleau",
      });
    }

    // Peripheral band
    let costBand = 0;
    if (usePeripheralBand && perimeterTotal > 0) {
      const len = Math.ceil(perimeterTotal * 1.05);
      costBand = len * prices.bandM;

      materialsList.push({
        id: "band",
        name: "Bande périphérique",
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
          name: "Main d’œuvre – préparation",
          quantity: round2(totalArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborPrep),
          totalPrice: round2(labPrep),
          category: CalculatorType.RAGREAGE,
        },
        {
          id: "lab_app",
          name: "Main d’œuvre – coulage ragréage",
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
    if (zones.length === 0) warnings.push("Ajoutez au moins une zone pour obtenir un calcul.");

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      totalArea,
      avgThick,
      warnings,
      bags,
      totalWeightWithWaste,
      productLabel: String(productDef.label ?? "Ragréage"),
    };
  }, [
    zones,
    productId,
    bagSize,
    wastePct,
    usePrimer,
    primerLayers,
    usePeripheralBand,
    useMesh,
    prices,
    proMode,
  ]);

  useEffect(() => {
    onCalculate({
      summary: `${calculationData.totalArea.toFixed(1)} m² de ragréage`,
      details: [
        { label: "Surface", value: calculationData.totalArea.toFixed(1), unit: "m²" },
        { label: "Épaisseur moy.", value: calculationData.avgThick.toFixed(1), unit: "mm" },
        { label: "Produit", value: calculationData.productLabel, unit: "" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Zones"}
            {s === 2 && "2. Produit"}
            {s === 3 && "3. Prép."}
            {s === 4 && "4. Devis"}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <ScanLine size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajoutez les zones à ragréer (support + épaisseur).
          </div>

          <div className="space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div className="min-w-0">
                  <span className="font-bold text-slate-700 block truncate">{z.label}</span>
                  <span className="text-xs text-slate-500">
                    {z.area} m² •{" "}
                    {z.thicknessMode === "avg"
                      ? `${z.thicknessVal} mm`
                      : `${z.thicknessMin}-${z.thicknessMax} mm (moy ${z.thicknessVal.toFixed(1)} mm)`}{" "}
                    • {(LEVELING_SUBSTRATES as any[]).find((s: any) => s.id === z.substrate)?.label || z.substrate}
                  </span>
                </div>
                <button type="button" onClick={() => removeZone(z.id)} className="text-red-400 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {zones.length === 0 && <div className="text-center text-sm text-slate-400 py-4 italic">Aucune zone ajoutée.</div>}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 space-y-2">
            <input
              type="text"
              placeholder="Nom (ex: Salon)"
              value={newZoneLabel}
              onChange={(e) => setNewZoneLabel(e.target.value)}
              className="w-full p-2 text-xs border rounded bg-white text-slate-900"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Surface (m²)"
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
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setNewZoneThicknessMode("avg")}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${newZoneThicknessMode === "avg" ? "bg-white shadow" : "text-slate-500"}`}
              >
                Épaisseur moy.
              </button>
              <button
                type="button"
                onClick={() => setNewZoneThicknessMode("minmax")}
                className={`flex-1 py-1.5 text-xs font-bold rounded ${newZoneThicknessMode === "minmax" ? "bg-white shadow" : "text-slate-500"}`}
              >
                Min / Max
              </button>
            </div>

            {newZoneThicknessMode === "avg" ? (
              <input
                type="number"
                placeholder="Épaisseur (mm)"
                value={newZoneThickAvg}
                onChange={(e) => setNewZoneThickAvg(e.target.value)}
                className="w-full p-2 text-xs border rounded bg-white text-slate-900"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min (mm)"
                  value={newZoneThickMin}
                  onChange={(e) => setNewZoneThickMin(e.target.value)}
                  className="p-2 text-xs border rounded bg-white text-slate-900"
                />
                <input
                  type="number"
                  placeholder="Max (mm)"
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
              <Plus size={14} className="mr-1" /> Ajouter zone
            </button>
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
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            Sélection du ragréage. Auto-reco : <span className="font-bold ml-1">{autoProductLocked ? "ON" : "OFF"}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Produit</h4>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={autoProductLocked} onChange={(e) => setAutoProductLocked(e.target.checked)} />
                Auto
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
                    <span className="font-bold block text-sm">{p.label}</span>
                    <span className="text-[10px] opacity-75">
                      Ép. {p.minThick}-{p.maxThick}mm • densité {p.density} kg/(m²·mm)
                    </span>
                  </div>
                  {productId === p.id && <Check size={16} />}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Sac (kg)</label>
                <select value={bagSize} onChange={(e) => setBagSize(toNum(e.target.value, 25))} className="w-full p-2 border rounded bg-white text-sm text-slate-900">
                  <option value={20}>20 kg</option>
                  <option value={25}>25 kg</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Pertes (%)</label>
                <input
                  type="number"
                  value={wastePct}
                  onChange={(e) => setWastePct(clamp(toNum(e.target.value, 0), 0, 30))}
                  className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                />
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Estimation : <span className="font-bold">{calculationData.bags}</span> sac(s) •{" "}
              <span className="font-bold">{calculationData.totalWeightWithWaste.toFixed(0)} kg</span>
            </div>
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
            <Construction size={16} className="mr-2 shrink-0 mt-0.5" />
            Préparation du support (primaire, bande périphérique, treillis).
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-white border rounded-lg">
              <label className="flex items-center justify-between cursor-pointer mb-2">
                <span className="text-sm font-bold text-slate-700">Primaire d'accrochage</span>
                <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>

              {usePrimer && (
                <div className="pl-2 flex items-center space-x-3">
                  <span className="text-xs text-slate-500">Couches :</span>
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

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">Bande périphérique</span>
                <p className="text-[10px] text-slate-400">Désolidarisation des murs</p>
              </div>
              <input type="checkbox" checked={usePeripheralBand} onChange={(e) => setUsePeripheralBand(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <div>
                <span className="text-sm font-bold text-slate-700">Treillis de verre</span>
                <p className="text-[10px] text-slate-400">Renfort (souvent requis sur bois)</p>
              </div>
              <input type="checkbox" checked={useMesh} onChange={(e) => setUseMesh(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg flex items-start text-xs text-slate-600">
            <Clock size={16} className="mr-2 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block mb-1">Séchage indicatif</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Circulation : 3–4 h</li>
                <li>Carrelage : ~24 h</li>
                <li>Parquet/PVC : 48–72 h</li>
              </ul>
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
                <label className="block text-[10px] text-slate-500 mb-1">Ragréage standard (€/sac)</label>
                <input type="number" value={prices.compoundBag} onChange={(e) => updatePrice("compoundBag", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Ragréage fibré (€/sac)</label>
                <input type="number" value={prices.compoundFibre} onChange={(e) => updatePrice("compoundFibre", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Primaire (€/L)</label>
                <input type="number" value={prices.primerL} onChange={(e) => updatePrice("primerL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              {useMesh && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Treillis (€/rlx)</label>
                  <input type="number" value={prices.meshRoll} onChange={(e) => updatePrice("meshRoll", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              {usePeripheralBand && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Bande (€/m)</label>
                  <input type="number" value={prices.bandM} onChange={(e) => updatePrice("bandM", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO coulage (€/m²)</label>
                  <input type="number" value={prices.laborM2} onChange={(e) => updatePrice("laborM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO prépa (€/m²)</label>
                  <input type="number" value={prices.laborPrep} onChange={(e) => updatePrice("laborPrep", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
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
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
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