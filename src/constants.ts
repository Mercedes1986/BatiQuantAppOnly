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

export const MATERIAL_METADATA: Record<string, MaterialMetadata> = {
  // Paint
  PAINT_LITER: { label: mat("PAINT_LITER", "Wall paint"), category: cat("paint", "Painting"), unit: "€/L" },
  PRIMER_LITER: { label: mat("PRIMER_LITER", "Universal primer"), category: cat("paint", "Painting"), unit: "€/L" },

  // Masonry / Aggregates
  CEMENT_BAG_35KG: { label: mat("CEMENT_BAG_35KG", "Cement (35kg bag)"), category: cat("masonry", "Masonry"), unit: "€/bag" },
  CEMENT_BAG_25KG: { label: mat("CEMENT_BAG_25KG", "Cement (25kg bag)"), category: cat("masonry", "Masonry"), unit: "€/bag" },

  SAND_TON: { label: mat("SAND_TON", "Sand (ton)"), category: cat("aggregates", "Aggregates"), unit: "€/t" },
  GRAVEL_TON: { label: mat("GRAVEL_TON", "Gravel (ton)"), category: cat("aggregates", "Aggregates"), unit: "€/t" },
  SAND_BIGBAG: { label: mat("SAND_BIGBAG", "Sand (big bag ~1T)"), category: cat("aggregates", "Aggregates"), unit: "€/bigbag" },
  GRAVEL_BIGBAG: { label: mat("GRAVEL_BIGBAG", "Gravel (big bag ~1T)"), category: cat("aggregates", "Aggregates"), unit: "€/bigbag" },

  // Tiling
  TILE_M2: { label: mat("TILE_M2", "Tiles (m²)"), category: cat("tiling", "Tiling"), unit: "€/m²" },
  GLUE_BAG_25KG: { label: mat("GLUE_BAG_25KG", "Tile adhesive (25kg bag)"), category: cat("tiling", "Tiling"), unit: "€/bag" },
  GROUT_BAG_5KG: { label: mat("GROUT_BAG_5KG", "Grout (5kg bag)"), category: cat("tiling", "Tiling"), unit: "€/bag" },
  SKIRTING_METER: { label: mat("SKIRTING_METER", "Skirting board (meter)"), category: cat("tiling", "Tiling"), unit: "€/m" },
  SPACERS_BOX: { label: mat("SPACERS_BOX", "Tile spacers (box)"), category: cat("tiling", "Tiling"), unit: "€/box" },

  // Leveling / Screed
  RAGREAGE_BAG_25KG: { label: mat("RAGREAGE_BAG_25KG", "Leveling compound (25kg bag)"), category: cat("leveling", "Leveling"), unit: "€/bag" },
  RAGREAGE_FIBRE_25KG: { label: mat("RAGREAGE_FIBRE_25KG", "Fibre leveling compound (25kg bag)"), category: cat("leveling", "Leveling"), unit: "€/bag" },
  PRIMER_FLOOR_LITER: { label: mat("PRIMER_FLOOR_LITER", "Floor primer (L)"), category: cat("leveling", "Leveling"), unit: "€/L" },
  PERIPHERAL_BAND_M: { label: mat("PERIPHERAL_BAND_M", "Perimeter band (m)"), category: cat("leveling", "Leveling"), unit: "€/m" },
  SCREED_MORTAR_BAG: { label: mat("SCREED_MORTAR_BAG", "Screed mortar (bag)"), category: cat("screed", "Screeds"), unit: "€/bag" },

  // Drywall / Placo
  PLACO_PLATE_BA13: { label: mat("PLACO_PLATE_BA13", "Drywall board BA13"), category: cat("drywall", "Drywall"), unit: "€/board" },
  PLACO_PLATE_HYDRO: { label: mat("PLACO_PLATE_HYDRO", "Moisture resistant board (H1)"), category: cat("drywall", "Drywall"), unit: "€/board" },
  PLACO_PLATE_FIRE: { label: mat("PLACO_PLATE_FIRE", "Fire-rated / acoustic board"), category: cat("drywall", "Drywall"), unit: "€/board" },
  RAIL_3M: { label: mat("RAIL_3M", "Track rail (3m)"), category: cat("drywall", "Drywall"), unit: "€/pc" },
  MONTANT_3M: { label: mat("MONTANT_3M", "Stud (3m)"), category: cat("drywall", "Drywall"), unit: "€/pc" },
  FURRING_3M: { label: mat("FURRING_3M", "Furring channel (3m)"), category: cat("drywall", "Drywall"), unit: "€/pc" },
  HANGER_BOX_50: { label: mat("HANGER_BOX_50", "Hangers (box of 50)"), category: cat("drywall", "Drywall"), unit: "€/box" },
  SCREWS_BOX_1000: { label: mat("SCREWS_BOX_1000", "Drywall screws (box of 1000)"), category: cat("drywall", "Drywall"), unit: "€/box" },
  JOINT_TAPE_ROLL: { label: mat("JOINT_TAPE_ROLL", "Joint tape (roll)"), category: cat("drywall", "Drywall"), unit: "€/roll" },
  COMPOUND_BAG_25KG: { label: mat("COMPOUND_BAG_25KG", "Joint compound (25kg bag)"), category: cat("drywall", "Drywall"), unit: "€/bag" },
  MAP_BAG_25KG: { label: mat("MAP_BAG_25KG", "Plaster adhesive MAP (25kg bag)"), category: cat("drywall", "Drywall"), unit: "€/bag" },
  INSULATION_M2: { label: mat("INSULATION_M2", "Insulation (m²)"), category: cat("insulation", "Insulation"), unit: "€/m²" },
  CORNER_BEAD_3M: { label: mat("CORNER_BEAD_3M", "Corner bead (3m)"), category: cat("drywall", "Drywall"), unit: "€/pc" },

  // Reinforcement
  MESH_PANEL_ST10: { label: mat("MESH_PANEL_ST10", "Welded mesh panel ST10"), category: cat("reinforcement", "Reinforcement"), unit: "€/panel" },
  MESH_PANEL_ST25: { label: mat("MESH_PANEL_ST25", "Welded mesh panel ST25C"), category: cat("reinforcement", "Reinforcement"), unit: "€/panel" },
  MESH_PANEL_ST40: { label: mat("MESH_PANEL_ST40", "Welded mesh panel ST40C"), category: cat("reinforcement", "Reinforcement"), unit: "€/panel" },

  REBAR_KG: { label: mat("REBAR_KG", "Rebar (kg)"), category: cat("reinforcement", "Reinforcement"), unit: "€/kg" },
  CHAINAGE_3M: { label: mat("CHAINAGE_3M", "Ring beam steel (3m)"), category: cat("reinforcement", "Reinforcement"), unit: "€/pc" },
  REBAR_CAGE_35_15_6M: { label: mat("REBAR_CAGE_35_15_6M", "Footing cage 35×15 (6m)"), category: cat("reinforcement", "Reinforcement"), unit: "€/pc" },
  REBAR_CAGE_15_35_6M: { label: mat("REBAR_CAGE_15_35_6M", "Footing cage 15×35 (6m)"), category: cat("reinforcement", "Reinforcement"), unit: "€/pc" },
  REBAR_CAGE_20_20_6M: { label: mat("REBAR_CAGE_20_20_6M", "Grade beam cage 20×20 (6m)"), category: cat("reinforcement", "Reinforcement"), unit: "€/pc" },

  // Concrete / BPE
  BPE_M3: { label: mat("BPE_M3", "Ready-mix concrete (m³)"), category: cat("concrete", "Concrete"), unit: "€/m³" },
  DELIVERY_FEE: { label: mat("DELIVERY_FEE", "Delivery fee"), category: cat("concrete", "Concrete"), unit: "€" },
  PUMP_FEE: { label: mat("PUMP_FEE", "Concrete pump fee"), category: cat("concrete", "Concrete"), unit: "€" },
  CLEAN_CONCRETE_M3: { label: mat("CLEAN_CONCRETE_M3", "Blinding concrete (m³)"), category: cat("concrete", "Concrete"), unit: "€/m³" },

  // Walls / Blocks
  BLOCK_20_PALLET: { label: mat("BLOCK_20_PALLET", "Concrete blocks 20cm (pallet)"), category: cat("walls", "Walls"), unit: "€/pallet" },
  BLOCK_20_UNIT: { label: mat("BLOCK_20_UNIT", "Concrete block 20cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  BLOCK_STEPOC_UNIT: { label: mat("BLOCK_STEPOC_UNIT", "Shuttering block (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  BRICK_20_UNIT: { label: mat("BRICK_20_UNIT", "Brick 20cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  CELLULAR_20_UNIT: { label: mat("CELLULAR_20_UNIT", "AAC block 20cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },

  BLOCK_10_UNIT: { label: mat("BLOCK_10_UNIT", "Concrete block 10cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  BLOCK_15_UNIT: { label: mat("BLOCK_15_UNIT", "Concrete block 15cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  BLOCK_25_UNIT: { label: mat("BLOCK_25_UNIT", "Concrete block 25cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },

  BLOCK_STEPOC_15_UNIT: { label: mat("BLOCK_STEPOC_15_UNIT", "Shuttering block 15cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  BLOCK_STEPOC_20_UNIT: { label: mat("BLOCK_STEPOC_20_UNIT", "Shuttering block 20cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  BLOCK_STEPOC_25_UNIT: { label: mat("BLOCK_STEPOC_25_UNIT", "Shuttering block 25cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },

  BRICK_15_UNIT: { label: mat("BRICK_15_UNIT", "Brick 15cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },
  CELLULAR_15_UNIT: { label: mat("CELLULAR_15_UNIT", "AAC block 15cm (unit)"), category: cat("walls", "Walls"), unit: "€/unit" },

  MORTAR_BAG_25KG: { label: mat("MORTAR_BAG_25KG", "Masonry mortar (25kg bag)"), category: cat("masonry", "Masonry"), unit: "€/bag" },
  GLUE_MORTAR_BAG_25KG: { label: mat("GLUE_MORTAR_BAG_25KG", "Thin-bed adhesive mortar (25kg bag)"), category: cat("masonry", "Masonry"), unit: "€/bag" },
  LINTEL_PRECAST_M: { label: mat("LINTEL_PRECAST_M", "Precast lintel (meter)"), category: cat("walls", "Walls"), unit: "€/m" },
  COATING_EXT_BAG: { label: mat("COATING_EXT_BAG", "Exterior render (bag)"), category: cat("facade", "Facade"), unit: "€/bag" },
  COATING_INT_BAG: { label: mat("COATING_INT_BAG", "Interior plaster/render (bag)"), category: cat("finishes", "Finishes"), unit: "€/bag" },

  // Earthworks
  EXCAVATION_M3: { label: mat("EXCAVATION_M3", "Excavation (m³)"), category: cat("earthworks", "Earthworks"), unit: "€/m³" },
  EVACUATION_M3: { label: mat("EVACUATION_M3", "Spoil disposal (m³)"), category: cat("earthworks", "Earthworks"), unit: "€/m³" },
  TOPSOIL_STRIP_M2: { label: mat("TOPSOIL_STRIP_M2", "Topsoil stripping (m²)"), category: cat("earthworks", "Earthworks"), unit: "€/m²" },
  GRAVEL_FOUNDATION_TON: { label: mat("GRAVEL_FOUNDATION_TON", "Foundation gravel (ton)"), category: cat("earthworks", "Earthworks"), unit: "€/t" },
  GEOTEXTILE_M2: { label: mat("GEOTEXTILE_M2", "Geotextile (m²)"), category: cat("earthworks", "Earthworks"), unit: "€/m²" },
  POLYANE_ROLL_150M2: { label: mat("POLYANE_ROLL_150M2", "Polythene roll (~150m²)"), category: cat("earthworks", "Earthworks"), unit: "€/roll" },
  FORM_PANEL_M2: { label: mat("FORM_PANEL_M2", "Formwork panels (m²)"), category: cat("formwork", "Formwork"), unit: "€/m²" },
  TRENCH_EXCAVATION_M3: { label: mat("TRENCH_EXCAVATION_M3", "Trench excavation (m³)"), category: cat("earthworks", "Earthworks"), unit: "€/m³" },
  BACKFILL_M3: { label: mat("BACKFILL_M3", "Backfill / imported fill (m³)"), category: cat("earthworks", "Earthworks"), unit: "€/m³" },

  // Equipment / Rental
  DIGGER_DAY: { label: mat("DIGGER_DAY", "Mini excavator (day)"), category: cat("rental", "Rental"), unit: "€/day" },
  DUMPER_DAY: { label: mat("DUMPER_DAY", "Dumper (day)"), category: cat("rental", "Rental"), unit: "€/day" },
  SKIP_DAY: { label: mat("SKIP_DAY", "Skip / dumpster (day)"), category: cat("rental", "Rental"), unit: "€/day" },
  COMPACTOR_DAY: { label: mat("COMPACTOR_DAY", "Compactor (day)"), category: cat("rental", "Rental"), unit: "€/day" },

  // Waterproofing / Substructure
  BITUMEN_COATING_BUCKET_25KG: { label: mat("BITUMEN_COATING_BUCKET_25KG", "Bitumen coating (25kg bucket)"), category: cat("waterproofing", "Waterproofing"), unit: "€/bucket" },
  DELTA_MS_ROLL_20M: { label: mat("DELTA_MS_ROLL_20M", "Delta MS membrane (roll)"), category: cat("waterproofing", "Waterproofing"), unit: "€/roll" },
  DRAIN_PIPE_50M: { label: mat("DRAIN_PIPE_50M", "Drain pipe (50m roll)"), category: cat("waterproofing", "Waterproofing"), unit: "€/roll" },
  GEOTEXTILE_ROLL_50M2: { label: mat("GEOTEXTILE_ROLL_50M2", "Geotextile (50m² roll)"), category: cat("waterproofing", "Waterproofing"), unit: "€/roll" },

  // Roofing
  TILE_ROOF_M2: { label: mat("TILE_ROOF_M2", "Roof tiles (m²)"), category: cat("roofing", "Roofing"), unit: "€/m²" },
  BATTEN_M: { label: mat("BATTEN_M", "Batten (meter)"), category: cat("roofing", "Roofing"), unit: "€/m" },
  UNDERLAY_ROLL_75M2: { label: mat("UNDERLAY_ROLL_75M2", "Roof underlay (75m² roll)"), category: cat("roofing", "Roofing"), unit: "€/roll" },

  // Electricity
  CABLE_3G15_100M: { label: mat("CABLE_3G15_100M", "Cable 3G1.5 (100m)"), category: cat("electricity", "Electrical"), unit: "€/roll" },
  CABLE_3G25_100M: { label: mat("CABLE_3G25_100M", "Cable 3G2.5 (100m)"), category: cat("electricity", "Electrical"), unit: "€/roll" },
  CONDUIT_ICTA_20_100M: { label: mat("CONDUIT_ICTA_20_100M", "Conduit ICTA 20 (100m)"), category: cat("electricity", "Electrical"), unit: "€/roll" },
  SOCKET_UNIT: { label: mat("SOCKET_UNIT", "Socket outlet (unit)"), category: cat("electricity", "Electrical"), unit: "€/unit" },
  SWITCH_UNIT: { label: mat("SWITCH_UNIT", "Switch (unit)"), category: cat("electricity", "Electrical"), unit: "€/unit" },
  BREAKER_UNIT: { label: mat("BREAKER_UNIT", "Circuit breaker (unit)"), category: cat("electricity", "Electrical"), unit: "€/unit" },

  // Plumbing
  PER_PIPE_100M: { label: mat("PER_PIPE_100M", "PEX/PER pipe (100m)"), category: cat("plumbing", "Plumbing"), unit: "€/roll" },
  PVC_PIPE_4M: { label: mat("PVC_PIPE_4M", "PVC pipe (4m)"), category: cat("plumbing", "Plumbing"), unit: "€/pc" },

  // Facade
  FACADE_COATING_BAG: { label: mat("FACADE_COATING_BAG", "Facade render (bag)"), category: cat("facade", "Facade"), unit: "€/bag" },

  // Formwork / concrete accessories
  PROP_UNIT: { label: mat("PROP_UNIT", "Shoring prop (unit)"), category: cat("formwork", "Formwork"), unit: "€/unit" },
  TIMBER_M: { label: mat("TIMBER_M", "Timber (meter)"), category: cat("formwork", "Formwork"), unit: "€/m" },
  FORM_OIL_L: { label: mat("FORM_OIL_L", "Formwork oil (L)"), category: cat("formwork", "Formwork"), unit: "€/L" },

  // Fencing / exterior
  FENCE_MESH_M: { label: mat("FENCE_MESH_M", "Chain-link fence (meter)"), category: cat("fencing", "Fencing"), unit: "€/m" },
  FENCE_RIGID_M: { label: mat("FENCE_RIGID_M", "Rigid panel fence (meter)"), category: cat("fencing", "Fencing"), unit: "€/m" },
  FENCE_WOOD_M: { label: mat("FENCE_WOOD_M", "Wood fence (meter)"), category: cat("fencing", "Fencing"), unit: "€/m" },
  FENCE_POST_UNIT: { label: mat("FENCE_POST_UNIT", "Fence post (unit)"), category: cat("fencing", "Fencing"), unit: "€/unit" },
  BORDER_CONCRETE_M: { label: mat("BORDER_CONCRETE_M", "Concrete edging (meter)"), category: cat("exterior", "Exteriors"), unit: "€/m" },
  WALL_COPING_UNIT: { label: mat("WALL_COPING_UNIT", "Wall coping (unit)"), category: cat("exterior", "Exteriors"), unit: "€/unit" },

  // Terraces / decking
  PAVERS_M2: { label: mat("PAVERS_M2", "Pavers (m²)"), category: cat("exterior", "Exteriors"), unit: "€/m²" },
  WOOD_DECK_M2: { label: mat("WOOD_DECK_M2", "Wood deck (m²)"), category: cat("exterior", "Exteriors"), unit: "€/m²" },
  COMPOSITE_DECK_M2: { label: mat("COMPOSITE_DECK_M2", "Composite deck (m²)"), category: cat("exterior", "Exteriors"), unit: "€/m²" },

  // Gates
  GATE_UNIT: { label: mat("GATE_UNIT", "Gate (unit)"), category: cat("gates", "Gates"), unit: "€/unit" },
  GATE_MOTOR_UNIT: { label: mat("GATE_MOTOR_UNIT", "Gate motor (unit)"), category: cat("gates", "Gates"), unit: "€/unit" },
  GATE_INSTALL_UNIT: { label: mat("GATE_INSTALL_UNIT", "Gate installation (unit)"), category: cat("gates", "Gates"), unit: "€/unit" },

  // Pool
  POOL_UNIT: { label: mat("POOL_UNIT", "Swimming pool (unit)"), category: cat("pool", "Pool"), unit: "€/unit" },
  POOL_INSTALL_UNIT: { label: mat("POOL_INSTALL_UNIT", "Pool installation (unit)"), category: cat("pool", "Pool"), unit: "€/unit" },
  POOL_COPING_ML: { label: mat("POOL_COPING_ML", "Pool coping (linear meter)"), category: cat("pool", "Pool"), unit: "€/m" },

  // Networks / garden utilities
  WATER_PIPE_M: { label: mat("WATER_PIPE_M", "Water pipe (meter)"), category: cat("networks", "Networks"), unit: "€/m" },
  SEWER_PIPE_M: { label: mat("SEWER_PIPE_M", "Sewer pipe (meter)"), category: cat("networks", "Networks"), unit: "€/m" },
  ELECTRIC_CONDUIT_M: { label: mat("ELECTRIC_CONDUIT_M", "Electric conduit (meter)"), category: cat("networks", "Networks"), unit: "€/m" },
  MANHOLE_UNIT: { label: mat("MANHOLE_UNIT", "Manhole (unit)"), category: cat("networks", "Networks"), unit: "€/unit" },
  GARDEN_LIGHT_UNIT: { label: mat("GARDEN_LIGHT_UNIT", "Garden light (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },
  TRANSFORMER_UNIT: { label: mat("TRANSFORMER_UNIT", "Transformer (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },

  // Soil / landscaping
  TOPSOIL_M3: { label: mat("TOPSOIL_M3", "Topsoil (m³)"), category: cat("garden", "Garden"), unit: "€/m³" },
  COMPOST_M3: { label: mat("COMPOST_M3", "Compost (m³)"), category: cat("garden", "Garden"), unit: "€/m³" },
  MULCH_M3: { label: mat("MULCH_M3", "Mulch (m³)"), category: cat("garden", "Garden"), unit: "€/m³" },
  DECOR_GRAVEL_TON: { label: mat("DECOR_GRAVEL_TON", "Decorative gravel (ton)"), category: cat("garden", "Garden"), unit: "€/t" },

  // Lawn / fertilizer
  LAWN_ROLL_M2: { label: mat("LAWN_ROLL_M2", "Lawn rolls (m²)"), category: cat("garden", "Garden"), unit: "€/m²" },
  LAWN_SEED_KG: { label: mat("LAWN_SEED_KG", "Grass seed (kg)"), category: cat("garden", "Garden"), unit: "€/kg" },
  FERTILIZER_KG: { label: mat("FERTILIZER_KG", "Fertilizer (kg)"), category: cat("garden", "Garden"), unit: "€/kg" },

  // Irrigation
  GARDEN_EDGING_M: { label: mat("GARDEN_EDGING_M", "Garden edging (meter)"), category: cat("garden", "Garden"), unit: "€/m" },
  IRRIGATION_DRIP_M: { label: mat("IRRIGATION_DRIP_M", "Drip irrigation (meter)"), category: cat("garden", "Garden"), unit: "€/m" },
  IRRIGATION_SPRINKLER_UNIT: { label: mat("IRRIGATION_SPRINKLER_UNIT", "Sprinkler (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },
  IRRIGATION_PROGRAMMER_UNIT: { label: mat("IRRIGATION_PROGRAMMER_UNIT", "Irrigation controller (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },

  // Plants
  PLANT_UNIT: { label: mat("PLANT_UNIT", "Plant (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },
  SHRUB_UNIT: { label: mat("SHRUB_UNIT", "Shrub (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },
  HEDGE_PLANT_UNIT: { label: mat("HEDGE_PLANT_UNIT", "Hedge plant (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },
  TREE_UNIT: { label: mat("TREE_UNIT", "Tree (unit)"), category: cat("garden", "Garden"), unit: "€/unit" },
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