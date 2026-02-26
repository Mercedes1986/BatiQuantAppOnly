
import React, { useState, useEffect } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES, CONCRETE_PACKAGING, MESH_TYPES, CONCRETE_MIX_RATIOS } from '../../constants';
import { getUnitPrice } from '../../services/materialsService';
import { ChevronDown, ChevronUp, Ruler, Grid, Truck, Layers, Info, Settings, Check, CircleDollarSign, BoxSelect, ArrowRight, Square } from 'lucide-react';

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialArea?: number;
  initialPerimeter?: number;
}

export const ConcreteCalculator: React.FC<Props> = ({ onCalculate, initialArea, initialPerimeter }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Geometry & Usage ---
  const [usage, setUsage] = useState<'interior' | 'terrace' | 'driveway'>('terrace');
  const [shapeMode, setShapeMode] = useState<'rect' | 'area'>('rect');
  const [dimL, setDimL] = useState('');
  const [dimW, setDimW] = useState('');
  const [areaInput, setAreaInput] = useState<string>(initialArea?.toString() || '');
  const [perimInput, setPerimInput] = useState<string>(initialPerimeter?.toString() || '');

  // --- 2. Layers (Sous-couches) ---
  const [layerHerisson, setLayerHerisson] = useState('0'); // cm
  const [layerSand, setLayerSand] = useState('0'); // cm
  const [usePolyane, setUsePolyane] = useState(false);
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState('0'); // cm
  const [useEdgeStrip, setUseEdgeStrip] = useState(false); // Bande périph

  // --- 3. Concrete & Structure ---
  const [slabThick, setSlabThick] = useState('12'); // cm
  const [wastePct, setWastePct] = useState(5);
  const [isBPE, setIsBPE] = useState(true);
  
  // Mix Config
  const [mixDosage, setMixDosage] = useState(350);
  const [bagSize, setBagSize] = useState(35);

  // Reinforcement
  const [useMesh, setUseMesh] = useState(true);
  const [meshTypeId, setMeshTypeId] = useState('ST25C');
  const [useChainage, setUseChainage] = useState(false); // Périphérique
  
  // Formwork & Joints
  const [useFormwork, setUseFormwork] = useState(false); 
  const [useJoints, setUseJoints] = useState(false);
  const [jointSpacing, setJointSpacing] = useState('4'); // meters

  // --- 4. Pricing & Logistics ---
  const [usePump, setUsePump] = useState(false);
  const [prices, setPrices] = useState({
     concreteBPE: getUnitPrice('BPE_M3'),
     cementBag: getUnitPrice('CEMENT_BAG_35KG'),
     sandTon: getUnitPrice('SAND_TON'),
     gravelTon: getUnitPrice('GRAVEL_TON'),
     herissonM3: 45,
     polyaneM2: getUnitPrice('POLYANE_ROLL_150M2') / 150, // Approx unit price if per roll
     insulationM2: 15,
     meshPanel: getUnitPrice('MESH_PANEL_ST25'),
     formworkM2: getUnitPrice('FORM_PANEL_M2'),
     delivery: getUnitPrice('DELIVERY_FEE'),
     pump: getUnitPrice('PUMP_FEE'),
     jointMl: 5,
     stripMl: 1.5
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Presets logic ---
  useEffect(() => {
     if (usage === 'interior') {
        setSlabThick('12');
        setUsePolyane(true);
        setUseInsulation(true);
        setInsulThick('6');
        setUseEdgeStrip(true);
        setUseMesh(true);
        setMeshTypeId('ST25C');
        setUseFormwork(false);
        setUseJoints(false);
     } else if (usage === 'terrace') {
        setSlabThick('12');
        setUsePolyane(false); // Often geotextile instead, or polyane under slab but usage varies
        setUseInsulation(false);
        setUseEdgeStrip(true); // As separation from house
        setUseMesh(true);
        setMeshTypeId('ST25C');
        setUseFormwork(true);
        setUseJoints(true);
     } else if (usage === 'driveway') { // Carrossable
        setSlabThick('15');
        setUsePolyane(true);
        setUseInsulation(false);
        setUseEdgeStrip(false);
        setUseMesh(true);
        setMeshTypeId('ST40C'); // Stronger
        setUseFormwork(true);
        setUseJoints(true);
     }
  }, [usage]);

  // --- Calculation Engine ---
  useEffect(() => {
    // 1. Geometry
    let area = 0;
    let perimeter = 0;

    if (shapeMode === 'rect') {
       const L = parseFloat(dimL) || 0;
       const W = parseFloat(dimW) || 0;
       area = L * W;
       perimeter = 2 * (L + W);
    } else {
       area = parseFloat(areaInput) || 0;
       // Estimate perimeter if not provided: assume square
       perimeter = parseFloat(perimInput) || (area > 0 ? Math.sqrt(area) * 4 : 0);
    }

    if (area <= 0) return;

    const materialsList: any[] = [];
    let totalCost = 0;
    const details: any[] = [];

    // 2. Layers (Préparation)
    const hHerisson = parseFloat(layerHerisson) / 100 || 0;
    if (hHerisson > 0) {
       const volHerisson = area * hHerisson;
       const cost = volHerisson * prices.herissonM3;
       totalCost += cost;
       materialsList.push({
          id: 'herisson',
          name: 'Hérisson (Tout-venant)',
          quantity: parseFloat(volHerisson.toFixed(1)),
          quantityRaw: volHerisson,
          unit: Unit.M3,
          unitPrice: prices.herissonM3,
          totalPrice: parseFloat(cost.toFixed(2)),
          category: CalculatorType.CONCRETE,
          details: `Ép. ${layerHerisson}cm`
       });
    }

    if (usePolyane) {
       const areaPoly = area * 1.15; // +15% overlap/remontées
       const cost = areaPoly * prices.polyaneM2;
       totalCost += cost;
       materialsList.push({
          id: 'polyane',
          name: 'Film Polyane (Sous-dalle)',
          quantity: Math.ceil(areaPoly),
          quantityRaw: areaPoly,
          unit: Unit.M2,
          unitPrice: prices.polyaneM2,
          totalPrice: parseFloat(cost.toFixed(2)),
          category: CalculatorType.CONCRETE
       });
    }

    if (useInsulation) {
       const hInsul = parseFloat(insulThick) || 0;
       const areaInsul = area * 1.05; // 5% cuts
       const cost = areaInsul * prices.insulationM2;
       totalCost += cost;
       materialsList.push({
          id: 'insulation',
          name: `Isolant sous dalle (${hInsul}cm)`,
          quantity: parseFloat(areaInsul.toFixed(1)),
          quantityRaw: areaInsul,
          unit: Unit.M2,
          unitPrice: prices.insulationM2,
          totalPrice: parseFloat(cost.toFixed(2)),
          category: CalculatorType.CONCRETE
       });
    }

    if (useEdgeStrip) {
       const cost = perimeter * prices.stripMl;
       totalCost += cost;
       materialsList.push({
          id: 'strip',
          name: 'Bande Périphérique',
          quantity: Math.ceil(perimeter),
          quantityRaw: perimeter,
          unit: Unit.METER,
          unitPrice: prices.stripMl,
          totalPrice: parseFloat(cost.toFixed(2)),
          category: CalculatorType.CONCRETE
       });
    }

    // 3. Concrete
    const hSlab = parseFloat(slabThick) / 100 || 0.12;
    const volSlabRaw = area * hSlab;
    const volSlabTotal = volSlabRaw * (1 + wastePct / 100);

    if (isBPE) {
       // Rounding for BPE order (0.5m3 steps)
       const volOrdered = Math.ceil(volSlabTotal * 2) / 2;
       const costConc = volOrdered * prices.concreteBPE;
       const costDeliv = prices.delivery + (usePump ? prices.pump : 0);
       
       totalCost += costConc + costDeliv;
       
       materialsList.push({
          id: 'concrete_bpe',
          name: 'Béton BPE (Toupie)',
          quantity: volOrdered,
          quantityRaw: volSlabTotal,
          unit: Unit.M3,
          unitPrice: prices.concreteBPE,
          totalPrice: parseFloat(costConc.toFixed(2)),
          category: CalculatorType.CONCRETE,
          details: `Dosage standard`
       });
       
       materialsList.push({
          id: 'logistics',
          name: usePump ? 'Livraison + Pompe' : 'Livraison Toupie',
          quantity: 1,
          quantityRaw: 1,
          unit: Unit.PACKAGE,
          unitPrice: costDeliv,
          totalPrice: costDeliv,
          category: CalculatorType.CONCRETE
       });

    } else {
       // Site Mix
       const ratio = CONCRETE_MIX_RATIOS[mixDosage] || CONCRETE_MIX_RATIOS[350];
       const cementKg = volSlabTotal * mixDosage;
       const bags = Math.ceil(cementKg / bagSize);
       const sandKg = volSlabTotal * ratio.sand;
       const gravelKg = volSlabTotal * ratio.gravel;
       
       const costCement = bags * prices.cementBag; // Assuming price matches bag size in state logic (simplified)
       const costSand = (sandKg / 1000) * prices.sandTon;
       const costGravel = (gravelKg / 1000) * prices.gravelTon;
       
       totalCost += costCement + costSand + costGravel;

       materialsList.push(
          {
             id: 'cement',
             name: `Ciment (${mixDosage}kg/m³)`,
             quantity: bags,
             quantityRaw: cementKg,
             unit: Unit.BAG,
             unitPrice: prices.cementBag,
             totalPrice: parseFloat(costCement.toFixed(2)),
             category: CalculatorType.CONCRETE,
             details: `${bags} sacs de ${bagSize}kg`
          },
          {
             id: 'sand',
             name: 'Sable à béton (0/4)',
             quantity: parseFloat((sandKg/1000).toFixed(1)),
             quantityRaw: sandKg,
             unit: Unit.TON,
             unitPrice: prices.sandTon,
             totalPrice: parseFloat(costSand.toFixed(2)),
             category: CalculatorType.CONCRETE
          },
          {
             id: 'gravel',
             name: 'Gravier (5/20)',
             quantity: parseFloat((gravelKg/1000).toFixed(1)),
             quantityRaw: gravelKg,
             unit: Unit.TON,
             unitPrice: prices.gravelTon,
             totalPrice: parseFloat(costGravel.toFixed(2)),
             category: CalculatorType.CONCRETE
          }
       );
    }

    // 4. Reinforcement
    if (useMesh) {
       const meshDef = MESH_TYPES.find(m => m.id === meshTypeId) || MESH_TYPES[1];
       const panelArea = meshDef.width * meshDef.height;
       // Useful area with overlap (approx 10%)
       const usefulArea = panelArea * 0.85; 
       const panels = Math.ceil(area / usefulArea);
       
       const costMesh = panels * prices.meshPanel;
       totalCost += costMesh;
       
       materialsList.push({
          id: 'mesh',
          name: `Treillis Soudé ${meshDef.label}`,
          quantity: panels,
          quantityRaw: area,
          unit: Unit.PANEL,
          unitPrice: prices.meshPanel,
          totalPrice: parseFloat(costMesh.toFixed(2)),
          category: CalculatorType.CONCRETE
       });
    }

    // 5. Formwork & Joints
    if (useFormwork) {
       const formArea = perimeter * hSlab;
       const costForm = formArea * prices.formworkM2;
       totalCost += costForm;
       materialsList.push({
          id: 'formwork',
          name: 'Coffrage Périphérique',
          quantity: parseFloat(formArea.toFixed(1)),
          quantityRaw: formArea,
          unit: Unit.M2,
          unitPrice: prices.formworkM2,
          totalPrice: parseFloat(costForm.toFixed(2)),
          category: CalculatorType.CONCRETE,
          details: `${perimeter.toFixed(1)}ml x ${hSlab}m`
       });
    }

    if (useJoints) {
       // Estimate linear meters of joints
       // Rule of thumb: cuts every X meters. 
       // Simple estimation: Area / Spacing * 1.5 (crude approximation for grid)
       // Or better: if rect L, W. Cuts every S.
       // (L/S)*W + (W/S)*L
       const sp = parseFloat(jointSpacing) || 4;
       let jointLen = 0;
       if (shapeMode === 'rect') {
          const L = parseFloat(dimL)||0;
          const W = parseFloat(dimW)||0;
          const cutsL = Math.floor(L/sp);
          const cutsW = Math.floor(W/sp);
          jointLen = (cutsL * W) + (cutsW * L);
       } else {
          // Fallback based on area
          jointLen = Math.sqrt(area) * (Math.sqrt(area)/sp); 
       }
       
       if (jointLen > 0) {
          const costJoint = jointLen * prices.jointMl;
          totalCost += costJoint;
          materialsList.push({
             id: 'joints',
             name: 'Joints de dilatation / fractionnement',
             quantity: Math.ceil(jointLen),
             quantityRaw: jointLen,
             unit: Unit.METER,
             unitPrice: prices.jointMl,
             totalPrice: parseFloat(costJoint.toFixed(2)),
             category: CalculatorType.CONCRETE
          });
       }
    }

    details.push({ label: 'Surface', value: area.toFixed(2), unit: 'm²' });
    details.push({ label: 'Volume Béton', value: volSlabTotal.toFixed(2), unit: 'm³' });
    details.push({ label: 'Épaisseur', value: slabThick, unit: 'cm' });

    onCalculate({
       summary: `${volSlabTotal.toFixed(1)} m³ de béton`,
       details,
       materials: materialsList,
       totalCost: parseFloat(totalCost.toFixed(2))
    });

  }, [step, shapeMode, dimL, dimW, areaInput, perimInput, layerHerisson, usePolyane, useInsulation, insulThick, useEdgeStrip, slabThick, wastePct, isBPE, mixDosage, bagSize, useMesh, meshTypeId, useFormwork, useJoints, jointSpacing, usePump, prices]);

  return (
    <div className="space-y-6 animate-in fade-in">
       {/* Step Navigation */}
       <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4].map(s => (
            <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Dalle'}
                {s === 2 && '2. Couches'}
                {s === 3 && '3. Béton'}
                {s === 4 && '4. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: GEOMETRY */}
        {step === 1 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Info size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Définissez la surface et l'usage de la dalle pour pré-configurer les matériaux.
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Usage</label>
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setUsage('interior')} className={`p-2 rounded border text-xs font-bold ${usage === 'interior' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>Intérieur</button>
                    <button onClick={() => setUsage('terrace')} className={`p-2 rounded border text-xs font-bold ${usage === 'terrace' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>Terrasse</button>
                    <button onClick={() => setUsage('driveway')} className={`p-2 rounded border text-xs font-bold ${usage === 'driveway' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>Garage</button>
                 </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg">
                 <button onClick={() => setShapeMode('rect')} className={`flex-1 py-1.5 text-xs font-bold rounded ${shapeMode === 'rect' ? 'bg-white shadow' : 'text-slate-500'}`}>Rectangle</button>
                 <button onClick={() => setShapeMode('area')} className={`flex-1 py-1.5 text-xs font-bold rounded ${shapeMode === 'area' ? 'bg-white shadow' : 'text-slate-500'}`}>Surface</button>
              </div>

              {shapeMode === 'rect' ? (
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (m)</label>
                       <input type="number" value={dimL} onChange={(e) => setDimL(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"/>
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
                       <input type="number" value={dimW} onChange={(e) => setDimW(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"/>
                    </div>
                 </div>
              ) : (
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 mb-1">Surface (m²)</label>
                       <input type="number" value={areaInput} onChange={(e) => setAreaInput(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"/>
                    </div>
                    {/* Optional Perimeter for area mode if users want formwork calculation */}
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 mb-1">Périmètre (m) <span className="text-[10px] font-normal text-slate-400">(Optionnel, pour coffrage)</span></label>
                       <input type="number" value={perimInput} onChange={(e) => setPerimInput(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"/>
                    </div>
                 </div>
              )}

              <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center">
                 Suivant <ArrowRight size={18} className="ml-2"/>
              </button>
           </div>
        )}

        {/* STEP 2: LAYERS */}
        {step === 2 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Layers size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Couches de préparation sous la dalle.
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
                 <div>
                    <label className="flex items-center justify-between mb-2">
                       <span className="text-sm font-bold text-slate-700">Hérisson (cm)</span>
                       <input type="number" value={layerHerisson} onChange={(e) => setLayerHerisson(e.target.value)} className="w-20 p-1 text-sm border rounded text-right bg-white text-slate-900"/>
                    </label>
                    <p className="text-[10px] text-slate-400">Couche de pierre drainante compactée.</p>
                 </div>
                 
                 <div className="border-t border-slate-100 pt-2">
                    <label className="flex items-center justify-between cursor-pointer">
                       <span className="text-sm font-bold text-slate-700">Polyane</span>
                       <input type="checkbox" checked={usePolyane} onChange={(e) => setUsePolyane(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                 </div>

                 <div className="border-t border-slate-100 pt-2">
                    <label className="flex items-center justify-between cursor-pointer mb-2">
                       <span className="text-sm font-bold text-slate-700">Isolation sous dalle</span>
                       <input type="checkbox" checked={useInsulation} onChange={(e) => setUseInsulation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    {useInsulation && (
                       <div className="flex items-center justify-between pl-4">
                          <span className="text-xs text-slate-500">Épaisseur (cm)</span>
                          <input type="number" value={insulThick} onChange={(e) => setInsulThick(e.target.value)} className="w-20 p-1 text-sm border rounded text-right bg-white text-slate-900"/>
                       </div>
                    )}
                 </div>

                 <div className="border-t border-slate-100 pt-2">
                    <label className="flex items-center justify-between cursor-pointer">
                       <span className="text-sm font-bold text-slate-700">Bande Périphérique</span>
                       <input type="checkbox" checked={useEdgeStrip} onChange={(e) => setUseEdgeStrip(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                 <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
              </div>
           </div>
        )}

        {/* STEP 3: CONCRETE & STRUCTURE */}
        {step === 3 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Truck size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Configuration du béton, du ferraillage et du coffrage.
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Épaisseur Dalle (cm)</label>
                    <input type="number" value={slabThick} onChange={(e) => setSlabThick(e.target.value)} className="w-full p-2 border rounded font-bold text-slate-900 bg-white"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Pertes (%)</label>
                    <input type="number" value={wastePct} onChange={(e) => setWastePct(Number(e.target.value))} className="w-full p-2 border rounded font-bold text-slate-900 bg-white"/>
                 </div>
              </div>

              {/* Concrete Type */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                 <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-slate-700">Type de Béton</span>
                    <div className="flex bg-white rounded border border-slate-200 p-0.5">
                       <button onClick={() => setIsBPE(true)} className={`px-2 py-1 text-xs rounded ${isBPE ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}>Toupie</button>
                       <button onClick={() => setIsBPE(false)} className={`px-2 py-1 text-xs rounded ${!isBPE ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500'}`}>Bétonnière</button>
                    </div>
                 </div>
                 {!isBPE && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                       <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Dosage (kg/m³)</label>
                          <select value={mixDosage} onChange={e => setMixDosage(Number(e.target.value))} className="w-full p-1.5 text-sm border rounded bg-white text-slate-900">
                             <option value={300}>300 kg</option>
                             <option value={350}>350 kg</option>
                             <option value={400}>400 kg</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Sac Ciment</label>
                          <select value={bagSize} onChange={e => setBagSize(Number(e.target.value))} className="w-full p-1.5 text-sm border rounded bg-white text-slate-900">
                             <option value={25}>25 kg</option>
                             <option value={35}>35 kg</option>
                          </select>
                       </div>
                    </div>
                 )}
              </div>

              {/* Structure */}
              <div className="space-y-2">
                 <div className="flex items-center justify-between p-2 border rounded bg-white">
                    <div className="flex items-center">
                       <input type="checkbox" checked={useMesh} onChange={e => setUseMesh(e.target.checked)} className="h-4 w-4 text-blue-600 rounded mr-2"/>
                       <span className="text-sm font-medium">Treillis Soudé</span>
                    </div>
                    {useMesh && (
                       <select value={meshTypeId} onChange={e => setMeshTypeId(e.target.value)} className="text-xs p-1 border rounded max-w-[120px] bg-white text-slate-900">
                          {MESH_TYPES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                       </select>
                    )}
                 </div>
                 
                 <label className="flex items-center justify-between p-2 border rounded bg-white">
                    <span className="text-sm font-medium">Coffrage Périphérique</span>
                    <input type="checkbox" checked={useFormwork} onChange={e => setUseFormwork(e.target.checked)} className="h-4 w-4 text-blue-600 rounded"/>
                 </label>

                 <div className="flex items-center justify-between p-2 border rounded bg-white">
                    <div className="flex items-center">
                       <input type="checkbox" checked={useJoints} onChange={e => setUseJoints(e.target.checked)} className="h-4 w-4 text-blue-600 rounded mr-2"/>
                       <span className="text-sm font-medium">Joints Dilatation</span>
                    </div>
                    {useJoints && (
                       <div className="flex items-center">
                          <input type="number" value={jointSpacing} onChange={e => setJointSpacing(e.target.value)} className="w-10 p-1 text-xs border rounded text-center bg-white text-slate-900"/>
                          <span className="text-xs ml-1 text-slate-500">m</span>
                       </div>
                    )}
                 </div>
              </div>

              <div className="flex gap-3 pt-2">
                 <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                 <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
              </div>
           </div>
        )}

        {/* STEP 4: COSTS */}
        {step === 4 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Ajustez les prix unitaires pour finaliser le devis.
              </div>

              <div className="grid grid-cols-2 gap-3">
                 {isBPE ? (
                    <div className="col-span-2 grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded border border-blue-100">
                       <div>
                          <label className="block text-[10px] uppercase font-bold text-blue-800 mb-1">Béton BPE (€/m³)</label>
                          <input type="number" value={prices.concreteBPE} onChange={(e) => updatePrice('concreteBPE', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                       </div>
                       <div>
                          <label className="block text-[10px] uppercase font-bold text-blue-800 mb-1">Livraison (€)</label>
                          <input type="number" value={prices.delivery} onChange={(e) => updatePrice('delivery', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                       </div>
                       <label className="col-span-2 flex items-center mt-1">
                          <input type="checkbox" checked={usePump} onChange={e => setUsePump(e.target.checked)} className="h-4 w-4 text-blue-600 rounded mr-2"/>
                          <span className="text-xs font-bold text-blue-800">Ajouter Pompe (+{prices.pump}€)</span>
                       </label>
                    </div>
                 ) : (
                    <>
                       <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ciment (€/sac)</label>
                          <input type="number" value={prices.cementBag} onChange={(e) => updatePrice('cementBag', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                       </div>
                       <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Sable/Gravier (€/T)</label>
                          <input type="number" value={prices.sandTon} onChange={(e) => updatePrice('sandTon', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                       </div>
                    </>
                 )}

                 {parseFloat(layerHerisson) > 0 && (
                    <div>
                       <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Hérisson (€/m³)</label>
                       <input type="number" value={prices.herissonM3} onChange={(e) => updatePrice('herissonM3', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                    </div>
                 )}
                 {useMesh && (
                    <div>
                       <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Treillis (€/px)</label>
                       <input type="number" value={prices.meshPanel} onChange={(e) => updatePrice('meshPanel', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                    </div>
                 )}
                 {usePolyane && (
                    <div>
                       <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Polyane (€/m²)</label>
                       <input type="number" value={prices.polyaneM2} onChange={(e) => updatePrice('polyaneM2', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                    </div>
                 )}
                 {useFormwork && (
                    <div>
                       <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Coffrage (€/m²)</label>
                       <input type="number" value={prices.formworkM2} onChange={(e) => updatePrice('formworkM2', e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                    </div>
                 )}
              </div>

              <div className="flex gap-3 pt-4">
                 <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                 <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
                    <Check size={18} className="mr-2"/> Calculé
                 </button>
              </div>
           </div>
        )}
    </div>
  );
};
