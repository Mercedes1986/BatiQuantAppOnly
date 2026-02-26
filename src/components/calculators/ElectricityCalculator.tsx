import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES } from '../../constants';
import { 
  Zap, Plus, Trash2, Home, LayoutGrid, Settings, Check, 
  ArrowRight, Info, AlertTriangle, Lightbulb, Power, ToggleLeft, 
  Wifi, ShieldCheck, Box, Cable, CircleDollarSign, Droplets
} from 'lucide-react';

interface ElecPoint {
  id: string;
  type: 'socket' | 'socket_spec' | 'light' | 'switch' | 'shutter' | 'heater' | 'network' | 'other';
  label: string;
  quantity: number;
}

interface ElecRoom {
  id: string;
  type: 'kitchen' | 'bedroom' | 'living' | 'bathroom' | 'wc' | 'other';
  label: string;
  points: ElecPoint[];
}

interface ElecCircuit {
  id: string;
  label: string;
  type: 'light' | 'socket' | 'special' | 'heater' | 'shutter' | 'other';
  protection: string; // "10A", "16A", "20A", "32A"
  cableSection: string; // "1.5", "2.5", "6"
  count: number;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const ElectricityCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Project & Rooms ---
  const [rooms, setRooms] = useState<ElecRoom[]>([]);
  const [newRoomType, setNewRoomType] = useState<ElecRoom['type']>('bedroom');
  
  // --- 2. Tech Specs ---
  const [renovation, setRenovation] = useState(false); // True = Goulottes/Saignées, False = Neuf/Encastré
  const [panelRows, setPanelRows] = useState(0); // Auto-calc usually
  const [avgDistPanel, setAvgDistPanel] = useState(10); // meters
  const [avgDistPoint, setAvgDistPoint] = useState(3); // meters

  // --- 3. Pricing ---
  const [prices, setPrices] = useState({
    socket: DEFAULT_PRICES.SOCKET_UNIT,
    switch: DEFAULT_PRICES.SWITCH_UNIT,
    lightPoint: 5.0, // Boite DCL + Douille
    socketSpec: 12.0, // 20A/32A outlet
    breaker: DEFAULT_PRICES.BREAKER_UNIT, // Disjoncteur
    diffSwitch: 45.0, // Inter Diff
    panelRow: 50.0, // Rangée équipée (coffret nu + peignes)
    cable15: 0.45, // €/m
    cable25: 0.70, // €/m
    cable6: 2.50, // €/m
    conduit: DEFAULT_PRICES.CONDUIT_ICTA_20_100M / 100,
    box: 1.50, // Boite encastrement
    laborPoint: 45.0, // €/point (pose appareillage + raccordement)
    laborPanel: 250.0 // Forfait tableau
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers ---
  const addRoom = () => {
    const labelMap: Record<string, string> = {
        kitchen: 'Cuisine', bedroom: 'Chambre', living: 'Séjour', 
        bathroom: 'SDB', wc: 'WC', other: 'Pièce'
    };
    const newRoom: ElecRoom = {
      id: Date.now().toString(),
      type: newRoomType,
      label: `${labelMap[newRoomType]} ${rooms.filter(r => r.type === newRoomType).length + 1}`,
      points: []
    };
    // Add default points based on room type (NFC 15-100 comfort)
    if (newRoomType === 'kitchen') {
        newRoom.points.push(
            { id: 'p1', type: 'light', label: 'Point Centre', quantity: 1 },
            { id: 'p2', type: 'switch', label: 'Interrupteur', quantity: 1 },
            { id: 'p3', type: 'socket', label: 'Prises Plan Travail', quantity: 4 },
            { id: 'p4', type: 'socket_spec', label: 'Prise Four', quantity: 1 },
            { id: 'p5', type: 'socket_spec', label: 'Prise 32A Cuisson', quantity: 1 },
            { id: 'p6', type: 'socket_spec', label: 'Lave-Vaisselle', quantity: 1 },
        );
    } else if (newRoomType === 'living') {
        newRoom.points.push(
            { id: 'p1', type: 'light', label: 'Point Centre', quantity: 1 },
            { id: 'p2', type: 'switch', label: 'Interrupteur', quantity: 2 },
            { id: 'p3', type: 'socket', label: 'Prises', quantity: 5 },
            { id: 'p4', type: 'network', label: 'Prise RJ45/TV', quantity: 2 },
        );
    } else if (newRoomType === 'bedroom') {
        newRoom.points.push(
            { id: 'p1', type: 'light', label: 'Point Centre', quantity: 1 },
            { id: 'p2', type: 'switch', label: 'Interrupteur', quantity: 1 },
            { id: 'p3', type: 'socket', label: 'Prises', quantity: 3 },
            { id: 'p4', type: 'network', label: 'Prise RJ45', quantity: 1 },
        );
    } else if (newRoomType === 'bathroom') {
        newRoom.points.push(
            { id: 'p1', type: 'light', label: 'Eclairage Miroir', quantity: 1 },
            { id: 'p2', type: 'light', label: 'Point Centre IPx4', quantity: 1 },
            { id: 'p3', type: 'switch', label: 'Interrupteur', quantity: 1 },
            { id: 'p4', type: 'socket', label: 'Prise Rasoir/Sèche-ch.', quantity: 2 },
            { id: 'p5', type: 'socket_spec', label: 'Lave-Linge', quantity: 1 },
        );
    } else {
        newRoom.points.push(
            { id: 'p1', type: 'light', label: 'Point Lumineux', quantity: 1 },
            { id: 'p2', type: 'switch', label: 'Interrupteur', quantity: 1 },
            { id: 'p3', type: 'socket', label: 'Prise', quantity: 1 },
        );
    }
    setRooms([...rooms, newRoom]);
  };

  const updatePoint = (roomId: string, pointId: string, delta: number) => {
    setRooms(rooms.map(r => {
        if (r.id !== roomId) return r;
        return {
            ...r,
            points: r.points.map(p => p.id === pointId ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p).filter(p => p.quantity > 0)
        };
    }));
  };

  const addPointToRoom = (roomId: string, type: ElecPoint['type']) => {
     setRooms(rooms.map(r => {
         if (r.id !== roomId) return r;
         const labels: Record<string, string> = {
             socket: 'Prise 16A', socket_spec: 'Prise Spécialisée', light: 'Point Lumineux',
             switch: 'Interrupteur', shutter: 'Volet Roulant', heater: 'Chauffage Elec',
             network: 'RJ45/TV'
         };
         return {
             ...r,
             points: [...r.points, { id: Date.now().toString(), type, label: labels[type] || 'Autre', quantity: 1 }]
         };
     }));
  };

  const removeRoom = (id: string) => {
      setRooms(rooms.filter(r => r.id !== id));
  };

  // --- ENGINE: Auto-Generate Circuits & Bill of Materials ---
  const calculationData = useMemo(() => {
      let totalSockets = 0;
      let totalLights = 0;
      let totalSwitches = 0;
      let totalSpecial = 0;
      let totalShutters = 0;
      let totalHeaters = 0;
      let totalNetwork = 0;

      // 1. Aggregation
      rooms.forEach(r => {
          r.points.forEach(p => {
              if (p.type === 'socket') totalSockets += p.quantity;
              if (p.type === 'light') totalLights += p.quantity;
              if (p.type === 'switch') totalSwitches += p.quantity;
              if (p.type === 'socket_spec') totalSpecial += p.quantity;
              if (p.type === 'shutter') totalShutters += p.quantity;
              if (p.type === 'heater') totalHeaters += p.quantity;
              if (p.type === 'network') totalNetwork += p.quantity;
          });
      });

      // 2. Circuits Generation (NFC 15-100 standard approximation)
      const circuits: ElecCircuit[] = [];
      
      // Lights: Max 8 per circuit, 10A or 16A, 1.5mm2
      const nbLightCircuits = Math.ceil(totalLights / 8);
      if (nbLightCircuits > 0) {
          circuits.push({ id: 'c_light', label: 'Eclairage', type: 'light', protection: '10A', cableSection: '1.5', count: nbLightCircuits });
      }

      // Sockets: Max 8 (1.5mm2) or 12 (2.5mm2). Let's go with standard 8 per 16A/20A group on 2.5mm2
      const nbSocketCircuits = Math.ceil(totalSockets / 8);
      if (nbSocketCircuits > 0) {
          circuits.push({ id: 'c_socket', label: 'Prises', type: 'socket', protection: '16A', cableSection: '2.5', count: nbSocketCircuits });
      }

      // Specialized: 1 per point (Oven 32A, Washing 20A, etc.)
      let spec32A = 0;
      let spec20A = totalSpecial;
      if (rooms.some(r => r.type === 'kitchen') && totalSpecial > 0) {
          spec32A = 1;
          spec20A = Math.max(0, totalSpecial - 1);
      }
      if (spec32A > 0) circuits.push({ id: 'c_32a', label: 'Plaque Cuisson', type: 'special', protection: '32A', cableSection: '6', count: spec32A });
      if (spec20A > 0) circuits.push({ id: 'c_20a', label: 'Circuit Spécialisé (LL/LV/Four)', type: 'special', protection: '20A', cableSection: '2.5', count: spec20A });

      // Shutters: Max 8 per circuit
      const nbShutterCircuits = Math.ceil(totalShutters / 8);
      if (nbShutterCircuits > 0) {
          circuits.push({ id: 'c_shutter', label: 'Volets Roulants', type: 'shutter', protection: '16A', cableSection: '1.5', count: nbShutterCircuits });
      }

      // Heaters: Max 4500W per circuit (approx 2 large heaters). Let's say 2 heaters per circuit avg.
      const nbHeaterCircuits = Math.ceil(totalHeaters / 2);
      if (nbHeaterCircuits > 0) {
          circuits.push({ 
              id: 'c_heater', 
              label: 'Chauffage', 
              type: 'heater', 
              protection: '20A', 
              cableSection: '2.5', 
              count: nbHeaterCircuits 
          });
      }

      // Cost Calculation
      let totalCost = 0;
      const materialsList: any[] = [];

      // 1. Points
      if (totalSockets > 0) {
          const cost = totalSockets * prices.socket;
          totalCost += cost;
          materialsList.push({ id: 'sockets', name: 'Prises de courant 16A', quantity: totalSockets, unit: Unit.PIECE, unitPrice: prices.socket, totalPrice: cost, category: CalculatorType.ELECTRICITY });
      }
      if (totalSwitches > 0) {
          const cost = totalSwitches * prices.switch;
          totalCost += cost;
          materialsList.push({ id: 'switches', name: 'Interrupteurs / Va-et-Vient', quantity: totalSwitches, unit: Unit.PIECE, unitPrice: prices.switch, totalPrice: cost, category: CalculatorType.ELECTRICITY });
      }
      if (totalLights > 0) {
          const cost = totalLights * prices.lightPoint;
          totalCost += cost;
          materialsList.push({ id: 'lights', name: 'Points Lumineux (DCL)', quantity: totalLights, unit: Unit.PIECE, unitPrice: prices.lightPoint, totalPrice: cost, category: CalculatorType.ELECTRICITY });
      }
      if (totalSpecial > 0) {
          const cost = totalSpecial * prices.socketSpec;
          totalCost += cost;
          materialsList.push({ id: 'special', name: 'Prises Spécialisées (20A/32A)', quantity: totalSpecial, unit: Unit.PIECE, unitPrice: prices.socketSpec, totalPrice: cost, category: CalculatorType.ELECTRICITY });
      }
      if (totalNetwork > 0) {
          const cost = totalNetwork * prices.socket;
          totalCost += cost;
          materialsList.push({ id: 'network', name: 'Prises RJ45 / TV', quantity: totalNetwork, unit: Unit.PIECE, unitPrice: prices.socket, totalPrice: cost, category: CalculatorType.ELECTRICITY });
      }
      
      const totalPoints = totalSockets + totalSwitches + totalLights + totalSpecial + totalNetwork;
      const costBoxes = totalPoints * prices.box;
      totalCost += costBoxes;
      materialsList.push({ id: 'boxes', name: 'Boites d\'encastrement', quantity: totalPoints, unit: Unit.PIECE, unitPrice: prices.box, totalPrice: costBoxes, category: CalculatorType.ELECTRICITY });

      // 2. Cables
      const pts15 = totalLights + totalSwitches + totalShutters;
      const len15 = pts15 * avgDistPoint + (nbLightCircuits + nbShutterCircuits) * avgDistPanel;
      const cost15 = len15 * prices.cable15;
      
      const circuits32A = circuits.filter(c => c.cableSection === '6').reduce((acc, c) => acc + c.count, 0);
      const len6 = circuits32A * avgDistPanel;
      const cost6 = len6 * prices.cable6;

      const pts25 = totalSockets + totalSpecial + totalHeaters;
      const circuits25 = circuits.filter(c => c.cableSection === '2.5').reduce((acc, c) => acc + c.count, 0);
      const len25 = (pts25 - circuits32A) * avgDistPoint + circuits25 * avgDistPanel;
      const cost25 = len25 * prices.cable25;

      const totalCableLen = len15 + len25 + len6;
      const costConduit = totalCableLen * prices.conduit;

      totalCost += cost15 + cost25 + cost6 + costConduit;
      
      if (len15 > 0) materialsList.push({ id: 'cable15', name: 'Fil H07VU 1.5mm²', quantity: Math.ceil(len15), unit: Unit.METER, unitPrice: prices.cable15, totalPrice: parseFloat(cost15.toFixed(2)), category: CalculatorType.ELECTRICITY });
      if (len25 > 0) materialsList.push({ id: 'cable25', name: 'Fil H07VU 2.5mm²', quantity: Math.ceil(len25), unit: Unit.METER, unitPrice: prices.cable25, totalPrice: parseFloat(cost25.toFixed(2)), category: CalculatorType.ELECTRICITY });
      if (len6 > 0) materialsList.push({ id: 'cable6', name: 'Fil H07VU 6mm²', quantity: Math.ceil(len6), unit: Unit.METER, unitPrice: prices.cable6, totalPrice: parseFloat(cost6.toFixed(2)), category: CalculatorType.ELECTRICITY });
      if (totalCableLen > 0) materialsList.push({ id: 'conduit', name: 'Gaine ICTA', quantity: Math.ceil(totalCableLen), unit: Unit.METER, unitPrice: prices.conduit, totalPrice: parseFloat(costConduit.toFixed(2)), category: CalculatorType.ELECTRICITY });

      // 3. Panel
      const totalBreakers = circuits.reduce((acc, c) => acc + c.count, 0);
      const costBreakers = totalBreakers * prices.breaker;
      const rowsNeeded = Math.ceil(totalBreakers / 11) || 1;
      const costRows = rowsNeeded * prices.panelRow;
      const costDiffs = rowsNeeded * prices.diffSwitch;

      totalCost += costBreakers + costRows + costDiffs;

      materialsList.push(
          { id: 'panel', name: `Tableau Électrique (${rowsNeeded} rangées)`, quantity: 1, unit: Unit.PIECE, unitPrice: costRows, totalPrice: costRows, category: CalculatorType.ELECTRICITY },
          { id: 'breakers', name: 'Disjoncteurs (10A/16A/20A/32A)', quantity: totalBreakers, unit: Unit.PIECE, unitPrice: prices.breaker, totalPrice: costBreakers, category: CalculatorType.ELECTRICITY },
          { id: 'diffs', name: 'Interrupteurs Différentiels 30mA', quantity: rowsNeeded, unit: Unit.PIECE, unitPrice: prices.diffSwitch, totalPrice: costDiffs, category: CalculatorType.ELECTRICITY }
      );

      // 4. Labor
      if (proMode) {
          const laborPts = totalPoints * prices.laborPoint;
          const laborPnl = prices.laborPanel * (rowsNeeded > 2 ? 1.5 : 1);
          const totalLabor = laborPts + laborPnl;
          
          totalCost += totalLabor;
          materialsList.push(
              { id: 'labor_pts', name: 'Main d\'œuvre (Appareillage)', quantity: totalPoints, unit: Unit.PIECE, unitPrice: prices.laborPoint, totalPrice: laborPts, category: CalculatorType.ELECTRICITY },
              { id: 'labor_pnl', name: 'Main d\'œuvre (Tableau)', quantity: 1, unit: Unit.PACKAGE, unitPrice: laborPnl, totalPrice: laborPnl, category: CalculatorType.ELECTRICITY }
          );
      }

      return {
          totalCost,
          materials: materialsList,
          summaryStats: {
              points: totalPoints,
              circuits: totalBreakers,
              panelRows: rowsNeeded
          }
      };
  }, [rooms, avgDistPanel, avgDistPoint, renovation, prices, proMode]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${calculationData.summaryStats.points} Points • ${calculationData.summaryStats.circuits} Circuits`,
          details: [
              { label: 'Points (Prises/Inter)', value: calculationData.summaryStats.points, unit: 'u' },
              { label: 'Circuits (Disj.)', value: calculationData.summaryStats.circuits, unit: 'u' },
              { label: 'Tableau', value: `${calculationData.summaryStats.panelRows} rangée(s)`, unit: '' }
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
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Pièces'}
                {s === 2 && '2. Config'}
                {s === 3 && '3. Prix'}
                {s === 4 && '4. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: ROOMS */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Home size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajoutez les pièces et définissez leurs équipements électriques.
                </div>

                <div className="space-y-4">
                    {rooms.map(room => (
                        <div key={room.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-100">
                                <div className="flex items-center space-x-2">
                                    <div className="bg-white p-1.5 rounded-lg shadow-sm">
                                        {room.type === 'kitchen' && <LayoutGrid size={16} className="text-orange-500"/>}
                                        {room.type === 'bedroom' && <Zap size={16} className="text-purple-500"/>}
                                        {room.type === 'living' && <TvIcon className="text-blue-500 w-4 h-4"/>}
                                        {room.type === 'bathroom' && <Droplets size={16} className="text-cyan-500"/>}
                                    </div>
                                    <span className="font-bold text-slate-700 text-sm">{room.label}</span>
                                </div>
                                <button onClick={() => removeRoom(room.id)} className="text-slate-300 hover:text-red-400">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <div className="p-3 grid grid-cols-2 gap-2">
                                {room.points.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100">
                                        <div className="flex items-center min-w-0">
                                            {p.type === 'socket' && <Power size={14} className="text-slate-400 mr-2"/>}
                                            {p.type === 'light' && <Lightbulb size={14} className="text-yellow-500 mr-2"/>}
                                            {p.type === 'switch' && <ToggleLeft size={14} className="text-slate-400 mr-2"/>}
                                            <span className="text-xs font-medium truncate pr-1">{p.label}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <button onClick={() => updatePoint(room.id, p.id, -1)} className="w-5 h-5 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100">-</button>
                                            <span className="text-xs font-bold w-4 text-center">{p.quantity}</span>
                                            <button onClick={() => updatePoint(room.id, p.id, 1)} className="w-5 h-5 flex items-center justify-center bg-white rounded border text-slate-500 hover:bg-slate-100">+</button>
                                        </div>
                                    </div>
                                ))}
                                <div className="col-span-2 pt-2 flex flex-wrap gap-2 justify-center border-t border-slate-100 mt-1">
                                    <button onClick={() => addPointToRoom(room.id, 'socket')} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">+ Prise</button>
                                    <button onClick={() => addPointToRoom(room.id, 'light')} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">+ Lampe</button>
                                    <button onClick={() => addPointToRoom(room.id, 'switch')} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">+ Inter</button>
                                    <button onClick={() => addPointToRoom(room.id, 'shutter')} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">+ Volet</button>
                                    <button onClick={() => addPointToRoom(room.id, 'heater')} className="px-2 py-1 text-[10px] bg-white border rounded hover:bg-slate-50">+ Chauff.</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 flex gap-2">
                   <select 
                     value={newRoomType} 
                     onChange={(e) => setNewRoomType(e.target.value as any)} 
                     className="flex-1 text-sm border-slate-300 rounded-lg"
                   >
                       <option value="bedroom">Chambre</option>
                       <option value="living">Séjour</option>
                       <option value="kitchen">Cuisine</option>
                       <option value="bathroom">SDB</option>
                       <option value="wc">WC</option>
                       <option value="other">Autre</option>
                   </select>
                   <button onClick={addRoom} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center">
                       <Plus size={16} className="mr-1"/> Ajouter
                   </button>
               </div>

               <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-4">
                   Suivant <ArrowRight size={18} className="ml-2"/>
               </button>
            </div>
        )}

        {/* STEP 2: CONFIG */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Cable size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Paramètres de câblage et distances.
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
                    <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <div>
                            <span className="text-sm font-medium block">Rénovation</span>
                            <span className="text-xs text-slate-400">Goulottes ou saignées (vs Neuf)</span>
                        </div>
                        <input type="checkbox" checked={renovation} onChange={e => setRenovation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dist. Moyenne Tableau (m)</label>
                        <input type="number" value={avgDistPanel} onChange={e => setAvgDistPanel(Number(e.target.value))} className="w-full p-2 text-sm border rounded bg-white"/>
                        <p className="text-[10px] text-slate-400 mt-1">Distance de chaque circuit jusqu'au tableau principal.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Dist. Moyenne Entre Points (m)</label>
                        <input type="number" value={avgDistPoint} onChange={e => setAvgDistPoint(Number(e.target.value))} className="w-full p-2 text-sm border rounded bg-white"/>
                        <p className="text-[10px] text-slate-400 mt-1">Distance entre deux prises ou interrupteur/lampe.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: PRICING */}
        {step === 3 && (
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
                            <label className="block text-[10px] text-slate-500 mb-1">Prise 16A (€)</label>
                            <input type="number" value={prices.socket} onChange={e => updatePrice('socket', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Interrupteur (€)</label>
                            <input type="number" value={prices.switch} onChange={e => updatePrice('switch', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Disjoncteur (€)</label>
                            <input type="number" value={prices.breaker} onChange={e => updatePrice('breaker', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Fil 2.5mm² (€/m)</label>
                            <input type="number" value={prices.cable25} onChange={e => updatePrice('cable25', e.target.value)} className="w-full p-1.5 border rounded text-sm"/>
                        </div>
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Point (€)</label>
                                <input type="number" value={prices.laborPoint} onChange={e => updatePrice('laborPoint', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm"/>
                            </div>
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">Forfait Tableau (€)</label>
                                <input type="number" value={prices.laborPanel} onChange={e => updatePrice('laborPanel', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm"/>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-2">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
                      <Check size={18} className="mr-2"/> Terminé
                   </button>
                </div>
            </div>
        )}
    </div>
  );
};

// Custom Icon for TV (fallback)
const TvIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
      <polyline points="17 2 12 7 7 2"></polyline>
    </svg>
);