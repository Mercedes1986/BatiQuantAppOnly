
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES, PAINT_SUBSTRATES } from '../../constants';
import { getUnitPrice } from '../../services/materialsService';
import { 
  PaintBucket, Plus, Trash2, Home, LayoutGrid, Settings, Check, 
  ArrowRight, Info, AlertTriangle, Brush, PaintRoller, 
  Scaling, Layers, Eraser, CircleDollarSign, BoxSelect
} from 'lucide-react';

interface PaintRoom {
  id: string;
  label: string;
  length: number;
  width: number;
  height: number;
  doors: number;
  windows: number;
  includeCeiling: boolean;
  includeWalls: boolean;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const PaintCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones & Surfaces ---
  const [rooms, setRooms] = useState<PaintRoom[]>([]);
  const [newRoomLabel, setNewRoomLabel] = useState('Salon');
  const [newL, setNewL] = useState('');
  const [newW, setNewW] = useState('');
  const [newH, setNewH] = useState('2.5');
  
  // --- 2. Prep & Substrate ---
  const [substrateState, setSubstrateState] = useState<'good' | 'medium' | 'bad'>('good'); // Bon, Moyen (trous), Mauvais (fissures/irrégulier)
  const [usePrimer, setUsePrimer] = useState(true);
  const [useFiller, setUseFiller] = useState(false); // Rebouchage
  const [useSmoothing, setUseSmoothing] = useState(false); // Lissage/Ratissage
  
  // --- 3. Paint Specs ---
  const [ceilingLayers, setCeilingLayers] = useState(2);
  const [wallLayers, setWallLayers] = useState(2);
  const [paintTypeWall, setPaintTypeWall] = useState<'acry_mat' | 'acry_satin' | 'velours'>('velours');
  const [paintTypeCeiling, setPaintTypeCeiling] = useState<'acry_mat' | 'acry_satin'>('acry_mat');
  const [paintWood, setPaintWood] = useState(false); // Doors & Plinths

  // --- 4. Supplies ---
  const [protectFloor, setProtectFloor] = useState(true);
  const [useTape, setUseTape] = useState(true);

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    primerL: getUnitPrice('PRIMER_LITER'),
    paintWallL: getUnitPrice('PAINT_LITER'),
    paintCeilingL: getUnitPrice('PAINT_LITER') * 0.9, 
    paintWoodL: 25.00,
    fillerKg: 4.00,
    smoothingKg: 3.00,
    tapeRoll: 4.00,
    tarpUnit: 15.00,
    kitTools: 45.00,
    laborPrepM2: 15.00,
    laborPaintM2: 25.00
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers ---
  const addRoom = () => {
    const l = parseFloat(newL);
    const w = parseFloat(newW);
    const h = parseFloat(newH);
    if (!l || !w || !h) return;

    setRooms([...rooms, {
      id: Date.now().toString(),
      label: newRoomLabel || `Pièce ${rooms.length + 1}`,
      length: l,
      width: w,
      height: h,
      doors: 1,
      windows: 1,
      includeCeiling: true,
      includeWalls: true
    }]);
    setNewL(''); setNewW(''); setNewRoomLabel('Chambre');
  };

  const removeRoom = (id: string) => setRooms(rooms.filter(r => r.id !== id));
  
  const updateRoom = (id: string, field: keyof PaintRoom, val: any) => {
      setRooms(rooms.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  // Auto-set prep based on state
  useEffect(() => {
      if (substrateState === 'good') {
          setUseFiller(false);
          setUseSmoothing(false);
      } else if (substrateState === 'medium') {
          setUseFiller(true);
          setUseSmoothing(false);
      } else { // bad
          setUseFiller(true);
          setUseSmoothing(true);
      }
  }, [substrateState]);

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let areaWalls = 0;
    let areaCeiling = 0;
    let areaWood = 0;
    let perimeterTotal = 0;
    
    // Geometry
    rooms.forEach(r => {
        const floorArea = r.length * r.width;
        const perimeter = 2 * (r.length + r.width);
        const grossWallArea = perimeter * r.height;
        
        // Deductions (approx standard sizes)
        const doorArea = 1.6; // 2 * 0.8
        const windowArea = 1.5; // 1.2 * 1.25 approx
        const deductions = (r.doors * doorArea) + (r.windows * windowArea);
        
        const netWallArea = Math.max(0, grossWallArea - deductions);

        if (r.includeWalls) areaWalls += netWallArea;
        if (r.includeCeiling) areaCeiling += floorArea;
        
        perimeterTotal += perimeter;
        
        // Woodwork area approx: Doors (both sides if painted) + Skirting (Perimeter * 10cm)
        if (paintWood) {
            areaWood += (r.doors * doorArea * 2 * 0.2) + (perimeter * 0.1); // Assuming 20% of door is frame/trim or full door paint
        }
    });

    const materialsList: any[] = [];
    let totalCost = 0;

    // 1. Preparation
    if (useFiller) {
        // Spot filling: approx 0.2kg/m2 distributed
        const kgFiller = (areaWalls + areaCeiling) * 0.2; 
        const costFiller = Math.ceil(kgFiller) * prices.fillerKg;
        totalCost += costFiller;
        materialsList.push({ id: 'filler', name: 'Enduit de rebouchage', quantity: Math.ceil(kgFiller), unit: Unit.KG, unitPrice: prices.fillerKg, totalPrice: costFiller, category: CalculatorType.PAINT });
    }
    if (useSmoothing) {
        // Full skim coat: approx 1kg/m2/coat (usually 1 or 2 coats). Let's assume 1.5kg/m2 total
        const kgSmooth = (areaWalls + areaCeiling) * 1.5;
        const costSmooth = Math.ceil(kgSmooth) * prices.smoothingKg;
        totalCost += costSmooth;
        materialsList.push({ id: 'smooth', name: 'Enduit de lissage (Ratissage)', quantity: Math.ceil(kgSmooth), unit: Unit.KG, unitPrice: prices.smoothingKg, totalPrice: costSmooth, category: CalculatorType.PAINT });
    }

    // 2. Primers
    if (usePrimer) {
        // 10m2/L
        const volPrimer = (areaWalls + areaCeiling) / 10;
        const buckets = Math.ceil(volPrimer / 10); // 10L buckets
        const costP = Math.ceil(volPrimer) * prices.primerL;
        totalCost += costP;
        materialsList.push({ id: 'primer', name: 'Sous-couche (Impression)', quantity: Math.ceil(volPrimer), unit: Unit.LITER, unitPrice: prices.primerL, totalPrice: costP, category: CalculatorType.PAINT });
    }

    // 3. Paints
    // Ceiling: 10m2/L/coat
    const volCeiling = (areaCeiling * ceilingLayers) / 10;
    const costCeiling = Math.ceil(volCeiling) * prices.paintCeilingL;
    totalCost += costCeiling;
    if (areaCeiling > 0) {
        materialsList.push({ id: 'paint_ceil', name: `Peinture Plafond (${paintTypeCeiling})`, quantity: Math.ceil(volCeiling), unit: Unit.LITER, unitPrice: prices.paintCeilingL, totalPrice: costCeiling, category: CalculatorType.PAINT, details: `${ceilingLayers} couches` });
    }

    // Walls: 10m2/L/coat
    const volWalls = (areaWalls * wallLayers) / 10;
    const costWalls = Math.ceil(volWalls) * prices.paintWallL;
    totalCost += costWalls;
    if (areaWalls > 0) {
        materialsList.push({ id: 'paint_wall', name: `Peinture Murs (${paintTypeWall})`, quantity: Math.ceil(volWalls), unit: Unit.LITER, unitPrice: prices.paintWallL, totalPrice: costWalls, category: CalculatorType.PAINT, details: `${wallLayers} couches` });
    }

    // Wood
    if (areaWood > 0) {
        const volWood = (areaWood * 2) / 12; // 2 coats, 12m2/L
        const costWood = Math.ceil(volWood) * prices.paintWoodL;
        totalCost += costWood;
        materialsList.push({ id: 'paint_wood', name: 'Peinture Boiseries (Laque)', quantity: Math.ceil(volWood), unit: Unit.LITER, unitPrice: prices.paintWoodL, totalPrice: costWood, category: CalculatorType.PAINT });
    }

    // 4. Consumables
    if (protectFloor) {
        const floorTotal = areaCeiling; // Same as floor area
        // Tarps usually 20m2
        const tarps = Math.ceil(floorTotal / 20);
        const costTarp = tarps * prices.tarpUnit;
        totalCost += costTarp;
        materialsList.push({ id: 'tarp', name: 'Bâches de protection', quantity: tarps, unit: Unit.PIECE, unitPrice: prices.tarpUnit, totalPrice: costTarp, category: CalculatorType.PAINT });
    }
    if (useTape) {
        // Perimeter * 2 (top/bottom) + around doors/windows
        // Rough estimate: Perimeter * 3
        const tapeM = perimeterTotal * 3;
        const rolls = Math.ceil(tapeM / 50); // 50m rolls
        const costTape = rolls * prices.tapeRoll;
        totalCost += costTape;
        materialsList.push({ id: 'tape', name: 'Ruban de masquage', quantity: rolls, unit: Unit.PIECE, unitPrice: prices.tapeRoll, totalPrice: costTape, category: CalculatorType.PAINT });
    }
    
    // Tools Kit
    totalCost += prices.kitTools;
    materialsList.push({ id: 'tools', name: 'Kit Rouleaux / Pinceaux / Bacs', quantity: 1, unit: Unit.PACKAGE, unitPrice: prices.kitTools, totalPrice: prices.kitTools, category: CalculatorType.PAINT });

    // 5. Labor
    if (proMode) {
        const totalSurf = areaWalls + areaCeiling;
        const costLabPrep = totalSurf * prices.laborPrepM2 * (substrateState === 'bad' ? 1.5 : 1);
        const costLabPaint = totalSurf * prices.laborPaintM2;
        
        totalCost += costLabPrep + costLabPaint;
        
        materialsList.push(
            { id: 'lab_prep', name: 'Main d\'œuvre Préparation', quantity: parseFloat(totalSurf.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborPrepM2, totalPrice: costLabPrep, category: CalculatorType.PAINT },
            { id: 'lab_paint', name: 'Main d\'œuvre Mise en peinture', quantity: parseFloat(totalSurf.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborPaintM2, totalPrice: costLabPaint, category: CalculatorType.PAINT }
        );
    }

    return {
        totalCost,
        materials: materialsList,
        areaWalls,
        areaCeiling
    };

  }, [rooms, substrateState, usePrimer, useFiller, useSmoothing, ceilingLayers, wallLayers, paintTypeWall, paintTypeCeiling, paintWood, protectFloor, useTape, prices, proMode]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${(calculationData.areaWalls + calculationData.areaCeiling).toFixed(1)} m² à peindre`,
          details: [
              { label: 'Surface Murs', value: calculationData.areaWalls.toFixed(1), unit: 'm²' },
              { label: 'Surface Plafonds', value: calculationData.areaCeiling.toFixed(1), unit: 'm²' },
              { label: 'État support', value: substrateState === 'good' ? 'Bon' : substrateState === 'medium' ? 'Moyen' : 'Mauvais', unit: '' }
          ],
          materials: calculationData.materials,
          totalCost: parseFloat(calculationData.totalCost.toFixed(2))
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
                {s === 2 && '2. État'}
                {s === 3 && '3. Peinture'}
                {s === 4 && '4. Outils'}
                {s === 5 && '5. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: ZONES */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Définissez les pièces pour calculer précisément les surfaces de murs et plafonds.
                </div>

                <div className="space-y-3">
                    {rooms.map(r => (
                        <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-3 relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-700">{r.label}</span>
                                <button onClick={() => removeRoom(r.id)} className="text-red-400"><Trash2 size={16}/></button>
                            </div>
                            <div className="text-xs text-slate-500 mb-2">
                                {r.length}x{r.width}m • H: {r.height}m • {r.doors} Porte(s) • {r.windows} Fenêtre(s)
                            </div>
                            <div className="flex gap-2 border-t pt-2">
                                <label className="flex items-center text-xs">
                                    <input type="checkbox" checked={r.includeCeiling} onChange={e => updateRoom(r.id, 'includeCeiling', e.target.checked)} className="mr-1 rounded text-blue-600"/>
                                    Plafond
                                </label>
                                <label className="flex items-center text-xs">
                                    <input type="checkbox" checked={r.includeWalls} onChange={e => updateRoom(r.id, 'includeWalls', e.target.checked)} className="mr-1 rounded text-blue-600"/>
                                    Murs
                                </label>
                            </div>
                        </div>
                    ))}

                    {/* Add Room Form */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-blue-200">
                        <input type="text" placeholder="Nom (ex: Salon)" value={newRoomLabel} onChange={e => setNewRoomLabel(e.target.value)} className="w-full p-2 mb-2 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <input type="number" placeholder="L (m)" value={newL} onChange={e => setNewL(e.target.value)} className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                            <input type="number" placeholder="l (m)" value={newW} onChange={e => setNewW(e.target.value)} className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                            <input type="number" placeholder="H (m)" value={newH} onChange={e => setNewH(e.target.value)} className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <button onClick={addRoom} className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm flex justify-center items-center"><Plus size={16}/></button>
                    </div>
                </div>

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: PREP & STATE */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Eraser size={16} className="mr-2 shrink-0 mt-0.5"/>
                   État des supports. Une mauvaise préparation est la cause n°1 des défauts.
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">État général</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setSubstrateState('good')} className={`p-2 rounded border text-xs font-bold text-center ${substrateState === 'good' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-white'}`}>Bon</button>
                        <button onClick={() => setSubstrateState('medium')} className={`p-2 rounded border text-xs font-bold text-center ${substrateState === 'medium' ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-white'}`}>Moyen</button>
                        <button onClick={() => setSubstrateState('bad')} className={`p-2 rounded border text-xs font-bold text-center ${substrateState === 'bad' ? 'bg-red-50 border-red-500 text-red-800' : 'bg-white'}`}>Mauvais</button>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Actions recommandées</h4>
                    <label className="flex items-center justify-between">
                        <span className="text-sm">Rebouchage (Trous)</span>
                        <input type="checkbox" checked={useFiller} onChange={e => setUseFiller(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between">
                        <span className="text-sm">Lissage / Ratissage</span>
                        <input type="checkbox" checked={useSmoothing} onChange={e => setUseSmoothing(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between">
                        <div>
                            <span className="text-sm block">Sous-couche (Impression)</span>
                            <span className="text-[10px] text-slate-400">Bloque le fond, économise la finition</span>
                        </div>
                        <input type="checkbox" checked={usePrimer} onChange={e => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: PAINTS */}
        {step === 3 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <PaintBucket size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Configuration des peintures de finition.
                </div>

                {/* Ceiling */}
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Plafonds</h4>
                    <div className="flex gap-2 mb-2">
                        <select value={paintTypeCeiling} onChange={e => setPaintTypeCeiling(e.target.value as any)} className="flex-1 p-2 text-sm border border-slate-300 rounded bg-white text-slate-900">
                            <option value="acry_mat">Mat (Standard)</option>
                            <option value="acry_satin">Satin (Humide)</option>
                        </select>
                        <select value={ceilingLayers} onChange={e => setCeilingLayers(Number(e.target.value))} className="w-20 p-2 text-sm border border-slate-300 rounded bg-white text-slate-900">
                            <option value={1}>1 ch.</option>
                            <option value={2}>2 ch.</option>
                        </select>
                    </div>
                </div>

                {/* Walls */}
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Murs</h4>
                    <div className="flex gap-2 mb-2">
                        <select value={paintTypeWall} onChange={e => setPaintTypeWall(e.target.value as any)} className="flex-1 p-2 text-sm border border-slate-300 rounded bg-white text-slate-900">
                            <option value="acry_mat">Mat</option>
                            <option value="velours">Velours (Ideal)</option>
                            <option value="acry_satin">Satin (Lessivable)</option>
                        </select>
                        <select value={wallLayers} onChange={e => setWallLayers(Number(e.target.value))} className="w-20 p-2 text-sm border border-slate-300 rounded bg-white text-slate-900">
                            <option value={1}>1 ch.</option>
                            <option value={2}>2 ch.</option>
                        </select>
                    </div>
                </div>

                {/* Wood */}
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm font-bold text-slate-700">Peindre boiseries (Portes/Plinthes)</span>
                        <input type="checkbox" checked={paintWood} onChange={e => setPaintWood(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 4: SUPPLIES */}
        {step === 4 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <BoxSelect size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Protections et outillage.
                </div>

                <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <div>
                            <span className="text-sm font-medium block">Protection Sol (Bâche)</span>
                            <span className="text-[10px] text-slate-400">Surface totale au sol</span>
                        </div>
                        <input type="checkbox" checked={protectFloor} onChange={e => setProtectFloor(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <div>
                            <span className="text-sm font-medium block">Ruban Masquage (Scotch)</span>
                            <span className="text-[10px] text-slate-400">Périphérie + Ouvertures</span>
                        </div>
                        <input type="checkbox" checked={useTape} onChange={e => setUseTape(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <div className="p-2 bg-slate-50 rounded text-xs text-slate-600">
                        Inclus: Kit outillage (Rouleaux, pinceaux, bacs) ~45€
                    </div>
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
                            <label className="block text-[10px] text-slate-500 mb-1">Peinture Mur (€/L)</label>
                            <input type="number" value={prices.paintWallL} onChange={e => updatePrice('paintWallL', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Peinture Plafond (€/L)</label>
                            <input type="number" value={prices.paintCeilingL} onChange={e => updatePrice('paintCeilingL', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                        </div>
                        {usePrimer && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Sous-couche (€/L)</label>
                                <input type="number" value={prices.primerL} onChange={e => updatePrice('primerL', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {useFiller && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Enduit Rebouch. (€/kg)</label>
                                <input type="number" value={prices.fillerKg} onChange={e => updatePrice('fillerKg', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {useSmoothing && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Enduit Lissage (€/kg)</label>
                                <input type="number" value={prices.smoothingKg} onChange={e => updatePrice('smoothingKg', e.target.value)} className="w-full p-1.5 border border-slate-300 rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Prépa (€/m²)</label>
                                <input type="number" value={prices.laborPrepM2} onChange={e => updatePrice('laborPrepM2', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Peinture (€/m²)</label>
                                <input type="number" value={prices.laborPaintM2} onChange={e => updatePrice('laborPaintM2', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
                      <Check size={18} className="mr-2"/> Terminé
                   </button>
                </div>
            </div>
        )}
    </div>
  );
};
