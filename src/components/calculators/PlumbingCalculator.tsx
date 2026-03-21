import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit, CalculatorSnapshot } from "@/types";
import { DEFAULT_PRICES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  Plus,
  Trash2,
  Home,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  AlertTriangle,
  Wrench,
  Bath,
  Waves,
  Thermometer,
  CircleDollarSign,
} from "lucide-react";

interface PlumbAppliance {
  id: string;
  type:
    | "wc"
    | "washbasin"
    | "shower"
    | "bath"
    | "sink"
    | "washing_machine"
    | "dishwasher"
    | "tap_ext";
  label: string;
  quantity: number;
  needsHotWater: boolean;
  drainDiameter: number; // mm
}

interface PlumbRoom {
  id: string;
  type: "kitchen" | "bathroom" | "wc" | "laundry" | "other";
  label: string;
  appliances: PlumbAppliance[];
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialSnapshot?: CalculatorSnapshot;
}

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

const inputBase = "w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl placeholder:text-slate-400";
const selectBase = "w-full p-2 text-sm border rounded bg-white text-slate-900";
const inputPro = "w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl";

export const PlumbingCalculator: React.FC<Props> = ({ onCalculate,
  initialSnapshot
}) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Project Inventory ---
  const [rooms, setRooms] = useState<PlumbRoom[]>([]);
  const [newRoomType, setNewRoomType] = useState<PlumbRoom["type"]>("bathroom");

  // --- 2. Networks ---
  const [supplyMaterial, setSupplyMaterial] = useState<"per" | "multiskin" | "copper">("per");
  const [distributionMode, setDistributionMode] = useState<"manifold" | "series">("manifold");
  const [avgDistManifold, setAvgDistManifold] = useState(6);
  const [avgDistDrain, setAvgDistDrain] = useState(3);

  // --- 3. Equipment ---
  const [waterHeater, setWaterHeater] = useState({
    active: true,
    type: "electric_tank" as "electric_tank" | "thermo",
    capacity: 200,
  });

  // --- Pricing ---
  const [prices, setPrices] = useState(() => ({
    pipePer: (DEFAULT_PRICES as any).PER_PIPE_100M ? Number((DEFAULT_PRICES as any).PER_PIPE_100M) / 100 : priceOr("PER_PIPE_M", 0.6),
    pipeMulti: priceOr("MULTICOUCHE_PIPE_M", 1.2),
    pipeCopper: priceOr("COPPER_PIPE_M", 8.0),

    pvc32: priceOr("PVC_32_M", 1.5),
    pvc40: (DEFAULT_PRICES as any).PVC_PIPE_4M ? Number((DEFAULT_PRICES as any).PVC_PIPE_4M) / 4 : priceOr("PVC_40_M", 2.0),
    pvc50: priceOr("PVC_50_M", 3.0),
    pvc100: priceOr("PVC_100_M", 5.0),

    manifoldPort: priceOr("MANIFOLD_PORT_UNIT", 8.0),
    fittingUnit: priceOr("PLUMB_FITTING_UNIT", 3.5),
    valve: priceOr("PLUMB_VALVE_UNIT", 12.0),
    siphon: priceOr("SIPHON_UNIT", 8.0),
    safetyGroup: priceOr("SAFETY_GROUP_UNIT", 25.0),

    wcPack: priceOr("WC_PACK_UNIT", 150.0),
    washbasinPack: priceOr("WASHBASIN_PACK_UNIT", 120.0),
    showerPack: priceOr("SHOWER_PACK_UNIT", 300.0),
    bathPack: priceOr("BATH_PACK_UNIT", 400.0),
    sinkPack: priceOr("SINK_PACK_UNIT", 100.0),
    tapExt: priceOr("TAP_EXT_UNIT", 35.0),

    waterHeater200: priceOr("WATER_HEATER_200L_UNIT", 350.0),

    laborPoint: priceOr("LABOR_PLUMB_POINT", 80.0),
    laborNetwork: priceOr("LABOR_PLUMB_NETWORK_M", 15.0),
  }));

  useEffect(() => {
    const values = initialSnapshot?.values as Record<string, any> | undefined;
    if (!values) return;
    if (values.step !== undefined) setStep(values.step as any);
    if (values.proMode !== undefined) setProMode(values.proMode as any);
    if (values.rooms !== undefined) setRooms(values.rooms as any);
    if (values.newRoomType !== undefined) setNewRoomType(values.newRoomType as any);
    if (values.supplyMaterial !== undefined) setSupplyMaterial(values.supplyMaterial as any);
    if (values.distributionMode !== undefined) setDistributionMode(values.distributionMode as any);
    if (values.avgDistManifold !== undefined) setAvgDistManifold(values.avgDistManifold as any);
    if (values.avgDistDrain !== undefined) setAvgDistDrain(values.avgDistDrain as any);
    if (values.waterHeater !== undefined) setWaterHeater(values.waterHeater as any);
    if (values.prices !== undefined) setPrices(values.prices as any);
  }, [initialSnapshot]);

  const snapshot: CalculatorSnapshot = {
    version: 1,
    calculatorType: CalculatorType.PLUMBING,
    values: {
      step,
      proMode,
      rooms,
      newRoomType,
      supplyMaterial,
      distributionMode,
      avgDistManifold,
      avgDistDrain,
      waterHeater,
      prices,
    },
  };


  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  const roomTypeLabel = (type: PlumbRoom["type"]) => t(`calc.plumbing.room_type.${type}`, { defaultValue: type });

  const getApplianceDefaults = (type: PlumbAppliance["type"]): Partial<PlumbAppliance> => {
    // On garde les valeurs techniques, mais le label vient de i18n (pas en dur)
    switch (type) {
      case "wc":
        return { label: t("calc.plumbing.appliance.wc"), needsHotWater: false, drainDiameter: 100 };
      case "washbasin":
        return { label: t("calc.plumbing.appliance.washbasin"), needsHotWater: true, drainDiameter: 32 };
      case "shower":
        return { label: t("calc.plumbing.appliance.shower"), needsHotWater: true, drainDiameter: 40 };
      case "bath":
        return { label: t("calc.plumbing.appliance.bath"), needsHotWater: true, drainDiameter: 40 };
      case "sink":
        return { label: t("calc.plumbing.appliance.sink"), needsHotWater: true, drainDiameter: 40 };
      case "washing_machine":
        return { label: t("calc.plumbing.appliance.washing_machine"), needsHotWater: false, drainDiameter: 40 };
      case "dishwasher":
        return { label: t("calc.plumbing.appliance.dishwasher"), needsHotWater: false, drainDiameter: 40 };
      case "tap_ext":
        return { label: t("calc.plumbing.appliance.tap_ext"), needsHotWater: false, drainDiameter: 0 };
      default:
        return { label: t("calc.plumbing.appliance.other"), needsHotWater: false, drainDiameter: 40 };
    }
  };

  const addRoom = () => {
    const countSame = rooms.filter((r) => r.type === newRoomType).length;

    const newRoom: PlumbRoom = {
      id: uid(),
      type: newRoomType,
      label: t("calc.plumbing.room_label", { type: roomTypeLabel(newRoomType), n: countSame + 1 }),
      appliances: [],
    };

    const pushApp = (tp: PlumbAppliance["type"]) => {
      const defs = getApplianceDefaults(tp);
      newRoom.appliances.push({
        id: uid(),
        type: tp,
        label: defs.label || t("calc.plumbing.appliance.generic"),
        quantity: 1,
        needsHotWater: !!defs.needsHotWater,
        drainDiameter: defs.drainDiameter ?? 40,
      });
    };

    if (newRoomType === "bathroom") {
      pushApp("washbasin");
      pushApp("shower");
    } else if (newRoomType === "wc") {
      pushApp("wc");
      pushApp("washbasin");
    } else if (newRoomType === "kitchen") {
      pushApp("sink");
      pushApp("dishwasher");
    } else if (newRoomType === "laundry") {
      pushApp("washing_machine");
    }

    setRooms((prev) => [...prev, newRoom]);
  };

  const addApplianceToRoom = (roomId: string, type: PlumbAppliance["type"]) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const defs = getApplianceDefaults(type);
        return {
          ...r,
          appliances: [
            ...r.appliances,
            {
              id: uid(),
              type,
              label: defs.label || t("calc.plumbing.appliance.generic"),
              quantity: 1,
              needsHotWater: !!defs.needsHotWater,
              drainDiameter: defs.drainDiameter ?? 40,
            },
          ],
        };
      })
    );
  };

  const removeAppliance = (roomId: string, appId: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id !== roomId ? r : { ...r, appliances: r.appliances.filter((a) => a.id !== appId) }))
    );
  };

  const updateApplianceQty = (roomId: string, appId: string, delta: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          appliances: r.appliances
            .map((a) => (a.id === appId ? { ...a, quantity: Math.max(1, (a.quantity || 1) + delta) } : a))
            .filter((a) => a.quantity > 0),
        };
      })
    );
  };

  const removeRoom = (id: string) => setRooms((prev) => prev.filter((r) => r.id !== id));

  const getHeaterBasePrice = (cap: number, type: "electric_tank" | "thermo") => {
    const base = Number(prices.waterHeater200) || 0;
    const capCoef = cap <= 100 ? 0.75 : cap <= 150 ? 0.9 : cap <= 200 ? 1 : 1.25;
    const typeCoef = type === "thermo" ? 2.2 : 1;
    return round2(base * capCoef * typeCoef);
  };

  const pipeLabel = (mat: typeof supplyMaterial) =>
    mat === "per"
      ? t("calc.plumbing.pipe.per")
      : mat === "multiskin"
      ? t("calc.plumbing.pipe.multiskin")
      : t("calc.plumbing.pipe.copper");

  const distributionLabel = (m: typeof distributionMode) =>
    m === "series" ? t("calc.plumbing.distribution.series") : t("calc.plumbing.distribution.manifold");

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalColdLines = 0;
    let totalHotLines = 0;

    let lenSupply = 0;
    let lenDrain32 = 0;
    let lenDrain40 = 0;
    let lenDrain50 = 0;
    let lenDrain100 = 0;

    let countSiphons = 0;
    let countFittings = 0;

    const warnings: string[] = [];
    const appliancesSummary: Record<string, number> = {};

    const distCoef = distributionMode === "series" ? 0.65 : 1;

    rooms.forEach((r) => {
      r.appliances.forEach((a) => {
        const qty = Math.max(1, a.quantity || 1);

        totalColdLines += qty;
        if (a.needsHotWater) totalHotLines += qty;

        const linesCount = qty * (a.needsHotWater ? 2 : 1);
        lenSupply += linesCount * avgDistManifold * distCoef;

        if (a.drainDiameter > 0) {
          const len = qty * avgDistDrain;
          if (a.drainDiameter === 32) lenDrain32 += len;
          else if (a.drainDiameter === 40) lenDrain40 += len;
          else if (a.drainDiameter === 50) lenDrain50 += len;
          else if (a.drainDiameter === 100) lenDrain100 += len;
          else lenDrain40 += len;
          countSiphons += qty;
        }

        countFittings += linesCount * 4;
        appliancesSummary[a.type] = (appliancesSummary[a.type] || 0) + qty;
      });
    });

    const totalManifoldPorts = totalColdLines + totalHotLines;
    const manifoldsCold = Math.ceil(totalColdLines / 5);
    const manifoldsHot = Math.ceil(totalHotLines / 5);

    // Chauffe-eau
    let heaterPackCost = 0;
    if (waterHeater.active) {
      const heaterPrice = getHeaterBasePrice(waterHeater.capacity, waterHeater.type);
      heaterPackCost = heaterPrice + prices.safetyGroup + 20;

      lenSupply += 2;
      lenDrain32 += 2;
    } else if (totalHotLines > 0) {
      warnings.push(t("calc.plumbing.warn_hot_needed_no_heater"));
    }

    const materialsList: any[] = [];
    let totalCost = 0;

    // Supply pipe
    const pricePipe =
      supplyMaterial === "per" ? prices.pipePer : supplyMaterial === "multiskin" ? prices.pipeMulti : prices.pipeCopper;

    if (lenSupply > 0) {
      const costSupplyPipe = lenSupply * pricePipe;
      totalCost += costSupplyPipe;
      materialsList.push({
        id: "pipe_supply",
        name: pipeLabel(supplyMaterial),
        quantity: Math.ceil(lenSupply),
        quantityRaw: lenSupply,
        unit: Unit.METER,
        unitPrice: round2(pricePipe),
        totalPrice: round2(costSupplyPipe),
        category: CalculatorType.PLUMBING,
        details: distributionMode === "series" ? t("calc.plumbing.detail.series_coef") : t("calc.plumbing.detail.manifold_mode"),
      });
    }

    // Drain pipes
    const addDrain = (id: string, name: string, len: number, unitPrice: number) => {
      if (len <= 0) return;
      const cost = len * unitPrice;
      totalCost += cost;
      materialsList.push({
        id,
        name,
        quantity: Math.ceil(len),
        quantityRaw: len,
        unit: Unit.METER,
        unitPrice: round2(unitPrice),
        totalPrice: round2(cost),
        category: CalculatorType.PLUMBING,
      });
    };
    addDrain("pvc32", t("calc.plumbing.mat.pvc32"), lenDrain32, prices.pvc32);
    addDrain("pvc40", t("calc.plumbing.mat.pvc40"), lenDrain40, prices.pvc40);
    addDrain("pvc50", t("calc.plumbing.mat.pvc50"), lenDrain50, prices.pvc50);
    addDrain("pvc100", t("calc.plumbing.mat.pvc100"), lenDrain100, prices.pvc100);

    // Manifolds
    if (distributionMode === "manifold" && totalManifoldPorts > 0) {
      const costManifolds = totalManifoldPorts * prices.manifoldPort;
      totalCost += costManifolds;
      materialsList.push({
        id: "manifolds",
        name: t("calc.plumbing.mat.manifolds"),
        quantity: manifoldsCold + manifoldsHot,
        quantityRaw: totalManifoldPorts,
        unit: Unit.PIECE,
        unitPrice: round2(prices.manifoldPort * 5),
        totalPrice: round2(costManifolds),
        category: CalculatorType.PLUMBING,
        details: t("calc.plumbing.mat.manifolds_details", { ports: totalManifoldPorts }),
      });
    }

    // Fittings (lot)
    if (countFittings > 0) {
      const costFittings = countFittings * prices.fittingUnit;
      totalCost += costFittings;
      materialsList.push({
        id: "fittings",
        name: t("calc.plumbing.mat.fittings"),
        quantity: 1,
        quantityRaw: countFittings,
        unit: Unit.PACKAGE,
        unitPrice: round2(costFittings),
        totalPrice: round2(costFittings),
        category: CalculatorType.PLUMBING,
        details: t("calc.plumbing.mat.fittings_details", { n: countFittings }),
      });
    }

    // Siphons
    if (countSiphons > 0) {
      const costSiphons = countSiphons * prices.siphon;
      totalCost += costSiphons;
      materialsList.push({
        id: "siphons",
        name: t("calc.plumbing.mat.siphons"),
        quantity: countSiphons,
        unit: Unit.PIECE,
        unitPrice: round2(prices.siphon),
        totalPrice: round2(costSiphons),
        category: CalculatorType.PLUMBING,
      });
    }

    // Appliances packs
    const addPack = (key: string, label: string, qty: number, unitPrice: number) => {
      if (!qty || qty <= 0 || unitPrice <= 0) return;
      const cost = qty * unitPrice;
      totalCost += cost;
      materialsList.push({
        id: `app_${key}`,
        name: label,
        quantity: qty,
        unit: Unit.PIECE,
        unitPrice: round2(unitPrice),
        totalPrice: round2(cost),
        category: CalculatorType.PLUMBING,
      });
    };

    addPack("wc", t("calc.plumbing.pack.wc"), appliancesSummary.wc || 0, prices.wcPack);
    addPack("washbasin", t("calc.plumbing.pack.washbasin"), appliancesSummary.washbasin || 0, prices.washbasinPack);
    addPack("shower", t("calc.plumbing.pack.shower"), appliancesSummary.shower || 0, prices.showerPack);
    addPack("bath", t("calc.plumbing.pack.bath"), appliancesSummary.bath || 0, prices.bathPack);
    addPack("sink", t("calc.plumbing.pack.sink"), appliancesSummary.sink || 0, prices.sinkPack);
    addPack("tap_ext", t("calc.plumbing.pack.tap_ext"), appliancesSummary.tap_ext || 0, prices.tapExt);

    // Water heater pack
    if (waterHeater.active) {
      const heaterPrice = getHeaterBasePrice(waterHeater.capacity, waterHeater.type);
      totalCost += heaterPackCost;

      materialsList.push(
        {
          id: "heater",
          name: t("calc.plumbing.mat.heater", {
            type: waterHeater.type === "electric_tank" ? t("calc.plumbing.heater_type.electric") : t("calc.plumbing.heater_type.thermo"),
            cap: waterHeater.capacity,
          }),
          quantity: 1,
          unit: Unit.PIECE,
          unitPrice: round2(heaterPrice),
          totalPrice: round2(heaterPrice),
          category: CalculatorType.PLUMBING,
        },
        {
          id: "safety_group",
          name: t("calc.plumbing.mat.safety_group"),
          quantity: 1,
          unit: Unit.PIECE,
          unitPrice: round2(prices.safetyGroup),
          totalPrice: round2(prices.safetyGroup),
          category: CalculatorType.PLUMBING,
        }
      );

      const misc = heaterPackCost - heaterPrice - prices.safetyGroup;
      if (misc > 0) {
        materialsList.push({
          id: "heater_misc",
          name: t("calc.plumbing.mat.heater_misc"),
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: round2(misc),
          totalPrice: round2(misc),
          category: CalculatorType.PLUMBING,
        });
      }
    }

    // Consumables
    const totalApps = Object.values(appliancesSummary).reduce((a, b) => a + b, 0);
    const hasNetworks = lenSupply + lenDrain32 + lenDrain40 + lenDrain50 + lenDrain100 > 0;
    if (totalApps > 0 || hasNetworks) {
      const costConsumables = 50;
      totalCost += costConsumables;
      materialsList.push({
        id: "consumables",
        name: t("calc.plumbing.mat.consumables"),
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: costConsumables,
        totalPrice: costConsumables,
        category: CalculatorType.PLUMBING,
      });
    }

    // Labor
    if (proMode) {
      const pipeTotal = lenSupply + lenDrain32 + lenDrain40 + lenDrain50 + lenDrain100;
      const laborPts = totalApps * prices.laborPoint;
      const laborPipes = pipeTotal * prices.laborNetwork;

      totalCost += laborPts + laborPipes;

      if (totalApps > 0) {
        materialsList.push({
          id: "labor_pts",
          name: t("calc.plumbing.mat.labor_apps"),
          quantity: totalApps,
          unit: Unit.PIECE,
          unitPrice: round2(prices.laborPoint),
          totalPrice: round2(laborPts),
          category: CalculatorType.PLUMBING,
        });
      }
      if (pipeTotal > 0) {
        materialsList.push({
          id: "labor_pipes",
          name: t("calc.plumbing.mat.labor_network"),
          quantity: round2(pipeTotal),
          unit: Unit.METER,
          unitPrice: round2(prices.laborNetwork),
          totalPrice: round2(laborPipes),
          category: CalculatorType.PLUMBING,
        });
      }
    }

    if (rooms.length === 0) warnings.push(t("calc.plumbing.warn_add_room"));
    if (rooms.length > 0 && totalApps === 0) warnings.push(t("calc.plumbing.warn_no_appliance"));

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      warnings,
      summaryStats: {
        totalColdLines,
        totalHotLines,
        totalDrainLen: lenDrain32 + lenDrain40 + lenDrain50 + lenDrain100,
        totalSupplyLen: lenSupply,
        totalApps,
      },
    };
  }, [
    t,
    rooms,
    supplyMaterial,
    distributionMode,
    avgDistManifold,
    avgDistDrain,
    waterHeater,
    prices,
    proMode,
  ]);

  useEffect(() => {
    onCalculate({
      snapshot,
      summary: t("calc.plumbing.summary", { n: calculationData.summaryStats.totalApps }),
      details: [
        { label: t("calc.plumbing.detail.cold"), value: calculationData.summaryStats.totalColdLines, unit: "u" },
        { label: t("calc.plumbing.detail.hot"), value: calculationData.summaryStats.totalHotLines, unit: "u" },
        { label: t("calc.plumbing.detail.supply"), value: Math.ceil(calculationData.summaryStats.totalSupplyLen), unit: "m" },
        { label: t("calc.plumbing.detail.drain"), value: Math.ceil(calculationData.summaryStats.totalDrainLen), unit: "m" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, t]);

  const stepLabel = (s: number) => (s === 1 ? t("calc.plumbing.step_1") : s === 2 ? t("calc.plumbing.step_2") : s === 3 ? t("calc.plumbing.step_3") : t("calc.plumbing.step_4"));

  return (
    <div className="space-y-5 rounded-[28px] border border-white/70 bg-white/74 p-3.5 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-5">
      {/* Navigation */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner backdrop-blur-xl no-scrollbar">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[80px] py-2 text-xs font-extrabold rounded-2xl transition-all ${
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
            <Home size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.plumbing.help_step1")}
          </div>

          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="bg-white p-1.5 rounded-lg shadow-sm">
                      {room.type === "kitchen" && <LayoutGrid size={16} className="text-orange-500" />}
                      {room.type === "bathroom" && <Bath size={16} className="text-cyan-500" />}
                      {room.type === "wc" && <Wrench size={16} className="text-slate-500" />}
                      {room.type === "laundry" && <Waves size={16} className="text-blue-500" />}
                      {room.type === "other" && <Wrench size={16} className="text-slate-500" />}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{room.label}</span>
                  </div>
                  <button type="button" onClick={() => removeRoom(room.id)} className="text-slate-300 hover:text-red-400" aria-label={t("common.remove")}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {room.appliances.map((app) => (
                    <div key={app.id} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0">
                      <div className="flex items-center min-w-0">
                        {app.needsHotWater ? (
                          <span className="w-2 h-2 rounded-full bg-red-400 mr-2 shrink-0" title={t("calc.plumbing.hot")} />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 shrink-0" title={t("calc.plumbing.cold")} />
                        )}
                        <span className="text-slate-700 truncate">{app.label}</span>
                        {app.drainDiameter > 0 && <span className="ml-2 text-[10px] text-slate-400">Ø{app.drainDiameter}</span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateApplianceQty(room.id, app.id, -1)}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100"
                            title={t("common.decrease")}
                          >
                            -
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{app.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateApplianceQty(room.id, app.id, +1)}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100"
                            title={t("common.increase")}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAppliance(room.id, app.id)}
                          className="text-slate-300 hover:text-red-400"
                          title={t("common.remove")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {(
                      [
                        ["wc", "calc.plumbing.appliance.wc"],
                        ["washbasin", "calc.plumbing.appliance.washbasin"],
                        ["shower", "calc.plumbing.appliance.shower"],
                        ["bath", "calc.plumbing.appliance.bath"],
                        ["sink", "calc.plumbing.appliance.sink"],
                        ["washing_machine", "calc.plumbing.appliance.washing_machine"],
                        ["dishwasher", "calc.plumbing.appliance.dishwasher"],
                        ["tap_ext", "calc.plumbing.appliance.tap_ext"],
                      ] as const
                    ).map(([tp, key]) => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => addApplianceToRoom(room.id, tp)}
                        className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200"
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 flex gap-2">
            <select
              value={newRoomType}
              onChange={(e) => setNewRoomType(e.target.value as any)}
              className="flex-1 text-sm border-slate-300 rounded-lg bg-white text-slate-900"
            >
              {(["bathroom", "kitchen", "wc", "laundry", "other"] as const).map((rt) => (
                <option key={rt} value={rt}>
                  {roomTypeLabel(rt)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addRoom}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center"
            >
              <Plus size={16} className="mr-1" /> {t("common.add")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center mt-4 disabled:opacity-50"
            disabled={rooms.length === 0}
          >
            {t("common.next")} <ArrowRight size={18} className="ml-2" />
          </button>

          {rooms.length === 0 && <div className="text-xs text-slate-400 text-center">{t("calc.plumbing.hint_add_room")}</div>}
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Wrench size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.plumbing.help_step2")}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.plumbing.supply_title")}</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.material")}</label>
                <select value={supplyMaterial} onChange={(e) => setSupplyMaterial(e.target.value as any)} className={selectBase}>
                  <option value="per">{t("calc.plumbing.material_per")}</option>
                  <option value="multiskin">{t("calc.plumbing.material_multiskin")}</option>
                  <option value="copper">{t("calc.plumbing.material_copper")}</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.distribution_title")}</label>
                <select value={distributionMode} onChange={(e) => setDistributionMode(e.target.value as any)} className={selectBase}>
                  <option value="manifold">{t("calc.plumbing.distribution.manifold")}</option>
                  <option value="series">{t("calc.plumbing.distribution.series")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.avg_distance_supply_m")}</label>
              <input
                type="number"
                value={avgDistManifold}
                onChange={(e) => setAvgDistManifold(clamp(toNum(e.target.value, 6), 0, 50))}
                className={selectBase}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {distributionMode === "series" ? t("calc.plumbing.series_help") : t("calc.plumbing.manifold_help")}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.plumbing.drain_title")}</h4>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.avg_distance_drain_m")}</label>
              <input
                type="number"
                value={avgDistDrain}
                onChange={(e) => setAvgDistDrain(clamp(toNum(e.target.value, 3), 0, 50))}
                className={selectBase}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
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
            <Thermometer size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.plumbing.help_step3")}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-slate-800">{t("calc.plumbing.heater_title")}</span>
              <input
                type="checkbox"
                checked={waterHeater.active}
                onChange={(e) => setWaterHeater({ ...waterHeater, active: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>

            {waterHeater.active && (
              <div className="space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.heater_type_title")}</label>
                    <select
                      value={waterHeater.type}
                      onChange={(e) => setWaterHeater({ ...waterHeater, type: e.target.value as any })}
                      className={selectBase}
                    >
                      <option value="electric_tank">{t("calc.plumbing.heater_type.electric")}</option>
                      <option value="thermo">{t("calc.plumbing.heater_type.thermo")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.heater_capacity_l")}</label>
                    <select
                      value={waterHeater.capacity}
                      onChange={(e) => setWaterHeater({ ...waterHeater, capacity: toNum(e.target.value, 200) })}
                      className={selectBase}
                    >
                      {[100, 150, 200, 300].map((v) => (
                        <option key={v} value={v}>
                          {v} L
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-start bg-slate-50 p-2 rounded text-xs text-slate-600">
                  <Check size={14} className="mr-2 mt-0.5 text-emerald-500" />
                  {t("calc.plumbing.heater_auto_included")}
                </div>
              </div>
            )}
          </div>

          {calculationData.warnings?.length ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-xs text-amber-700">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              <div className="space-y-1">
                {calculationData.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
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
            {t("calc.plumbing.help_step4")}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.plumbing.prices_title")}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? t("common.pro_mode") : t("common.simple_mode")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("calc.plumbing.price_pipe_selected", { pipe: pipeLabel(supplyMaterial) })} (€/m)
                </label>
                <input
                  type="number"
                  value={supplyMaterial === "per" ? prices.pipePer : supplyMaterial === "multiskin" ? prices.pipeMulti : prices.pipeCopper}
                  onChange={(e) =>
                    updatePrice(
                      supplyMaterial === "per" ? "pipePer" : supplyMaterial === "multiskin" ? "pipeMulti" : "pipeCopper",
                      e.target.value
                    )
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.price_pvc40")} (€/m)</label>
                <input type="number" value={prices.pvc40} onChange={(e) => updatePrice("pvc40", e.target.value)} className={inputBase} />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.price_wc_pack")} (€)</label>
                <input type="number" value={prices.wcPack} onChange={(e) => updatePrice("wcPack", e.target.value)} className={inputBase} />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.plumbing.price_heater_base_200")} (€)</label>
                <input type="number" value={prices.waterHeater200} onChange={(e) => updatePrice("waterHeater200", e.target.value)} className={inputBase} />
                <p className="text-[10px] text-slate-400 mt-1">{t("calc.plumbing.heater_coef_help")}</p>
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.plumbing.price_labor_point")} (€)</label>
                  <input type="number" value={prices.laborPoint} onChange={(e) => updatePrice("laborPoint", e.target.value)} className={inputPro} />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.plumbing.price_labor_network")} (€/m)</label>
                  <input type="number" value={prices.laborNetwork} onChange={(e) => updatePrice("laborNetwork", e.target.value)} className={inputPro} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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