// src/services/foundationsEngine.ts (ou là où est ton engine)
import {
  FoundationProjectInputs,
  MaterialItem,
  Unit,
  CalculatorType,
} from "../types";
import { SOIL_PROPERTIES } from "../constants";

interface FoundationsResult {
  volumes: {
    concrete: number; // m3
    cleanConcrete: number; // m3
    excavation: number; // m3 (en place)
    spoil: number; // m3 (foisonné)
    evac: number; // m3
    gravel: number; // m3 (drainage)
  };
  quantities: {
    steel: number; // kg
    formwork: number; // m2
    drain: number; // ml
    geotextile: number; // m2
  };
  materials: MaterialItem[];
  warnings: string[];
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const n0 = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export const calculateFoundations = (
  inputs: FoundationProjectInputs,
  prices: Record<string, number>
): FoundationsResult => {
  const warnings: string[] = [];

  // --- Helpers ---
  const p = (key: string) => n0(prices[key]); // safe price getter

  // Convert all cm to meters for internal calc
  const excavDepth = (n0(inputs.excavationDepthCm) || 0) / 100;
  const margin = (n0(inputs.trenchOverwidthCm) || 0) / 100;

  const stripW = (n0(inputs.stripWidthCm) || 0) / 100;
  const stripH = (n0(inputs.stripHeightCm) || 0) / 100;

  const leanThick = (n0(inputs.cleanConcreteThickCm) || 0) / 100;

  // --- 1. Volumes ---
  let volConcrete = 0;
  let volExcavation = 0;
  let volCleanConcrete = 0;
  let areaFormwork = 0;
  let lenDrain = 0;

  // A) STRIP
  if (inputs.type === "strip") {
    const L = n0(inputs.totalLengthMl);

    const trenchW = stripW + 2 * margin;

    volConcrete = L * stripW * stripH;
    volExcavation = L * trenchW * excavDepth;

    if (inputs.cleanConcrete) {
      volCleanConcrete = L * trenchW * leanThick;
    }

    if (inputs.formwork) {
      areaFormwork = L * 2 * stripH;
    }

    if (inputs.drainage) {
      lenDrain = L;
    }
  }

  // B) PADS
  if (inputs.type === "pad") {
    (inputs.pads || []).forEach((pad) => {
      const count = n0(pad.count);
      const pL = n0(pad.lengthCm) / 100;
      const pW = n0(pad.widthCm) / 100;
      const pH = n0(pad.heightCm) / 100;
      const pD = n0(pad.depthCm) / 100;

      const holeL = pL + 2 * margin;
      const holeW = pW + 2 * margin;
      const depth = pD > 0 ? pD : excavDepth;

      volConcrete += count * pL * pW * pH;
      volExcavation += count * holeL * holeW * depth;

      if (inputs.cleanConcrete) {
        volCleanConcrete += count * holeL * holeW * leanThick;
      }

      if (inputs.formwork) {
        areaFormwork += count * 2 * (pL + pW) * pH;
      }
    });

    // Drainage : pas automatique sur plots (à toi de décider en V2)
    if (inputs.drainage) {
      warnings.push(
        "Drainage activé sur semelles isolées : la longueur de drain n'est pas calculée automatiquement (vérifie la configuration)."
      );
    }
  }

  // C) GRADE BEAM (v1 simplifiée)
  if (inputs.type === "grade_beam") {
    const L = n0(inputs.totalLengthMl);
    const trenchW = stripW + 2 * margin;

    volConcrete = L * stripW * stripH;
    volExcavation = L * trenchW * excavDepth;

    if (inputs.cleanConcrete) {
      volCleanConcrete = L * trenchW * leanThick;
    }
    if (inputs.formwork) areaFormwork = L * 2 * stripH;
    if (inputs.drainage) lenDrain = L;
  }

  // --- 2. Sol / déblais ---
  const soilProp =
    SOIL_PROPERTIES.find((s) => s.id === inputs.soilType) || SOIL_PROPERTIES[0];

  const volSpoil = volExcavation * n0(soilProp.bulkingFactor);

  // Evacuation (foisonné)
  let volEvac = 0;
  if (inputs.evacuateSpoil) {
    // si réutilisation, on évacue ~40% (on garde 60%) -> ton ancien code gardait 60% => évac 40%
    // Ici on garde la même logique que ton précédent: keptRatio = 0.6 => évac 40%
    const keptRatio = inputs.reuseSpoil ? 0.6 : 0;
    volEvac = Math.max(0, volSpoil * (1 - keptRatio));
  }

  // --- 3. Quantités ---
  const steelKg = volConcrete * n0(inputs.steelRatio);

  let volGravel = 0;
  if (inputs.drainage && inputs.drainageGravel && lenDrain > 0) {
    // 30cm x 30cm autour du drain (approx)
    volGravel = lenDrain * 0.3 * 0.3;
  }

  let areaGeo = 0;
  if (inputs.drainage && lenDrain > 0) {
    // enrobage géotextile : largeur utile ~1.5m (approx)
    areaGeo = lenDrain * 1.5;
  }

  // --- 4. Matériaux ---
  const materials: MaterialItem[] = [];

  // Béton fondations
  if (volConcrete > 0) {
    const cost = volConcrete * p("CONC_M3");
    materials.push({
      id: "conc",
      name: "Béton de fondation (C25/30)",
      quantity: r2(volConcrete),
      quantityRaw: volConcrete,
      unit: Unit.M3,
      unitPrice: p("CONC_M3"),
      totalPrice: r2(cost),
      category: CalculatorType.FOUNDATIONS,
      details: "Dosage standard structure",
    });
  }

  // Acier
  if (steelKg > 0) {
    const cost = steelKg * p("STEEL_KG");
    materials.push({
      id: "steel",
      name: "Acier (Ratio moyen)",
      quantity: Math.ceil(steelKg),
      quantityRaw: steelKg,
      unit: Unit.KG,
      unitPrice: p("STEEL_KG"),
      totalPrice: r2(cost),
      category: CalculatorType.FOUNDATIONS,
      details: `Ratio: ${n0(inputs.steelRatio)} kg/m³`,
    });
  }

  // Fouilles
  if (volExcavation > 0) {
    const cost = volExcavation * p("EXCAV_M3");
    materials.push({
      id: "excav",
      name: "Terrassement (Fouilles)",
      quantity: r2(volExcavation),
      quantityRaw: volExcavation,
      unit: Unit.M3,
      unitPrice: p("EXCAV_M3"),
      totalPrice: r2(cost),
      category: CalculatorType.GROUNDWORK,
    });
  }

  // Béton propreté
  if (volCleanConcrete > 0) {
    const cost = volCleanConcrete * p("LEANCONC_M3");
    materials.push({
      id: "clean_conc",
      name: "Béton de propreté",
      quantity: r2(volCleanConcrete),
      quantityRaw: volCleanConcrete,
      unit: Unit.M3,
      unitPrice: p("LEANCONC_M3"),
      totalPrice: r2(cost),
      category: CalculatorType.FOUNDATIONS,
      details: `Épaisseur ${n0(inputs.cleanConcreteThickCm)} cm`,
    });
  }

  // Coffrage
  if (areaFormwork > 0) {
    const cost = areaFormwork * p("FORMWORK_M2");
    materials.push({
      id: "formwork",
      name: "Coffrage",
      quantity: r2(areaFormwork),
      quantityRaw: areaFormwork,
      unit: Unit.M2,
      unitPrice: p("FORMWORK_M2"),
      totalPrice: r2(cost),
      category: CalculatorType.FOUNDATIONS,
    });
  }

  // Evacuation déblais
  if (volEvac > 0) {
    const cost = volEvac * p("WASTE_M3");
    materials.push({
      id: "evac",
      name: "Évacuation des terres",
      quantity: r2(volEvac),
      quantityRaw: volEvac,
      unit: Unit.M3,
      unitPrice: p("WASTE_M3"),
      totalPrice: r2(cost),
      category: CalculatorType.GROUNDWORK,
      details: `Foisonnement x${n0(soilProp.bulkingFactor)}`,
    });
  }

  // Drain
  if (lenDrain > 0) {
    const cost = lenDrain * p("DRAIN_ML");
    materials.push({
      id: "drain",
      name: "Drain routier / agricole",
      quantity: Math.ceil(lenDrain),
      quantityRaw: lenDrain,
      unit: Unit.METER,
      unitPrice: p("DRAIN_ML"),
      totalPrice: r2(cost),
      category: CalculatorType.FOUNDATIONS,
    });
  } else if (inputs.drainage && inputs.type !== "pad") {
    warnings.push("Drainage activé mais longueur de drain = 0 (vérifie la longueur).");
  }

  // Gravier drainant
  if (volGravel > 0) {
    const cost = volGravel * p("GRAVEL_M3");
    materials.push({
      id: "gravel",
      name: "Gravier drainant",
      quantity: r2(volGravel),
      quantityRaw: volGravel,
      unit: Unit.M3,
      unitPrice: p("GRAVEL_M3"),
      totalPrice: r2(cost),
      category: CalculatorType.FOUNDATIONS,
    });
  }

  // Géotextile
  if (areaGeo > 0) {
    // Clé prix optionnelle (si tu l’as en catalogue)
    const geoUnit = p("GEOTEXTILE_M2");
    const cost = areaGeo * geoUnit;
    materials.push({
      id: "geotextile",
      name: "Géotextile (Drain)",
      quantity: Math.ceil(areaGeo),
      quantityRaw: areaGeo,
      unit: Unit.M2,
      unitPrice: geoUnit,
      totalPrice: r2(cost),
      category: CalculatorType.FOUNDATIONS,
      details: "Enrobage tranchée drainante",
    });
  }

  // --- 5. Warnings ---
  if (n0(inputs.frostDepthCm) > 0 && n0(inputs.excavationDepthCm) < n0(inputs.frostDepthCm)) {
    warnings.push(
      `Profondeur de fouille (${n0(inputs.excavationDepthCm)}cm) < hors-gel (${n0(inputs.frostDepthCm)}cm).`
    );
  }
  if (inputs.soilType === "clay") {
    warnings.push("Sol argileux : risque de retrait-gonflement. Étude de sol recommandée.");
  }
  if (inputs.groundwater && !inputs.drainage) {
    warnings.push("Nappe possible : drainage fortement recommandé.");
  }
  if (!inputs.evacuateSpoil && !inputs.reuseSpoil) {
    warnings.push("Aucune gestion des déblais (ni évacuation, ni réutilisation).");
  }

  return {
    volumes: {
      concrete: volConcrete,
      cleanConcrete: volCleanConcrete,
      excavation: volExcavation,
      spoil: volSpoil,
      evac: volEvac,
      gravel: volGravel,
    },
    quantities: {
      steel: steelKg,
      formwork: areaFormwork,
      drain: lenDrain,
      geotextile: areaGeo,
    },
    materials,
    warnings,
  };
};