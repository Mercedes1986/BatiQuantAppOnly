// src/constants.ts
import i18next from "i18next";

import {
  CalculatorType,
  CalculatorConfig,
  SubstrateDef,
  PackagingDef,
  Unit,
  MeshType,
  ConstructionStepId,
  SoilDef,
  FoundationDef,
  ReinforcementDef,
  MaterialMetadata,
} from "./types";

import {
  BrickWall,
  PaintBucket,
  Droplets,
  Warehouse,
  Mountain,
  Square,
  Grid3X3,
  Layers,
  ArrowRightLeft,
  PanelTop,
  Spline,
  Component,
  Home,
  Zap,
  Thermometer,
  BoxSelect,
  Fence,
  PaintRoller,
  TrendingUp,
} from "lucide-react";

/**
 * i18n helper:
 * - defaultValue MUST be EN to avoid French showing in English when keys are missing
 * - adding keys to fr.json / en.json will override these defaults
 */
// i18next can be imported before i18n initialization finishes.
// Ensure we always return a meaningful string (never empty), especially for UI “Pro tips”.
const tr = (key: string, fallbackEn: string) => {
  try {
    const v = i18next.t(key, { defaultValue: fallbackEn });
    if (!v || v === key) return fallbackEn;
    return v;
  } catch {
    return fallbackEn;
  }
};

/* -------------------------------------------------------
   CALCULATORS
------------------------------------------------------- */

// NOTE: Do NOT export translated strings as a static constant.
// If the user switches language after the app has loaded, static strings stay stuck.
// Use a function so names/descriptions are resolved with the current i18next language.
export const getCalculators = (): CalculatorConfig[] => [
  {
    id: CalculatorType.GROUNDWORK,
    name: tr("calculators.groundwork.name", "Groundworks"),
    icon: "Mountain",
    color: "bg-stone-600",
    description: tr("calculators.groundwork.desc", "Excavation, trenches, backfill"),
    imageSrc: "/images/calculators/terrassement.png",
    imageAlt: tr("calculators.groundwork.alt", "Groundworks: excavation, trenches and backfill"),
  },
  {
    id: CalculatorType.FOUNDATIONS,
    name: tr("calculators.foundations.name", "Foundations"),
    icon: "Warehouse",
    color: "bg-stone-700",
    description: tr("calculators.foundations.desc", "Footings, raft, concrete, rebar"),
    imageSrc: "/images/calculators/fondations.png",
    imageAlt: tr("calculators.foundations.alt", "Foundations: footings, raft, concrete and rebar"),
  },
  {
    id: CalculatorType.SUBSTRUCTURE,
    name: tr("calculators.substructure.name", "Substructure"),
    icon: "Component",
    color: "bg-stone-600",
    description: tr("calculators.substructure.desc", "Crawl space, retaining walls, drainage"),
    imageSrc: "/images/calculators/soubassement.png",
    imageAlt: tr("calculators.substructure.alt", "Substructure: crawl space, retaining walls, drainage"),
  },
  {
    id: CalculatorType.CONCRETE,
    name: tr("calculators.concrete.name", "Concrete / Slab"),
    icon: "Layers",
    color: "bg-gray-500",
    description: tr("calculators.concrete.desc", "Slabs, floors, mix ratios"),
    imageSrc: "/images/calculators/beton-dalle.png",
    imageAlt: tr("calculators.concrete.alt", "Concrete and slab: slabs, floors and mix ratios"),
  },
  {
    id: CalculatorType.WALLS,
    name: tr("calculators.walls.name", "Walls"),
    icon: "BrickWall",
    color: "bg-stone-500",
    description: tr("calculators.walls.desc", "Blocks, bricks, lintels"),
    imageSrc: "/images/calculators/murs.png",
    imageAlt: tr("calculators.walls.alt", "Walls: blocks, bricks and lintels"),
  },
  {
    id: CalculatorType.STAIRS,
    name: tr("calculators.stairs.name", "Concrete stairs"),
    icon: "TrendingUp",
    color: "bg-stone-400",
    description: tr("calculators.stairs.desc", "Steps, slab, formwork"),
    imageSrc: "/images/calculators/escalier-beton.png",
    imageAlt: tr("calculators.stairs.alt", "Concrete stairs: steps, slab and formwork"),
  },
  {
    id: CalculatorType.ROOF,
    name: tr("calculators.roof.name", "Roof"),
    icon: "Home",
    color: "bg-orange-600",
    description: tr("calculators.roof.desc", "Framing, tiles, gutters"),
    imageSrc: "/images/calculators/toiture.png",
    imageAlt: tr("calculators.roof.alt", "Roof: framing, tiles and gutters"),
  },
  {
    id: CalculatorType.JOINERY,
    name: tr("calculators.joinery.name", "Joinery"),
    icon: "BoxSelect",
    color: "bg-sky-600",
    description: tr("calculators.joinery.desc", "Windows, doors, shutters"),
    imageSrc: "/images/calculators/menuiseries.png",
    imageAlt: tr("calculators.joinery.alt", "Joinery: windows, doors and shutters"),
  },
  {
    id: CalculatorType.PLACO,
    name: tr("calculators.placo.name", "Drywall / Insulation"),
    icon: "Square",
    color: "bg-indigo-500",
    description: tr("calculators.placo.desc", "Partitions, linings, ceilings"),
    imageSrc: "/images/calculators/placo-isolation.png",
    imageAlt: tr("calculators.placo.alt", "Drywall and insulation: partitions, linings and ceilings"),
  },
  {
    id: CalculatorType.ELECTRICITY,
    name: tr("calculators.electricity.name", "Electrical"),
    icon: "Zap",
    color: "bg-yellow-500",
    description: tr("calculators.electricity.desc", "Cables, conduits, devices"),
    imageSrc: "/images/calculators/electricite.png",
    imageAlt: tr("calculators.electricity.alt", "Electrical: cables, conduits and devices"),
  },
  {
    id: CalculatorType.PLUMBING,
    name: tr("calculators.plumbing.name", "Plumbing"),
    icon: "Droplets",
    color: "bg-cyan-500",
    description: tr("calculators.plumbing.desc", "Pipes, drains, fittings"),
    imageSrc: "/images/calculators/plomberie.png",
    imageAlt: tr("calculators.plumbing.alt", "Plumbing: pipes, drains and fittings"),
  },
  {
    id: CalculatorType.HVAC,
    name: tr("calculators.hvac.name", "Heating / Ventilation"),
    icon: "Thermometer",
    color: "bg-red-500",
    description: tr("calculators.hvac.desc", "Ventilation, radiators, heat pumps"),
    imageSrc: "/images/calculators/chauffage-vmc.png",
    imageAlt: tr("calculators.hvac.alt", "Heating and ventilation: radiators, heat pumps and ventilation"),
  },
  {
    id: CalculatorType.SCREED,
    name: tr("calculators.screed.name", "Screeds"),
    icon: "Layers",
    color: "bg-stone-400",
    description: tr("calculators.screed.desc", "Liquid screed, traditional screed"),
    imageSrc: "/images/calculators/chapes.png",
    imageAlt: tr("calculators.screed.alt", "Screeds: liquid screed and traditional screed"),
  },
  {
    id: CalculatorType.TILES,
    name: tr("calculators.tiles.name", "Tiling"),
    icon: "Grid3X3",
    color: "bg-teal-500",
    description: tr("calculators.tiles.desc", "Floor tiles, wall tiles, adhesive"),
    imageSrc: "/images/calculators/carrelage.png",
    imageAlt: tr("calculators.tiles.alt", "Tiling: floor tiles, wall tiles and adhesive"),
  },
  {
    id: CalculatorType.RAGREAGE,
    name: tr("calculators.leveling.name", "Leveling"),
    icon: "Layers",
    color: "bg-amber-600",
    description: tr("calculators.leveling.desc", "Floor leveling (renovation)"),
    imageSrc: "/images/calculators/ragreage.png",
    imageAlt: tr("calculators.leveling.alt", "Leveling: floor leveling in renovation"),
  },
  {
    id: CalculatorType.PAINT,
    name: tr("calculators.paint.name", "Painting"),
    icon: "PaintBucket",
    color: "bg-blue-500",
    description: tr("calculators.paint.desc", "Walls, ceilings"),
    imageSrc: "/images/calculators/peinture.png",
    imageAlt: tr("calculators.paint.alt", "Painting: walls and ceilings"),
  },
  {
    id: CalculatorType.FACADE,
    name: tr("calculators.facade.name", "Facade"),
    icon: "PaintRoller",
    color: "bg-orange-300",
    description: tr("calculators.facade.desc", "Render, cladding"),
    imageSrc: "/images/calculators/facade.png",
    imageAlt: tr("calculators.facade.alt", "Facade: render and cladding"),
  },
  {
    id: CalculatorType.EXTERIOR,
    name: tr("calculators.exterior.name", "Exteriors"),
    icon: "Fence",
    color: "bg-green-600",
    description: tr("calculators.exterior.desc", "Terrace, fencing, paths"),
    imageSrc: "/images/calculators/exterieurs.png",
    imageAlt: tr("calculators.exterior.alt", "Exteriors: terrace, fencing and paths"),
  },
];

// Backward-compatible alias (some modules might still import CALCULATORS).
// It resolves once at import time and may not react to language changes.
// Prefer getCalculators() everywhere.
export const CALCULATORS: CalculatorConfig[] = getCalculators();

/* -------------------------------------------------------
   CONSTRUCTION STEPS
------------------------------------------------------- */

export const CONSTRUCTION_STEPS = [
  {
    id: "group_go",
    label: tr("steps.groups.go", "Structural work"),
    steps: [
      { id: ConstructionStepId.GROUNDWORK, label: tr("steps.go.groundwork", "Groundworks"), icon: Mountain, calc: CalculatorType.GROUNDWORK },
      { id: ConstructionStepId.FOUNDATIONS, label: tr("steps.go.foundations", "Foundations"), icon: Warehouse, calc: CalculatorType.FOUNDATIONS },
      { id: ConstructionStepId.BASEMENT, label: tr("steps.go.substructure", "Substructure"), icon: Component, calc: CalculatorType.SUBSTRUCTURE },
      { id: ConstructionStepId.SLAB_GROUND, label: tr("steps.go.slab", "Ground floor slab"), icon: Layers, calc: CalculatorType.CONCRETE },
      { id: ConstructionStepId.WALLS, label: tr("steps.go.walls", "Wall construction"), icon: BrickWall, calc: CalculatorType.WALLS },
      { id: ConstructionStepId.STAIRS, label: tr("steps.go.stairs", "Concrete stairs"), icon: TrendingUp, calc: CalculatorType.STAIRS },
      { id: ConstructionStepId.ROOFING, label: tr("steps.go.roofing", "Roof / framing"), icon: Home, calc: CalculatorType.ROOF },
      { id: ConstructionStepId.WINDOWS, label: tr("steps.go.windows", "External joinery"), icon: BoxSelect, calc: CalculatorType.JOINERY },
    ],
  },
  {
    id: "group_so",
    label: tr("steps.groups.so", "Second fix"),
    steps: [
      { id: ConstructionStepId.LINING, label: tr("steps.so.lining", "Wall lining (insulation)"), icon: PanelTop, calc: CalculatorType.PLACO },
      { id: ConstructionStepId.PARTITIONS, label: tr("steps.so.partitions", "Partitions"), icon: ArrowRightLeft, calc: CalculatorType.PLACO },
      { id: ConstructionStepId.CEILINGS, label: tr("steps.so.ceilings", "Ceilings"), icon: Spline, calc: CalculatorType.PLACO },
      { id: ConstructionStepId.ELECTRICITY, label: tr("steps.so.electricity", "Electrical"), icon: Zap, calc: CalculatorType.ELECTRICITY },
      { id: ConstructionStepId.PLUMBING, label: tr("steps.so.plumbing", "Plumbing"), icon: Droplets, calc: CalculatorType.PLUMBING },
      { id: ConstructionStepId.HVAC, label: tr("steps.so.hvac", "Heating / ventilation"), icon: Thermometer, calc: CalculatorType.HVAC },
      { id: ConstructionStepId.SCREED, label: tr("steps.so.screed", "Screed / levelling"), icon: Layers, calc: CalculatorType.SCREED },
    ],
  },
  {
    id: "group_fin",
    label: tr("steps.groups.fin", "Finishes"),
    steps: [
      { id: ConstructionStepId.FLOORING, label: tr("steps.fin.flooring", "Flooring (tiles/wood)"), icon: Grid3X3, calc: CalculatorType.TILES },
      { id: ConstructionStepId.PAINTING, label: tr("steps.fin.painting", "Painting"), icon: PaintBucket, calc: CalculatorType.PAINT },
      { id: ConstructionStepId.FACADE, label: tr("steps.fin.facade", "Facade"), icon: PaintRoller, calc: CalculatorType.FACADE },
      { id: ConstructionStepId.EXTERIOR, label: tr("steps.fin.exterior", "Exteriors"), icon: Fence, calc: CalculatorType.EXTERIOR },
    ],
  },
];

/* -------------------------------------------------------
   DEFAULT PRICES
   (NO i18n here)
------------------------------------------------------- */

export const DEFAULT_PRICES: Record<string, number> = {
  PAINT_LITER: 15,
  PRIMER_LITER: 8,

  CEMENT_BAG_35KG: 11.5,
  CEMENT_BAG_25KG: 8.9,

  SAND_TON: 55,
  GRAVEL_TON: 50,
  SAND_BIGBAG: 65,
  GRAVEL_BIGBAG: 60,

  TILE_M2: 25,
  GLUE_BAG_25KG: 22,
  GROUT_BAG_5KG: 12,
  SKIRTING_METER: 8,
  SPACERS_BOX: 9,

  RAGREAGE_BAG_25KG: 24,
  RAGREAGE_FIBRE_25KG: 35,
  PRIMER_FLOOR_LITER: 12,
  PERIPHERAL_BAND_M: 1.5,
  SCREED_MORTAR_BAG: 6.5,

  PLACO_PLATE_BA13: 9.5,
  PLACO_PLATE_HYDRO: 16.5,
  PLACO_PLATE_FIRE: 18.0,
  RAIL_3M: 4.5,
  MONTANT_3M: 5.5,
  FURRING_3M: 4.0,
  HANGER_BOX_50: 25.0,
  SCREWS_BOX_1000: 15.0,
  JOINT_TAPE_ROLL: 6.0,
  COMPOUND_BAG_25KG: 18.0,
  MAP_BAG_25KG: 12.0,
  INSULATION_M2: 8.0,
  CORNER_BEAD_3M: 6.0,

  // Mesh panels (price per panel)
  MESH_PANEL_ST10: 18,
  MESH_PANEL_ST25: 28,
  MESH_PANEL_ST40: 38,

  REBAR_KG: 1.8,
  CHAINAGE_3M: 12,
  REBAR_CAGE_35_15_6M: 28.0,
  REBAR_CAGE_15_35_6M: 22.0,
  REBAR_CAGE_20_20_6M: 18.0,

  BPE_M3: 130,
  DELIVERY_FEE: 180,
  PUMP_FEE: 350,
  CLEAN_CONCRETE_M3: 110,

  BLOCK_20_PALLET: 90.0,
  BLOCK_20_UNIT: 1.3,
  BLOCK_STEPOC_UNIT: 3.5,
  BRICK_20_UNIT: 2.5,
  CELLULAR_20_UNIT: 4.5,

  BLOCK_10_UNIT: 1.0,
  BLOCK_15_UNIT: 1.15,
  BLOCK_25_UNIT: 1.6,

  BLOCK_STEPOC_15_UNIT: 3.0,
  BLOCK_STEPOC_20_UNIT: 3.5,
  BLOCK_STEPOC_25_UNIT: 4.2,

  BRICK_15_UNIT: 2.2,
  CELLULAR_15_UNIT: 3.8,

  MORTAR_BAG_25KG: 7.5,
  GLUE_MORTAR_BAG_25KG: 15.0,
  LINTEL_PRECAST_M: 25.0,
  COATING_EXT_BAG: 15.0,
  COATING_INT_BAG: 12.0,

  EXCAVATION_M3: 35.0,
  EVACUATION_M3: 25.0,
  TOPSOIL_STRIP_M2: 5.0,
  GRAVEL_FOUNDATION_TON: 45.0,
  GEOTEXTILE_M2: 1.5,
  POLYANE_ROLL_150M2: 60.0,
  FORM_PANEL_M2: 12.0,
  TRENCH_EXCAVATION_M3: 45.0,
  BACKFILL_M3: 30.0,

  DIGGER_DAY: 400.0,
  DUMPER_DAY: 150.0,
  SKIP_DAY: 300.0,
  COMPACTOR_DAY: 80.0,

  BITUMEN_COATING_BUCKET_25KG: 60.0,
  DELTA_MS_ROLL_20M: 60.0,
  DRAIN_PIPE_50M: 70.0,
  GEOTEXTILE_ROLL_50M2: 40.0,

  TILE_ROOF_M2: 25.0,
  BATTEN_M: 0.8,
  UNDERLAY_ROLL_75M2: 80.0,

  CABLE_3G15_100M: 45.0,
  CABLE_3G25_100M: 70.0,
  CONDUIT_ICTA_20_100M: 35.0,
  SOCKET_UNIT: 8.0,
  SWITCH_UNIT: 7.0,
  BREAKER_UNIT: 12.0,
  PER_PIPE_100M: 60.0,
  PVC_PIPE_4M: 8.0,

  FACADE_COATING_BAG: 15.0,

  PROP_UNIT: 25.0,
  TIMBER_M: 3.0,
  FORM_OIL_L: 8.0,

  FENCE_MESH_M: 25.0,
  FENCE_RIGID_M: 45.0,
  FENCE_WOOD_M: 35.0,
  FENCE_POST_UNIT: 15.0,
  BORDER_CONCRETE_M: 5.0,
  WALL_COPING_UNIT: 5.0,

  PAVERS_M2: 25.0,
  WOOD_DECK_M2: 60.0,
  COMPOSITE_DECK_M2: 50.0,

  GATE_UNIT: 1500.0,
  GATE_MOTOR_UNIT: 450.0,
  GATE_INSTALL_UNIT: 400.0,

  POOL_UNIT: 12000.0,
  POOL_INSTALL_UNIT: 2500.0,
  POOL_COPING_ML: 45.0,

  WATER_PIPE_M: 4.0,
  SEWER_PIPE_M: 8.0,
  ELECTRIC_CONDUIT_M: 2.5,
  MANHOLE_UNIT: 60.0,
  GARDEN_LIGHT_UNIT: 45.0,
  TRANSFORMER_UNIT: 80.0,

  TOPSOIL_M3: 40.0,
  COMPOST_M3: 60.0,
  MULCH_M3: 80.0,
  DECOR_GRAVEL_TON: 120.0,

  LAWN_ROLL_M2: 8.0,
  LAWN_SEED_KG: 15.0,
  FERTILIZER_KG: 5.0,

  GARDEN_EDGING_M: 12.0,
  IRRIGATION_DRIP_M: 1.5,
  IRRIGATION_SPRINKLER_UNIT: 15.0,
  IRRIGATION_PROGRAMMER_UNIT: 80.0,

  PLANT_UNIT: 10.0,
  SHRUB_UNIT: 25.0,
  HEDGE_PLANT_UNIT: 12.0,

  FOUNDATION_CONCRETE: 135.0,
  DELIVERY: 120.0,
  TABLEAU_ELECTRIQUE: 350.0,
  INTERRUPTEURS_DIFFERENTIELS: 85.0,
  CHAUFFE_EAU: 450.0,
  GROUPE_SECURITE: 35.0,
  RADIATEURS_EAU: 180.0,
  HYDRAULIQUE: 12.0,
  TRAITEMENT_MOUSSE: 9.0,
  PEINTURE_SILO: 145.0,
  ITE_120_PSE: 18.0,
  BARDAGE_BOIS: 45.0,
  BARDAGE_SUR_TASSEAUX: 12.0,
  COMPRIBAND: 8.5,
  SILICONE: 7.0,
  FOAM: 9.0,
  FIXINGS: 18.0,
  TREE_UNIT: 150.0,
};

/* -------------------------------------------------------
   MATERIAL METADATA (i18n-ready) — FULL (matches DEFAULT_PRICES)
------------------------------------------------------- */

const cat = (key: string, fallbackEn: string) => tr(`categories.${key}`, fallbackEn);
const mat = (key: string, fallbackEn: string) => tr(`materials.${key}`, tr(`materials.${key.toLowerCase()}`, fallbackEn));

export const MATERIAL_METADATA: Record<string, MaterialMetadata> = (() => {
  // IMPORTANT: do NOT call i18n at import time here.
  // This map only provides *fallback* English labels/units.
  // Translations are resolved dynamically in getMaterialMetadata().

  const inferUnitLocal = (key: string): string => {
    const k = key.toUpperCase();
    if (k.includes("_LITER") || k.endsWith("_L")) return "€/L";
    if (k.includes("_M2")) return "€/m²";
    if (k.includes("_M3")) return "€/m³";
    if (k.includes("_TON")) return "€/t";
    if (k.includes("_KG")) return "€/kg";
    if (k.includes("_DAY")) return "€/day";
    if (k.includes("_METER") || k.endsWith("_M")) return "€/m";
    if (k.includes("_ROLL")) return "€/roll";
    if (k.includes("_PANEL")) return "€/panel";
    if (k.includes("_KIT")) return "€/kit";
    if (k.includes("_CART")) return "€/cartridge";
    if (k.includes("_BOX")) return "€/box";
    if (k.includes("_BAG")) return "€/bag";
    if (k.includes("_BUCKET")) return "€/bucket";
    if (k.includes("_PALLET")) return "€/pallet";
    if (k.includes("_UNIT")) return "€/unit";
    return "€";
  };

  const humanize = (key: string) =>
    key
      .toLowerCase()
      .replace(/_/g, " ")
      // FIX: the previous file had a corrupted \b (word boundary)
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const base: Record<string, MaterialMetadata> = {};

  // Build fallback metadata for every price key so the catalog is never empty.
  // Labels are English-ish (humanized keys). Real translations come from fr/en JSON.
  Object.keys(DEFAULT_PRICES).forEach((key) => {
    base[key] = {
      label: humanize(key),
      category: "",
      unit: inferUnitLocal(key),
    };
  });

  // Optional nicer fallbacks (still EN)
  base.PAINT_LITER = { label: "Wall paint", category: "", unit: "€/L" };
  base.PRIMER_LITER = { label: "Universal primer", category: "", unit: "€/L" };
  base.CEMENT_BAG_35KG = { label: "Cement (35kg bag)", category: "", unit: "€/bag" };
  base.CEMENT_BAG_25KG = { label: "Cement (25kg bag)", category: "", unit: "€/bag" };

  return base;
})();

// ---- helpers (used by Materials page) ----
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const humanizeKey = (k: string) =>
  k
    .replace(/_/g, " ")
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(titleCase)
    .join(" ");

const categoryFallbackEn: Record<string, string> = {
  paint: "Painting",
  masonry: "Masonry",
  aggregates: "Aggregates",
  tiling: "Tiling",
  leveling: "Leveling",
  screed: "Screeds",
  drywall: "Drywall",
  insulation: "Insulation",
  reinforcement: "Reinforcement",
  concrete: "Concrete",
  walls: "Walls",
  earthworks: "Earthworks",
  rental: "Rental",
  waterproofing: "Waterproofing",
  roofing: "Roofing",
  electricity: "Electricity",
  plumbing: "Plumbing",
  facade: "Facade",
  formwork: "Formwork",
  fencing: "Fencing",
  exterior: "Exteriors",
  gates: "Gates",
  pool: "Pool",
  networks: "Networks",
  garden: "Garden",
  finishes: "Finishes",
  other: "Other",
};

export const CATEGORY_ORDER: string[] = [
  "aggregates",
  "earthworks",
  "concrete",
  "reinforcement",
  "masonry",
  "walls",
  "formwork",
  "waterproofing",
  "roofing",
  "drywall",
  "insulation",
  "electricity",
  "plumbing",
  "networks",
  "facade",
  "tiling",
  "leveling",
  "screed",
  "paint",
  "exterior",
  "fencing",
  "gates",
  "pool",
  "garden",
  "rental",
  "finishes",
  "other",
];

const inferUnit = (key: string): string => {
  if (/_M3$/.test(key)) return "€/m³";
  if (/_M2$/.test(key)) return "€/m²";
  if (/_TON$/.test(key)) return "€/t";
  if (/_KG$/.test(key)) return "€/kg";
  if (/_LITER$/.test(key) || /_L$/.test(key)) return "€/L";
  if (/_METER$/.test(key) || /_ML$/.test(key) || /_M$/.test(key)) return "€/m";
  if (/_DAY$/.test(key)) return "€/day";
  if (/_ROLL/.test(key)) return "€/roll";
  if (/_PANEL/.test(key)) return "€/panel";
  if (/_KIT/.test(key)) return "€/kit";
  if (/_BOX/.test(key)) return "€/box";
  if (/_BAG/.test(key) || /_SAC/.test(key)) return "€/bag";
  if (/_BUCKET/.test(key)) return "€/bucket";
  if (/_PALLET/.test(key)) return "€/pallet";
  if (/_UNIT$/.test(key) || /_PIECE$/.test(key)) return "€/unit";
  return "€";
};

const inferCategoryKey = (key: string): keyof typeof categoryFallbackEn => {
  const k = key.toUpperCase();

  if (k.includes("PAINT") || k.includes("PRIMER")) return "paint";

  if (k.includes("TILE") || k.includes("GROUT") || k.includes("SPACER") || k.includes("SKIRTING")) return "tiling";

  if (k.includes("RAGREAGE") || k.includes("LEVEL") || k.includes("PERIPHERAL_BAND")) return "leveling";
  if (k.includes("SCREED") || k.includes("CHAPE")) return "screed";

  if (
    k.includes("PLACO") ||
    k.includes("RAIL") ||
    k.includes("MONTANT") ||
    k.includes("FURRING") ||
    k.includes("HANGER") ||
    k.includes("SCREWS") ||
    k.includes("JOINT_TAPE") ||
    k.includes("COMPOUND") ||
    k === "MAP_BAG_25KG"
  )
    return "drywall";
  if (k.includes("INSULATION") || k.includes("ISOL") || k.includes("ITE_120_PSE")) return "insulation";

  if (k.includes("REBAR") || k.includes("MESH") || k.includes("CHAINAGE") || k.includes("STEEL")) return "reinforcement";

  if (k.includes("BPE") || k.includes("CONCRETE") || k.includes("PUMP") || k.includes("DELIVERY")) return "concrete";

  if (k.includes("BLOCK") || k.includes("BRICK") || k.includes("CELLULAR") || k.includes("LINTEL") || k.includes("STEPOC")) return "walls";
  if (k.includes("CEMENT") || k.includes("MORTAR") || k.includes("GLUE_MORTAR")) return "masonry";

  if (k.includes("SAND") || k.includes("GRAVEL") || k.includes("TOPSOIL") || k.includes("COMPOST") || k.includes("MULCH") || k.includes("DECOR_GRAVEL"))
    return "aggregates";
  if (k.includes("EXCAV") || k.includes("EVAC") || k.includes("BACKFILL") || k.includes("TRENCH") || k.includes("STRIP")) return "earthworks";

  if (k.includes("FORM_")) return "formwork";

  if (k.includes("BITUMEN") || k.includes("DELTA_MS") || k.includes("DRAIN") || k.includes("DPC") || k.includes("GEOTEXTILE") || k.includes("POLYANE"))
    return "waterproofing";

  if (k.includes("ROOF") || k.includes("BATTEN") || k.includes("UNDERLAY") || k.includes("GUTTER") || k.includes("TRAITEMENT_MOUSSE")) return "roofing";

  if (
    k.includes("CABLE") ||
    k.includes("CONDUIT") ||
    k.includes("SOCKET") ||
    k.includes("SWITCH") ||
    k.includes("BREAKER") ||
    k.includes("PANEL") ||
    k.includes("TABLEAU_ELECTRIQUE") ||
    k.includes("INTERRUPTEURS_DIFFERENTIELS")
  )
    return "electricity";

  if (
    k.includes("CHAUFFE_EAU") ||
    k.includes("GROUPE_SECURITE") ||
    k.includes("HYDRAULIQUE") ||
    k.includes("PVC_PIPE") ||
    k.includes("PER_PIPE") ||
    k.includes("WATER_PIPE") ||
    k.includes("SEWER_PIPE") ||
    k.includes("RADIATEURS_EAU")
  )
    return "plumbing";
  if (k.includes("MANHOLE") || k.includes("ELECTRIC_CONDUIT")) return "networks";

  if (
    k.includes("FACADE") ||
    k.includes("COATING_EXT") ||
    (k.includes("COATING_") && !k.includes("BITUMEN_COATING")) ||
    k.includes("PEINTURE_SILO") ||
    k.includes("BARDAGE") ||
    k.includes("COMPRIBAND") ||
    k.includes("FIXINGS") ||
    k.includes("SILICONE") ||
    k.includes("FOAM")
  )
    return "facade";

  if (k.includes("FENCE") || k.includes("BORDER") || k.includes("WALL_COPING")) return "fencing";
  if (k.includes("PAVERS") || k.includes("DECK")) return "exterior";
  if (k.includes("GATE")) return "gates";
  if (k.includes("POOL")) return "pool";
  if (
    k.includes("LAWN") ||
    k.includes("PLANT") ||
    k.includes("SHRUB") ||
    k.includes("HEDGE") ||
    k.includes("TREE") ||
    k.includes("FERTILIZER") ||
    k.includes("IRRIGATION") ||
    k.includes("GARDEN")
  )
    return "garden";

  if (k.includes("DIGGER") || k.includes("DUMPER") || k.includes("SKIP") || k.includes("COMPACTOR")) return "rental";

  return "other";
};

/**
 * Safe metadata accessor:
 * - uses explicit MATERIAL_METADATA when present
 * - otherwise infers label/category/unit from the key (prevents everything going to "Other")
 */
export const getMaterialMetadata = (key: string): MaterialMetadata => {
  // IMPORTANT:
  // - The app can switch language at runtime.
  // - Any prebuilt metadata (created at import time) would freeze translations.
  // So we always resolve label/category via i18next at call time.

  const direct = MATERIAL_METADATA[key];

  const cKey = inferCategoryKey(key);
  const category = cat(cKey, categoryFallbackEn[cKey] || "Other");

  // If a custom EN label exists in the metadata map, use it as fallback;
  // otherwise humanize the key. Translation key stays `materials.<KEY>`.
  const labelFallback = direct?.label || humanizeKey(key);
  const label = mat(key, labelFallback);

  // Unit inference is deterministic and language-independent.
  const unit = direct?.unit || inferUnit(key);

  const imageUrl = getMaterialImageUrl(key);

  return { label, category, unit, imageUrl };
};

/* -------------------------------------------------------
   Material images (UI)
------------------------------------------------------- */

// Default: each system material key uses a dedicated image stored at:
//   /public/images/materials/<KEY>.png
// Served as:
//   /images/materials/<KEY>.png
//
// Some keys in DEFAULT_PRICES historically differ from the file names you created.
// Keep keys stable (used in data) but point to the correct image filename.
//
// IMPORTANT:
// - Many calculators push "short ids" in results (ex: "RIDGE", "SILICONE", "FD_MO"...)
// - Here we map those ids to a REAL key that already has an image (a known catalog key)
// - We also resolve transitively (A -> B -> C) so chained mappings always end on a stable real image key.
const MATERIAL_IMAGE_OVERRIDES: Record<string, string> = {
  // Blocks à bancher (file naming)
  BLOCK_STEPOC_UNIT: "STEP_BLOCK_UNIT",
  BLOCK_STEPOC_15_UNIT: "STEP_BLOCK_15_UNIT",
  BLOCK_STEPOC_20_UNIT: "STEP_BLOCK_20_UNIT",
  BLOCK_STEPOC_25_UNIT: "STEP_BLOCK_25_UNIT",

  // Electrical naming
  BREAKER_UNIT: "CIRCUIT_BREAKER_UNIT",

  // Electrical / plumbing / misc naming
  ELECTRIC_CONDUIT_M: "CONDUIT_ELEC_M",
  CONDUIT_ICTA_20_100M: "ICTA_20_100M",

  // Legacy cable keys (support both spellings)
  CABLE_3G1_5_100M: "CABLE_3G15_100M",
  CABLE_3G2_5_100M: "CABLE_3G25_100M",
  CABLE_3G15_100M: "CABLE_3G15_100M",
  CABLE_3G25_100M: "CABLE_3G25_100M",

  OUTLET_UNIT: "SOCKET_UNIT",
  SEWER_PIPE_M: "EVAC_PIPE_M",
  MANHOLE_UNIT: "REGARD_UNIT",

  // Concrete / masonry naming
  CHAINAGE_3M: "CHAINING_3M",
  CORNER_BEAD_3M: "ANGLE_BEAD_3M",
  LINTEL_PRECAST_M: "LINTEL_M",
  GLUE_MORTAR_BAG_25KG: "MORTAR_GLUE_BAG_25KG",

  // Mesh panels naming
  MESH_PANEL_ST10: "MESH_ST10_PANEL",
  MESH_PANEL_ST25: "MESH_ST25_PANEL",
  MESH_PANEL_ST40: "MESH_ST40_PANEL",

  // Reinforcement cages: 15_35 -> 15X35 (file naming)
  REBAR_CAGE_15_35_6M: "REBAR_CAGE_15X35_6M",
  REBAR_CAGE_20_20_6M: "REBAR_CAGE_20X20_6M",
  REBAR_CAGE_35_15_6M: "REBAR_CAGE_35X15_6M",

  // Fence / exterior naming
  FENCE_MESH_M: "GRILLAGE_M",
  FENCE_RIGID_M: "RIGID_MESH_M",
  FENCE_WOOD_M: "WOOD_FENCE_M",
  GARDEN_EDGING_M: "GARDEN_BORDER_M",
  DECOR_GRAVEL_TON: "GRAVEL_DECOR_TON",
  COMPOSITE_DECK_M2: "TERRACE_COMPOSITE_M2",
  WOOD_DECK_M2: "TERRACE_WOOD_M2",

  // Gate naming
  GATE_UNIT: "PORTAL_UNIT",
  GATE_MOTOR_UNIT: "PORTAL_MOTOR_UNIT",
  GATE_INSTALL_UNIT: "PORTAL_INSTALL_UNIT",

  // Plaster / coating naming
  FACADE_PLASTER_BAG_25KG: "FACADE_COATING_BAG",
  EXT_PLASTER_BAG_25KG: "COATING_EXT_BAG",
  INT_PLASTER_BAG_25KG: "COATING_INT_BAG",
  COMPOUND_BAG_25KG: "COATING_INT_BAG",
  PRIMER_COAT_L: "PRIMER_LITER",
  PRIMER_FLOOR_L: "PRIMER_FLOOR_LITER",

  // Flooring / misc naming
  SCREED_MORTAR_BAG_25KG: "SCREED_MORTAR_BAG",
  TOPSOIL_STRIP_M2: "STRIP_TOPSOIL_M2",
  TILE_ROOF_M2: "ROOF_TILES_M2",
  TIMBER_M: "WOOD_M",

  // Earthworks naming
  EXCAVATION_M3: "EXCAVATION_TRENCH_M3",

  // Formwork panels naming
  FORM_PANEL_M2: "FORMWORK_PANEL_M2",

  // Props naming
  PROP_UNIT: "PROPS_UNIT",

  // Transport / concrete fees naming
  PUMP_FEE: "PUMP_FLAT_FEE",
  DELIVERY_FEE: "DELIVERY_FEE",

  // Ready-mix concrete naming
  CONCRETE_READY_M3: "BPE_M3",

  // Cellular concrete naming (legacy -> current)
  AAC_BLOCK_15_UNIT: "CELLULAR_15_UNIT",
  AAC_BLOCK_20_UNIT: "CELLULAR_20_UNIT",

  // Wall coping naming (legacy -> current)
  WALL_CAP_UNIT: "WALL_COPING_UNIT",

  // Underlay naming (legacy -> current)
  UNDERROOF_SCREEN_75M2: "UNDERLAY_ROLL_75M2",
  UNDERROOF_SCREEN_ROLL_75M2: "UNDERLAY_ROLL_75M2",

  // Formwork oil naming
  FORM_OIL_L: "RELEASE_OIL_L",

  // Rental naming (your existing images)
  HANGER_BOX_50: "HANGERS_BOX_50",
  COMPACTOR_DAY: "PLATE_COMPACTOR_DAY",
  DIGGER_DAY: "MINI_EXCAVATOR_DAY",

  // ------------------------------------------------------------------
  // UI material item ids (calculators often use short ids in results)
  // Map them to real catalog/image keys so "Matériaux estimés" shows
  // proper pictures instead of the red missing icon.
  // ------------------------------------------------------------------

  // Generic/common ids
  BAND: "PERIPHERAL_BAND_M",
  STRIP: "PERIPHERAL_BAND_M",

  SAND: "SAND_TON",
  GRAVEL: "GRAVEL_TON",
  CEMENT: "CEMENT_BAG_35KG",

  MESH: "MESH_PANEL_ST25",
  FORMWORK: "FORM_PANEL_M2",

  JOINTS: "JOINT_TAPE_ROLL",
  COMPOUND: "COMPOUND_BAG_25KG",

  COAT_INT: "COATING_INT_BAG",
  COAT_EXT: "COATING_EXT_BAG",

  MEMBRANE: "DELTA_MS_ROLL_20M",
  PIPE_SUPPLY: "WATER_PIPE_M",
  FITTINGS: "PVC_PIPE_4M",

  BLOCKS_SUB: "BLOCK_20_UNIT",
  WALL_UNITS: "BLOCK_20_UNIT",
  WALL_MORTAR: "MORTAR_BAG_25KG",
  WALL_GLUE: "GLUE_MORTAR_BAG_25KG",

  CHAIN_STEEL: "CHAINAGE_3M",
  CHAIN_CONC: "BPE_M3",

  STEPOC_FILL: "BPE_M3",
  VERT_CONC: "BPE_M3",
  VERT_STEEL: "REBAR_KG",

  SMOOTH: "RAGREAGE_BAG_25KG",
  FIBER: "RAGREAGE_FIBRE_25KG",
  FILLER: "COATING_INT_BAG",
  LIGHT_MIX: "BPE_M3",

  // Rentals / earthworks ids (map to existing images, avoid "_missing")
  DUMP: "DUMPER_DAY",
  EXCAV: "EXCAVATION_M3",
  SCAFFOLD: "FORM_PANEL_M2",
  TOOLS: "SCREWS_BOX_1000",
  TARP: "POLYANE_ROLL_150M2",
  CONSUMABLES: "SCREWS_BOX_1000",

  // Foundations ids
  FD_EXCAV: "EXCAVATION_M3",
  FD_EVAC: "EVACUATION_M3",
  FD_CLEAN: "CLEAN_CONCRETE_M3",
  FD_STRIP_CONC: "BPE_M3",
  FD_PADS_CONC: "BPE_M3",
  FD_RAFT_CONC: "BPE_M3",
  FD_FORM: "FORM_PANEL_M2",
  FD_DRAIN: "DRAIN_PIPE_50M",
  FD_POLY: "POLYANE_ROLL_150M2",
  FD_MO: "SCREWS_BOX_1000",

  // Labor ids (map to an existing generic image to avoid the red missing icon)
  LABOR: "SCREWS_BOX_1000",
  LABOR_PIPES: "SCREWS_BOX_1000",
  LABOR_PTS: "SCREWS_BOX_1000",
  LABOR_WALL: "SCREWS_BOX_1000",
  LAB_APP: "SCREWS_BOX_1000",
  LAB_PREP: "SCREWS_BOX_1000",
  LAB_PAINT: "SCREWS_BOX_1000",
  LABOR_SKIRT: "SCREWS_BOX_1000",
  LABOR_SPEC: "SCREWS_BOX_1000",
  LABOR_TILING: "SCREWS_BOX_1000",

  // Misc ids (avoid "_missing")
  GENERATOR: "TRANSFORMER_UNIT",
  HEATER_MISC: "SCREWS_BOX_1000",
  MANIFOLDS: "PVC_PIPE_4M",
  SAFETY_GROUP: "PVC_PIPE_4M",
  SIPHONS: "PVC_PIPE_4M",
  VMC_BOX: "PVC_PIPE_4M",

  POLYANE: "POLYANE_ROLL_150M2",
  BPE: "BPE_M3",
  PUMP: "PUMP_FEE",

  PAINT_WALL: "PAINT_LITER",
  PAINT_CEIL: "PAINT_LITER",
  PAINT_WOOD: "PAINT_LITER",
  PRIMER: "PRIMER_LITER",

  RAILS: "RAIL_3M",
  STUDS: "MONTANT_3M",
  FURRING: "FURRING_3M",
  HANGERS: "HANGER_BOX_50",
  SCREWS: "SCREWS_BOX_1000",
  TAPE: "JOINT_TAPE_ROLL",
  ANGLES: "CORNER_BEAD_3M",
  INSUL: "INSULATION_M2",

  DIGGER: "DIGGER_DAY",
  COMPACTOR: "COMPACTOR_DAY",

  // Roof calculator ids
  COVER: "TILE_ROOF_M2",
  RIDGE: "TILE_ROOF_M2",
  VERGE: "TILE_ROOF_M2",
  HIP: "TILE_ROOF_M2",
  VALLEY: "TILE_ROOF_M2",
  SCREEN: "UNDERLAY_ROLL_75M2",

  // ------------------------------------------------------------------
  // Extra “missing keys” you showed in screenshots: map them to existing images
  // ------------------------------------------------------------------
  ARASE: "BITUMEN_COATING_BUCKET_25KG",
  BITUMEN: "BITUMEN_COATING_BUCKET_25KG",
  COATING: "BITUMEN_COATING_BUCKET_25KG",

  CONCRETE: "BPE_M3",
  CONCRETE_FILL: "BPE_M3",
  CONCRETE_WALL: "BPE_M3",

  COUNTER_BATTEN: "BATTEN_M",

  DELTAMS: "DELTA_MS_ROLL_20M",
  DELTA_PROFILE: "DELTA_MS_ROLL_20M",

  GUTTER: "DRAIN_PIPE_50M",
  DOWNSPOUTS: "DRAIN_PIPE_50M",
  DRAIN_PIPE: "DRAIN_PIPE_50M",

  FORMWORK_LAB: "FORM_PANEL_M2",
  FORMWORK_MAT: "FORM_PANEL_M2",

  GEO_DRAIN: "GEOTEXTILE_M2",
  GLUE: "GLUE_BAG_25KG",
  GRAVEL_DRAIN: "GRAVEL_FOUNDATION_TON",

  GROUT_CEM: "GROUT_BAG_5KG",
  GROUT_EPOXY: "GROUT_BAG_5KG",

  INSULATION: "INSULATION_M2",
  LEVELING: "RAGREAGE_BAG_25KG",
  MANHOLE: "MANHOLE_UNIT",
  MORTAR: "MORTAR_BAG_25KG",

  PROPS: "PROP_UNIT",
  RAILING: "RAIL_3M",

  SKIRTING: "SKIRTING_METER",
  STEEL: "REBAR_KG",

  TILES: "TILE_M2",
  TILING: "TILE_M2",

  VAPOR: "POLYANE_ROLL_150M2",

  SPEC: "SCREWS_BOX_1000",
};

const resolveMaterialImageKey = (key: string): string => {
  // Some legacy / UI ids map to other legacy keys (which themselves map to real filenames).
  // Resolve transitively until we reach a stable key.
  let k = String(key || "").toUpperCase().trim();
  const seen = new Set<string>();
  while (MATERIAL_IMAGE_OVERRIDES[k] && !seen.has(k)) {
    seen.add(k);
    k = MATERIAL_IMAGE_OVERRIDES[k];
  }
  return k;
};

export const getMaterialImageUrl = (key: string): string => {
  const imgKey = resolveMaterialImageKey(key);
  // Support hosting under a sub-path (e.g. /app/) via Vite's BASE_URL.
  const base = (import.meta as any)?.env?.BASE_URL || "/";
  return `${base}images/materials/${imgKey}.png`;
};

/* -------------------------------------------------------
   Helper: map block spec -> price key (SAFE)
------------------------------------------------------- */

export type WallFamily = "parpaing" | "brique" | "cellulaire" | "stepoc";
export type WallBlockSpecLite = { family: WallFamily; thicknessCm: number };

export function getWallUnitPriceKey(spec: WallBlockSpecLite): string {
  const t = Math.round(spec.thicknessCm);

  if (spec.family === "parpaing") {
    if (t === 10) return "BLOCK_10_UNIT";
    if (t === 15) return "BLOCK_15_UNIT";
    if (t === 20) return "BLOCK_20_UNIT";
    if (t === 25) return "BLOCK_25_UNIT";
    return "BLOCK_20_UNIT";
  }

  if (spec.family === "stepoc") {
    if (t === 15) return "BLOCK_STEPOC_15_UNIT";
    if (t === 20) return "BLOCK_STEPOC_20_UNIT";
    if (t === 25) return "BLOCK_STEPOC_25_UNIT";
    return "BLOCK_STEPOC_UNIT";
  }

  if (spec.family === "brique") {
    if (t === 15) return "BRICK_15_UNIT";
    return "BRICK_20_UNIT";
  }

  if (spec.family === "cellulaire") {
    if (t === 15) return "CELLULAR_15_UNIT";
    return "CELLULAR_20_UNIT";
  }

  return "BLOCK_20_UNIT";
}

/* -------------------------------------------------------
   STATIC_TIPS (i18n-ready)
------------------------------------------------------- */

export const getStaticTips = (): Record<string, string[]> => ({
  [CalculatorType.PAINT]: [
    tr("tips.paint.1", "Always apply a primer on bare surfaces (drywall, plaster) to reduce absorption."),
    tr("tips.paint.2", "Cross-coat (horizontal then vertical) to avoid streaks."),
    tr("tips.paint.3", "Avoid painting above 25°C (too fast drying) or below 10°C."),
  ],
  [CalculatorType.CONCRETE]: [
    tr("tips.concrete.1", "Respect water dosage: too much water weakens concrete (shrinkage, cracks)."),
    tr("tips.concrete.2", "For a driveable slab, aim for 12–15cm thickness + ST25C mesh."),
    tr("tips.concrete.3", "Lift the mesh with spacers so it sits in the concrete, not on the ground."),
    tr("tips.concrete.4", "Plan expansion joints every 15–20m² to prevent cracking."),
  ],
  [CalculatorType.FOUNDATIONS]: [
    tr("tips.foundations.1", "Double-check frost depth and soil conditions before sizing footings."),
    tr("tips.foundations.2", "Keep reinforcement properly covered (concrete cover) to avoid corrosion."),
    tr("tips.foundations.3", "Plan access for the mixer truck/pump early (turning radius, hose path)."),
  ],
  [CalculatorType.SUBSTRUCTURE]: [
    tr("tips.substructure.1", "Waterproofing should go on a clean, dry surface — and protect it with a drainage membrane."),
    tr("tips.substructure.2", "Always include weep points/manholes for perimeter drains to allow inspection."),
    tr("tips.substructure.3", "On shuttering blocks, calculate fill concrete separately — it depends on the block type."),
  ],
  [CalculatorType.WALLS]: [
    tr("tips.walls.1", "Check bond pattern and keep joints consistent to reduce waste and improve alignment."),
    tr("tips.walls.2", "Don’t forget lintel bearings and horizontal ring beams where required."),
  ],
  [CalculatorType.PLACO]: [
    tr("tips.placo.1", "Stagger board joints and keep screws ~30cm apart for standard drywall."),
    tr("tips.placo.2", "Add acoustic tape under tracks to reduce sound bridges (partitions)."),
  ],
  [CalculatorType.ELECTRICITY]: [
    tr("tips.elec.1", "Group circuits by use and keep dedicated lines for major appliances."),
    tr("tips.elec.2", "Plan routes before cutting: shorter runs reduce cable, conduit and labor."),
  ],
  [CalculatorType.PLUMBING]: [
    tr("tips.plumbing.1", "Prefer a manifold layout when maintenance access is easy — it simplifies balancing."),
    tr("tips.plumbing.2", "Keep proper slopes on drains and avoid too many tight bends."),
  ],
  [CalculatorType.ROOF]: [
    tr("tips.roof.1", "Verify minimum slopes required for your roofing material (tiles, zinc, membranes)."),
    tr("tips.roof.2", "Add waste for cuts around valleys, hips and penetrations."),
  ],
  [CalculatorType.SCREED]: [
    tr("tips.screed.1", "Respect curing and drying times before laying floor finishes."),
    tr("tips.screed.2", "Use edge strip to reduce cracking and improve acoustics."),
  ],
  [CalculatorType.RAGREAGE]: [
    tr("tips.leveling.1", "Primer is key — it improves adhesion and reduces bubbles on porous substrates."),
    tr("tips.leveling.2", "For thick applications, consider fiber or mesh depending on the substrate."),
  ],
  [CalculatorType.TILES]: [
    tr("tips.tiles.1", "Dry-lay a few tiles first to validate layout and minimize small edge cuts."),
    tr("tips.tiles.2", "Use the right trowel size: larger tiles require more adhesive and often back-buttering."),
  ],
  [CalculatorType.FACADE]: [
    tr("tips.facade.1", "Check substrate compatibility between render and paint systems (vapor permeability)."),
    tr("tips.facade.2", "Plan scaffolding early — it often drives a big share of the cost."),
  ],
  [CalculatorType.EXTERIOR]: [
    tr("tips.exterior.1", "Compact in layers: most outdoor failures come from insufficient base preparation."),
    tr("tips.exterior.2", "Add drainage considerations (slope away from buildings, permeable layers)."),
  ],
});

// Backward-compatible alias (same limitation as CALCULATORS).
export const STATIC_TIPS: Record<string, string[]> = getStaticTips();

/* -------------------------------------------------------
   OTHER CONSTANTS (i18n-ready)
------------------------------------------------------- */

export const PAINT_SUBSTRATES: SubstrateDef[] = [
  { id: "smooth", label: tr("paint.substrates.smooth", "Smooth / previously painted"), absorptionFactor: 1.0 },
  { id: "placo", label: tr("paint.substrates.placo", "Drywall (standard)"), absorptionFactor: 1.1 },
  { id: "plaster", label: tr("paint.substrates.plaster", "Plaster / skim coat"), absorptionFactor: 1.25 },
  { id: "concrete", label: tr("paint.substrates.concrete", "Raw concrete"), absorptionFactor: 1.15 },
  { id: "wood", label: tr("paint.substrates.wood", "Wood"), absorptionFactor: 1.2 },
];

export const PAINT_PACKAGING: PackagingDef[] = [
  { size: 10, unit: Unit.LITER, label: tr("packaging.paint.10l", "10L can") },
  { size: 5, unit: Unit.LITER, label: tr("packaging.paint.5l", "5L can") },
  { size: 2.5, unit: Unit.LITER, label: tr("packaging.paint.2_5l", "2.5L can") },
  { size: 1, unit: Unit.LITER, label: tr("packaging.paint.1l", "1L can") },
];

export const CONCRETE_PACKAGING: PackagingDef[] = [
  { size: 25, unit: Unit.KG, label: tr("packaging.concrete.25kg", "25kg bag") },
  { size: 35, unit: Unit.KG, label: tr("packaging.concrete.35kg", "35kg bag") },
  { size: 1000, unit: Unit.KG, label: tr("packaging.concrete.1t", "1T big bag") },
];

export const TILE_PATTERNS = [
  { id: "straight", label: tr("tiles.patterns.straight", "Straight lay"), waste: 7 },
  { id: "staggered", label: tr("tiles.patterns.staggered", "Staggered lay (1/2, 1/3)"), waste: 11 },
  { id: "diagonal", label: tr("tiles.patterns.diagonal", "Diagonal lay"), waste: 16 },
];

export const GLUE_COMB_SPECS = [
  { size: 6, consumption: 2.5 },
  { size: 8, consumption: 3.5 },
  { size: 10, consumption: 5.0 },
];

export const LEVELING_SUBSTRATES = [
  { id: "concrete", label: tr("leveling.substrates.concrete", "Concrete / cement screed"), primerRequired: true, primerConsumption: 0.15 },
  {
    id: "tile",
    label: tr("leveling.substrates.tile", "Existing tiles (non-porous)"),
    primerRequired: true,
    primerConsumption: 0.1,
    warning: tr("leveling.warnings.tile", "A dedicated bonding primer is required"),
  },
  {
    id: "wood",
    label: tr("leveling.substrates.wood", "Wood / OSB / parquet"),
    primerRequired: true,
    primerConsumption: 0.2,
    recommendFibre: true,
    warning: tr("leveling.warnings.wood", "Fibre-reinforced leveling compound is required on wood"),
  },
  {
    id: "anhydrite",
    label: tr("leveling.substrates.anhydrite", "Anhydrite screed"),
    primerRequired: true,
    primerConsumption: 0.15,
    warning: tr("leveling.warnings.anhydrite", "Sanding + specific primer required"),
  },
];

export const LEVELING_PRODUCTS = [
  { id: "standard", label: tr("leveling.products.standard", "Standard self-levelling (P3)"), density: 1.6, minThick: 3, maxThick: 10, priceRef: "RAGREAGE_BAG_25KG" },
  { id: "fibre", label: tr("leveling.products.fibre", "Fibre-reinforced (renovation/wood)"), density: 1.7, minThick: 3, maxThick: 30, priceRef: "RAGREAGE_FIBRE_25KG" },
  { id: "thicks", label: tr("leveling.products.thicks", "High-build / patching"), density: 1.8, minThick: 10, maxThick: 50, priceRef: "RAGREAGE_BAG_25KG" },
  { id: "exterior", label: tr("leveling.products.exterior", "Exterior"), density: 1.8, minThick: 3, maxThick: 20, priceRef: "RAGREAGE_BAG_25KG" },
];

export const PLACO_BOARD_TYPES = [
  { id: "BA13", label: tr("placo.boards.ba13", "BA13 standard"), width: 1.2, height: 2.5, area: 3.0, priceRef: "PLACO_PLATE_BA13" },
  { id: "HYDRO", label: tr("placo.boards.hydro", "Moisture resistant (H1)"), width: 1.2, height: 2.5, area: 3.0, priceRef: "PLACO_PLATE_HYDRO" },
  { id: "FIRE", label: tr("placo.boards.fire", "Fire-rated / acoustic"), width: 1.2, height: 2.5, area: 3.0, priceRef: "PLACO_PLATE_FIRE" },
];

export const PLACO_PROFILES = [
  { id: "M48", label: tr("placo.profiles.m48", "Stud M48 / Track R48 (standard)") },
  { id: "M70", label: tr("placo.profiles.m70", "Stud M70 / Track R70 (enhanced insulation)") },
  { id: "M90", label: tr("placo.profiles.m90", "Stud M90 (large volumes)") },
];

export const PLACO_INSULATION_TYPES = [
  { id: "GR32", label: tr("placo.insulation.gr32", "Glass wool (GR32) - roll") },
  { id: "ROCK", label: tr("placo.insulation.rock", "Rock wool - panel") },
  { id: "PSE", label: tr("placo.insulation.pse", "Expanded polystyrene (EPS)") },
  { id: "XPS", label: tr("placo.insulation.xps", "Extruded polystyrene (XPS)") },
  { id: "WOOD", label: tr("placo.insulation.wood", "Wood fiber") },
  { id: "BIO", label: tr("placo.insulation.bio", "Hemp / recycled cotton") },
];

export const OPENING_PRESETS = {
  DOORS: [
    { label: tr("openings.doors.63", "Door 63 cm"), width: 0.63, height: 2.04 },
    { label: tr("openings.doors.73", "Door 73 cm (standard)"), width: 0.73, height: 2.04 },
    { label: tr("openings.doors.83", "Door 83 cm (accessible)"), width: 0.83, height: 2.04 },
    { label: tr("openings.doors.93", "Door 93 cm"), width: 0.93, height: 2.04 },
    { label: tr("openings.doors.140", "Double door 140 cm"), width: 1.4, height: 2.04 },
  ],
  WINDOWS: [
    { label: tr("openings.windows.60x60", "Window 60×60"), width: 0.6, height: 0.6 },
    { label: tr("openings.windows.75x60", "Window 75×60"), width: 0.75, height: 0.6 },
    { label: tr("openings.windows.100x115", "Window 100×115"), width: 1.0, height: 1.15 },
    { label: tr("openings.windows.120x115", "Window 120×115"), width: 1.2, height: 1.15 },
    { label: tr("openings.windows.120x125", "Window 120×125"), width: 1.2, height: 1.25 },
    { label: tr("openings.windows.120x215", "French door 120×215"), width: 1.2, height: 2.15 },
    { label: tr("openings.windows.215x240", "Sliding bay 215×240"), width: 2.4, height: 2.15 },
  ],
} as const;

/**
 * Mesh:
 * - coverM2 = covered area by 1 panel
 * - priceRef = DEFAULT_PRICES key (price per panel)
 */
export const MESH_TYPES: (MeshType & { width: number; height: number })[] = [
  {
    id: "ST10",
    label: tr("mesh.ST10", "ST10 (light - terrace)"),
    weightKgM2: 1.23,
    width: 2.4,
    height: 3.6,
    coverM2: 2.4 * 3.6,
    priceRef: "MESH_PANEL_ST10",
  },
  {
    id: "ST25C",
    label: tr("mesh.ST25C", "ST25C (standard - slab)"),
    weightKgM2: 2.58,
    width: 2.4,
    height: 3.6,
    coverM2: 2.4 * 3.6,
    priceRef: "MESH_PANEL_ST25",
  },
  {
    id: "ST40C",
    label: tr("mesh.ST40C", "ST40C (heavy - structural)"),
    weightKgM2: 3.8,
    width: 2.4,
    height: 3.6,
    coverM2: 2.4 * 3.6,
    priceRef: "MESH_PANEL_ST40",
  },
];

export const REBAR_WEIGHTS: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  14: 1.21,
  16: 1.58,
};

export const CONCRETE_MIX_RATIOS: Record<number, { sand: number; gravel: number; water: number }> = {
  250: { sand: 800, gravel: 1050, water: 160 },
  300: { sand: 750, gravel: 1100, water: 170 },
  350: { sand: 720, gravel: 1150, water: 175 },
  400: { sand: 680, gravel: 1180, water: 180 },
};

export const SOIL_PROPERTIES: SoilDef[] = [
  // IMPORTANT: keep labels reactive to language changes.
  // Using getters prevents strings from being frozen at module import time.
  { id: "soil", get label() { return tr("soil.soil", "Topsoil"); }, bulkingFactor: 1.25, density: 1.4 },
  { id: "clay", get label() { return tr("soil.clay", "Clay / silt"); }, bulkingFactor: 1.3, density: 1.7 },
  { id: "sand", get label() { return tr("soil.sand", "Sand"); }, bulkingFactor: 1.15, density: 1.6 },
  { id: "gravel", get label() { return tr("soil.gravel", "Gravel / stones"); }, bulkingFactor: 1.1, density: 1.7 },
  { id: "rock", get label() { return tr("soil.rock", "Broken rock"); }, bulkingFactor: 1.5, density: 2.0 },
  { id: "mixed", get label() { return tr("soil.mixed", "All-in (mixed)"); }, bulkingFactor: 1.3, density: 1.8 },
];

export const GROUNDWORK_PROJECT_TYPES = [
  { id: "house", get label() { return tr("groundwork.project.house", "Single-family house"); } },
  { id: "extension", get label() { return tr("groundwork.project.extension", "Extension"); } },
  { id: "garage", get label() { return tr("groundwork.project.garage", "Garage"); } },
  { id: "terrace", get label() { return tr("groundwork.project.terrace", "Terrace"); } },
  { id: "pool", get label() { return tr("groundwork.project.pool", "Swimming pool"); } },
  { id: "other", get label() { return tr("groundwork.project.other", "Other"); } },
];

export const FOUNDATION_TYPES: FoundationDef[] = [
  { id: "strip", get label() { return tr("foundations.strip", "Strip footings"); }, defaultWidth: 0.5, defaultDepth: 0.35 },
  { id: "raft", get label() { return tr("foundations.raft", "Raft foundation (load-bearing slab)"); }, defaultWidth: 0, defaultDepth: 0.25 },
  { id: "pads", get label() { return tr("foundations.pads", "Pad footings"); }, defaultWidth: 0.6, defaultDepth: 0.6 },
];

export const REINFORCEMENT_TYPES: ReinforcementDef[] = [
  { id: "S35", get label() { return tr("reinforcement.S35", "Footing cage S35 (15×35) - 6 bars"); }, type: "cage", unit: Unit.PIECE },
  { id: "S15", get label() { return tr("reinforcement.S15", "Footing cage S15 (15×15) - 4 bars"); }, type: "cage", unit: Unit.PIECE },
  { id: "L20", get label() { return tr("reinforcement.L20", "Longrine cage 20×20 - 4 bars"); }, type: "cage", unit: Unit.PIECE },
  { id: "ST25C", get label() { return tr("reinforcement.ST25C", "ST25C mesh (raft)"); }, type: "mesh", unit: Unit.PANEL },
  { id: "HA10", get label() { return tr("reinforcement.HA10", "Rebar HA10 (reinforcement)"); }, type: "bar", unit: Unit.BAR },
  { id: "HA12", get label() { return tr("reinforcement.HA12", "Rebar HA12 (reinforcement)"); }, type: "bar", unit: Unit.BAR },
];