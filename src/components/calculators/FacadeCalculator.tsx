
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES, OPENING_PRESETS } from '../../constants';
import { 
  PaintRoller, Ruler, LayoutTemplate, Brush, Layers, 
  Hammer, ScanLine, Settings, Check, ArrowRight, 
  Info, AlertTriangle, Home, Maximize, CircleDollarSign,
  Eraser, BrickWall, Box, Trash2, Plus
} from 'lucide-react';

interface FacadeOpening {
  id: string;
  type: 'window' | 'door' | 'garage' | 'bay';
  label: string;
  width: number;
  height: number;
  quantity: number;
  revealDepth: number; // cm (Tableau)
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const FacadeCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Geometry ---
  const [geoMode, setGeoMode] = useState<'rect' | 'simple'>('rect'); // House (L/W) or Perimeter
  const [dimL, setDimL] = useState('');
  const [dimW, setDimW] = useState('');
  const [dimH, setDimH] = useState('3'); // Height under eaves
  const [perimeter, setPerimeter] = useState('');
  
  const [hasGables, setHasGables] = useState(false);
  const [gableHeight, setGableHeight] = useState('1.5');
  const [numGables, setNumGables] = useState(2);

  // --- 2. Openings ---
  const [openings, setOpenings] = useState<FacadeOpening[]>([]);
  const [newOpType, setNewOpType] = useState<FacadeOpening['type']>('window');
  const [newOpW, setNewOpW] = useState('1.20');
  const [newOpH, setNewOpH] = useState('1.25');
  const [newOpReveal, setNewOpReveal] = useState('20'); // cm

  // --- 3. Works Selection ---
  const [doCleaning, setDoCleaning] = useState(true);
  const [doRepair, setDoRepair] = useState(false);
  const [doCoating, setDoCoating] = useState(false); // Enduit
  const [doPaint, setDoPaint] = useState(false);
  const [doITE, setDoITE] = useState(false); // Isolation
  const [doCladding, setDoCladding] = useState(false); // Bardage

  // --- 4. Specs ---
  // Cleaning
  const [cleanType, setCleanType] = useState<'wash' | 'moss' | 'strip'>('moss');
  // Repair
  const [crackLen, setCrackLen] = useState('0'); // ml
  // Coating
  const [coatingType, setCoatingType] = useState<'mono' | 'rpe'>('mono');
  const [coatingThick, setCoatingThick] = useState(15); // mm
  // Paint
  const [paintType, setPaintType] = useState<'acry' | 'plio' | 'silo'>('silo');
  const [paintLayers, setPaintLayers] = useState(2);
  // ITE
  const [iteThick, setIteThick] = useState(120); // mm
  const [iteType, setIteType] = useState('pse');
  // Cladding
  const [claddingType, setCladdingType] = useState<'wood' | 'composite'>('wood');
  
  // Access
  const [scaffold, setScaffold] = useState(false);

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    cleanM2: 5.00, // Lavage
    mossM2: 8.00, // Démoussage
    repairMl: 15.00, // Fissures
    coatingBag: DEFAULT_PRICES.FACADE_COATING_BAG, // Enduit
    paintL: 15.00,
    iteM2: 60.00, // Matériel ITE complet
    claddingM2: 45.00,
    scaffoldFixed: 1000.00, // Forfait montage/démontage
    scaffoldRent: 10.00, // €/j or simple flat fee add-on
    laborM2: 45.00,
    laborScaffold: 15.00 // €/m2 échafaudage
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers ---
  const addOpening = () => {
    if (!newOpW || !newOpH) return;
    setOpenings([...openings, {
      id: Date.now().toString(),
      type: newOpType,
      label: newOpType === 'window' ? 'Fenêtre' : newOpType === 'door' ? 'Porte' : newOpType === 'bay' ? 'Baie' : 'Garage',
      width: parseFloat(newOpW),
      height: parseFloat(newOpH),
      quantity: 1,
      revealDepth: parseFloat(newOpReveal) || 0
    }]);
  };

  const removeOpening = (id: string) => setOpenings(openings.filter(o => o.id !== id));

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
      let grossArea = 0;
      let totalPerimeter = 0;
      
      // 1. Geometry
      const h = parseFloat(dimH) || 0;
      if (geoMode === 'rect') {
          const L = parseFloat(dimL) || 0;
          const W = parseFloat(dimW) || 0;
          totalPerimeter = (L + W) * 2;
          grossArea = totalPerimeter * h;
          
          if (hasGables) {
              const hG = parseFloat(gableHeight) || 0;
              // Gable area = 0.5 * base * height. Base is typically the Width side.
              const gableArea = 0.5 * W * hG * numGables;
              grossArea += gableArea;
          }
      } else {
          totalPerimeter = parseFloat(perimeter) || 0;
          grossArea = totalPerimeter * h;
      }

      // 2. Deductions & Reveals (Tableaux)
      let openingsArea = 0;
      let revealsArea = 0;
      let revealsLinear = 0; // For corner profiles

      openings.forEach(op => {
          const opSurf = op.width * op.height * op.quantity;
          openingsArea += opSurf;
          
          // Reveal: (2H + W) * depth. Bottom usually implies a sill (appui)
          const perimOp = (op.height * 2) + op.width; 
          const revSurf = perimOp * (op.revealDepth / 100) * op.quantity;
          revealsArea += revSurf;
          revealsLinear += perimOp * op.quantity;
      });

      const netArea = Math.max(0, grossArea - openingsArea);
      const treatableArea = netArea + revealsArea; // Area to clean/paint/coat

      // 3. Materials & Works
      const materialsList: any[] = [];
      let totalCost = 0;
      const warnings: string[] = [];

      // A. Cleaning
      if (doCleaning) {
          const costClean = treatableArea * (cleanType === 'moss' ? prices.mossM2 : prices.cleanM2);
          totalCost += costClean;
          materialsList.push({
              id: 'clean',
              name: cleanType === 'moss' ? 'Nettoyage + Démoussage' : 'Lavage HP',
              quantity: Math.ceil(treatableArea),
              quantityRaw: treatableArea,
              unit: Unit.M2,
              unitPrice: cleanType === 'moss' ? prices.mossM2 : prices.cleanM2,
              totalPrice: parseFloat(costClean.toFixed(2)),
              category: CalculatorType.FACADE
          });
      }

      // B. Repair
      if (doRepair) {
          const cracks = parseFloat(crackLen) || 0;
          if (cracks > 0) {
              const costRep = cracks * prices.repairMl;
              totalCost += costRep;
              materialsList.push({
                  id: 'repair',
                  name: 'Traitement Fissures',
                  quantity: cracks,
                  unit: Unit.METER,
                  unitPrice: prices.repairMl,
                  totalPrice: costRep,
                  category: CalculatorType.FACADE,
                  details: 'Ouverture + Mastic/Mortier'
              });
          }
      }

      // C. Coating (Enduit)
      if (doCoating) {
          // Consumption: approx 1.5kg/m2/mm -> 15mm = 22.5kg/m2
          // Bag 25kg
          const kgPerM2 = coatingType === 'rpe' ? 3 : (1.5 * (Number(coatingThick) || 15)); 
          const totalKg = treatableArea * kgPerM2 * 1.05; // 5% waste
          const bags = Math.ceil(totalKg / 25);
          
          const costCoat = bags * prices.coatingBag;
          totalCost += costCoat;
          
          materialsList.push({
              id: 'coating',
              name: coatingType === 'rpe' ? 'RPE (Revêtement Plastique Épais)' : `Enduit Monocouche (${coatingThick}mm)`,
              quantity: bags,
              quantityRaw: totalKg,
              unit: Unit.BAG,
              unitPrice: prices.coatingBag,
              totalPrice: parseFloat(costCoat.toFixed(2)),
              category: CalculatorType.FACADE
          });

          // Angle profiles
          const angles = Math.ceil(totalPerimeter / 3) * 4; // Estim. 4 corners
          // + reveals corners
          const revealAngles = Math.ceil(revealsLinear / 3); 
          const totalAngles = angles + revealAngles;
          const costAngles = totalAngles * 5; // 5€/bar approx
          totalCost += costAngles;
          materialsList.push({ id: 'angles', name: 'Cornières d\'angle (3m)', quantity: totalAngles, unit: Unit.BAR, unitPrice: 5, totalPrice: costAngles, category: CalculatorType.FACADE });
      }

      // D. Painting
      if (doPaint) {
          // 6 m2/L per layer approx
          const coverage = 6; 
          const totalL = (treatableArea * paintLayers) / coverage;
          const buckets = Math.ceil(totalL / 15); // 15L buckets
          const costPaint = Math.ceil(totalL) * prices.paintL;
          totalCost += costPaint;
          
          materialsList.push({
              id: 'paint',
              name: `Peinture Façade (${paintType.toUpperCase()})`,
              quantity: Math.ceil(totalL),
              quantityRaw: totalL,
              unit: Unit.LITER,
              unitPrice: prices.paintL,
              totalPrice: parseFloat(costPaint.toFixed(2)),
              category: CalculatorType.FACADE,
              details: `${paintLayers} couches`
          });
      }

      // E. ITE
      if (doITE) {
          const costIte = netArea * prices.iteM2;
          totalCost += costIte;
          materialsList.push({
              id: 'ite',
              name: `Système ITE (${iteThick}mm ${iteType.toUpperCase()})`,
              quantity: Math.ceil(netArea),
              quantityRaw: netArea,
              unit: Unit.M2,
              unitPrice: prices.iteM2,
              totalPrice: parseFloat(costIte.toFixed(2)),
              category: CalculatorType.FACADE,
              details: 'Isolant + Colle + Treillis + Enduit'
          });
          // Start profiles
          const rails = Math.ceil(totalPerimeter / 2.5); // 2.5m rails
          const costRails = rails * 15;
          totalCost += costRails;
          materialsList.push({ id: 'ite_rail', name: 'Rails de départ (2.5m)', quantity: rails, unit: Unit.PIECE, unitPrice: 15, totalPrice: costRails, category: CalculatorType.FACADE });
      }

      // F. Cladding
      if (doCladding) {
          const costClad = netArea * prices.claddingM2;
          totalCost += costClad;
          materialsList.push({
              id: 'cladding',
              name: `Bardage (${claddingType === 'wood' ? 'Bois' : 'Composite'})`,
              quantity: Math.ceil(netArea),
              quantityRaw: netArea,
              unit: Unit.M2,
              unitPrice: prices.claddingM2,
              totalPrice: costClad,
              category: CalculatorType.FACADE
          });
          // Battens (Tasseaux) ~ 3ml / m2
          const battens = Math.ceil(netArea * 3);
          const costBat = battens * 2; // 2€/ml
          totalCost += costBat;
          materialsList.push({ id: 'battens', name: 'Tasseaux Ossature', quantity: battens, unit: Unit.METER, unitPrice: 2, totalPrice: costBat, category: CalculatorType.FACADE });
      }

      // G. Scaffold
      if (scaffold || h > 3) { // Auto suggest if H > 3m
          const scafArea = grossArea; 
          const costScaf = prices.scaffoldFixed + (proMode ? scafArea * prices.laborScaffold : 0);
          totalCost += costScaf;
          materialsList.push({
              id: 'scaffold',
              name: 'Échafaudage (Forfait)',
              quantity: 1,
              unit: Unit.PACKAGE,
              unitPrice: costScaf,
              totalPrice: costScaf,
              category: CalculatorType.FACADE,
              details: h > 6 ? 'Grande hauteur' : 'Standard'
          });
          if (h > 3 && !scaffold) warnings.push("Hauteur > 3m : Échafaudage ajouté automatiquement.");
      }

      // H. Labor (General)
      if (proMode) {
          // Base labor on net area
          const costLab = netArea * prices.laborM2;
          totalCost += costLab;
          materialsList.push({ id: 'labor_main', name: 'Main d\'œuvre (Façadier)', quantity: parseFloat(netArea.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborM2, totalPrice: costLab, category: CalculatorType.FACADE });
      }

      if (openings.length === 0 && (doCoating || doPaint)) warnings.push("Aucune ouverture déduite : surface potentiellement surestimée.");

      return {
          totalCost,
          materials: materialsList,
          grossArea,
          netArea,
          warnings
      };

  }, [geoMode, dimL, dimW, dimH, perimeter, hasGables, gableHeight, numGables, openings, doCleaning, cleanType, doRepair, crackLen, doCoating, coatingType, coatingThick, doPaint, paintType, paintLayers, doITE, iteThick, iteType, doCladding, claddingType, scaffold, prices, proMode]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${calculationData.netArea.toFixed(1)} m² de façade`,
          details: [
              { label: 'Surface Brute', value: calculationData.grossArea.toFixed(1), unit: 'm²' },
              { label: 'Surface Nette', value: calculationData.netArea.toFixed(1), unit: 'm²' },
              { label: 'Travaux', value: [doCleaning?'Nettoyage':'', doCoating?'Enduit':'', doPaint?'Peinture':'', doITE?'ITE':''].filter(Boolean).join(', '), unit: '' }
          ],
          materials: calculationData.materials,
          totalCost: parseFloat(calculationData.totalCost.toFixed(2)),
          warnings: calculationData.warnings.length ? calculationData.warnings : undefined
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
                {s === 1 && '1. Murs'}
                {s === 2 && '2. Ouver.'}
                {s === 3 && '3. Travaux'}
                {s === 4 && '4. Détails'}
                {s === 5 && '5. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: GEOMETRY */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Home size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Définissez la géométrie de la maison.
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setGeoMode('rect')} className={`flex-1 py-2 text-xs font-bold rounded ${geoMode === 'rect' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Maison (L x l)</button>
                    <button onClick={() => setGeoMode('simple')} className={`flex-1 py-2 text-xs font-bold rounded ${geoMode === 'simple' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Périmètre</button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {geoMode === 'rect' ? (
                        <>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (m)</label>
                            <input type="number" value={dimL} onChange={e => setDimL(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
                            <input type="number" value={dimW} onChange={e => setDimW(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-slate-900"/>
                        </div>
                        </>
                    ) : (
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Périmètre total (m)</label>
                            <input type="number" value={perimeter} onChange={e => setPerimeter(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-slate-900"/>
                        </div>
                    )}
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur sous gouttière (m)</label>
                        <input type="number" value={dimH} onChange={e => setDimH(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900"/>
                    </div>
                </div>

                {geoMode === 'rect' && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <label className="flex items-center space-x-2 mb-2">
                            <input type="checkbox" checked={hasGables} onChange={e => setHasGables(e.target.checked)} className="rounded text-blue-600"/>
                            <span className="text-sm font-bold text-slate-700">Ajouter Pignons</span>
                        </label>
                        {hasGables && (
                            <div className="grid grid-cols-2 gap-3 pl-6 animate-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">Hauteur Pignon (m)</label>
                                    <input type="number" value={gableHeight} onChange={e => setGableHeight(e.target.value)} className="w-full p-1.5 text-sm border rounded bg-white text-slate-900"/>
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 mb-1">Nombre</label>
                                    <select value={numGables} onChange={e => setNumGables(Number(e.target.value))} className="w-full p-1.5 text-sm border rounded bg-white text-slate-900">
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                        <option value={3}>3</option>
                                        <option value={4}>4</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: OPENINGS */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <LayoutTemplate size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajoutez les ouvertures. Elles seront déduites de la surface, mais les tableaux seront comptés.
                </div>

                <div className="space-y-2">
                    {openings.map(op => (
                        <div key={op.id} className="flex justify-between items-center p-2 bg-white border rounded shadow-sm">
                            <div>
                                <span className="font-bold text-sm block">{op.label}</span>
                                <span className="text-xs text-slate-500">{op.width}x{op.height}m (Tab: {op.revealDepth}cm)</span>
                            </div>
                            <button onClick={() => removeOpening(op.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {openings.length === 0 && <div className="text-center text-xs text-slate-400 py-4 italic">Aucune ouverture.</div>}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
                    <div className="flex gap-2 mb-2">
                        <select value={newOpType} onChange={e => setNewOpType(e.target.value as any)} className="flex-1 p-1.5 text-xs border rounded bg-white text-slate-900">
                            <option value="window">Fenêtre</option>
                            <option value="door">Porte</option>
                            <option value="bay">Baie Vitrée</option>
                            <option value="garage">Garage</option>
                        </select>
                        <button 
                            className="text-xs text-blue-600 underline"
                            onClick={() => {
                                // Preset Standard Window
                                setNewOpW('1.20'); setNewOpH('1.25');
                            }}
                        >Standard</button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                        <input type="number" placeholder="Larg" value={newOpW} onChange={e => setNewOpW(e.target.value)} className="p-1.5 text-xs border rounded bg-white text-slate-900"/>
                        <input type="number" placeholder="Haut" value={newOpH} onChange={e => setNewOpH(e.target.value)} className="p-1.5 text-xs border rounded bg-white text-slate-900"/>
                        <input type="number" placeholder="Tab (cm)" value={newOpReveal} onChange={e => setNewOpReveal(e.target.value)} className="p-1.5 text-xs border rounded bg-white text-slate-900" title="Profondeur Tableau"/>
                    </div>
                    <button onClick={addOpening} className="w-full py-2 bg-blue-100 text-blue-700 font-bold rounded text-xs flex justify-center items-center">
                        <Plus size={14} className="mr-1"/> Ajouter Ouverture
                    </button>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: WORKS SELECTION */}
        {step === 3 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Check size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Sélectionnez les travaux à réaliser.
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doCleaning ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-500'}`}>
                        <Eraser size={24} className="mb-2"/>
                        <span className="font-bold text-sm">Nettoyage</span>
                        <input type="checkbox" checked={doCleaning} onChange={e => setDoCleaning(e.target.checked)} className="hidden"/>
                    </label>
                    
                    <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doRepair ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-500'}`}>
                        <Hammer size={24} className="mb-2"/>
                        <span className="font-bold text-sm">Réparations</span>
                        <input type="checkbox" checked={doRepair} onChange={e => setDoRepair(e.target.checked)} className="hidden"/>
                    </label>

                    <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doCoating ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-500'}`}>
                        <BrickWall size={24} className="mb-2"/>
                        <span className="font-bold text-sm">Enduit</span>
                        <input type="checkbox" checked={doCoating} onChange={e => setDoCoating(e.target.checked)} className="hidden"/>
                    </label>

                    <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doPaint ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-500'}`}>
                        <PaintRoller size={24} className="mb-2"/>
                        <span className="font-bold text-sm">Peinture</span>
                        <input type="checkbox" checked={doPaint} onChange={e => setDoPaint(e.target.checked)} className="hidden"/>
                    </label>

                    <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doITE ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-500'}`}>
                        <Layers size={24} className="mb-2"/>
                        <span className="font-bold text-sm">Isolation ITE</span>
                        <input type="checkbox" checked={doITE} onChange={e => setDoITE(e.target.checked)} className="hidden"/>
                    </label>

                    <label className={`p-3 border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${doCladding ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white text-slate-500'}`}>
                        <Box size={24} className="mb-2"/>
                        <span className="font-bold text-sm">Bardage</span>
                        <input type="checkbox" checked={doCladding} onChange={e => setDoCladding(e.target.checked)} className="hidden"/>
                    </label>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 4: SPECS */}
        {step === 4 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Settings size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Configurez les détails des travaux sélectionnés.
                </div>

                {doCleaning && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Nettoyage</h4>
                        <select value={cleanType} onChange={e => setCleanType(e.target.value as any)} className="w-full p-2 text-sm border rounded bg-white text-slate-900">
                            <option value="moss">Démoussage (Traitement)</option>
                            <option value="wash">Lavage Haute Pression</option>
                            <option value="strip">Décapage Chimique</option>
                        </select>
                    </div>
                )}

                {doRepair && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Réparations</h4>
                        <label className="block text-xs mb-1">Longueur Fissures (ml)</label>
                        <input type="number" value={crackLen} onChange={e => setCrackLen(e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                    </div>
                )}

                {doCoating && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Enduit</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={coatingType} onChange={e => setCoatingType(e.target.value as any)} className="p-2 text-sm border rounded bg-white text-slate-900">
                                <option value="mono">Monocouche</option>
                                <option value="rpe">RPE</option>
                            </select>
                            <div className="flex items-center">
                                <input type="number" value={coatingThick} onChange={e => setCoatingThick(Number(e.target.value))} className="w-16 p-2 text-sm border rounded bg-white text-slate-900"/>
                                <span className="ml-2 text-xs">mm</span>
                            </div>
                        </div>
                    </div>
                )}

                {doPaint && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Peinture</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={paintType} onChange={e => setPaintType(e.target.value as any)} className="p-2 text-sm border rounded bg-white text-slate-900">
                                <option value="acry">Acrylique</option>
                                <option value="plio">Pliolite</option>
                                <option value="silo">Siloxane</option>
                            </select>
                            <select value={paintLayers} onChange={e => setPaintLayers(Number(e.target.value))} className="p-2 text-sm border rounded bg-white text-slate-900">
                                <option value={1}>1 couche</option>
                                <option value={2}>2 couches</option>
                            </select>
                        </div>
                    </div>
                )}

                {doITE && (
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Isolation (ITE)</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <select value={iteType} onChange={e => setIteType(e.target.value)} className="p-2 text-sm border rounded bg-white text-slate-900">
                                <option value="pse">Polystyrène (PSE)</option>
                                <option value="rock">Laine Roche</option>
                            </select>
                            <div className="flex items-center">
                                <input type="number" value={iteThick} onChange={e => setIteThick(Number(e.target.value))} className="w-16 p-2 text-sm border rounded bg-white text-slate-900"/>
                                <span className="ml-2 text-xs">mm</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                    <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm font-bold text-slate-700">Échafaudage</span>
                        <input type="checkbox" checked={scaffold} onChange={e => setScaffold(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
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
                        {doCleaning && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Nettoyage (€/m²)</label>
                                <input type="number" value={cleanType==='moss'?prices.mossM2:prices.cleanM2} onChange={e => cleanType==='moss'?updatePrice('mossM2', e.target.value):updatePrice('cleanM2', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {doCoating && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Sac Enduit (€/u)</label>
                                <input type="number" value={prices.coatingBag} onChange={e => updatePrice('coatingBag', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {doPaint && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Peinture (€/L)</label>
                                <input type="number" value={prices.paintL} onChange={e => updatePrice('paintL', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {doITE && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">ITE complet (€/m²)</label>
                                <input type="number" value={prices.iteM2} onChange={e => updatePrice('iteM2', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {(scaffold) && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Échafaudage (Forfait)</label>
                                <input type="number" value={prices.scaffoldFixed} onChange={e => updatePrice('scaffoldFixed', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Façade (€/m²)</label>
                                <input type="number" value={prices.laborM2} onChange={e => updatePrice('laborM2', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
                      <Check size={18} className="mr-2"/> Calculé
                   </button>
                </div>
            </div>
        )}
    </div>
  );
};
