// src/constants.ts (ou ton fichier équivalent)

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
 * ✅ MAJ SAFE (sans casser les autres calculateurs)
 * - DEFAULT_PRICES est typé en Record<string, number> (évite les erreurs TS "type literal")
 * - On CONSERVE les clés legacy :
 *   BLOCK_20_UNIT, BLOCK_STEPOC_UNIT, BRICK_20_UNIT, CELLULAR_20_UNIT
 * - On AJOUTE des variantes :
 *   BLOCK_10_UNIT / 15 / 25
 *   BLOCK_STEPOC_15_UNIT / 20 / 25 (+ legacy BLOCK_STEPOC_UNIT reste)
 *   BRICK_15_UNIT (+ legacy BRICK_20_UNIT)
 *   CELLULAR_15_UNIT (+ legacy CELLULAR_20_UNIT)
 * - Helper central getWallUnitPriceKey(spec) => renvoie une clé existante dans DEFAULT_PRICES
 * - ✅ FIX BUILD: export STATIC_TIPS (CalculatorPage l'importe)
 */

/* -------------------------------------------------------
   CALCULATORS
------------------------------------------------------- */

export const CALCULATORS: CalculatorConfig[] = [
  {
    id: CalculatorType.GROUNDWORK,
    name: "Terrassement",
    icon: "Mountain",
    color: "bg-stone-600",
    description: "Décaissement, tranchées, remblais",
    imageSrc: "/images/calculators/terrassement.png",
    imageAlt: "Terrassement : décaissement, tranchées et remblais",
  },
  {
    id: CalculatorType.FOUNDATIONS,
    name: "Fondations",
    icon: "Warehouse",
    color: "bg-stone-700",
    description: "Semelles, radier, béton, ferraillage",
    imageSrc: "/images/calculators/fondations.png",
    imageAlt: "Fondations : semelles, radier, béton et ferraillage",
  },
  {
    id: CalculatorType.SUBSTRUCTURE,
    name: "Soubassement",
    icon: "Component",
    color: "bg-stone-600",
    description: "Vide sanitaire, murs enterrés, drainage",
    imageSrc: "/images/calculators/soubassement.png",
    imageAlt: "Soubassement : vide sanitaire, murs enterrés, drainage",
  },
  {
    id: CalculatorType.CONCRETE,
    name: "Béton / Dalle",
    icon: "Layers",
    color: "bg-gray-500",
    description: "Dalles, planchers, dosages",
    imageSrc: "/images/calculators/beton-dalle.png",
    imageAlt: "Béton et dalle : dalles, planchers et dosages",
  },
  {
    id: CalculatorType.WALLS,
    name: "Murs",
    icon: "BrickWall",
    color: "bg-stone-500",
    description: "Parpaings, briques, linteaux",
    imageSrc: "/images/calculators/murs.png",
    imageAlt: "Murs : parpaings, briques et linteaux",
  },
  {
    id: CalculatorType.STAIRS,
    name: "Escalier Béton",
    icon: "TrendingUp",
    color: "bg-stone-400",
    description: "Marches, paillasse, coffrage",
    imageSrc: "/images/calculators/escalier-beton.png",
    imageAlt: "Escalier béton : marches, paillasse et coffrage",
  },
  {
    id: CalculatorType.ROOF,
    name: "Toiture",
    icon: "Home",
    color: "bg-orange-600",
    description: "Charpente, tuiles, gouttières",
    imageSrc: "/images/calculators/toiture.png",
    imageAlt: "Toiture : charpente, tuiles et gouttières",
  },
  {
    id: CalculatorType.JOINERY,
    name: "Menuiseries",
    icon: "BoxSelect",
    color: "bg-sky-600",
    description: "Fenêtres, portes, volets",
    imageSrc: "/images/calculators/menuiseries.png",
    imageAlt: "Menuiseries : fenêtres, portes et volets",
  },
  {
    id: CalculatorType.PLACO,
    name: "Placo / Isolation",
    icon: "Square",
    color: "bg-indigo-500",
    description: "Cloisons, doublages, plafonds",
    imageSrc: "/images/calculators/placo-isolation.png",
    imageAlt: "Placo et isolation : cloisons, doublages et plafonds",
  },
  {
    id: CalculatorType.ELECTRICITY,
    name: "Électricité",
    icon: "Zap",
    color: "bg-yellow-500",
    description: "Câbles, gaines, appareillage",
    imageSrc: "/images/calculators/electricite.png",
    imageAlt: "Électricité : câbles, gaines et appareillage",
  },
  {
    id: CalculatorType.PLUMBING,
    name: "Plomberie",
    icon: "Droplets",
    color: "bg-cyan-500",
    description: "PER, évacuations, raccords",
    imageSrc: "/images/calculators/plomberie.png",
    imageAlt: "Plomberie : PER, évacuations et raccords",
  },
  {
    id: CalculatorType.HVAC,
    name: "Chauffage / VMC",
    icon: "Thermometer",
    color: "bg-red-500",
    description: "VMC, radiateurs, PAC",
    imageSrc: "/images/calculators/chauffage-vmc.png",
    imageAlt: "Chauffage et VMC : radiateurs, PAC et ventilation",
  },
  {
    id: CalculatorType.SCREED,
    name: "Chapes",
    icon: "Layers",
    color: "bg-stone-400",
    description: "Chape liquide, traditionnelle",
    imageSrc: "/images/calculators/chapes.png",
    imageAlt: "Chapes : chape liquide et traditionnelle",
  },
  {
    id: CalculatorType.TILES,
    name: "Carrelage",
    icon: "Grid3X3",
    color: "bg-teal-500",
    description: "Sol, faïence, colle",
    imageSrc: "/images/calculators/carrelage.png",
    imageAlt: "Carrelage : sol, faïence et colle",
  },
  {
    id: CalculatorType.RAGREAGE,
    name: "Ragréage",
    icon: "Layers",
    color: "bg-amber-600",
    description: "Mise à niveau sols (Rénovation)",
    imageSrc: "/images/calculators/ragreage.png",
    imageAlt: "Ragréage : mise à niveau des sols en rénovation",
  },
  {
    id: CalculatorType.PAINT,
    name: "Peinture",
    icon: "PaintBucket",
    color: "bg-blue-500",
    description: "Murs, plafonds",
    imageSrc: "/images/calculators/peinture.png",
    imageAlt: "Peinture : murs et plafonds",
  },
  {
    id: CalculatorType.FACADE,
    name: "Façade",
    icon: "PaintRoller",
    color: "bg-orange-300",
    description: "Enduit, bardage",
    imageSrc: "/images/calculators/facade.png",
    imageAlt: "Façade : enduit et bardage",
  },
  {
    id: CalculatorType.EXTERIOR,
    name: "Extérieurs",
    icon: "Fence",
    color: "bg-green-600",
    description: "Terrasse, clôture, allées",
    imageSrc: "/images/calculators/exterieurs.png",
    imageAlt: "Extérieurs : terrasse, clôture et allées",
  },
];

/* -------------------------------------------------------
   CONSTRUCTION STEPS
------------------------------------------------------- */

export const CONSTRUCTION_STEPS = [
  {
    id: "group_go",
    label: "Gros Œuvre",
    steps: [
      { id: ConstructionStepId.GROUNDWORK, label: "Terrassement", icon: Mountain, calc: CalculatorType.GROUNDWORK },
      { id: ConstructionStepId.FOUNDATIONS, label: "Fondations", icon: Warehouse, calc: CalculatorType.FOUNDATIONS },
      { id: ConstructionStepId.BASEMENT, label: "Soubassement", icon: Component, calc: CalculatorType.SUBSTRUCTURE },
      { id: ConstructionStepId.SLAB_GROUND, label: "Dalle RDC", icon: Layers, calc: CalculatorType.CONCRETE },
      { id: ConstructionStepId.WALLS, label: "Élévation des murs", icon: BrickWall, calc: CalculatorType.WALLS },
      { id: ConstructionStepId.STAIRS, label: "Escalier Béton", icon: TrendingUp, calc: CalculatorType.STAIRS },
      { id: ConstructionStepId.ROOFING, label: "Toiture / Charpente", icon: Home, calc: CalculatorType.ROOF },
      { id: ConstructionStepId.WINDOWS, label: "Menuiseries Ext.", icon: BoxSelect, calc: CalculatorType.JOINERY },
    ],
  },
  {
    id: "group_so",
    label: "Second Œuvre",
    steps: [
      { id: ConstructionStepId.LINING, label: "Doublage (Isolation)", icon: PanelTop, calc: CalculatorType.PLACO },
      { id: ConstructionStepId.PARTITIONS, label: "Cloisons", icon: ArrowRightLeft, calc: CalculatorType.PLACO },
      { id: ConstructionStepId.CEILINGS, label: "Plafonds", icon: Spline, calc: CalculatorType.PLACO },
      { id: ConstructionStepId.ELECTRICITY, label: "Électricité", icon: Zap, calc: CalculatorType.ELECTRICITY },
      { id: ConstructionStepId.PLUMBING, label: "Plomberie", icon: Droplets, calc: CalculatorType.PLUMBING },
      { id: ConstructionStepId.HVAC, label: "Chauffage / VMC", icon: Thermometer, calc: CalculatorType.HVAC },
      { id: ConstructionStepId.SCREED, label: "Chapes / Ravoirage", icon: Layers, calc: CalculatorType.SCREED },
    ],
  },
  {
    id: "group_fin",
    label: "Finitions",
    steps: [
      { id: ConstructionStepId.FLOORING, label: "Sols (Carrelage/Parquet)", icon: Grid3X3, calc: CalculatorType.TILES },
      { id: ConstructionStepId.PAINTING, label: "Peinture", icon: PaintBucket, calc: CalculatorType.PAINT },
      { id: ConstructionStepId.FACADE, label: "Façade", icon: PaintRoller, calc: CalculatorType.FACADE },
      { id: ConstructionStepId.EXTERIOR, label: "Extérieurs", icon: Fence, calc: CalculatorType.EXTERIOR },
    ],
  },
];

/* -------------------------------------------------------
   DEFAULT PRICES (✅ typage number)
------------------------------------------------------- */

// ✅ IMPORTANT: pas de "as const" ici, sinon TS crée des types littéraux et casse les assignations.
export const DEFAULT_PRICES: Record<string, number> = {
  PAINT_LITER: 15,
  PRIMER_LITER: 8,

  CEMENT_BAG_35KG: 11.5,
  CEMENT_BAG_25KG: 8.9,

  SAND_TON: 55,
  GRAVEL_TON: 50,
  SAND_BIGBAG: 65,
  GRAVEL_BIGBAG: 60,

  // Tiling
  TILE_M2: 25,
  GLUE_BAG_25KG: 22,
  GROUT_BAG_5KG: 12,
  SKIRTING_METER: 8,
  SPACERS_BOX: 9,

  // Leveling
  RAGREAGE_BAG_25KG: 24,
  RAGREAGE_FIBRE_25KG: 35,
  PRIMER_FLOOR_LITER: 12,
  PERIPHERAL_BAND_M: 1.5,
  SCREED_MORTAR_BAG: 6.5,

  // Placo
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

  // Reinforcement
  MESH_PANEL_ST25: 28,
  REBAR_KG: 1.8,
  CHAINAGE_3M: 12,
  REBAR_CAGE_35_15_6M: 28.0,
  REBAR_CAGE_15_35_6M: 22.0,
  REBAR_CAGE_20_20_6M: 18.0,

  // Concrete Service
  BPE_M3: 130,
  DELIVERY_FEE: 180,
  PUMP_FEE: 350,
  CLEAN_CONCRETE_M3: 110,

  // Walls legacy (NE PAS TOUCHER: utilisé par d’autres calculateurs)
  BLOCK_20_PALLET: 90.0,
  BLOCK_20_UNIT: 1.3,
  BLOCK_STEPOC_UNIT: 3.5,
  BRICK_20_UNIT: 2.5,
  CELLULAR_20_UNIT: 4.5,

  // ✅ Variantes (nouvelles clés)
  BLOCK_10_UNIT: 1.0,
  BLOCK_15_UNIT: 1.15,
  BLOCK_25_UNIT: 1.6,

  BLOCK_STEPOC_15_UNIT: 3.0,
  BLOCK_STEPOC_20_UNIT: 3.5, // = legacy logique
  BLOCK_STEPOC_25_UNIT: 4.2,

  BRICK_15_UNIT: 2.2,
  CELLULAR_15_UNIT: 3.8,

  MORTAR_BAG_25KG: 7.5,
  GLUE_MORTAR_BAG_25KG: 15.0,
  LINTEL_PRECAST_M: 25.0,
  COATING_EXT_BAG: 15.0,
  COATING_INT_BAG: 12.0,

  // Earthworks
  EXCAVATION_M3: 35.0,
  EVACUATION_M3: 25.0,
  TOPSOIL_STRIP_M2: 5.0,
  GRAVEL_FOUNDATION_TON: 45.0,
  GEOTEXTILE_M2: 1.5,
  POLYANE_ROLL_150M2: 60.0,
  FORM_PANEL_M2: 12.0,
  TRENCH_EXCAVATION_M3: 45.0,
  BACKFILL_M3: 30.0,

  // Machinery Rental
  DIGGER_DAY: 400.0,
  DUMPER_DAY: 150.0,
  SKIP_DAY: 300.0,
  COMPACTOR_DAY: 80.0,

  // Substructure / Drainage
  BITUMEN_COATING_BUCKET_25KG: 60.0,
  DELTA_MS_ROLL_20M: 60.0,
  DRAIN_PIPE_50M: 70.0,
  GEOTEXTILE_ROLL_50M2: 40.0,

  // Roof
  TILE_ROOF_M2: 25.0,
  BATTEN_M: 0.8,
  UNDERLAY_ROLL_75M2: 80.0,

  // Elec / Plumbing
  CABLE_3G15_100M: 45.0,
  CABLE_3G25_100M: 70.0,
  CONDUIT_ICTA_20_100M: 35.0,
  SOCKET_UNIT: 8.0,
  SWITCH_UNIT: 7.0,
  BREAKER_UNIT: 12.0,
  PER_PIPE_100M: 60.0,
  PVC_PIPE_4M: 8.0,

  // Façade
  FACADE_COATING_BAG: 15.0,

  // Divers
  PROP_UNIT: 25.0,
  TIMBER_M: 3.0,
  FORM_OIL_L: 8.0,

  // --- EXTÉRIEUR ---
  FENCE_MESH_M: 25.0,
  FENCE_RIGID_M: 45.0,
  FENCE_WOOD_M: 35.0,
  FENCE_POST_UNIT: 15.0,
  BORDER_CONCRETE_M: 5.0,
  WALL_COPING_UNIT: 5.0,

  PAVERS_M2: 25.0,
  WOOD_DECK_M2: 60.0,
  COMPOSITE_DECK_M2: 50.0,

  // --- PORTAILS ---
  GATE_UNIT: 1500.0,
  GATE_MOTOR_UNIT: 450.0,
  GATE_INSTALL_UNIT: 400.0,

  // --- PISCINES ---
  POOL_UNIT: 12000.0,
  POOL_INSTALL_UNIT: 2500.0,
  POOL_COPING_ML: 45.0,

  // VRD / Réseaux
  WATER_PIPE_M: 4.0,
  SEWER_PIPE_M: 8.0,
  ELECTRIC_CONDUIT_M: 2.5,
  MANHOLE_UNIT: 60.0,
  GARDEN_LIGHT_UNIT: 45.0,
  TRANSFORMER_UNIT: 80.0,

  // Jardin
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
   MATERIAL METADATA (✅ variantes blocs)
------------------------------------------------------- */

export const MATERIAL_METADATA: Record<string, MaterialMetadata> = {
  // Peinture
  PAINT_LITER: { label: "Peinture Murale", category: "Peinture", unit: "€/L" },
  PRIMER_LITER: { label: "Sous-couche Universelle", category: "Peinture", unit: "€/L" },

  // Maçonnerie / Gros Œuvre
  CEMENT_BAG_35KG: { label: "Ciment (Sac 35kg)", category: "Maçonnerie", unit: "€/sac" },
  CEMENT_BAG_25KG: { label: "Ciment (Sac 25kg)", category: "Maçonnerie", unit: "€/sac" },
  SAND_TON: { label: "Sable à maçonner (Vrac)", category: "Agrégats", unit: "€/T" },
  GRAVEL_TON: { label: "Gravier Béton (Vrac)", category: "Agrégats", unit: "€/T" },
  SAND_BIGBAG: { label: "Sable (BigBag 1T)", category: "Agrégats", unit: "€/u" },
  GRAVEL_BIGBAG: { label: "Gravier (BigBag 1T)", category: "Agrégats", unit: "€/u" },
  GRAVEL_FOUNDATION_TON: { label: "Tout-venant (Fondations)", category: "Agrégats", unit: "€/T" },

  // Carrelage
  TILE_M2: { label: "Carrelage Sol Standard", category: "Carrelage", unit: "€/m²" },
  GLUE_BAG_25KG: { label: "Colle Carrelage C2 (25kg)", category: "Carrelage", unit: "€/sac" },
  GROUT_BAG_5KG: { label: "Joint Carrelage (5kg)", category: "Carrelage", unit: "€/sac" },
  SKIRTING_METER: { label: "Plinthe assortie", category: "Carrelage", unit: "€/ml" },
  SPACERS_BOX: { label: "Croisillons / Cales (Sachet)", category: "Carrelage", unit: "€/u" },

  // Sol / Chape / Ragréage
  RAGREAGE_BAG_25KG: { label: "Ragréage Autolissant (25kg)", category: "Sols", unit: "€/sac" },
  RAGREAGE_FIBRE_25KG: { label: "Ragréage Fibré (25kg)", category: "Sols", unit: "€/sac" },
  PRIMER_FLOOR_LITER: { label: "Primaire Sol", category: "Sols", unit: "€/L" },
  PERIPHERAL_BAND_M: { label: "Bande Périphérique", category: "Sols", unit: "€/ml" },
  SCREED_MORTAR_BAG: { label: "Mortier Chape (Prêt à gâcher)", category: "Sols", unit: "€/sac" },

  // Plâtrerie / Isolation
  PLACO_PLATE_BA13: { label: "Plaque BA13 (2.5x1.2m)", category: "Plâtrerie", unit: "€/u" },
  PLACO_PLATE_HYDRO: { label: "Plaque Hydro H1 (2.5x1.2m)", category: "Plâtrerie", unit: "€/u" },
  PLACO_PLATE_FIRE: { label: "Plaque Feu / Phonique (2.5x1.2m)", category: "Plâtrerie", unit: "€/u" },
  RAIL_3M: { label: "Rail (3m)", category: "Plâtrerie", unit: "€/u" },
  MONTANT_3M: { label: "Montant (3m)", category: "Plâtrerie", unit: "€/u" },
  FURRING_3M: { label: "Fourrure F530 (3m)", category: "Plâtrerie", unit: "€/u" },
  HANGER_BOX_50: { label: "Boîte 50 Suspentes", category: "Plâtrerie", unit: "€/u" },
  SCREWS_BOX_1000: { label: "Vis Placo (Boîte 1000)", category: "Plâtrerie", unit: "€/u" },
  JOINT_TAPE_ROLL: { label: "Bande à joints (Rouleau)", category: "Plâtrerie", unit: "€/u" },
  COMPOUND_BAG_25KG: { label: "Enduit Joints (Sac 25kg)", category: "Plâtrerie", unit: "€/sac" },
  MAP_BAG_25KG: { label: "Mortier Adhésif MAP (25kg)", category: "Plâtrerie", unit: "€/sac" },
  INSULATION_M2: { label: "Laine de Verre (Panneau/Rlx)", category: "Isolation", unit: "€/m²" },
  CORNER_BEAD_3M: { label: "Cornière d'angle (3m)", category: "Plâtrerie", unit: "€/u" },

  // Ferraillage
  MESH_PANEL_ST25: { label: "Treillis Soudé ST25 (Panneau)", category: "Gros Œuvre", unit: "€/panneau" },
  REBAR_KG: { label: "Fer à béton (au kg)", category: "Gros Œuvre", unit: "€/kg" },
  CHAINAGE_3M: { label: "Chaînage triangulaire (3m)", category: "Gros Œuvre", unit: "€/barre" },
  REBAR_CAGE_35_15_6M: { label: "Semelle Filante S35 (6m)", category: "Gros Œuvre", unit: "€/barre" },
  REBAR_CAGE_15_35_6M: { label: "Semelle S35 (Inverse)", category: "Gros Œuvre", unit: "€/barre" },
  REBAR_CAGE_20_20_6M: { label: "Longrine 20x20 (6m)", category: "Gros Œuvre", unit: "€/barre" },

  // Béton
  BPE_M3: { label: "Béton BPE (Toupie)", category: "Béton", unit: "€/m³" },
  DELIVERY_FEE: { label: "Forfait Livraison Toupie", category: "Béton", unit: "€/forfait" },
  PUMP_FEE: { label: "Forfait Pompe Béton", category: "Béton", unit: "€/forfait" },
  CLEAN_CONCRETE_M3: { label: "Béton de propreté", category: "Béton", unit: "€/m³" },

  // Murs (legacy + variantes)
  BLOCK_20_PALLET: { label: "Palette Parpaings 20cm", category: "Maçonnerie", unit: "€/palette" },
  BLOCK_10_UNIT: { label: "Parpaing 10cm", category: "Maçonnerie", unit: "€/u" },
  BLOCK_15_UNIT: { label: "Parpaing 15cm", category: "Maçonnerie", unit: "€/u" },
  BLOCK_20_UNIT: { label: "Parpaing 20cm", category: "Maçonnerie", unit: "€/u" },
  BLOCK_25_UNIT: { label: "Parpaing 25cm", category: "Maçonnerie", unit: "€/u" },

  BLOCK_STEPOC_UNIT: { label: "Bloc à Bancher 20cm (legacy)", category: "Maçonnerie", unit: "€/u" },
  BLOCK_STEPOC_15_UNIT: { label: "Bloc à Bancher 15cm", category: "Maçonnerie", unit: "€/u" },
  BLOCK_STEPOC_20_UNIT: { label: "Bloc à Bancher 20cm", category: "Maçonnerie", unit: "€/u" },
  BLOCK_STEPOC_25_UNIT: { label: "Bloc à Bancher 25cm", category: "Maçonnerie", unit: "€/u" },

  BRICK_15_UNIT: { label: "Brique 15cm", category: "Maçonnerie", unit: "€/u" },
  BRICK_20_UNIT: { label: "Brique 20cm", category: "Maçonnerie", unit: "€/u" },

  CELLULAR_15_UNIT: { label: "Béton Cellulaire 15cm", category: "Maçonnerie", unit: "€/u" },
  CELLULAR_20_UNIT: { label: "Béton Cellulaire 20cm", category: "Maçonnerie", unit: "€/u" },

  MORTAR_BAG_25KG: { label: "Mortier Montage (25kg)", category: "Maçonnerie", unit: "€/sac" },
  GLUE_MORTAR_BAG_25KG: { label: "Colle Brique/BC (25kg)", category: "Maçonnerie", unit: "€/sac" },
  LINTEL_PRECAST_M: { label: "Linteau Préfa 20x20", category: "Maçonnerie", unit: "€/ml" },
  COATING_EXT_BAG: { label: "Enduit Façade (Sac 25kg)", category: "Façade", unit: "€/sac" },
  COATING_INT_BAG: { label: "Enduit Intérieur / Plâtre", category: "Plâtrerie", unit: "€/sac" },

  // Terrassement
  EXCAVATION_M3: { label: "Terrassement (Excavation)", category: "Terrassement", unit: "€/m³" },
  EVACUATION_M3: { label: "Évacuation Terres", category: "Terrassement", unit: "€/m³" },
  TOPSOIL_STRIP_M2: { label: "Décapage Terre Végétale", category: "Terrassement", unit: "€/m²" },
  GEOTEXTILE_M2: { label: "Géotextile", category: "Terrassement", unit: "€/m²" },
  POLYANE_ROLL_150M2: { label: "Film Polyane (Rouleau 150m²)", category: "Gros Œuvre", unit: "€/rouleau" },
  FORM_PANEL_M2: { label: "Coffrage (Bois/Plan)", category: "Gros Œuvre", unit: "€/m²" },

  // Location
  DIGGER_DAY: { label: "Loc. Mini-pelle (Jour)", category: "Location", unit: "€/j" },
  DUMPER_DAY: { label: "Loc. Dumper (Jour)", category: "Location", unit: "€/j" },
  SKIP_DAY: { label: "Loc. Benne (Rotation)", category: "Location", unit: "€/rotation" },
  COMPACTOR_DAY: { label: "Loc. Plaque Vibrante", category: "Location", unit: "€/j" },

  // Soubassement
  BITUMEN_COATING_BUCKET_25KG: { label: "Enduit Bitumineux (25kg)", category: "Étanchéité", unit: "€/seau" },
  DELTA_MS_ROLL_20M: { label: "Protection Delta MS (20m)", category: "Étanchéité", unit: "€/rouleau" },
  DRAIN_PIPE_50M: { label: "Drain Agricole Ø100 (50m)", category: "VRD", unit: "€/rouleau" },
  GEOTEXTILE_ROLL_50M2: { label: "Géotextile (Rouleau 50m²)", category: "Terrassement", unit: "€/rouleau" },

  // Toiture
  TILE_ROOF_M2: { label: "Tuiles (Standard)", category: "Toiture", unit: "€/m²" },
  BATTEN_M: { label: "Liteaux / Chevrons", category: "Toiture", unit: "€/ml" },
  UNDERLAY_ROLL_75M2: { label: "Écran Sous-toiture (75m²)", category: "Toiture", unit: "€/rouleau" },

  // Élec / Plomberie
  CABLE_3G15_100M: { label: "Câble R2V 3G1.5 (100m)", category: "Électricité", unit: "€/rouleau" },
  CABLE_3G25_100M: { label: "Câble R2V 3G2.5 (100m)", category: "Électricité", unit: "€/rouleau" },
  CONDUIT_ICTA_20_100M: { label: "Gaine ICTA Ø20 (100m)", category: "Électricité", unit: "€/rouleau" },
  SOCKET_UNIT: { label: "Prise de courant (Complète)", category: "Électricité", unit: "€/u" },
  SWITCH_UNIT: { label: "Interrupteur (Complet)", category: "Électricité", unit: "€/u" },
  BREAKER_UNIT: { label: "Disjoncteur Ph+N", category: "Électricité", unit: "€/u" },
  PER_PIPE_100M: { label: "Tube PER / Multicouche (100m)", category: "Plomberie", unit: "€/rouleau" },
  PVC_PIPE_4M: { label: "Tube PVC Évacuation (4m)", category: "Plomberie", unit: "€/barre" },

  // Façade
  FACADE_COATING_BAG: { label: "Enduit Monocouche Façade", category: "Façade", unit: "€/sac" },

  // Divers
  PROP_UNIT: { label: "Étai de maçon", category: "Outillage", unit: "€/u" },
  TIMBER_M: { label: "Bois de coffrage (Tasseau)", category: "Gros Œuvre", unit: "€/ml" },
  FORM_OIL_L: { label: "Huile de décoffrage", category: "Gros Œuvre", unit: "€/L" },

  // --- EXTÉRIEUR ---
  FENCE_MESH_M: { label: "Grillage Souple", category: "Extérieur", unit: "€/ml" },
  FENCE_RIGID_M: { label: "Clôture Rigide", category: "Extérieur", unit: "€/ml" },
  FENCE_WOOD_M: { label: "Clôture Bois / Composite", category: "Extérieur", unit: "€/ml" },
  FENCE_POST_UNIT: { label: "Poteau de clôture", category: "Extérieur", unit: "€/u" },
  BORDER_CONCRETE_M: { label: "Bordure Béton (P1)", category: "Extérieur", unit: "€/ml" },
  WALL_COPING_UNIT: { label: "Chaperon / Couvertine (50cm)", category: "Maçonnerie", unit: "€/u" },

  PAVERS_M2: { label: "Pavés / Dalles Ext.", category: "Sols Extérieurs", unit: "€/m²" },
  WOOD_DECK_M2: { label: "Lames Terrasse Bois", category: "Sols Extérieurs", unit: "€/m²" },
  COMPOSITE_DECK_M2: { label: "Lames Composite", category: "Sols Extérieurs", unit: "€/m²" },

  // --- PORTAILS ---
  GATE_UNIT: { label: "Portail (Kit complet)", category: "Portails", unit: "€/u" },
  GATE_MOTOR_UNIT: { label: "Motorisation Portail", category: "Portails", unit: "€/u" },
  GATE_INSTALL_UNIT: { label: "Forfait Pose Portail", category: "Portails", unit: "€/forfait" },

  // --- PISCINES ---
  POOL_UNIT: { label: "Piscine (Forfait/Kit)", category: "Piscines", unit: "€/u" },
  POOL_INSTALL_UNIT: { label: "Pose Piscine (Forfait)", category: "Piscines", unit: "€/forfait" },
  POOL_COPING_ML: { label: "Margelles Piscine", category: "Piscines", unit: "€/ml" },

  // VRD / Réseaux
  WATER_PIPE_M: { label: "Tube PEHD Eau (Ø25/32)", category: "VRD", unit: "€/ml" },
  SEWER_PIPE_M: { label: "Tube PVC Assainissement (CR8)", category: "VRD", unit: "€/ml" },
  ELECTRIC_CONDUIT_M: { label: "Gaine TPC (Rouge)", category: "VRD", unit: "€/ml" },
  MANHOLE_UNIT: { label: "Regard Visite (Béton/PVC)", category: "VRD", unit: "€/u" },
  GARDEN_LIGHT_UNIT: { label: "Luminaire Extérieur (Spot/Borne)", category: "VRD", unit: "€/u" },
  TRANSFORMER_UNIT: { label: "Transformateur / Coffret élec", category: "VRD", unit: "€/u" },
  TRENCH_EXCAVATION_M3: { label: "Excavation Tranchée", category: "VRD", unit: "€/m³" },
  BACKFILL_M3: { label: "Remblai (Sable/Grave)", category: "VRD", unit: "€/m³" },

  // Jardin
  TOPSOIL_M3: { label: "Terre Végétale", category: "Jardin", unit: "€/m³" },
  COMPOST_M3: { label: "Compost / Amendement", category: "Jardin", unit: "€/m³" },
  MULCH_M3: { label: "Paillage (Copeaux/Écorces)", category: "Jardin", unit: "€/m³" },
  DECOR_GRAVEL_TON: { label: "Gravier Décoratif", category: "Jardin", unit: "€/T" },
  LAWN_ROLL_M2: { label: "Gazon en Rouleau", category: "Jardin", unit: "€/m²" },
  LAWN_SEED_KG: { label: "Semence Gazon", category: "Jardin", unit: "€/kg" },
  FERTILIZER_KG: { label: "Engrais Gazon/Plantes", category: "Jardin", unit: "€/kg" },
  GARDEN_EDGING_M: { label: "Bordurette Jardin", category: "Jardin", unit: "€/ml" },
  IRRIGATION_DRIP_M: { label: "Tuyau Goutte-à-goutte", category: "Jardin", unit: "€/ml" },
  IRRIGATION_SPRINKLER_UNIT: { label: "Arroseur (Turbine/Tuyère)", category: "Jardin", unit: "€/u" },
  IRRIGATION_PROGRAMMER_UNIT: { label: "Programmateur Arrosage", category: "Jardin", unit: "€/u" },
  PLANT_UNIT: { label: "Plante / Vivace (Pot)", category: "Jardin", unit: "€/u" },
  SHRUB_UNIT: { label: "Arbuste", category: "Jardin", unit: "€/u" },
  HEDGE_PLANT_UNIT: { label: "Plant de Haie", category: "Jardin", unit: "€/u" },
  TREE_UNIT: { label: "Arbre (Tige)", category: "Jardin", unit: "€/u" },
};

/* -------------------------------------------------------
   Helper: map bloc spec -> price key (SAFE)
------------------------------------------------------- */

export type WallFamily = "parpaing" | "brique" | "cellulaire" | "stepoc";

export type WallBlockSpecLite = {
  family: WallFamily;
  thicknessCm: number;
};

/**
 * ✅ Retourne une clé existante dans DEFAULT_PRICES.
 * - si variante dispo => BLOCK_10_UNIT etc.
 * - sinon fallback legacy => BLOCK_20_UNIT / BLOCK_STEPOC_UNIT / BRICK_20_UNIT / CELLULAR_20_UNIT
 */
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
   STATIC_TIPS (✅ FIX BUILD: export manquant)
------------------------------------------------------- */

export const STATIC_TIPS: Record<string, string[]> = {
  [CalculatorType.PAINT]: [
    "Toujours appliquer une sous-couche sur un fond brut (placo, plâtre) pour bloquer l'absorption.",
    "Croisez les passes (horizontal puis vertical) pour éviter les traces.",
    "Ne peignez pas si la température est > 25°C (séchage trop rapide) ou < 10°C.",
  ],
  [CalculatorType.CONCRETE]: [
    "Respectez le dosage en eau : trop d'eau fragilise le béton (retrait, fissures).",
    "Pour une dalle carrossable (voiture), visez 12-15cm d’épaisseur + treillis ST25C.",
    "Surélevez le treillis (cales 3-4cm) pour qu'il soit au cœur du béton, pas au sol.",
    "Prévoyez des joints de dilatation tous les 15-20m² pour éviter la casse.",
  ],
  [CalculatorType.TILES]: [
    "Format > 30x30cm : le double encollage (colle sur le sol + dos du carreau) est fortement recommandé.",
    "Mélangez les carreaux de plusieurs paquets avant la pose pour harmoniser les nuances.",
    "Pose sur ancien carrelage : vérifiez la planéité et appliquez impérativement un primaire d'accrochage.",
    "Attendez 24h après la pose pour réaliser les joints.",
  ],
  [CalculatorType.RAGREAGE]: [
    "Support : il doit être propre, sec, dur et sans poussière. Aspirez soigneusement avant tout.",
    "Primaire : indispensable pour réguler la porosité (béton) ou créer l'adhérence (carrelage).",
    "Bois : utilisez impérativement un ragréage fibré pour absorber les mouvements du support.",
    "Mélange : respectez scrupuleusement la quantité d'eau indiquée sur le sac pour l'autolissant.",
    "Application : versez et lissez rapidement, le produit tire en 20-30 minutes.",
  ],
  [CalculatorType.PLACO]: [
    "Stockez les plaques à plat et au sec pour éviter qu'elles ne gondolent.",
    "Tableaux : prévoyez de l'isolant mince ou de la mousse PU si l'espace est réduit autour des fenêtres.",
    "Joints : ne superposez pas les joints de plaques d'une rangée à l'autre (pose en décalé).",
    "Cloison : doublez les montants autour des portes pour rigidifier la structure.",
    "Acoustique : l'utilisation d'une bande résiliente sous les rails améliore l'isolation phonique.",
  ],
  [CalculatorType.FOUNDATIONS]: [
    "Fondations : coulez toujours hors gel (profondeur > 50-80cm selon région).",
    "Ferraillage : assurez la continuité des chaînages dans les angles avec des équerres.",
    "Recouvrement : respectez les longueurs de recouvrement des barres (environ 50x le diamètre).",
    "Propreté : coulez un béton de propreté (5cm) pour ne pas poser les aciers sur la terre.",
  ],
  [CalculatorType.WALLS]: [
    "Murs : humidifiez les parpaings avant la pose s'il fait très chaud.",
    "Appareillage : posez toujours la première rangée sur un lit de mortier de niveau parfait.",
    "Ouvertures : prévoyez toujours une marge de jeu (1-2cm) pour la pose des menuiseries.",
    "Raidisseurs : obligatoires à tous les angles et de part et d'autre des grandes ouvertures.",
  ],
  [CalculatorType.GROUNDWORK]: [
    "Décapage : retirez toujours la terre végétale (20-30cm) avant de construire, elle est instable.",
    "Foisonnement : une terre foisonne de 20 à 40% une fois sortie du trou. Prévoyez des camions en conséquence !",
    "Sécurité : au-delà de 1m30 de profondeur, étayez les tranchées ou talutez les bords pour éviter l'éboulement.",
    "Hérisson : utilisez du gros caillou (20/40 ou 40/80) propre pour drainer sous la dalle.",
  ],
  [CalculatorType.STAIRS]: [
    "Coffrage : utilisez du contreplaqué filmé (bakélisé) pour un décoffrage facile et une surface lisse.",
    "Ferraillage : les aciers de la paillasse doivent être ancrés dans les planchers haut et bas.",
    "Coulage : commencez toujours par la première marche du bas et remontez progressivement.",
    "Vibration : vibrez bien le béton, surtout dans les nez de marches, pour éviter les bulles.",
    "Cure : arrosez l'escalier le lendemain ou couvrez-le pour éviter qu'il ne sèche trop vite (fissures).",
  ],
};

/* -------------------------------------------------------
   OTHER CONSTANTS (inchangés)
------------------------------------------------------- */

export const PAINT_SUBSTRATES: SubstrateDef[] = [
  { id: "smooth", label: "Lisse / Ancienne peinture", absorptionFactor: 1.0 },
  { id: "placo", label: "Placo (standard)", absorptionFactor: 1.1 },
  { id: "plaster", label: "Plâtre / Enduit", absorptionFactor: 1.25 },
  { id: "concrete", label: "Béton brut", absorptionFactor: 1.15 },
  { id: "wood", label: "Bois", absorptionFactor: 1.2 },
];

export const PAINT_PACKAGING: PackagingDef[] = [
  { size: 10, unit: Unit.LITER, label: "Pot 10L" },
  { size: 5, unit: Unit.LITER, label: "Pot 5L" },
  { size: 2.5, unit: Unit.LITER, label: "Pot 2.5L" },
  { size: 1, unit: Unit.LITER, label: "Pot 1L" },
];

export const CONCRETE_PACKAGING: PackagingDef[] = [
  { size: 25, unit: Unit.KG, label: "Sac 25kg" },
  { size: 35, unit: Unit.KG, label: "Sac 35kg" },
  { size: 1000, unit: Unit.KG, label: "BigBag 1T" },
];

export const TILE_PATTERNS = [
  { id: "straight", label: "Pose Droite", waste: 7 },
  { id: "staggered", label: "Pose Décalée (1/2, 1/3)", waste: 11 },
  { id: "diagonal", label: "Pose Diagonale", waste: 16 },
];

export const GLUE_COMB_SPECS = [
  { size: 6, consumption: 2.5 },
  { size: 8, consumption: 3.5 },
  { size: 10, consumption: 5.0 },
];

export const LEVELING_SUBSTRATES = [
  { id: "concrete", label: "Béton / Chape Ciment", primerRequired: true, primerConsumption: 0.15 },
  { id: "tile", label: "Ancien Carrelage (Fermé)", primerRequired: true, primerConsumption: 0.1, warning: "Primaire d'accrochage spécifique obligatoire" },
  { id: "wood", label: "Bois / OSB / Parquet", primerRequired: true, primerConsumption: 0.2, recommendFibre: true, warning: "Ragréage fibré obligatoire sur bois" },
  { id: "anhydrite", label: "Chape Anhydrite", primerRequired: true, primerConsumption: 0.15, warning: "Ponçage + Primaire spécifique obligatoire" },
];

export const LEVELING_PRODUCTS = [
  { id: "standard", label: "Autolissant Standard (P3)", density: 1.6, minThick: 3, maxThick: 10, priceRef: "RAGREAGE_BAG_25KG" },
  { id: "fibre", label: "Fibré (Rénovation/Bois)", density: 1.7, minThick: 3, maxThick: 30, priceRef: "RAGREAGE_FIBRE_25KG" },
  { id: "thicks", label: "Forte Épaisseur / Rattrapage", density: 1.8, minThick: 10, maxThick: 50, priceRef: "RAGREAGE_BAG_25KG" },
  { id: "exterior", label: "Extérieur", density: 1.8, minThick: 3, maxThick: 20, priceRef: "RAGREAGE_BAG_25KG" },
];

export const PLACO_BOARD_TYPES = [
  { id: "BA13", label: "BA13 Standard", width: 1.2, height: 2.5, area: 3.0, priceRef: "PLACO_PLATE_BA13" },
  { id: "HYDRO", label: "Hydrofuge (H1)", width: 1.2, height: 2.5, area: 3.0, priceRef: "PLACO_PLATE_HYDRO" },
  { id: "FIRE", label: "Feu / Phonique", width: 1.2, height: 2.5, area: 3.0, priceRef: "PLACO_PLATE_FIRE" },
];

export const PLACO_PROFILES = [
  { id: "M48", label: "Montant M48 / Rail R48 (Standard)" },
  { id: "M70", label: "Montant M70 / Rail R70 (Isolation +)" },
  { id: "M90", label: "Montant M90 (Grands volumes)" },
];

export const PLACO_INSULATION_TYPES = [
  { id: "GR32", label: "Laine de verre (GR32) - Rouleau" },
  { id: "ROCK", label: "Laine de roche - Panneau" },
  { id: "PSE", label: "Polystyrène Expansé (PSE)" },
  { id: "XPS", label: "Polystyrène Extrudé (XPS)" },
  { id: "WOOD", label: "Fibre de bois" },
  { id: "BIO", label: "Chanvre / Coton recyclé" },
];

export const OPENING_PRESETS = {
  DOORS: [
    { label: "Porte 63 cm", width: 0.63, height: 2.04 },
    { label: "Porte 73 cm (Standard)", width: 0.73, height: 2.04 },
    { label: "Porte 83 cm (PMR)", width: 0.83, height: 2.04 },
    { label: "Porte 93 cm", width: 0.93, height: 2.04 },
    { label: "Double 140 cm", width: 1.4, height: 2.04 },
  ],
  WINDOWS: [
    { label: "Fenêtre 60x60", width: 0.6, height: 0.6 },
    { label: "Fenêtre 75x60", width: 0.75, height: 0.6 },
    { label: "Fenêtre 100x115", width: 1.0, height: 1.15 },
    { label: "Fenêtre 120x115", width: 1.2, height: 1.15 },
    { label: "Fenêtre 120x125", width: 1.2, height: 1.25 },
    { label: "Porte-fenêtre 120x215", width: 1.2, height: 2.15 },
    { label: "Baie vitrée 215x240", width: 2.4, height: 2.15 },
  ],
} as const;

// Standard Mesh Panels
export const MESH_TYPES: (MeshType & { width: number; height: number })[] = [
  { id: "ST10", label: "ST10 (Léger - Terrasse)", weightKgM2: 1.23, width: 2.4, height: 3.6 },
  { id: "ST25C", label: "ST25C (Standard - Dalle)", weightKgM2: 2.58, width: 2.4, height: 3.6 },
  { id: "ST40C", label: "ST40C (Lourd - Structure)", weightKgM2: 3.8, width: 2.4, height: 3.6 },
];

export const REBAR_WEIGHTS: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  14: 1.21,
  16: 1.58,
};

// Concrete Mix Ratios
export const CONCRETE_MIX_RATIOS: Record<number, { sand: number; gravel: number; water: number }> = {
  250: { sand: 800, gravel: 1050, water: 160 }, // Propreté
  300: { sand: 750, gravel: 1100, water: 170 }, // Terrasse
  350: { sand: 720, gravel: 1150, water: 175 }, // Dalle (Standard)
  400: { sand: 680, gravel: 1180, water: 180 }, // Fondations
};

export const SOIL_PROPERTIES: SoilDef[] = [
  { id: "soil", label: "Terre végétale", bulkingFactor: 1.25, density: 1.4 },
  { id: "clay", label: "Argile / Limon", bulkingFactor: 1.3, density: 1.7 },
  { id: "sand", label: "Sable", bulkingFactor: 1.15, density: 1.6 },
  { id: "gravel", label: "Gravier / Cailloux", bulkingFactor: 1.1, density: 1.7 },
  { id: "rock", label: "Roche fracturée", bulkingFactor: 1.5, density: 2.0 },
  { id: "mixed", label: "Tout-venant (Mélange)", bulkingFactor: 1.3, density: 1.8 },
];

export const GROUNDWORK_PROJECT_TYPES = [
  { id: "house", label: "Maison Individuelle" },
  { id: "extension", label: "Extension" },
  { id: "garage", label: "Garage" },
  { id: "terrace", label: "Terrasse" },
  { id: "pool", label: "Piscine" },
  { id: "other", label: "Autre" },
];

export const FOUNDATION_TYPES: FoundationDef[] = [
  { id: "strip", label: "Semelles Filantes", defaultWidth: 0.5, defaultDepth: 0.35 },
  { id: "raft", label: "Radier (Dalle Portée)", defaultWidth: 0, defaultDepth: 0.25 },
  { id: "pads", label: "Plots Isolés", defaultWidth: 0.6, defaultDepth: 0.6 },
];

export const REINFORCEMENT_TYPES: ReinforcementDef[] = [
  { id: "S35", label: "Semelle S35 (15x35) - 6 Fils", type: "cage", unit: Unit.PIECE },
  { id: "S15", label: "Semelle S15 (15x15) - 4 Fils", type: "cage", unit: Unit.PIECE },
  { id: "L20", label: "Longrine 20x20 - 4 Fils", type: "cage", unit: Unit.PIECE },
  { id: "ST25C", label: "Treillis ST25C (Radier)", type: "mesh", unit: Unit.PANEL },
  { id: "HA10", label: "Fers HA10 (Renforts)", type: "bar", unit: Unit.BAR },
  { id: "HA12", label: "Fers HA12 (Renforts)", type: "bar", unit: Unit.BAR },
];