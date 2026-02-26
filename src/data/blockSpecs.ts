// src/data/blockSpecs.ts
export type MortarKind = "mortier" | "colle";

export type WallBlockSpec = {
  id: string;
  label: string;          // affichage UI
  family: "parpaing" | "brique" | "cellulaire" | "stepoc";
  thicknessCm: number;    // épaisseur du mur
  dimsCm: { l: number; h: number; p: number }; // longueur, hauteur, épaisseur
  unitsPerM2: number;     // consommation en u/m²
  mortarKind: MortarKind; // mortier ou colle
  // utile Stepoc (bloc à bancher)
  fillM3PerM2?: number;   // m3 de béton par m² de mur (approx)
};

export const WALL_BLOCK_SPECS: WallBlockSpec[] = [
  // Parpaings (20x20x50 => 10 u/m²)
  {
    id: "parpaing-20",
    label: "Parpaing creux 20×20×50 (standard)",
    family: "parpaing",
    thicknessCm: 20,
    dimsCm: { l: 50, h: 20, p: 20 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },
  {
    id: "parpaing-15",
    label: "Parpaing creux 15×20×50",
    family: "parpaing",
    thicknessCm: 15,
    dimsCm: { l: 50, h: 20, p: 15 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },
  {
    id: "parpaing-10",
    label: "Parpaing creux 10×20×50",
    family: "parpaing",
    thicknessCm: 10,
    dimsCm: { l: 50, h: 20, p: 10 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },
  {
    id: "parpaing-25",
    label: "Parpaing creux 25×20×50",
    family: "parpaing",
    thicknessCm: 25,
    dimsCm: { l: 50, h: 20, p: 25 },
    unitsPerM2: 10,
    mortarKind: "mortier",
  },

  // Brique (exemples : ajuste selon tes références)
  {
    id: "brique-g7-roulee",
    label: "Brique roulée (G7 / Optibric) — (exemple)",
    family: "brique",
    thicknessCm: 20,
    dimsCm: { l: 50, h: 20, p: 20 },
    unitsPerM2: 10,
    mortarKind: "colle",
  },

  // Béton cellulaire (60x25 => 1/(0.60*0.25)=6.67 u/m²)
  {
    id: "siporex-60x25-20",
    label: "Béton cellulaire 60×25×20",
    family: "cellulaire",
    thicknessCm: 20,
    dimsCm: { l: 60, h: 25, p: 20 },
    unitsPerM2: 6.67,
    mortarKind: "colle",
  },

  // Stepoc / Bloc à bancher (approx béton/m² selon épaisseur)
  {
    id: "stepoc-20",
    label: "Bloc à bancher (Stepoc) 20",
    family: "stepoc",
    thicknessCm: 20,
    dimsCm: { l: 50, h: 20, p: 20 },
    unitsPerM2: 10,
    mortarKind: "mortier",
    fillM3PerM2: 0.13, // approximation à affiner
  },
  {
    id: "stepoc-25",
    label: "Bloc à bancher (Stepoc) 25",
    family: "stepoc",
    thicknessCm: 25,
    dimsCm: { l: 50, h: 20, p: 25 },
    unitsPerM2: 10,
    mortarKind: "mortier",
    fillM3PerM2: 0.16, // approximation à affiner
  },
];

export const getWallBlockSpec = (id: string): WallBlockSpec | undefined =>
  WALL_BLOCK_SPECS.find((s) => s.id === id);

export const getSpecsByFamily = (family: WallBlockSpec["family"]) =>
  WALL_BLOCK_SPECS.filter((s) => s.family === family);