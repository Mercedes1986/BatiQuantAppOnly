
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES, MESH_TYPES } from '../../constants';
import { 
  Layers, Plus, Trash2, Home, LayoutGrid, Settings, Check, 
  ArrowRight, Info, AlertTriangle, Scale, Truck, 
  CircleDollarSign, BoxSelect, ScanLine, Ruler 
} from 'lucide-react';

interface ScreedZone {
  id: string;
  label: string;
  area: number;
  thickness: number; // cm (Minimum if sloped)
  isSloped: boolean;
  slopePct: number;
  slopeLen: number; // m
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const ScreedCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Project & Zones ---
  const [zones, setZones] = useState<ScreedZone[]>([]);
  const [newZoneLabel, setNewZoneLabel] = useState('Pièce 1');
  const [newZoneArea, setNewZoneArea] = useState('');
  const [newZoneThick, setNewZoneThick] = useState('5');

  // --- 2. Tech Specs ---
  const [screedType, setScreedType] = useState<'trad' | 'fluid_anh' | 'fluid_cem' | 'light' | 'ravoirage'>('trad');
  
  // Underlayers
  const [usePolyane, setUsePolyane] = useState(true);
  const [useStrip, setUseStrip] = useState(true); // Bande périph
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState('4'); // cm

  // Reinforcement & Joints
  const [reinforceType, setReinforceType] = useState<'none' | 'mesh' | 'fiber'>('mesh');
  const [meshTypeId, setMeshTypeId] = useState('ST10'); // ST10 lightweight for screed often used, or carreleur mesh
  const [fiberDosage, setFiberDosage] = useState(0.600); // kg/m3 (600g standard)
  const [useJoints, setUseJoints] = useState(true);

  // Material Config
  const [cementDosage, setCementDosage] = useState(350); // kg/m3 for trad
  const [sandRatio, setSandRatio] = useState(1200); // kg/m3 dry sand approx
  const [lightYield, setLightYield] = useState(12); // L/sac approx for light screed premix? Or usually bags cover X m2/cm. 
  // Let's assume standard "Chape allégée" premix bag 25kg = ~15L volume usually.
  const [lightBagVol, setLightBagVol] = useState(15); // Liters per bag

  // --- 3. Pricing ---
  const [prices, setPrices] = useState({
    cementBag: DEFAULT_PRICES.CEMENT_BAG_35KG,
    sandTon: DEFAULT_PRICES.SAND_TON,
    fiberKg: 15.00, // €/kg
    meshPanel: 5.00, // Treillis carreleur light
    polyaneM2: 1.50,
    stripM: 0.80,
    insulM2: 10.00,
    bpeM3: 160.00, // Chape fluide livré
    pumpFlat: 300.00, // Forfait pompe
    premixBag: 12.00, // Sac chape prête à l'emploi (allégée ou trad)
    laborM2: 25.00, // Pose
    jointM: 3.00,
    primerL: 12.00 // Primaire
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers ---
  const addZone = () => {
    const area = parseFloat(newZoneArea);
    const thick = parseFloat(newZoneThick);
    if (!area || !thick) return;

    setZones([...zones, {
      id: Date.now().toString(),
      label: newZoneLabel || `Zone ${zones.length + 1}`,
      area,
      thickness: thick,
      isSloped: false,
      slopePct: 1.5,
      slopeLen: 2
    }]);
    setNewZoneArea('');
    setNewZoneLabel(`Pièce ${zones.length + 2}`);
  };

  const updateZone = (id: string, field: keyof ScreedZone, value: any) => {
    setZones(zones.map(z => z.id === id ? { ...z, [field]: value } : z));
  };

  const removeZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalArea = 0;
    let totalVolume = 0;
    let totalPerimeter = 0; // Approx for strips
    const materialsList: any[] = [];
    let totalCost = 0;

    // 1. Volumes & Areas
    zones.forEach(z => {
        totalArea += z.area;
        // Perimeter est. (Square root approx if not provided, usually strips = area perimeter)
        // P = 4 * sqrt(A). Not perfect but standard estimation.
        totalPerimeter += Math.sqrt(z.area) * 4;

        let avgThick = z.thickness;
        if (z.isSloped) {
            // h_max = h_min + (slope% * len)
            const hMax = z.thickness + (z.slopePct * z.slopeLen);
            avgThick = (z.thickness + hMax) / 2;
        }
        totalVolume += z.area * (avgThick / 100);
    });

    const wasteVol = totalVolume * 1.05; // +5% waste

    // 2. Screed Material
    if (screedType === 'trad') {
        // Sand + Cement
        const cementKg = wasteVol * cementDosage;
        const sandKg = wasteVol * sandRatio;
        
        const bagsCement = Math.ceil(cementKg / 35);
        const costCement = bagsCement * prices.cementBag;
        const costSand = (sandKg / 1000) * prices.sandTon;
        
        totalCost += costCement + costSand;
        
        materialsList.push(
            { id: 'cement', name: `Ciment (Dosage ${cementDosage}kg)`, quantity: bagsCement, quantityRaw: cementKg, unit: Unit.BAG, unitPrice: prices.cementBag, totalPrice: costCement, category: CalculatorType.SCREED, details: `${bagsCement} sacs de 35kg` },
            { id: 'sand', name: 'Sable à chape (0/4)', quantity: parseFloat((sandKg/1000).toFixed(1)), quantityRaw: sandKg, unit: Unit.TON, unitPrice: prices.sandTon, totalPrice: costSand, category: CalculatorType.SCREED }
        );

    } else if (screedType === 'light') {
        // Premix Bags
        // 1000L / lightBagVol = bags per m3
        const bagsPerM3 = 1000 / lightBagVol;
        const totalBags = Math.ceil(wasteVol * bagsPerM3);
        const costBags = totalBags * prices.premixBag;
        
        totalCost += costBags;
        
        materialsList.push({
            id: 'light_mix', name: 'Sacs Chape Allégée', quantity: totalBags, quantityRaw: wasteVol, unit: Unit.BAG, unitPrice: prices.premixBag, totalPrice: costBags, category: CalculatorType.SCREED, details: `Vol: ${wasteVol.toFixed(1)}m³`
        });

    } else {
        // Fluid (BPE)
        const costBpe = wasteVol * prices.bpeM3;
        totalCost += costBpe;
        
        materialsList.push({
            id: 'bpe', name: `Chape Fluide (${screedType === 'fluid_anh' ? 'Anhydrite' : 'Ciment'})`, quantity: parseFloat(wasteVol.toFixed(1)), quantityRaw: wasteVol, unit: Unit.M3, unitPrice: prices.bpeM3, totalPrice: costBpe, category: CalculatorType.SCREED
        });
        
        // Pump
        totalCost += prices.pumpFlat;
        materialsList.push({ id: 'pump', name: 'Forfait Pompage', quantity: 1, unit: Unit.PACKAGE, unitPrice: prices.pumpFlat, totalPrice: prices.pumpFlat, category: CalculatorType.SCREED });
    }

    // 3. Reinforcement
    if (reinforceType === 'mesh') {
        // Panels 2.4x1.2 usually or smaller rolls
        // Assume standard panel 2m2 useful
        const panels = Math.ceil(totalArea / 2);
        const costMesh = panels * prices.meshPanel;
        totalCost += costMesh;
        materialsList.push({ id: 'mesh', name: 'Treillis de carreleur', quantity: panels, unit: Unit.PIECE, unitPrice: prices.meshPanel, totalPrice: costMesh, category: CalculatorType.SCREED });
    } else if (reinforceType === 'fiber') {
        const totalFiberKg = wasteVol * fiberDosage;
        // Round to nearest packet? Say 1 unit = 1 kg for pricing simplicity
        const costFiber = Math.ceil(totalFiberKg) * prices.fiberKg;
        totalCost += costFiber;
        materialsList.push({ id: 'fiber', name: 'Fibres (Sachet)', quantity: Math.ceil(totalFiberKg), quantityRaw: totalFiberKg, unit: Unit.KG, unitPrice: prices.fiberKg, totalPrice: costFiber, category: CalculatorType.SCREED, details: `${fiberDosage * 1000}g / m³` });
    }

    // 4. Underlayers
    if (usePolyane) {
        const areaPoly = totalArea * 1.15; // 15% overlap
        const costPoly = areaPoly * prices.polyaneM2;
        totalCost += costPoly;
        materialsList.push({ id: 'polyane', name: 'Film Polyane', quantity: Math.ceil(areaPoly), quantityRaw: areaPoly, unit: Unit.M2, unitPrice: prices.polyaneM2, totalPrice: costPoly, category: CalculatorType.SCREED });
    }
    if (useStrip) {
        const costStrip = totalPerimeter * prices.stripM;
        totalCost += costStrip;
        materialsList.push({ id: 'strip', name: 'Bande Périphérique', quantity: Math.ceil(totalPerimeter), quantityRaw: totalPerimeter, unit: Unit.METER, unitPrice: prices.stripM, totalPrice: costStrip, category: CalculatorType.SCREED });
    }
    if (useInsulation) {
        const areaIns = totalArea * 1.05;
        const costIns = areaIns * prices.insulM2;
        totalCost += costIns;
        materialsList.push({ id: 'insul', name: `Isolant sol (${insulThick}cm)`, quantity: Math.ceil(areaIns), quantityRaw: areaIns, unit: Unit.M2, unitPrice: prices.insulM2, totalPrice: costIns, category: CalculatorType.SCREED });
    }

    // 5. Joints
    if (useJoints && totalArea > 40) { // Rule of thumb
        const jointLen = Math.sqrt(totalArea); // Very rough estimate of splitting large room
        const costJoint = jointLen * prices.jointM;
        totalCost += costJoint;
        materialsList.push({ id: 'joints', name: 'Joints de fractionnement', quantity: Math.ceil(jointLen), unit: Unit.METER, unitPrice: prices.jointM, totalPrice: costJoint, category: CalculatorType.SCREED });
    }

    // 6. Labor
    if (proMode) {
        const costLab = totalArea * prices.laborM2;
        totalCost += costLab;
        materialsList.push({ id: 'labor', name: 'Main d\'œuvre (Coulage/Tirage)', quantity: parseFloat(totalArea.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborM2, totalPrice: costLab, category: CalculatorType.SCREED });
    }

    return {
        totalCost,
        materials: materialsList,
        totalArea,
        totalVolume,
        avgThickness: totalArea > 0 ? (totalVolume / totalArea) * 100 : 0
    };

  }, [zones, screedType, cementDosage, sandRatio, lightBagVol, reinforceType, fiberDosage, usePolyane, useStrip, useInsulation, insulThick, useJoints, prices, proMode]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${calculationData.totalVolume.toFixed(2)} m³ de chape (${zones.length} zones)`,
          details: [
              { label: 'Surface', value: calculationData.totalArea.toFixed(1), unit: 'm²' },
              { label: 'Épaisseur Moy.', value: calculationData.avgThickness.toFixed(1), unit: 'cm' },
              { label: 'Volume', value: calculationData.totalVolume.toFixed(2), unit: 'm³' }
          ],
          materials: calculationData.materials,
          totalCost: parseFloat(calculationData.totalCost.toFixed(2))
      });
  }, [calculationData]);

  return (
    <div className="space-y-6 animate-in fade-in">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4].map(s => (
            <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Zones'}
                {s === 2 && '2. Couches'}
                {s === 3 && '3. Matériaux'}
                {s === 4 && '4. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: ZONES & TYPE */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Définissez le type de chape et les zones à traiter.
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type de Chape</label>
                    <select value={screedType} onChange={e => setScreedType(e.target.value as any)} className="w-full p-2.5 border rounded bg-white text-slate-900">
                        <option value="trad">Traditionnelle (Sable/Ciment)</option>
                        <option value="fluid_cem">Fluide Ciment</option>
                        <option value="fluid_anh">Fluide Anhydrite</option>
                        <option value="light">Allégée</option>
                        <option value="ravoirage">Ravoirage (Mise à niveau)</option>
                    </select>
                </div>

                {/* Zones Manager */}
                <div className="space-y-3">
                    {zones.map(z => (
                        <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3 relative">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-700">{z.label}</span>
                                <button onClick={() => removeZone(z.id)} className="text-red-400"><Trash2 size={16}/></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>{z.area} m²</div>
                                <div>{z.thickness} cm</div>
                            </div>
                            {/* Slope Toggle specific to zone */}
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                <label className="flex items-center text-xs text-slate-600">
                                    <input type="checkbox" checked={z.isSloped} onChange={e => updateZone(z.id, 'isSloped', e.target.checked)} className="mr-2 rounded text-blue-600"/>
                                    Pente (Extérieur/Douche)
                                </label>
                                {z.isSloped && (
                                    <div className="flex items-center space-x-2">
                                        <input type="number" value={z.slopePct} onChange={e => updateZone(z.id, 'slopePct', parseFloat(e.target.value))} className="w-12 p-1 border rounded text-xs bg-white text-slate-900" placeholder="%"/>
                                        <span className="text-xs">% sur</span>
                                        <input type="number" value={z.slopeLen} onChange={e => updateZone(z.id, 'slopeLen', parseFloat(e.target.value))} className="w-12 p-1 border rounded text-xs bg-white text-slate-900" placeholder="m"/>
                                        <span className="text-xs">m</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add Zone Inputs */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="col-span-3">
                                <input type="text" placeholder="Nom (ex: Salon)" value={newZoneLabel} onChange={e => setNewZoneLabel(e.target.value)} className="w-full p-2 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                            <div className="col-span-1">
                                <input type="number" placeholder="m²" value={newZoneArea} onChange={e => setNewZoneArea(e.target.value)} className="w-full p-2 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                            <div className="col-span-1">
                                <input type="number" placeholder="Ep. cm" value={newZoneThick} onChange={e => setNewZoneThick(e.target.value)} className="w-full p-2 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                            <div className="col-span-1">
                                <button onClick={addZone} className="w-full h-full bg-blue-600 text-white rounded font-bold text-sm flex justify-center items-center"><Plus size={18}/></button>
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: UNDERLAYERS */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Layers size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Préparation du support avant coulage.
                </div>

                <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <span className="text-sm font-medium">Film Polyane (Désolidarisation)</span>
                        <input type="checkbox" checked={usePolyane} onChange={e => setUsePolyane(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <span className="text-sm font-medium">Bande Périphérique (5mm)</span>
                        <input type="checkbox" checked={useStrip} onChange={e => setUseStrip(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    
                    <div className="border-t border-slate-100 pt-2">
                        <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                            <span className="text-sm font-medium">Isolation sous chape</span>
                            <input type="checkbox" checked={useInsulation} onChange={e => setUseInsulation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                        </label>
                        {useInsulation && (
                            <div className="px-2 pb-2">
                                <label className="block text-xs text-slate-500 mb-1">Épaisseur Isolant (cm)</label>
                                <input type="number" value={insulThick} onChange={e => setInsulThick(e.target.value)} className="w-20 p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: MATERIALS & REINFORCEMENT */}
        {step === 3 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <BoxSelect size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Configuration du mortier et du ferraillage.
                </div>

                <div className="space-y-4">
                    {/* Reinforcement */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Armature / Renfort</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setReinforceType('none')} className={`p-2 border rounded text-xs font-bold ${reinforceType === 'none' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>Aucun</button>
                            <button onClick={() => setReinforceType('mesh')} className={`p-2 border rounded text-xs font-bold ${reinforceType === 'mesh' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>Treillis</button>
                            <button onClick={() => setReinforceType('fiber')} className={`p-2 border rounded text-xs font-bold ${reinforceType === 'fiber' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>Fibres</button>
                        </div>
                        {reinforceType === 'fiber' && (
                            <div className="mt-2">
                                <label className="block text-xs text-slate-500 mb-1">Dosage fibres (kg/m³)</label>
                                <input type="number" step="0.1" value={fiberDosage} onChange={e => setFiberDosage(parseFloat(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                            </div>
                        )}
                    </div>

                    {/* Material Specifics */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {screedType === 'trad' && (
                            <>
                            <div className="mb-3">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dosage Ciment (kg/m³)</label>
                                <input type="number" value={cementDosage} onChange={e => setCementDosage(parseInt(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ratio Sable (kg/m³)</label>
                                <input type="number" value={sandRatio} onChange={e => setSandRatio(parseInt(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                            </div>
                            </>
                        )}
                        {screedType === 'light' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Volume Sac (Litres)</label>
                                <input type="number" value={lightBagVol} onChange={e => setLightBagVol(parseInt(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                                <p className="text-[10px] text-slate-400 mt-1">Volume de chape fini par sac de mélange.</p>
                            </div>
                        )}
                        {(screedType === 'fluid_anh' || screedType === 'fluid_cem') && (
                            <div className="flex items-start text-xs text-slate-500">
                                <Truck size={16} className="mr-2 shrink-0"/>
                                <span>Livraison par toupie + pompe incluse dans le devis.</span>
                            </div>
                        )}
                    </div>

                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                        <span className="text-sm font-medium">Joints de fractionnement</span>
                        <input type="checkbox" checked={useJoints} onChange={e => setUseJoints(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 4: PRICING */}
        {step === 4 && (
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
                        {screedType === 'trad' ? (
                            <>
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Ciment (€/sac)</label>
                                <input type="number" value={prices.cementBag} onChange={e => updatePrice('cementBag', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Sable (€/T)</label>
                                <input type="number" value={prices.sandTon} onChange={e => updatePrice('sandTon', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                            </>
                        ) : screedType === 'light' ? (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Sac Allégé (€/u)</label>
                                <input type="number" value={prices.premixBag} onChange={e => updatePrice('premixBag', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        ) : (
                            <div className="col-span-2">
                                <label className="block text-[10px] text-slate-500 mb-1">BPE Fluide (€/m³)</label>
                                <input type="number" value={prices.bpeM3} onChange={e => updatePrice('bpeM3', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}

                        {reinforceType === 'mesh' && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Treillis (€/u)</label>
                                <input type="number" value={prices.meshPanel} onChange={e => updatePrice('meshPanel', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {usePolyane && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Polyane (€/m²)</label>
                                <input type="number" value={prices.polyaneM2} onChange={e => updatePrice('polyaneM2', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Coulage (€/m²)</label>
                                <input type="number" value={prices.laborM2} onChange={e => updatePrice('laborM2', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
                            {(screedType.includes('fluid')) && (
                                <div>
                                    <label className="block text-[10px] text-blue-600 font-bold mb-1">Forfait Pompe (€)</label>
                                    <input type="number" value={prices.pumpFlat} onChange={e => updatePrice('pumpFlat', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
                      <Check size={18} className="mr-2"/> Terminé
                   </button>
                </div>
            </div>
        )}
    </div>
  );
};
