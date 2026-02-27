import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES, MESH_TYPES } from "../../constants";
import {
  Layers,
  Plus,
  Trash2,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  Info,
  AlertTriangle,
  Truck,
  CircleDollarSign,
  BoxSelect,
} from "lucide-react";

interface ScreedZone {
  id: string;
  label: string;
  area: number;
  thickness: number; // cm (min if sloped)
  isSloped: boolean;
  slopePct: number; // %
  slopeLen: number; // m
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

type ScreedType = "trad" | "fluid_anh" | "fluid_cem" | "light" | "ravoirage";
type ReinforceType = "none" | "mesh" | "fiber";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const ScreedCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Project & Zones ---
  const [zones, setZones] = useState<ScreedZone[]>([]);
  const [newZoneLabel, setNewZoneLabel] = useState("Pièce 1");
  const [newZoneArea, setNewZoneArea] = useState("");
  const [newZoneThick, setNewZoneThick] = useState("5");

  // --- 2. Tech Specs ---
  const [screedType, setScreedType] = useState<ScreedType>("trad");

  // Underlayers
  const [usePolyane, setUsePolyane] = useState(true);
  const [useStrip, setUseStrip] = useState(true);
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState("4"); // cm (info)

  // Reinforcement & joints
  const [reinforceType, setReinforceType] = useState<ReinforceType>("mesh");
  const [meshTypeId, setMeshTypeId] = useState("ST10");
  const [fiberDosage, setFiberDosage] = useState(0.6); // kg/m3
  const [useJoints, setUseJoints] = useState(true);

  // Mix parameters
  const [cementDosage, setCementDosage] = useState(350); // kg/m3
  const [sandRatio, setSandRatio] = useState(1200); // kg/m3
  const [lightBagVol, setLightBagVol] = useState(15); // L per bag

  // --- 3. Pricing ---
  const [prices, setPrices] = useState({
    cementBag: (DEFAULT_PRICES as any).CEMENT_BAG_35KG ?? 11.5,
    sandTon: (DEFAULT_PRICES as any).SAND_TON ?? 45,
    fiberKg: 15.0,
    polyaneM2: 1.5,
    stripM: 0.8,
    insulM2: 10.0,
    bpeM3: 160.0,
    pumpFlat: 300.0,
    premixBag: 12.0,
    laborM2: 25.0,
    jointM: 3.0,
    primerL: 12.0,

    // mesh: allow dynamic by type
    meshPanel: 5.0, // default fallback (overridden by mesh type if found)
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // Auto: If screed is fluid, reinforcement typically fiber (or none) depending project
  useEffect(() => {
    if (screedType === "fluid_anh" || screedType === "fluid_cem") {
      // keep user's choice; but default to fiber if mesh selected and no zones yet
      if (zones.length === 0 && reinforceType === "mesh") setReinforceType("fiber");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screedType]);

  // Helpers
  const addZone = () => {
    const area = toNum(newZoneArea, 0);
    const thick = toNum(newZoneThick, 0);
    if (area <= 0 || thick <= 0) return;

    setZones((prev) => [
      ...prev,
      {
        id: uid(),
        label: newZoneLabel || `Zone ${prev.length + 1}`,
        area,
        thickness: thick,
        isSloped: false,
        slopePct: 1.5,
        slopeLen: 2,
      },
    ]);

    setNewZoneArea("");
    setNewZoneLabel(`Pièce ${zones.length + 2}`);
  };

  const updateZone = (id: string, field: keyof ScreedZone, value: any) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));
  };

  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalArea = 0;
    let totalVolume = 0; // m3
    let totalPerimeter = 0;

    const warnings: string[] = [];
    const materialsList: any[] = [];
    let totalCost = 0;

    // 1) Volumes
    zones.forEach((z) => {
      totalArea += z.area;
      totalPerimeter += Math.sqrt(z.area) * 4;

      let avgThickCm = z.thickness;

      if (z.isSloped) {
        const slopePct = clamp(toNum(z.slopePct, 0), 0, 10); // % (for screed slopes)
        const slopeLen = clamp(toNum(z.slopeLen, 0), 0, 50); // m
        const hMaxCm = z.thickness + slopePct * slopeLen; // NOTE: 1% over 1m = 1cm
        avgThickCm = (z.thickness + hMaxCm) / 2;

        if (hMaxCm > 15) warnings.push(`${z.label}: épaisseur max estimée ${hMaxCm.toFixed(1)} cm (pente forte / longueur élevée).`);
      }

      totalVolume += z.area * (avgThickCm / 100);
    });

    const wasteVol = totalVolume * 1.05;

    // 2) Screed material
    if (screedType === "trad" || screedType === "ravoirage") {
      // For ravoirage: often lighter dosage; we keep same engine but warn and allow user to tweak dosage
      if (screedType === "ravoirage" && cementDosage > 300) {
        warnings.push("Ravoirage : dosage ciment souvent plus faible (≈150–250 kg/m³). Ajuste le dosage si besoin.");
      }

      const cementKg = wasteVol * cementDosage;
      const sandKg = wasteVol * sandRatio;

      const bagsCement = Math.ceil(cementKg / 35);
      const costCement = bagsCement * prices.cementBag;

      const sandTon = sandKg / 1000;
      const costSand = sandTon * prices.sandTon;

      totalCost += costCement + costSand;

      materialsList.push(
        {
          id: "cement",
          name: `Ciment (dosage ${cementDosage} kg/m³)`,
          quantity: bagsCement,
          quantityRaw: cementKg,
          unit: Unit.BAG,
          unitPrice: round2(prices.cementBag),
          totalPrice: round2(costCement),
          category: CalculatorType.SCREED,
          details: "Sacs 35kg",
        },
        {
          id: "sand",
          name: "Sable à chape (0/4)",
          quantity: round2(sandTon),
          quantityRaw: sandKg,
          unit: Unit.TON,
          unitPrice: round2(prices.sandTon),
          totalPrice: round2(costSand),
          category: CalculatorType.SCREED,
        }
      );
    } else if (screedType === "light") {
      const bagsPerM3 = 1000 / Math.max(1, lightBagVol);
      const totalBags = Math.ceil(wasteVol * bagsPerM3);
      const costBags = totalBags * prices.premixBag;

      totalCost += costBags;
      materialsList.push({
        id: "light_mix",
        name: "Chape allégée (sacs)",
        quantity: totalBags,
        quantityRaw: wasteVol,
        unit: Unit.BAG,
        unitPrice: round2(prices.premixBag),
        totalPrice: round2(costBags),
        category: CalculatorType.SCREED,
        details: `≈ ${lightBagVol} L / sac • Vol: ${wasteVol.toFixed(2)} m³`,
      });
    } else {
      // fluid
      const costBpe = wasteVol * prices.bpeM3;
      totalCost += costBpe;
      materialsList.push({
        id: "bpe",
        name: `Chape fluide (${screedType === "fluid_anh" ? "anhydrite" : "ciment"})`,
        quantity: round2(wasteVol),
        quantityRaw: wasteVol,
        unit: Unit.M3,
        unitPrice: round2(prices.bpeM3),
        totalPrice: round2(costBpe),
        category: CalculatorType.SCREED,
      });

      totalCost += prices.pumpFlat;
      materialsList.push({
        id: "pump",
        name: "Forfait pompage",
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: round2(prices.pumpFlat),
        totalPrice: round2(prices.pumpFlat),
        category: CalculatorType.SCREED,
      });
    }

    // 3) Reinforcement
    if (reinforceType === "mesh") {
      const meshDef = (MESH_TYPES || []).find((m: any) => m.id === meshTypeId);
      const coverM2 = meshDef?.coverM2 ?? 2; // default 2 m² per panel
      const meshPrice = meshDef?.price ?? prices.meshPanel;

      const panels = Math.ceil(totalArea / Math.max(0.5, coverM2));
      const costMesh = panels * meshPrice;

      totalCost += costMesh;
      materialsList.push({
        id: "mesh",
        name: `Treillis (${meshDef?.label ?? meshTypeId})`,
        quantity: panels,
        quantityRaw: totalArea,
        unit: Unit.PIECE,
        unitPrice: round2(meshPrice),
        totalPrice: round2(costMesh),
        category: CalculatorType.SCREED,
        details: `≈ ${coverM2} m² / unité`,
      });
    } else if (reinforceType === "fiber") {
      const totalFiberKg = wasteVol * fiberDosage;
      const qtyKg = Math.ceil(totalFiberKg);
      const costFiber = qtyKg * prices.fiberKg;

      totalCost += costFiber;
      materialsList.push({
        id: "fiber",
        name: "Fibres (dosage)",
        quantity: qtyKg,
        quantityRaw: totalFiberKg,
        unit: Unit.KG,
        unitPrice: round2(prices.fiberKg),
        totalPrice: round2(costFiber),
        category: CalculatorType.SCREED,
        details: `${Math.round(fiberDosage * 1000)} g/m³`,
      });
    }

    // 4) Underlayers
    if (usePolyane) {
      const areaPoly = totalArea * 1.15;
      const costPoly = areaPoly * prices.polyaneM2;
      totalCost += costPoly;
      materialsList.push({
        id: "polyane",
        name: "Film polyane",
        quantity: Math.ceil(areaPoly),
        quantityRaw: areaPoly,
        unit: Unit.M2,
        unitPrice: round2(prices.polyaneM2),
        totalPrice: round2(costPoly),
        category: CalculatorType.SCREED,
      });
    }

    if (useStrip) {
      const len = totalPerimeter * 1.05;
      const costStrip = len * prices.stripM;
      totalCost += costStrip;
      materialsList.push({
        id: "strip",
        name: "Bande périphérique",
        quantity: Math.ceil(len),
        quantityRaw: len,
        unit: Unit.METER,
        unitPrice: round2(prices.stripM),
        totalPrice: round2(costStrip),
        category: CalculatorType.SCREED,
      });
    }

    if (useInsulation) {
      const areaIns = totalArea * 1.05;
      const costIns = areaIns * prices.insulM2;
      totalCost += costIns;
      materialsList.push({
        id: "insul",
        name: `Isolant sous chape (${insulThick} cm)`,
        quantity: Math.ceil(areaIns),
        quantityRaw: areaIns,
        unit: Unit.M2,
        unitPrice: round2(prices.insulM2),
        totalPrice: round2(costIns),
        category: CalculatorType.SCREED,
      });
    }

    // 5) Joints (very rough)
    if (useJoints && totalArea > 40) {
      const jointLen = Math.max(0, Math.sqrt(totalArea));
      const costJoint = jointLen * prices.jointM;
      totalCost += costJoint;
      materialsList.push({
        id: "joints",
        name: "Joints de fractionnement",
        quantity: Math.ceil(jointLen),
        quantityRaw: jointLen,
        unit: Unit.METER,
        unitPrice: round2(prices.jointM),
        totalPrice: round2(costJoint),
        category: CalculatorType.SCREED,
      });
    }

    // 6) Labor
    if (proMode) {
      const costLab = totalArea * prices.laborM2;
      totalCost += costLab;
      materialsList.push({
        id: "labor",
        name: "Main d'œuvre (coulage / tirage)",
        quantity: round2(totalArea),
        quantityRaw: totalArea,
        unit: Unit.M2,
        unitPrice: round2(prices.laborM2),
        totalPrice: round2(costLab),
        category: CalculatorType.SCREED,
      });
    }

    const avgThicknessCm = totalArea > 0 ? (totalVolume / totalArea) * 100 : 0;

    // basic warnings
    if (zones.length === 0) warnings.push("Ajoute au moins une zone pour obtenir un calcul.");
    if (avgThicknessCm > 12 && screedType !== "light") warnings.push("Épaisseur moyenne élevée : vérifier charges / temps de séchage.");

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      totalArea,
      totalVolume,
      avgThickness: avgThicknessCm,
      warnings,
    };
  }, [
    zones,
    screedType,
    cementDosage,
    sandRatio,
    lightBagVol,
    reinforceType,
    meshTypeId,
    fiberDosage,
    usePolyane,
    useStrip,
    useInsulation,
    insulThick,
    useJoints,
    prices,
    proMode,
  ]);

  // Pass results
  useEffect(() => {
    onCalculate({
      summary: `${calculationData.totalVolume.toFixed(2)} m³ de chape (${zones.length} zone${zones.length > 1 ? "s" : ""})`,
      details: [
        { label: "Surface", value: calculationData.totalArea.toFixed(1), unit: "m²" },
        { label: "Épaisseur moy.", value: calculationData.avgThickness.toFixed(1), unit: "cm" },
        { label: "Volume", value: calculationData.totalVolume.toFixed(2), unit: "m³" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, zones.length]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Zones"}
            {s === 2 && "2. Couches"}
            {s === 3 && "3. Matériaux"}
            {s === 4 && "4. Devis"}
          </button>
        ))}
      </div>

      {/* STEP 1: ZONES & TYPE */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez le type de chape et les zones à traiter.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type de chape</label>
            <select
              value={screedType}
              onChange={(e) => setScreedType(e.target.value as any)}
              className="w-full p-2.5 border rounded bg-white text-slate-900"
            >
              <option value="trad">Traditionnelle (sable/ciment)</option>
              <option value="fluid_cem">Fluide ciment</option>
              <option value="fluid_anh">Fluide anhydrite</option>
              <option value="light">Allégée (sacs)</option>
              <option value="ravoirage">Ravoirage (mise à niveau)</option>
            </select>
          </div>

          <div className="space-y-3">
            {zones.map((z) => (
              <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-700">{z.label}</span>
                  <button onClick={() => removeZone(z.id)} className="text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-slate-700">
                  <div>{z.area} m²</div>
                  <div>{z.thickness} cm</div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <label className="flex items-center text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={z.isSloped}
                      onChange={(e) => updateZone(z.id, "isSloped", e.target.checked)}
                      className="mr-2 rounded text-blue-600"
                    />
                    Pente (douche / ext.)
                  </label>

                  {z.isSloped && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={z.slopePct}
                        onChange={(e) => updateZone(z.id, "slopePct", toNum(e.target.value, 0))}
                        className="w-12 p-1 border rounded text-xs bg-white text-slate-900"
                        placeholder="%"
                      />
                      <span className="text-xs">% sur</span>
                      <input
                        type="number"
                        value={z.slopeLen}
                        onChange={(e) => updateZone(z.id, "slopeLen", toNum(e.target.value, 0))}
                        className="w-12 p-1 border rounded text-xs bg-white text-slate-900"
                        placeholder="m"
                      />
                      <span className="text-xs">m</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-slate-50 p-3 rounded-lg border border-blue-200">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Nom (ex: Salon)"
                    value={newZoneLabel}
                    onChange={(e) => setNewZoneLabel(e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <input
                  type="number"
                  placeholder="m²"
                  value={newZoneArea}
                  onChange={(e) => setNewZoneArea(e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
                <input
                  type="number"
                  placeholder="Ép. cm"
                  value={newZoneThick}
                  onChange={(e) => setNewZoneThick(e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
                <button
                  onClick={addZone}
                  className="w-full bg-blue-600 text-white rounded font-bold text-sm flex justify-center items-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: UNDERLAYERS */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            Préparation du support avant coulage.
          </div>

          <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
              <span className="text-sm font-medium">Film polyane</span>
              <input
                type="checkbox"
                checked={usePolyane}
                onChange={(e) => setUsePolyane(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
              <span className="text-sm font-medium">Bande périphérique</span>
              <input
                type="checkbox"
                checked={useStrip}
                onChange={(e) => setUseStrip(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <div className="border-t border-slate-100 pt-2">
              <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                <span className="text-sm font-medium">Isolation sous chape</span>
                <input
                  type="checkbox"
                  checked={useInsulation}
                  onChange={(e) => setUseInsulation(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              {useInsulation && (
                <div className="px-2 pb-2">
                  <label className="block text-xs text-slate-500 mb-1">Épaisseur isolant (cm)</label>
                  <input
                    type="number"
                    value={insulThick}
                    onChange={(e) => setInsulThick(e.target.value)}
                    className="w-20 p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MATERIALS & REINFORCEMENT */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <BoxSelect size={16} className="mr-2 shrink-0 mt-0.5" />
            Mortier, renfort et options.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Renfort</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setReinforceType("none")}
                  className={`p-2 border rounded text-xs font-bold ${
                    reinforceType === "none"
                      ? "bg-stone-100 border-stone-500 text-stone-800"
                      : "bg-white text-slate-500"
                  }`}
                >
                  Aucun
                </button>
                <button
                  onClick={() => setReinforceType("mesh")}
                  className={`p-2 border rounded text-xs font-bold ${
                    reinforceType === "mesh"
                      ? "bg-stone-100 border-stone-500 text-stone-800"
                      : "bg-white text-slate-500"
                  }`}
                >
                  Treillis
                </button>
                <button
                  onClick={() => setReinforceType("fiber")}
                  className={`p-2 border rounded text-xs font-bold ${
                    reinforceType === "fiber"
                      ? "bg-stone-100 border-stone-500 text-stone-800"
                      : "bg-white text-slate-500"
                  }`}
                >
                  Fibres
                </button>
              </div>

              {reinforceType === "mesh" && (
                <div className="mt-2">
                  <label className="block text-xs text-slate-500 mb-1">Type de treillis</label>
                  <select
                    value={meshTypeId}
                    onChange={(e) => setMeshTypeId(e.target.value)}
                    className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                  >
                    {(MESH_TYPES || []).length ? (
                      (MESH_TYPES as any[]).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="ST10">ST10</option>
                        <option value="ST25">ST25</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {reinforceType === "fiber" && (
                <div className="mt-2">
                  <label className="block text-xs text-slate-500 mb-1">Dosage fibres (kg/m³)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fiberDosage}
                    onChange={(e) => setFiberDosage(toNum(e.target.value, 0.6))}
                    className="w-full p-2 border rounded bg-white text-slate-900"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              {screedType === "trad" || screedType === "ravoirage" ? (
                <>
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage ciment (kg/m³)</label>
                    <input
                      type="number"
                      value={cementDosage}
                      onChange={(e) => setCementDosage(Math.max(0, Math.floor(toNum(e.target.value, 350))))}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ratio sable (kg/m³)</label>
                    <input
                      type="number"
                      value={sandRatio}
                      onChange={(e) => setSandRatio(Math.max(0, Math.floor(toNum(e.target.value, 1200))))}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                    />
                  </div>
                </>
              ) : screedType === "light" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Volume par sac (L)</label>
                  <input
                    type="number"
                    value={lightBagVol}
                    onChange={(e) => setLightBagVol(Math.max(1, Math.floor(toNum(e.target.value, 15))))}
                    className="w-full p-2 border rounded bg-white text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Volume de chape fini par sac (mélange prêt).</p>
                </div>
              ) : (
                <div className="flex items-start text-xs text-slate-500">
                  <Truck size={16} className="mr-2 shrink-0" />
                  Livraison toupie + pompe (forfait) inclus.
                </div>
              )}
            </div>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <span className="text-sm font-medium">Joints de fractionnement</span>
              <input
                type="checkbox"
                checked={useJoints}
                onChange={(e) => setUseJoints(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PRICING */}
      {step === 4 && (
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
              {(screedType === "trad" || screedType === "ravoirage") && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Ciment (€/sac 35kg)</label>
                    <input
                      type="number"
                      value={prices.cementBag}
                      onChange={(e) => updatePrice("cementBag", e.target.value)}
                      className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Sable (€/t)</label>
                    <input
                      type="number"
                      value={prices.sandTon}
                      onChange={(e) => updatePrice("sandTon", e.target.value)}
                      className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                    />
                  </div>
                </>
              )}

              {screedType === "light" && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Sac allégé (€/u)</label>
                  <input
                    type="number"
                    value={prices.premixBag}
                    onChange={(e) => updatePrice("premixBag", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {(screedType === "fluid_anh" || screedType === "fluid_cem") && (
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-500 mb-1">Chape fluide (€/m³)</label>
                  <input
                    type="number"
                    value={prices.bpeM3}
                    onChange={(e) => updatePrice("bpeM3", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {reinforceType === "mesh" && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Treillis (€/u)</label>
                  <input
                    type="number"
                    value={prices.meshPanel}
                    onChange={(e) => updatePrice("meshPanel", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {reinforceType === "fiber" && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Fibres (€/kg)</label>
                  <input
                    type="number"
                    value={prices.fiberKg}
                    onChange={(e) => updatePrice("fiberKg", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {usePolyane && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Polyane (€/m²)</label>
                  <input
                    type="number"
                    value={prices.polyaneM2}
                    onChange={(e) => updatePrice("polyaneM2", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}

              {useStrip && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Bande périph. (€/m)</label>
                  <input
                    type="number"
                    value={prices.stripM}
                    onChange={(e) => updatePrice("stripM", e.target.value)}
                    className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO (€/m²)</label>
                  <input
                    type="number"
                    value={prices.laborM2}
                    onChange={(e) => updatePrice("laborM2", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                {(screedType === "fluid_anh" || screedType === "fluid_cem") && (
                  <div>
                    <label className="block text-[10px] text-blue-600 font-bold mb-1">Forfait pompe (€)</label>
                    <input
                      type="number"
                      value={prices.pumpFlat}
                      onChange={(e) => updatePrice("pumpFlat", e.target.value)}
                      className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> Terminé
            </button>
          </div>
        </div>
      )}

      {/* Optional warnings */}
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
    </div>
  );
};