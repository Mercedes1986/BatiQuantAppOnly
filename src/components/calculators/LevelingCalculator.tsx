
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES, LEVELING_PRODUCTS, LEVELING_SUBSTRATES } from '../../constants';
import { getUnitPrice } from '../../services/materialsService';
import { 
  Layers, Plus, Trash2, Home, Settings, Check, 
  ArrowRight, Info, AlertTriangle, Droplets, ScanLine, 
  Ruler, Construction, Clock, CircleDollarSign 
} from 'lucide-react';

interface LevelingZone {
  id: string;
  label: string;
  area: number;
  substrate: string; // 'concrete', 'tile', 'wood', 'anhydrite'
  thicknessMode: 'avg' | 'minmax';
  thicknessVal: number; // mm (avg)
  thicknessMin?: number;
  thicknessMax?: number;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const LevelingCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones & Substrates ---
  const [zones, setZones] = useState<LevelingZone[]>([]);
  const [newZoneLabel, setNewZoneLabel] = useState('Salon');
  const [newZoneArea, setNewZoneArea] = useState('');
  const [newZoneSubstrate, setNewZoneSubstrate] = useState('concrete');
  const [newZoneThick, setNewZoneThick] = useState('5'); // Avg

  // --- 2. Product ---
  const [productId, setProductId] = useState('standard');
  const [bagSize, setBagSize] = useState(25); // kg
  const [wastePct, setWastePct] = useState(5);

  // --- 3. Preparation ---
  const [usePrimer, setUsePrimer] = useState(true);
  const [primerLayers, setPrimerLayers] = useState(1);
  const [usePeripheralBand, setUsePeripheralBand] = useState(true);
  const [useMesh, setUseMesh] = useState(false); // Treillis verre

  // --- 4. Pricing ---
  const [prices, setPrices] = useState({
    compoundBag: getUnitPrice('RAGREAGE_BAG_25KG'),
    compoundFibre: getUnitPrice('RAGREAGE_FIBRE_25KG'),
    primerL: getUnitPrice('PRIMER_FLOOR_LITER'),
    bandM: getUnitPrice('PERIPHERAL_BAND_M'),
    meshRoll: 40.00, // 50m2 roll approx
    laborM2: 25.00,
    laborPrep: 8.00 // Ponçage/Primaire
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers ---
  const addZone = () => {
    const area = parseFloat(newZoneArea);
    const th = parseFloat(newZoneThick);
    if (!area || !th) return;

    setZones([...zones, {
      id: Date.now().toString(),
      label: newZoneLabel,
      area,
      substrate: newZoneSubstrate,
      thicknessMode: 'avg',
      thicknessVal: th
    }]);
    setNewZoneArea('');
    setNewZoneLabel('Chambre');
  };

  const removeZone = (id: string) => setZones(zones.filter(z => z.id !== id));

  // --- Auto-Recommendations ---
  useEffect(() => {
    const hasWood = zones.some(z => z.substrate === 'wood');
    const hasTile = zones.some(z => z.substrate === 'tile');
    const maxThick = Math.max(...zones.map(z => z.thicknessVal), 0);

    // Recommend Fiber if Wood or Tile or Thick > 10mm
    if (hasWood) {
        setProductId('fibre');
        setUseMesh(true); // Always mesh on wood
        setPrices(p => ({ ...p, compoundBag: getUnitPrice('RAGREAGE_FIBRE_25KG') }));
    } else if (hasTile) {
        setProductId('fibre'); // Better adhesion
        setUseMesh(false);
        setPrices(p => ({ ...p, compoundBag: getUnitPrice('RAGREAGE_FIBRE_25KG') }));
    } else if (maxThick > 15) {
        setProductId('thicks'); // Rattrapage
        setPrices(p => ({ ...p, compoundBag: getUnitPrice('RAGREAGE_BAG_25KG') }));
    } else {
        setProductId('standard');
        setPrices(p => ({ ...p, compoundBag: getUnitPrice('RAGREAGE_BAG_25KG') }));
    }
  }, [zones]);

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
      let totalArea = 0;
      let totalWeight = 0;
      let perimeterTotal = 0;
      
      const materialsList: any[] = [];
      let totalCost = 0;
      const warnings: string[] = [];

      const productDef = LEVELING_PRODUCTS.find(p => p.id === productId) || LEVELING_PRODUCTS[0];

      // 1. Process Zones
      zones.forEach(z => {
          totalArea += z.area;
          perimeterTotal += Math.sqrt(z.area) * 4; // Approx perimeter

          // Consumption: Area * Thick(mm) * Density
          const w = z.area * z.thicknessVal * productDef.density;
          totalWeight += w;

          // Warnings
          if (z.thicknessVal < productDef.minThick) warnings.push(`${z.label}: Épaisseur ${z.thicknessVal}mm trop faible pour ${productDef.label}`);
          if (z.thicknessVal > productDef.maxThick) warnings.push(`${z.label}: Épaisseur ${z.thicknessVal}mm trop élevée pour ${productDef.label}`);
      });

      const totalWeightWithWaste = totalWeight * (1 + wastePct/100);

      // 2. Compound
      const bags = Math.ceil(totalWeightWithWaste / bagSize);
      // Determine price based on selection
      let pricePerBag = prices.compoundBag;
      if (productId === 'fibre') pricePerBag = prices.compoundFibre;
      
      const costCompound = bags * pricePerBag;
      totalCost += costCompound;

      materialsList.push({
          id: 'compound',
          name: `Ragréage ${productDef.label}`,
          quantity: bags,
          quantityRaw: totalWeightWithWaste,
          unit: Unit.BAG,
          unitPrice: pricePerBag,
          totalPrice: parseFloat(costCompound.toFixed(2)),
          category: CalculatorType.RAGREAGE,
          details: `${totalWeightWithWaste.toFixed(0)}kg (Densité ${productDef.density})`
      });

      // 3. Primer
      if (usePrimer) {
          // Approx 0.15L / m2 / layer
          const literPerM2 = 0.15 * primerLayers;
          const totalL = totalArea * literPerM2 * 1.1; // 10% margin
          const costPrimer = Math.ceil(totalL) * prices.primerL;
          totalCost += costPrimer;

          materialsList.push({
              id: 'primer',
              name: `Primaire d'accrochage (${primerLayers} couche${primerLayers>1?'s':''})`,
              quantity: Math.ceil(totalL),
              quantityRaw: totalL,
              unit: Unit.LITER,
              unitPrice: prices.primerL,
              totalPrice: parseFloat(costPrimer.toFixed(2)),
              category: CalculatorType.RAGREAGE,
              details: zones.some(z => z.substrate === 'tile') ? 'Spécial rénovation (Grip)' : 'Universel'
          });
      }

      // 4. Mesh (Treillis)
      if (useMesh) {
          const meshArea = totalArea * 1.1; // overlap
          const rolls = Math.ceil(meshArea / 50); // 50m2 rolls assumed or price per m2
          // Let's assume price is per Roll in the state for simplicity or convert
          // Actually state says meshRoll = 40€.
          const costMesh = rolls * prices.meshRoll;
          totalCost += costMesh;
          materialsList.push({
              id: 'mesh',
              name: 'Treillis de verre (Renfort)',
              quantity: rolls,
              unit: Unit.ROLL,
              unitPrice: prices.meshRoll,
              totalPrice: costMesh,
              category: CalculatorType.RAGREAGE,
              details: 'Indispensable sur bois'
          });
      }

      // 5. Band
      if (usePeripheralBand) {
          const len = Math.ceil(perimeterTotal * 1.05);
          const costBand = len * prices.bandM;
          totalCost += costBand;
          materialsList.push({
              id: 'band',
              name: 'Bande Périphérique',
              quantity: len,
              quantityRaw: perimeterTotal,
              unit: Unit.METER,
              unitPrice: prices.bandM,
              totalPrice: parseFloat(costBand.toFixed(2)),
              category: CalculatorType.RAGREAGE
          });
      }

      // 6. Labor
      if (proMode) {
          const labApp = totalArea * prices.laborM2;
          const labPrep = totalArea * prices.laborPrep;
          const totalLab = labApp + labPrep;
          totalCost += totalLab;
          
          materialsList.push(
              { id: 'lab_prep', name: 'Préparation (Primaire/Ponçage)', quantity: parseFloat(totalArea.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborPrep, totalPrice: labPrep, category: CalculatorType.RAGREAGE },
              { id: 'lab_app', name: 'Coulage Ragréage', quantity: parseFloat(totalArea.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborM2, totalPrice: labApp, category: CalculatorType.RAGREAGE }
          );
      }

      return {
          totalCost,
          materials: materialsList,
          totalArea,
          avgThick: zones.length > 0 ? zones.reduce((a,b)=>a+b.thicknessVal,0)/zones.length : 0,
          warnings
      };

  }, [zones, productId, bagSize, wastePct, usePrimer, primerLayers, usePeripheralBand, useMesh, prices, proMode]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${calculationData.totalArea.toFixed(1)} m² de ragréage`,
          details: [
              { label: 'Surface', value: calculationData.totalArea.toFixed(1), unit: 'm²' },
              { label: 'Épaisseur Moy.', value: calculationData.avgThick.toFixed(1), unit: 'mm' },
              { label: 'Sac', value: `${bagSize} kg`, unit: '' }
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
            {[1, 2, 3, 4].map(s => (
            <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Zones'}
                {s === 2 && '2. Produit'}
                {s === 3 && '3. Prép.'}
                {s === 4 && '4. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: ZONES */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <ScanLine size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajoutez les zones à ragréer en précisant le support et l'épaisseur moyenne à rattraper.
                </div>

                <div className="space-y-2">
                    {zones.map(z => (
                        <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                            <div>
                                <span className="font-bold text-slate-700 block">{z.label}</span>
                                <span className="text-xs text-slate-500">
                                    {z.area} m² • {z.thicknessVal} mm • {LEVELING_SUBSTRATES.find(s=>s.id===z.substrate)?.label}
                                </span>
                            </div>
                            <button onClick={() => removeZone(z.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" placeholder="Nom" value={newZoneLabel} onChange={e => setNewZoneLabel(e.target.value)} className="col-span-2 p-2 text-xs border rounded bg-white text-slate-900"/>
                        <input type="number" placeholder="m²" value={newZoneArea} onChange={e => setNewZoneArea(e.target.value)} className="p-2 text-xs border rounded bg-white text-slate-900"/>
                        <input type="number" placeholder="Ép. mm" value={newZoneThick} onChange={e => setNewZoneThick(e.target.value)} className="p-2 text-xs border rounded bg-white text-slate-900"/>
                    </div>
                    <select value={newZoneSubstrate} onChange={e => setNewZoneSubstrate(e.target.value)} className="w-full p-2 text-xs border rounded bg-white mb-2 text-slate-900">
                        {LEVELING_SUBSTRATES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    
                    <button onClick={addZone} className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs flex justify-center items-center">
                        <Plus size={14} className="mr-1"/> Ajouter Zone
                    </button>
                </div>

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: PRODUCT */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Layers size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Sélection du type de ragréage. Recommandé : {LEVELING_PRODUCTS.find(p=>p.id===productId)?.label}.
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Produit</label>
                    <div className="grid grid-cols-1 gap-2">
                        {LEVELING_PRODUCTS.map(p => (
                            <button 
                                key={p.id}
                                onClick={() => setProductId(p.id)}
                                className={`p-3 text-left rounded border flex justify-between items-center ${productId === p.id ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500' : 'bg-white text-slate-600'}`}
                            >
                                <div>
                                    <span className="font-bold block text-sm">{p.label}</span>
                                    <span className="text-[10px] opacity-75">Ép. {p.minThick}-{p.maxThick}mm</span>
                                </div>
                                {productId === p.id && <Check size={16}/>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Sac (kg)</label>
                        <select value={bagSize} onChange={e => setBagSize(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-sm text-slate-900">
                            <option value={20}>20 kg</option>
                            <option value={25}>25 kg</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Pertes (%)</label>
                        <input type="number" value={wastePct} onChange={e => setWastePct(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-sm text-slate-900"/>
                    </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: PREPARATION */}
        {step === 3 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Construction size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Préparation du support. Indispensable pour l'adhérence et la durabilité.
                </div>

                <div className="space-y-3">
                    <div className="p-3 bg-white border rounded-lg">
                        <label className="flex items-center justify-between cursor-pointer mb-2">
                            <span className="text-sm font-bold text-slate-700">Primaire d'accrochage</span>
                            <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                        </label>
                        {usePrimer && (
                            <div className="pl-2 flex items-center space-x-3">
                                <span className="text-xs text-slate-500">Couches :</span>
                                <div className="flex bg-slate-100 rounded p-0.5">
                                    <button onClick={() => setPrimerLayers(1)} className={`px-3 py-1 text-xs rounded ${primerLayers===1 ? 'bg-white shadow font-bold' : ''}`}>1</button>
                                    <button onClick={() => setPrimerLayers(2)} className={`px-3 py-1 text-xs rounded ${primerLayers===2 ? 'bg-white shadow font-bold' : ''}`}>2</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                        <div>
                            <span className="text-sm font-bold text-slate-700">Bande Périphérique</span>
                            <p className="text-[10px] text-slate-400">Désolidarisation des murs</p>
                        </div>
                        <input type="checkbox" checked={usePeripheralBand} onChange={(e) => setUsePeripheralBand(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>

                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                        <div>
                            <span className="text-sm font-bold text-slate-700">Treillis de verre</span>
                            <p className="text-[10px] text-slate-400">Renfort (Obligatoire sur bois)</p>
                        </div>
                        <input type="checkbox" checked={useMesh} onChange={(e) => setUseMesh(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                </div>

                {/* Drying Info */}
                <div className="bg-slate-50 p-3 rounded-lg flex items-start text-xs text-slate-600">
                    <Clock size={16} className="mr-2 mt-0.5 shrink-0"/>
                    <div>
                        <span className="font-bold block mb-1">Temps de séchage indicatifs</span>
                        <ul className="list-disc pl-4 space-y-0.5">
                            <li>Circulation piétonne : 3-4 heures</li>
                            <li>Pose carrelage : 24 heures</li>
                            <li>Pose PVC/Parquet : 48-72 heures</li>
                        </ul>
                    </div>
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
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Ragréage (€/sac)</label>
                            <input type="number" value={productId === 'fibre' ? prices.compoundFibre : prices.compoundBag} onChange={e => productId === 'fibre' ? updatePrice('compoundFibre', e.target.value) : updatePrice('compoundBag', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Primaire (€/L)</label>
                            <input type="number" value={prices.primerL} onChange={e => updatePrice('primerL', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        {useMesh && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Treillis (€/rlx)</label>
                                <input type="number" value={prices.meshRoll} onChange={e => updatePrice('meshRoll', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                        {usePeripheralBand && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Bande (€/m)</label>
                                <input type="number" value={prices.bandM} onChange={e => updatePrice('bandM', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                            </div>
                        )}
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Coulage (€/m²)</label>
                                <input type="number" value={prices.laborM2} onChange={e => updatePrice('laborM2', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Prépa (€/m²)</label>
                                <input type="number" value={prices.laborPrep} onChange={e => updatePrice('laborPrep', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                            </div>
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
