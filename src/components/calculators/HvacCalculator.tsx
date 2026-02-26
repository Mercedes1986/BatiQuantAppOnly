
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES } from '../../constants';
import { 
  Thermometer, Wind, Plus, Trash2, Home, LayoutGrid, Settings, Check, 
  ArrowRight, Info, Zap, Droplets, Fan, Flame, Activity, CircleDollarSign,
  Gauge, AlertTriangle
} from 'lucide-react';

interface HvacZone {
  id: string;
  type: 'living' | 'bedroom' | 'kitchen' | 'bathroom' | 'wc' | 'other';
  label: string;
  area: number;
  powerW: number; // Calculated power need
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const HvacCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Thermal Context ---
  const [insulationLevel, setInsulationLevel] = useState<'rt2012' | 'renov_good' | 'renov_avg' | 'poor'>('renov_good');
  const [ceilingHeight, setCeilingHeight] = useState(2.5);
  const [targetTemp, setTargetTemp] = useState(20);
  const [wattsPerM2, setWattsPerM2] = useState(80); // Auto-updated based on insulation

  // --- 2. Zones (Inventory) ---
  const [zones, setZones] = useState<HvacZone[]>([]);
  const [newZoneType, setNewZoneType] = useState<HvacZone['type']>('living');
  const [newZoneArea, setNewZoneArea] = useState('');

  // --- 3. Heating System ---
  const [generatorType, setGeneratorType] = useState<'pac_air_water' | 'pac_air_air' | 'boiler_gas' | 'elec_rad'>('pac_air_water');
  const [emitterType, setEmitterType] = useState<'radiator_water' | 'floor' | 'radiator_elec' | 'split'>('radiator_water');
  // For Floor heating
  const [floorPitch, setFloorPitch] = useState(15); // cm
  const [floorPipeType, setFloorPipeType] = useState('per'); // per, multicouche

  // --- 4. Ventilation ---
  const [vmcType, setVmcType] = useState<'simple_auto' | 'simple_hygro' | 'double_flux'>('simple_hygro');
  const [ductType, setDuctType] = useState<'flexible' | 'rigid'>('flexible');
  const [useInsulatedDucts, setUseInsulatedDucts] = useState(true);

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    // Generators
    pacAirWater: 8000,
    pacAirAir: 2500, // Mono-split base
    boilerGas: 3000,
    
    // Emitters
    radElec: 200, // Avg unit
    radWater: 300, // Avg unit
    splitUnit: 600, // Indoor unit
    
    // Floor Heating
    floorPipeM: 1.5, // €/m
    floorCollector: 300, // Nourrice
    floorInsulation: 15, // €/m2
    
    // VMC
    kitVmcSimple: 150,
    kitVmcHygro: 350,
    kitVmcDouble: 2000,
    ductM: 8, // Gaine isolée
    ventUnit: 25, // Bouche
    
    // Network
    copperPipeM: 12,
    perPipeM: 2,
    
    // Labor
    laborDay: 400,
    installPac: 1500,
    installVmc: 300
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Auto Logic: W/m2 based on Insulation ---
  useEffect(() => {
    switch (insulationLevel) {
        case 'rt2012': setWattsPerM2(40); break; // BBC/RT2012
        case 'renov_good': setWattsPerM2(70); break; // Good renovation
        case 'renov_avg': setWattsPerM2(100); break; // Average
        case 'poor': setWattsPerM2(140); break; // Passoire
    }
  }, [insulationLevel]);

  // --- Auto Logic: Emitter consistency ---
  useEffect(() => {
    if (generatorType === 'elec_rad') setEmitterType('radiator_elec');
    else if (generatorType === 'pac_air_air') setEmitterType('split');
    else {
        // Hydraulic systems
        if (emitterType === 'radiator_elec' || emitterType === 'split') setEmitterType('radiator_water');
    }
  }, [generatorType]);

  // --- Helpers ---
  const addZone = () => {
    const area = parseFloat(newZoneArea);
    if (!area) return;
    
    // Calculate power needed for this room
    // Boost for bathrooms (+20%)
    let coef = 1;
    if (newZoneType === 'bathroom') coef = 1.2;
    
    const power = area * wattsPerM2 * coef;

    const labelMap: Record<string, string> = {
        living: 'Séjour / Salon', bedroom: 'Chambre', kitchen: 'Cuisine',
        bathroom: 'SDB', wc: 'WC', other: 'Autre'
    };

    setZones([...zones, {
        id: Date.now().toString(),
        type: newZoneType,
        label: labelMap[newZoneType],
        area,
        powerW: Math.ceil(power)
    }]);
    setNewZoneArea('');
  };

  const removeZone = (id: string) => setZones(zones.filter(z => z.id !== id));

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
      let totalArea = 0;
      let totalPower = 0;
      const materialsList: any[] = [];
      let totalCost = 0;

      // Stats
      let nbWetRooms = 0; // Cuisine, SDB, WC
      let nbDryRooms = 0; // Salon, Chambre

      zones.forEach(z => {
          totalArea += z.area;
          totalPower += z.powerW;
          if (['kitchen', 'bathroom', 'wc'].includes(z.type)) nbWetRooms++;
          else nbDryRooms++;
      });

      // 1. GENERATOR
      let genCost = 0;
      if (generatorType === 'pac_air_water') genCost = prices.pacAirWater;
      if (generatorType === 'pac_air_air') genCost = prices.pacAirAir + ((nbDryRooms > 1) ? (nbDryRooms - 1) * 800 : 0); // Multisplit cost approx
      if (generatorType === 'boiler_gas') genCost = prices.boilerGas;
      
      if (generatorType !== 'elec_rad') {
          totalCost += genCost;
          materialsList.push({
              id: 'generator',
              name: generatorType === 'pac_air_water' ? 'PAC Air/Eau' : generatorType === 'pac_air_air' ? 'PAC Air/Air (Groupe Ext)' : 'Chaudière Gaz',
              quantity: 1,
              unit: Unit.PIECE,
              unitPrice: genCost,
              totalPrice: genCost,
              category: CalculatorType.HVAC,
              details: `Puissance estimée: ${(totalPower/1000).toFixed(1)} kW`
          });
          
          // Labor Generator
          if (proMode) {
              const labGen = prices.installPac;
              totalCost += labGen;
              materialsList.push({ id: 'lab_gen', name: 'Pose Générateur + Mise en service', quantity: 1, unit: Unit.PACKAGE, unitPrice: labGen, totalPrice: labGen, category: CalculatorType.HVAC });
          }
      }

      // 2. EMITTERS & DISTRIBUTION
      let emittersCost = 0;
      let networkCost = 0;

      if (emitterType === 'floor') {
          // Floor Heating
          // Tube length: Area / Pitch
          const pipeLen = totalArea / (floorPitch / 100);
          const costPipe = pipeLen * prices.floorPipeM;
          // Insulation
          const costInsul = totalArea * prices.floorInsulation;
          // Collectors (approx 1 loop per 15m2 or per room)
          const loops = Math.max(zones.length, Math.ceil(totalArea / 15));
          const collectors = Math.ceil(loops / 6); // 6 loops per manifold approx
          const costCol = collectors * prices.floorCollector;

          emittersCost = costPipe + costInsul + costCol;
          
          materialsList.push(
              { id: 'floor_pipe', name: `Tube PER BAO (Pas ${floorPitch}cm)`, quantity: Math.ceil(pipeLen), unit: Unit.METER, unitPrice: prices.floorPipeM, totalPrice: costPipe, category: CalculatorType.HVAC },
              { id: 'floor_insul', name: 'Plaques Isolantes à plots', quantity: Math.ceil(totalArea), unit: Unit.M2, unitPrice: prices.floorInsulation, totalPrice: costInsul, category: CalculatorType.HVAC },
              { id: 'floor_col', name: 'Collecteurs / Nourrices', quantity: collectors, unit: Unit.PIECE, unitPrice: prices.floorCollector, totalPrice: costCol, category: CalculatorType.HVAC, details: `${loops} boucles` }
          );

      } else if (emitterType === 'radiator_water') {
          // Hydraulic Radiators
          const nbRads = zones.length; // 1 per room approx
          const costRads = nbRads * prices.radWater;
          // Pipes (Alimentation) - approx 15m per radiator (aller/retour)
          const pipeLen = nbRads * 15;
          const costPipe = pipeLen * (proMode ? prices.copperPipeM : prices.perPipeM); // Copper or PER/Multiskin

          emittersCost = costRads;
          networkCost = costPipe;

          materialsList.push(
              { id: 'rads_water', name: 'Radiateurs Eau Chaude', quantity: nbRads, unit: Unit.PIECE, unitPrice: prices.radWater, totalPrice: costRads, category: CalculatorType.HVAC },
              { id: 'pipes_water', name: 'Distribution (Tuyauterie)', quantity: pipeLen, unit: Unit.METER, unitPrice: proMode ? prices.copperPipeM : prices.perPipeM, totalPrice: costPipe, category: CalculatorType.HVAC }
          );

      } else if (emitterType === 'radiator_elec') {
          // Electric Radiators
          const nbRads = zones.length;
          const costRads = nbRads * prices.radElec;
          emittersCost = costRads;
          
          materialsList.push({
              id: 'rads_elec', name: 'Radiateurs Électriques', quantity: nbRads, unit: Unit.PIECE, unitPrice: prices.radElec, totalPrice: costRads, category: CalculatorType.HVAC
          });

      } else if (emitterType === 'split') {
          // Splits (Air/Air)
          // 1 unit per room (or per main room)
          const nbSplits = zones.length;
          const costSplits = nbSplits * prices.splitUnit;
          // Refrigerant lines
          const lineLen = nbSplits * 10; // 10m avg
          const costLines = lineLen * 25; // €/m approx for copper isolated

          emittersCost = costSplits;
          networkCost = costLines;

          materialsList.push(
              { id: 'splits', name: 'Unités Intérieures (Splits)', quantity: nbSplits, unit: Unit.PIECE, unitPrice: prices.splitUnit, totalPrice: costSplits, category: CalculatorType.HVAC },
              { id: 'frigo_lines', name: 'Liaisons Frigorifiques', quantity: lineLen, unit: Unit.METER, unitPrice: 25, totalPrice: costLines, category: CalculatorType.HVAC }
          );
      }

      totalCost += emittersCost + networkCost;

      // 3. VENTILATION (VMC)
      let vmcCost = 0;
      // Kit Price
      let kitPrice = prices.kitVmcSimple;
      let kitName = 'Kit VMC Simple Flux';
      if (vmcType === 'simple_hygro') { kitPrice = prices.kitVmcHygro; kitName = 'Kit VMC Hygro B'; }
      if (vmcType === 'double_flux') { kitPrice = prices.kitVmcDouble; kitName = 'Kit VMC Double Flux'; }

      // Vents
      // Simple Flux: Extraction in Wet rooms. Inlets on windows (Carpentry usually, or add here?)
      // Double Flux: Extraction Wet, Supply Dry.
      let nbExtract = nbWetRooms;
      let nbSupply = vmcType === 'double_flux' ? nbDryRooms : 0;
      const totalVents = nbExtract + nbSupply;
      const costVents = Math.max(0, totalVents - 3) * prices.ventUnit; // Assume kit includes ~3 vents

      // Ducts
      // Avg 6m per vent
      const ductLen = totalVents * 6;
      const costDucts = ductLen * prices.ductM;

      vmcCost = kitPrice + costVents + costDucts;
      
      materialsList.push(
          { id: 'vmc_box', name: kitName, quantity: 1, unit: Unit.PIECE, unitPrice: kitPrice, totalPrice: kitPrice, category: CalculatorType.HVAC },
          { id: 'vmc_ducts', name: `Gaines ${useInsulatedDucts ? 'Isolées' : 'Standard'}`, quantity: ductLen, unit: Unit.METER, unitPrice: prices.ductM, totalPrice: costDucts, category: CalculatorType.HVAC },
          { id: 'vmc_vents', name: 'Bouches supplémentaires', quantity: Math.max(0, totalVents - 3), unit: Unit.PIECE, unitPrice: prices.ventUnit, totalPrice: costVents, category: CalculatorType.HVAC, details: `${nbExtract} Extrac. / ${nbSupply} Insuf.` }
      );

      // Labor VMC
      if (proMode) {
          const labVmc = prices.installVmc + (totalVents * 50); // Base + per vent
          vmcCost += labVmc;
          materialsList.push({ id: 'lab_vmc', name: 'Pose VMC & Réseau', quantity: 1, unit: Unit.PACKAGE, unitPrice: labVmc, totalPrice: labVmc, category: CalculatorType.HVAC });
      }

      totalCost += vmcCost;

      return {
          totalCost,
          materials: materialsList,
          totalPower,
          totalArea,
          nbWetRooms
      };

  }, [zones, insulationLevel, generatorType, emitterType, floorPitch, vmcType, prices, proMode, useInsulatedDucts]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${(calculationData.totalPower/1000).toFixed(1)} kW (Chauffage) + VMC`,
          details: [
              { label: 'Surface', value: calculationData.totalArea, unit: 'm²' },
              { label: 'Puissance Est.', value: (calculationData.totalPower/1000).toFixed(1), unit: 'kW' },
              { label: 'Type Chauffage', value: generatorType === 'elec_rad' ? 'Électrique' : 'Hydraulique/PAC', unit: '' },
              { label: 'Ventilation', value: vmcType === 'double_flux' ? 'Double Flux' : 'Simple Flux', unit: '' }
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
                {s === 1 && '1. Isolation'}
                {s === 2 && '2. Pièces'}
                {s === 3 && '3. Chauffage'}
                {s === 4 && '4. VMC'}
                {s === 5 && '5. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: THERMAL CONTEXT */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Activity size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Définissez le niveau d'isolation pour estimer les besoins en puissance.
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Niveau d'isolation</label>
                    <div className="grid grid-cols-1 gap-2">
                        <button onClick={() => setInsulationLevel('rt2012')} className={`p-3 rounded border text-left text-sm ${insulationLevel === 'rt2012' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' : 'bg-white text-slate-600'}`}>
                            <span className="font-bold block">Excellent (RT2012 / RE2020)</span>
                            <span className="text-xs opacity-75">~40 W/m²</span>
                        </button>
                        <button onClick={() => setInsulationLevel('renov_good')} className={`p-3 rounded border text-left text-sm ${insulationLevel === 'renov_good' ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500' : 'bg-white text-slate-600'}`}>
                            <span className="font-bold block">Bon (Rénovation isolée)</span>
                            <span className="text-xs opacity-75">~70 W/m²</span>
                        </button>
                        <button onClick={() => setInsulationLevel('renov_avg')} className={`p-3 rounded border text-left text-sm ${insulationLevel === 'renov_avg' ? 'bg-amber-50 border-amber-500 text-amber-800 ring-1 ring-amber-500' : 'bg-white text-slate-600'}`}>
                            <span className="font-bold block">Moyen (Isolation ancienne)</span>
                            <span className="text-xs opacity-75">~100 W/m²</span>
                        </button>
                        <button onClick={() => setInsulationLevel('poor')} className={`p-3 rounded border text-left text-sm ${insulationLevel === 'poor' ? 'bg-red-50 border-red-500 text-red-800 ring-1 ring-red-500' : 'bg-white text-slate-600'}`}>
                            <span className="font-bold block">Faible (Non isolé)</span>
                            <span className="text-xs opacity-75">~140 W/m²</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur Plafond (m)</label>
                        <input type="number" value={ceilingHeight} onChange={e => setCeilingHeight(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ratio (W/m²)</label>
                        <input type="number" value={wattsPerM2} onChange={e => setWattsPerM2(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                    </div>
                </div>

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: ZONES */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajoutez les pièces pour calculer la puissance totale et les besoins en ventilation.
                </div>

                {/* Zone List */}
                <div className="space-y-2">
                    {zones.map(zone => (
                        <div key={zone.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                            <div>
                                <span className="font-bold text-slate-700 block">{zone.label}</span>
                                <span className="text-xs text-slate-500">{zone.area} m² • Besoin: {zone.powerW} W</span>
                            </div>
                            <button onClick={() => removeZone(zone.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    {zones.length === 0 && <div className="text-center text-sm text-slate-400 py-4 italic">Aucune pièce ajoutée.</div>}
                </div>

                {/* Add Zone */}
                <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 flex gap-2">
                   <select 
                     value={newZoneType} 
                     onChange={(e) => setNewZoneType(e.target.value as any)} 
                     className="flex-1 text-sm border-slate-300 rounded-lg"
                   >
                       <option value="living">Séjour</option>
                       <option value="bedroom">Chambre</option>
                       <option value="kitchen">Cuisine</option>
                       <option value="bathroom">SDB</option>
                       <option value="wc">WC</option>
                       <option value="other">Autre</option>
                   </select>
                   <input 
                     type="number" 
                     placeholder="m²"
                     value={newZoneArea} 
                     onChange={(e) => setNewZoneArea(e.target.value)} 
                     className="w-20 text-sm border-slate-300 rounded-lg p-2"
                   />
                   <button onClick={addZone} className="bg-blue-600 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95">
                       <Plus size={18} />
                   </button>
               </div>

               <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: HEATING SYSTEM */}
        {step === 3 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Flame size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Configuration du système de chauffage.
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Générateur</label>
                        <select value={generatorType} onChange={e => setGeneratorType(e.target.value as any)} className="w-full p-3 border rounded bg-white text-slate-900">
                            <option value="pac_air_water">Pompe à Chaleur Air/Eau</option>
                            <option value="pac_air_air">Pompe à Chaleur Air/Air (Clim)</option>
                            <option value="boiler_gas">Chaudière Gaz</option>
                            <option value="elec_rad">Tout Électrique (Radiateurs)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Émetteurs</label>
                        <select value={emitterType} onChange={e => setEmitterType(e.target.value as any)} className="w-full p-3 border rounded bg-white text-slate-900">
                            {generatorType === 'elec_rad' ? (
                                <option value="radiator_elec">Radiateurs Électriques</option>
                            ) : generatorType === 'pac_air_air' ? (
                                <option value="split">Splits Muraux / Console</option>
                            ) : (
                                <>
                                <option value="radiator_water">Radiateurs Eau</option>
                                <option value="floor">Plancher Chauffant</option>
                                </>
                            )}
                        </select>
                    </div>

                    {emitterType === 'floor' && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 animate-in fade-in">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pas de pose (cm)</label>
                            <div className="flex gap-2">
                                <button onClick={() => setFloorPitch(15)} className={`flex-1 py-1 text-sm rounded border ${floorPitch===15 ? 'bg-blue-100 border-blue-300 text-blue-700 font-bold' : 'bg-white'}`}>15 cm</button>
                                <button onClick={() => setFloorPitch(20)} className={`flex-1 py-1 text-sm rounded border ${floorPitch===20 ? 'bg-blue-100 border-blue-300 text-blue-700 font-bold' : 'bg-white'}`}>20 cm</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 4: VENTILATION */}
        {step === 4 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Fan size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Type de VMC et réseaux. Les bouches sont calculées selon les pièces d'eau.
                </div>

                <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type de VMC</label>
                    <div className="grid grid-cols-1 gap-2">
                        <button onClick={() => setVmcType('simple_auto')} className={`p-3 rounded border text-left text-sm ${vmcType === 'simple_auto' ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500' : 'bg-white text-slate-600'}`}>
                            <span className="font-bold block">Simple Flux Autoréglable</span>
                            <span className="text-xs opacity-75">Base standard</span>
                        </button>
                        <button onClick={() => setVmcType('simple_hygro')} className={`p-3 rounded border text-left text-sm ${vmcType === 'simple_hygro' ? 'bg-blue-50 border-blue-500 text-blue-800 ring-1 ring-blue-500' : 'bg-white text-slate-600'}`}>
                            <span className="font-bold block">Simple Flux Hygro B</span>
                            <span className="text-xs opacity-75">Économe (Débit variable)</span>
                        </button>
                        <button onClick={() => setVmcType('double_flux')} className={`p-3 rounded border text-left text-sm ${vmcType === 'double_flux' ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' : 'bg-white text-slate-600'}`}>
                            <span className="font-bold block">Double Flux</span>
                            <span className="text-xs opacity-75">Récupération calories (Haut rendement)</span>
                        </button>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Réseau Gaines</h4>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm">Gaines Isolées</span>
                            <input type="checkbox" checked={useInsulatedDucts} onChange={e => setUseInsulatedDucts(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                        </div>
                        {calculationData.nbWetRooms === 0 && (
                            <div className="flex items-start text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                                <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0"/>
                                <span>Attention : Aucune pièce d'eau (Cuisine/SDB) détectée. Ajoutez des pièces à l'étape 2.</span>
                            </div>
                        )}
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
                        <h4 className="text-xs font-bold text-slate-500 uppercase">Prix Matériel (€)</h4>
                        <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                            <Settings size={12} className="mr-1"/> {proMode ? 'Mode Pro' : 'Mode Simple'}
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {generatorType === 'pac_air_water' && (
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">PAC Air/Eau</label>
                                <input type="number" value={prices.pacAirWater} onChange={e => updatePrice('pacAirWater', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                            </div>
                        )}
                        {emitterType === 'floor' && (
                            <>
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Tube Sol (€/m)</label>
                                <input type="number" value={prices.floorPipeM} onChange={e => updatePrice('floorPipeM', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 mb-1">Isolant Sol (€/m²)</label>
                                <input type="number" value={prices.floorInsulation} onChange={e => updatePrice('floorInsulation', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                            </div>
                            </>
                        )}
                        {/* Add more fields dynamically based on selection */}
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Kit VMC</label>
                            <input type="number" value={vmcType==='simple_auto'?prices.kitVmcSimple : vmcType==='simple_hygro'?prices.kitVmcHygro : prices.kitVmcDouble} onChange={e => updatePrice(vmcType==='simple_auto'?'kitVmcSimple':vmcType==='simple_hygro'?'kitVmcHygro':'kitVmcDouble', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                        </div>
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose PAC (€)</label>
                                <input type="number" value={prices.installPac} onChange={e => updatePrice('installPac', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm"/>
                            </div>
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose VMC (€)</label>
                                <input type="number" value={prices.installVmc} onChange={e => updatePrice('installVmc', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm"/>
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
