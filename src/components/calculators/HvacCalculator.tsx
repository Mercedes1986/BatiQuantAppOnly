import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES } from "../../constants";
import {
  Thermometer,
  Wind,
  Plus,
  Trash2,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  Fan,
  Flame,
  Activity,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";

interface HvacZone {
  id: string;
  type: "living" | "bedroom" | "kitchen" | "bathroom" | "wc" | "other";
  label: string;
  area: number;
  powerW: number; // Calculated power need
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

type InsulationLevel = "rt2012" | "renov_good" | "renov_avg" | "poor";
type GeneratorType = "pac_air_water" | "pac_air_air" | "boiler_gas" | "elec_rad";
type EmitterType = "radiator_water" | "floor" | "radiator_elec" | "split";
type VmcType = "simple_auto" | "simple_hygro" | "double_flux";
type DuctType = "flexible" | "rigid";
type PipeType = "per" | "multicouche";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const HvacCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Thermal Context ---
  const [insulationLevel, setInsulationLevel] = useState<InsulationLevel>("renov_good");
  const [ceilingHeight, setCeilingHeight] = useState(2.5);
  const [targetTemp, setTargetTemp] = useState(20);
  const [wattsPerM2, setWattsPerM2] = useState(80); // Auto-updated based on insulation

  // --- 2. Zones (Inventory) ---
  const [zones, setZones] = useState<HvacZone[]>([]);
  const [newZoneType, setNewZoneType] = useState<HvacZone["type"]>("living");
  const [newZoneArea, setNewZoneArea] = useState("");

  // --- 3. Heating System ---
  const [generatorType, setGeneratorType] = useState<GeneratorType>("pac_air_water");
  const [emitterType, setEmitterType] = useState<EmitterType>("radiator_water");

  // Floor heating
  const [floorPitch, setFloorPitch] = useState(15); // cm
  const [floorPipeType, setFloorPipeType] = useState<PipeType>("per"); // per, multicouche

  // --- 4. Ventilation ---
  const [vmcType, setVmcType] = useState<VmcType>("simple_hygro");
  const [ductType, setDuctType] = useState<DuctType>("flexible");
  const [useInsulatedDucts, setUseInsulatedDucts] = useState(true);

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    // Generators
    pacAirWater: 8000,
    pacAirAirExt: 2500, // Groupe ext base (mono)
    pacAirAirIndoor: 800, // Unité intérieure add-on (multisplit)
    boilerGas: 3000,

    // Emitters
    radElec: 200, // Avg unit
    radWater: 300, // Avg unit
    splitUnit: 600, // Indoor unit if you want to count differently than pacAirAirIndoor

    // Floor Heating
    floorPipeM: 1.5, // €/m
    floorCollector: 300, // Nourrice
    floorInsulation: 15, // €/m2

    // VMC
    kitVmcSimple: 150,
    kitVmcHygro: 350,
    kitVmcDouble: 2000,
    ductFlexM: 6, // €/m (non isolé / flexible)
    ductRigidM: 10, // €/m (rigide)
    ductInsulationExtraM: 2, // €/m (surcoût isolation)
    ventUnit: 25, // Bouche supplémentaire
    kitVentsIncluded: 3, // bouches inclues dans un kit

    // Network (hydraulic)
    copperPipeM: 12,
    perPipeM: 2,
    multicouchePipeM: 4,

    // Refrigerant lines (air/air)
    frigoLineM: 25,

    // Labor
    installGenerator: 1500,
    installEmitters: 600,
    installVmc: 300,
    laborVent: 50, // par bouche
  });

  type PricesKey = keyof typeof prices;
  const updatePrice = (key: PricesKey, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- Auto Logic: W/m2 based on Insulation ---
  useEffect(() => {
    switch (insulationLevel) {
      case "rt2012":
        setWattsPerM2(40);
        break;
      case "renov_good":
        setWattsPerM2(70);
        break;
      case "renov_avg":
        setWattsPerM2(100);
        break;
      case "poor":
        setWattsPerM2(140);
        break;
    }
  }, [insulationLevel]);

  // --- Auto Logic: Emitter consistency ---
  useEffect(() => {
    if (generatorType === "elec_rad") setEmitterType("radiator_elec");
    else if (generatorType === "pac_air_air") setEmitterType("split");
    else {
      // Hydraulic systems
      if (emitterType === "radiator_elec" || emitterType === "split") setEmitterType("radiator_water");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatorType]);

  // Recompute room powers when wattsPerM2 changes (or ceiling height if you choose to scale)
  useEffect(() => {
    if (!zones.length) return;
    setZones((prev) =>
      prev.map((z) => {
        const coef = z.type === "bathroom" ? 1.2 : 1;
        // Optional: scale by ceiling height vs 2.5m baseline
        const heightCoef = clamp(toNum(ceilingHeight, 2.5) / 2.5, 0.7, 1.4);
        const power = z.area * wattsPerM2 * coef * heightCoef;
        return { ...z, powerW: Math.ceil(power) };
      })
    );
  }, [wattsPerM2, ceilingHeight]); // keep targetTemp for later improvements

  // --- Helpers ---
  const addZone = () => {
    const area = toNum(newZoneArea, 0);
    if (!(area > 0)) return;

    const coef = newZoneType === "bathroom" ? 1.2 : 1;
    const heightCoef = clamp(toNum(ceilingHeight, 2.5) / 2.5, 0.7, 1.4);
    const power = area * wattsPerM2 * coef * heightCoef;

    const labelMap: Record<HvacZone["type"], string> = {
      living: "Séjour / Salon",
      bedroom: "Chambre",
      kitchen: "Cuisine",
      bathroom: "SDB",
      wc: "WC",
      other: "Autre",
    };

    const sameTypeCount = zones.filter((z) => z.type === newZoneType).length;

    setZones((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: newZoneType,
        label: sameTypeCount ? `${labelMap[newZoneType]} ${sameTypeCount + 1}` : labelMap[newZoneType],
        area,
        powerW: Math.ceil(power),
      },
    ]);

    setNewZoneArea("");
  };

  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalArea = 0;
    let totalPower = 0;
    const materialsList: any[] = [];
    let totalCost = 0;
    const warnings: string[] = [];

    // Stats
    let nbWetRooms = 0; // Cuisine, SDB, WC
    let nbDryRooms = 0; // Salon, Chambre, other

    zones.forEach((z) => {
      totalArea += z.area;
      totalPower += z.powerW;
      if (["kitchen", "bathroom", "wc"].includes(z.type)) nbWetRooms++;
      else nbDryRooms++;
    });

    if (totalArea <= 0) warnings.push("Aucune pièce : ajoutez des zones pour estimer le chauffage/VMC.");

    // --- 1) GENERATOR ---
    let genCost = 0;
    let genName = "";

    if (generatorType === "pac_air_water") {
      genCost = prices.pacAirWater;
      genName = "PAC Air/Eau";
    }
    if (generatorType === "pac_air_air") {
      // Ext group + indoor units (approx)
      const indoor = Math.max(1, nbDryRooms); // at least 1
      genCost = prices.pacAirAirExt + Math.max(0, indoor - 1) * prices.pacAirAirIndoor;
      genName = "PAC Air/Air (Groupe ext.)";
    }
    if (generatorType === "boiler_gas") {
      genCost = prices.boilerGas;
      genName = "Chaudière Gaz";
    }

    if (generatorType !== "elec_rad") {
      totalCost += genCost;
      materialsList.push({
        id: "generator",
        name: genName,
        quantity: 1,
        unit: Unit.PIECE,
        unitPrice: genCost,
        totalPrice: genCost,
        category: CalculatorType.HVAC,
        details: `Puissance estimée: ${(totalPower / 1000).toFixed(1)} kW`,
      });

      if (proMode) {
        const labGen = prices.installGenerator;
        totalCost += labGen;
        materialsList.push({
          id: "lab_gen",
          name: "Pose générateur + mise en service",
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: labGen,
          totalPrice: labGen,
          category: CalculatorType.HVAC,
        });
      }
    }

    // --- 2) EMITTERS & DISTRIBUTION ---
    let emittersCost = 0;
    let networkCost = 0;

    if (emitterType === "floor") {
      if (generatorType === "elec_rad" || generatorType === "pac_air_air") {
        warnings.push("Incohérence: plancher chauffant nécessite un système hydraulique (PAC Air/Eau ou chaudière).");
      }

      // Pipe length: ~ area / pitch (m)
      const pitchM = Math.max(0.10, floorPitch / 100);
      const pipeLen = totalArea / pitchM;

      const costPipe = pipeLen * prices.floorPipeM;
      const costInsul = totalArea * prices.floorInsulation;

      // Loops: ~1 boucle / 15m² minimum 1
      const loops = Math.max(1, Math.max(zones.length, Math.ceil(totalArea / 15)));
      const collectors = Math.ceil(loops / 6); // 6 loops/manifold approx
      const costCol = collectors * prices.floorCollector;

      emittersCost = costPipe + costInsul + costCol;

      materialsList.push(
        {
          id: "floor_pipe",
          name: `Tube ${floorPipeType.toUpperCase()} BAO (pas ${floorPitch}cm)`,
          quantity: Math.ceil(pipeLen),
          unit: Unit.METER,
          unitPrice: prices.floorPipeM,
          totalPrice: round2(costPipe),
          category: CalculatorType.HVAC,
        },
        {
          id: "floor_insul",
          name: "Isolant plancher (panneaux/plots)",
          quantity: Math.ceil(totalArea),
          unit: Unit.M2,
          unitPrice: prices.floorInsulation,
          totalPrice: round2(costInsul),
          category: CalculatorType.HVAC,
        },
        {
          id: "floor_col",
          name: "Collecteurs / nourrices",
          quantity: collectors,
          unit: Unit.PIECE,
          unitPrice: prices.floorCollector,
          totalPrice: round2(costCol),
          category: CalculatorType.HVAC,
          details: `${loops} boucles`,
        }
      );
    } else if (emitterType === "radiator_water") {
      if (generatorType === "elec_rad" || generatorType === "pac_air_air") {
        warnings.push("Incohérence: radiateurs à eau nécessitent un système hydraulique (PAC Air/Eau ou chaudière).");
      }

      const nbRads = Math.max(0, zones.length); // 1 per room approx
      const costRads = nbRads * prices.radWater;

      // Pipes: approx 15m per radiator (aller+retour)
      const pipeLen = nbRads * 15;
      const unitPipe =
        proMode ? prices.copperPipeM : floorPipeType === "multicouche" ? prices.multicouchePipeM : prices.perPipeM;
      const costPipe = pipeLen * unitPipe;

      emittersCost = costRads;
      networkCost = costPipe;

      materialsList.push(
        {
          id: "rads_water",
          name: "Radiateurs eau chaude",
          quantity: nbRads,
          unit: Unit.PIECE,
          unitPrice: prices.radWater,
          totalPrice: round2(costRads),
          category: CalculatorType.HVAC,
        },
        {
          id: "pipes_water",
          name: `Distribution (tuyauterie ${proMode ? "cuivre" : floorPipeType})`,
          quantity: Math.ceil(pipeLen),
          unit: Unit.METER,
          unitPrice: unitPipe,
          totalPrice: round2(costPipe),
          category: CalculatorType.HVAC,
        }
      );
    } else if (emitterType === "radiator_elec") {
      const nbRads = Math.max(0, zones.length);
      const costRads = nbRads * prices.radElec;
      emittersCost = costRads;

      materialsList.push({
        id: "rads_elec",
        name: "Radiateurs électriques",
        quantity: nbRads,
        unit: Unit.PIECE,
        unitPrice: prices.radElec,
        totalPrice: round2(costRads),
        category: CalculatorType.HVAC,
      });
    } else if (emitterType === "split") {
      if (generatorType !== "pac_air_air") {
        warnings.push("Incohérence: splits (air/air) vont généralement avec une PAC Air/Air.");
      }

      const nbSplits = Math.max(0, zones.length);
      const costSplits = nbSplits * prices.splitUnit;

      const lineLen = nbSplits * 10; // 10m avg
      const costLines = lineLen * prices.frigoLineM;

      emittersCost = costSplits;
      networkCost = costLines;

      materialsList.push(
        {
          id: "splits",
          name: "Unités intérieures (splits)",
          quantity: nbSplits,
          unit: Unit.PIECE,
          unitPrice: prices.splitUnit,
          totalPrice: round2(costSplits),
          category: CalculatorType.HVAC,
        },
        {
          id: "frigo_lines",
          name: "Liaisons frigorifiques",
          quantity: Math.ceil(lineLen),
          unit: Unit.METER,
          unitPrice: prices.frigoLineM,
          totalPrice: round2(costLines),
          category: CalculatorType.HVAC,
        }
      );
    }

    totalCost += emittersCost + networkCost;

    if (proMode && (emittersCost > 0 || networkCost > 0)) {
      const labEmit = prices.installEmitters;
      totalCost += labEmit;
      materialsList.push({
        id: "lab_emit",
        name: "Pose émetteurs + distribution",
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: labEmit,
        totalPrice: labEmit,
        category: CalculatorType.HVAC,
      });
    }

    // --- 3) VMC ---
    let kitPrice = prices.kitVmcSimple;
    let kitName = "Kit VMC Simple Flux";
    if (vmcType === "simple_hygro") {
      kitPrice = prices.kitVmcHygro;
      kitName = "Kit VMC Hygro B";
    }
    if (vmcType === "double_flux") {
      kitPrice = prices.kitVmcDouble;
      kitName = "Kit VMC Double Flux";
    }

    let nbExtract = nbWetRooms;
    let nbSupply = vmcType === "double_flux" ? nbDryRooms : 0;

    // If no wet rooms, still assume at least 1 extract (common minimum) and warn
    if (nbWetRooms === 0 && zones.length > 0) {
      nbExtract = 1;
      warnings.push("Aucune pièce d’eau détectée : 1 extraction minimale comptée (à vérifier).");
    }

    const totalVents = nbExtract + nbSupply;
    const included = Math.max(0, prices.kitVentsIncluded);
    const extraVents = Math.max(0, totalVents - included);
    const costVents = extraVents * prices.ventUnit;

    // Ducts: avg 6m per vent
    const ductLen = totalVents * 6;
    const baseDuct = ductType === "rigid" ? prices.ductRigidM : prices.ductFlexM;
    const ductUnit = baseDuct + (useInsulatedDucts ? prices.ductInsulationExtraM : 0);
    const costDucts = ductLen * ductUnit;

    let vmcCost = kitPrice + costVents + costDucts;

    materialsList.push(
      {
        id: "vmc_box",
        name: kitName,
        quantity: 1,
        unit: Unit.PIECE,
        unitPrice: kitPrice,
        totalPrice: kitPrice,
        category: CalculatorType.HVAC,
      },
      {
        id: "vmc_ducts",
        name: `Gaines ${ductType === "rigid" ? "rigides" : "flexibles"} ${useInsulatedDucts ? "isolées" : ""}`.trim(),
        quantity: Math.ceil(ductLen),
        unit: Unit.METER,
        unitPrice: round2(ductUnit),
        totalPrice: round2(costDucts),
        category: CalculatorType.HVAC,
      },
      {
        id: "vmc_vents",
        name: "Bouches supplémentaires",
        quantity: extraVents,
        unit: Unit.PIECE,
        unitPrice: prices.ventUnit,
        totalPrice: round2(costVents),
        category: CalculatorType.HVAC,
        details: `${nbExtract} extraction / ${nbSupply} insufflation`,
      }
    );

    if (proMode) {
      const labVmc = prices.installVmc + totalVents * prices.laborVent;
      vmcCost += labVmc;
      materialsList.push({
        id: "lab_vmc",
        name: "Pose VMC & réseau",
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: round2(labVmc),
        totalPrice: round2(labVmc),
        category: CalculatorType.HVAC,
      });
    }

    totalCost += vmcCost;

    return {
      totalCost,
      materials: materialsList,
      totalPower,
      totalArea: round2(totalArea),
      nbWetRooms,
      nbDryRooms,
      warnings,
    };
  }, [
    zones,
    generatorType,
    emitterType,
    floorPitch,
    floorPipeType,
    vmcType,
    ductType,
    useInsulatedDucts,
    prices,
    proMode,
  ]);

  // Pass results
  useEffect(() => {
    onCalculate({
      summary: `${(calculationData.totalPower / 1000).toFixed(1)} kW (Chauffage) + VMC`,
      details: [
        { label: "Surface", value: calculationData.totalArea, unit: "m²" },
        { label: "Puissance est.", value: (calculationData.totalPower / 1000).toFixed(1), unit: "kW" },
        { label: "Générateur", value: generatorType, unit: "" },
        { label: "Ventilation", value: vmcType === "double_flux" ? "Double flux" : "Simple flux", unit: "" },
      ],
      materials: calculationData.materials,
      totalCost: round2(calculationData.totalCost),
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, generatorType, vmcType, onCalculate]);

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
            {s === 1 && "1. Isolation"}
            {s === 2 && "2. Pièces"}
            {s === 3 && "3. Chauffage"}
            {s === 4 && "4. VMC"}
            {s === 5 && "5. Devis"}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Activity size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez le niveau d’isolation pour estimer les besoins en puissance.
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Niveau d’isolation</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setInsulationLevel("rt2012")}
                className={`p-3 rounded border text-left text-sm ${
                  insulationLevel === "rt2012"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                    : "bg-white text-slate-600"
                }`}
              >
                <span className="font-bold block">Excellent (RT2012 / RE2020)</span>
                <span className="text-xs opacity-75">~40 W/m²</span>
              </button>

              <button
                onClick={() => setInsulationLevel("renov_good")}
                className={`p-3 rounded border text-left text-sm ${
                  insulationLevel === "renov_good"
                    ? "bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500"
                    : "bg-white text-slate-600"
                }`}
              >
                <span className="font-bold block">Bon (rénovation isolée)</span>
                <span className="text-xs opacity-75">~70 W/m²</span>
              </button>

              <button
                onClick={() => setInsulationLevel("renov_avg")}
                className={`p-3 rounded border text-left text-sm ${
                  insulationLevel === "renov_avg"
                    ? "bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500"
                    : "bg-white text-slate-600"
                }`}
              >
                <span className="font-bold block">Moyen (isolation ancienne)</span>
                <span className="text-xs opacity-75">~100 W/m²</span>
              </button>

              <button
                onClick={() => setInsulationLevel("poor")}
                className={`p-3 rounded border text-left text-sm ${
                  insulationLevel === "poor"
                    ? "bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500"
                    : "bg-white text-slate-600"
                }`}
              >
                <span className="font-bold block">Faible (non isolé)</span>
                <span className="text-xs opacity-75">~140 W/m²</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur plafond (m)</label>
              <input
                type="number"
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(toNum(e.target.value, 2.5))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Ratio (W/m²)</label>
              <input
                type="number"
                value={wattsPerM2}
                onChange={(e) => setWattsPerM2(toNum(e.target.value, wattsPerM2))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
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

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajoutez les pièces pour calculer puissance et ventilation.
          </div>

          <div className="space-y-2">
            {zones.map((zone) => (
              <div key={zone.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-700 block">{zone.label}</span>
                  <span className="text-xs text-slate-500">
                    {zone.area} m² • Besoin: {zone.powerW} W
                  </span>
                </div>
                <button onClick={() => removeZone(zone.id)} className="text-red-400 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {zones.length === 0 && <div className="text-center text-sm text-slate-400 py-4 italic">Aucune pièce ajoutée.</div>}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 flex gap-2">
            <select
              value={newZoneType}
              onChange={(e) => setNewZoneType(e.target.value as any)}
              className="flex-1 text-sm border-slate-300 rounded-lg"
            >
              <option value="living">Séjour</option>
              <option value="bedroom">Chambre</option>
              <option value="kitchen">Cuisine</option>
              <option value="bathroom">SDB</option>
              <option value="wc">WC</option>
              <option value="other">Autre</option>
            </select>
            <input
              type="number"
              placeholder="m²"
              value={newZoneArea}
              onChange={(e) => setNewZoneArea(e.target.value)}
              className="w-20 text-sm border-slate-300 rounded-lg p-2 bg-white"
            />
            <button onClick={addZone} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95">
              <Plus size={18} />
            </button>
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

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Flame size={16} className="mr-2 shrink-0 mt-0.5" />
            Configuration du système de chauffage.
          </div>

          {zones.length === 0 && (
            <div className="flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              Ajoutez au moins une pièce à l’étape 2 pour une estimation correcte.
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Générateur</label>
              <select
                value={generatorType}
                onChange={(e) => setGeneratorType(e.target.value as any)}
                className="w-full p-3 border rounded bg-white text-slate-900"
              >
                <option value="pac_air_water">PAC Air/Eau</option>
                <option value="pac_air_air">PAC Air/Air (clim)</option>
                <option value="boiler_gas">Chaudière Gaz</option>
                <option value="elec_rad">Tout électrique (radiateurs)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Émetteurs</label>
              <select
                value={emitterType}
                onChange={(e) => setEmitterType(e.target.value as any)}
                className="w-full p-3 border rounded bg-white text-slate-900"
              >
                {generatorType === "elec_rad" ? (
                  <option value="radiator_elec">Radiateurs électriques</option>
                ) : generatorType === "pac_air_air" ? (
                  <option value="split">Splits muraux / console</option>
                ) : (
                  <>
                    <option value="radiator_water">Radiateurs eau</option>
                    <option value="floor">Plancher chauffant</option>
                  </>
                )}
              </select>
            </div>

            {emitterType === "floor" && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in space-y-2">
                <label className="block text-xs font-bold text-slate-500">Pas de pose (cm)</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFloorPitch(15)}
                    className={`flex-1 py-1 text-sm rounded border ${
                      floorPitch === 15 ? "bg-blue-100 border-blue-300 text-blue-700 font-bold" : "bg-white"
                    }`}
                  >
                    15 cm
                  </button>
                  <button
                    onClick={() => setFloorPitch(20)}
                    className={`flex-1 py-1 text-sm rounded border ${
                      floorPitch === 20 ? "bg-blue-100 border-blue-300 text-blue-700 font-bold" : "bg-white"
                    }`}
                  >
                    20 cm
                  </button>
                </div>

                <label className="block text-xs font-bold text-slate-500">Type de tube</label>
                <select
                  value={floorPipeType}
                  onChange={(e) => setFloorPipeType(e.target.value as any)}
                  className="w-full p-2 border rounded bg-white text-slate-900"
                >
                  <option value="per">PER</option>
                  <option value="multicouche">Multicouche</option>
                </select>
              </div>
            )}
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

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Fan size={16} className="mr-2 shrink-0 mt-0.5" />
            Type de VMC et réseaux. Les bouches sont calculées selon les pièces.
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Type de VMC</label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setVmcType("simple_auto")}
                className={`p-3 rounded border text-left text-sm ${
                  vmcType === "simple_auto" ? "bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500" : "bg-white text-slate-600"
                }`}
              >
                <span className="font-bold block">Simple flux autoréglable</span>
                <span className="text-xs opacity-75">Base standard</span>
              </button>

              <button
                onClick={() => setVmcType("simple_hygro")}
                className={`p-3 rounded border text-left text-sm ${
                  vmcType === "simple_hygro" ? "bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500" : "bg-white text-slate-600"
                }`}
              >
                <span className="font-bold block">Simple flux Hygro B</span>
                <span className="text-xs opacity-75">Débit variable</span>
              </button>

              <button
                onClick={() => setVmcType("double_flux")}
                className={`p-3 rounded border text-left text-sm ${
                  vmcType === "double_flux"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500"
                    : "bg-white text-slate-600"
                }`}
              >
                <span className="font-bold block">Double flux</span>
                <span className="text-xs opacity-75">Récupération de chaleur</span>
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Réseau gaines</h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Type</label>
                  <select
                    value={ductType}
                    onChange={(e) => setDuctType(e.target.value as any)}
                    className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                  >
                    <option value="flexible">Flexible</option>
                    <option value="rigid">Rigide</option>
                  </select>
                </div>

                <label className="flex items-center justify-between mt-5">
                  <span className="text-sm">Gaines isolées</span>
                  <input
                    type="checkbox"
                    checked={useInsulatedDucts}
                    onChange={(e) => setUseInsulatedDucts(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>
              </div>

              {zones.length > 0 && calculationData.nbWetRooms === 0 && (
                <div className="flex items-start text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" />
                  <span>Aucune pièce d’eau détectée : l’extraction minimale est à vérifier.</span>
                </div>
              )}
            </div>
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

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustez les prix unitaires pour finaliser le devis.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Prix</h4>
              <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? "Mode Pro" : "Mode Simple"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {generatorType === "pac_air_water" && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">PAC Air/Eau (€)</label>
                  <input type="number" value={prices.pacAirWater} onChange={(e) => updatePrice("pacAirWater", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                </div>
              )}

              {generatorType === "pac_air_air" && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">PAC Air/Air – Groupe ext. (€)</label>
                    <input type="number" value={prices.pacAirAirExt} onChange={(e) => updatePrice("pacAirAirExt", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Unité intérieure sup. (€)</label>
                    <input type="number" value={prices.pacAirAirIndoor} onChange={(e) => updatePrice("pacAirAirIndoor", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                  </div>
                </>
              )}

              {generatorType === "boiler_gas" && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Chaudière gaz (€)</label>
                  <input type="number" value={prices.boilerGas} onChange={(e) => updatePrice("boilerGas", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                </div>
              )}

              {emitterType === "radiator_water" && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Radiateur eau (€ / u)</label>
                  <input type="number" value={prices.radWater} onChange={(e) => updatePrice("radWater", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                </div>
              )}

              {emitterType === "radiator_elec" && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Radiateur élec (€ / u)</label>
                  <input type="number" value={prices.radElec} onChange={(e) => updatePrice("radElec", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                </div>
              )}

              {emitterType === "floor" && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Tube sol (€/m)</label>
                    <input type="number" value={prices.floorPipeM} onChange={(e) => updatePrice("floorPipeM", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Isolant sol (€/m²)</label>
                    <input type="number" value={prices.floorInsulation} onChange={(e) => updatePrice("floorInsulation", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                  </div>
                </>
              )}

              {emitterType === "split" && (
                <>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Split intérieur (€ / u)</label>
                    <input type="number" value={prices.splitUnit} onChange={(e) => updatePrice("splitUnit", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Liaisons frigo (€/m)</label>
                    <input type="number" value={prices.frigoLineM} onChange={(e) => updatePrice("frigoLineM", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Kit VMC (€)</label>
                <input
                  type="number"
                  value={vmcType === "simple_auto" ? prices.kitVmcSimple : vmcType === "simple_hygro" ? prices.kitVmcHygro : prices.kitVmcDouble}
                  onChange={(e) =>
                    updatePrice(
                      vmcType === "simple_auto" ? "kitVmcSimple" : vmcType === "simple_hygro" ? "kitVmcHygro" : "kitVmcDouble",
                      e.target.value
                    )
                  }
                  className="w-full p-1.5 border rounded text-sm"
                />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose générateur (€)</label>
                  <input type="number" value={prices.installGenerator} onChange={(e) => updatePrice("installGenerator", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose VMC (€)</label>
                  <input type="number" value={prices.installVmc} onChange={(e) => updatePrice("installVmc", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm" />
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