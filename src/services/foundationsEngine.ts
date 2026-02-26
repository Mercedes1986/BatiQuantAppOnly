
import { FoundationProjectInputs, MaterialItem, Unit, CalculatorType } from '../types';
import { SOIL_PROPERTIES } from '../constants';

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

export const calculateFoundations = (
  inputs: FoundationProjectInputs,
  prices: Record<string, number>
): FoundationsResult => {
  const warnings: string[] = [];
  
  // --- 1. Dimensions Helper ---
  // Convert all cm to meters for internal calc
  const excavDepth = inputs.excavationDepthCm / 100;
  const margin = inputs.trenchOverwidthCm / 100;
  const stripW = inputs.stripWidthCm / 100;
  const stripH = inputs.stripHeightCm / 100;
  const leanThick = inputs.cleanConcreteThickCm / 100;

  // --- 2. Volume Calculations ---
  
  let volConcrete = 0;
  let volExcavation = 0;
  let volCleanConcrete = 0;
  let areaFormwork = 0;
  let lenDrain = 0;

  // A. STRIP FOUNDATIONS
  if (inputs.type === 'strip') {
    const L = inputs.totalLengthMl;
    
    // Concrete Volume
    volConcrete = L * stripW * stripH;
    
    // Excavation Volume: Length * (Width + 2*Margin) * Depth
    const trenchW = stripW + (2 * margin);
    volExcavation = L * trenchW * excavDepth;
    
    // Clean Concrete
    if (inputs.cleanConcrete) {
      volCleanConcrete = L * trenchW * leanThick;
    }

    // Formwork (Sides)
    // Only if margin > 0 implies we have space, otherwise poured against earth?
    // Let's assume if formwork checked, we calculate side area
    if (inputs.formwork) {
      areaFormwork = L * 2 * stripH;
    }

    // Drainage
    if (inputs.drainage) {
      lenDrain = L;
    }
  }

  // B. PADS (Semelles Isolées)
  if (inputs.type === 'pad') {
    inputs.pads.forEach(pad => {
      const pL = pad.lengthCm / 100;
      const pW = pad.widthCm / 100;
      const pH = pad.heightCm / 100;
      const pD = pad.depthCm / 100; // specific depth per pad type, or use global
      
      const count = pad.count;
      
      // Concrete
      volConcrete += count * pL * pW * pH;
      
      // Excavation
      const holeL = pL + (2 * margin);
      const holeW = pW + (2 * margin);
      // Use pad specific depth if > 0, else global
      const depth = pD > 0 ? pD : excavDepth;
      
      volExcavation += count * holeL * holeW * depth;
      
      // Clean Concrete
      if (inputs.cleanConcrete) {
        volCleanConcrete += count * holeL * holeW * leanThick;
      }
      
      // Formwork
      if (inputs.formwork) {
        areaFormwork += count * 2 * (pL + pW) * pH;
      }
    });
  }

  // C. GRADE BEAM (Simplification for V1: treated mostly like strip but with ratio change)
  if (inputs.type === 'grade_beam') {
     // Reuse strip logic for now, but usually implies piles (V2)
     const L = inputs.totalLengthMl;
     volConcrete = L * stripW * stripH;
     const trenchW = stripW + (2 * margin);
     volExcavation = L * trenchW * excavDepth; // Often less deep for grade beams between piles
     if (inputs.formwork) areaFormwork = L * 2 * stripH;
  }

  // --- 3. Derived Quantities ---

  // Soil Bulking
  const soilProp = SOIL_PROPERTIES.find(s => s.id === inputs.soilType) || SOIL_PROPERTIES[0];
  const volSpoil = volExcavation * soilProp.bulkingFactor;
  
  // Evacuation
  let volEvac = 0;
  if (inputs.evacuateSpoil) {
    // If reusing spoil, assume we keep ~40% for backfill (simplified)
    const keptRatio = inputs.reuseSpoil ? 0.6 : 0;
    volEvac = Math.max(0, volSpoil * (1 - keptRatio));
  }

  // Steel
  const steelKg = volConcrete * inputs.steelRatio;

  // Drainage Gravel
  let volGravel = 0;
  if (inputs.drainage && inputs.drainageGravel) {
    // 30cm x 30cm approx trench section for gravel around pipe
    volGravel = lenDrain * 0.3 * 0.3; 
  }
  
  // Geotextile (Drainage wrapping + under clean concrete option?)
  let areaGeo = 0;
  if (inputs.drainage) {
      areaGeo += lenDrain * 1.5; // Wrapping the gravel trench
  }

  // --- 4. Materials List Generation ---
  
  const materials: MaterialItem[] = [];

  // Concrete
  if (volConcrete > 0) {
    const cost = volConcrete * prices['CONC_M3'];
    materials.push({
      id: 'conc',
      name: 'Béton de fondation (C25/30)',
      quantity: parseFloat(volConcrete.toFixed(2)),
      quantityRaw: volConcrete,
      unit: Unit.M3,
      unitPrice: prices['CONC_M3'],
      totalPrice: cost,
      category: CalculatorType.FOUNDATIONS,
      details: 'Dosage standard structure'
    });
  }

  // Steel
  if (steelKg > 0) {
    const cost = steelKg * prices['STEEL_KG'];
    materials.push({
      id: 'steel',
      name: 'Acier (Ratio moyen)',
      quantity: Math.ceil(steelKg),
      quantityRaw: steelKg,
      unit: Unit.KG,
      unitPrice: prices['STEEL_KG'],
      totalPrice: cost,
      category: CalculatorType.FOUNDATIONS,
      details: `Ratio: ${inputs.steelRatio}kg/m³`
    });
  }

  // Excavation
  if (volExcavation > 0) {
    const cost = volExcavation * prices['EXCAV_M3'];
    materials.push({
      id: 'excav',
      name: 'Terrassement (Fouilles)',
      quantity: parseFloat(volExcavation.toFixed(2)),
      quantityRaw: volExcavation,
      unit: Unit.M3,
      unitPrice: prices['EXCAV_M3'],
      totalPrice: cost,
      category: CalculatorType.GROUNDWORK
    });
  }

  // Clean Concrete
  if (volCleanConcrete > 0) {
    const cost = volCleanConcrete * prices['LEANCONC_M3'];
    materials.push({
      id: 'clean_conc',
      name: 'Béton de propreté',
      quantity: parseFloat(volCleanConcrete.toFixed(2)),
      quantityRaw: volCleanConcrete,
      unit: Unit.M3,
      unitPrice: prices['LEANCONC_M3'],
      totalPrice: cost,
      category: CalculatorType.FOUNDATIONS,
      details: `Épaisseur ${inputs.cleanConcreteThickCm}cm`
    });
  }

  // Formwork
  if (areaFormwork > 0) {
    const cost = areaFormwork * prices['FORMWORK_M2'];
    materials.push({
      id: 'formwork',
      name: 'Coffrage',
      quantity: parseFloat(areaFormwork.toFixed(2)),
      quantityRaw: areaFormwork,
      unit: Unit.M2,
      unitPrice: prices['FORMWORK_M2'],
      totalPrice: cost,
      category: CalculatorType.FOUNDATIONS
    });
  }

  // Evacuation
  if (volEvac > 0) {
    const cost = volEvac * prices['WASTE_M3'];
    materials.push({
      id: 'evac',
      name: 'Évacuation des terres',
      quantity: parseFloat(volEvac.toFixed(2)),
      quantityRaw: volEvac,
      unit: Unit.M3,
      unitPrice: prices['WASTE_M3'],
      totalPrice: cost,
      category: CalculatorType.GROUNDWORK,
      details: `Vol. foisonné (Coef ${soilProp.bulkingFactor})`
    });
  }

  // Drain
  if (lenDrain > 0) {
    const cost = lenDrain * prices['DRAIN_ML'];
    materials.push({
      id: 'drain',
      name: 'Drain routier / agricole',
      quantity: Math.ceil(lenDrain),
      quantityRaw: lenDrain,
      unit: Unit.METER,
      unitPrice: prices['DRAIN_ML'],
      totalPrice: cost,
      category: CalculatorType.FOUNDATIONS
    });
  }

  // Gravel
  if (volGravel > 0) {
    const cost = volGravel * prices['GRAVEL_M3'];
    materials.push({
      id: 'gravel',
      name: 'Gravier drainant',
      quantity: parseFloat(volGravel.toFixed(2)),
      quantityRaw: volGravel,
      unit: Unit.M3,
      unitPrice: prices['GRAVEL_M3'],
      totalPrice: cost,
      category: CalculatorType.FOUNDATIONS
    });
  }

  // --- 5. Validation & Warnings ---
  if (inputs.frostDepthCm > 0 && inputs.excavationDepthCm < inputs.frostDepthCm) {
    warnings.push(`Attention: Profondeur de fouille (${inputs.excavationDepthCm}cm) inférieure au hors-gel (${inputs.frostDepthCm}cm).`);
  }
  if (inputs.soilType === 'clay') {
    warnings.push("Sol Argileux : Risque de retrait-gonflement. Étude de sol recommandée.");
  }
  if (inputs.groundwater && !inputs.drainage) {
    warnings.push("Nappe phréatique possible : Drainage fortement recommandé.");
  }
  if (!inputs.evacuateSpoil && !inputs.reuseSpoil) {
    warnings.push("Attention : Aucune gestion des déblais (ni évacuation, ni réutilisation).");
  }

  return {
    volumes: {
      concrete: volConcrete,
      cleanConcrete: volCleanConcrete,
      excavation: volExcavation,
      spoil: volSpoil,
      evac: volEvac,
      gravel: volGravel
    },
    quantities: {
      steel: steelKg,
      formwork: areaFormwork,
      drain: lenDrain,
      geotextile: areaGeo
    },
    materials,
    warnings
  };
};
