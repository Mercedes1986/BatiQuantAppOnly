
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES, TILE_PATTERNS, GLUE_COMB_SPECS } from '../../constants';
import { getUnitPrice } from '../../services/materialsService';
import { 
  Grid3X3, Plus, Trash2, Home, Layers, Settings, Check, 
  ArrowRight, Info, AlertTriangle, Droplets, Scissors, 
  AlignLeft, Square, Ruler, CircleDollarSign, PaintBucket,
  Maximize, Minimize
} from 'lucide-react';

interface TileZone {
  id: string;
  type: 'floor' | 'wall';
  label: string;
  area: number;
  perimeter: number; // for skirting
  isWet: boolean; // Needs waterproofing
  substrate: 'screed' | 'tile' | 'plaster' | 'wood';
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const TileCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones ---
  const [zones, setZones] = useState<TileZone[]>([]);
  const [newZoneType, setNewZoneType] = useState<'floor' | 'wall'>('floor');
  const [newZoneLabel, setNewZoneLabel] = useState('Salon');
  const [newZoneArea, setNewZoneArea] = useState('');
  const [newZonePerim, setNewZonePerim] = useState('');
  const [newZoneWet, setNewZoneWet] = useState(false);

  // --- 2. Tile Specs ---
  const [tileLength, setTileLength] = useState(60); // cm
  const [tileWidth, setTileWidth] = useState(60);   // cm
  const [tileThickness, setTileThickness] = useState(9); // mm
  const [patternId, setPatternId] = useState('straight');
  const [boxSize, setBoxSize] = useState(1.44); // m2 per box
  const [wastePct, setWastePct] = useState(10); // Auto updated by pattern

  // --- 3. Glue & Grout ---
  const [glueType, setGlueType] = useState<'C2' | 'Flex' | 'Dispersion'>('C2');
  const [combSize, setCombSize] = useState(10); // mm
  const [doubleGluing, setDoubleGluing] = useState(false);
  const [jointWidth, setJointWidth] = useState(3); // mm
  const [jointType, setJointType] = useState<'cement' | 'epoxy'>('cement');
  const [useLevelingSystem, setUseLevelingSystem] = useState(false);

  // --- 4. Finishes ---
  const [useSkirting, setUseSkirting] = useState(true);
  const [skirtingHeight, setSkirtingHeight] = useState(7); // cm
  const [useWaterproofing, setUseWaterproofing] = useState(true); // SPEC/SEL
  const [usePrimer, setUsePrimer] = useState(true);

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    tileM2: getUnitPrice('TILE_M2'),
    glueBag: getUnitPrice('GLUE_BAG_25KG'),
    groutBag: getUnitPrice('GROUT_BAG_5KG'),
    epoxyKit: 60.00, // 3kg
    primerL: getUnitPrice('PRIMER_LITER'),
    specKit: 75.00, // Kit étanchéité sous carrelage (SPEC) ~6m2
    levelingKit: getUnitPrice('SPACERS_BOX'), // Croisillons/Cales (Sachet)
    skirtingM: getUnitPrice('SKIRTING_METER'),
    laborM2: 45.00,
    laborSkirting: 10.00, // €/ml
    laborSpec: 15.00, // €/m2
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers ---
  const addZone = () => {
    const area = parseFloat(newZoneArea);
    if (!area) return;
    const perim = parseFloat(newZonePerim) || Math.sqrt(area) * 4; // Approx if missing

    setZones([...zones, {
      id: Date.now().toString(),
      type: newZoneType,
      label: newZoneLabel,
      area,
      perimeter: perim,
      isWet: newZoneWet,
      substrate: 'screed'
    }]);
    
    // Reset inputs
    setNewZoneArea('');
    setNewZonePerim('');
    setNewZoneWet(false);
    setNewZoneLabel(newZoneType === 'floor' ? 'Chambre' : 'Douche Murs');
  };

  const removeZone = (id: string) => setZones(zones.filter(z => z.id !== id));

  // Update waste based on pattern
  useEffect(() => {
    const p = TILE_PATTERNS.find(pat => pat.id === patternId);
    if (p) setWastePct(p.waste);
  }, [patternId]);

  // Update double gluing advice
  useEffect(() => {
    if (Math.max(tileLength, tileWidth) >= 45) setDoubleGluing(true);
    else setDoubleGluing(false);
  }, [tileLength, tileWidth]);

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
      let totalArea = 0;
      let totalPerimeter = 0;
      let wetArea = 0;
      const materialsList: any[] = [];
      let totalCost = 0;
      const warnings: string[] = [];

      // 1. Surfaces
      zones.forEach(z => {
          totalArea += z.area;
          if (z.type === 'floor') totalPerimeter += z.perimeter; // Skirting usually on floor zones
          if (z.isWet) wetArea += z.area;
      });

      // 2. Tiles
      const areaWithWaste = totalArea * (1 + wastePct / 100);
      const boxes = Math.ceil(areaWithWaste / boxSize);
      const m2Ordered = boxes * boxSize;
      
      const costTiles = m2Ordered * prices.tileM2;
      totalCost += costTiles;

      materialsList.push({
          id: 'tiles',
          name: `Carrelage ${tileLength}x${tileWidth} (${patternId === 'diagonal' ? 'Diagonale' : 'Droit'})`,
          quantity: boxes,
          quantityRaw: areaWithWaste,
          unit: Unit.BOX,
          unitPrice: prices.tileM2 * boxSize, // Display price per box
          totalPrice: parseFloat(costTiles.toFixed(2)),
          category: CalculatorType.TILES,
          details: `Couverture: ${m2Ordered.toFixed(2)}m² (+${wastePct}%)`
      });

      // 3. Glue
      // Consumption: approx 3.5kg/m2 for 10mm comb. +2.5kg for double gluing.
      let glueConsump = 3.5;
      if (combSize <= 6) glueConsump = 2.5;
      if (combSize >= 12) glueConsump = 5.0;
      if (doubleGluing) glueConsump += 2.5;

      const glueKg = totalArea * glueConsump * 1.05; // 5% waste
      const glueBags = Math.ceil(glueKg / 25);
      const costGlue = glueBags * prices.glueBag;
      totalCost += costGlue;

      materialsList.push({
          id: 'glue',
          name: `Colle ${glueType} (Peigne ${combSize}mm${doubleGluing ? '+Double' : ''})`,
          quantity: glueBags,
          quantityRaw: glueKg,
          unit: Unit.BAG,
          unitPrice: prices.glueBag,
          totalPrice: parseFloat(costGlue.toFixed(2)),
          category: CalculatorType.TILES,
          details: `Conso: ${glueConsump}kg/m² (~${glueKg.toFixed(0)}kg)`
      });

      // 4. Grout
      // Formula: ((L+W)/(L*W)) * jointWidth * tileThick * density(1.6)
      // Dims in mm
      const L_mm = tileLength * 10;
      const W_mm = tileWidth * 10;
      const groutKgM2 = ((L_mm + W_mm) / (L_mm * W_mm)) * jointWidth * tileThickness * 1.6;
      const totalGroutKg = totalArea * groutKgM2 * 1.1; // 10% waste

      if (jointType === 'epoxy') {
          const kits = Math.ceil(totalGroutKg / 3); // 3kg kits
          const costEpoxy = kits * prices.epoxyKit;
          totalCost += costEpoxy;
          materialsList.push({ id: 'grout_epoxy', name: 'Joint Époxy (Kit 3kg)', quantity: kits, unit: Unit.BOX, unitPrice: prices.epoxyKit, totalPrice: costEpoxy, category: CalculatorType.TILES });
      } else {
          const bags = Math.ceil(totalGroutKg / 5); // 5kg bags
          const costGrout = bags * prices.groutBag;
          totalCost += costGrout;
          materialsList.push({ id: 'grout_cem', name: `Joint Ciment ${jointWidth}mm (Sac 5kg)`, quantity: bags, unit: Unit.BAG, unitPrice: prices.groutBag, totalPrice: costGrout, category: CalculatorType.TILES });
      }

      // 5. Primer
      if (usePrimer) {
          const liters = Math.ceil(totalArea / 8); // 8m2/L approx
          const costPrimer = liters * prices.primerL;
          totalCost += costPrimer;
          materialsList.push({ id: 'primer', name: 'Primaire d\'accrochage', quantity: liters, unit: Unit.LITER, unitPrice: prices.primerL, totalPrice: costPrimer, category: CalculatorType.TILES });
      }

      // 6. Waterproofing (SPEC)
      if (useWaterproofing && wetArea > 0) {
          // 1 kit covers ~6m2
          const kits = Math.ceil(wetArea / 6);
          const costSpec = kits * prices.specKit;
          totalCost += costSpec;
          materialsList.push({ id: 'spec', name: 'Kit Étanchéité (SPEC)', quantity: kits, unit: Unit.BOX, unitPrice: prices.specKit, totalPrice: costSpec, category: CalculatorType.TILES, details: `Zones humides: ${wetArea}m²` });
      } else if (wetArea > 0) {
          warnings.push("Attention : Zone humide détectée sans étanchéité (SPEC) sélectionnée.");
      }

      // 7. Skirtings
      if (useSkirting && totalPerimeter > 0) {
          const lm = Math.ceil(totalPerimeter * 1.05);
          const costSkirt = lm * prices.skirtingM;
          totalCost += costSkirt;
          materialsList.push({ id: 'skirting', name: 'Plinthes assorties', quantity: lm, unit: Unit.METER, unitPrice: prices.skirtingM, totalPrice: costSkirt, category: CalculatorType.TILES });
      }

      // 8. Accessories
      if (useLevelingSystem) {
          // Approx 4 per tile / 10m2
          // clips per m2 approx = 4 / tileAreaM2
          const tileArea = (tileLength/100) * (tileWidth/100);
          const clipsCount = Math.ceil((totalArea / tileArea) * 4); // simplistic
          const bags = Math.ceil(clipsCount / 250); // 250 pcs bag
          const costLev = bags * prices.levelingKit;
          totalCost += costLev;
          materialsList.push({ id: 'leveling', name: 'Kit Nivellement (Sachet)', quantity: bags, unit: Unit.BAG, unitPrice: prices.levelingKit, totalPrice: costLev, category: CalculatorType.TILES });
      }

      // 9. Labor
      if (proMode) {
          const labTiling = totalArea * prices.laborM2;
          const labSkirt = (useSkirting ? totalPerimeter : 0) * prices.laborSkirting;
          const labSpec = (useWaterproofing ? wetArea : 0) * prices.laborSpec;
          
          const totalLab = labTiling + labSkirt + labSpec;
          totalCost += totalLab;
          
          materialsList.push({ id: 'labor_tiling', name: 'Main d\'œuvre (Pose)', quantity: parseFloat(totalArea.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborM2, totalPrice: labTiling, category: CalculatorType.TILES });
          if (labSkirt > 0) materialsList.push({ id: 'labor_skirt', name: 'Main d\'œuvre (Plinthes)', quantity: parseFloat(totalPerimeter.toFixed(1)), unit: Unit.METER, unitPrice: prices.laborSkirting, totalPrice: labSkirt, category: CalculatorType.TILES });
          if (labSpec > 0) materialsList.push({ id: 'labor_spec', name: 'Main d\'œuvre (Étanchéité)', quantity: parseFloat(wetArea.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborSpec, totalPrice: labSpec, category: CalculatorType.TILES });
      }

      // Warnings
      if (Math.max(tileLength, tileWidth) >= 60 && !doubleGluing) warnings.push("Grand format (>60cm) : Double encollage fortement recommandé.");
      if (patternId === 'diagonal' && wastePct < 10) warnings.push("Pose diagonale : prévoyez au moins 10-15% de perte.");

      return {
          totalCost,
          materials: materialsList,
          totalArea,
          warnings
      };

  }, [zones, tileLength, tileWidth, tileThickness, patternId, boxSize, wastePct, glueType, combSize, doubleGluing, jointWidth, jointType, useLevelingSystem, useSkirting, useWaterproofing, usePrimer, prices, proMode]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${calculationData.totalArea.toFixed(1)} m² de carrelage`,
          details: [
              { label: 'Surface Totale', value: calculationData.totalArea.toFixed(1), unit: 'm²' },
              { label: 'Format', value: `${tileLength}x${tileWidth}`, unit: 'cm' },
              { label: 'Pose', value: patternId === 'diagonal' ? 'Diagonale' : 'Droite', unit: '' }
          ],
          materials: calculationData.materials,
          totalCost: parseFloat(calculationData.totalCost.toFixed(2)),
          warnings: calculationData.warnings.length > 0 ? calculationData.warnings : undefined
      });
  }, [calculationData]);

  return (
    <div className="space-y-6 animate-in fade-in">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4, 5].map(s => (
            <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Zones'}
                {s === 2 && '2. Carreaux'}
                {s === 3 && '3. Pose'}
                {s === 4 && '4. Finitions'}
                {s === 5 && '5. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: ZONES */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Home size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Définissez les surfaces à carreler (sols et murs).
                </div>

                <div className="space-y-2">
                    {zones.map(z => (
                        <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                            <div>
                                <span className="font-bold text-slate-700 flex items-center">
                                    {z.type === 'floor' ? <AlignLeft size={14} className="mr-1 rotate-90"/> : <AlignLeft size={14} className="mr-1"/>}
                                    {z.label}
                                </span>
                                <span className="text-xs text-slate-500">
                                    {z.area} m² {z.type==='floor' ? `• P: ${z.perimeter}m` : ''} {z.isWet && <span className="text-blue-500 font-bold">• Humide</span>}
                                </span>
                            </div>
                            <button onClick={() => removeZone(z.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
                    <div className="flex bg-white rounded p-1 mb-3 border border-slate-200">
                        <button onClick={() => {setNewZoneType('floor'); setNewZoneLabel('Sol Salon')}} className={`flex-1 py-1.5 text-xs font-bold rounded ${newZoneType === 'floor' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}>Sol</button>
                        <button onClick={() => {setNewZoneType('wall'); setNewZoneLabel('Mur SDB')}} className={`flex-1 py-1.5 text-xs font-bold rounded ${newZoneType === 'wall' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}>Mur</button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" placeholder="Nom" value={newZoneLabel} onChange={e => setNewZoneLabel(e.target.value)} className="col-span-2 w-full p-2 text-xs border rounded bg-white text-slate-900"/>
                        <input type="number" placeholder="Surface (m²)" value={newZoneArea} onChange={e => setNewZoneArea(e.target.value)} className="w-full p-2 text-xs border rounded bg-white text-slate-900"/>
                        <input type="number" placeholder="Périm. (m)" value={newZonePerim} onChange={e => setNewZonePerim(e.target.value)} className="w-full p-2 text-xs border rounded bg-white text-slate-900"/>
                    </div>
                    <label className="flex items-center space-x-2 mb-3">
                        <input type="checkbox" checked={newZoneWet} onChange={e => setNewZoneWet(e.target.checked)} className="rounded text-blue-600"/>
                        <span className="text-xs text-slate-600">Zone Humide (SDB / Douche)</span>
                    </label>
                    <button onClick={addZone} className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs flex justify-center items-center">
                        <Plus size={14} className="mr-1"/> Ajouter Zone
                    </button>
                </div>

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: TILES SPECS */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Grid3X3 size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Format et type de pose.
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (cm)</label>
                        <input type="number" value={tileLength} onChange={(e) => setTileLength(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900 font-bold"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (cm)</label>
                        <input type="number" value={tileWidth} onChange={(e) => setTileWidth(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900 font-bold"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Épaisseur (mm)</label>
                        <input type="number" value={tileThickness} onChange={(e) => setTileThickness(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">m² / carton</label>
                        <input type="number" value={boxSize} onChange={(e) => setBoxSize(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type de pose</label>
                    <div className="grid grid-cols-3 gap-2">
                        {TILE_PATTERNS.map(p => (
                            <button 
                                key={p.id} 
                                onClick={() => setPatternId(p.id)}
                                className={`p-2 rounded border text-xs font-medium text-center ${patternId === p.id ? 'bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500' : 'bg-white text-slate-500'}`}
                            >
                                {p.label.split(' ')[1]}
                                <span className="block text-[10px] opacity-70">+{p.waste}%</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: GLUE & GROUT */}
        {step === 3 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Layers size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Colle, joints et nivellement.
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Encollage</h4>
                    <div className="flex justify-between items-center bg-white p-2 rounded border">
                        <span className="text-sm font-medium">Double Encollage</span>
                        <input type="checkbox" checked={doubleGluing} onChange={e => setDoubleGluing(e.target.checked)} className="h-5 w-5 rounded text-blue-600"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Type Colle</label>
                            <select value={glueType} onChange={e => setGlueType(e.target.value as any)} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                                <option value="C2">C2 (Standard)</option>
                                <option value="Flex">C2S1 (Flex)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Peigne (mm)</label>
                            <select value={combSize} onChange={e => setCombSize(Number(e.target.value))} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                                <option value={6}>6 mm</option>
                                <option value={8}>8 mm</option>
                                <option value={10}>10 mm</option>
                                <option value={12}>12 mm</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Joints & Accessoires</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Largeur (mm)</label>
                            <input type="number" value={jointWidth} onChange={(e) => setJointWidth(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-sm text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">Type Mortier</label>
                            <select value={jointType} onChange={e => setJointType(e.target.value as any)} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                                <option value="cement">Ciment</option>
                                <option value="epoxy">Époxy (Étanche)</option>
                            </select>
                        </div>
                    </div>
                    <label className="flex items-center space-x-2 pt-1">
                        <input type="checkbox" checked={useLevelingSystem} onChange={e => setUseLevelingSystem(e.target.checked)} className="rounded text-blue-600"/>
                        <span className="text-sm text-slate-700">Système de nivellement (Cales)</span>
                    </label>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 4: FINISHES */}
        {step === 4 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <PaintBucket size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Préparation, étanchéité et plinthes.
                </div>

                <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                        <div>
                            <span className="text-sm font-bold text-slate-700">Primaire d'accrochage</span>
                            <p className="text-[10px] text-slate-400">Indispensable sur support poreux</p>
                        </div>
                        <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                        <div>
                            <span className="text-sm font-bold text-slate-700 flex items-center"><Droplets size={14} className="mr-1 text-blue-500"/> Étanchéité (SPEC)</span>
                            <p className="text-[10px] text-slate-400">Zones humides uniquement</p>
                        </div>
                        <input type="checkbox" checked={useWaterproofing} onChange={(e) => setUseWaterproofing(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                        <div>
                            <span className="text-sm font-bold text-slate-700">Plinthes</span>
                            <p className="text-[10px] text-slate-400">Périmètre des pièces</p>
                        </div>
                        <input type="checkbox" checked={useSkirting} onChange={(e) => setUseSkirting(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 5: PRICING */}
        {step === 5 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajustez les prix unitaires pour finaliser le devis.
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Tarifs Unitaires</h4>
                        <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                            <Settings size={12} className="mr-1"/> {proMode ? 'Mode Pro' : 'Mode Simple'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Carrelage (€/m²)</label>
                            <input type="number" value={prices.tileM2} onChange={e => updatePrice('tileM2', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Colle (25kg)</label>
                            <input type="number" value={prices.glueBag} onChange={e => updatePrice('glueBag', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Joint (5kg)</label>
                            <input type="number" value={prices.groutBag} onChange={e => updatePrice('groutBag', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        {useSkirting && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Plinthe (€/ml)</label>
                                <input type="number" value={prices.skirtingM} onChange={e => updatePrice('skirtingM', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {useWaterproofing && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Kit SPEC (€)</label>
                                <input type="number" value={prices.specKit} onChange={e => updatePrice('specKit', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose Carrelage (€/m²)</label>
                                <input type="number" value={prices.laborM2} onChange={e => updatePrice('laborM2', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose Plinthe (€/ml)</label>
                                <input type="number" value={prices.laborSkirting} onChange={e => updatePrice('laborSkirting', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
                      <Check size={18} className="mr-2"/> Terminé
                   </button>
                </div>
            </div>
        )}
    </div>
  );
};
