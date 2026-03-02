// src/data/blockSpecs.ts
import i18next from "i18next";

const tr = (key: string, fallback: string) =>
  i18next.t(key, { defaultValue: fallback });

export type MortarKind = "mortier" | "colle";

export type WallBlockSpec = {
  id: string;
  label: string; // affichage UI
  family: "parpaing" | "brique" | "cellulaire" | "stepoc";
  thicknessCm: number;
  dimsCm: { l: number; h: number; p: number };
  unitsPerM2: number;
  mortarKind: MortarKind;
  fillM3PerM2?: number;
};

export const WALL_BLOCK_SPECS: WallBlockSpec[] = [
  {
    id: "parpaing-20",
    label: tr("wallspecs.parpaing20", "Hollow concrete block 20×20×50 (standard)"),
    family: "parpaing",
    thicknessCm: 20,
    dimsCm: { l: 50, h: 20, p: 20 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },
  {
    id: "parpaing-15",
    label: tr("wallspecs.parpaing15", "Hollow concrete block 15×20×50"),
    family: "parpaing",
    thicknessCm: 15,
    dimsCm: { l: 50, h: 20, p: 15 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },
  {
    id: "parpaing-10",
    label: tr("wallspecs.parpaing10", "Hollow concrete block 10×20×50"),
    family: "parpaing",
    thicknessCm: 10,
    dimsCm: { l: 50, h: 20, p: 10 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },
  {
    id: "parpaing-25",
    label: tr("wallspecs.parpaing25", "Hollow concrete block 25×20×50"),
    family: "parpaing",
    thicknessCm: 25,
    dimsCm: { l: 50, h: 20, p: 25 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },

  {
    id: "brique-g7-roulee",
    label: tr("wallspecs.brick_g7", "Rolled brick (G7 / Optibric) — example"),
    family: "brique",
    thicknessCm: 20,
    dimsCm: { l: 50, h: 20, p: 20 },
    unitsPerM2: 10,
    mortarKind: "colle",
  },

  {
    id: "siporex-60x25-20",
    label: tr("wallspecs.cellular_60x25x20", "AAC block 60×25×20"),
    family: "cellulaire",
    thicknessCm: 20,
    dimsCm: { l: 60, h: 25, p: 20 },
    unitsPerM2: 6.67,
    mortarKind: "colle",
  },

  {
    id: "stepoc-20",
    label: tr("wallspecs.stepoc20", "Shuttering block (Stepoc) 20"),
    family: "stepoc",
    thicknessCm: 20,
    dimsCm: { l: 50, h: 20, p: 20 },
    unitsPerM2: 10,
    mortarKind: "mortier",
    fillM3PerM2: 0.13,
  },
  {
    id: "stepoc-25",
    label: tr("wallspecs.stepoc25", "Shuttering block (Stepoc) 25"),
    family: "stepoc",
    thicknessCm: 25,
    dimsCm: { l: 50, h: 20, p: 25 },
    unitsPerM2: 10,
    mortarKind: "mortier",
    fillM3PerM2: 0.16,
  },
];

export const getWallBlockSpec = (id: string): WallBlockSpec | undefined =>
  WALL_BLOCK_SPECS.find((s) => s.id === id);

export const getSpecsByFamily = (family: WallBlockSpec["family"]) =>
  WALL_BLOCK_SPECS.filter((s) => s.family === family);