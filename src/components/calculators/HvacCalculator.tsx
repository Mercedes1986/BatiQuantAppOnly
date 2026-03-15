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
      living: t("hvac.zone.living", { defaultValue: "Living room" }),
      bedroom: t("hvac.zone.bedroom", { defaultValue: "Bedroom" }),
      kitchen: t("hvac.zone.kitchen", { defaultValue: "Kitchen" }),
      bathroom: t("hvac.zone.bathroom", { defaultValue: "Bathroom" }),
      wc: t("hvac.zone.wc", { defaultValue: "WC" }),
      other: t("hvac.zone.other", { defaultValue: "Other" }),
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

    if (totalArea <= 0)
      warnings.push(t("hvac.warn.no_zones", { defaultValue: "Add rooms to estimate heating/ventilation." }));

    // Generator
    let genCost = 0;
    let genName = "";

    if (generatorType === "pac_air_water") {
      genCost = prices.pacAirWater;
      genName = t("hvac.gen.pac_aw", { defaultValue: "Air-to-water heat pump" });
    } else if (generatorType === "pac_air_air") {
      const indoor = Math.max(1, nbDryRooms);
      genCost = prices.pacAirAirExt + Math.max(0, indoor - 1) * prices.pacAirAirIndoor;
      genName = t("hvac.gen.pac_aa", { defaultValue: "Air-to-air heat pump (outdoor unit)" });
    } else if (generatorType === "boiler_gas") {
      genCost = prices.boilerGas;
      genName = t("hvac.gen.boiler_gas", { defaultValue: "Gas boiler" });
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
        details: t("hvac.details.power", {
          defaultValue: "Estimated power: {{kw}} kW",
          kw: (totalPower / 1000).toFixed(1),
        }),
      });

      if (proMode) {
        const labGen = prices.installGenerator;
        totalCost += labGen;
        materialsList.push({
          id: "lab_gen",
          name: t("hvac.labor.gen", { defaultValue: "Generator install + commissioning" }),
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
        warnings.push(
          t("hvac.warn.floor_need_hydraulic", {
            defaultValue: "Underfloor heating requires a hydraulic system (air-to-water heat pump or boiler).",
          })
        );
      }

      const pitchM = Math.max(0.1, floorPitch / 100);
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
          name: t("hvac.floor.pipe_line", {
            defaultValue: "{{pipe}} {{type}} ({{pitchLabel}} {{pitch}}cm)",
            pipe: t("hvac.floor.pipe", { defaultValue: "Pipe" }),
            type: floorPipeType.toUpperCase(),
            pitchLabel: t("hvac.floor.pitch", { defaultValue: "pitch" }),
            pitch: floorPitch,
          }),
          quantity: Math.ceil(pipeLen),
          unit: Unit.METER,
          unitPrice: prices.floorPipeM,
          totalPrice: round2(costPipe),
          category: CalculatorType.HVAC,
        },
        {
          id: "floor_insul",
          name: t("hvac.floor.insul", { defaultValue: "Underfloor insulation" }),
          quantity: Math.ceil(totalArea),
          unit: Unit.M2,
          unitPrice: prices.floorInsulation,
          totalPrice: round2(costInsul),
          category: CalculatorType.HVAC,
        },
        {
          id: "floor_col",
          name: t("hvac.floor.collector", { defaultValue: "Manifolds / collectors" }),
          quantity: collectors,
          unit: Unit.PIECE,
          unitPrice: prices.floorCollector,
          totalPrice: round2(costCol),
          category: CalculatorType.HVAC,
          details: t("hvac.floor.loops_details", { defaultValue: "{{n}} loops", n: loops }),
        }
      );
    } else if (emitterType === "radiator_water") {
      if (generatorType === "elec_rad" || generatorType === "pac_air_air") {
        warnings.push(
          t("hvac.warn.rads_need_hydraulic", {
            defaultValue: "Water radiators require a hydraulic system (air-to-water heat pump or boiler).",
          })
        );
      }

      const nbRads = Math.max(0, zones.length);
      const costRads = nbRads * prices.radWater;

      const pipeLen = nbRads * 15;
      const unitPipe = proMode
        ? prices.copperPipeM
        : floorPipeType === "multicouche"
          ? prices.multicouchePipeM
          : prices.perPipeM;
      const costPipe = pipeLen * unitPipe;

      emittersCost = costRads;
      networkCost = costPipe;

      materialsList.push(
        {
          id: "rads_water",
          name: t("hvac.emit.rad_water", { defaultValue: "Hot water radiators" }),
          quantity: nbRads,
          unit: Unit.PIECE,
          unitPrice: prices.radWater,
          totalPrice: round2(costRads),
          category: CalculatorType.HVAC,
        },
        {
          id: "pipes_water",
          name: t("hvac.net.hydraulic", { defaultValue: "Hydraulic distribution" }),
          quantity: Math.ceil(pipeLen),
          unit: Unit.METER,
          unitPrice: unitPipe,
          totalPrice: round2(costPipe),
          category: CalculatorType.HVAC,
          details: proMode
            ? t("hvac.net.copper", { defaultValue: "Copper" })
            : floorPipeType === "multicouche"
              ? t("hvac.pipe.multicouche", { defaultValue: "Multilayer" })
              : "PER",
        }
      );
    } else if (emitterType === "radiator_elec") {
      const nbRads = Math.max(0, zones.length);
      const costRads = nbRads * prices.radElec;
      emittersCost = costRads;

      materialsList.push({
        id: "rads_elec",
        name: t("hvac.emit.rad_elec", { defaultValue: "Electric radiators" }),
        quantity: nbRads,
        unit: Unit.PIECE,
        unitPrice: prices.radElec,
        totalPrice: round2(costRads),
        category: CalculatorType.HVAC,
      });
    } else if (emitterType === "split") {
      if (generatorType !== "pac_air_air") {
        warnings.push(
          t("hvac.warn.split_need_pac", { defaultValue: "Splits are usually paired with an air-to-air heat pump." })
        );
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
          name: t("hvac.emit.splits", { defaultValue: "Indoor units (splits)" }),
          quantity: nbSplits,
          unit: Unit.PIECE,
          unitPrice: prices.splitUnit,
          totalPrice: round2(costSplits),
          category: CalculatorType.HVAC,
        },
        {
          id: "frigo_lines",
          name: t("hvac.net.frigo", { defaultValue: "Refrigerant lines" }),
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
        name: t("hvac.labor.emit", { defaultValue: "Emitters + distribution install" }),
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: labEmit,
        totalPrice: labEmit,
        category: CalculatorType.HVAC,
      });
    }

    // VMC
    let kitPrice = prices.kitVmcSimple;
    let kitName = t("hvac.vmc.simple", { defaultValue: "Single-flow ventilation kit" });
    if (vmcType === "simple_hygro") {
      kitPrice = prices.kitVmcHygro;
      kitName = t("hvac.vmc.hygro", { defaultValue: "Humidity-controlled ventilation kit" });
    }
    if (vmcType === "double_flux") {
      kitPrice = prices.kitVmcDouble;
      kitName = t("hvac.vmc.double", { defaultValue: "Heat recovery ventilation kit" });
    }

    let nbExtract = nbWetRooms;
    let nbSupply = vmcType === "double_flux" ? nbDryRooms : 0;

    if (nbWetRooms === 0 && zones.length > 0) {
      nbExtract = 1;
      warnings.push(
        t("hvac.warn.min_extract", {
          defaultValue: "No wet rooms detected: counting 1 minimum extract vent (please verify).",
        })
      );
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
        name: t("hvac.vmc.ducts_line", {
          defaultValue: "{{ducts}} {{kind}}{{insul}}",
          ducts: t("hvac.vmc.ducts", { defaultValue: "Ducts" }),
          kind:
            ductType === "rigid"
              ? t("hvac.vmc.rigid", { defaultValue: "rigid" })
              : t("hvac.vmc.flex", { defaultValue: "flexible" }),
          insul: useInsulatedDucts ? ` (${t("hvac.vmc.insulated", { defaultValue: "insulated" })})` : "",
        }),
        quantity: Math.ceil(ductLen),
        unit: Unit.METER,
        unitPrice: round2(ductUnit),
        totalPrice: round2(costDucts),
        category: CalculatorType.HVAC,
      },
      {
        id: "vmc_vents",
        name: t("hvac.vmc.extra_vents", { defaultValue: "Extra vents" }),
        quantity: extraVents,
        unit: Unit.PIECE,
        unitPrice: prices.ventUnit,
        totalPrice: round2(costVents),
        category: CalculatorType.HVAC,
        details: t("hvac.vmc.vents_details", {
          defaultValue: "{{ex}} extract / {{su}} supply",
          ex: nbExtract,
          su: nbSupply,
        }),
      }
    );

    if (proMode) {
      const labVmc = prices.installVmc + totalVents * prices.laborVent;
      vmcCost += labVmc;
      materialsList.push({
        id: "lab_vmc",
        name: t("hvac.labor.vmc", { defaultValue: "Ventilation install & ducts" }),
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
    t,
  ]);

  // Pass to parent
  useEffect(() => {
    onCalculate({
      summary: `${(calculationData.totalPower / 1000).toFixed(1)} kW`,
      details: [
        { label: t("struct.common.surface", { defaultValue: "Area" }), value: calculationData.totalArea, unit: "m²" },
        {
          label: t("hvac.power", { defaultValue: "Estimated power" }),
          value: (calculationData.totalPower / 1000).toFixed(1),
          unit: "kW",
        },
        {
          label: t("hvac.generator", { defaultValue: "Generator" }),
          value: t(`hvac.gen_key.${generatorType}`, { defaultValue: generatorType }),
          unit: "",
        },
        {
          label: t("hvac.ventilation", { defaultValue: "Ventilation" }),
          value: t(`hvac.vmc_key.${vmcType}`, { defaultValue: vmcType }),
          unit: "",
        },
      ],
      materials: calculationData.materials,
      totalCost: round2(calculationData.totalCost),
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, generatorType, vmcType, onCalculate, t]);

  // UI helpers for insulation options (no FR hardcode)
  const insulationOptions = useMemo(
    () => [
      {
        id: "rt2012" as const,
        title: t("hvac.insul.rt2012.title", { defaultValue: "Excellent (RT2012 / RE2020)" }),
        sub: t("hvac.insul.rt2012.sub", { defaultValue: "≈ 40 W/m²" }),
      },
      {
        id: "renov_good" as const,
        title: t("hvac.insul.renov_good.title", { defaultValue: "Good (well-insulated renovation)" }),
        sub: t("hvac.insul.renov_good.sub", { defaultValue: "≈ 70 W/m²" }),
      },
      {
        id: "renov_avg" as const,
        title: t("hvac.insul.renov_avg.title", { defaultValue: "Average (older insulation)" }),
        sub: t("hvac.insul.renov_avg.sub", { defaultValue: "≈ 100 W/m²" }),
      },
      {
        id: "poor" as const,
        title: t("hvac.insul.poor.title", { defaultValue: "Poor (uninsulated)" }),
        sub: t("hvac.insul.poor.sub", { defaultValue: "≈ 140 W/m²" }),
      },
    ],
    [t]
  );

  return (
    <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/72 p-3 sm:p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
      {/* Step Navigation */}
      <div className="flex justify-between items-center mb-6 rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner overflow-x-auto no-scrollbar backdrop-blur-xl">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-extrabold rounded-2xl transition-all ${
              step === s ? "bg-white text-slate-950 shadow-[0_14px_32px_rgba(59,130,246,0.18)]" : "text-slate-400"
            }`}
          >
            {s === 1 && t("hvac.steps.1", { defaultValue: "1. Insulation" })}
            {s === 2 && t("hvac.steps.2", { defaultValue: "2. Rooms" })}
            {s === 3 && t("hvac.steps.3", { defaultValue: "3. Heating" })}
            {s === 4 && t("hvac.steps.4", { defaultValue: "4. Ventilation" })}
            {s === 5 && t("hvac.steps.5", { defaultValue: "5. Quote" })}
          </button>
        ))}
      </div>

      {/* STEP 1: Insulation */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Activity size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step1.hint", { defaultValue: "Set insulation level to estimate required power." })}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              {t("hvac.insulation_level", { defaultValue: "Insulation level" })}
            </label>

            <div className="grid grid-cols-1 gap-2">
              {insulationOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setInsulationLevel(opt.id)}
                  className={`p-3 rounded border text-left text-sm ${
                    insulationLevel === opt.id
                      ? "bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500"
                      : "bg-white text-slate-600"
                  }`}
                >
                  <span className="font-bold block">{opt.title}</span>
                  <span className="text-xs opacity-75">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("hvac.ceiling_height", { defaultValue: "Ceiling height (m)" })}
              </label>
              <input
                type="number"
                value={ceilingHeight}
                onChange={(e) => setCeilingHeight(toNum(e.target.value, 2.5))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("hvac.w_per_m2", { defaultValue: "Ratio (W/m²)" })}
              </label>
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
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center mt-2"
          >
            {t("common.next", { defaultValue: "Next" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: Zones */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step2.hint", { defaultValue: "Add rooms to compute heating and ventilation needs." })}
          </div>

          <div className="space-y-2">
            {zones.map((zone) => (
              <div key={zone.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-700 block">{zone.label}</span>
                  <span className="text-xs text-slate-500">
                    {zone.area} m² • {t("hvac.need", { defaultValue: "Need" })}: {zone.powerW} W
                  </span>
                </div>
                <button type="button" onClick={() => removeZone(zone.id)} className="text-red-400 p-2">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="text-center text-sm text-slate-400 py-4 italic">
                {t("hvac.no_zones", { defaultValue: "No rooms added." })}
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 flex gap-2">
            <select
              value={newZoneType}
              onChange={(e) => setNewZoneType(e.target.value as any)}
              className="flex-1 text-sm border-slate-300 rounded-lg"
            >
              <option value="living">{t("hvac.zone.living", { defaultValue: "Living room" })}</option>
              <option value="bedroom">{t("hvac.zone.bedroom", { defaultValue: "Bedroom" })}</option>
              <option value="kitchen">{t("hvac.zone.kitchen", { defaultValue: "Kitchen" })}</option>
              <option value="bathroom">{t("hvac.zone.bathroom", { defaultValue: "Bathroom" })}</option>
              <option value="wc">{t("hvac.zone.wc", { defaultValue: "WC" })}</option>
              <option value="other">{t("hvac.zone.other", { defaultValue: "Other" })}</option>
            </select>

            <input
              type="number"
              placeholder={t("hvac.area_placeholder", { defaultValue: "m²" })}
              value={newZoneArea}
              onChange={(e) => setNewZoneArea(e.target.value)}
              className="w-20 text-sm border-slate-300 rounded-lg p-2 bg-white"
            />

            <button
              type="button"
              onClick={addZone}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform"
              title={t("common.add", { defaultValue: "Add" })}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Heating */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Flame size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step3.hint", { defaultValue: "Configure the heating system." })}
          </div>

          {zones.length === 0 && (
            <div className="flex items-start text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              {t("hvac.warn.need_zones", { defaultValue: "Add at least one room in step 2." })}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("hvac.generator", { defaultValue: "Generator" })}
              </label>
              <select
                value={generatorType}
                onChange={(e) => setGeneratorType(e.target.value as any)}
                className="w-full p-3 border rounded bg-white text-slate-900"
              >
                <option value="pac_air_water">{t("hvac.gen.pac_aw", { defaultValue: "Air-to-water heat pump" })}</option>
                <option value="pac_air_air">{t("hvac.gen.pac_aa", { defaultValue: "Air-to-air heat pump (AC)" })}</option>
                <option value="boiler_gas">{t("hvac.gen.boiler_gas", { defaultValue: "Gas boiler" })}</option>
                <option value="elec_rad">{t("hvac.gen.elec", { defaultValue: "All-electric (radiators)" })}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t("hvac.emitters", { defaultValue: "Emitters" })}
              </label>
              <select
                value={emitterType}
                onChange={(e) => setEmitterType(e.target.value as any)}
                className="w-full p-3 border rounded bg-white text-slate-900"
              >
                {generatorType === "elec_rad" ? (
                  <option value="radiator_elec">{t("hvac.emit.rad_elec", { defaultValue: "Electric radiators" })}</option>
                ) : generatorType === "pac_air_air" ? (
                  <option value="split">{t("hvac.emit.splits", { defaultValue: "Splits (indoor units)" })}</option>
                ) : (
                  <>
                    <option value="radiator_water">{t("hvac.emit.rad_water", { defaultValue: "Water radiators" })}</option>
                    <option value="floor">{t("hvac.emit.floor", { defaultValue: "Underfloor heating" })}</option>
                  </>
                )}
              </select>
            </div>

            {emitterType === "floor" && (
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in space-y-2">
                <label className="block text-xs font-bold text-slate-500">
                  {t("hvac.floor.pitch", { defaultValue: "Pipe pitch (cm)" })}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFloorPitch(15)}
                    className={`flex-1 py-1 text-sm rounded border ${
                      floorPitch === 15 ? "bg-blue-100 border-blue-300 text-blue-700 font-bold" : "bg-white"
                    }`}
                  >
                    15 cm
                  </button>
                  <button
                    type="button"
                    onClick={() => setFloorPitch(20)}
                    className={`flex-1 py-1 text-sm rounded border ${
                      floorPitch === 20 ? "bg-blue-100 border-blue-300 text-blue-700 font-bold" : "bg-white"
                    }`}
                  >
                    20 cm
                  </button>
                </div>

                <label className="block text-xs font-bold text-slate-500">
                  {t("hvac.floor.pipe_type", { defaultValue: "Pipe type" })}
                </label>
                <select
                  value={floorPipeType}
                  onChange={(e) => setFloorPipeType(e.target.value as any)}
                  className="w-full p-2 border rounded bg-white text-slate-900"
                >
                  <option value="per">PER</option>
                  <option value="multicouche">{t("hvac.pipe.multicouche", { defaultValue: "Multilayer" })}</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: VMC */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Fan size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step4.hint", { defaultValue: "Select ventilation type and ducting." })}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("hvac.vmc.type", { defaultValue: "Ventilation type" })}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {([
                ["simple_auto", t("hvac.vmc.simple_auto", { defaultValue: "Single-flow (self-regulating)" })],
                ["simple_hygro", t("hvac.vmc.hygro", { defaultValue: "Single-flow (humidity-controlled)" })],
                ["double_flux", t("hvac.vmc.double", { defaultValue: "Heat recovery ventilation" })],
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
              <h4 className="text-xs font-bold text-slate-500 uppercase">
                {t("hvac.vmc.network", { defaultValue: "Duct network" })}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    {t("common.type", { defaultValue: "Type" })}
                  </label>
                  <select
                    value={ductType}
                    onChange={(e) => setDuctType(e.target.value as any)}
                    className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                  >
                    <option value="flexible">{t("hvac.vmc.flex", { defaultValue: "Flexible" })}</option>
                    <option value="rigid">{t("hvac.vmc.rigid", { defaultValue: "Rigid" })}</option>
                  </select>
                </div>

                <label className="flex flex-wrap items-center justify-between gap-2 mt-5">
                  <span className="text-sm">{t("hvac.vmc.insulated", { defaultValue: "Insulated ducts" })}</span>
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
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Pricing */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("hvac.step5.hint", { defaultValue: "Adjust unit prices." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">
                {t("struct.common.unit_prices", { defaultValue: "Unit prices" })}
              </h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" />{" "}
                {proMode
                  ? t("struct.common.pro_mode", { defaultValue: "Pro mode" })
                  : t("struct.common.simple_mode", { defaultValue: "Simple mode" })}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("hvac.prices.pac_air_water", { defaultValue: "Air-to-water HP (€)" })}
                </label>
                <input
                  type="number"
                  value={prices.pacAirWater}
                  onChange={(e) => updatePrice("pacAirWater", e.target.value)}
                  className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("hvac.prices.boiler_gas", { defaultValue: "Gas boiler (€)" })}
                </label>
                <input
                  type="number"
                  value={prices.boilerGas}
                  onChange={(e) => updatePrice("boilerGas", e.target.value)}
                  className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("hvac.prices.radiator_water", { defaultValue: "Water radiator (€)" })}
                </label>
                <input
                  type="number"
                  value={prices.radWater}
                  onChange={(e) => updatePrice("radWater", e.target.value)}
                  className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("hvac.prices.radiator_elec", { defaultValue: "Electric radiator (€)" })}
                </label>
                <input
                  type="number"
                  value={prices.radElec}
                  onChange={(e) => updatePrice("radElec", e.target.value)}
                  className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("hvac.prices.vmc_hygro_kit", { defaultValue: "Hygro ventilation kit (€)" })}
                </label>
                <input
                  type="number"
                  value={prices.kitVmcHygro}
                  onChange={(e) => updatePrice("kitVmcHygro", e.target.value)}
                  className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  {t("hvac.prices.flex_duct_m", { defaultValue: "Flexible duct (€/m)" })}
                </label>
                <input
                  type="number"
                  value={prices.ductFlexM}
                  onChange={(e) => updatePrice("ductFlexM", e.target.value)}
                  className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-blue-600 font-bold mb-1">
                    {t("hvac.prices.labor_gen", { defaultValue: "Generator labor (€)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.installGenerator}
                    onChange={(e) => updatePrice("installGenerator", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-blue-600 font-bold mb-1">
                    {t("hvac.prices.labor_vmc", { defaultValue: "Ventilation labor (€)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.installVmc}
                    onChange={(e) => updatePrice("installVmc", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl"
                  />
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
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              disabled
              className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold shadow-sm flex justify-center items-center"
            >
              <Check size={18} className="mr-2" /> {t("struct.common.calculated", { defaultValue: "Calculated" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};