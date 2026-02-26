import React, { useEffect, useMemo, useState } from "react";
import {
  CalculatorType,
  CalculationResult,
  Unit,
  ExcavationItem,
} from "../../../types";
import {
  DEFAULT_PRICES,
  SOIL_PROPERTIES,
  getWallUnitPriceKey,
} from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
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

import {
  WALL_BLOCK_SPECS,
  getWallBlockSpec,
  getSpecsByFamily,
  type WallBlockSpec,
} from "../../data/blockSpecs";

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialPerimeter?: number;
  initialArea?: number;
  initialMode?: "groundwork" | "foundations" | "walls";
  hideTabs?: boolean;
}

// Sub-Types for Foundations
interface Pad {
  id: string;
  count: number;
  width: number;
  length: number;
  height: number;
  type: "rect" | "cyl";
  diameter?: number;
}

// Sub-Types for Walls
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

export const StructuralCalculator: React.FC<Props> = ({
  onCalculate,
  initialPerimeter,
  initialArea,
  initialMode = "groundwork",
  hideTabs = false,
}) => {
  const [mode, setMode] = useState<"groundwork" | "foundations" | "walls">(
    initialMode
  );
  const [step, setStep] = useState<number>(1);
  const [proMode, setProMode] = useState<boolean>(false);

  // Update mode if prop changes
  useEffect(() => {
    setMode(initialMode);
    setStep(1);
  }, [initialMode]);

  // -- Shared Geometry --
  const [dimL, setDimL] = useState<string>("");
  const [dimW, setDimW] = useState<string>("");
  const [perimeter, setPerimeter] = useState<string>(
    initialPerimeter?.toString() || ""
  );
  const [surface, setSurface] = useState<string>(initialArea?.toString() || "");

  // ================= GROUNDWORK STATE =================
  const [gwMargin, setGwMargin] = useState<string>("1.0");
  const [gwStripDepth, setGwStripDepth] = useState<string>("0.20");
  const [gwKeepTopsoil, setGwKeepTopsoil] = useState<boolean>(true);

  const [gwDetailedExcavs, setGwDetailedExcavs] = useState<ExcavationItem[]>([]);
  const [newExType, setNewExType] = useState<"trench" | "pit" | "mass">(
    "trench"
  );
  const [newExL, setNewExL] = useState<string>("");
  const [newExW, setNewExW] = useState<string>("");
  const [newExD, setNewExD] = useState<string>("");
  const [newExSlope, setNewExSlope] = useState<number>(0); // ✅ number (évite types littéraux)

  const [gwSoilType, setGwSoilType] = useState<string>("soil");
  const [gwReuseOnSite, setGwReuseOnSite] = useState<number>(0);
  const [gwTruckCap, setGwTruckCap] = useState<number>(10);
  const [gwDiggerDays, setGwDiggerDays] = useState<number>(1);

  const [gwFillType, setGwFillType] = useState<"gravel" | "sand" | "soil">(
    "gravel"
  );
  const [gwFillVolume, setGwFillVolume] = useState<string>("0");
  const [gwCompactorDays, setGwCompactorDays] = useState<number>(0);

  const [gwDifficultAccess, setGwDifficultAccess] = useState<boolean>(false);

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

const [gwPrices, setGwPrices] = useState<GroundworkPrices>({
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
});

  // ================= FOUNDATIONS STATE =================
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

  const [fdPrices, setFdPrices] = useState({
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
  });

  // ================= WALLS STATE =================
  const [wInputMode, setWInputMode] = useState<"global" | "segments">("global");
  const [wPerimeter, setWPerimeter] = useState<string>(
    initialPerimeter?.toString() || ""
  );
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
  const [newWOpType, setNewWOpType] = useState<
    "window" | "door" | "bay" | "garage"
  >("window");
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

type WallPrices = {
  // ✅ Prix variables par variante (clé -> prix)
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

const [wPrices, setWPrices] = useState<WallPrices>({
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
});

  const updateWPrice = (key: keyof typeof wPrices, val: string) => {
    setWPrices((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const getUnitOverride = (key: string, fallback: number) => {
  const local = wPrices.unitOverrides[key];
  if (local !== undefined) return local;

  const catalog = getUnitPrice(key);
  if (catalog && catalog !== 0) return catalog;

  return fallback;
};

const setUnitOverride = (key: string, val: number) => {
  setWPrices((prev) => ({
    ...prev,
    unitOverrides: { ...prev.unitOverrides, [key]: val },
  }));
};

// ✅ Helper prix : override local > catalogue > fallback
const getPrice = (key: string, fallback: number): number => {
  const local = wPrices.unitOverrides[key];
  if (local !== undefined) return local;

  const catalog = getUnitPrice(key);
  if (catalog && catalog !== 0) return catalog;

  return fallback;
};

  const wallBinderKind = useMemo<"mortier" | "colle">(() => {
    const k = selectedWallSpec.mortarKind;
    if (k === "colle" || k === "mortier") return k;
    if (selectedWallSpec.family === "brique") return "colle";
    if (selectedWallSpec.family === "cellulaire") return "colle";
    return "mortier";
  }, [selectedWallSpec]);

  // --- Helpers ---
  const addEarthExcav = () => {
    const L = parseFloat(newExL) || 0;
    const W = parseFloat(newExW) || 0;
    const D = parseFloat(newExD) || 0;
    if (W === 0 || D === 0) return;

    setGwDetailedExcavs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label:
          newExType === "trench"
            ? "Tranchée"
            : newExType === "pit"
            ? "Fouille"
            : "Pleine Masse",
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

  const removeEarthExcav = (id: string) =>
    setGwDetailedExcavs((prev) => prev.filter((e) => e.id !== id));

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
    setFdPads((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );

  const removePad = (id: string) =>
    setFdPads((prev) => prev.filter((p) => p.id !== id));

  const addWallOpening = () => {
    const w = parseFloat(newWOpW) || 0;
    const h = parseFloat(newWOpH) || 0;
    if (w <= 0 || h <= 0) return;

    const labels: Record<string, string> = {
      window: "Fenêtre",
      door: "Porte",
      bay: "Baie Vitrée",
      garage: "Garage",
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

  const removeWallOpening = (id: string) =>
    setWOpenings((prev) => prev.filter((o) => o.id !== id));

  const addWallSegment = () => {
    const l = parseFloat(newSegL);
    const h = parseFloat(newSegH);
    if (!(l > 0) || !(h > 0)) return;

    setWSegments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: newSegLabel || `Mur ${prev.length + 1}`,
        length: l,
        height: h,
      },
    ]);
    setNewSegL("");
    setNewSegLabel("");
  };

  const removeWallSegment = (id: string) =>
    setWSegments((prev) => prev.filter((s) => s.id !== id));

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

  // --- Auto-calc surface/perimeter ---
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

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    // --- GROUNDWORK ---
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
        L > 0 && W > 0
          ? (L + 2 * margin) * (W + 2 * margin)
          : parseFloat(surface) || 0;

      const stripVolPlace = stripArea * stripDepth;

      const soilProps =
        SOIL_PROPERTIES.find((s) => s.id === gwSoilType) || SOIL_PROPERTIES[0];
      const swellCoef = soilProps.bulkingFactor;
      const stripVolFoison = stripVolPlace * swellCoef;

      const costStrip = stripArea * gwPrices.stripM2;
      totalCost += costStrip;

      materialsList.push({
        id: "strip",
        name: "Décapage Terre Végétale",
        quantity: stripArea,
        unit: Unit.M2,
        unitPrice: gwPrices.stripM2,
        totalPrice: costStrip,
        category: CalculatorType.GROUNDWORK,
        details: `Ép. ${(stripDepth * 100).toFixed(0)}cm - ${stripVolPlace.toFixed(
          1
        )}m³ en place`,
      });

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
          name: "Excavation / Fouilles",
          quantity: parseFloat(excavVolPlace.toFixed(1)),
          unit: Unit.M3,
          unitPrice: gwPrices.excavM3,
          totalPrice: costExcav,
          category: CalculatorType.GROUNDWORK,
          details: `${gwDetailedExcavs.length} ouvrages - Coef ${swellCoef}`,
        });
      }

      let totalVolToManage = stripVolFoison + excavVolFoison;
      let volToReuse = 0;

      if (gwKeepTopsoil) {
        totalVolToManage -= stripVolFoison;
        details.push({
          label: "Terre Végétale Stockée",
          value: stripVolFoison.toFixed(1),
          unit: "m³",
        });
      }

      if (gwReuseOnSite > 0) {
        volToReuse = excavVolFoison * (gwReuseOnSite / 100);
        totalVolToManage -= volToReuse;
        details.push({
          label: "Remblai Réutilisé",
          value: volToReuse.toFixed(1),
          unit: "m³",
        });
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
            name: `Rotation Camion (${gwTruckCap}m³)`,
            quantity: rotations,
            unit: Unit.ROTATION,
            unitPrice: gwPrices.truckRotation,
            totalPrice: costTransport,
            category: CalculatorType.GROUNDWORK,
          },
          {
            id: "dump",
            name: "Mise en Décharge",
            quantity: parseFloat(tonsToDump.toFixed(1)),
            unit: Unit.TON,
            unitPrice: gwPrices.dumpFeeTon,
            totalPrice: costDump,
            category: CalculatorType.GROUNDWORK,
            details: `${volToEvac.toFixed(1)}m³ foisonné`,
          }
        );
      }

      const fillVol = parseFloat(gwFillVolume) || 0;
      if (fillVol > 0) {
        let fillPrice = gwPrices.fillGravelM3;
        let fillLabel = "Grave / Tout-venant";
        if (gwFillType === "sand") {
          fillPrice = gwPrices.fillSandM3;
          fillLabel = "Sable";
        }
        if (gwFillType === "soil") {
          fillPrice = gwPrices.fillSoilM3;
          fillLabel = "Terre Végétale (Apport)";
        }

        const costFill = fillVol * fillPrice;
        totalCost += costFill;

        materialsList.push({
          id: "fill",
          name: `Apport ${fillLabel}`,
          quantity: fillVol,
          unit: Unit.M3,
          unitPrice: fillPrice,
          totalPrice: costFill,
          category: CalculatorType.GROUNDWORK,
        });
      }

      if (gwDiggerDays > 0) {
        const costDigger = gwDiggerDays * gwPrices.diggerDay;
        totalCost += costDigger;
        materialsList.push({
          id: "digger",
          name: "Location Mini-Pelle",
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
          name: "Location Compacteur",
          quantity: gwCompactorDays,
          unit: Unit.DAY,
          unitPrice: gwPrices.compactorDay,
          totalPrice: costComp,
          category: CalculatorType.GROUNDWORK,
        });
      }

      details.push({
        label: "Surface Décapée",
        value: stripArea.toFixed(0),
        unit: "m²",
      });
      details.push({
        label: "Vol. En Place",
        value: (stripVolPlace + excavVolPlace).toFixed(1),
        unit: "m³",
      });
      details.push({
        label: "Vol. Foisonné",
        value: (stripVolFoison + excavVolFoison).toFixed(1),
        unit: "m³",
      });
      details.push({ label: "À Évacuer", value: volToEvac.toFixed(1), unit: "m³" });

      if (gwReuseOnSite > 0 && !gwCompactorDays) {
        warnings.push("Réutilisation de terre en remblai sans compactage prévu ?");
      }

      return {
        totalCost,
        materials: materialsList,
        summary: `${(stripVolPlace + excavVolPlace).toFixed(1)}m³ excavés`,
        details,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    // --- FOUNDATIONS ---
    if (mode === "foundations") {
      const materialsList: any[] = [];
      let totalCost = 0;
      const details: any[] = [];
      const warnings: string[] = [];

      const soilProps =
        SOIL_PROPERTIES.find((s) => s.id === fdSoilId) || SOIL_PROPERTIES[0];
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
          name: "Béton (Semelles filantes)",
          quantity: parseFloat(stripVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.concrete,
          totalPrice: costConc,
          category: CalculatorType.FOUNDATIONS,
        });

        const cages = Math.ceil(L / 6);
        const costRebar = cages * fdPrices.rebarCage;
        totalCost += costRebar;
        materialsList.push({
          id: "fd_strip_rebar",
          name: `Armatures semelles (${fdRebarStripType})`,
          quantity: cages,
          unit: Unit.PIECE,
          unitPrice: fdPrices.rebarCage,
          totalPrice: costRebar,
          category: CalculatorType.FOUNDATIONS,
          details: "~1 cage / 6m",
        });
      }

      if (fdHasPads && fdPads.length) {
        fdPads.forEach((p) => {
          const count = p.count || 0;
          let v = 0;
          if (p.type === "rect") {
            v = (p.width || 0) * (p.length || 0) * (p.height || 0);
          } else {
            const d = p.diameter || 0;
            v = Math.PI * Math.pow(d / 2, 2) * (p.height || 0);
          }
          padsVol += v * count;
        });

        const costPadsConc = padsVol * fdPrices.concrete;
        totalCost += costPadsConc;
        materialsList.push({
          id: "fd_pads_conc",
          name: "Béton (Plots)",
          quantity: parseFloat(padsVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.concrete,
          totalPrice: costPadsConc,
          category: CalculatorType.FOUNDATIONS,
        });
      }

      if (fdHasRaft) {
        raftArea = houseL > 0 && houseW > 0 ? houseL * houseW : 0;
        const t = parseFloat(fdRaftThick) || 0;
        raftVol = raftArea * t;

        const costRaftConc = raftVol * fdPrices.concrete;
        totalCost += costRaftConc;
        materialsList.push({
          id: "fd_raft_conc",
          name: "Béton (Radier)",
          quantity: parseFloat(raftVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.concrete,
          totalPrice: costRaftConc,
          category: CalculatorType.FOUNDATIONS,
        });

        const panelCover = 14.4;
        const meshPanels = raftArea > 0 ? Math.ceil(raftArea / panelCover) : 0;
        const costMesh = meshPanels * fdPrices.meshPanel;
        totalCost += costMesh;
        materialsList.push({
          id: "fd_mesh",
          name: `Treillis soudé (${fdRebarRaftType})`,
          quantity: meshPanels,
          unit: Unit.PIECE,
          unitPrice: fdPrices.meshPanel,
          totalPrice: costMesh,
          category: CalculatorType.FOUNDATIONS,
          details: "~1 panneau / 14.4m²",
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
          name: "Béton de propreté (5cm)",
          quantity: parseFloat(cleanVol.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.cleanConcrete,
          totalPrice: costClean,
          category: CalculatorType.FOUNDATIONS,
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
          name: "Terrassement / Fouilles",
          quantity: parseFloat(excavVolPlace.toFixed(2)),
          unit: Unit.M3,
          unitPrice: fdPrices.excavation,
          totalPrice: costExcav,
          category: CalculatorType.FOUNDATIONS,
          details: `Coef foisonnement x${swellCoef}`,
        });

        if (fdEvac) {
          const excavFoison = excavVolPlace * swellCoef;
          const costEvac = excavFoison * fdPrices.evacuation;
          totalCost += costEvac;
          materialsList.push({
            id: "fd_evac",
            name: "Évacuation terres (foisonné)",
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
          name: "Coffrage (panneaux)",
          quantity: parseFloat(area.toFixed(1)),
          unit: Unit.M2,
          unitPrice: fdPrices.formwork,
          totalPrice: costForm,
          category: CalculatorType.FOUNDATIONS,
        });
      }

      if (fdDrain) {
        const L = parseFloat(fdStripL) || parseFloat(perimeter) || 0;
        const costDrain = L * fdPrices.drainM;
        totalCost += costDrain;
        materialsList.push({
          id: "fd_drain",
          name: "Drain périphérique",
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
          name: "Film polyane",
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
            name: "Main d'œuvre (béton)",
            quantity: parseFloat(volConcrete.toFixed(2)),
            unit: Unit.M3,
            unitPrice: fdPrices.laborM3,
            totalPrice: costMO,
            category: CalculatorType.FOUNDATIONS,
          });
        }
      }

      details.push({ label: "Sol", value: soilProps.label, unit: "" });
      details.push({
        label: "Béton total",
        value: (stripVol + padsVol + raftVol).toFixed(2),
        unit: "m³",
      });

      return {
        totalCost,
        materials: materialsList,
        summary: `${(stripVol + padsVol + raftVol).toFixed(2)}m³ béton`,
        details,
        warnings: warnings.length ? warnings : undefined,
      };
    }

    // --- WALLS ---
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
        grossArea +=
          (gableW * (parseFloat(wGableHeight) || 0) * 0.5) *
          (wGableCount || 0);
      }

      let openArea = 0;
      let revealArea = 0;
      let lintelLen = 0;

      wOpenings.forEach((op) => {
        const q = op.quantity || 1;
        openArea += op.width * op.height * q;
        revealArea += ((op.height * 2 + op.width) * (op.revealDepth / 100)) * q;
        lintelLen += (op.width + 0.4) * q;
      });

      const netArea = Math.max(0, grossArea - openArea);
      const masonryArea = netArea;
      const coatingArea = netArea + revealArea;

      const unitsPerM2 = selectedWallSpec.unitsPerM2;
      const totalUnits = Math.ceil(
        masonryArea * unitsPerM2 * (1 + (wWastePct || 0) / 100)
      );

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

// ✅ IMPORTANT : utilise la règle override > catalogue > fallback
const unitPrice = getPrice(priceKey, fallbackUnit);

      const labelUnit = selectedWallSpec.label;

      const costUnits = totalUnits * unitPrice;
      totalCost += costUnits;
      materialsList.push({
        id: "wall_units",
        name: labelUnit,
        quantity: totalUnits,
        unit: Unit.PIECE,
        unitPrice,
        totalPrice: costUnits,
        category: CalculatorType.WALLS,
      });

      if (selectedWallSpec.family === "stepoc") {
        const fillM3PerM2 = selectedWallSpec.fillM3PerM2 ?? 0.13;
        const volFill = masonryArea * fillM3PerM2;
        const concreteKey = "BPE_M3";
        const concreteUnit = getPrice(concreteKey, Number(DEFAULT_PRICES.BPE_M3));

        const costFill = volFill * concreteUnit;
        totalCost += costFill;

        materialsList.push({
          id: "stepoc_fill",
          name: "Béton remplissage (C25/30)",
          quantity: parseFloat(volFill.toFixed(2)),
          unit: Unit.M3,
          unitPrice: concreteUnit,
          systemKey: concreteKey,
          totalPrice: costFill,
          category: CalculatorType.WALLS,
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
            name: "Mortier Colle (Joint mince)",
            quantity: bagsGlue,
            unit: Unit.BAG,
            unitPrice: glueUnit,
            systemKey: glueKey,
            totalPrice: costGlue,
            category: CalculatorType.WALLS,
            details: "~1 sac / 10m²",
          });
        } else {
          const mortarKey = "MORTAR_BAG_25KG";
          const mortarUnit = getPrice(mortarKey, Number(DEFAULT_PRICES.MORTAR_BAG_25KG));

          const bagsMortar = Math.ceil(masonryArea / 3);
          const costMortar = bagsMortar * mortarUnit;
          totalCost += costMortar;

          materialsList.push({
            id: "wall_mortar",
            name: "Mortier Montage",
            quantity: bagsMortar,
            unit: Unit.BAG,
            unitPrice: mortarUnit,
            systemKey: mortarKey,
            totalPrice: costMortar,
            category: CalculatorType.WALLS,
            details: "~1 sac / 3m²",
          });
        }
      }

      if (lintelLen > 0) {
        const q = Math.ceil(lintelLen);
        const lintelKey = "LINTEL_PRECAST_M";
        const lintelUnit = getPrice(lintelKey, Number(DEFAULT_PRICES.LINTEL_PRECAST_M));

        const costLintel = q * lintelUnit;
        totalCost += costLintel;
        materialsList.push({
          id: "lintels",
          name: `Linteaux ${wLintelType === "precast" ? "Préfa" : "Coffrés"}`,
          quantity: q,
          unit: Unit.METER,
          unitPrice: lintelUnit,
          systemKey: lintelKey,
          totalPrice: costLintel,
          category: CalculatorType.WALLS,
        });
      }

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
          name: "Béton Chaînages (Horiz)",
          quantity: parseFloat(volCh.toFixed(2)),
          unit: Unit.M3,
          unitPrice: concreteUnit,
          systemKey: concreteKey,
          totalPrice: costChConc,
          category: CalculatorType.WALLS,
        });

        const steelKg = lenCh * 2;
        const steelQty = Math.ceil(steelKg);
        const steelKey = "REBAR_KG";
        const steelUnit = getPrice(steelKey, Number(DEFAULT_PRICES.REBAR_KG));

        const costSteel = steelQty * steelUnit;
        totalCost += costSteel;
        materialsList.push({
          id: "chain_steel",
          name: "Aciers Chaînages (Horiz)",
          quantity: steelQty,
          unit: Unit.KG,
          unitPrice: steelUnit,
          systemKey: steelKey,
          totalPrice: costSteel,
          category: CalculatorType.WALLS,
        });
      }

      if (wChainageVert > 0) {
        const H_vert = parseFloat(wHeight) || 2.5;
        const totalH_vert = wChainageVert * H_vert;

        const volVert = totalH_vert * 0.15 * 0.15;
        const costVertConc = volVert * wPrices.concreteM3;
        totalCost += costVertConc;
        materialsList.push({
          id: "vert_conc",
          name: "Béton Raidisseurs (Vert)",
          quantity: parseFloat(volVert.toFixed(2)),
          unit: Unit.M3,
          unitPrice: wPrices.concreteM3,
          totalPrice: costVertConc,
          category: CalculatorType.WALLS,
        });

        const steelVertKg = totalH_vert * 2;
        const steelVertQty = Math.ceil(steelVertKg);
        const costVertSteel = steelVertQty * wPrices.steelKg;
        totalCost += costVertSteel;
        materialsList.push({
          id: "vert_steel",
          name: "Aciers Raidisseurs (Vert)",
          quantity: steelVertQty,
          unit: Unit.KG,
          unitPrice: wPrices.steelKg,
          totalPrice: costVertSteel,
          category: CalculatorType.WALLS,
        });
      }

      if (wCoatingExt) {
        const bagsCoat = Math.ceil(coatingArea / 1.5);
        const coatExtKey = "COATING_EXT_BAG";
        const coatExtUnit = getPrice(coatExtKey, Number(DEFAULT_PRICES.COATING_EXT_BAG));

        const costCoat = bagsCoat * coatExtUnit;
        totalCost += costCoat;
        materialsList.push({
          id: "coat_ext",
          name: "Enduit Façade (Monocouche)",
          quantity: bagsCoat,
          unit: Unit.BAG,
          unitPrice: coatExtUnit,
          systemKey: coatExtKey,
          totalPrice: costCoat,
          category: CalculatorType.WALLS,
        });
      }

      if (wCoatingInt) {
        const bagsPlaster = Math.ceil(coatingArea / 2.5);
        const costPlaster = bagsPlaster * wPrices.coatingIntBag;
        totalCost += costPlaster;
        materialsList.push({
          id: "coat_int",
          name: "Enduit Intérieur / Plâtre",
          quantity: bagsPlaster,
          unit: Unit.BAG,
          unitPrice: wPrices.coatingIntBag,
          totalPrice: costPlaster,
          category: CalculatorType.WALLS,
        });
      }

      if (wScaffold) {
        const costScaf = wPrices.scaffoldFixed;
        totalCost += costScaf;
        materialsList.push({
          id: "scaffold",
          name: "Échafaudage (Forfait)",
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: wPrices.scaffoldFixed,
          totalPrice: costScaf,
          category: CalculatorType.WALLS,
        });
      }

      if (proMode) {
        const costLabor = masonryArea * wPrices.laborM2;
        totalCost += costLabor;
        materialsList.push({
          id: "labor_wall",
          name: "Main d'œuvre Maçonnerie",
          quantity: parseFloat(masonryArea.toFixed(1)),
          unit: Unit.M2,
          unitPrice: wPrices.laborM2,
          totalPrice: costLabor,
          category: CalculatorType.WALLS,
        });
      }

      details.push({
        label: "Surface Brute",
        value: grossArea.toFixed(1),
        unit: "m²",
      });
      details.push({
        label: "Surface Nette",
        value: masonryArea.toFixed(1),
        unit: "m²",
      });
      details.push({ label: "Bloc sélectionné", value: labelUnit, unit: "" });
      details.push({
        label: "Consommation",
        value: unitsPerM2.toFixed(2),
        unit: "u/m²",
      });
      details.push({ label: "Blocs/Éléments", value: totalUnits, unit: "u" });
      details.push({
        label: "Mortier/Colle",
        value:
          selectedWallSpec.family === "stepoc"
            ? "-"
            : wallBinderKind === "colle"
            ? `${Math.ceil(masonryArea / 10)} sacs`
            : `${Math.ceil(masonryArea / 3)} sacs`,
        unit: "",
      });

      return {
        totalCost,
        materials: materialsList,
        summary: `${totalUnits} unités (${masonryArea.toFixed(0)}m²)`,
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

    // GW
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

    // FD
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

    // Walls
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
  ]);

  // Pass results
  useEffect(() => {
    onCalculate({
      summary: calculationData.summary || "Résultat",
      details: calculationData.details || [],
      materials: calculationData.materials || [],
      totalCost: parseFloat((calculationData.totalCost || 0).toFixed(2)),
      warnings: (calculationData as any).warnings,
    });
  }, [calculationData, onCalculate]);

  // --- RENDER ---
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Navigation Tabs */}
      {!hideTabs && (
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => {
              setMode("groundwork");
              setStep(1);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${
              mode === "groundwork"
                ? "bg-white shadow text-blue-600"
                : "text-slate-500"
            }`}
          >
            <Mountain size={16} className="mr-1" /> Terrassement
          </button>

          <button
            onClick={() => {
              setMode("foundations");
              setStep(1);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${
              mode === "foundations"
                ? "bg-white shadow text-blue-600"
                : "text-slate-500"
            }`}
          >
            <Warehouse size={16} className="mr-1" /> Fondations
          </button>

          <button
            onClick={() => {
              setMode("walls");
              setStep(1);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${
              mode === "walls"
                ? "bg-white shadow text-blue-600"
                : "text-slate-500"
            }`}
          >
            <BrickWall size={16} className="mr-1" /> Murs
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
                  step === s
                    ? "bg-white shadow text-blue-600"
                    : "text-slate-400"
                }`}
              >
                {s === 1 && "1. Emprise"}
                {s === 2 && "2. Fouilles"}
                {s === 3 && "3. Terres"}
                {s === 4 && "4. Logist."}
                {s === 5 && "5. Devis"}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Mountain size={16} className="mr-2 shrink-0 mt-0.5" />
                Définissez l'emprise du chantier et le décapage de la terre
                végétale.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Longueur (m)
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
                    Largeur (m)
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
                    Marge Travail (m)
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
                    Ép. Décapage (m)
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
                    Conserver la terre végétale sur site
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
                <Pickaxe size={16} className="mr-2 shrink-0 mt-0.5" />
                Ajoutez les fouilles spécifiques (fondations, réseaux,
                plateforme).
              </div>

              <div className="space-y-2">
                {gwDetailedExcavs.map((ex) => (
                  <div
                    key={ex.id}
                    className="bg-white p-2 rounded border flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-sm block">{ex.label}</span>
                      <span className="text-xs text-slate-500">
                        {ex.length}x{ex.width}x{ex.depth}m{" "}
                        {ex.slopeRatio && ex.slopeRatio > 0
                          ? `(Talus ${ex.slopeRatio}:1)`
                          : ""}
                      </span>
                    </div>
                    <button
                      onClick={() => removeEarthExcav(ex.id)}
                      className="text-red-400"
                    >
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
                    <option value="trench">Tranchée</option>
                    <option value="pit">Fouille isolée</option>
                    <option value="mass">Pleine masse</option>
                  </select>

                  <select
                    value={newExSlope}
                    onChange={(e) => setNewExSlope(Number(e.target.value))}
                    className="flex-1 p-2 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value={0}>Vertical (90°)</option>
                    <option value={0.5}>Talus Raide (2:1)</option>
                    <option value={1}>Talus 45° (1:1)</option>
                  </select>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="L"
                    value={newExL}
                    onChange={(e) => setNewExL(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder="l"
                    value={newExW}
                    onChange={(e) => setNewExW(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder="P"
                    value={newExD}
                    onChange={(e) => setNewExD(e.target.value)}
                    className="p-2 border border-slate-300 rounded text-xs bg-white text-slate-900"
                  />
                  <button
                    onClick={addEarthExcav}
                    className="bg-blue-600 text-white rounded font-bold"
                  >
                    <Plus size={16} className="mx-auto" />
                  </button>
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

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                Nature du sol et foisonnement (augmentation du volume).
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nature du terrain
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

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Truck size={16} className="mr-2 shrink-0 mt-0.5" />
                Gestion des terres et moyens matériels.
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  Gestion des terres
                </h4>

                <div className="mb-4">
                  <label className="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>Réutilisation en remblai</span>
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
                      Capacité Benne (m³)
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
                  Apports & Remblais
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Type d'apport
                    </label>
                    <select
                      value={gwFillType}
                      onChange={(e) => setGwFillType(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="gravel">Grave / Tout-venant</option>
                      <option value="sand">Sable</option>
                      <option value="soil">Terre Végétale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Volume Nécessaire (m³)
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
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  Moyens
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Jours Mini-Pelle
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
                      Jours Compacteur
                    </label>
                    <input
                      type="number"
                      value={gwCompactorDays}
                      onChange={(e) =>
                        setGwCompactorDays(Number(e.target.value))
                      }
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between mt-3">
                  <span className="text-sm">Accès Difficile / Contraintes</span>
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
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                Tarification du terrassement.
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">
                    Prix Unitaires
                  </h4>
                  <button
                    onClick={() => setProMode(!proMode)}
                    className="text-xs flex items-center text-blue-600"
                  >
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? "Mode Pro" : "Mode Simple"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Excavation (€/m³)
                    </label>
                    <input
                      type="number"
                      value={gwPrices.excavM3}
                      onChange={(e) =>
                        setGwPrices({
                          ...gwPrices,
                          excavM3: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Décapage (€/m²)
                    </label>
                    <input
                      type="number"
                      value={gwPrices.stripM2}
                      onChange={(e) =>
                        setGwPrices({
                          ...gwPrices,
                          stripM2: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Retour
                </button>
                <button
                  disabled
                  className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center"
                >
                  <Check size={18} className="mr-2" /> Calculé
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
                  step === s
                    ? "bg-white shadow text-blue-600"
                    : "text-slate-400"
                }`}
              >
                {s === 1 && "1. Type"}
                {s === 2 && "2. Fouilles"}
                {s === 3 && "3. Béton"}
                {s === 4 && "4. Divers"}
                {s === 5 && "5. Devis"}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Warehouse size={16} className="mr-2 shrink-0 mt-0.5" />
                Choisissez le type de fondations et les dimensions globales.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Longueur Maison
                  </label>
                  <input
                    type="number"
                    value={dimL}
                    onChange={(e) => setDimL(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Largeur Maison
                  </label>
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
                  Systèmes Constructifs
                </h4>

                <div className="space-y-2">
                  <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                    <div>
                      <span className="font-bold text-sm block">
                        Semelles Filantes
                      </span>
                      <span className="text-xs text-slate-400">
                        Sous murs porteurs
                      </span>
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
                      <span className="font-bold text-sm block">Plots Isolés</span>
                      <span className="text-xs text-slate-400">Sous poteaux</span>
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
                      <span className="font-bold text-sm block">Radier Général</span>
                      <span className="text-xs text-slate-400">
                        Dalle porteuse intégrale
                      </span>
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
              >
                Suivant <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Shovel size={16} className="mr-2 shrink-0 mt-0.5" />
                Calcul automatique des fouilles en fonction des fondations
                choisies.
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <label className="flex items-center justify-between mb-4">
                  <span className="font-bold text-sm text-slate-700">
                    Compter le terrassement
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
                          Prof. Hors-gel (m)
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
                          Marge travail (m)
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
                        Nature du sol
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
                        Évacuation des terres (Foisonné)
                      </span>
                    </label>
                  </div>
                )}
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

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                Dimensionnement du béton et des armatures.
              </div>

              {fdHasStrip && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                    <Ruler size={14} className="mr-1" /> Semelles Filantes
                  </h4>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <label className="block text-[10px] text-slate-400">
                        Long. (m)
                      </label>
                      <input
                        type="number"
                        value={fdStripL}
                        onChange={(e) => setFdStripL(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">
                        Larg. (m)
                      </label>
                      <input
                        type="number"
                        value={fdStripW}
                        onChange={(e) => setFdStripW(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400">
                        Haut. (m)
                      </label>
                      <input
                        type="number"
                        value={fdStripH}
                        onChange={(e) => setFdStripH(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <span className="text-xs font-bold text-slate-600">
                      Armatures
                    </span>
                    <select
                      value={fdRebarStripType}
                      onChange={(e) => setFdRebarStripType(e.target.value)}
                      className="text-xs p-1 border border-slate-300 rounded bg-white text-slate-900"
                    >
                      <option value="S35">S35 (6 fils)</option>
                      <option value="S15">S15 (4 fils)</option>
                    </select>
                  </div>
                </div>
              )}

              {fdHasPads && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center">
                      <BoxSelect size={14} className="mr-1" /> Plots Isolés
                    </h4>
                    <button
                      onClick={addPad}
                      className="text-xs text-blue-600 font-bold"
                    >
                      + Ajouter
                    </button>
                  </div>

                  {fdPads.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 mb-2 text-xs">
                      <input
                        type="number"
                        value={p.count}
                        onChange={(e) =>
                          updatePad(p.id, "count", Number(e.target.value))
                        }
                        className="w-10 p-1 border border-slate-300 rounded text-center bg-white text-slate-900"
                        title="Qté"
                      />

                      <select
                        value={p.type}
                        onChange={(e) => updatePad(p.id, "type", e.target.value)}
                        className="w-16 p-1 border border-slate-300 rounded bg-white text-slate-900"
                      >
                        <option value="rect">Rect</option>
                        <option value="cyl">Rond</option>
                      </select>

                      {p.type === "rect" ? (
                        <>
                          <input
                            type="number"
                            value={p.width}
                            onChange={(e) =>
                              updatePad(p.id, "width", Number(e.target.value))
                            }
                            className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                            placeholder="l"
                          />
                          <span>x</span>
                          <input
                            type="number"
                            value={p.length}
                            onChange={(e) =>
                              updatePad(p.id, "length", Number(e.target.value))
                            }
                            className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                            placeholder="L"
                          />
                        </>
                      ) : (
                        <input
                          type="number"
                          value={p.diameter || 0}
                          onChange={(e) =>
                            updatePad(p.id, "diameter", Number(e.target.value))
                          }
                          className="w-20 p-1 border border-slate-300 rounded bg-white text-slate-900"
                          placeholder="Diam"
                        />
                      )}

                      <input
                        type="number"
                        value={p.height}
                        onChange={(e) =>
                          updatePad(p.id, "height", Number(e.target.value))
                        }
                        className="w-12 p-1 border border-slate-300 rounded bg-white text-slate-900"
                        placeholder="H"
                      />

                      <button
                        onClick={() => removePad(p.id)}
                        className="text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {fdPads.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Aucun plot.</p>
                  )}
                </div>
              )}

              {fdHasRaft && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center">
                    <Square size={14} className="mr-1" /> Radier
                  </h4>

                  <div className="flex gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400">
                        Épaisseur (m)
                      </label>
                      <input
                        type="number"
                        value={fdRaftThick}
                        onChange={(e) => setFdRaftThick(e.target.value)}
                        className="w-20 p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400">
                        Treillis
                      </label>
                      <select
                        value={fdRebarRaftType}
                        onChange={(e) => setFdRebarRaftType(e.target.value)}
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      >
                        <option value="ST25C">ST25C (Standard)</option>
                        <option value="ST10">ST10 (Léger)</option>
                        <option value="ST40C">ST40C (Lourd)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between border border-slate-200">
                <span className="text-sm font-medium text-slate-700">
                  Béton de propreté (5cm)
                </span>
                <input
                  type="checkbox"
                  checked={fdCleanConcrete}
                  onChange={(e) => setFdCleanConcrete(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
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

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
                Coffrage et protection.
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">Coffrage</span>
                    <span className="text-xs text-slate-400">
                      Si fouilles non-pleine terre
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={fdFormwork}
                    onChange={(e) => setFdFormwork(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">Drain Périphérique</span>
                    <span className="text-xs text-slate-400">Drain + Gravier + Géo</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={fdDrain}
                    onChange={(e) => setFdDrain(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                  <div>
                    <span className="font-bold text-sm block">Polyane</span>
                    <span className="text-xs text-slate-400">Sous radier/dallage</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={fdPolyane}
                    onChange={(e) => setFdPolyane(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                Récapitulatif des prix unitaires.
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">
                    Matériaux & Prestations
                  </h4>
                  <button
                    onClick={() => setProMode(!proMode)}
                    className="text-xs flex items-center text-blue-600"
                  >
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? "Mode Pro" : "Mode Simple"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Béton BPE (€/m³)
                    </label>
                    <input
                      type="number"
                      value={fdPrices.concrete}
                      onChange={(e) =>
                        setFdPrices({
                          ...fdPrices,
                          concrete: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Ferraillage (€/u)
                    </label>
                    <input
                      type="number"
                      value={fdPrices.rebarCage}
                      onChange={(e) =>
                        setFdPrices({
                          ...fdPrices,
                          rebarCage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  {fdExcavEnabled && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Fouilles (€/m³)
                      </label>
                      <input
                        type="number"
                        value={fdPrices.excavation}
                        onChange={(e) =>
                          setFdPrices({
                            ...fdPrices,
                            excavation: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}

                  {fdFormwork && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Coffrage (€/m²)
                      </label>
                      <input
                        type="number"
                        value={fdPrices.formwork}
                        onChange={(e) =>
                          setFdPrices({
                            ...fdPrices,
                            formwork: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}
                </div>

                {proMode && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">
                        MO Béton (€/m³)
                      </label>
                      <input
                        type="number"
                        value={fdPrices.laborM3}
                        onChange={(e) =>
                          setFdPrices({
                            ...fdPrices,
                            laborM3: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                      />
                    </div>

                    {fdFormwork && (
                      <div>
                        <label className="block text-[10px] text-blue-600 font-bold mb-1">
                          MO Coffrage (€/m²)
                        </label>
                        <input
                          type="number"
                          value={fdPrices.laborForm}
                          onChange={(e) =>
                            setFdPrices({
                              ...fdPrices,
                              laborForm: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Retour
                </button>
                <button
                  disabled
                  className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center"
                >
                  <Check size={18} className="mr-2" /> Calculé
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
                  step === s
                    ? "bg-white shadow text-blue-600"
                    : "text-slate-400"
                }`}
              >
                {s === 1 && "1. Plan"}
                {s === 2 && "2. Matériau"}
                {s === 3 && "3. Ouv."}
                {s === 4 && "4. Struct."}
                {s === 5 && "5. Finition"}
                {s === 6 && "6. Devis"}
              </button>
            ))}
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Ruler size={16} className="mr-2 shrink-0 mt-0.5" />
                Dimensions des murs.
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setWInputMode("global")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${
                    wInputMode === "global" ? "bg-white shadow" : "text-slate-500"
                  }`}
                >
                  Global
                </button>
                <button
                  onClick={() => setWInputMode("segments")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${
                    wInputMode === "segments" ? "bg-white shadow" : "text-slate-500"
                  }`}
                >
                  Segments
                </button>
              </div>

              {wInputMode === "global" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Périmètre total (m)
                    </label>
                    <input
                      type="number"
                      value={wPerimeter}
                      onChange={(e) => setWPerimeter(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded bg-white text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Hauteur (m)
                    </label>
                    <input
                      type="number"
                      value={wHeight}
                      onChange={(e) => setWHeight(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-slate-900"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {wSegments.map((s) => (
                    <div
                      key={s.id}
                      className="flex justify-between items-center p-2 bg-white border rounded"
                    >
                      <div className="flex items-center">
                        <AlignLeft size={16} className="mr-2 text-slate-400" />
                        <div>
                          <span className="font-bold text-sm block">{s.label}</span>
                          <span className="text-xs text-slate-500">
                            L: {s.length}m • H: {s.height}m
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeWallSegment(s.id)}
                        className="text-red-400 p-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <div className="bg-slate-50 p-2 rounded border border-blue-100 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nom"
                      value={newSegLabel}
                      onChange={(e) => setNewSegLabel(e.target.value)}
                      className="flex-1 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="L"
                      value={newSegL}
                      onChange={(e) => setNewSegL(e.target.value)}
                      className="w-16 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="H"
                      value={newSegH}
                      onChange={(e) => setNewSegH(e.target.value)}
                      className="w-16 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                    />
                    <button
                      onClick={addWallSegment}
                      className="bg-blue-600 text-white p-1.5 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

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
                <BrickWall size={16} className="mr-2 shrink-0 mt-0.5" />
                Choix du matériau.
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["parpaing", "brique", "cellulaire", "stepoc"] as const).map(
                  (fam) => (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setWWallFamily(fam)}
                      className={`p-2 rounded border text-xs font-medium ${
                        wWallFamily === fam
                          ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {fam === "parpaing" && "Parpaing"}
                      {fam === "brique" && "Brique"}
                      {fam === "cellulaire" && "Béton cellulaire"}
                      {fam === "stepoc" && "Bloc à bancher"}
                    </button>
                  )
                )}
              </div>

              <div className="bg-white p-3 rounded border">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Format / Épaisseur
                </label>

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
                  {/* ✅ évite l'erreur TS si WallBlockSpec n'a pas `description` */}
                  {(selectedWallSpec as any).description ?? ""}{" "}
                  <span className="opacity-70">
                    • {selectedWallSpec.unitsPerM2.toFixed(2)} u/m² •{" "}
                    {selectedWallSpec.thicknessCm}cm
                  </span>
                </p>
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

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <LayoutTemplate size={16} className="mr-2 shrink-0 mt-0.5" />
                Ouvertures.
              </div>

              <div className="space-y-2">
                {wOpenings.map((op) => (
                  <div
                    key={op.id}
                    className="flex justify-between items-center p-2 bg-white border rounded shadow-sm"
                  >
                    <div>
                      <span className="font-bold text-sm block">
                        {op.label || op.type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {op.width}x{op.height}m (Tab: {op.revealDepth}cm)
                      </span>
                    </div>
                    <button
                      onClick={() => removeWallOpening(op.id)}
                      className="text-red-400 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {wOpenings.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-4 italic">
                    Aucune ouverture.
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
                <div className="flex gap-2 mb-2">
                  <select
                    value={newWOpType}
                    onChange={(e) => setNewWOpType(e.target.value as any)}
                    className="flex-1 p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  >
                    <option value="window">Fenêtre</option>
                    <option value="door">Porte</option>
                    <option value="bay">Baie Vitrée</option>
                    <option value="garage">Garage</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="number"
                    placeholder="Larg"
                    value={newWOpW}
                    onChange={(e) => setNewWOpW(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder="Haut"
                    value={newWOpH}
                    onChange={(e) => setNewWOpH(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                  <input
                    type="number"
                    placeholder="Tab (cm)"
                    value={newWOpReveal}
                    onChange={(e) => setNewWOpReveal(e.target.value)}
                    className="p-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900"
                  />
                </div>

                <button
                  onClick={addWallOpening}
                  className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded text-xs flex justify-center items-center"
                >
                  <Plus size={14} className="mr-1" /> Ajouter Ouverture
                </button>
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

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Combine size={16} className="mr-2 shrink-0 mt-0.5" />
                Chaînages et linteaux.
              </div>

              <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-bold text-slate-700">
                    Chaînage Horizontal
                  </span>
                  <input
                    type="checkbox"
                    checked={wChainageHoriz}
                    onChange={(e) => setWChainageHoriz(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>

                {wChainageHoriz && (
                  <label className="flex items-center justify-between cursor-pointer pl-4 border-l-2 border-slate-100">
                    <span className="text-xs text-slate-500">
                      Chaînage Intermédiaire
                    </span>
                    <input
                      type="checkbox"
                      checked={wChainageInter}
                      onChange={(e) => setWChainageInter(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </label>
                )}

                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">
                      Raidisseurs Verticaux
                    </span>
                    <button
                      onClick={autoCalcReinforcements}
                      className="text-[10px] bg-slate-100 px-2 py-1 rounded text-blue-600 font-bold"
                    >
                      Auto
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Nombre total</span>
                    <input
                      type="number"
                      value={wChainageVert}
                      onChange={(e) => setWChainageVert(Number(e.target.value))}
                      className="w-16 p-1 border border-slate-300 rounded text-center bg-white text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <PaintRoller size={16} className="mr-2 shrink-0 mt-0.5" />
                Finitions.
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">
                      Enduit Extérieur
                    </span>
                    <p className="text-[10px] text-slate-400">Monocouche</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={wCoatingExt}
                    onChange={(e) => setWCoatingExt(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">
                      Enduit Intérieur
                    </span>
                    <p className="text-[10px] text-slate-400">Plâtre / enduit</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={wCoatingInt}
                    onChange={(e) => setWCoatingInt(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                  <div>
                    <span className="text-sm font-bold text-slate-700">
                      Échafaudage
                    </span>
                    <p className="text-[10px] text-slate-400">Forfait</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={wScaffold}
                    onChange={(e) => setWScaffold(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
                Prix unitaires murs.
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">
                    Matériaux
                  </h4>
                  <button
                    onClick={() => setProMode(!proMode)}
                    className="text-xs flex items-center text-blue-600"
                  >
                    <Settings size={12} className="mr-1" />{" "}
                    {proMode ? "Mode Pro" : "Mode Simple"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
  Prix unité (€/u) — {selectedWallSpec.label}
</label>
<input
  type="number"
  value={(() => {
    const priceKey =
      getWallUnitPriceKey(selectedWallSpec as any) ??
      (selectedWallSpec.family === "stepoc"
        ? "BLOCK_STEPOC_UNIT"
        : "BLOCK_20_UNIT");

    const fallbackUnit =
      selectedWallSpec.family === "brique"
        ? Number(DEFAULT_PRICES.BRICK_20_UNIT)
        : selectedWallSpec.family === "cellulaire"
        ? Number(DEFAULT_PRICES.CELLULAR_20_UNIT)
        : selectedWallSpec.family === "stepoc"
        ? Number(DEFAULT_PRICES.BLOCK_STEPOC_UNIT)
        : Number(DEFAULT_PRICES.BLOCK_20_UNIT);

    return getUnitOverride(priceKey, fallbackUnit);
  })()}
  onChange={(e) => {
    const priceKey =
      getWallUnitPriceKey(selectedWallSpec as any) ??
      (selectedWallSpec.family === "stepoc"
        ? "BLOCK_STEPOC_UNIT"
        : "BLOCK_20_UNIT");
    setUnitOverride(priceKey, parseFloat(e.target.value) || 0);
  }}
  className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
/>
<p className="text-[11px] text-slate-400 mt-1">
  Ce prix est enregistré pour la variante sélectionnée (épaisseur/famille).
</p>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      {wallBinderKind === "mortier"
                        ? "Mortier (€/sac)"
                        : "Colle (€/sac)"}
                    </label>
                    <input
                      type="number"
                      value={
                        wallBinderKind === "mortier"
                          ? wPrices.mortarBag
                          : wPrices.glueBag
                      }
                      onChange={(e) => {
                        if (wallBinderKind === "mortier")
                          updateWPrice("mortarBag", e.target.value);
                        else updateWPrice("glueBag", e.target.value);
                      }}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">
                      Linteau (€/m)
                    </label>
                    <input
                      type="number"
                      value={wPrices.lintelM}
                      onChange={(e) => updateWPrice("lintelM", e.target.value)}
                      className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                    />
                  </div>

                  {wCoatingExt && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Enduit Façade (€/sac)
                      </label>
                      <input
                        type="number"
                        value={wPrices.coatingExtBag}
                        onChange={(e) =>
                          updateWPrice("coatingExtBag", e.target.value)
                        }
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}

                  {wScaffold && (
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        Échafaudage (Forfait)
                      </label>
                      <input
                        type="number"
                        value={wPrices.scaffoldFixed}
                        onChange={(e) =>
                          updateWPrice("scaffoldFixed", e.target.value)
                        }
                        className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"
                      />
                    </div>
                  )}
                </div>

                {proMode && (
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-blue-600 font-bold mb-1">
                        MO Maçonnerie (€/m²)
                      </label>
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
                <button
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
                >
                  Retour
                </button>
                <button
                  disabled
                  className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center"
                >
                  <Check size={18} className="mr-2" /> Calculé
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};