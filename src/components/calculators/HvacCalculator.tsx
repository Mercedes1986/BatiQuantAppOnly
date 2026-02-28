// src/components/calculators/HvacCalculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";

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
  powerW: number; // calculated need
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
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Thermal context ---
  const [insulationLevel, setInsulationLevel] = useState<InsulationLevel>("renov_good");
  const [ceilingHeight, setCeilingHeight] = useState(2.5);
  const [targetTemp, setTargetTemp] = useState(20); // reserved for later refinement
  const [wattsPerM2, setWattsPerM2] = useState(80);

  // --- 2. Zones ---
  const [zones, setZones] = useState<HvacZone[]>([]);
  const [newZoneType, setNewZoneType] = useState<HvacZone["type"]>("living");
  const [newZoneArea, setNewZoneArea] = useState("");

  // --- 3. Heating system ---
  const [generatorType, setGeneratorType] = useState<GeneratorType>("pac_air_water");
  const [emitterType, setEmitterType] = useState<EmitterType>("radiator_water");

  // Floor heating
  const [floorPitch, setFloorPitch] = useState(15); // cm
  const [floorPipeType, setFloorPipeType] = useState<PipeType>("per");

  // --- 4. Ventilation ---
  const [vmcType, setVmcType] = useState<VmcType>("simple_hygro");
  const [ductType, setDuctType] = useState<DuctType>("flexible");
  const [useInsulatedDucts, setUseInsulatedDucts] = useState(true);

  // --- Price helper: catalog > DEFAULT_PRICES > fallback ---
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
    // Generators
    pacAirWater: priceOr("PAC_AIR_WATER_UNIT", 8000),
    pacAirAirExt: priceOr("PAC_AIR_AIR_EXT_UNIT", 2500),
    pacAirAirIndoor: priceOr("PAC_AIR_AIR_INDOOR_UNIT", 800),
    boilerGas: priceOr("BOILER_GAS_UNIT", 3000),

    // Emitters
    radElec: priceOr("RADIATOR_ELEC_UNIT", 200),
    radWater: priceOr("RADIATOR_WATER_UNIT", 300),
    splitUnit: priceOr("SPLIT_INDOOR_UNIT", 600),

    // Floor heating
    floorPipeM: priceOr("FLOOR_PIPE_M", 1.5),
    floorCollector: priceOr("FLOOR_COLLECTOR_UNIT", 300),
    floorInsulation: priceOr("FLOOR_INSULATION_M2", 15),

    // VMC
    kitVmcSimple: priceOr("VMC_SIMPLE_KIT", 150),
    kitVmcHygro: priceOr("VMC_HYGRO_KIT", 350),
    kitVmcDouble: priceOr("VMC_DOUBLE_KIT", 2000),
    ductFlexM: priceOr("VMC_DUCT_FLEX_M", 6),
    ductRigidM: priceOr("VMC_DUCT_RIGID_M", 10),
    ductInsulationExtraM: priceOr("VMC_DUCT_INSUL_EXTRA_M", 2),
    ventUnit: priceOr("VMC_VENT_UNIT", 25),
    kitVentsIncluded: 3,

    // Hydraulic network
    copperPipeM: priceOr("COPPER_PIPE_M", 12),
    perPipeM: priceOr("PER_PIPE_M", 2),
    multicouchePipeM: priceOr("MULTICOUCHE_PIPE_M", 4),

    // Refrigerant
    frigoLineM: priceOr("FRIGO_LINE_M", 25),

    // Labor
    installGenerator: priceOr("HVAC_LABOR_GENERATOR", 1500),
    installEmitters: priceOr("HVAC_LABOR_EMITTERS", 600),
    installVmc: priceOr("HVAC_LABOR_VMC", 300),
    laborVent: priceOr("HVAC_LABOR_VENT_UNIT", 50),
  }));

  type PricesKey = keyof typeof prices;
  const updatePrice = (key: PricesKey, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- Auto: W/m² by insulation ---
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

  // --- Auto: emitter consistency ---
  useEffect(() => {
    if (generatorType === "elec_rad") setEmitterType("radiator_elec");
    else if (generatorType === "pac_air_air") setEmitterType("split");
    else {
      if (emitterType === "radiator_elec" || emitterType === "split") setEmitterType("radiator_water");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatorType]);

  // Recompute powers on W/m² or ceiling height change
  useEffect(() => {
    if (!zones.length) return;
    setZones((prev) =>
      prev.map((z) => {
        const coef = z.type === "bathroom" ? 1.2 : 1;
        const heightCoef = clamp(toNum(ceilingHeight, 2.5) / 2.5, 0.7, 1.4);
        const power = z.area * wattsPerM2 * coef * heightCoef;
        return { ...z, powerW: Math.ceil(power) };
      })
    );
  }, [wattsPerM2, ceilingHeight]);

  // --- Helpers ---
  const addZone = () => {
    const area = toNum(newZoneArea, 0);
    if (!(area > 0)) return;

    const coef = newZoneType === "bathroom" ? 1.2 : 1;
    const heightCoef = clamp(toNum(ceilingHeight, 2.5) / 2.5, 0.7, 1.4);
    const power = area * wattsPerM2 * coef * heightCoef;

    const labelMap: Record<HvacZone["type"], string> = {
      living: t("hvac.zone.living", { defaultValue: "Séjour / Salon" }),
      bedroom: t("hvac.zone.bedroom", { defaultValue: "Chambre" }),
      kitchen: t("hvac.zone.kitchen", { defaultValue: "Cuisine" }),
      bathroom: t("hvac.zone.bathroom", { defaultValue: "SDB" }),
      wc: t("hvac.zone.wc", { defaultValue: "WC" }),
      other: t("hvac.zone.other", { defaultValue: "Autre" }),
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

  // --- CALC ENGINE ---
  const calculationData = useMemo(() => {
    let totalArea = 0;
    let totalPower = 0;
    const materialsList: any[] = [];
    let totalCost = 0;
    const warnings: string[] = [];

    let nbWetRooms = 0;
    let nbDryRooms = 0;

    zones.forEach((z) => {
      totalArea += z.area;
      totalPower += z.powerW;
      if (["kitchen", "bathroom", "wc"].includes(z.type)) nbWetRooms++;
      else nbDryRooms++;
    });

    if (totalArea <= 0) warnings.push(t("hvac.warn.no_zones", { defaultValue: "Ajoutez des zones pour estimer chauffage/VMC." }));

    // Generator
    let genCost = 0;
    let genName = "";

    if (generatorType === "pac_air_water") {
      genCost = prices.pacAirWater;
      genName = t("hvac.gen.pac_aw", { defaultValue: "PAC Air/Eau" });
    } else if (generatorType === "pac_air_air") {
      const indoor = Math.max(1, nbDryRooms);
      genCost = prices.pacAirAirExt + Math.max(0, indoor - 1) * prices.pacAirAirIndoor;
      genName = t("hvac.gen.pac_aa", { defaultValue: "PAC Air/Air (groupe ext.)" });
    } else if (generatorType === "boiler_gas") {
      genCost = prices.boilerGas;
      genName = t("hvac.gen.boiler_gas", { defaultValue: "Chaudière gaz" });
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
        details: `${t("hvac.power", { defaultValue: "Puissance estimée" })}: ${(totalPower / 1000).toFixed(1)} kW`,
      });

      if (proMode) {
        const labGen = prices.installGenerator;
        totalCost += labGen;
        materialsList.push({
          id: "lab_gen",
          name: t("hvac.labor.gen", { defaultValue: "Pose générateur + mise en service" }),
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: labGen,
          totalPrice: labGen,
          category: CalculatorType.HVAC,
        });
      }
    }

    // Emitters & networks
    let emittersCost = 0;
    let networkCost = 0;

    if (emitterType === "floor") {
      if (generatorType === "elec_rad" || generatorType === "pac_air_air") {
        warnings.push(t("hvac.warn.floor_need_hydraulic", { defaultValue: "Plancher chauffant = système hydraulique requis (PAC Air/Eau ou chaudière)." }));
      }

      const pitchM = Math.max(0.10, floorPitch / 100);
      const pipeLen = totalArea / pitchM;

      const costPipe = pipeLen * prices.floorPipeM;
      const costInsul = totalArea * prices.floorInsulation;

      const loops = Math.max(1, Math.max(zones.length, Math.ceil(totalArea / 15)));
      const collectors = Math.ceil(loops / 6);
      const costCol = collectors * prices.floorCollector;

      emittersCost = costPipe + costInsul + costCol;

      materialsList.push(
        {
          id: "floor_pipe",
          name: `${t("hvac.floor.pipe", { defaultValue: "Tube" })} ${floorPipeType.toUpperCase()} (${t("hvac.floor.pitch", { defaultValue: "pas" })} ${floorPitch}cm)`,
          quantity: Math.ceil(pipeLen),
          unit: Unit.METER,
          unitPrice: prices.floorPipeM,
          totalPrice: round2(costPipe),
          category: CalculatorType.HVAC,
        },
        {
          id: "floor_insul",
          name: t("hvac.floor.insul", { defaultValue: "Isolant plancher" }),
          quantity: Math.ceil(totalArea),
          unit: Unit.M2,
          unitPrice: prices.floorInsulation,
          totalPrice: round2(costInsul),
          category: CalculatorType.HVAC,
        },
        {
          id: "floor_col",
          name: t("hvac.floor.collector", { defaultValue: "Collecteurs / nourrices" }),
          quantity: collectors,
          unit: Unit.PIECE,
          unitPrice: prices.floorCollector,
          totalPrice: round2(costCol),
          category: CalculatorType.HVAC,
          details: `${loops} ${t("hvac.floor.loops", { defaultValue: "boucles" })}`,
        }
      );
    } else if (emitterType === "radiator_water") {
      if (generatorType === "elec_rad" || generatorType === "pac_air_air") {
        warnings.push(t("hvac.warn.rads_need_hydraulic", { defaultValue: "Radiateurs à eau = système hydraulique requis (PAC Air/Eau ou chaudière)." }));
      }

      const nbRads = Math.max(0, zones.length);
      const costRads = nbRads * prices.radWater;

      const pipeLen = nbRads * 15;
      const unitPipe =
        proMode ? prices.copperPipeM : floorPipeType === "multicouche" ? prices.multicouchePipeM : prices.perPipeM;
      const costPipe = pipeLen * unitPipe;

      emittersCost = costRads;
      networkCost = costPipe;

      materialsList.push(
        {
          id: "rads_water",
          name: t("hvac.emit.rad_water", { defaultValue: "Radiateurs eau chaude" }),
          quantity: nbRads,
          unit: Unit.PIECE,
          unitPrice: prices.radWater,
          totalPrice: round2(costRads),
          category: CalculatorType.HVAC,
        },
        {
          id: "pipes_water",
          name: t("hvac.net.hydraulic", { defaultValue: "Distribution hydraulique" }),
          quantity: Math.ceil(pipeLen),
          unit: Unit.METER,
          unitPrice: unitPipe,
          totalPrice: round2(costPipe),
          category: CalculatorType.HVAC,
          details: proMode ? "Cuivre" : floorPipeType.toUpperCase(),
        }
      );
    } else if (emitterType === "radiator_elec") {
      const nbRads = Math.max(0, zones.length);
      const costRads = nbRads * prices.radElec;
      emittersCost = costRads;

      materialsList.push({
        id: "rads_elec",
        name: t("hvac.emit.rad_elec", { defaultValue: "Radiateurs électriques" }),
        quantity: nbRads,
        unit: Unit.PIECE,
        unitPrice: prices.radElec,
        totalPrice: round2(costRads),
        category: CalculatorType.HVAC,
      });
    } else if (emitterType === "split") {
      if (generatorType !== "pac_air_air") {
        warnings.push(t("hvac.warn.split_need_pac", { defaultValue: "Splits = généralement avec PAC Air/Air." }));
      }

      const nbSplits = Math.max(0, zones.length);
      const costSplits = nbSplits * prices.splitUnit;

      const lineLen = nbSplits * 10;
      const costLines = lineLen * prices.frigoLineM;

      emittersCost = costSplits;
      networkCost = costLines;

      materialsList.push(
        {
          id: "splits",
          name: t("hvac.emit.splits", { defaultValue: "Unités intérieures (splits)" }),
          quantity: nbSplits,
          unit: Unit.PIECE,
          unitPrice: prices.splitUnit,
          totalPrice: round2(costSplits),
          category: CalculatorType.HVAC,
        },
        {
          id: "frigo_lines",
          name: t("hvac.net.frigo", { defaultValue: "Liaisons frigorifiques" }),
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
        name: t("hvac.labor.emit", { defaultValue: "Pose émetteurs + distribution" }),
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: labEmit,
        totalPrice: labEmit,
        category: CalculatorType.HVAC,
      });
    }

    // VMC
    let kitPrice = prices.kitVmcSimple;
    let kitName = t("hvac.vmc.simple", { defaultValue: "Kit VMC simple flux" });
    if (vmcType === "simple_hygro") {
      kitPrice = prices.kitVmcHygro;
      kitName = t("hvac.vmc.hygro", { defaultValue: "Kit VMC Hygro B" });
    }
    if (vmcType === "double_flux") {
      kitPrice = prices.kitVmcDouble;
      kitName = t("hvac.vmc.double", { defaultValue: "Kit VMC double flux" });
    }

    let nbExtract = nbWetRooms;
    let nbSupply = vmcType === "double_flux" ? nbDryRooms : 0;

    if (nbWetRooms === 0 && zones.length > 0) {
      nbExtract = 1;
      warnings.push(t("hvac.warn.min_extract", { defaultValue: "Aucune pièce d’eau détectée : 1 extraction minimale comptée (à vérifier)." }));
    }

    const totalVents = nbExtract + nbSupply;
    const included = Math.max(0, prices.kitVentsIncluded);
    const extraVents = Math.max(0, totalVents - included);
    const costVents = extraVents * prices.ventUnit;

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
        name: `${t("hvac.vmc.ducts", { defaultValue: "Gaines" })} ${ductType === "rigid" ? t("hvac.vmc.rigid", { defaultValue: "rigides" }) : t("hvac.vmc.flex", { defaultValue: "flexibles" })}${useInsulatedDucts ? ` (${t("hvac.vmc.insulated", { defaultValue: "isolées" })})` : ""}`,
        quantity: Math.ceil(ductLen),
        unit: Unit.METER,
        unitPrice: round2(ductUnit),
        totalPrice: round2(costDucts),
        category: CalculatorType.HVAC,
      },
      {
        id: "vmc_vents",
        name: t("hvac.vmc.extra_vents", { defaultValue: "Bouches supplémentaires" }),
        quantity: extraVents,
        unit: Unit.PIECE,
        unitPrice: prices.ventUnit,
        totalPrice: round2(costVents),
        category: CalculatorType.HVAC,
        details: `${nbExtract} ${t("hvac.vmc.extract", { defaultValue: "extraction" })} / ${nbSupply} ${t("hvac.vmc.supply", { defaultValue: "insufflation" })}`,
      }
    );

    if (proMode) {
      const labVmc = prices.installVmc + totalVents * prices.laborVent;
      vmcCost += labVmc;
      materialsList.push({
        id: "lab_vmc",
        name: t("hvac.labor.vmc", { defaultValue: "Pose VMC & réseau" }),
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
    ductType,
    t,
  ]);

  // Pass to parent
  useEffect(() => {
    onCalculate({
      summary: `${(calculationData.totalPower / 1000).toFixed(1)} kW`,
      details: [
        { label: t("struct.common.surface", { defaultValue: "Surface" }), value: calculationData.totalArea, unit: "m²" },
        { label: t("hvac.power", { defaultValue: "Puissance est." }), value: (calculationData.totalPower / 1000).toFixed(1), unit: "kW" },
        { label: t("hvac.generator", { defaultValue: "Générateur" }), value: generatorType, unit: "" },
        { label: t("hvac.ventilation", { defaultValue: "Ventilation" }), value: vmcType, unit: "" },
      ],
      materials: calculationData.materials,
      totalCost: round2(calculationData.totalCost),
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, generatorType, vmcType, onCalculate, t]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Step Navigation */}
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
            {s === 1 && t("hvac.steps.1", { defaultValue: "1. Isolation" })}
            {s === 2 && t("hvac.steps.2", { defaultValue: "2. Pièces" })}
            {s === 3 && t("hvac.steps.3", { defaultValue: "3. Chauffage" })}
            {s === 4 && t("hvac.steps.4", { defaultValue: "4. VMC" })}
            {s === 5 && t("hvac.steps.5", { defaultValue: "5. Devis" })}
          </button>
        ))}
      </div>

      {/* STEP 1: Insulation */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Activity size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step1.hint", { defaultValue: "Définissez le niveau d’isolation pour estimer la puissance." })}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              {t("hvac.insulation_level", { defaultValue: "Niveau d’isolation" })}
            </label>

            <div className="grid grid-cols-1 gap-2">
              {([
                ["rt2012", "Excellent (RT2012 / RE2020)", "≈ 40 W/m²"],
                ["renov_good", "Bon (rénovation isolée)", "≈ 70 W/m²"],
                ["renov_avg", "Moyen (isolation ancienne)", "≈ 100 W/m²"],
                ["poor", "Faible (non isolé)", "≈ 140 W/m²"],
              ] as const).map(([id, title, sub]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInsulationLevel(id)}
                  className={`p-3 rounded border text-left text-sm ${
                    insulationLevel === id ? "bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500" : "bg-white text-slate-600"
                  }`}
                >
                  <span className="font-bold block">{title}</span>
                  <span className="text-xs opacity-75">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("hvac.ceiling_height", { defaultValue: "Hauteur plafond (m)" })}</label>
              <input
                type="number"
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(toNum(e.target.value, 2.5))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("hvac.w_per_m2", { defaultValue: "Ratio (W/m²)" })}</label>
              <input
                type="number"
                value={wattsPerM2}
                onChange={(e) => setWattsPerM2(toNum(e.target.value, wattsPerM2))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
          >
            {t("common.next", { defaultValue: "Suivant" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: Zones */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step2.hint", { defaultValue: "Ajoutez les pièces pour calculer puissance et ventilation." })}
          </div>

          <div className="space-y-2">
            {zones.map((zone) => (
              <div key={zone.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-700 block">{zone.label}</span>
                  <span className="text-xs text-slate-500">
                    {zone.area} m² • {t("hvac.need", { defaultValue: "Besoin" })}: {zone.powerW} W
                  </span>
                </div>
                <button type="button" onClick={() => removeZone(zone.id)} className="text-red-400 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-4 italic">
                {t("hvac.no_zones", { defaultValue: "Aucune pièce ajoutée." })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 flex gap-2">
            <select
              value={newZoneType}
              onChange={(e) => setNewZoneType(e.target.value as any)}
              className="flex-1 text-sm border-slate-300 rounded-lg"
            >
              <option value="living">{t("hvac.zone.living", { defaultValue: "Séjour" })}</option>
              <option value="bedroom">{t("hvac.zone.bedroom", { defaultValue: "Chambre" })}</option>
              <option value="kitchen">{t("hvac.zone.kitchen", { defaultValue: "Cuisine" })}</option>
              <option value="bathroom">{t("hvac.zone.bathroom", { defaultValue: "SDB" })}</option>
              <option value="wc">{t("hvac.zone.wc", { defaultValue: "WC" })}</option>
              <option value="other">{t("hvac.zone.other", { defaultValue: "Autre" })}</option>
            </select>

            <input
              type="number"
              placeholder="m²"
              value={newZoneArea}
              onChange={(e) => setNewZoneArea(e.target.value)}
              className="w-20 text-sm border-slate-300 rounded-lg p-2 bg-white"
            />

            <button
              type="button"
              onClick={addZone}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform"
              title={t("common.add", { defaultValue: "Ajouter" })}
            >
              <Plus size={18} />
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

      {/* STEP 3: Heating */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Flame size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step3.hint", { defaultValue: "Configuration du système de chauffage." })}
          </div>

          {zones.length === 0 && (
            <div className="flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              {t("hvac.warn.need_zones", { defaultValue: "Ajoutez au moins une pièce à l’étape 2." })}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("hvac.generator", { defaultValue: "Générateur" })}</label>
              <select
                value={generatorType}
                onChange={(e) => setGeneratorType(e.target.value as any)}
                className="w-full p-3 border rounded bg-white text-slate-900"
              >
                <option value="pac_air_water">{t("hvac.gen.pac_aw", { defaultValue: "PAC Air/Eau" })}</option>
                <option value="pac_air_air">{t("hvac.gen.pac_aa", { defaultValue: "PAC Air/Air (clim)" })}</option>
                <option value="boiler_gas">{t("hvac.gen.boiler_gas", { defaultValue: "Chaudière Gaz" })}</option>
                <option value="elec_rad">{t("hvac.gen.elec", { defaultValue: "Tout électrique (radiateurs)" })}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("hvac.emitters", { defaultValue: "Émetteurs" })}</label>
              <select
                value={emitterType}
                onChange={(e) => setEmitterType(e.target.value as any)}
                className="w-full p-3 border rounded bg-white text-slate-900"
              >
                {generatorType === "elec_rad" ? (
                  <option value="radiator_elec">{t("hvac.emit.rad_elec", { defaultValue: "Radiateurs électriques" })}</option>
                ) : generatorType === "pac_air_air" ? (
                  <option value="split">{t("hvac.emit.splits", { defaultValue: "Splits (unités intérieures)" })}</option>
                ) : (
                  <>
                    <option value="radiator_water">{t("hvac.emit.rad_water", { defaultValue: "Radiateurs eau" })}</option>
                    <option value="floor">{t("hvac.emit.floor", { defaultValue: "Plancher chauffant" })}</option>
                  </>
                )}
              </select>
            </div>

            {emitterType === "floor" && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in space-y-2">
                <label className="block text-xs font-bold text-slate-500">{t("hvac.floor.pitch", { defaultValue: "Pas de pose (cm)" })}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFloorPitch(15)}
                    className={`flex-1 py-1 text-sm rounded border ${floorPitch === 15 ? "bg-blue-100 border-blue-300 text-blue-700 font-bold" : "bg-white"}`}
                  >
                    15 cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloorPitch(20)}
                    className={`flex-1 py-1 text-sm rounded border ${floorPitch === 20 ? "bg-blue-100 border-blue-300 text-blue-700 font-bold" : "bg-white"}`}
                  >
                    20 cm
                  </button>
                </div>

                <label className="block text-xs font-bold text-slate-500">{t("hvac.floor.pipe_type", { defaultValue: "Type de tube" })}</label>
                <select
                  value={floorPipeType}
                  onChange={(e) => setFloorPipeType(e.target.value as any)}
                  className="w-full p-2 border rounded bg-white text-slate-900"
                >
                  <option value="per">PER</option>
                  <option value="multicouche">{t("hvac.pipe.multicouche", { defaultValue: "Multicouche" })}</option>
                </select>
              </div>
            )}
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

      {/* STEP 4: VMC */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Fan size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step4.hint", { defaultValue: "Type de VMC et réseaux." })}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("hvac.vmc.type", { defaultValue: "Type de VMC" })}</label>
            <div className="grid grid-cols-1 gap-2">
              {([
                ["simple_auto", t("hvac.vmc.simple_auto", { defaultValue: "Simple flux autoréglable" })],
                ["simple_hygro", t("hvac.vmc.hygro", { defaultValue: "Simple flux Hygro B" })],
                ["double_flux", t("hvac.vmc.double", { defaultValue: "Double flux" })],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVmcType(id)}
                  className={`p-3 rounded border text-left text-sm ${
                    vmcType === id ? "bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500" : "bg-white text-slate-600"
                  }`}
                >
                  <span className="font-bold block">{label}</span>
                </button>
              ))}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("hvac.vmc.network", { defaultValue: "Réseau gaines" })}</h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("common.type", { defaultValue: "Type" })}</label>
                  <select
                    value={ductType}
                    onChange={(e) => setDuctType(e.target.value as any)}
                    className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                  >
                    <option value="flexible">{t("hvac.vmc.flex", { defaultValue: "Flexible" })}</option>
                    <option value="rigid">{t("hvac.vmc.rigid", { defaultValue: "Rigide" })}</option>
                  </select>
                </div>

                <label className="flex items-center justify-between mt-5">
                  <span className="text-sm">{t("hvac.vmc.insulated", { defaultValue: "Gaines isolées" })}</span>
                  <input
                    type="checkbox"
                    checked={useInsulatedDucts}
                    onChange={(e) => setUseInsulatedDucts(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            </div>
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

      {/* STEP 5: Pricing */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step5.hint", { defaultValue: "Ajustez les prix unitaires." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("struct.common.unit_prices", { defaultValue: "Prix unitaires" })}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? t("struct.common.pro_mode", { defaultValue: "Mode Pro" }) : t("struct.common.simple_mode", { defaultValue: "Mode Simple" })}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">PAC Air/Eau (€)</label>
                <input type="number" value={prices.pacAirWater} onChange={(e) => updatePrice("pacAirWater", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Chaudière gaz (€)</label>
                <input type="number" value={prices.boilerGas} onChange={(e) => updatePrice("boilerGas", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Radiateur eau (€)</label>
                <input type="number" value={prices.radWater} onChange={(e) => updatePrice("radWater", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Radiateur élec (€)</label>
                <input type="number" value={prices.radElec} onChange={(e) => updatePrice("radElec", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Kit VMC Hygro (€)</label>
                <input type="number" value={prices.kitVmcHygro} onChange={(e) => updatePrice("kitVmcHygro", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Gaine flexible (€/m)</label>
                <input type="number" value={prices.ductFlexM} onChange={(e) => updatePrice("ductFlexM", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("hvac.labor.gen", { defaultValue: "Pose générateur" })} (€)</label>
                  <input type="number" value={prices.installGenerator} onChange={(e) => updatePrice("installGenerator", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("hvac.labor.vmc", { defaultValue: "Pose VMC" })} (€)</label>
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
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("struct.common.calculated", { defaultValue: "Calculé" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};