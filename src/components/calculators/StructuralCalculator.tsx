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

  // Alias simple (et évite les defaultValue partout)
  /**
   * i18n helper
   *
   * Some parts of the app call `tr(key)` and other parts call `tr(key, fallbackEn)`.
   * i18next's `t()` second argument is an options object, so passing a string
   * triggers a TS error. We support both signatures here.
   */
  type TrOptions = Record<string, any> & { defaultValue?: string };
  const tr = (key: string, fallbackEnOrOptions?: string | TrOptions, options?: Record<string, any>) => {
    if (typeof fallbackEnOrOptions === "string") {
      return t(key, { defaultValue: fallbackEnOrOptions, ...(options ?? {}) });
    }
    return t(key, fallbackEnOrOptions);
  };

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
  const [newExSlope, setNewExSlope] = useState<number>(0);

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
      newExType === "trench"
        ? tr("struct.excav.trench")
        : newExType === "pit"
        ? tr("struct.excav.pit")
        : tr("struct.excav.mass");

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
      window: tr("struct.opening.window"),
      door: tr("struct.opening.door"),
      bay: tr("struct.opening.bay"),
      garage: tr("struct.opening.garage"),
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
        label: newSegLabel || tr("struct.wall.segment_default", { n: prev.length + 1 }),
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

      const stripArea = L > 0 && W > 0 ? (L + 2 * margin) * (W + 2 * margin) : parseFloat(surface) || 0;
      const stripVolPlace = stripArea * stripDepth;

      const soilProps = SOIL_PROPERTIES.find((s) => s.id === gwSoilType) || SOIL_PROPERTIES[0];
      const swellCoef = soilProps.bulkingFactor;
      const stripVolFoison = stripVolPlace * swellCoef;

      const costStrip = stripArea * gwPrices.stripM2;
      totalCost += costStrip;

      materialsList.push({
        id: "strip",
        name: tr("struct.gw.strip"),
        quantity: stripArea,
        unit: Unit.M2,
        unitPrice: gwPrices.stripM2,
        totalPrice: costStrip,
        category: CalculatorType.GROUNDWORK,
        details: `${tr("struct.common.thickness")} ${(stripDepth * 100).toFixed(0)}cm - ${stripVolPlace.toFixed(1)}m³`,
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
          name: tr("struct.gw.excav"),
          quantity: parseFloat(excavVolPlace.toFixed(1)),
          unit: Unit.M3,
          unitPrice: gwPrices.excavM3,
          totalPrice: costExcav,
          category: CalculatorType.GROUNDWORK,
          details: tr("struct.gw.excav_details", { count: gwDetailedExcavs.length, swell: swellCoef }),
        });
      }

      // Earth management
      let totalVolToManage = stripVolFoison + excavVolFoison;

      if (gwKeepTopsoil) {
        totalVolToManage -= stripVolFoison;
        details.push({ label: tr("struct.gw.topsoil_stored"), value: stripVolFoison.toFixed(1), unit: "m³" });
      }

      if (gwReuseOnSite > 0) {
        const volToReuse = excavVolFoison * (gwReuseOnSite / 100);
        totalVolToManage -= volToReuse;
        details.push({ label: tr("struct.gw.reused_fill"), value: volToReuse.toFixed(1), unit: "m³" });
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
            name: tr("struct.gw.truck_rotation_named", { cap: gwTruckCap }),
            quantity: rotations,
            unit: Unit.ROTATION,
            unitPrice: gwPrices.truckRotation,
            totalPrice: costTransport,
            category: CalculatorType.GROUNDWORK,
          },
          {
            id: "dump",
            name: tr("struct.gw.dump_fee"),
            quantity: parseFloat(tonsToDump.toFixed(1)),
            unit: Unit.TON,
            unitPrice: gwPrices.dumpFeeTon,
            totalPrice: costDump,
            category: CalculatorType.GROUNDWORK,
            details: tr("struct.gw.dump_details", { vol: volToEvac.toFixed(1) }),
          }
        );
      }

      // Fill import
      const fillVol = parseFloat(gwFillVolume) || 0;
      if (fillVol > 0) {
        let fillPrice = gwPrices.fillGravelM3;
        let fillKey = "struct.gw.fill_gravel";

        if (gwFillType === "sand") {
          fillPrice = gwPrices.fillSandM3;
          fillKey = "struct.gw.fill_sand";
        }
        if (gwFillType === "soil") {
          fillPrice = gwPrices.fillSoilM3;
          fillKey = "struct.gw.fill_soil";
        }

        const fillLabel = tr(fillKey);
        const costFill = fillVol * fillPrice;
        totalCost += costFill;

        materialsList.push({
          id: "fill",
          name: tr("struct.gw.fill_import_named", { label: fillLabel }),
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
          name: tr("struct.gw.digger_rental"),
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
          name: tr("struct.gw.compactor_rental"),
          quantity: gwCompactorDays,
          unit: Unit.DAY,
          unitPrice: gwPrices.compactorDay,
          totalPrice: costComp,
          category: CalculatorType.GROUNDWORK,
        });
      }

      details.push({ label: tr("struct.gw.strip_area"), value: stripArea.toFixed(0), unit: "m²" });
      details.push({ label: tr("struct.gw.volume_inplace"), value: (stripVolPlace + excavVolPlace).toFixed(1), unit: "m³" });
      details.push({ label: tr("struct.gw.volume_bulking"), value: (stripVolFoison + excavVolFoison).toFixed(1), unit: "m³" });
      details.push({ label: tr("struct.gw.to_evac"), value: volToEvac.toFixed(1), unit: "m³" });

      if (gwReuseOnSite > 0 && !gwCompactorDays) {
        warnings.push(tr("struct.gw.warn_no_compaction"));
      }

      return {
        totalCost,
        materials: materialsList,
        summary: tr("struct.gw.summary_excavated", { m3: (stripVolPlace + excavVolPlace).toFixed(1) }),
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
          name: tr("struct.fd.conc_strip"),
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
          name: tr("struct.fd.rebar_strip_named", { type: fdRebarStripType }),
          quantity: cages,
          unit: Unit.PIECE,
          unitPrice: fdPrices.rebarCage,
          totalPrice: costRebar,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "REBAR_CAGE_35_15_6M",
          details: tr("struct.fd.rebar_ratio"),
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
          name: tr("struct.fd.conc_pads"),
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
          name: tr("struct.fd.conc_raft"),
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
          name: tr("struct.fd.mesh_named", { type: fdRebarRaftType }),
          quantity: meshPanels,
          unit: Unit.PIECE,
          unitPrice: fdPrices.meshPanel,
          totalPrice: costMesh,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "MESH_PANEL_ST25",
          details: tr("struct.fd.mesh_ratio"),
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
          name: tr("struct.fd.clean_concrete"),
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
          name: tr("struct.fd.excav"),
          quantity: parseFloat(excavVolPlace.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.excavation,
          totalPrice: costExcav,
          category: CalculatorType.FOUNDATIONS,
          systemKey: "EXCAVATION_M3",
          details: tr("struct.common.multiplier", { x: swellCoef }),
        });

        if (fdEvac) {
          const excavFoison = excavVolPlace * swellCoef;
          const costEvac = excavFoison * fdPrices.evacuation;
          totalCost += costEvac;

          materialsList.push({
            id: "fd_evac",
            name: tr("struct.fd.evac"),
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
          name: tr("struct.fd.formwork_panels"),
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
          name: tr("struct.fd.drain"),
          quantity: parseFloat(L.toFixed(1)),
          unit: Unit.METER,
          unitPrice: fdPrices.drainM,
          totalPrice: costDrain,
          category: CalculatorType.FOUNDATIONS,
        });
      }

      if (fdPolyane) {
        const a =
          (parseFloat(dimL) || 0) > 0 && (parseFloat(dimW) || 0) > 0
            ? (parseFloat(dimL) || 0) * (parseFloat(dimW) || 0)
            : parseFloat(surface) || 0;

        const costPoly = a * fdPrices.polyaneM2;
        totalCost += costPoly;

        materialsList.push({
          id: "fd_poly",
          name: tr("struct.fd.polyane"),
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
            name: tr("struct.fd.labor_concrete"),
            quantity: parseFloat(volConcrete.toFixed(2)),
            unit: Unit.M3,
            unitPrice: fdPrices.laborM3,
            totalPrice: costMO,
            category: CalculatorType.FOUNDATIONS,
          });
        }
      }

      details.push({ label: tr("struct.fd.soil"), value: soilProps.label, unit: "" });
      details.push({ label: tr("struct.fd.total_concrete"), value: (stripVol + padsVol + raftVol).toFixed(2), unit: "m³" });

      return {
        totalCost,
        materials: materialsList,
        summary: tr("struct.fd.summary_concrete", { m3: (stripVol + padsVol + raftVol).toFixed(2) }),
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
          name: tr("struct.walls.stepoc_fill"),
          quantity: parseFloat(volFill.toFixed(2)),
          unit: Unit.M3,
          unitPrice: concreteUnit,
          totalPrice: costFill,
          category: CalculatorType.WALLS,
          systemKey: concreteKey,
          details: tr("struct.walls.stepoc_fill_details", { lpm2: (fillM3PerM2 * 1000).toFixed(0) }),
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
            name: tr("struct.walls.glue"),
            quantity: bagsGlue,
            unit: Unit.BAG,
            unitPrice: glueUnit,
            totalPrice: costGlue,
            category: CalculatorType.WALLS,
            systemKey: glueKey,
            details: tr("struct.walls.glue_ratio"),
          });
        } else {
          const mortarKey = "MORTAR_BAG_25KG";
          const mortarUnit = getPrice(mortarKey, Number(DEFAULT_PRICES.MORTAR_BAG_25KG));
          const bagsMortar = Math.ceil(masonryArea / 3);
          const costMortar = bagsMortar * mortarUnit;

          totalCost += costMortar;

          materialsList.push({
            id: "wall_mortar",
            name: tr("struct.walls.mortar"),
            quantity: bagsMortar,
            unit: Unit.BAG,
            unitPrice: mortarUnit,
            totalPrice: costMortar,
            category: CalculatorType.WALLS,
            systemKey: mortarKey,
            details: tr("struct.walls.mortar_ratio"),
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

        const kind =
          wLintelType === "precast" ? tr("struct.walls.prefab") : tr("struct.walls.casted");

        materialsList.push({
          id: "lintels",
          name: tr("struct.walls.lintels_named", { kind }),
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
          name: tr("struct.walls.chainage_concrete"),
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
          name: tr("struct.walls.chainage_steel"),
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
          name: tr("struct.walls.vert_concrete"),
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
          name: tr("struct.walls.vert_steel"),
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
          name: tr("struct.walls.coating_ext"),
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
          name: tr("struct.walls.coating_int"),
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
          name: tr("struct.walls.scaffold"),
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
          name: tr("struct.walls.labor"),
          quantity: parseFloat(masonryArea.toFixed(1)),
          unit: Unit.M2,
          unitPrice: wPrices.laborM2,
          totalPrice: costLabor,
          category: CalculatorType.WALLS,
        });
      }

      details.push({ label: tr("struct.walls.gross_area"), value: grossArea.toFixed(1), unit: "m²" });
      details.push({ label: tr("struct.walls.net_area"), value: masonryArea.toFixed(1), unit: "m²" });
      details.push({ label: tr("struct.walls.block_selected"), value: selectedWallSpec.label, unit: "" });
      details.push({ label: tr("struct.walls.consumption"), value: unitsPerM2.toFixed(2), unit: "u/m²" });
      details.push({ label: tr("struct.walls.units"), value: totalUnits, unit: "u" });

      const binderText =
        selectedWallSpec.family === "stepoc"
          ? tr("struct.common.dash")
          : wallBinderKind === "colle"
          ? tr("struct.common.bags_count", { n: Math.ceil(masonryArea / 10) })
          : tr("struct.common.bags_count", { n: Math.ceil(masonryArea / 3) });

      details.push({ label: tr("struct.walls.binder"), value: binderText, unit: "" });

      return {
        totalCost,
        materials: materialsList,
        summary: tr("struct.walls.summary_units", { units: totalUnits, m2: masonryArea.toFixed(0) }),
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
      summary: calculationData.summary || tr("calculator.title_fallback"),
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
            <Mountain size={16} className="mr-1" /> {tr("struct.tabs.groundwork")}
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
            <Warehouse size={16} className="mr-1" /> {tr("struct.tabs.foundations")}
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
            <BrickWall size={16} className="mr-1" /> {tr("struct.tabs.walls")}
          </button>
        </div>
      )}

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
                {tr(`struct.gw.steps.${s}`)}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Mountain size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.gw.step1.hint")}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.common.length_m")}</label>
                  <input
                    type="number"
                    value={dimL}
                    onChange={(e) => setDimL(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.common.width_m")}</label>
                  <input
                    type="number"
                    value={dimW}
                    onChange={(e) => setDimW(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.gw.margin_m")}</label>
                  <input
                    type="number"
                    value={gwMargin}
                    onChange={(e) => setGwMargin(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.gw.strip_depth_m")}</label>
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
                  <span className="text-sm font-medium">{tr("struct.gw.keep_topsoil")}</span>
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
                {tr("common.next")} <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Pickaxe size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.gw.step2.hint")}
              </div>

              <div className="space-y-2">
                {gwDetailedExcavs.map((ex) => (
                  <div key={ex.id} className="bg-white p-2 rounded border flex justify-between items-center">
                    <div>
                      <span className="font-bold text-sm block">{ex.label}</span>
                      <span className="text-xs text-slate-500">
                        {ex.length}×{ex.width}×{ex.depth}m{" "}
                        {ex.slopeRatio && ex.slopeRatio > 0 ? `(${tr("struct.gw.slope")} ${ex.slopeRatio}:1)` : ""}
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
                    <option value="trench">{tr("struct.excav.trench")}</option>
                    <option value="pit">{tr("struct.excav.pit")}</option>
                    <option value="mass">{tr("struct.excav.mass")}</option>
                  </select>

                  <select
                    value={newExSlope}
                    onChange={(e) => setNewExSlope(Number(e.target.value))}
                    className="flex-1 p-2 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value={0}>{tr("struct.gw.slope_0")}</option>
                    <option value={0.5}>{tr("struct.gw.slope_05")}</option>
                    <option value={1}>{tr("struct.gw.slope_1")}</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder={tr("struct.common.L")}
                    value={newExL}
                    onChange={(e) => setNewExL(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={tr("struct.common.W")}
                    value={newExW}
                    onChange={(e) => setNewExW(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={tr("struct.common.D")}
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
                  {tr("common.back")}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.gw.step3.hint")}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">{tr("struct.gw.soil_type")}</label>
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
                  {tr("common.back")}
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Truck size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.gw.step4.hint")}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{tr("struct.gw.earth_mgmt")}</h4>

                <div className="mb-4">
                  <label className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>{tr("struct.gw.reuse_fill")}</span>
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
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.gw.truck_cap")}</label>
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
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{tr("struct.gw.fill_imports")}</h4>

                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.gw.fill_type")}</label>
                    <select
                      value={gwFillType}
                      onChange={(e) => setGwFillType(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="gravel">{tr("struct.gw.fill_gravel")}</option>
                      <option value="sand">{tr("struct.gw.fill_sand")}</option>
                      <option value="soil">{tr("struct.gw.fill_soil_short")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.gw.fill_volume")}</label>
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
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{tr("struct.gw.means")}</h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.gw.digger_days")}</label>
                    <input
                      type="number"
                      value={gwDiggerDays}
                      onChange={(e) => setGwDiggerDays(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.gw.compactor_days")}</label>
                    <input
                      type="number"
                      value={gwCompactorDays}
                      onChange={(e) => setGwCompactorDays(Number(e.target.value))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between mt-3">
                  <span className="text-sm">{tr("struct.gw.difficult_access")}</span>
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
                  {tr("common.back")}
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.gw.step5.hint")}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">{tr("struct.common.unit_prices")}</h4>
                  <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600" type="button">
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? tr("struct.common.pro_mode") : tr("struct.common.simple_mode")}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.gw.price_excav")}</label>
                    <input
                      type="number"
                      value={gwPrices.excavM3}
                      onChange={(e) => setGwPrices({ ...gwPrices, excavM3: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.gw.price_strip")}</label>
                    <input
                      type="number"
                      value={gwPrices.stripM2}
                      onChange={(e) => setGwPrices({ ...gwPrices, stripM2: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.gw.price_truck")}</label>
                    <input
                      type="number"
                      value={gwPrices.truckRotation}
                      onChange={(e) => setGwPrices({ ...gwPrices, truckRotation: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.gw.price_dump")}</label>
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
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">{tr("struct.gw.labor_m3")}</label>
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
                  {tr("common.back")}
                </button>
                <button
                  disabled
                  className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center"
                  type="button"
                >
                  <Check size={18} className="mr-2" /> {tr("struct.common.calculated")}
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
                {tr(`struct.fd.steps.${s}`)}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Warehouse size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.fd.step1.hint")}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.common.house_length")}</label>
                  <input
                    type="number"
                    value={dimL}
                    onChange={(e) => setDimL(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.common.house_width")}</label>
                  <input
                    type="number"
                    value={dimW}
                    onChange={(e) => setDimW(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">{tr("struct.fd.systems")}</h4>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                    <div>
                      <span className="font-bold text-sm block">{tr("struct.fd.strip")}</span>
                      <span className="text-xs text-slate-400">{tr("struct.fd.strip_hint")}</span>
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
                      <span className="font-bold text-sm block">{tr("struct.fd.pads")}</span>
                      <span className="text-xs text-slate-400">{tr("struct.fd.pads_hint")}</span>
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
                      <span className="font-bold text-sm block">{tr("struct.fd.raft")}</span>
                      <span className="text-xs text-slate-400">{tr("struct.fd.raft_hint")}</span>
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
                {tr("common.next")} <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Shovel size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.fd.step2.hint")}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between mb-4">
                  <span className="font-bold text-sm text-slate-700">{tr("struct.fd.count_excav")}</span>
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
                        <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.fd.depth")}</label>
                        <input
                          type="number"
                          value={fdDepth}
                          onChange={(e) => setFdDepth(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.fd.margin")}</label>
                        <input
                          type="number"
                          value={fdTrenchMargin}
                          onChange={(e) => setFdTrenchMargin(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.fd.soil_type")}</label>
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
                      <span className="text-sm text-slate-600">{tr("struct.fd.evac")}</span>
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
                  {tr("common.back")}
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  type="button"
                >
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.fd.step3.hint")}
              </div>

              {fdHasStrip && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                    <Ruler size={14} className="mr-1" /> {tr("struct.fd.strip")}
                  </h4>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] text-slate-400">{tr("struct.common.length_m_short")}</label>
                      <input
                        type="number"
                        value={fdStripL}
                        onChange={(e) => setFdStripL(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">{tr("struct.common.width_m_short")}</label>
                      <input
                        type="number"
                        value={fdStripW}
                        onChange={(e) => setFdStripW(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">{tr("struct.common.height_m_short")}</label>
                      <input
                        type="number"
                        value={fdStripH}
                        onChange={(e) => setFdStripH(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <span className="text-xs font-bold text-slate-600">{tr("struct.fd.rebar")}</span>
                    <select
                      value={fdRebarStripType}
                      onChange={(e) => setFdRebarStripType(e.target.value)}
                      className="text-xs p-1 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="S35">{tr("struct.fd.rebar_s35")}</option>
                      <option value="S15">{tr("struct.fd.rebar_s15")}</option>
                    </select>
                  </div>
                </div>
              )}

              {fdHasPads && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center">
                      <BoxSelect size={14} className="mr-1" /> {tr("struct.fd.pads")}
                    </h4>
                    <button onClick={addPad} className="text-xs text-blue-600 font-bold" type="button">
                      + {tr("common.add")}
                    </button>
                  </div>

                  {fdPads.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 mb-2 text-xs">
                      <input
                        type="number"
                        value={p.count}
                        onChange={(e) => updatePad(p.id, "count", Number(e.target.value))}
                        className="w-10 p-1 border border-slate-300 rounded text-center bg-white text-slate-900"
                        title={tr("struct.common.qty")}
                      />

                      <select
                        value={p.type}
                        onChange={(e) => updatePad(p.id, "type", e.target.value)}
                        className="w-16 p-1 border border-slate-300 rounded bg-white text-slate-900"
                      >
                        <option value="rect">{tr("struct.fd.pad_rect")}</option>
                        <option value="cyl">{tr("struct.fd.pad_cyl")}</option>
                      </select>

                      {p.type === "rect" ? (
                        <>
                          <input
                            type="number"
                            value={p.width}
                            onChange={(e) => updatePad(p.id, "width", Number(e.target.value))}
                            className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                            placeholder={tr("struct.common.w")}
                          />
                          <span>×</span>
                          <input
                            type="number"
                            value={p.length}
                            onChange={(e) => updatePad(p.id, "length", Number(e.target.value))}
                            className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                            placeholder={tr("struct.common.l")}
                          />
                        </>
                      ) : (
                        <input
                          type="number"
                          value={p.diameter || 0}
                          onChange={(e) => updatePad(p.id, "diameter", Number(e.target.value))}
                          className="w-20 p-1 border border-slate-300 rounded bg-white text-slate-900"
                          placeholder={tr("struct.fd.diameter")}
                        />
                      )}

                      <input
                        type="number"
                        value={p.height}
                        onChange={(e) => updatePad(p.id, "height", Number(e.target.value))}
                        className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                        placeholder={tr("struct.common.h")}
                      />

                      <button onClick={() => removePad(p.id)} className="text-red-400" type="button">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {fdPads.length === 0 && <p className="text-xs text-slate-400 italic">{tr("struct.fd.no_pads")}</p>}
                </div>
              )}

              {fdHasRaft && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                    <Square size={14} className="mr-1" /> {tr("struct.fd.raft")}
                  </h4>

                  <div className="flex gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400">{tr("struct.fd.thickness_m")}</label>
                      <input
                        type="number"
                        value={fdRaftThick}
                        onChange={(e) => setFdRaftThick(e.target.value)}
                        className="w-20 p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">{tr("struct.fd.mesh")}</label>
                      <select
                        value={fdRebarRaftType}
                        onChange={(e) => setFdRebarRaftType(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      >
                        <option value="ST25C">{tr("struct.fd.mesh_st25")}</option>
                        <option value="ST10">{tr("struct.fd.mesh_st10")}</option>
                        <option value="ST40C">{tr("struct.fd.mesh_st40")}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between border border-slate-200">
                <span className="text-sm font-medium text-slate-700">{tr("struct.fd.clean_concrete")}</span>
                <input
                  type="checkbox"
                  checked={fdCleanConcrete}
                  onChange={(e) => setFdCleanConcrete(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {tr("common.back")}
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.fd.step4.hint")}
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">{tr("struct.fd.formwork")}</span>
                    <span className="text-xs text-slate-400">{tr("struct.fd.formwork_hint")}</span>
                  </div>
                  <input type="checkbox" checked={fdFormwork} onChange={(e) => setFdFormwork(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">{tr("struct.fd.drain")}</span>
                    <span className="text-xs text-slate-400">{tr("struct.fd.drain_hint")}</span>
                  </div>
                  <input type="checkbox" checked={fdDrain} onChange={(e) => setFdDrain(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">{tr("struct.fd.polyane")}</span>
                    <span className="text-xs text-slate-400">{tr("struct.fd.polyane_hint")}</span>
                  </div>
                  <input type="checkbox" checked={fdPolyane} onChange={(e) => setFdPolyane(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {tr("common.back")}
                </button>
                <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.fd.step5.hint")}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">{tr("struct.common.materials_services")}</h4>
                  <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600" type="button">
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? tr("struct.common.pro_mode") : tr("struct.common.simple_mode")}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.fd.price_concrete")}</label>
                    <input
                      type="number"
                      value={fdPrices.concrete}
                      onChange={(e) => setFdPrices({ ...fdPrices, concrete: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.fd.price_rebar")}</label>
                    <input
                      type="number"
                      value={fdPrices.rebarCage}
                      onChange={(e) => setFdPrices({ ...fdPrices, rebarCage: parseFloat(e.target.value) || 0 })}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  {fdExcavEnabled && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.fd.price_excav")}</label>
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
                      <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.fd.price_formwork")}</label>
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
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">{tr("struct.fd.price_labor_conc")}</label>
                      <input
                        type="number"
                        value={fdPrices.laborM3}
                        onChange={(e) => setFdPrices({ ...fdPrices, laborM3: parseFloat(e.target.value) || 0 })}
                        className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                      />
                    </div>

                    {fdFormwork && (
                      <div>
                        <label className="block text-[10px] text-blue-600 font-bold mb-1">{tr("struct.fd.price_labor_form")}</label>
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
                  {tr("common.back")}
                </button>
                <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center" type="button">
                  <Check size={18} className="mr-2" /> {tr("struct.common.calculated")}
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
                {tr(`struct.w.steps.${s}`)}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Ruler size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.w.step1.hint")}
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setWInputMode("global")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${wInputMode === "global" ? "bg-white shadow" : "text-slate-500"}`}
                  type="button"
                >
                  {tr("struct.w.mode_global")}
                </button>
                <button
                  onClick={() => setWInputMode("segments")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${wInputMode === "segments" ? "bg-white shadow" : "text-slate-500"}`}
                  type="button"
                >
                  {tr("struct.w.mode_segments")}
                </button>
              </div>

              {wInputMode === "global" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.perimeter_total")}</label>
                    <input
                      type="number"
                      value={wPerimeter}
                      onChange={(e) => setWPerimeter(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.height")}</label>
                    <input
                      type="number"
                      value={wHeight}
                      onChange={(e) => setWHeight(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.waste_pct")}</label>
                    <input
                      type="number"
                      value={wWastePct}
                      onChange={(e) => setWWastePct(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>

                  <label className="flex items-center justify-between col-span-2 p-3 bg-white border rounded-lg cursor-pointer">
                    <div>
                      <div className="font-bold text-sm text-slate-700">{tr("struct.w.gables")}</div>
                      <div className="text-xs text-slate-400">{tr("struct.w.gables_hint")}</div>
                    </div>
                    <input type="checkbox" checked={wGables} onChange={(e) => setWGables(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                  </label>

                  {wGables && (
                    <div className="col-span-2 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.gable_h")}</label>
                        <input
                          type="number"
                          value={wGableHeight}
                          onChange={(e) => setWGableHeight(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.gable_count")}</label>
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
                      placeholder={tr("struct.w.seg_name")}
                      value={newSegLabel}
                      onChange={(e) => setNewSegLabel(e.target.value)}
                      className="flex-1 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder={tr("struct.common.L")}
                      value={newSegL}
                      onChange={(e) => setNewSegL(e.target.value)}
                      className="w-16 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder={tr("struct.common.H")}
                      value={newSegH}
                      onChange={(e) => setNewSegH(e.target.value)}
                      className="w-16 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <button onClick={addWallSegment} className="bg-blue-600 text-white p-1.5 rounded" type="button">
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3">
                    <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.waste_pct")}</label>
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
                {tr("common.next")} <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <BrickWall size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.w.step2.hint")}
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
                    {fam === "parpaing" && tr("struct.w.family.parpaing")}
                    {fam === "brique" && tr("struct.w.family.brique")}
                    {fam === "cellulaire" && tr("struct.w.family.cellulaire")}
                    {fam === "stepoc" && tr("struct.w.family.stepoc")}
                  </button>
                ))}
              </div>

              <div className="bg-white p-3 rounded border">
                <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.block_format")}</label>

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
                  {tr("common.back")}
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <LayoutTemplate size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.w.step3.hint")}
              </div>

              <div className="space-y-2">
                {wOpenings.map((op) => (
                  <div key={op.id} className="flex justify-between items-center p-2 bg-white border rounded shadow-sm">
                    <div>
                      <span className="font-bold text-sm block">{op.label || op.type}</span>
                      <span className="text-xs text-slate-500">
                        {op.width}×{op.height}m ({tr("struct.w.reveal")}: {op.revealDepth}cm)
                      </span>
                    </div>
                    <button onClick={() => removeWallOpening(op.id)} className="text-red-400 p-2" type="button">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {wOpenings.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-4 italic">{tr("struct.w.no_openings")}</div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
                <div className="flex gap-2 mb-2">
                  <select
                    value={newWOpType}
                    onChange={(e) => setNewWOpType(e.target.value as any)}
                    className="flex-1 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value="window">{tr("struct.opening.window")}</option>
                    <option value="door">{tr("struct.opening.door")}</option>
                    <option value="bay">{tr("struct.opening.bay")}</option>
                    <option value="garage">{tr("struct.opening.garage")}</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder={tr("struct.common.width")}
                    value={newWOpW}
                    onChange={(e) => setNewWOpW(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={tr("struct.common.height")}
                    value={newWOpH}
                    onChange={(e) => setNewWOpH(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder={tr("struct.w.reveal_cm")}
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
                  <Plus size={14} className="mr-1" /> {tr("struct.w.add_opening")}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {tr("common.back")}
                </button>
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.w.step4.hint")}
              </div>

              <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-bold text-slate-700">{tr("struct.w.chain_h")}</span>
                  <input type="checkbox" checked={wChainageHoriz} onChange={(e) => setWChainageHoriz(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                {wChainageHoriz && (
                  <label className="flex items-center justify-between cursor-pointer pl-4 border-l-2 border-slate-100">
                    <span className="text-xs text-slate-500">{tr("struct.w.chain_inter")}</span>
                    <input type="checkbox" checked={wChainageInter} onChange={(e) => setWChainageInter(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
                  </label>
                )}

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">{tr("struct.w.vert")}</span>
                    <button
                      onClick={autoCalcReinforcements}
                      className="text-[10px] bg-slate-100 px-2 py-1 rounded text-blue-600 font-bold"
                      type="button"
                    >
                      {tr("struct.common.auto")}
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{tr("struct.w.vert_total")}</span>
                    <input
                      type="number"
                      value={wChainageVert}
                      onChange={(e) => setWChainageVert(Number(e.target.value))}
                      className="w-16 p-1 border border-slate-300 rounded text-center bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="border-t pt-3">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{tr("struct.w.lintel_type")}</label>
                  <select
                    value={wLintelType}
                    onChange={(e) => setWLintelType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 text-sm"
                  >
                    <option value="precast">{tr("struct.w.lintel_precast")}</option>
                    <option value="cast">{tr("struct.w.lintel_cast")}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {tr("common.back")}
                </button>
                <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <PaintRoller size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.w.step5.hint")}
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">{tr("struct.w.coating_ext")}</span>
                    <p className="text-[10px] text-slate-400">{tr("struct.w.coating_ext_hint")}</p>
                  </div>
                  <input type="checkbox" checked={wCoatingExt} onChange={(e) => setWCoatingExt(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">{tr("struct.w.coating_int")}</span>
                    <p className="text-[10px] text-slate-400">{tr("struct.w.coating_int_hint")}</p>
                  </div>
                  <input type="checkbox" checked={wCoatingInt} onChange={(e) => setWCoatingInt(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">{tr("struct.w.scaffold")}</span>
                    <p className="text-[10px] text-slate-400">{tr("struct.w.scaffold_hint")}</p>
                  </div>
                  <input type="checkbox" checked={wScaffold} onChange={(e) => setWScaffold(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
                </label>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold" type="button">
                  {tr("common.back")}
                </button>
                <button onClick={() => setStep(6)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold" type="button">
                  {tr("common.next")}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                {tr("struct.w.step6.hint")}
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">{tr("struct.common.materials")}</h4>
                  <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600" type="button">
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? tr("struct.common.pro_mode") : tr("struct.common.simple_mode")}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {tr("struct.w.unit_price_variant")} — {selectedWallSpec.label}
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
                          <p className="text-[11px] text-slate-400 mt-1">{tr("struct.w.unit_price_variant_help")}</p>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {wallBinderKind === "mortier" ? tr("struct.w.mortar_bag") : tr("struct.w.glue_bag")}
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
                    <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.w.lintel_m")}</label>
                    <input
                      type="number"
                      value={wPrices.lintelM}
                      onChange={(e) => updateWPrice("lintelM", e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  {wCoatingExt && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.w.coating_ext_bag")}</label>
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
                      <label className="block text-[10px] text-slate-500 mb-1">{tr("struct.w.scaffold_fixed")}</label>
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
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">{tr("struct.w.labor_m2")}</label>
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
                  {tr("common.back")}
                </button>
                <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center" type="button">
                  <Check size={18} className="mr-2" /> {tr("struct.common.calculated")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StructuralCalculator;