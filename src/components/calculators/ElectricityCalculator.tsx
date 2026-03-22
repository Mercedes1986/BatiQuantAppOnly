import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CalculatorType, CalculationResult, Unit, CalculatorSnapshot } from "@/types";
import { DEFAULT_PRICES } from "@/constants";
import {
  Zap,
  Plus,
  Trash2,
  Home,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  Lightbulb,
  Power,
  ToggleLeft,
  Cable,
  CircleDollarSign,
  Droplets,
  Wifi,
} from "lucide-react";

interface ElecPoint {
  id: string;
  type:
    | "socket"
    | "socket_spec"
    | "light"
    | "switch"
    | "shutter"
    | "heater"
    | "network"
    | "other";
  label: string;
  quantity: number;
}

interface ElecRoom {
  id: string;
  type: "kitchen" | "bedroom" | "living" | "bathroom" | "wc" | "other";
  label: string;
  points: ElecPoint[];
}

interface ElecCircuit {
  id: string;
  label: string;
  type: "light" | "socket" | "special" | "heater" | "shutter" | "other";
  protection: "10A" | "16A" | "20A" | "32A";
  cableSection: "1.5" | "2.5" | "6";
  count: number;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialSnapshot?: CalculatorSnapshot;
}

export const ElectricityCalculator: React.FC<Props> = ({ onCalculate,
  initialSnapshot
}) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Project & Rooms ---
  const [rooms, setRooms] = useState<ElecRoom[]>([]);
  const [newRoomType, setNewRoomType] = useState<ElecRoom["type"]>("bedroom");

  // --- 2. Tech Specs ---
  const [renovation, setRenovation] = useState(false); // +gaine/longueurs
  const [avgDistPanel, setAvgDistPanel] = useState(10); // m
  const [avgDistPoint, setAvgDistPoint] = useState(3); // m

  // --- 3. Pricing ---
  const [prices, setPrices] = useState({
    socket: Number(DEFAULT_PRICES.SOCKET_UNIT ?? 7),
    switch: Number(DEFAULT_PRICES.SWITCH_UNIT ?? 6),
    lightPoint: 5.0, // DCL + douille
    socketSpec: 12.0, // 20A/32A
    breaker: Number(DEFAULT_PRICES.BREAKER_UNIT ?? 7),
    diffSwitch: 45.0,
    panelRow: 50.0, // rangée équipée
    cable15: 0.45,
    cable25: 0.7,
    cable6: 2.5,
    conduit: Number(DEFAULT_PRICES.CONDUIT_ICTA_20_100M ?? 40) / 100,
    box: 1.5,
    laborPoint: 45.0,
    laborPanel: 250.0,
  });

  useEffect(() => {
    const values = initialSnapshot?.values as Record<string, any> | undefined;
    if (!values) return;
    if (values.step !== undefined) setStep(values.step as any);
    if (values.proMode !== undefined) setProMode(values.proMode as any);
    if (values.rooms !== undefined) setRooms(values.rooms as any);
    if (values.newRoomType !== undefined) setNewRoomType(values.newRoomType as any);
    if (values.renovation !== undefined) setRenovation(values.renovation as any);
    if (values.avgDistPanel !== undefined) setAvgDistPanel(values.avgDistPanel as any);
    if (values.avgDistPoint !== undefined) setAvgDistPoint(values.avgDistPoint as any);
    if (values.prices !== undefined) setPrices(values.prices as any);
  }, [initialSnapshot]);

  const snapshot: CalculatorSnapshot = {
    version: 1,
    calculatorType: CalculatorType.ELECTRICITY,
    values: {
      step,
      proMode,
      rooms,
      newRoomType,
      renovation,
      avgDistPanel,
      avgDistPoint,
      prices,
    },
  };


  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Label helpers (i18n) ---
  const roomTypeLabel = (type: ElecRoom["type"]) =>
    t(`calc.electricity.rooms.types.${type}`, { defaultValue: type });

  const pointTypeLabel = (type: ElecPoint["type"]) =>
    t(`calc.electricity.points.types.${type}`, { defaultValue: type });

  // --- Helpers ---
  const addRoom = () => {
    setRooms((prev) => {
      const idx = prev.filter((r) => r.type === newRoomType).length + 1;

      const newRoom: ElecRoom = {
        id: Date.now().toString(),
        type: newRoomType,
        label: t("calc.electricity.rooms.room_named", {
          defaultValue: "{{type}} {{n}}",
          type: roomTypeLabel(newRoomType),
          n: idx,
        }),
        points: [],
      };

      // presets "confort" (approx)
      if (newRoomType === "kitchen") {
        newRoom.points.push(
          { id: "p1", type: "light", label: t("calc.electricity.presets.center_point", { defaultValue: "Point centre" }), quantity: 1 },
          { id: "p2", type: "switch", label: t("calc.electricity.presets.switch", { defaultValue: "Interrupteur" }), quantity: 1 },
          { id: "p3", type: "socket", label: t("calc.electricity.presets.counter_sockets", { defaultValue: "Prises plan de travail" }), quantity: 4 },
          { id: "p4", type: "socket_spec", label: t("calc.electricity.presets.oven_socket", { defaultValue: "Prise four" }), quantity: 1 },
          { id: "p5", type: "socket_spec", label: t("calc.electricity.presets.hob_socket", { defaultValue: "Prise 32A cuisson" }), quantity: 1 },
          { id: "p6", type: "socket_spec", label: t("calc.electricity.presets.dishwasher", { defaultValue: "Lave-vaisselle" }), quantity: 1 }
        );
      } else if (newRoomType === "living") {
        newRoom.points.push(
          { id: "p1", type: "light", label: t("calc.electricity.presets.center_point", { defaultValue: "Point centre" }), quantity: 1 },
          { id: "p2", type: "switch", label: t("calc.electricity.presets.switches", { defaultValue: "Interrupteurs" }), quantity: 2 },
          { id: "p3", type: "socket", label: t("calc.electricity.presets.sockets", { defaultValue: "Prises" }), quantity: 5 },
          { id: "p4", type: "network", label: t("calc.electricity.presets.network_tv", { defaultValue: "RJ45/TV" }), quantity: 2 }
        );
      } else if (newRoomType === "bedroom") {
        newRoom.points.push(
          { id: "p1", type: "light", label: t("calc.electricity.presets.center_point", { defaultValue: "Point centre" }), quantity: 1 },
          { id: "p2", type: "switch", label: t("calc.electricity.presets.switch", { defaultValue: "Interrupteur" }), quantity: 1 },
          { id: "p3", type: "socket", label: t("calc.electricity.presets.sockets", { defaultValue: "Prises" }), quantity: 3 },
          { id: "p4", type: "network", label: t("calc.electricity.presets.network", { defaultValue: "RJ45" }), quantity: 1 }
        );
      } else if (newRoomType === "bathroom") {
        newRoom.points.push(
          { id: "p1", type: "light", label: t("calc.electricity.presets.mirror_light", { defaultValue: "Mirror light" }), quantity: 1 },
          { id: "p2", type: "light", label: t("calc.electricity.presets.center_point", { defaultValue: "Point centre" }), quantity: 1 },
          { id: "p3", type: "switch", label: t("calc.electricity.presets.switch", { defaultValue: "Interrupteur" }), quantity: 1 },
          { id: "p4", type: "socket", label: t("calc.electricity.presets.sockets", { defaultValue: "Prises" }), quantity: 2 },
          { id: "p5", type: "socket_spec", label: t("calc.electricity.presets.washing_machine", { defaultValue: "Lave-linge" }), quantity: 1 }
        );
      } else {
        newRoom.points.push(
          { id: "p1", type: "light", label: t("calc.electricity.presets.light_point", { defaultValue: "Point lumineux" }), quantity: 1 },
          { id: "p2", type: "switch", label: t("calc.electricity.presets.switch", { defaultValue: "Interrupteur" }), quantity: 1 },
          { id: "p3", type: "socket", label: t("calc.electricity.presets.socket", { defaultValue: "Prise" }), quantity: 1 }
        );
      }

      return [...prev, newRoom];
    });
  };

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const updatePoint = (roomId: string, pointId: string, delta: number) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const nextPoints = r.points
          .map((p) => (p.id === pointId ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p))
          .filter((p) => p.quantity > 0);
        return { ...r, points: nextPoints };
      })
    );
  };

  const addPointToRoom = (roomId: string, type: ElecPoint["type"]) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          points: [
            ...r.points,
            {
              id: Date.now().toString(),
              type,
              label: pointTypeLabel(type),
              quantity: 1,
            },
          ],
        };
      })
    );
  };

  // --- ENGINE ---
  const calculationData = useMemo(() => {
    let totalSockets = 0;
    let totalLights = 0;
    let totalSwitches = 0;
    let totalSpecial = 0;
    let totalShutters = 0;
    let totalHeaters = 0;
    let totalNetwork = 0;

    rooms.forEach((r) => {
      r.points.forEach((p) => {
        if (p.type === "socket") totalSockets += p.quantity;
        if (p.type === "light") totalLights += p.quantity;
        if (p.type === "switch") totalSwitches += p.quantity;
        if (p.type === "socket_spec") totalSpecial += p.quantity;
        if (p.type === "shutter") totalShutters += p.quantity;
        if (p.type === "heater") totalHeaters += p.quantity;
        if (p.type === "network") totalNetwork += p.quantity;
      });
    });

    // Circuits (approx)
    const circuits: ElecCircuit[] = [];

    const nbLightCircuits = Math.ceil(totalLights / 8);
    if (nbLightCircuits > 0) {
      circuits.push({
        id: "c_light",
        label: t("calc.electricity.circuits.lighting", { defaultValue: "Lighting" }),
        type: "light",
        protection: "10A",
        cableSection: "1.5",
        count: nbLightCircuits,
      });
    }

    const nbSocketCircuits = Math.ceil(totalSockets / 8);
    if (nbSocketCircuits > 0) {
      circuits.push({
        id: "c_socket",
        label: t("calc.electricity.circuits.sockets", { defaultValue: "Prises" }),
        type: "socket",
        protection: "16A",
        cableSection: "2.5",
        count: nbSocketCircuits,
      });
    }

    // spécialisés
    let spec32A = 0;
    let spec20A = totalSpecial;
    if (rooms.some((r) => r.type === "kitchen") && totalSpecial > 0) {
      spec32A = 1;
      spec20A = Math.max(0, totalSpecial - 1);
    }

    if (spec32A > 0) {
      circuits.push({
        id: "c_32a",
        label: t("calc.electricity.circuits.hob", { defaultValue: "Plaque cuisson" }),
        type: "special",
        protection: "32A",
        cableSection: "6",
        count: spec32A,
      });
    }
    if (spec20A > 0) {
      circuits.push({
        id: "c_20a",
        label: t("calc.electricity.circuits.special", { defaultValue: "Dedicated circuits (washer/dishwasher/oven…)" }),
        type: "special",
        protection: "20A",
        cableSection: "2.5",
        count: spec20A,
      });
    }

    const nbShutterCircuits = Math.ceil(totalShutters / 8);
    if (nbShutterCircuits > 0) {
      circuits.push({
        id: "c_shutter",
        label: t("calc.electricity.circuits.shutters", { defaultValue: "Volets roulants" }),
        type: "shutter",
        protection: "16A",
        cableSection: "1.5",
        count: nbShutterCircuits,
      });
    }

    const nbHeaterCircuits = Math.ceil(totalHeaters / 2);
    if (nbHeaterCircuits > 0) {
      circuits.push({
        id: "c_heater",
        label: t("calc.electricity.circuits.heating", { defaultValue: "Chauffage" }),
        type: "heater",
        protection: "20A",
        cableSection: "2.5",
        count: nbHeaterCircuits,
      });
    }

    // coût + BOM
    let totalCost = 0;
    const materialsList: any[] = [];

    const add = (m: any) => {
      materialsList.push(m);
      totalCost += Number(m.totalPrice || 0);
    };

    // points
    if (totalSockets > 0)
      add({
        id: "sockets",
        name: t("calc.electricity.bom.sockets", { defaultValue: "Prises de courant 16A" }),
        quantity: totalSockets,
        unit: Unit.PIECE,
        unitPrice: prices.socket,
        totalPrice: totalSockets * prices.socket,
        category: CalculatorType.ELECTRICITY,
      });

    if (totalSwitches > 0)
      add({
        id: "switches",
        name: t("calc.electricity.bom.switches", { defaultValue: "Interrupteurs / Va-et-vient" }),
        quantity: totalSwitches,
        unit: Unit.PIECE,
        unitPrice: prices.switch,
        totalPrice: totalSwitches * prices.switch,
        category: CalculatorType.ELECTRICITY,
      });

    if (totalLights > 0)
      add({
        id: "lights",
        name: t("calc.electricity.bom.lights", { defaultValue: "Points lumineux (DCL)" }),
        quantity: totalLights,
        unit: Unit.PIECE,
        unitPrice: prices.lightPoint,
        totalPrice: totalLights * prices.lightPoint,
        category: CalculatorType.ELECTRICITY,
      });

    if (totalSpecial > 0)
      add({
        id: "special",
        name: t("calc.electricity.bom.special_sockets", { defaultValue: "Dedicated outlets (20A/32A)" }),
        quantity: totalSpecial,
        unit: Unit.PIECE,
        unitPrice: prices.socketSpec,
        totalPrice: totalSpecial * prices.socketSpec,
        category: CalculatorType.ELECTRICITY,
      });

    if (totalNetwork > 0)
      add({
        id: "network",
        name: t("calc.electricity.bom.network", { defaultValue: "Prises RJ45 / TV" }),
        quantity: totalNetwork,
        unit: Unit.PIECE,
        unitPrice: prices.socket,
        totalPrice: totalNetwork * prices.socket,
        category: CalculatorType.ELECTRICITY,
      });

    const totalPoints = totalSockets + totalSwitches + totalLights + totalSpecial + totalNetwork;

    // boites
    if (totalPoints > 0) {
      add({
        id: "boxes",
        name: t("calc.electricity.bom.boxes", { defaultValue: "Junction boxes" }),
        quantity: totalPoints,
        unit: Unit.PIECE,
        unitPrice: prices.box,
        totalPrice: totalPoints * prices.box,
        category: CalculatorType.ELECTRICITY,
      });
    }

    // câbles (modèle simple)
    const circuits15 = circuits.filter((c) => c.cableSection === "1.5").reduce((a, c) => a + c.count, 0);
    const circuits25 = circuits.filter((c) => c.cableSection === "2.5").reduce((a, c) => a + c.count, 0);
    const circuits6 = circuits.filter((c) => c.cableSection === "6").reduce((a, c) => a + c.count, 0);

    const pts15 = totalLights + totalSwitches + totalShutters;
    const len15 = pts15 * avgDistPoint + circuits15 * avgDistPanel;

    const pts25 = totalSockets + totalSpecial + totalHeaters;
    const len25 = pts25 * avgDistPoint + circuits25 * avgDistPanel;

    const len6 = circuits6 * avgDistPanel;

    const totalCableLen = len15 + len25 + len6;

    const renoCoef = renovation ? 1.15 : 1.0;
    const renoDetail = renovation ? t("calc.electricity.details.reno_plus15", { defaultValue: "Renovation: +15% length" }) : undefined;

    const cost15 = len15 * prices.cable15 * renoCoef;
    const cost25 = len25 * prices.cable25 * renoCoef;
    const cost6 = len6 * prices.cable6 * renoCoef;
    const costConduit = totalCableLen * prices.conduit * renoCoef;

    if (len15 > 0)
      add({
        id: "cable15",
        name: t("calc.electricity.bom.cable_15", { defaultValue: "H07VU wire 1.5mm²" }),
        quantity: Math.ceil(len15),
        unit: Unit.METER,
        unitPrice: prices.cable15,
        totalPrice: parseFloat(cost15.toFixed(2)),
        category: CalculatorType.ELECTRICITY,
        details: renoDetail,
      });

    if (len25 > 0)
      add({
        id: "cable25",
        name: t("calc.electricity.bom.cable_25", { defaultValue: "H07VU wire 2.5mm²" }),
        quantity: Math.ceil(len25),
        unit: Unit.METER,
        unitPrice: prices.cable25,
        totalPrice: parseFloat(cost25.toFixed(2)),
        category: CalculatorType.ELECTRICITY,
        details: renoDetail,
      });

    if (len6 > 0)
      add({
        id: "cable6",
        name: t("calc.electricity.bom.cable_6", { defaultValue: "H07VU wire 6mm²" }),
        quantity: Math.ceil(len6),
        unit: Unit.METER,
        unitPrice: prices.cable6,
        totalPrice: parseFloat(cost6.toFixed(2)),
        category: CalculatorType.ELECTRICITY,
        details: renoDetail,
      });

    if (totalCableLen > 0)
      add({
        id: "conduit",
        name: t("calc.electricity.bom.conduit", { defaultValue: "Gaine ICTA" }),
        quantity: Math.ceil(totalCableLen),
        unit: Unit.METER,
        unitPrice: prices.conduit,
        totalPrice: parseFloat(costConduit.toFixed(2)),
        category: CalculatorType.ELECTRICITY,
        details: renoDetail,
      });

    // tableau
    const totalBreakers = circuits.reduce((acc, c) => acc + c.count, 0);
    const rowsNeeded = Math.max(1, Math.ceil(totalBreakers / 11));

    const costBreakers = totalBreakers * prices.breaker;
    const costRows = rowsNeeded * prices.panelRow;
    const costDiffs = rowsNeeded * prices.diffSwitch;

    add({
      id: "panel",
      name: t("calc.electricity.bom.panel_named", {
        defaultValue: "Electrical panel ({{n}} row{{s}})",
        n: rowsNeeded,
        s: rowsNeeded > 1 ? "s" : "",
      }),
      quantity: 1,
      unit: Unit.PIECE,
      unitPrice: costRows,
      totalPrice: costRows,
      category: CalculatorType.ELECTRICITY,
    });

    if (totalBreakers > 0) {
      add({
        id: "breakers",
        name: t("calc.electricity.bom.breakers", { defaultValue: "Disjoncteurs (10A/16A/20A/32A)" }),
        quantity: totalBreakers,
        unit: Unit.PIECE,
        unitPrice: prices.breaker,
        totalPrice: costBreakers,
        category: CalculatorType.ELECTRICITY,
      });
    }

    add({
      id: "diffs",
      name: t("calc.electricity.bom.diff_switches", { defaultValue: "RCDs / differential switches 30mA" }),
      quantity: rowsNeeded,
      unit: Unit.PIECE,
      unitPrice: prices.diffSwitch,
      totalPrice: costDiffs,
      category: CalculatorType.ELECTRICITY,
    });

    // main d'oeuvre (option)
    if (proMode && totalPoints > 0) {
      const laborPts = totalPoints * prices.laborPoint;
      const laborPnl = prices.laborPanel * (rowsNeeded > 2 ? 1.5 : 1);
      add({
        id: "labor_pts",
        name: t("calc.electricity.bom.labor_points", { defaultValue: "Labor (devices)" }),
        quantity: totalPoints,
        unit: Unit.PIECE,
        unitPrice: prices.laborPoint,
        totalPrice: laborPts,
        category: CalculatorType.ELECTRICITY,
      });
      add({
        id: "labor_pnl",
        name: t("calc.electricity.bom.labor_panel", { defaultValue: "Labor (panel)" }),
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: laborPnl,
        totalPrice: laborPnl,
        category: CalculatorType.ELECTRICITY,
      });
    }

    return {
      totalCost: parseFloat(totalCost.toFixed(2)),
      materials: materialsList,
      summaryStats: {
        points: totalPoints,
        circuits: totalBreakers,
        panelRows: rowsNeeded,
      },
    };
  }, [rooms, avgDistPanel, avgDistPoint, renovation, prices, proMode, t]);

  useEffect(() => {
    onCalculate({
      snapshot,
      summary: t("calc.electricity.summary", {
        defaultValue: "{{p}} Points • {{c}} Circuits",
        p: calculationData.summaryStats.points,
        c: calculationData.summaryStats.circuits,
      }),
      details: [
        { label: t("calc.electricity.kpi.points", { defaultValue: "Points" }), value: calculationData.summaryStats.points, unit: "u" },
        { label: t("calc.electricity.kpi.circuits", { defaultValue: "Circuits (disj.)" }), value: calculationData.summaryStats.circuits, unit: "u" },
        { label: t("calc.electricity.kpi.panel", { defaultValue: "Panel" }), value: t("calc.electricity.kpi.panel_rows", { defaultValue: "{{n}} row(s)", n: calculationData.summaryStats.panelRows }), unit: "" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
    });
  }, [calculationData, onCalculate, t]);

  return (
    <div className="space-y-5 rounded-[28px] border border-white/70 bg-white/74 p-3.5 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-5">
      {/* Navigation */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner backdrop-blur-xl no-scrollbar">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-extrabold rounded-2xl transition-all ${
              step === s ? "bg-white text-slate-950 shadow-[0_14px_32px_rgba(59,130,246,0.18)]" : "text-slate-400"
            }`}
          >
            {s === 1 && t("calc.electricity.steps.1", { defaultValue: "1. Rooms" })}
            {s === 2 && t("calc.electricity.steps.2", { defaultValue: "2. Config" })}
            {s === 3 && t("calc.electricity.steps.3", { defaultValue: "3. Prix" })}
            {s === 4 && t("calc.electricity.steps.4", { defaultValue: "4. Devis" })}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Home size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.electricity.step1.hint", { defaultValue: "Add rooms and adjust electrical points." })}
          </div>

          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="bg-white p-1.5 rounded-lg shadow-sm">
                      {room.type === "kitchen" && <LayoutGrid size={16} className="text-orange-500" />}
                      {room.type === "bedroom" && <Zap size={16} className="text-purple-500" />}
                      {room.type === "living" && <TvIcon className="text-blue-500 w-4 h-4" />}
                      {room.type === "bathroom" && <Droplets size={16} className="text-cyan-500" />}
                      {room.type === "wc" && <Power size={16} className="text-slate-500" />}
                      {room.type === "other" && <Wifi size={16} className="text-slate-500" />}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{room.label}</span>
                  </div>
                  <button type="button" onClick={() => removeRoom(room.id)} className="text-slate-300 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="p-3 grid grid-cols-2 gap-2">
                  {room.points.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                      <div className="flex items-center min-w-0">
                        {p.type === "socket" && <Power size={14} className="text-slate-400 mr-2" />}
                        {p.type === "light" && <Lightbulb size={14} className="text-yellow-500 mr-2" />}
                        {p.type === "switch" && <ToggleLeft size={14} className="text-slate-400 mr-2" />}
                        {p.type === "network" && <Wifi size={14} className="text-slate-400 mr-2" />}
                        <span className="text-xs font-medium truncate pr-1">{p.label}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => updatePoint(room.id, p.id, -1)}
                          className="w-5 h-5 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100"
                          aria-label={t("calc.electricity.actions.decrease", { defaultValue: "Diminuer" })}
                        >
                          -
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{p.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updatePoint(room.id, p.id, 1)}
                          className="w-5 h-5 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100"
                          aria-label={t("calc.electricity.actions.increase", { defaultValue: "Augmenter" })}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="col-span-2 pt-2 flex flex-wrap gap-2 justify-center border-t border-slate-100 mt-1">
                    <button type="button" onClick={() => addPointToRoom(room.id, "socket")} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">
                      + {t("calc.electricity.quick_add.socket", { defaultValue: "Prise" })}
                    </button>
                    <button type="button" onClick={() => addPointToRoom(room.id, "light")} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">
                      + {t("calc.electricity.quick_add.light", { defaultValue: "Lampe" })}
                    </button>
                    <button type="button" onClick={() => addPointToRoom(room.id, "switch")} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">
                      + {t("calc.electricity.quick_add.switch", { defaultValue: "Inter" })}
                    </button>
                    <button type="button" onClick={() => addPointToRoom(room.id, "shutter")} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">
                      + {t("calc.electricity.quick_add.shutter", { defaultValue: "Volet" })}
                    </button>
                    <button type="button" onClick={() => addPointToRoom(room.id, "heater")} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">
                      + {t("calc.electricity.quick_add.heater", { defaultValue: "Chauff." })}
                    </button>
                    <button type="button" onClick={() => addPointToRoom(room.id, "network")} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">
                      + {t("calc.electricity.quick_add.network", { defaultValue: "RJ45" })}
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
              className="flex-1 text-sm border-slate-300 rounded-lg"
            >
              <option value="bedroom">{t("calc.electricity.rooms.types.bedroom", { defaultValue: "Chambre" })}</option>
              <option value="living">{t("calc.electricity.rooms.types.living", { defaultValue: "Living room" })}</option>
              <option value="kitchen">{t("calc.electricity.rooms.types.kitchen", { defaultValue: "Cuisine" })}</option>
              <option value="bathroom">{t("calc.electricity.rooms.types.bathroom", { defaultValue: "SDB" })}</option>
              <option value="wc">{t("calc.electricity.rooms.types.wc", { defaultValue: "WC" })}</option>
              <option value="other">{t("calc.electricity.rooms.types.other", { defaultValue: "Autre" })}</option>
            </select>
            <button
              type="button"
              onClick={addRoom}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center"
            >
              <Plus size={16} className="mr-1" /> {t("calc.electricity.actions.add", { defaultValue: "Ajouter" })}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center mt-4"
          >
            {t("common.next", { defaultValue: "Suivant" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Cable size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.electricity.step2.hint", { defaultValue: "Wiring parameters and distances." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
              <div>
                <span className="text-sm font-medium block">{t("calc.electricity.config.renovation", { defaultValue: "Renovation" })}</span>
                <span className="text-xs text-slate-400">{t("calc.electricity.config.renovation_help", { defaultValue: "Surface trunking / chases (vs in-wall)" })}</span>
              </div>
              <input type="checkbox" checked={renovation} onChange={(e) => setRenovation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.electricity.config.avg_panel_dist", { defaultValue: "Distance moyenne tableau (m)" })}</label>
              <input type="number" value={avgDistPanel} onChange={(e) => setAvgDistPanel(Number(e.target.value))} className="w-full p-2 text-sm border rounded bg-white" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.electricity.config.avg_point_dist", { defaultValue: "Distance moyenne entre points (m)" })}</label>
              <input type="number" value={avgDistPoint} onChange={(e) => setAvgDistPoint(Number(e.target.value))} className="w-full p-2 text-sm border rounded bg-white" />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.electricity.step3.hint", { defaultValue: "Ajustez les prix unitaires." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.electricity.prices.title", { defaultValue: "Tarifs unitaires" })}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" />{" "}
                {proMode ? t("calc.electricity.prices.pro", { defaultValue: "Mode Pro" }) : t("calc.electricity.prices.simple", { defaultValue: "Mode Simple" })}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.electricity.prices.socket", { defaultValue: "Socket 16A (€)" })}</label>
                <input type="number" value={prices.socket} onChange={(e) => updatePrice("socket", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.electricity.prices.switch", { defaultValue: "Switch (€)" })}</label>
                <input type="number" value={prices.switch} onChange={(e) => updatePrice("switch", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.electricity.prices.breaker", { defaultValue: "Breaker (€)" })}</label>
                <input type="number" value={prices.breaker} onChange={(e) => updatePrice("breaker", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.electricity.prices.cable25", { defaultValue: "Wire 2.5mm² (€/m)" })}</label>
                <input type="number" value={prices.cable25} onChange={(e) => updatePrice("cable25", e.target.value)} className="w-full p-1.5 border rounded text-sm" />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.electricity.prices.labor_point", { defaultValue: "Labor per point (€)" })}</label>
                  <input type="number" value={prices.laborPoint} onChange={(e) => updatePrice("laborPoint", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.electricity.prices.labor_panel", { defaultValue: "Panel labor (fixed) (€)" })}</label>
                  <input type="number" value={prices.laborPanel} onChange={(e) => updatePrice("laborPanel", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-start">
            <Check size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.electricity.step4.hint", { defaultValue: "Done. The summary is sent to the results panel." })}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold shadow-sm flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("calc.electricity.calculated", { defaultValue: "Calculated" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Icon for TV (fallback)
const TvIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
    <polyline points="17 2 12 7 7 2"></polyline>
  </svg>
);