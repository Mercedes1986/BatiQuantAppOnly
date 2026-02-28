import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
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

const inputBase =
  "w-full p-1.5 border rounded text-sm bg-white text-slate-900 placeholder:text-slate-400";
const selectBase = "w-full p-2 text-sm border rounded bg-white text-slate-900";
const inputPro =
  "w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900";

export const PlumbingCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Project Inventory ---
  const [rooms, setRooms] = useState<PlumbRoom[]>([]);
  const [newRoomType, setNewRoomType] = useState<PlumbRoom["type"]>("bathroom");

  // --- 2. Networks ---
  const [supplyMaterial, setSupplyMaterial] = useState<"per" | "multiskin" | "copper">("per");
  const [distributionMode, setDistributionMode] = useState<"manifold" | "series">("manifold");
  const [avgDistManifold, setAvgDistManifold] = useState(6); // m
  const [avgDistDrain, setAvgDistDrain] = useState(3); // m

  // --- 3. Equipment ---
  const [waterHeater, setWaterHeater] = useState({
    active: true,
    type: "electric_tank" as "electric_tank" | "thermo",
    capacity: 200, // L
  });

  // --- 4. Pricing ---
  const [prices, setPrices] = useState(() => ({
    // Supply Pipe (€/m)
    pipePer:
      (DEFAULT_PRICES as any).PER_PIPE_100M
        ? Number((DEFAULT_PRICES as any).PER_PIPE_100M) / 100
        : priceOr("PER_PIPE_M", 0.6),
    pipeMulti: priceOr("MULTICOUCHE_PIPE_M", 1.2),
    pipeCopper: priceOr("COPPER_PIPE_M", 8.0),

    // Drain Pipe (€/m)
    pvc32: priceOr("PVC_32_M", 1.5),
    pvc40:
      (DEFAULT_PRICES as any).PVC_PIPE_4M
        ? Number((DEFAULT_PRICES as any).PVC_PIPE_4M) / 4
        : priceOr("PVC_40_M", 2.0),
    pvc50: priceOr("PVC_50_M", 3.0),
    pvc100: priceOr("PVC_100_M", 5.0),

    // Fittings & Accessories
    manifoldPort: priceOr("MANIFOLD_PORT_UNIT", 8.0),
    fittingUnit: priceOr("PLUMB_FITTING_UNIT", 3.5),
    valve: priceOr("PLUMB_VALVE_UNIT", 12.0),
    siphon: priceOr("SIPHON_UNIT", 8.0),
    safetyGroup: priceOr("SAFETY_GROUP_UNIT", 25.0),

    // Appliances (Supply)
    wcPack: priceOr("WC_PACK_UNIT", 150.0),
    washbasinPack: priceOr("WASHBASIN_PACK_UNIT", 120.0),
    showerPack: priceOr("SHOWER_PACK_UNIT", 300.0),
    bathPack: priceOr("BATH_PACK_UNIT", 400.0),
    sinkPack: priceOr("SINK_PACK_UNIT", 100.0),
    tapExt: priceOr("TAP_EXT_UNIT", 35.0),

    // Water heater base (default 200L)
    waterHeater200: priceOr("WATER_HEATER_200L_UNIT", 350.0),

    // Labor
    laborPoint: 80.0, // €/appareil
    laborNetwork: 15.0, // €/m réseaux
  }));

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- Helpers: Defaults ---
  const getApplianceDefaults = (type: PlumbAppliance["type"]): Partial<PlumbAppliance> => {
    switch (type) {
      case "wc":
        return { label: "WC", needsHotWater: false, drainDiameter: 100 };
      case "washbasin":
        return { label: "Lavabo / Vasque", needsHotWater: true, drainDiameter: 32 };
      case "shower":
        return { label: "Douche", needsHotWater: true, drainDiameter: 40 };
      case "bath":
        return { label: "Baignoire", needsHotWater: true, drainDiameter: 40 };
      case "sink":
        return { label: "Évier Cuisine", needsHotWater: true, drainDiameter: 40 };
      case "washing_machine":
        return { label: "Lave-Linge", needsHotWater: false, drainDiameter: 40 };
      case "dishwasher":
        return { label: "Lave-Vaisselle", needsHotWater: false, drainDiameter: 40 };
      case "tap_ext":
        return { label: "Robinet Ext.", needsHotWater: false, drainDiameter: 0 };
      default:
        return { label: "Autre", needsHotWater: false, drainDiameter: 40 };
    }
  };

  const addRoom = () => {
    const labelMap: Record<PlumbRoom["type"], string> = {
      kitchen: "Cuisine",
      bathroom: "Salle de Bain",
      wc: "WC",
      laundry: "Buanderie",
      other: "Autre",
    };

    const countSame = rooms.filter((r) => r.type === newRoomType).length;

    const newRoom: PlumbRoom = {
      id: uid(),
      type: newRoomType,
      label: `${labelMap[newRoomType]} ${countSame + 1}`,
      appliances: [],
    };

    const pushApp = (t: PlumbAppliance["type"]) => {
      const defs = getApplianceDefaults(t);
      newRoom.appliances.push({
        id: uid(),
        type: t,
        label: defs.label || "Appareil",
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
              label: defs.label || "Appareil",
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
    const capCoef = cap <= 100 ? 0.75 : cap <= 150 ? 0.9 : cap <= 200 ? 1 : 1.25; // 300L
    const typeCoef = type === "thermo" ? 2.2 : 1;
    return round2(base * capCoef * typeCoef);
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalColdLines = 0;
    let totalHotLines = 0;

    let lenSupply = 0; // includes EF + EC
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
      heaterPackCost = heaterPrice + prices.safetyGroup + 20; // misc

      lenSupply += 2;
      lenDrain32 += 2;
    } else if (totalHotLines > 0) {
      warnings.push("Des appareils nécessitent de l'eau chaude mais le chauffe-eau est désactivé.");
    }

    const materialsList: any[] = [];
    let totalCost = 0;

    // Supply pipe
    const pricePipe =
      supplyMaterial === "per" ? prices.pipePer : supplyMaterial === "multiskin" ? prices.pipeMulti : prices.pipeCopper;
    const labelPipe =
      supplyMaterial === "per"
        ? "Tube PER (gaine incluse)"
        : supplyMaterial === "multiskin"
        ? "Tube Multicouche"
        : "Tube Cuivre";

    if (lenSupply > 0) {
      const costSupplyPipe = lenSupply * pricePipe;
      totalCost += costSupplyPipe;
      materialsList.push({
        id: "pipe_supply",
        name: labelPipe,
        quantity: Math.ceil(lenSupply),
        quantityRaw: lenSupply,
        unit: Unit.METER,
        unitPrice: round2(pricePipe),
        totalPrice: round2(costSupplyPipe),
        category: CalculatorType.PLUMBING,
        details: distributionMode === "series" ? "Repiquage (coef réduction)" : "Nourrice (pieuvre)",
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
    addDrain("pvc32", "Tube PVC Ø32", lenDrain32, prices.pvc32);
    addDrain("pvc40", "Tube PVC Ø40", lenDrain40, prices.pvc40);
    addDrain("pvc50", "Tube PVC Ø50", lenDrain50, prices.pvc50);
    addDrain("pvc100", "Tube PVC Ø100", lenDrain100, prices.pvc100);

    // Manifolds
    if (distributionMode === "manifold" && totalManifoldPorts > 0) {
      const costManifolds = totalManifoldPorts * prices.manifoldPort;
      totalCost += costManifolds;
      materialsList.push({
        id: "manifolds",
        name: "Nourrices / Collecteurs",
        quantity: manifoldsCold + manifoldsHot,
        quantityRaw: totalManifoldPorts,
        unit: Unit.PIECE,
        unitPrice: round2(prices.manifoldPort * 5),
        totalPrice: round2(costManifolds),
        category: CalculatorType.PLUMBING,
        details: `${totalManifoldPorts} départs (EF+EC)`,
      });
    }

    // Fittings (lot)
    if (countFittings > 0) {
      const costFittings = countFittings * prices.fittingUnit;
      totalCost += costFittings;
      materialsList.push({
        id: "fittings",
        name: "Raccords & coudes (lot)",
        quantity: 1,
        quantityRaw: countFittings,
        unit: Unit.PACKAGE,
        unitPrice: round2(costFittings),
        totalPrice: round2(costFittings),
        category: CalculatorType.PLUMBING,
        details: `Estimation ~${countFittings} pièces`,
      });
    }

    // Siphons
    if (countSiphons > 0) {
      const costSiphons = countSiphons * prices.siphon;
      totalCost += costSiphons;
      materialsList.push({
        id: "siphons",
        name: "Siphons & bondes",
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

    addPack("wc", "Pack WC", appliancesSummary.wc || 0, prices.wcPack);
    addPack("washbasin", "Meuble vasque + robinet", appliancesSummary.washbasin || 0, prices.washbasinPack);
    addPack("shower", "Pack douche", appliancesSummary.shower || 0, prices.showerPack);
    addPack("bath", "Baignoire + robinet", appliancesSummary.bath || 0, prices.bathPack);
    addPack("sink", "Évier + robinet", appliancesSummary.sink || 0, prices.sinkPack);
    addPack("tap_ext", "Robinet puisage", appliancesSummary.tap_ext || 0, prices.tapExt);

    // Chauffe-eau pack
    if (waterHeater.active) {
      const heaterPrice = getHeaterBasePrice(waterHeater.capacity, waterHeater.type);
      totalCost += heaterPackCost;

      materialsList.push(
        {
          id: "heater",
          name: `Chauffe-eau ${waterHeater.type === "electric_tank" ? "électrique" : "thermodynamique"} ${waterHeater.capacity}L`,
          quantity: 1,
          unit: Unit.PIECE,
          unitPrice: round2(heaterPrice),
          totalPrice: round2(heaterPrice),
          category: CalculatorType.PLUMBING,
        },
        {
          id: "safety_group",
          name: "Groupe de sécurité",
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
          name: "Raccords / accessoires chauffe-eau",
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: round2(misc),
          totalPrice: round2(misc),
          category: CalculatorType.PLUMBING,
        });
      }
    }

    // Consumables (only if there is something)
    const totalApps = Object.values(appliancesSummary).reduce((a, b) => a + b, 0);
    const hasNetworks = lenSupply + lenDrain32 + lenDrain40 + lenDrain50 + lenDrain100 > 0;
    if (totalApps > 0 || hasNetworks) {
      const costConsumables = 50;
      totalCost += costConsumables;
      materialsList.push({
        id: "consumables",
        name: "Consommables (colle, colliers, joints)",
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
          name: "Main d'œuvre (pose appareils)",
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
          name: "Main d'œuvre (réseaux)",
          quantity: round2(pipeTotal),
          unit: Unit.METER,
          unitPrice: round2(prices.laborNetwork),
          totalPrice: round2(laborPipes),
          category: CalculatorType.PLUMBING,
        });
      }
    }

    if (rooms.length === 0) warnings.push("Ajoutez au moins une pièce pour obtenir un calcul.");
    if (rooms.length > 0 && totalApps === 0) warnings.push("Aucun appareil : ajoutez des équipements dans les pièces.");

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
    rooms,
    supplyMaterial,
    distributionMode,
    avgDistManifold,
    avgDistDrain,
    waterHeater,
    prices,
    proMode,
  ]);

  // Pass results to parent
  useEffect(() => {
    onCalculate({
      summary: `${calculationData.summaryStats.totalApps} Appareils`,
      details: [
        { label: "Départs EF", value: calculationData.summaryStats.totalColdLines, unit: "u" },
        { label: "Départs EC", value: calculationData.summaryStats.totalHotLines, unit: "u" },
        { label: "Tubes alim.", value: Math.ceil(calculationData.summaryStats.totalSupplyLen), unit: "m" },
        { label: "Évacuation", value: Math.ceil(calculationData.summaryStats.totalDrainLen), unit: "m" },
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
            className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Pièces"}
            {s === 2 && "2. Réseaux"}
            {s === 3 && "3. Équip."}
            {s === 4 && "4. Devis"}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Home size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajoutez les pièces d'eau et leurs équipements.
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
                  <button type="button" onClick={() => removeRoom(room.id)} className="text-slate-300 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="p-3 space-y-2">
                  {room.appliances.map((app) => (
                    <div
                      key={app.id}
                      className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0"
                    >
                      <div className="flex items-center min-w-0">
                        {app.needsHotWater ? (
                          <span className="w-2 h-2 rounded-full bg-red-400 mr-2 shrink-0" title="Eau chaude" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 shrink-0" title="Eau froide" />
                        )}
                        <span className="text-slate-700 truncate">{app.label}</span>
                        {app.drainDiameter > 0 && (
                          <span className="ml-2 text-[10px] text-slate-400">Ø{app.drainDiameter}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateApplianceQty(room.id, app.id, -1)}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100"
                            title="Diminuer"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold w-5 text-center">{app.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateApplianceQty(room.id, app.id, +1)}
                            className="w-6 h-6 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100"
                            title="Augmenter"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAppliance(room.id, app.id)}
                          className="text-slate-300 hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "wc")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      WC
                    </button>
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "washbasin")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      Lavabo
                    </button>
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "shower")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      Douche
                    </button>
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "bath")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      Bain
                    </button>
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "sink")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      Évier
                    </button>
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "washing_machine")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      L.Linge
                    </button>
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "dishwasher")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      L.Vaisselle
                    </button>
                    <button type="button" onClick={() => addApplianceToRoom(room.id, "tap_ext")} className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200">
                      Robinet ext.
                    </button>
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
              <option value="bathroom">Salle de Bain</option>
              <option value="kitchen">Cuisine</option>
              <option value="wc">WC</option>
              <option value="laundry">Buanderie</option>
              <option value="other">Autre</option>
            </select>
            <button
              type="button"
              onClick={addRoom}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center"
            >
              <Plus size={16} className="mr-1" /> Ajouter
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-4 disabled:opacity-50"
            disabled={rooms.length === 0}
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>

          {rooms.length === 0 && (
            <div className="text-xs text-slate-400 text-center">Ajoutez au moins une pièce pour continuer.</div>
          )}
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Wrench size={16} className="mr-2 shrink-0 mt-0.5" />
            Configuration des réseaux (alimentation + évacuation).
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Alimentation</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Matériau</label>
                <select value={supplyMaterial} onChange={(e) => setSupplyMaterial(e.target.value as any)} className={selectBase}>
                  <option value="per">PER</option>
                  <option value="multiskin">Multicouche</option>
                  <option value="copper">Cuivre</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Distribution</label>
                <select value={distributionMode} onChange={(e) => setDistributionMode(e.target.value as any)} className={selectBase}>
                  <option value="manifold">Nourrice (pieuvre)</option>
                  <option value="series">Repiquage (série)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Distance moyenne (m)</label>
              <input
                type="number"
                value={avgDistManifold}
                onChange={(e) => setAvgDistManifold(clamp(toNum(e.target.value, 6), 0, 50))}
                className={selectBase}
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {distributionMode === "series"
                  ? "Repiquage : coefficient de réduction appliqué sur la longueur."
                  : "Nourrice : longueur par appareil (aller EF + EC si nécessaire)."}
              </p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase">Évacuation (PVC)</h4>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Distance moyenne vers chute (m)</label>
              <input
                type="number"
                value={avgDistDrain}
                onChange={(e) => setAvgDistDrain(clamp(toNum(e.target.value, 3), 0, 50))}
                className={selectBase}
              />
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
            <Thermometer size={16} className="mr-2 shrink-0 mt-0.5" />
            Chauffe-eau et options.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-slate-800">Chauffe-eau</span>
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
                    <label className="block text-[10px] text-slate-500 mb-1">Type</label>
                    <select
                      value={waterHeater.type}
                      onChange={(e) => setWaterHeater({ ...waterHeater, type: e.target.value as any })}
                      className={selectBase}
                    >
                      <option value="electric_tank">Cumulus électrique</option>
                      <option value="thermo">Thermodynamique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Capacité (L)</label>
                    <select
                      value={waterHeater.capacity}
                      onChange={(e) => setWaterHeater({ ...waterHeater, capacity: toNum(e.target.value, 200) })}
                      className={selectBase}
                    >
                      <option value={100}>100 L</option>
                      <option value={150}>150 L</option>
                      <option value={200}>200 L</option>
                      <option value={300}>300 L</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-start bg-slate-50 p-2 rounded text-xs text-slate-600">
                  <Check size={14} className="mr-2 mt-0.5 text-emerald-500" />
                  Groupe de sécurité + accessoires comptés automatiquement.
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
            Ajustez les prix unitaires (optionnel).
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Prix</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? "Mode Pro" : "Mode Simple"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  Tube {supplyMaterial === "per" ? "PER" : supplyMaterial === "multiskin" ? "Multicouche" : "Cuivre"} (€/m)
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
                <label className="block text-[10px] text-slate-500 mb-1">PVC Ø40 (€/m)</label>
                <input type="number" value={prices.pvc40} onChange={(e) => updatePrice("pvc40", e.target.value)} className={inputBase} />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Pack WC (€)</label>
                <input type="number" value={prices.wcPack} onChange={(e) => updatePrice("wcPack", e.target.value)} className={inputBase} />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Base chauffe-eau 200L (€)</label>
                <input type="number" value={prices.waterHeater200} onChange={(e) => updatePrice("waterHeater200", e.target.value)} className={inputBase} />
                <p className="text-[10px] text-slate-400 mt-1">Capacité + type appliquent un coefficient.</p>
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO / appareil (€)</label>
                  <input type="number" value={prices.laborPoint} onChange={(e) => updatePrice("laborPoint", e.target.value)} className={inputPro} />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO réseaux (€/m)</label>
                  <input type="number" value={prices.laborNetwork} onChange={(e) => updatePrice("laborNetwork", e.target.value)} className={inputPro} />
                </div>
              </div>
            )}
          </div>

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