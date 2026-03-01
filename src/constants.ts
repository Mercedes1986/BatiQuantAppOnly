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
const tr = (key: string, fallbackEn: string) => i18next.t(key, { defaultValue: fallbackEn });

/* -------------------------------------------------------
   CALCULATORS
------------------------------------------------------- */

export const CALCULATORS: CalculatorConfig[] = [
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
  TREE_UNIT: 150.0,
};

/* -------------------------------------------------------
   MATERIAL METADATA (i18n-ready) — FULL (matches DEFAULT_PRICES)
------------------------------------------------------- */

const cat = (key: string, fallbackEn: string) => tr(`categories.${key}`, fallbackEn);
const mat = (key: string, fallbackEn: string) => tr(`materials.${key}`, fallbackEn);

export const MATERIAL_METADATA: Record<string, MaterialMetadata> = (() => {
  // Heuristics to avoid empty catalogs when metadata is incomplete.
  // You can still override any entry explicitly in the map below.
  const inferUnit = (key: string): string => {
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
    if (k.includes("_UNIT")) return "€/unit";
    return "€";
  };

  const inferCategoryKey = (key: string): string => {
    const k = key.toUpperCase();

    if (k.includes("PAINT") || k.includes("PRIMER") || k.includes("TAPE") || k.includes("TARP") || k.includes("TOOLS")) return "paint";
    if (k.includes("CEMENT") || k.includes("MORTAR") || k.includes("GLUE_MORTAR") || k.includes("BRICK") || k.includes("BLOCK") || k.includes("LINTEL")) return "masonry";
    if (k.includes("SAND") || k.includes("GRAVEL") || k.includes("BIGBAG") || k.includes("DECOR_GRAVEL")) return "aggregates";
    if (k.includes("TILE") || k.includes("GROUT") || k.includes("SKIRTING") || k.includes("SPACERS") || k.includes("SPEC")) return "tiling";
    if (k.includes("RAGREAGE") || k.includes("LEVELING") || k.includes("PRIMER_FLOOR") || k.includes("PERIPHERAL_BAND") || k.includes("SCREED_MORTAR")) return "leveling";
    if (k.includes("PLACO") || k.includes("RAIL_") || k.includes("MONTANT_") || k.includes("FURRING") || k.includes("HANGER") || k.includes("SCREWS") || k.includes("JOINT_TAPE") || k.includes("COMPOUND") || k == "MAP_BAG_25KG" || k.includes("CORNER_BEAD")) return "drywall";
    if (k.includes("INSULATION")) return "insulation";
    if (k.includes("MESH") || k.includes("REBAR") || k.includes("CHAINAGE") || k.includes("_STEEL") || k == "REBAR_KG") return "reinforcement";
    if (k == "BPE_M3" || k.includes("CONCRETE")) return "concrete";

    if (k.includes("EXCAVATION") || k.includes("EVACUATION") || k.includes("TOPSOIL") || k.includes("TRENCH") || k.includes("BACKFILL")) return "earthworks";
    if (k.includes("DIGGER_DAY") || k.includes("DUMPER_DAY") || k.includes("SKIP_DAY") || k.includes("COMPACTOR_DAY")) return "rental";

    if (k.includes("BITUMEN") || k.includes("DELTA_MS") || k.includes("DRAIN_PIPE") || k.includes("GEOTEXTILE") || k.includes("DPC") || k.includes("POLYANE")) return "waterproofing";
    if (k.includes("ROOF") || k.includes("BATTEN") || k.includes("UNDERLAY") || k.includes("GUTTER") || k.includes("RIDGE") || k.includes("VALLEY")) return "roofing";

    if (k.includes("CABLE") || k.includes("CONDUIT") || k.includes("SOCKET") || k.includes("SWITCH") || k.includes("BREAKER") || k.includes("TRANSFORMER")) return "electricity";
    if (k.includes("PVC_PIPE") || k.includes("PER_PIPE") || k.includes("WATER_PIPE") || k.includes("SEWER_PIPE") || k.includes("MANHOLE")) return "plumbing";

    if (k.includes("FACADE")) return "facade";
    if (k.includes("FORM_") || k.includes("PROP_") || k.includes("TIMBER") || k.includes("FORM_PANEL")) return "formwork";

    if (k.includes("FENCE") || k.includes("BORDER") || k.includes("WALL_COPING")) return "fencing";
    if (k.includes("GATE")) return "gates";
    if (k.includes("POOL")) return "pool";

    if (k.includes("PAVERS") || k.includes("DECK")) return "exterior";

    if (k.includes("LAWN") || k.includes("PLANT_UNIT") || k.includes("SHRUB") || k.includes("HEDGE") || k.includes("TREE") || k.includes("MULCH") || k.includes("COMPOST") || k.includes("FERTILIZER") || k.includes("IRRIGATION")) return "garden";

    return "misc";
  };

  const humanize = (key: string) =>
    key
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\w/g, (m) => m.toUpperCase());

  const base: Record<string, MaterialMetadata> = {};

  // Build metadata for every price key so the catalog is never "empty".
  Object.keys(DEFAULT_PRICES).forEach((key) => {
    const catKey = inferCategoryKey(key);
    base[key] = {
      label: tr(`materials.${key}`, humanize(key)),
      category: tr(`categories.${catKey}`, catKey),
      unit: inferUnit(key),
    };
  });

  // Explicit overrides (keep here if you want custom labels/units)
  base.PAINT_LITER = { label: tr("materials.PAINT_LITER", "Wall paint"), category: tr("categories.paint", "Painting"), unit: "€/L" };
  base.PRIMER_LITER = { label: tr("materials.PRIMER_LITER", "Universal primer"), category: tr("categories.paint", "Painting"), unit: "€/L" };
  base.CEMENT_BAG_35KG = { label: tr("materials.CEMENT_BAG_35KG", "Cement (35kg bag)"), category: tr("categories.masonry", "Masonry"), unit: "€/bag" };
  base.CEMENT_BAG_25KG = { label: tr("materials.CEMENT_BAG_25KG", "Cement (25kg bag)"), category: tr("categories.masonry", "Masonry"), unit: "€/bag" };

  return base;
})();

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

export const STATIC_TIPS: Record<string, string[]> = {
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
};

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
  { id: "soil", label: tr("soil.soil", "Topsoil"), bulkingFactor: 1.25, density: 1.4 },
  { id: "clay", label: tr("soil.clay", "Clay / silt"), bulkingFactor: 1.3, density: 1.7 },
  { id: "sand", label: tr("soil.sand", "Sand"), bulkingFactor: 1.15, density: 1.6 },
  { id: "gravel", label: tr("soil.gravel", "Gravel / stones"), bulkingFactor: 1.1, density: 1.7 },
  { id: "rock", label: tr("soil.rock", "Broken rock"), bulkingFactor: 1.5, density: 2.0 },
  { id: "mixed", label: tr("soil.mixed", "All-in (mixed)"), bulkingFactor: 1.3, density: 1.8 },
];

export const GROUNDWORK_PROJECT_TYPES = [
  { id: "house", label: tr("groundwork.project.house", "Single-family house") },
  { id: "extension", label: tr("groundwork.project.extension", "Extension") },
  { id: "garage", label: tr("groundwork.project.garage", "Garage") },
  { id: "terrace", label: tr("groundwork.project.terrace", "Terrace") },
  { id: "pool", label: tr("groundwork.project.pool", "Swimming pool") },
  { id: "other", label: tr("groundwork.project.other", "Other") },
];

export const FOUNDATION_TYPES: FoundationDef[] = [
  { id: "strip", label: tr("foundations.strip", "Strip footings"), defaultWidth: 0.5, defaultDepth: 0.35 },
  { id: "raft", label: tr("foundations.raft", "Raft foundation (load-bearing slab)"), defaultWidth: 0, defaultDepth: 0.25 },
  { id: "pads", label: tr("foundations.pads", "Pad footings"), defaultWidth: 0.6, defaultDepth: 0.6 },
];

export const REINFORCEMENT_TYPES: ReinforcementDef[] = [
  { id: "S35", label: tr("reinforcement.S35", "Footing cage S35 (15×35) - 6 bars"), type: "cage", unit: Unit.PIECE },
  { id: "S15", label: tr("reinforcement.S15", "Footing cage S15 (15×15) - 4 bars"), type: "cage", unit: Unit.PIECE },
  { id: "L20", label: tr("reinforcement.L20", "Longrine cage 20×20 - 4 bars"), type: "cage", unit: Unit.PIECE },
  { id: "ST25C", label: tr("reinforcement.ST25C", "ST25C mesh (raft)"), type: "mesh", unit: Unit.PANEL },
  { id: "HA10", label: tr("reinforcement.HA10", "Rebar HA10 (reinforcement)"), type: "bar", unit: Unit.BAR },
  { id: "HA12", label: tr("reinforcement.HA12", "Rebar HA12 (reinforcement)"), type: "bar", unit: Unit.BAR },
];