
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES } from '../../constants';
import {
  Plus,
  Trash2,
  Home,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  AlertTriangle,
  Wrench,
  Bath,
  Waves,
  Thermometer,
  CircleDollarSign,
} from 'lucide-react';

interface PlumbAppliance {
  id: string;
  type:
    | 'wc'
    | 'washbasin'
    | 'shower'
    | 'bath'
    | 'sink'
    | 'washing_machine'
    | 'dishwasher'
    | 'tap_ext';
  label: string;
  quantity: number;
  needsHotWater: boolean;
  drainDiameter: number; // mm
}

interface PlumbRoom {
  id: string;
  type: 'kitchen' | 'bathroom' | 'wc' | 'laundry' | 'other';
  label: string;
  appliances: PlumbAppliance[];
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const inputBase =
  'w-full p-1.5 border rounded text-sm bg-white text-slate-900 placeholder:text-slate-400';
const selectBase =
  'w-full p-2 text-sm border rounded bg-white text-slate-900';
const inputPro =
  'w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900';

export const PlumbingCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Project Inventory ---
  const [rooms, setRooms] = useState<PlumbRoom[]>([]);
  const [newRoomType, setNewRoomType] = useState<PlumbRoom['type']>('bathroom');

  // --- 2. Networks ---
  const [supplyMaterial, setSupplyMaterial] = useState<'per' | 'multiskin' | 'copper'>('per');
  const [distributionMode, setDistributionMode] = useState<'manifold' | 'series'>('manifold');
  const [avgDistManifold, setAvgDistManifold] = useState(6); // meters
  const [avgDistDrain, setAvgDistDrain] = useState(3); // meters

  // --- 3. Equipment ---
  const [waterHeater, setWaterHeater] = useState({
    active: true,
    type: 'electric_tank' as 'electric_tank' | 'thermo',
    capacity: 200, // Liters
  });

  // --- 4. Pricing ---
  const [prices, setPrices] = useState({
    // Supply Pipe (per m)
    pipePer: DEFAULT_PRICES.PER_PIPE_100M / 100, // 0.60
    pipeMulti: 1.2,
    pipeCopper: 8.0,
    // Drain Pipe (per m)
    pvc32: 1.5,
    pvc40: DEFAULT_PRICES.PVC_PIPE_4M / 4, // 2.00
    pvc50: 3.0,
    pvc100: 5.0,
    // Fittings & Accessories
    manifoldPort: 8.0, // Price per port approx
    fittingUnit: 3.5, // Avg price per fitting (elbow/tee/crimp)
    valve: 12.0,
    siphon: 8.0,
    safetyGroup: 25.0, // Groupe securité chauffe-eau
    // Appliances (Supply)
    wcPack: 150.0,
    washbasinPack: 120.0,
    showerPack: 300.0, // Tray + Valve + Screen
    bathPack: 400.0,
    sinkPack: 100.0,
    tapExt: 35.0,
    waterHeater200: 350.0,
    // Labor
    laborPoint: 80.0, // Pose appareil
    laborNetwork: 15.0, // Pose ml tuyauterie
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Helpers: Defaults ---
  const getApplianceDefaults = (type: PlumbAppliance['type']): Partial<PlumbAppliance> => {
    switch (type) {
      case 'wc':
        return { label: 'WC', needsHotWater: false, drainDiameter: 100 };
      case 'washbasin':
        return { label: 'Lavabo / Vasque', needsHotWater: true, drainDiameter: 32 };
      case 'shower':
        return { label: 'Douche', needsHotWater: true, drainDiameter: 40 };
      case 'bath':
        return { label: 'Baignoire', needsHotWater: true, drainDiameter: 40 };
      case 'sink':
        return { label: 'Évier Cuisine', needsHotWater: true, drainDiameter: 40 };
      case 'washing_machine':
        return { label: 'Lave-Linge', needsHotWater: false, drainDiameter: 40 };
      case 'dishwasher':
        return { label: 'Lave-Vaisselle', needsHotWater: false, drainDiameter: 40 };
      case 'tap_ext':
        return { label: 'Robinet Ext.', needsHotWater: false, drainDiameter: 0 };
      default:
        return { label: 'Autre', needsHotWater: false, drainDiameter: 40 };
    }
  };

  const addApplianceToRoomObj = (room: PlumbRoom, type: PlumbAppliance['type']) => {
    const defs = getApplianceDefaults(type);
    room.appliances.push({
      id: uid(),
      type,
      label: defs.label || 'Appareil',
      quantity: 1,
      needsHotWater: !!defs.needsHotWater,
      drainDiameter: defs.drainDiameter ?? 40,
    });
  };

  const addRoom = () => {
    const labelMap: Record<PlumbRoom['type'], string> = {
      kitchen: 'Cuisine',
      bathroom: 'Salle de Bain',
      wc: 'WC',
      laundry: 'Buanderie',
      other: 'Autre',
    };

    const newRoom: PlumbRoom = {
      id: uid(),
      type: newRoomType,
      label: `${labelMap[newRoomType]} ${rooms.filter((r) => r.type === newRoomType).length + 1}`,
      appliances: [],
    };

    // Auto-populate based on room type
    if (newRoomType === 'bathroom') {
      addApplianceToRoomObj(newRoom, 'washbasin');
      addApplianceToRoomObj(newRoom, 'shower');
    } else if (newRoomType === 'wc') {
      addApplianceToRoomObj(newRoom, 'wc');
      addApplianceToRoomObj(newRoom, 'washbasin'); // Lave-mains
    } else if (newRoomType === 'kitchen') {
      addApplianceToRoomObj(newRoom, 'sink');
      addApplianceToRoomObj(newRoom, 'dishwasher');
    } else if (newRoomType === 'laundry') {
      addApplianceToRoomObj(newRoom, 'washing_machine');
      // Chauffe-eau = réglage global dans Step 3 (pas un appareil de pièce)
    }

    setRooms((prev) => [...prev, newRoom]);
  };

  const addApplianceToRoom = (roomId: string, type: PlumbAppliance['type']) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        const defs = getApplianceDefaults(type);
        return {
          ...r,
          appliances: [
            ...r.appliances,
            {
              id: uid(),
              type,
              label: defs.label || 'Appareil',
              quantity: 1,
              needsHotWater: !!defs.needsHotWater,
              drainDiameter: defs.drainDiameter ?? 40,
            },
          ],
        };
      })
    );
  };

  const removeAppliance = (roomId: string, appId: string) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.id !== roomId) return r;
        return { ...r, appliances: r.appliances.filter((a) => a.id !== appId) };
      })
    );
  };

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalColdLines = 0;
    let totalHotLines = 0;

    let lenSupply = 0;
    let lenDrain32 = 0;
    let lenDrain40 = 0;
    let lenDrain50 = 0;
    let lenDrain100 = 0;

    let countSiphons = 0;
    let countFittings = 0; // Estimation

    const appliancesSummary: Record<string, number> = {};

    // 1. Iterate Appliances
    rooms.forEach((r) => {
      r.appliances.forEach((a) => {
        const qty = a.quantity;

        // Supply Lines
        totalColdLines += qty; // All need cold
        if (a.needsHotWater) totalHotLines += qty;

        // Supply Lengths
        const linesCount = qty * (a.needsHotWater ? 2 : 1);
        lenSupply += linesCount * avgDistManifold;

        // Drain Lengths
        if (a.drainDiameter > 0) {
          const len = qty * avgDistDrain;
          if (a.drainDiameter === 32) lenDrain32 += len;
          else if (a.drainDiameter === 40) lenDrain40 += len;
          else if (a.drainDiameter === 50) lenDrain50 += len;
          else if (a.drainDiameter === 100) lenDrain100 += len;

          countSiphons += qty;
        }

        // Fittings estimate (elbows/wall plates)
        countFittings += linesCount * 4; // 2 elbows + 2 connection points approx

        // Summary
        appliancesSummary[a.type] = (appliancesSummary[a.type] || 0) + qty;
      });
    });

    // 2. Manifolds
    // Simple logic: ports grouped by 5
    const manifoldsCold = Math.ceil(totalColdLines / 5);
    const manifoldsHot = Math.ceil(totalHotLines / 5);
    const totalManifoldPorts = totalColdLines + totalHotLines;

    // 3. Water Heater
    let heaterCost = 0;
    let heaterMaterial: any = null;
    if (waterHeater.active) {
      // NOTE: prix “waterHeater200” sert ici de prix base ; si tu veux différencier 100/150/300,
      // on pourra ajouter un mapping ensuite.
      heaterCost = prices.waterHeater200 + prices.safetyGroup + 20; // +20 misc fittings
      heaterMaterial = {
        id: 'heater_pack',
        name: `Chauffe-eau ${waterHeater.type === 'electric_tank' ? 'Électrique' : 'Thermo'} ${waterHeater.capacity}L`,
        quantity: 1,
        unit: Unit.PIECE,
        unitPrice: prices.waterHeater200,
        totalPrice: prices.waterHeater200,
        category: CalculatorType.PLUMBING,
        details: 'Inclus: Groupe de sécurité, Raccords',
      };
      // Add connections for heater
      lenSupply += 2; // 2m near
      lenDrain32 += 2; // drain safety group
    }

    // 4. Costing
    let matCost = 0;
    const materialsList: any[] = [];

    // A. Supply Pipes
    let pricePipe = prices.pipePer;
    let labelPipe = 'Tube PER (Gaine incluse)';
    if (supplyMaterial === 'multiskin') {
      pricePipe = prices.pipeMulti;
      labelPipe = 'Tube Multicouche';
    }
    if (supplyMaterial === 'copper') {
      pricePipe = prices.pipeCopper;
      labelPipe = 'Tube Cuivre';
    }

    const costSupplyPipe = lenSupply * pricePipe;
    matCost += costSupplyPipe;
    if (lenSupply > 0) {
      materialsList.push({
        id: 'pipe_supply',
        name: labelPipe,
        quantity: Math.ceil(lenSupply),
        quantityRaw: lenSupply,
        unit: Unit.METER,
        unitPrice: pricePipe,
        totalPrice: parseFloat(costSupplyPipe.toFixed(2)),
        category: CalculatorType.PLUMBING,
      });
    }

    // B. Drain Pipes
    const costDrain =
      lenDrain32 * prices.pvc32 +
      lenDrain40 * prices.pvc40 +
      lenDrain50 * prices.pvc50 +
      lenDrain100 * prices.pvc100;
    matCost += costDrain;

    if (lenDrain32 > 0)
      materialsList.push({
        id: 'pvc32',
        name: 'Tube PVC Ø32',
        quantity: Math.ceil(lenDrain32),
        unit: Unit.METER,
        unitPrice: prices.pvc32,
        totalPrice: parseFloat((lenDrain32 * prices.pvc32).toFixed(2)),
        category: CalculatorType.PLUMBING,
      });

    if (lenDrain40 > 0)
      materialsList.push({
        id: 'pvc40',
        name: 'Tube PVC Ø40',
        quantity: Math.ceil(lenDrain40),
        unit: Unit.METER,
        unitPrice: prices.pvc40,
        totalPrice: parseFloat((lenDrain40 * prices.pvc40).toFixed(2)),
        category: CalculatorType.PLUMBING,
      });

    if (lenDrain50 > 0)
      materialsList.push({
        id: 'pvc50',
        name: 'Tube PVC Ø50',
        quantity: Math.ceil(lenDrain50),
        unit: Unit.METER,
        unitPrice: prices.pvc50,
        totalPrice: parseFloat((lenDrain50 * prices.pvc50).toFixed(2)),
        category: CalculatorType.PLUMBING,
      });

    if (lenDrain100 > 0)
      materialsList.push({
        id: 'pvc100',
        name: 'Tube PVC Ø100',
        quantity: Math.ceil(lenDrain100),
        unit: Unit.METER,
        unitPrice: prices.pvc100,
        totalPrice: parseFloat((lenDrain100 * prices.pvc100).toFixed(2)),
        category: CalculatorType.PLUMBING,
      });

    // C. Manifolds
    const costManifolds = totalManifoldPorts * prices.manifoldPort;
    matCost += costManifolds;
    if (totalManifoldPorts > 0) {
      materialsList.push({
        id: 'manifolds',
        name: 'Nourrices / Collecteurs',
        quantity: manifoldsCold + manifoldsHot,
        quantityRaw: totalManifoldPorts,
        unit: Unit.PIECE,
        unitPrice: prices.manifoldPort * 5, // Approx price per manifold unit
        totalPrice: parseFloat(costManifolds.toFixed(2)),
        category: CalculatorType.PLUMBING,
        details: `${totalManifoldPorts} départs au total`,
      });
    }

    const costFittings = countFittings * prices.fittingUnit;
    matCost += costFittings;
    materialsList.push({
      id: 'fittings',
      name: 'Raccords & Coudes',
      quantity: 1, // Lot
      quantityRaw: countFittings,
      unit: Unit.PACKAGE,
      unitPrice: parseFloat(costFittings.toFixed(2)),
      totalPrice: parseFloat(costFittings.toFixed(2)),
      category: CalculatorType.PLUMBING,
      details: `Est. ${countFittings} pièces`,
    });

    const costSiphons = countSiphons * prices.siphon;
    matCost += costSiphons;
    if (countSiphons > 0) {
      materialsList.push({
        id: 'siphons',
        name: 'Siphons & Bondes',
        quantity: countSiphons,
        unit: Unit.PIECE,
        unitPrice: prices.siphon,
        totalPrice: parseFloat(costSiphons.toFixed(2)),
        category: CalculatorType.PLUMBING,
      });
    }

    // D. Appliances
    let costAppliances = 0;
    Object.entries(appliancesSummary).forEach(([type, qty]) => {
      let uPrice = 0;
      let label = '';
      if (type === 'wc') {
        uPrice = prices.wcPack;
        label = 'Pack WC';
      } else if (type === 'washbasin') {
        uPrice = prices.washbasinPack;
        label = 'Meuble Vasque + Robinet';
      } else if (type === 'shower') {
        uPrice = prices.showerPack;
        label = 'Pack Douche';
      } else if (type === 'bath') {
        uPrice = prices.bathPack;
        label = 'Baignoire + Robinet';
      } else if (type === 'sink') {
        uPrice = prices.sinkPack;
        label = 'Évier + Robinet';
      } else if (type === 'tap_ext') {
        uPrice = prices.tapExt;
        label = 'Robinet puisage';
      }

      if (uPrice > 0 && qty > 0) {
        const total = qty * uPrice;
        costAppliances += total;
        materialsList.push({
          id: `app_${type}`,
          name: label,
          quantity: qty,
          unit: Unit.PIECE,
          unitPrice: uPrice,
          totalPrice: parseFloat(total.toFixed(2)),
          category: CalculatorType.PLUMBING,
        });
      }
    });
    matCost += costAppliances;

    // E. Water Heater
    if (waterHeater.active && heaterMaterial) {
      matCost += heaterCost;
      materialsList.push(heaterMaterial);
      materialsList.push({
        id: 'safety_group',
        name: 'Groupe de Sécurité',
        quantity: 1,
        unit: Unit.PIECE,
        unitPrice: prices.safetyGroup,
        totalPrice: prices.safetyGroup,
        category: CalculatorType.PLUMBING,
      });
    }

    // F. Consumables
    const costConsumables = 50;
    matCost += costConsumables;
    materialsList.push({
      id: 'consumables',
      name: 'Consommables (Colle, Colliers, Joints)',
      quantity: 1,
      unit: Unit.PACKAGE,
      unitPrice: costConsumables,
      totalPrice: costConsumables,
      category: CalculatorType.PLUMBING,
    });

    // Labor (Pro mode)
    let laborCost = 0;
    if (proMode) {
      const totalPoints = Object.values(appliancesSummary).reduce((a, b) => a + b, 0);
      const laborPts = totalPoints * prices.laborPoint;
      const laborPipes =
        (lenSupply + lenDrain32 + lenDrain40 + lenDrain50 + lenDrain100) *
        prices.laborNetwork;

      laborCost = laborPts + laborPipes;
      materialsList.push(
        {
          id: 'labor_pts',
          name: "Main d'œuvre (Pose Appareils)",
          quantity: totalPoints,
          unit: Unit.PIECE,
          unitPrice: prices.laborPoint,
          totalPrice: parseFloat(laborPts.toFixed(2)),
          category: CalculatorType.PLUMBING,
        },
        {
          id: 'labor_pipes',
          name: "Main d'œuvre (Réseaux)",
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: parseFloat(laborPipes.toFixed(2)),
          totalPrice: parseFloat(laborPipes.toFixed(2)),
          category: CalculatorType.PLUMBING,
        }
      );
    }

    return {
      totalCost: matCost + laborCost,
      materials: materialsList,
      summaryStats: {
        totalColdLines,
        totalHotLines,
        totalDrainLen: lenDrain32 + lenDrain40 + lenDrain50 + lenDrain100,
      },
    };
  }, [rooms, supplyMaterial, avgDistManifold, avgDistDrain, waterHeater, prices, proMode]);

  // Pass results to parent
  useEffect(() => {
    onCalculate({
      summary: `${rooms.reduce((acc, r) => acc + r.appliances.length, 0)} Appareils`,
      details: [
        { label: 'Départs EF', value: calculationData.summaryStats.totalColdLines, unit: 'u' },
        { label: 'Départs EC', value: calculationData.summaryStats.totalHotLines, unit: 'u' },
        { label: 'Évacuation', value: Math.ceil(calculationData.summaryStats.totalDrainLen), unit: 'm' },
      ],
      materials: calculationData.materials,
      totalCost: parseFloat(calculationData.totalCost.toFixed(2)),
    });
  }, [calculationData, onCalculate, rooms]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'
            }`}
          >
            {s === 1 && '1. Pièces'}
            {s === 2 && '2. Réseaux'}
            {s === 3 && '3. Équip.'}
            {s === 4 && '4. Devis'}
          </button>
        ))}
      </div>

      {/* STEP 1: ROOMS & APPLIANCES */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Home size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajoutez les pièces d'eau et leurs équipements.
          </div>

          {/* Room List */}
          <div className="space-y-4">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-50 p-3 flex justify-between items-center border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="bg-white p-1.5 rounded-lg shadow-sm">
                      {room.type === 'kitchen' && <LayoutGrid size={16} className="text-orange-500" />}
                      {room.type === 'bathroom' && <Bath size={16} className="text-cyan-500" />}
                      {room.type === 'wc' && <CircleDollarSign size={16} className="text-slate-500" />}
                      {room.type === 'laundry' && <Waves size={16} className="text-blue-500" />}
                      {room.type === 'other' && <Wrench size={16} className="text-slate-500" />}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{room.label}</span>
                  </div>
                  <button onClick={() => removeRoom(room.id)} className="text-slate-300 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Appliances List */}
                <div className="p-3 space-y-2">
                  {room.appliances.map((app) => (
                    <div
                      key={app.id}
                      className="flex justify-between items-center text-sm border-b border-slate-50 pb-1 last:border-0"
                    >
                      <div className="flex items-center">
                        {app.needsHotWater ? (
                          <span className="w-2 h-2 rounded-full bg-red-400 mr-2" title="Eau Chaude" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-blue-400 mr-2" title="Eau Froide" />
                        )}
                        <span className="text-slate-700">{app.label}</span>
                      </div>
                      <button
                        onClick={() => removeAppliance(room.id, app.id)}
                        className="text-slate-300 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {/* Add Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => addApplianceToRoom(room.id, 'wc')}
                      className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200"
                    >
                      WC
                    </button>
                    <button
                      onClick={() => addApplianceToRoom(room.id, 'washbasin')}
                      className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200"
                    >
                      Lavabo
                    </button>
                    <button
                      onClick={() => addApplianceToRoom(room.id, 'shower')}
                      className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200"
                    >
                      Douche
                    </button>
                    <button
                      onClick={() => addApplianceToRoom(room.id, 'sink')}
                      className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200"
                    >
                      Évier
                    </button>
                    <button
                      onClick={() => addApplianceToRoom(room.id, 'washing_machine')}
                      className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200"
                    >
                      L.Linge
                    </button>
                    <button
                      onClick={() => addApplianceToRoom(room.id, 'tap_ext')}
                      className="px-2 py-1 bg-slate-100 rounded text-[10px] hover:bg-slate-200"
                    >
                      Robinet Ext.
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Room Bar */}
          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200 flex gap-2">
            <select
              value={newRoomType}
              onChange={(e) => setNewRoomType(e.target.value as any)}
              className={`flex-1 text-sm border-slate-300 rounded-lg bg-white text-slate-900`}
            >
              <option value="bathroom">Salle de Bain</option>
              <option value="kitchen">Cuisine</option>
              <option value="wc">WC</option>
              <option value="laundry">Buanderie</option>
              <option value="other">Autre</option>
            </select>
            <button
              onClick={addRoom}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center"
            >
              <Plus size={16} className="mr-1" /> Ajouter
            </button>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-4"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: NETWORKS */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Wrench size={16} className="mr-2 shrink-0 mt-0.5" />
            Configuration de la plomberie (Alimentation et Évacuation).
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Alimentation</h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Matériau</label>
                <select
                  value={supplyMaterial}
                  onChange={(e) => setSupplyMaterial(e.target.value as any)}
                  className={selectBase}
                >
                  <option value="per">PER</option>
                  <option value="multiskin">Multicouche</option>
                  <option value="copper">Cuivre</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Distribution</label>
                <select
                  value={distributionMode}
                  onChange={(e) => setDistributionMode(e.target.value as any)}
                  className={selectBase}
                >
                  <option value="manifold">Nourrice (Pieuvre)</option>
                  <option value="series">Repiquage (Série)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Longueur moyenne par appareil (m)</label>
              <input
                type="number"
                value={avgDistManifold}
                onChange={(e) => setAvgDistManifold(Number(e.target.value))}
                className={`${selectBase} p-2`}
              />
              <p className="text-[10px] text-slate-400 mt-1">Distance moyenne jusqu'à la nourrice.</p>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Évacuation (PVC)</h4>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Longueur moyenne vers chute (m)</label>
              <input
                type="number"
                value={avgDistDrain}
                onChange={(e) => setAvgDistDrain(Number(e.target.value))}
                className={`${selectBase} p-2`}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: EQUIPMENT */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Thermometer size={16} className="mr-2 shrink-0 mt-0.5" />
            Production d'eau chaude et équipements techniques.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-slate-800">Chauffe-eau</span>
              <input
                type="checkbox"
                checked={waterHeater.active}
                onChange={(e) => setWaterHeater({ ...waterHeater, active: e.target.checked })}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </div>

            {waterHeater.active && (
              <div className="space-y-3 animate-in fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Type</label>
                    <select
                      value={waterHeater.type}
                      onChange={(e) => setWaterHeater({ ...waterHeater, type: e.target.value as any })}
                      className={selectBase}
                    >
                      <option value="electric_tank">Cumulus Élec.</option>
                      <option value="thermo">Thermodynamique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Capacité (L)</label>
                    <select
                      value={waterHeater.capacity}
                      onChange={(e) => setWaterHeater({ ...waterHeater, capacity: Number(e.target.value) })}
                      className={selectBase}
                    >
                      <option value={100}>100 L</option>
                      <option value={150}>150 L</option>
                      <option value={200}>200 L</option>
                      <option value={300}>300 L</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-start bg-slate-50 p-2 rounded text-xs text-slate-500">
                  <Check size={14} className="mr-1 mt-0.5 text-emerald-500" />
                  Groupe de sécurité inclus automatiquement.
                </div>
              </div>
            )}
          </div>

          {calculationData.summaryStats.totalHotLines > 0 && !waterHeater.active && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-xs text-amber-700">
              <AlertTriangle size={16} className="mr-2 shrink-0" />
              Attention : Vous avez des appareils nécessitant de l'eau chaude, mais aucun chauffe-eau n'est activé.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: QUOTE & PRICING */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustez les prix unitaires pour finaliser le devis.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Prix Fournitures (€)</h4>
              <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? 'Mode Pro' : 'Mode Simple'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Tube {supplyMaterial.toUpperCase()} (€/m)</label>
                <input
                  type="number"
                  value={
                    supplyMaterial === 'per'
                      ? prices.pipePer
                      : supplyMaterial === 'multiskin'
                        ? prices.pipeMulti
                        : prices.pipeCopper
                  }
                  onChange={(e) =>
                    updatePrice(
                      supplyMaterial === 'per' ? 'pipePer' : supplyMaterial === 'multiskin' ? 'pipeMulti' : 'pipeCopper',
                      e.target.value
                    )
                  }
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">PVC 40 (€/m)</label>
                <input type="number" value={prices.pvc40} onChange={(e) => updatePrice('pvc40', e.target.value)} className={inputBase} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Pack WC (€)</label>
                <input type="number" value={prices.wcPack} onChange={(e) => updatePrice('wcPack', e.target.value)} className={inputBase} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Chauffe-eau (€)</label>
                <input
                  type="number"
                  value={prices.waterHeater200}
                  onChange={(e) => updatePrice('waterHeater200', e.target.value)}
                  className={inputBase}
                />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO / Appareil (€)</label>
                  <input type="number" value={prices.laborPoint} onChange={(e) => updatePrice('laborPoint', e.target.value)} className={inputPro} />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Réseaux (€/ml)</label>
                  <input
                    type="number"
                    value={prices.laborNetwork}
                    onChange={(e) => updatePrice('laborNetwork', e.target.value)}
                    className={inputPro}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> Terminé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

