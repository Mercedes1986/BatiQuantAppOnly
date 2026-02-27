// src/components/calculators/StructuralCalculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { CalculatorType, CalculationResult, Unit, ExcavationItem } from "@/types";
import { DEFAULT_PRICES, SOIL_PROPERTIES, getWallUnitPriceKey } from "@/constants";
import { getUnitPrice } from "@/services/materialsService";

import {
  Ruler,
  BrickWall,
  Pickaxe,
  Mountain,
  Warehouse,
  Trash2,
  Plus,
  LayoutTemplate,
  ArrowRight,
  Settings,
  Truck,
  Check,
  Layers,
  Euro,
  Shovel,
  PaintRoller,
  Square,
  Combine,
  AlignLeft,
  BoxSelect,
} from "lucide-react";

import { WALL_BLOCK_SPECS, getWallBlockSpec, getSpecsByFamily, type WallBlockSpec } from "@/data/blockSpecs";

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialPerimeter?: number;
  initialArea?: number;
  initialMode?: "groundwork" | "foundations" | "walls";
  hideTabs?: boolean;
}

// -------------------------
// Sub-Types for Foundations
// -------------------------
interface Pad {
  id: string;
  count: number;
  width: number;
  length: number;
  height: number;
  type: "rect" | "cyl";
  diameter?: number;
}

// -------------------------
// Sub-Types for Walls
// -------------------------
interface WallOpening {
  id: string;
  type: "window" | "door" | "bay" | "garage";
  width: number;
  height: number;
  quantity: number;
  revealDepth: number; // cm
  label?: string;
}

interface WallSegment {
  id: string;
  label: string;
  length: number;
  height: number;
}

type Mode = "groundwork" | "foundations" | "walls";

type GroundworkPrices = {
  stripM2: number;
  excavM3: number;
  evacM3: number;
  fillGravelM3: number;
  fillSandM3: number;
  fillSoilM3: number;
  geotextileM2: number;
  diggerDay: number;
  truckRotation: number;
  dumpFeeTon: number;
  compactorDay: number;
  laborM3: number;
};

type WallPrices = {
  // ✅ Price overrides by systemKey (ex: BLOCK_20_UNIT, BRICK_15_UNIT...)
  unitOverrides: Record<string, number>;

  mortarBag: number;
  glueBag: number;
  lintelM: number;
  concreteM3: number;
  steelKg: number;
  coatingExtBag: number;
  coatingIntBag: number;
  scaffoldFixed: number;
  laborM2: number;
  laborLintel: number;
  laborScaffold: number;
};

const isBrowser = () => typeof window !== "undefined";

export const StructuralCalculator: React.FC<Props> = ({
  onCalculate,
  initialPerimeter,
  initialArea,
  initialMode = "groundwork",
  hideTabs = false,
}) => {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const euro = useMemo(
    () =>
      new Intl.NumberFormat(i18n.language || undefined, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }),
    [i18n.language]
  );

  const [mode, setMode] = useState<Mode>(initialMode);
  const [step, setStep] = useState<number>(1);
  const [proMode, setProMode] = useState<boolean>(false);

  // Update mode if prop changes
  useEffect(() => {
    setMode(initialMode);
    setStep(1);
  }, [initialMode]);

  // ======================================
  // Shared Geometry
  // ======================================
  const [dimL, setDimL] = useState<string>("");
  const [dimW, setDimW] = useState<string>("");
  const [perimeter, setPerimeter] = useState<string>(initialPerimeter?.toString() || "");
  const [surface, setSurface] = useState<string>(initialArea?.toString() || "");

  // ======================================
  // GROUNDWORK STATE
  // ======================================
  const [gwMargin, setGwMargin] = useState<string>("1.0");
  const [gwStripDepth, setGwStripDepth] = useState<string>("0.20");
  const [gwKeepTopsoil, setGwKeepTopsoil] = useState<boolean>(true);

  const [gwDetailedExcavs, setGwDetailedExcavs] = useState<ExcavationItem[]>([]);
  const [newExType, setNewExType] = useState<"trench" | "pit" | "mass">("trench");
  const [newExL, setNewExL] = useState<string>("");
  const [newExW, setNewExW] = useState<string>("");
  const [newExD, setNewExD] = useState<string>("");
  const [newExSlope, setNewExSlope] = useState<number>(0); // ✅ number

  const [gwSoilType, setGwSoilType] = useState<string>("soil");
  const [gwReuseOnSite, setGwReuseOnSite] = useState<number>(0);
  const [gwTruckCap, setGwTruckCap] = useState<number>(10);
  const [gwDiggerDays, setGwDiggerDays] = useState<number>(1);

  const [gwFillType, setGwFillType] = useState<"gravel" | "sand" | "soil">("gravel");
  const [gwFillVolume, setGwFillVolume] = useState<string>("0");
  const [gwCompactorDays, setGwCompactorDays] = useState<number>(0);

  const [gwDifficultAccess, setGwDifficultAccess] = useState<boolean>(false);

  const [gwPrices, setGwPrices] = useState<GroundworkPrices>(() => ({
    stripM2: Number(DEFAULT_PRICES.TOPSOIL_STRIP_M2),
    excavM3: Number(DEFAULT_PRICES.EXCAVATION_M3),
    evacM3: Number(DEFAULT_PRICES.EVACUATION_M3),
    fillGravelM3: 45.0,
    fillSandM3: 50.0,
    fillSoilM3: 15.0,
    geotextileM2: 1.5,
    diggerDay: Number(DEFAULT_PRICES.DIGGER_DAY),
    truckRotation: 180.0,
    dumpFeeTon: 15.0,
    compactorDay: 80.0,
    laborM3: 25.0,
  }));

  // ======================================
  // FOUNDATIONS STATE
  // ======================================
  const [fdHasStrip, setFdHasStrip] = useState<boolean>(true);
  const [fdHasPads, setFdHasPads] = useState<boolean>(false);
  const [fdHasRaft, setFdHasRaft] = useState<boolean>(false);
  const [fdCleanConcrete, setFdCleanConcrete] = useState<boolean>(true);

  const [fdStripL, setFdStripL] = useState<string>("");
  const [fdStripW, setFdStripW] = useState<string>("0.50");
  const [fdStripH, setFdStripH] = useState<string>("0.35");

  const [fdRaftThick, setFdRaftThick] = useState<string>("0.25");
  const [fdPads, setFdPads] = useState<Pad[]>([]);

  const [fdExcavEnabled, setFdExcavEnabled] = useState<boolean>(true);
  const [fdDepth, setFdDepth] = useState<string>("0.80");
  const [fdTrenchMargin, setFdTrenchMargin] = useState<string>("0.20");
  const [fdSoilId, setFdSoilId] = useState<string>("soil");
  const [fdEvac, setFdEvac] = useState<boolean>(true);

  const [fdRebarStripType, setFdRebarStripType] = useState<string>("S35");
  const [fdRebarRaftType, setFdRebarRaftType] = useState<string>("ST25C");
  const [fdFormwork, setFdFormwork] = useState<boolean>(false);
  const [fdPolyane, setFdPolyane] = useState<boolean>(false);
  const [fdDrain, setFdDrain] = useState<boolean>(false);

  const [fdPrices, setFdPrices] = useState(() => ({
    excavation: getUnitPrice("EXCAVATION_M3"),
    evacuation: 25,
    concrete: getUnitPrice("BPE_M3"),
    cleanConcrete: getUnitPrice("CLEAN_CONCRETE_M3"),
    formwork: getUnitPrice("FORM_PANEL_M2"),
    rebarCage: getUnitPrice("REBAR_CAGE_35_15_6M"),
    meshPanel: getUnitPrice("MESH_PANEL_ST25"),
    drainM: 5.0,
    polyaneM2: 1.0,
    laborM3: 60.0,
    laborForm: 25.0,
  }));

  // ======================================
  // WALLS STATE
  // ======================================
  const [wInputMode, setWInputMode] = useState<"global" | "segments">("global");
  const [wPerimeter, setWPerimeter] = useState<string>(initialPerimeter?.toString() || "");
  const [wHeight, setWHeight] = useState<string>("2.50");
  const [wGables, setWGables] = useState<boolean>(false);
  const [wGableHeight, setWGableHeight] = useState<string>("1.5");
  const [wGableCount, setWGableCount] = useState<number>(2);

  const [wSegments, setWSegments] = useState<WallSegment[]>([]);
  const [newSegL, setNewSegL] = useState<string>("");
  const [newSegH, setNewSegH] = useState<string>("2.5");
  const [newSegLabel, setNewSegLabel] = useState<string>("");

  type WallFamily = WallBlockSpec["family"];
  const [wWallFamily, setWWallFamily] = useState<WallFamily>("parpaing");
  const [wWallBlockId, setWWallBlockId] = useState<string>("parpaing-20");
  const [wWastePct, setWWastePct] = useState<number>(5);

  const selectedWallSpec = useMemo(() => {
    return getWallBlockSpec(wWallBlockId) ?? WALL_BLOCK_SPECS[0];
  }, [wWallBlockId]);

  useEffect(() => {
    const list = getSpecsByFamily(wWallFamily);
    if (!list.length) return;
    const cur = getWallBlockSpec(wWallBlockId);
    if (!cur || cur.family !== wWallFamily) setWWallBlockId(list[0].id);
  }, [wWallFamily, wWallBlockId]);

  const [wOpenings, setWOpenings] = useState<WallOpening[]>([]);
  const [newWOpType, setNewWOpType] = useState<"window" | "door" | "bay" | "garage">("window");
  const [newWOpW, setNewWOpW] = useState<string>("1.20");
  const [newWOpH, setNewWOpH] = useState<string>("1.25");
  const [newWOpReveal, setNewWOpReveal] = useState<string>("20");

  const [wLintelType, setWLintelType] = useState<"precast" | "cast">("precast");
  const [wChainageHoriz, setWChainageHoriz] = useState<boolean>(true);
  const [wChainageInter, setWChainageInter] = useState<boolean>(false);
  const [wChainageVert, setWChainageVert] = useState<number>(4);

  const [wCoatingExt, setWCoatingExt] = useState<boolean>(true);
  const [wCoatingInt, setWCoatingInt] = useState<boolean>(false);
  const [wScaffold, setWScaffold] = useState<boolean>(false);

  const [wPrices, setWPrices] = useState<WallPrices>(() => ({
    unitOverrides: {},
    mortarBag: Number(DEFAULT_PRICES.MORTAR_BAG_25KG),
    glueBag: Number(DEFAULT_PRICES.GLUE_MORTAR_BAG_25KG),
    lintelM: Number(DEFAULT_PRICES.LINTEL_PRECAST_M),
    concreteM3: Number(DEFAULT_PRICES.BPE_M3),
    steelKg: Number(DEFAULT_PRICES.REBAR_KG),
    coatingExtBag: Number(DEFAULT_PRICES.COATING_EXT_BAG),
    coatingIntBag: Number(DEFAULT_PRICES.COATING_INT_BAG),
    scaffoldFixed: 1000.0,
    laborM2: 45.0,
    laborLintel: 25.0,
    laborScaffold: 15.0,
  }));

  // -------------------------
  // Pricing helpers (walls)
  // -------------------------
  const setUnitOverride = (key: string, val: number) => {
    setWPrices((prev) => ({
      ...prev,
      unitOverrides: { ...prev.unitOverrides, [key]: val },
    }));
  };

  const getPrice = (key: string, fallback: number): number => {
    const local = wPrices.unitOverrides[key];
    if (local !== undefined) return local;

    const catalog = getUnitPrice(key);
    if (catalog && catalog !== 0) return catalog;

    return fallback;
  };

  const updateWPrice = (key: keyof WallPrices, val: string) => {
    if (key === "unitOverrides") return;
    setWPrices((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const wallBinderKind = useMemo<"mortier" | "colle">(() => {
    const k = selectedWallSpec.mortarKind;
    if (k === "colle" || k === "mortier") return k;
    if (selectedWallSpec.family === "brique") return "colle";
    if (selectedWallSpec.family === "cellulaire") return "colle";
    return "mortier";
  }, [selectedWallSpec]);

  // ======================================
  // Helpers
  // ======================================
  const addEarthExcav = () => {
    const L = parseFloat(newExL) || 0;
    const W = parseFloat(newExW) || 0;
    const D = parseFloat(newExD) || 0;
    if (W === 0 || D === 0) return;

    const label =
      newExType === "trench" ? t("struct.excav.trench", { defaultValue: "Tranchée" }) :
      newExType === "pit" ? t("struct.excav.pit", { defaultValue: "Fouille" }) :
      t("struct.excav.mass", { defaultValue: "Pleine Masse" });

    setGwDetailedExcavs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label,
        type: newExType,
        length: L,
        width: W,
        depth: D,
        quantity: 1,
        slopeRatio: newExSlope,
      },
    ]);

    setNewExL("");
    setNewExW("");
    setNewExD("");
  };

  const removeEarthExcav = (id: string) => setGwDetailedExcavs((prev) => prev.filter((e) => e.id !== id));

  const addPad = () =>
    setFdPads((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        count: 1,
        width: 0.5,
        length: 0.5,
        height: 0.5,
        type: "rect",
      },
    ]);

  const updatePad = (id: string, field: keyof Pad, val: any) =>
    setFdPads((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: val } : p)));

  const removePad = (id: string) => setFdPads((prev) => prev.filter((p) => p.id !== id));

  const addWallOpening = () => {
    const w = parseFloat(newWOpW) || 0;
    const h = parseFloat(newWOpH) || 0;
    if (w <= 0 || h <= 0) return;

    const labels: Record<WallOpening["type"], string> = {
      window: t("struct.opening.window", { defaultValue: "Fenêtre" }),
      door: t("struct.opening.door", { defaultValue: "Porte" }),
      bay: t("struct.opening.bay", { defaultValue: "Baie vitrée" }),
      garage: t("struct.opening.garage", { defaultValue: "Garage" }),
    };

    setWOpenings((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: newWOpType,
        label: labels[newWOpType],
        width: w,
        height: h,
        quantity: 1,
        revealDepth: parseFloat(newWOpReveal) || 0,
      },
    ]);
  };

  const removeWallOpening = (id: string) => setWOpenings((prev) => prev.filter((o) => o.id !== id));

  const addWallSegment = () => {
    const l = parseFloat(newSegL);
    const h = parseFloat(newSegH);
    if (!(l > 0) || !(h > 0)) return;

    setWSegments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: newSegLabel || t("struct.wall.segment_default", { defaultValue: `Mur ${prev.length + 1}` }),
        length: l,
        height: h,
      },
    ]);
    setNewSegL("");
    setNewSegLabel("");
  };

  const removeWallSegment = (id: string) => setWSegments((prev) => prev.filter((s) => s.id !== id));

  const autoCalcReinforcements = () => {
    let len = 0;
    let corners = 4;

    if (wInputMode === "global") {
      len = parseFloat(wPerimeter) || 0;
    } else {
      len = wSegments.reduce((sum, s) => sum + s.length, 0);
      corners = Math.max(4, wSegments.length);
    }

    const intermediate = Math.floor(len / 4);
    setWChainageVert(corners + intermediate);
  };

  // Auto-calc surface/perimeter from L/W
  useEffect(() => {
    const l = parseFloat(dimL);
    const w = parseFloat(dimW);
    if (!isNaN(l) && !isNaN(w) && l > 0 && w > 0) {
      const s = (l * w).toFixed(2);
      const p = ((l + w) * 2).toFixed(2);
      setSurface(s);
      setPerimeter(p);
      if (!fdStripL) setFdStripL(p);
      if (!wPerimeter) setWPerimeter(p);
    }
  }, [dimL, dimW, fdStripL, wPerimeter]);

  // -----------------------------------------
  // CALCULATION ENGINE (memo)
  // -----------------------------------------
  const calculationData = useMemo(() => {
    // =========================
    // GROUNDWORK
    // =========================
    if (mode === "groundwork") {
      const materialsList: any[] = [];
      let totalCost = 0;
      const details: any[] = [];
      const warnings: string[] = [];

      const L = parseFloat(dimL) || 0;
      const W = parseFloat(dimW) || 0;
      const margin = parseFloat(gwMargin) || 0;
      const stripDepth = parseFloat(gwStripDepth) || 0;

      const stripArea =
        L > 0 && W > 0 ? (L + 2 * margin) * (W + 2 * margin) : parseFloat(surface) || 0;

      const stripVolPlace = stripArea * stripDepth;

      const soilProps = SOIL_PROPERTIES.find((s) => s.id === gwSoilType) || SOIL_PROPERTIES[0];
      const swellCoef = soilProps.bulkingFactor;
      const stripVolFoison = stripVolPlace * swellCoef;

      const costStrip = stripArea * gwPrices.stripM2;
      totalCost += costStrip;

      materialsList.push({
        id: "strip",
        name: t("struct.gw.strip", { defaultValue: "Décapage terre végétale" }),
        quantity: stripArea,
        unit: Unit.M2,
        unitPrice: gwPrices.stripM2,
        totalPrice: costStrip,
        category: CalculatorType.GROUNDWORK,
        details: `${t("struct.common.thickness", { defaultValue: "Ép." })} ${(stripDepth * 100).toFixed(0)}cm - ${stripVolPlace.toFixed(1)}m³`,
      });

      // Detailed excavations
      let excavVolPlace = 0;
      gwDetailedExcavs.forEach((ex) => {
        const slope = ex.slopeRatio || 0;
        const wTop = ex.width + 2 * (ex.depth * slope);
        const lTop = ex.length + 2 * (ex.depth * slope);
        const avgArea = (ex.width * ex.length + wTop * lTop) / 2;
        const vol = avgArea * ex.depth;
        excavVolPlace += vol * (ex.quantity || 1);
      });

      const excavVolFoison = excavVolPlace * swellCoef;
      const accessCoef = gwDifficultAccess ? 1.3 : 1;

      const costExcav = excavVolPlace * gwPrices.excavM3 * accessCoef;
      totalCost += costExcav;

      if (excavVolPlace > 0) {
        materialsList.push({
          id: "excav",
          name: t("struct.gw.excav", { defaultValue: "Excavation / fouilles" }),
          quantity: parseFloat(excavVolPlace.toFixed(1)),
          unit: Unit.M3,
          unitPrice: gwPrices.excavM3,
          totalPrice: costExcav,
          category: CalculatorType.GROUNDWORK,
          details: `${gwDetailedExcavs.length} ${t("struct.common.items", { defaultValue: "ouvrages" })} - x${swellCoef}`,
        });
      }

      // Earth management
      let totalVolToManage = stripVolFoison + excavVolFoison;

      if (gwKeepTopsoil) {
        totalVolToManage -= stripVolFoison;
        details.push({ label: t("struct.gw.topsoil_stored", { defaultValue: "Terre végétale stockée" }), value: stripVolFoison.toFixed(1), unit: "m³" });
      }

      if (gwReuseOnSite > 0) {
        const volToReuse = excavVolFoison * (gwReuseOnSite / 100);
        totalVolToManage -= volToReuse;
        details.push({ label: t("struct.gw.reused_fill", { defaultValue: "Remblai réutilisé" }), value: volToReuse.toFixed(1), unit: "m³" });
      }

      const volToEvac = Math.max(0, totalVolToManage);

      if (volToEvac > 0) {
        const cap = gwTruckCap || 1;
        const rotations = Math.ceil(volToEvac / cap);

        const costTransport = rotations * gwPrices.truckRotation;

        const density = soilProps.density;
        const tonsToDump = volToEvac * density;
        const costDump = tonsToDump * gwPrices.dumpFeeTon;

        totalCost += costTransport + costDump;

        materialsList.push(
          {
            id: "transp",
            name: t("struct.gw.truck_rotation", { defaultValue: "Rotation camion" }) + ` (${gwTruckCap}m³)`,
            quantity: rotations,
            unit: Unit.ROTATION,
            unitPrice: gwPrices.truckRotation,
            totalPrice: costTransport,
            category: CalculatorType.GROUNDWORK,
          },
          {
            id: "dump",
            name: t("struct.gw.dump_fee", { defaultValue: "Mise en décharge" }),
            quantity: parseFloat(tonsToDump.toFixed(1)),
            unit: Unit.TON,
            unitPrice: gwPrices.dumpFeeTon,
            totalPrice: costDump,
            category: CalculatorType.GROUNDWORK,
            details: `${volToEvac.toFixed(1)}m³`,
          }
        );
      }

      // Fill import
      const fillVol = parseFloat(gwFillVolume) || 0;
      if (fillVol > 0) {
        let fillPrice = gwPrices.fillGravelM3;
        let fillLabel = t("struct.gw.fill_gravel", { defaultValue: "Grave / tout-venant" });

        if (gwFillType === "sand") {
          fillPrice = gwPrices.fillSandM3;
          fillLabel = t("struct.gw.fill_sand", { defaultValue: "Sable" });
        }
        if (gwFillType === "soil") {
          fillPrice = gwPrices.fillSoilM3;
          fillLabel = t("struct.gw.fill_soil", { defaultValue: "Terre végétale (apport)" });
        }

        const costFill = fillVol * fillPrice;
        totalCost += costFill;

        materialsList.push({
          id: "fill",
          name: t("struct.gw.fill_import", { defaultValue: "Apport" }) + ` ${fillLabel}`,
          quantity: fillVol,
          unit: Unit.M3,
          unitPrice: fillPrice,
          totalPrice: costFill,
          category: CalculatorType.GROUNDWORK,
        });
      }

      // Machines
      if (gwDiggerDays > 0) {
        const costDigger = gwDiggerDays * gwPrices.diggerDay;
        totalCost += costDigger;
        materialsList.push({
          id: "digger",
          name: t("struct.gw.digger_rental", { defaultValue: "Location mini-pelle" }),
          quantity: gwDiggerDays,
          unit: Unit.DAY,
          unitPrice: gwPrices.diggerDay,
          totalPrice: costDigger,
          category: CalculatorType.GROUNDWORK,
        });
      }

      if (gwCompactorDays > 0) {
        const costComp = gwCompactorDays * gwPrices.compactorDay;
        totalCost += costComp;
        materialsList.push({
          id: "compactor",
          name: t("struct.gw.compactor_rental", { defaultValue: "Location compacteur" }),
          quantity: gwCompactorDays,
          unit: Unit.DAY,
          unitPrice: gwPrices.compactorDay,
          totalPrice: costComp,
          category: CalculatorType.GROUNDWORK,
        });
      }

      details.push({ label: t("struct.gw.strip_area", { defaultValue: "Surface décapée" }), value: stripArea.toFixed(0), unit: "m²" });
      details.push({ label: t("struct.gw.volume_inplace", { defaultValue: "Volume en place" }), value: (stripVolPlace + excavVolPlace).toFixed(1), unit: "m³" });
      details.push({ label: t("struct.gw.volume_bulking", { defaultValue: "Volume foisonné" }), value: (stripVolFoison + excavVolFoison).toFixed(1), unit: "m³" });
      details.push({ label: t("struct.gw.to_evac", { defaultValue: "À évacuer" }), value: volToEvac.toFixed(1), unit: "m³" });

      if (gwReuseOnSite > 0 && !gwCompactorDays) {
        warnings.push(t("struct.gw.warn_no_compaction", { defaultValue: "Réutilisation de terre en remblai sans compactage prévu ?" }));
      }

      return {
        totalCost,
        materials: materialsList,
        summary: `${(stripVolPlace + excavVolPlace).toFixed(1)}m³ ${t("struct.gw.summary_excavated", { defaultValue: "excavés" })}`,
        details,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    // =========================
    // FOUNDATIONS
    // =========================
    if (mode === "foundations") {
      const materialsList: any[] = [];
      let totalCost = 0;
      const details: any[] = [];
      const warnings: string[] = [];

      const soilProps = SOIL_PROPERTIES.find((s) => s.id === fdSoilId) || SOIL_PROPERTIES[0];
      const swellCoef = soilProps.bulkingFactor;

      const houseL = parseFloat(dimL) || 0;
      const houseW = parseFloat(dimW) || 0;

      let stripVol = 0;
      let padsVol = 0;
      let raftVol = 0;
      let raftArea = 0;

      if (fdHasStrip) {
        const L = parseFloat(fdStripL) || 0;
        const sw = parseFloat(fdStripW) || 0;
        const sh = parseFloat(fdStripH) || 0;

        stripVol = L * sw * sh;

        const costConc = stripVol * fdPrices.concrete;
        totalCost += costConc;

        materialsList.push({
          id: "fd_strip_conc",
          name: t("struct.fd.conc_strip", { defaultValue: "Béton (semelles filantes)" }),
          quantity: parseFloat(stripVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.concrete,
          totalPrice: costConc,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "BPE_M3",
        });

        const cages = Math.ceil(L / 6);
        const costRebar = cages * fdPrices.rebarCage;
        totalCost += costRebar;

        materialsList.push({
          id: "fd_strip_rebar",
          name: t("struct.fd.rebar_strip", { defaultValue: "Armatures semelles" }) + ` (${fdRebarStripType})`,
          quantity: cages,
          unit: Unit.PIECE,
          unitPrice: fdPrices.rebarCage,
          totalPrice: costRebar,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "REBAR_CAGE_35_15_6M",
          details: t("struct.fd.rebar_ratio", { defaultValue: "~1 cage / 6m" }),
        });
      }

      if (fdHasPads && fdPads.length) {
        fdPads.forEach((p) => {
          const count = p.count || 0;
          let v = 0;
          if (p.type === "rect") v = (p.width || 0) * (p.length || 0) * (p.height || 0);
          else {
            const d = p.diameter || 0;
            v = Math.PI * Math.pow(d / 2, 2) * (p.height || 0);
          }
          padsVol += v * count;
        });

        const costPadsConc = padsVol * fdPrices.concrete;
        totalCost += costPadsConc;

        materialsList.push({
          id: "fd_pads_conc",
          name: t("struct.fd.conc_pads", { defaultValue: "Béton (plots)" }),
          quantity: parseFloat(padsVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.concrete,
          totalPrice: costPadsConc,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "BPE_M3",
        });
      }

      if (fdHasRaft) {
        raftArea = houseL > 0 && houseW > 0 ? houseL * houseW : 0;
        const tRaft = parseFloat(fdRaftThick) || 0;
        raftVol = raftArea * tRaft;

        const costRaftConc = raftVol * fdPrices.concrete;
        totalCost += costRaftConc;

        materialsList.push({
          id: "fd_raft_conc",
          name: t("struct.fd.conc_raft", { defaultValue: "Béton (radier)" }),
          quantity: parseFloat(raftVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.concrete,
          totalPrice: costRaftConc,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "BPE_M3",
        });

        const panelCover = 14.4;
        const meshPanels = raftArea > 0 ? Math.ceil(raftArea / panelCover) : 0;
        const costMesh = meshPanels * fdPrices.meshPanel;
        totalCost += costMesh;

        materialsList.push({
          id: "fd_mesh",
          name: t("struct.fd.mesh", { defaultValue: "Treillis soudé" }) + ` (${fdRebarRaftType})`,
          quantity: meshPanels,
          unit: Unit.PIECE,
          unitPrice: fdPrices.meshPanel,
          totalPrice: costMesh,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "MESH_PANEL_ST25",
          details: t("struct.fd.mesh_ratio", { defaultValue: "~1 panneau / 14.4m²" }),
        });
      }

      if (fdCleanConcrete) {
        const cleanT = 0.05;
        let cleanVol = 0;

        if (fdHasStrip) {
          const sw = (parseFloat(fdStripW) || 0) + 0.1;
          const L = parseFloat(fdStripL) || 0;
          cleanVol += L * sw * cleanT;
        }

        if (fdHasPads && fdPads.length) {
          fdPads.forEach((p) => {
            const count = p.count || 0;
            let area = 0;
            if (p.type === "rect") area = (p.width || 0) * (p.length || 0);
            else {
              const d = p.diameter || 0;
              area = Math.PI * Math.pow(d / 2, 2);
            }
            cleanVol += area * cleanT * count;
          });
        }

        if (fdHasRaft && raftArea > 0) cleanVol += raftArea * cleanT;

        const costClean = cleanVol * fdPrices.cleanConcrete;
        totalCost += costClean;

        materialsList.push({
          id: "fd_clean",
          name: t("struct.fd.clean_concrete", { defaultValue: "Béton de propreté (5cm)" }),
          quantity: parseFloat(cleanVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.cleanConcrete,
          totalPrice: costClean,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "CLEAN_CONCRETE_M3",
        });
      }

      if (fdExcavEnabled) {
        const depth = parseFloat(fdDepth) || 0;
        const margin = parseFloat(fdTrenchMargin) || 0;

        let excavVolPlace = 0;

        if (fdHasStrip) {
          const L = parseFloat(fdStripL) || 0;
          const sw = parseFloat(fdStripW) || 0;
          excavVolPlace += L * (sw + 2 * margin) * depth;
        }

        if (fdHasPads && fdPads.length) {
          fdPads.forEach((p) => {
            const count = p.count || 0;
            let baseArea = 0;
            if (p.type === "rect") baseArea = (p.width || 0) * (p.length || 0);
            else {
              const d = p.diameter || 0;
              baseArea = Math.PI * Math.pow(d / 2, 2);
            }
            excavVolPlace += baseArea * depth * count;
          });
        }

        if (fdHasRaft && raftArea > 0) {
          excavVolPlace += raftArea * (parseFloat(fdRaftThick) || 0);
        }

        const costExcav = excavVolPlace * fdPrices.excavation;
        totalCost += costExcav;

        materialsList.push({
          id: "fd_excav",
          name: t("struct.fd.excav", { defaultValue: "Terrassement / fouilles" }),
          quantity: parseFloat(excavVolPlace.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.excavation,
          totalPrice: costExcav,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "EXCAVATION_M3",
          details: `x${swellCoef}`,
        });

        if (fdEvac) {
          const excavFoison = excavVolPlace * swellCoef;
          const costEvac = excavFoison * fdPrices.evacuation;
          totalCost += costEvac;

          materialsList.push({
            id: "fd_evac",
            name: t("struct.fd.evac", { defaultValue: "Évacuation terres (foisonné)" }),
            quantity: parseFloat(excavFoison.toFixed(2)),
            unit: Unit.M3,
            unitPrice: fdPrices.evacuation,
            totalPrice: costEvac,
            category: CalculatorType.FOUNDATIONS,
          });
        }
      }

      if (fdFormwork && fdHasStrip) {
        const L = parseFloat(fdStripL) || 0;
        const h = parseFloat(fdStripH) || 0;
        const area = L * h * 2;
        const costForm = area * fdPrices.formwork;
        totalCost += costForm;

        materialsList.push({
          id: "fd_form",
          name: t("struct.fd.formwork", { defaultValue: "Coffrage (panneaux)" }),
          quantity: parseFloat(area.toFixed(1)),
          unit: Unit.M2,
          unitPrice: fdPrices.formwork,
          totalPrice: costForm,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "FORM_PANEL_M2",
        });
      }

      if (fdDrain) {
        const L = parseFloat(fdStripL) || parseFloat(perimeter) || 0;
        const costDrain = L * fdPrices.drainM;
        totalCost += costDrain;

        materialsList.push({
          id: "fd_drain",
          name: t("struct.fd.drain", { defaultValue: "Drain périphérique" }),
          quantity: parseFloat(L.toFixed(1)),
          unit: Unit.METER,
          unitPrice: fdPrices.drainM,
          totalPrice: costDrain,
          category: CalculatorType.FOUNDATIONS,
        });
      }

      if (fdPolyane) {
        const a =
          (parseFloat(dimL) || 0) > 0 && (parseFloat(dimW) || 0) > 0 ? (parseFloat(dimL) || 0) * (parseFloat(dimW) || 0) : parseFloat(surface) || 0;

        const costPoly = a * fdPrices.polyaneM2;
        totalCost += costPoly;

        materialsList.push({
          id: "fd_poly",
          name: t("struct.fd.polyane", { defaultValue: "Film polyane" }),
          quantity: parseFloat(a.toFixed(1)),
          unit: Unit.M2,
          unitPrice: fdPrices.polyaneM2,
          totalPrice: costPoly,
          category: CalculatorType.FOUNDATIONS,
        });
      }

      if (proMode) {
        const volConcrete = stripVol + padsVol + raftVol;
        if (volConcrete > 0) {
          const costMO = volConcrete * fdPrices.laborM3;
          totalCost += costMO;

          materialsList.push({
            id: "fd_mo",
            name: t("struct.fd.labor_concrete", { defaultValue: "Main d'œuvre (béton)" }),
            quantity: parseFloat(volConcrete.toFixed(2)),
            unit: Unit.M3,
            unitPrice: fdPrices.laborM3,
            totalPrice: costMO,
            category: CalculatorType.FOUNDATIONS,
          });
        }
      }

      details.push({ label: t("struct.fd.soil", { defaultValue: "Sol" }), value: soilProps.label, unit: "" });
      details.push({ label: t("struct.fd.total_concrete", { defaultValue: "Béton total" }), value: (stripVol + padsVol + raftVol).toFixed(2), unit: "m³" });

      return {
        totalCost,
        materials: materialsList,
        summary: `${(stripVol + padsVol + raftVol).toFixed(2)}m³ ${t("struct.fd.summary_concrete", { defaultValue: "béton" })}`,
        details,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    // =========================
    // WALLS
    // =========================
    if (mode === "walls") {
      const materialsList: any[] = [];
      let totalCost = 0;
      const details: any[] = [];

      let grossArea = 0;
      let totalLen = 0;

      if (wInputMode === "global") {
        const P = parseFloat(wPerimeter) || 0;
        const H = parseFloat(wHeight) || 2.5;
        grossArea = P * H;
        totalLen = P;
      } else {
        wSegments.forEach((s) => {
          grossArea += s.length * s.height;
          totalLen += s.length;
        });
      }

      if (wGables) {
        const gableW = parseFloat(dimW) || 8;
        grossArea += (gableW * (parseFloat(wGableHeight) || 0) * 0.5) * (wGableCount || 0);
      }

      let openArea = 0;
      let revealArea = 0;
      let lintelLen = 0;

      wOpenings.forEach((op) => {
        const q = op.quantity || 1;
        openArea += op.width * op.height * q;
        revealArea += (op.height * 2 + op.width) * (op.revealDepth / 100) * q;
        lintelLen += (op.width + 0.4) * q;
      });

      const netArea = Math.max(0, grossArea - openArea);
      const masonryArea = netArea;
      const coatingArea = netArea + revealArea;

      const unitsPerM2 = selectedWallSpec.unitsPerM2;
      const totalUnits = Math.ceil(masonryArea * unitsPerM2 * (1 + (wWastePct || 0) / 100));

      const priceKey =
        getWallUnitPriceKey(selectedWallSpec as any) ??
        (selectedWallSpec.family === "stepoc" ? "BLOCK_STEPOC_UNIT" : "BLOCK_20_UNIT");

      const fallbackUnit =
        selectedWallSpec.family === "brique"
          ? Number(DEFAULT_PRICES.BRICK_20_UNIT)
          : selectedWallSpec.family === "cellulaire"
          ? Number(DEFAULT_PRICES.CELLULAR_20_UNIT)
          : selectedWallSpec.family === "stepoc"
          ? Number(DEFAULT_PRICES.BLOCK_STEPOC_UNIT)
          : Number(DEFAULT_PRICES.BLOCK_20_UNIT);

      const unitPrice = getPrice(priceKey, fallbackUnit);

      const costUnits = totalUnits * unitPrice;
      totalCost += costUnits;

      materialsList.push({
        id: "wall_units",
        name: selectedWallSpec.label,
        quantity: totalUnits,
        unit: Unit.PIECE,
        unitPrice,
        totalPrice: costUnits,
        category: CalculatorType.WALLS,
        systemKey: priceKey,
      });

      // Stepoc fill
      if (selectedWallSpec.family === "stepoc") {
        const fillM3PerM2 = selectedWallSpec.fillM3PerM2 ?? 0.13;
        const volFill = masonryArea * fillM3PerM2;

        const concreteKey = "BPE_M3";
        const concreteUnit = getPrice(concreteKey, Number(DEFAULT_PRICES.BPE_M3));

        const costFill = volFill * concreteUnit;
        totalCost += costFill;

        materialsList.push({
          id: "stepoc_fill",
          name: t("struct.walls.stepoc_fill", { defaultValue: "Béton remplissage (C25/30)" }),
          quantity: parseFloat(volFill.toFixed(2)),
          unit: Unit.M3,
          unitPrice: concreteUnit,
          totalPrice: costFill,
          category: CalculatorType.WALLS,
          systemKey: concreteKey,
          details: `${(fillM3PerM2 * 1000).toFixed(0)} L/m²`,
        });
      } else {
        if (wallBinderKind === "colle") {
          const glueKey = "GLUE_MORTAR_BAG_25KG";
          const glueUnit = getPrice(glueKey, Number(DEFAULT_PRICES.GLUE_MORTAR_BAG_25KG));
          const bagsGlue = Math.ceil(masonryArea / 10);
          const costGlue = bagsGlue * glueUnit;

          totalCost += costGlue;

          materialsList.push({
            id: "wall_glue",
            name: t("struct.walls.glue", { defaultValue: "Mortier colle (joint mince)" }),
            quantity: bagsGlue,
            unit: Unit.BAG,
            unitPrice: glueUnit,
            totalPrice: costGlue,
            category: CalculatorType.WALLS,
            systemKey: glueKey,
            details: t("struct.walls.glue_ratio", { defaultValue: "~1 sac / 10m²" }),
          });
        } else {
          const mortarKey = "MORTAR_BAG_25KG";
          const mortarUnit = getPrice(mortarKey, Number(DEFAULT_PRICES.MORTAR_BAG_25KG));
          const bagsMortar = Math.ceil(masonryArea / 3);
          const costMortar = bagsMortar * mortarUnit;

          totalCost += costMortar;

          materialsList.push({
            id: "wall_mortar",
            name: t("struct.walls.mortar", { defaultValue: "Mortier montage" }),
            quantity: bagsMortar,
            unit: Unit.BAG,
            unitPrice: mortarUnit,
            totalPrice: costMortar,
            category: CalculatorType.WALLS,
            systemKey: mortarKey,
            details: t("struct.walls.mortar_ratio", { defaultValue: "~1 sac / 3m²" }),
          });
        }
      }

      // Lintels
      if (lintelLen > 0) {
        const q = Math.ceil(lintelLen);
        const lintelKey = "LINTEL_PRECAST_M";
        const lintelUnit = getPrice(lintelKey, Number(DEFAULT_PRICES.LINTEL_PRECAST_M));

        const costLintel = q * lintelUnit;
        totalCost += costLintel;

        materialsList.push({
          id: "lintels",
          name:
            t("struct.walls.lintels", { defaultValue: "Linteaux" }) +
            ` ${wLintelType === "precast" ? t("struct.walls.prefab", { defaultValue: "préfa" }) : t("struct.walls.casted", { defaultValue: "coffrés" })}`,
          quantity: q,
          unit: Unit.METER,
          unitPrice: lintelUnit,
          totalPrice: costLintel,
          category: CalculatorType.WALLS,
          systemKey: lintelKey,
        });
      }

      // Horizontal chainage
      if (wChainageHoriz) {
        let lenCh = totalLen;
        if (wChainageInter) lenCh += totalLen;

        const volCh = lenCh * 0.15 * 0.15;

        const concreteKey = "BPE_M3";
        const concreteUnit = getPrice(concreteKey, Number(DEFAULT_PRICES.BPE_M3));
        const costChConc = volCh * concreteUnit;

        totalCost += costChConc;

        materialsList.push({
          id: "chain_conc",
          name: t("struct.walls.chainage_concrete", { defaultValue: "Béton chaînages (horiz.)" }),
          quantity: parseFloat(volCh.toFixed(2)),
          unit: Unit.M3,
          unitPrice: concreteUnit,
          totalPrice: costChConc,
          category: CalculatorType.WALLS,
          systemKey: concreteKey,
        });

        const steelKg = lenCh * 2;
        const steelQty = Math.ceil(steelKg);

        const steelKey = "REBAR_KG";
        const steelUnit = getPrice(steelKey, Number(DEFAULT_PRICES.REBAR_KG));
        const costSteel = steelQty * steelUnit;

        totalCost += costSteel;

        materialsList.push({
          id: "chain_steel",
          name: t("struct.walls.chainage_steel", { defaultValue: "Aciers chaînages (horiz.)" }),
          quantity: steelQty,
          unit: Unit.KG,
          unitPrice: steelUnit,
          totalPrice: costSteel,
          category: CalculatorType.WALLS,
          systemKey: steelKey,
        });
      }

      // Vertical reinforcements
      if (wChainageVert > 0) {
        const H_vert = parseFloat(wHeight) || 2.5;
        const totalH_vert = wChainageVert * H_vert;

        const volVert = totalH_vert * 0.15 * 0.15;

        const concreteKey = "BPE_M3";
        const concreteUnit = getPrice(concreteKey, Number(DEFAULT_PRICES.BPE_M3));
        const costVertConc = volVert * concreteUnit;

        totalCost += costVertConc;

        materialsList.push({
          id: "vert_conc",
          name: t("struct.walls.vert_concrete", { defaultValue: "Béton raidisseurs (vert.)" }),
          quantity: parseFloat(volVert.toFixed(2)),
          unit: Unit.M3,
          unitPrice: concreteUnit,
          totalPrice: costVertConc,
          category: CalculatorType.WALLS,
          systemKey: concreteKey,
        });

        const steelVertKg = totalH_vert * 2;
        const steelVertQty = Math.ceil(steelVertKg);

        const steelKey = "REBAR_KG";
        const steelUnit = getPrice(steelKey, Number(DEFAULT_PRICES.REBAR_KG));
        const costVertSteel = steelVertQty * steelUnit;

        totalCost += costVertSteel;

        materialsList.push({
          id: "vert_steel",
          name: t("struct.walls.vert_steel", { defaultValue: "Aciers raidisseurs (vert.)" }),
          quantity: steelVertQty,
          unit: Unit.KG,
          unitPrice: steelUnit,
          totalPrice: costVertSteel,
          category: CalculatorType.WALLS,
          systemKey: steelKey,
        });
      }

      // Exterior coating
      if (wCoatingExt) {
        const bagsCoat = Math.ceil(coatingArea / 1.5);
        const coatExtKey = "COATING_EXT_BAG";
        const coatExtUnit = getPrice(coatExtKey, Number(DEFAULT_PRICES.COATING_EXT_BAG));
        const costCoat = bagsCoat * coatExtUnit;

        totalCost += costCoat;

        materialsList.push({
          id: "coat_ext",
          name: t("struct.walls.coating_ext", { defaultValue: "Enduit façade (monocouche)" }),
          quantity: bagsCoat,
          unit: Unit.BAG,
          unitPrice: coatExtUnit,
          totalPrice: costCoat,
          category: CalculatorType.WALLS,
          systemKey: coatExtKey,
        });
      }

      // Interior coating
      if (wCoatingInt) {
        const bagsPlaster = Math.ceil(coatingArea / 2.5);

        const coatIntKey = "COATING_INT_BAG";
        const coatIntUnit = getPrice(coatIntKey, Number(DEFAULT_PRICES.COATING_INT_BAG));

        const costPlaster = bagsPlaster * coatIntUnit;
        totalCost += costPlaster;

        materialsList.push({
          id: "coat_int",
          name: t("struct.walls.coating_int", { defaultValue: "Enduit intérieur / plâtre" }),
          quantity: bagsPlaster,
          unit: Unit.BAG,
          unitPrice: coatIntUnit,
          totalPrice: costPlaster,
          category: CalculatorType.WALLS,
          systemKey: coatIntKey,
        });
      }

      // Scaffold
      if (wScaffold) {
        const costScaf = wPrices.scaffoldFixed;
        totalCost += costScaf;

        materialsList.push({
          id: "scaffold",
          name: t("struct.walls.scaffold", { defaultValue: "Échafaudage (forfait)" }),
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: wPrices.scaffoldFixed,
          totalPrice: costScaf,
          category: CalculatorType.WALLS,
        });
      }

      // Labor (pro)
      if (proMode) {
        const costLabor = masonryArea * wPrices.laborM2;
        totalCost += costLabor;

        materialsList.push({
          id: "labor_wall",
          name: t("struct.walls.labor", { defaultValue: "Main d'œuvre maçonnerie" }),
          quantity: parseFloat(masonryArea.toFixed(1)),
          unit: Unit.M2,
          unitPrice: wPrices.laborM2,
          totalPrice: costLabor,
          category: CalculatorType.WALLS,
        });
      }

      details.push({ label: t("struct.walls.gross_area", { defaultValue: "Surface brute" }), value: grossArea.toFixed(1), unit: "m²" });
      details.push({ label: t("struct.walls.net_area", { defaultValue: "Surface nette" }), value: masonryArea.toFixed(1), unit: "m²" });
      details.push({ label: t("struct.walls.block_selected", { defaultValue: "Bloc sélectionné" }), value: selectedWallSpec.label, unit: "" });
      details.push({ label: t("struct.walls.consumption", { defaultValue: "Consommation" }), value: unitsPerM2.toFixed(2), unit: "u/m²" });
      details.push({ label: t("struct.walls.units", { defaultValue: "Blocs/éléments" }), value: totalUnits, unit: "u" });

      const binderText =
        selectedWallSpec.family === "stepoc"
          ? "-"
          : wallBinderKind === "colle"
          ? `${Math.ceil(masonryArea / 10)} ${t("struct.common.bags", { defaultValue: "sacs" })}`
          : `${Math.ceil(masonryArea / 3)} ${t("struct.common.bags", { defaultValue: "sacs" })}`;

      details.push({ label: t("struct.walls.binder", { defaultValue: "Mortier/colle" }), value: binderText, unit: "" });

      return {
        totalCost,
        materials: materialsList,
        summary: `${totalUnits} ${t("struct.walls.summary_units", { defaultValue: "unités" })} (${masonryArea.toFixed(0)}m²)`,
        details,
      };
    }

    return { totalCost: 0, materials: [], summary: "", details: [] };
  }, [
    mode,
    dimL,
    dimW,
    perimeter,
    surface,

    gwMargin,
    gwStripDepth,
    gwKeepTopsoil,
    gwDetailedExcavs,
    gwSoilType,
    gwReuseOnSite,
    gwTruckCap,
    gwFillVolume,
    gwFillType,
    gwDiggerDays,
    gwCompactorDays,
    gwDifficultAccess,
    gwPrices,

    fdHasStrip,
    fdHasPads,
    fdHasRaft,
    fdCleanConcrete,
    fdStripL,
    fdStripW,
    fdStripH,
    fdRaftThick,
    fdPads,
    fdExcavEnabled,
    fdDepth,
    fdTrenchMargin,
    fdSoilId,
    fdEvac,
    fdRebarStripType,
    fdRebarRaftType,
    fdFormwork,
    fdPolyane,
    fdDrain,
    fdPrices,

    wInputMode,
    wPerimeter,
    wHeight,
    wGables,
    wGableHeight,
    wGableCount,
    wSegments,
    wOpenings,
    wLintelType,
    wChainageHoriz,
    wChainageInter,
    wChainageVert,
    wCoatingExt,
    wCoatingInt,
    wScaffold,
    wPrices,
    wWastePct,
    selectedWallSpec,
    wallBinderKind,
    proMode,
    t,
  ]);

  // Pass results to parent
  useEffect(() => {
    onCalculate({
      summary: calculationData.summary || t("calculator.title_fallback", { defaultValue: "Résultat" }),
      details: calculationData.details || [],
      materials: calculationData.materials || [],
      totalCost: parseFloat((calculationData.totalCost || 0).toFixed(2)),
      warnings: (calculationData as any).warnings,
    });
  }, [calculationData, onCalculate, t]);

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="space-y-6 animate-in fade-in">
      {!hideTabs && (
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => {
              setMode("groundwork");
              setStep(1);
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded flex items-center justify-center ${
              mode === "groundwork" ? "bg-white shadow text-blue-600" : "text-slate-500"
            }`}
          >
            <Mountain size={16} className="mr-1" /> {t("struct.tabs.groundwork", { defaultValue: "Terrassement" })}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("foundations");
              setStep(1);
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded flex items-center justify-center ${
              mode === "foundations" ? "bg-white shadow text-blue-600" : "text-slate-500"
            }`}
          >
            <Warehouse size={16} className="mr-1" /> {t("struct.tabs.foundations", { defaultValue: "Fondations" })}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("walls");
              setStep(1);
            }}
            className={`flex-1 py-2 text-xs font-extrabold rounded flex items-center justify-center ${
              mode === "walls" ? "bg-white shadow text-blue-600" : "text-slate-500"
            }`}
          >
            <BrickWall size={16} className="mr-1" /> {t("struct.tabs.walls", { defaultValue: "Murs" })}
          </button>
        </div>
      )}

      {/* NOTE: commentaires de génération supprimés (étaient en // dans le JSX) */}

      {/* ======================= GROUNDWORK WIZARD ======================= */}
      {mode === "groundwork" && (
        <>
          <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
                  step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
                }`}
                type="button"
              >
                {s === 1 && t("struct.gw.steps.1", { defaultValue: "1. Emprise" })}
                {s === 2 && t("struct.gw.steps.2", { defaultValue: "2. Fouilles" })}
                {s === 3 && t("struct.gw.steps.3", { defaultValue: "3. Terres" })}
                {s === 4 && t("struct.gw.steps.4", { defaultValue: "4. Logist." })}
                {s === 5 && t("struct.gw.steps.5", { defaultValue: "5. Devis" })}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Mountain size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.gw.step1.hint", {
                  defaultValue: "Définissez l'emprise du chantier et le décapage de la terre végétale.",
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t("struct.common.length_m", { defaultValue: "Longueur (m)" })}
                  </label>
                  <input
                    type="number"
                    value={dimL}
                    onChange={(e) => setDimL(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t("struct.common.width_m", { defaultValue: "Largeur (m)" })}
                  </label>
                  <input
                    type="number"
                    value={dimW}
                    onChange={(e) => setDimW(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t("struct.gw.margin_m", { defaultValue: "Marge travail (m)" })}
                  </label>
                  <input
                    type="number"
                    value={gwMargin}
                    onChange={(e) => setGwMargin(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {t("struct.gw.strip_depth_m", { defaultValue: "Ép. décapage (m)" })}
                  </label>
                  <input
                    type="number"
                    value={gwStripDepth}
                    onChange={(e) => setGwStripDepth(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer mb-2">
                  <span className="text-sm font-medium">
                    {t("struct.gw.keep_topsoil", { defaultValue: "Conserver la terre végétale sur site" })}
                  </span>
                  <input
                    type="checkbox"
                    checked={gwKeepTopsoil}
                    onChange={(e) => setGwKeepTopsoil(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>
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

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Pickaxe size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.gw.step2.hint", {
                  defaultValue: "Ajoutez les fouilles spécifiques (fondations, réseaux, plateforme).",
                })}
              </div>

              <div className="space-y-2">
                {gwDetailedExcavs.map((ex) => (
                  <div key={ex.id} className="bg-white p-2 rounded border flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm block">{ex.label}</span>
                      <span className="text-xs text-slate-500">
                        {ex.length}×{ex.width}×{ex.depth}m{" "}
                        {ex.slopeRatio && ex.slopeRatio > 0
                          ? `(${t("struct.gw.slope", { defaultValue: "Talus" })} ${ex.slopeRatio}:1)`
                          : ""}
                      </span>
                    </div>
                    <button onClick={() => removeEarthExcav(ex.id)} className="text-red-400" type="button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
                <div className="flex gap-2 mb-2">
                  <select
                    value={newExType}
                    onChange={(e) => setNewExType(e.target.value as any)}
                    className="flex-1 p-2 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value="trench">{t("struct.excav.trench", { defaultValue: "Tranchée" })}</option>
                    <option value="pit">{t("struct.excav.pit", { defaultValue: "Fouille isolée" })}</option>
                    <option value="mass">{t("struct.excav.mass", { defaultValue: "Pleine masse" })}</option>
                  </select>

                  <select
                    value={newExSlope}
                    onChange={(e) => setNewExSlope(Number(e.target.value))}
                    className="flex-1 p-2 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value={0}>{t("struct.gw.slope_0", { defaultValue: "Vertical (90°)" })}</option>
                    <option value={0.5}>{t("struct.gw.slope_05", { defaultValue: "Talus raide (2:1)" })}</option>
                    <option value={1}>{t("struct.gw.slope_1", { defaultValue: "Talus 45° (1:1)" })}</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder={t("struct.common.L", { defaultValue: "L" })}
                    value={newExL}
                    onChange={(e) => setNewExL(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={t("struct.common.W", { defaultValue: "l" })}
                    value={newExW}
                    onChange={(e) => setNewExW(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={t("struct.common.D", { defaultValue: "P" })}
                    value={newExD}
                    onChange={(e) => setNewExD(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <button onClick={addEarthExcav} className="bg-blue-600 text-white rounded font-bold" type="button">
                    <Plus size={16} className="mx-auto" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                  type="button"
                >
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.gw.step3.hint", {
                  defaultValue: "Nature du sol et foisonnement (augmentation du volume).",
                })}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {t("struct.gw.soil_type", { defaultValue: "Nature du terrain" })}
                </label>
                <select
                  value={gwSoilType}
                  onChange={(e) => setGwSoilType(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900"
                >
                  {SOIL_PROPERTIES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} (x{s.bulkingFactor})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                  type="button"
                >
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Truck size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.gw.step4.hint", { defaultValue: "Gestion des terres et moyens matériels." })}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  {t("struct.gw.earth_mgmt", { defaultValue: "Gestion des terres" })}
                </h4>

                <div className="mb-4">
                  <label className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>{t("struct.gw.reuse_fill", { defaultValue: "Réutilisation en remblai" })}</span>
                    <span>{gwReuseOnSite}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={gwReuseOnSite}
                    onChange={(e) => setGwReuseOnSite(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("struct.gw.truck_cap", { defaultValue: "Capacité benne (m³)" })}
                    </label>
                    <input
                      type="number"
                      value={gwTruckCap}
                      onChange={(e) => setGwTruckCap(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  {t("struct.gw.fill_imports", { defaultValue: "Apports & remblai" })}
                </h4>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("struct.gw.fill_type", { defaultValue: "Type d'apport" })}
                    </label>
                    <select
                      value={gwFillType}
                      onChange={(e) => setGwFillType(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="gravel">{t("struct.gw.fill_gravel", { defaultValue: "Grave / tout-venant" })}</option>
                      <option value="sand">{t("struct.gw.fill_sand", { defaultValue: "Sable" })}</option>
                      <option value="soil">{t("struct.gw.fill_soil", { defaultValue: "Terre végétale" })}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("struct.gw.fill_volume", { defaultValue: "Volume nécessaire (m³)" })}
                    </label>
                    <input
                      type="number"
                      value={gwFillVolume}
                      onChange={(e) => setGwFillVolume(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{t("struct.gw.means", { defaultValue: "Moyens" })}</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("struct.gw.digger_days", { defaultValue: "Jours mini-pelle" })}
                    </label>
                    <input
                      type="number"
                      value={gwDiggerDays}
                      onChange={(e) => setGwDiggerDays(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("struct.gw.compactor_days", { defaultValue: "Jours compacteur" })}
                    </label>
                    <input
                      type="number"
                      value={gwCompactorDays}
                      onChange={(e) => setGwCompactorDays(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between mt-3">
                  <span className="text-sm">{t("struct.gw.difficult_access", { defaultValue: "Accès difficile / contraintes" })}</span>
                  <input
                    type="checkbox"
                    checked={gwDifficultAccess}
                    onChange={(e) => setGwDifficultAccess(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                  type="button"
                >
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.gw.step5.hint", { defaultValue: "Tarification du terrassement." })}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">{t("struct.common.unit_prices", { defaultValue: "Prix unitaires" })}</h4>
                  <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600" type="button">
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? t("struct.common.pro_mode", { defaultValue: "Mode Pro" }) : t("struct.common.simple_mode", { defaultValue: "Mode Simple" })}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t("struct.gw.price_excav", { defaultValue: "Excavation (€/m³)" })}
                    </label>
                    <input
                      type="number"
                      value={gwPrices.excavM3}
                      onChange={(e) => setGwPrices({ ...gwPrices, excavM3: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t("struct.gw.price_strip", { defaultValue: "Décapage (€/m²)" })}
                    </label>
                    <input
                      type="number"
                      value={gwPrices.stripM2}
                      onChange={(e) => setGwPrices({ ...gwPrices, stripM2: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t("struct.gw.price_truck", { defaultValue: "Rotation camion (€/rot.)" })}
                    </label>
                    <input
                      type="number"
                      value={gwPrices.truckRotation}
                      onChange={(e) => setGwPrices({ ...gwPrices, truckRotation: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t("struct.gw.price_dump", { defaultValue: "Décharge (€/t)" })}
                    </label>
                    <input
                      type="number"
                      value={gwPrices.dumpFeeTon}
                      onChange={(e) => setGwPrices({ ...gwPrices, dumpFeeTon: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>
                </div>

                {proMode && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">
                        {t("struct.gw.labor_m3", { defaultValue: "MO (€/m³)" })}
                      </label>
                      <input
                        type="number"
                        value={gwPrices.laborM3}
                        onChange={(e) => setGwPrices({ ...gwPrices, laborM3: parseFloat(e.target.value) || 0 })}
                        className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                  type="button"
                >
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button
                  disabled
                  className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center"
                  type="button"
                >
                  <Check size={18} className="mr-2" /> {t("struct.common.calculated", { defaultValue: "Calculé" })}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================= FOUNDATIONS WIZARD ======================= */}
      {mode === "foundations" && (
        <>
          <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
                  step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
                }`}
                type="button"
              >
                {s === 1 && t("struct.fd.steps.1", { defaultValue: "1. Type" })}
                {s === 2 && t("struct.fd.steps.2", { defaultValue: "2. Fouilles" })}
                {s === 3 && t("struct.fd.steps.3", { defaultValue: "3. Béton" })}
                {s === 4 && t("struct.fd.steps.4", { defaultValue: "4. Divers" })}
                {s === 5 && t("struct.fd.steps.5", { defaultValue: "5. Devis" })}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Warehouse size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.fd.step1.hint", { defaultValue: "Choisissez le type de fondations et les dimensions globales." })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.common.house_length", { defaultValue: "Longueur maison" })}</label>
                  <input
                    type="number"
                    value={dimL}
                    onChange={(e) => setDimL(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.common.house_width", { defaultValue: "Largeur maison" })}</label>
                  <input
                    type="number"
                    value={dimW}
                    onChange={(e) => setDimW(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  {t("struct.fd.systems", { defaultValue: "Systèmes constructifs" })}
                </h4>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                    <div>
                      <span className="font-bold text-sm block">{t("struct.fd.strip", { defaultValue: "Semelles filantes" })}</span>
                      <span className="text-xs text-slate-400">{t("struct.fd.strip_hint", { defaultValue: "Sous murs porteurs" })}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={fdHasStrip}
                      onChange={(e) => setFdHasStrip(e.target.checked)}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                    <div>
                      <span className="font-bold text-sm block">{t("struct.fd.pads", { defaultValue: "Plots isolés" })}</span>
                      <span className="text-xs text-slate-400">{t("struct.fd.pads_hint", { defaultValue: "Sous poteaux" })}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={fdHasPads}
                      onChange={(e) => setFdHasPads(e.target.checked)}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                    <div>
                      <span className="font-bold text-sm block">{t("struct.fd.raft", { defaultValue: "Radier général" })}</span>
                      <span className="text-xs text-slate-400">{t("struct.fd.raft_hint", { defaultValue: "Dalle porteuse intégrale" })}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={fdHasRaft}
                      onChange={(e) => setFdHasRaft(e.target.checked)}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                  </label>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
                type="button"
              >
                {t("common.next", { defaultValue: "Suivant" })} <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Shovel size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.fd.step2.hint", { defaultValue: "Calcul automatique des fouilles en fonction des fondations choisies." })}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between mb-4">
                  <span className="font-bold text-sm text-slate-700">
                    {t("struct.fd.count_excav", { defaultValue: "Compter le terrassement" })}
                  </span>
                  <input
                    type="checkbox"
                    checked={fdExcavEnabled}
                    onChange={(e) => setFdExcavEnabled(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>

                {fdExcavEnabled && (
                  <div className="space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {t("struct.fd.depth", { defaultValue: "Prof. hors-gel (m)" })}
                        </label>
                        <input
                          type="number"
                          value={fdDepth}
                          onChange={(e) => setFdDepth(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                          {t("struct.fd.margin", { defaultValue: "Marge travail (m)" })}
                        </label>
                        <input
                          type="number"
                          value={fdTrenchMargin}
                          onChange={(e) => setFdTrenchMargin(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {t("struct.fd.soil_type", { defaultValue: "Nature du sol" })}
                      </label>
                      <select
                        value={fdSoilId}
                        onChange={(e) => setFdSoilId(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 text-sm"
                      >
                        {SOIL_PROPERTIES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center space-x-2 pt-2 border-t border-slate-100">
                      <input
                        type="checkbox"
                        checked={fdEvac}
                        onChange={(e) => setFdEvac(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span className="text-sm text-slate-600">
                        {t("struct.fd.evac", { defaultValue: "Évacuation des terres (foisonné)" })}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                  type="button"
                >
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.fd.step3.hint", { defaultValue: "Dimensionnement du béton et des armatures." })}
              </div>

              {fdHasStrip && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                    <Ruler size={14} className="mr-1" /> {t("struct.fd.strip", { defaultValue: "Semelles filantes" })}
                  </h4>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] text-slate-400">{t("struct.common.length_m_short", { defaultValue: "Long. (m)" })}</label>
                      <input
                        type="number"
                        value={fdStripL}
                        onChange={(e) => setFdStripL(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">{t("struct.common.width_m_short", { defaultValue: "Larg. (m)" })}</label>
                      <input
                        type="number"
                        value={fdStripW}
                        onChange={(e) => setFdStripW(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">{t("struct.common.height_m_short", { defaultValue: "Haut. (m)" })}</label>
                      <input
                        type="number"
                        value={fdStripH}
                        onChange={(e) => setFdStripH(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <span className="text-xs font-bold text-slate-600">{t("struct.fd.rebar", { defaultValue: "Armatures" })}</span>
                    <select
                      value={fdRebarStripType}
                      onChange={(e) => setFdRebarStripType(e.target.value)}
                      className="text-xs p-1 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="S35">{t("struct.fd.rebar_s35", { defaultValue: "S35 (6 fils)" })}</option>
                      <option value="S15">{t("struct.fd.rebar_s15", { defaultValue: "S15 (4 fils)" })}</option>
                    </select>
                  </div>
                </div>
              )}

              {fdHasPads && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center">
                      <BoxSelect size={14} className="mr-1" /> {t("struct.fd.pads", { defaultValue: "Plots isolés" })}
                    </h4>
                    <button onClick={addPad} className="text-xs text-blue-600 font-bold" type="button">
                      + {t("common.add", { defaultValue: "Ajouter" })}
                    </button>
                  </div>

                  {fdPads.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 mb-2 text-xs">
                      <input
                        type="number"
                        value={p.count}
                        onChange={(e) => updatePad(p.id, "count", Number(e.target.value))}
                        className="w-10 p-1 border border-slate-300 rounded text-center bg-white text-slate-900"
                        title={t("struct.common.qty", { defaultValue: "Qté" })}
                      />

                      <select
                        value={p.type}
                        onChange={(e) => updatePad(p.id, "type", e.target.value)}
                        className="w-16 p-1 border border-slate-300 rounded bg-white text-slate-900"
                      >
                        <option value="rect">{t("struct.fd.pad_rect", { defaultValue: "Rect" })}</option>
                        <option value="cyl">{t("struct.fd.pad_cyl", { defaultValue: "Rond" })}</option>
                      </select>

                      {p.type === "rect" ? (
                        <>
                          <input
                            type="number"
                            value={p.width}
                            onChange={(e) => updatePad(p.id, "width", Number(e.target.value))}
                            className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                            placeholder={t("struct.common.w", { defaultValue: "l" })}
                          />
                          <span>×</span>
                          <input
                            type="number"
                            value={p.length}
                            onChange={(e) => updatePad(p.id, "length", Number(e.target.value))}
                            className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                            placeholder={t("struct.common.l", { defaultValue: "L" })}
                          />
                        </>
                      ) : (
                        <input
                          type="number"
                          value={p.diameter || 0}
                          onChange={(e) => updatePad(p.id, "diameter", Number(e.target.value))}
                          className="w-20 p-1 border border-slate-300 rounded bg-white text-slate-900"
                          placeholder={t("struct.fd.diameter", { defaultValue: "Diam" })}
                        />
                      )}

                      <input
                        type="number"
                        value={p.height}
                        onChange={(e) => updatePad(p.id, "height", Number(e.target.value))}
                        className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                        placeholder={t("struct.common.h", { defaultValue: "H" })}
                      />

                      <button onClick={() => removePad(p.id)} className="text-red-400" type="button">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {fdPads.length === 0 && (
                    <p className="text-xs text-slate-400 italic">{t("struct.fd.no_pads", { defaultValue: "Aucun plot." })}</p>
                  )}
                </div>
              )}

              {fdHasRaft && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                    <Square size={14} className="mr-1" /> {t("struct.fd.raft", { defaultValue: "Radier" })}
                  </h4>

                  <div className="flex gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400">{t("struct.fd.thickness_m", { defaultValue: "Épaisseur (m)" })}</label>
                      <input
                        type="number"
                        value={fdRaftThick}
                        onChange={(e) => setFdRaftThick(e.target.value)}
                        className="w-20 p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">{t("struct.fd.mesh", { defaultValue: "Treillis" })}</label>
                      <select
                        value={fdRebarRaftType}
                        onChange={(e) => setFdRebarRaftType(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      >
                        <option value="ST25C">{t("struct.fd.mesh_st25", { defaultValue: "ST25C (Standard)" })}</option>
                        <option value="ST10">{t("struct.fd.mesh_st10", { defaultValue: "ST10 (Léger)" })}</option>
                        <option value="ST40C">{t("struct.fd.mesh_st40", { defaultValue: "ST40C (Lourd)" })}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between border border-slate-200">
                <span className="text-sm font-medium text-slate-700">{t("struct.fd.clean_concrete", { defaultValue: "Béton de propreté (5cm)" })}</span>
                <input
                  type="checkbox"
                  checked={fdCleanConcrete}
                  onChange={(e) => setFdCleanConcrete(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.fd.step4.hint", { defaultValue: "Coffrage et protection." })}
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">{t("struct.fd.formwork", { defaultValue: "Coffrage" })}</span>
                    <span className="text-xs text-slate-400">{t("struct.fd.formwork_hint", { defaultValue: "Si fouilles non-pleine terre" })}</span>
                  </div>
                  <input type="checkbox" checked={fdFormwork} onChange={(e) => setFdFormwork(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">{t("struct.fd.drain", { defaultValue: "Drain périphérique" })}</span>
                    <span className="text-xs text-slate-400">{t("struct.fd.drain_hint", { defaultValue: "Drain + gravier + géo" })}</span>
                  </div>
                  <input type="checkbox" checked={fdDrain} onChange={(e) => setFdDrain(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">{t("struct.fd.polyane", { defaultValue: "Polyane" })}</span>
                    <span className="text-xs text-slate-400">{t("struct.fd.polyane_hint", { defaultValue: "Sous radier/dallage" })}</span>
                  </div>
                  <input type="checkbox" checked={fdPolyane} onChange={(e) => setFdPolyane(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.fd.step5.hint", { defaultValue: "Récapitulatif des prix unitaires." })}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">{t("struct.common.materials_services", { defaultValue: "Matériaux & prestations" })}</h4>
                  <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600" type="button">
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? t("struct.common.pro_mode", { defaultValue: "Mode Pro" }) : t("struct.common.simple_mode", { defaultValue: "Mode Simple" })}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("struct.fd.price_concrete", { defaultValue: "Béton BPE (€/m³)" })}</label>
                    <input
                      type="number"
                      value={fdPrices.concrete}
                      onChange={(e) => setFdPrices({ ...fdPrices, concrete: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("struct.fd.price_rebar", { defaultValue: "Ferraillage (€/u)" })}</label>
                    <input
                      type="number"
                      value={fdPrices.rebarCage}
                      onChange={(e) => setFdPrices({ ...fdPrices, rebarCage: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  {fdExcavEnabled && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">{t("struct.fd.price_excav", { defaultValue: "Fouilles (€/m³)" })}</label>
                      <input
                        type="number"
                        value={fdPrices.excavation}
                        onChange={(e) => setFdPrices({ ...fdPrices, excavation: parseFloat(e.target.value) || 0 })}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}

                  {fdFormwork && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">{t("struct.fd.price_formwork", { defaultValue: "Coffrage (€/m²)" })}</label>
                      <input
                        type="number"
                        value={fdPrices.formwork}
                        onChange={(e) => setFdPrices({ ...fdPrices, formwork: parseFloat(e.target.value) || 0 })}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}
                </div>

                {proMode && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("struct.fd.price_labor_conc", { defaultValue: "MO béton (€/m³)" })}</label>
                      <input
                        type="number"
                        value={fdPrices.laborM3}
                        onChange={(e) => setFdPrices({ ...fdPrices, laborM3: parseFloat(e.target.value) || 0 })}
                        className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                      />
                    </div>

                    {fdFormwork && (
                      <div>
                        <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("struct.fd.price_labor_form", { defaultValue: "MO coffrage (€/m²)" })}</label>
                        <input
                          type="number"
                          value={fdPrices.laborForm}
                          onChange={(e) => setFdPrices({ ...fdPrices, laborForm: parseFloat(e.target.value) || 0 })}
                          className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center" type="button">
                  <Check size={18} className="mr-2" /> {t("struct.common.calculated", { defaultValue: "Calculé" })}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ======================= WALLS WIZARD ======================= */}
      {mode === "walls" && (
        <>
          <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
                  step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
                }`}
                type="button"
              >
                {s === 1 && t("struct.w.steps.1", { defaultValue: "1. Plan" })}
                {s === 2 && t("struct.w.steps.2", { defaultValue: "2. Matériau" })}
                {s === 3 && t("struct.w.steps.3", { defaultValue: "3. Ouv." })}
                {s === 4 && t("struct.w.steps.4", { defaultValue: "4. Struct." })}
                {s === 5 && t("struct.w.steps.5", { defaultValue: "5. Finition" })}
                {s === 6 && t("struct.w.steps.6", { defaultValue: "6. Devis" })}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Ruler size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.w.step1.hint", { defaultValue: "Dimensions des murs." })}
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setWInputMode("global")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${wInputMode === "global" ? "bg-white shadow" : "text-slate-500"}`}
                  type="button"
                >
                  {t("struct.w.mode_global", { defaultValue: "Global" })}
                </button>
                <button
                  onClick={() => setWInputMode("segments")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${wInputMode === "segments" ? "bg-white shadow" : "text-slate-500"}`}
                  type="button"
                >
                  {t("struct.w.mode_segments", { defaultValue: "Segments" })}
                </button>
              </div>

              {wInputMode === "global" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.perimeter_total", { defaultValue: "Périmètre total (m)" })}</label>
                    <input
                      type="number"
                      value={wPerimeter}
                      onChange={(e) => setWPerimeter(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.height", { defaultValue: "Hauteur (m)" })}</label>
                    <input
                      type="number"
                      value={wHeight}
                      onChange={(e) => setWHeight(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.waste_pct", { defaultValue: "Pertes (%, casse / chutes)" })}</label>
                    <input
                      type="number"
                      value={wWastePct}
                      onChange={(e) => setWWastePct(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>

                  <label className="flex items-center justify-between col-span-2 p-3 bg-white border rounded-lg cursor-pointer">
                    <div>
                      <div className="font-bold text-sm text-slate-700">{t("struct.w.gables", { defaultValue: "Pignons" })}</div>
                      <div className="text-xs text-slate-400">{t("struct.w.gables_hint", { defaultValue: "Ajouter surface triangulaire" })}</div>
                    </div>
                    <input type="checkbox" checked={wGables} onChange={(e) => setWGables(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                  </label>

                  {wGables && (
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.gable_h", { defaultValue: "Hauteur pignon (m)" })}</label>
                        <input
                          type="number"
                          value={wGableHeight}
                          onChange={(e) => setWGableHeight(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.gable_count", { defaultValue: "Nombre" })}</label>
                        <input
                          type="number"
                          value={wGableCount}
                          onChange={(e) => setWGableCount(Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {wSegments.map((s) => (
                    <div key={s.id} className="flex justify-between items-center p-2 bg-white border rounded">
                      <div className="flex items-center">
                        <AlignLeft size={16} className="mr-2 text-slate-400" />
                        <div>
                          <span className="font-bold text-sm block">{s.label}</span>
                          <span className="text-xs text-slate-500">L: {s.length}m • H: {s.height}m</span>
                        </div>
                      </div>
                      <button onClick={() => removeWallSegment(s.id)} className="text-red-400 p-2" type="button">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <div className="bg-slate-50 p-2 rounded border border-blue-100 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder={t("struct.w.seg_name", { defaultValue: "Nom" })}
                      value={newSegLabel}
                      onChange={(e) => setNewSegLabel(e.target.value)}
                      className="flex-1 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder={t("struct.common.L", { defaultValue: "L" })}
                      value={newSegL}
                      onChange={(e) => setNewSegL(e.target.value)}
                      className="w-16 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder={t("struct.common.H", { defaultValue: "H" })}
                      value={newSegH}
                      onChange={(e) => setNewSegH(e.target.value)}
                      className="w-16 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <button onClick={addWallSegment} className="bg-blue-600 text-white p-1.5 rounded" type="button">
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.waste_pct", { defaultValue: "Pertes (%, casse / chutes)" })}</label>
                    <input
                      type="number"
                      value={wWastePct}
                      onChange={(e) => setWWastePct(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
                type="button"
              >
                {t("common.next", { defaultValue: "Suivant" })} <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <BrickWall size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.w.step2.hint", { defaultValue: "Choix du matériau." })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["parpaing", "brique", "cellulaire", "stepoc"] as const).map((fam) => (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => setWWallFamily(fam)}
                    className={`p-2 rounded border text-xs font-medium ${
                      wWallFamily === fam ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500" : "bg-white text-slate-500"
                    }`}
                  >
                    {fam === "parpaing" && t("struct.w.family.parpaing", { defaultValue: "Parpaing" })}
                    {fam === "brique" && t("struct.w.family.brique", { defaultValue: "Brique" })}
                    {fam === "cellulaire" && t("struct.w.family.cellulaire", { defaultValue: "Béton cellulaire" })}
                    {fam === "stepoc" && t("struct.w.family.stepoc", { defaultValue: "Bloc à bancher" })}
                  </button>
                ))}
              </div>

              <div className="bg-white p-3 rounded border">
                <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.block_format", { defaultValue: "Format / épaisseur" })}</label>

                <select
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  value={wWallBlockId}
                  onChange={(e) => setWWallBlockId(e.target.value)}
                >
                  {getSpecsByFamily(wWallFamily).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — {s.unitsPerM2.toFixed(2)} u/m²
                    </option>
                  ))}
                </select>

                <p className="text-xs text-slate-500 mt-2">
                  <span className="opacity-70">
                    • {selectedWallSpec.unitsPerM2.toFixed(2)} u/m² • {selectedWallSpec.thicknessCm}cm
                  </span>
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <LayoutTemplate size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.w.step3.hint", { defaultValue: "Ouvertures." })}
              </div>

              <div className="space-y-2">
                {wOpenings.map((op) => (
                  <div key={op.id} className="flex justify-between items-center p-2 bg-white border rounded shadow-sm">
                    <div>
                      <span className="font-bold text-sm block">{op.label || op.type}</span>
                      <span className="text-xs text-slate-500">
                        {op.width}×{op.height}m ({t("struct.w.reveal", { defaultValue: "Tab" })}: {op.revealDepth}cm)
                      </span>
                    </div>
                    <button onClick={() => removeWallOpening(op.id)} className="text-red-400 p-2" type="button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {wOpenings.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-4 italic">{t("struct.w.no_openings", { defaultValue: "Aucune ouverture." })}</div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
                <div className="flex gap-2 mb-2">
                  <select
                    value={newWOpType}
                    onChange={(e) => setNewWOpType(e.target.value as any)}
                    className="flex-1 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value="window">{t("struct.opening.window", { defaultValue: "Fenêtre" })}</option>
                    <option value="door">{t("struct.opening.door", { defaultValue: "Porte" })}</option>
                    <option value="bay">{t("struct.opening.bay", { defaultValue: "Baie vitrée" })}</option>
                    <option value="garage">{t("struct.opening.garage", { defaultValue: "Garage" })}</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder={t("struct.common.width", { defaultValue: "Larg" })}
                    value={newWOpW}
                    onChange={(e) => setNewWOpW(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={t("struct.common.height", { defaultValue: "Haut" })}
                    value={newWOpH}
                    onChange={(e) => setNewWOpH(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={t("struct.w.reveal_cm", { defaultValue: "Tab (cm)" })}
                    value={newWOpReveal}
                    onChange={(e) => setNewWOpReveal(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                </div>

                <button
                  onClick={addWallOpening}
                  className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded text-xs flex justify-center items-center"
                  type="button"
                >
                  <Plus size={14} className="mr-1" /> {t("struct.w.add_opening", { defaultValue: "Ajouter ouverture" })}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.w.step4.hint", { defaultValue: "Chaînages et linteaux." })}
              </div>

              <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-bold text-slate-700">{t("struct.w.chain_h", { defaultValue: "Chaînage horizontal" })}</span>
                  <input type="checkbox" checked={wChainageHoriz} onChange={(e) => setWChainageHoriz(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                {wChainageHoriz && (
                  <label className="flex items-center justify-between cursor-pointer pl-4 border-l-2 border-slate-100">
                    <span className="text-xs text-slate-500">{t("struct.w.chain_inter", { defaultValue: "Chaînage intermédiaire" })}</span>
                    <input type="checkbox" checked={wChainageInter} onChange={(e) => setWChainageInter(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
                  </label>
                )}

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">{t("struct.w.vert", { defaultValue: "Raidisseurs verticaux" })}</span>
                    <button
                      onClick={autoCalcReinforcements}
                      className="text-[10px] bg-slate-100 px-2 py-1 rounded text-blue-600 font-bold"
                      type="button"
                    >
                      {t("struct.common.auto", { defaultValue: "Auto" })}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{t("struct.w.vert_total", { defaultValue: "Nombre total" })}</span>
                    <input
                      type="number"
                      value={wChainageVert}
                      onChange={(e) => setWChainageVert(Number(e.target.value))}
                      className="w-16 p-1 border border-slate-300 rounded text-center bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="border-t pt-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{t("struct.w.lintel_type", { defaultValue: "Type de linteau" })}</label>
                  <select
                    value={wLintelType}
                    onChange={(e) => setWLintelType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 text-sm"
                  >
                    <option value="precast">{t("struct.w.lintel_precast", { defaultValue: "Préfabriqué" })}</option>
                    <option value="cast">{t("struct.w.lintel_cast", { defaultValue: "Coffré / coulé" })}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <PaintRoller size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.w.step5.hint", { defaultValue: "Finitions." })}
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">{t("struct.w.coating_ext", { defaultValue: "Enduit extérieur" })}</span>
                    <p className="text-[10px] text-slate-400">{t("struct.w.coating_ext_hint", { defaultValue: "Monocouche" })}</p>
                  </div>
                  <input type="checkbox" checked={wCoatingExt} onChange={(e) => setWCoatingExt(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">{t("struct.w.coating_int", { defaultValue: "Enduit intérieur" })}</span>
                    <p className="text-[10px] text-slate-400">{t("struct.w.coating_int_hint", { defaultValue: "Plâtre / enduit" })}</p>
                  </div>
                  <input type="checkbox" checked={wCoatingInt} onChange={(e) => setWCoatingInt(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">{t("struct.w.scaffold", { defaultValue: "Échafaudage" })}</span>
                    <p className="text-[10px] text-slate-400">{t("struct.w.scaffold_hint", { defaultValue: "Forfait" })}</p>
                  </div>
                  <input type="checkbox" checked={wScaffold} onChange={(e) => setWScaffold(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button onClick={() => setStep(6)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {t("common.next", { defaultValue: "Suivant" })}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                {t("struct.w.step6.hint", { defaultValue: "Prix unitaires murs." })}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">{t("struct.common.materials", { defaultValue: "Matériaux" })}</h4>
                  <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600" type="button">
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? t("struct.common.pro_mode", { defaultValue: "Mode Pro" }) : t("struct.common.simple_mode", { defaultValue: "Mode Simple" })}
                  </button>
                </div>

                {/* ✅ Prix unité variante (clé dépend de getWallUnitPriceKey) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {t("struct.w.unit_price_variant", { defaultValue: "Prix unité (€/u) — variante sélectionnée" })} — {selectedWallSpec.label}
                    </label>

                    {(() => {
                      const priceKey =
                        getWallUnitPriceKey(selectedWallSpec as any) ??
                        (selectedWallSpec.family === "stepoc" ? "BLOCK_STEPOC_UNIT" : "BLOCK_20_UNIT");

                      const fallbackUnit =
                        selectedWallSpec.family === "brique"
                          ? Number(DEFAULT_PRICES.BRICK_20_UNIT)
                          : selectedWallSpec.family === "cellulaire"
                          ? Number(DEFAULT_PRICES.CELLULAR_20_UNIT)
                          : selectedWallSpec.family === "stepoc"
                          ? Number(DEFAULT_PRICES.BLOCK_STEPOC_UNIT)
                          : Number(DEFAULT_PRICES.BLOCK_20_UNIT);

                      const current = wPrices.unitOverrides[priceKey] ?? getUnitPrice(priceKey) ?? fallbackUnit;

                      return (
                        <>
                          <input
                            type="number"
                            value={current}
                            onChange={(e) => setUnitOverride(priceKey, parseFloat(e.target.value) || 0)}
                            className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                          />
                          <p className="text-[11px] text-slate-400 mt-1">
                            {t("struct.w.unit_price_variant_help", {
                              defaultValue: "Ce prix est mémorisé pour la variante (famille/épaisseur).",
                            })}
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {wallBinderKind === "mortier"
                        ? t("struct.w.mortar_bag", { defaultValue: "Mortier (€/sac)" })
                        : t("struct.w.glue_bag", { defaultValue: "Colle (€/sac)" })}
                    </label>
                    <input
                      type="number"
                      value={wallBinderKind === "mortier" ? wPrices.mortarBag : wPrices.glueBag}
                      onChange={(e) => {
                        if (wallBinderKind === "mortier") updateWPrice("mortarBag", e.target.value);
                        else updateWPrice("glueBag", e.target.value);
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{t("struct.w.lintel_m", { defaultValue: "Linteau (€/m)" })}</label>
                    <input
                      type="number"
                      value={wPrices.lintelM}
                      onChange={(e) => updateWPrice("lintelM", e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  {wCoatingExt && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">{t("struct.w.coating_ext_bag", { defaultValue: "Enduit façade (€/sac)" })}</label>
                      <input
                        type="number"
                        value={wPrices.coatingExtBag}
                        onChange={(e) => updateWPrice("coatingExtBag", e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}

                  {wScaffold && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">{t("struct.w.scaffold_fixed", { defaultValue: "Échafaudage (forfait)" })}</label>
                      <input
                        type="number"
                        value={wPrices.scaffoldFixed}
                        onChange={(e) => updateWPrice("scaffoldFixed", e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}
                </div>

                {proMode && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("struct.w.labor_m2", { defaultValue: "MO maçonnerie (€/m²)" })}</label>
                      <input
                        type="number"
                        value={wPrices.laborM2}
                        onChange={(e) => updateWPrice("laborM2", e.target.value)}
                        className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(5)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {t("common.back", { defaultValue: "Retour" })}
                </button>
                <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center" type="button">
                  <Check size={18} className="mr-2" /> {t("struct.common.calculated", { defaultValue: "Calculé" })}
                </button>
              </div>
            </div>
          )}
        </>
      )}      </div>
    );
  };

export default StructuralCalculator;