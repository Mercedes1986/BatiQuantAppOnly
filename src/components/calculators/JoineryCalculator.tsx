
import React, { useState, useEffect } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { OPENING_PRESETS, DEFAULT_PRICES } from '../../constants';
import { BoxSelect, Plus, Trash2, Settings, Info, Check, Hammer, DollarSign, Ruler, Copy, Edit2, X, ArrowRight } from 'lucide-react';

interface JoineryItem {
  id: string;
  type: 'window' | 'door' | 'bay' | 'velux' | 'garage';
  label: string;
  width: number; // m
  height: number; // m
  quantity: number;
  material: 'pvc' | 'alu' | 'wood';
  shutter: 'none' | 'rolling' | 'swing';
  priceOverride?: number; // User defined price per unit
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const JoineryCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Inventory ---
  const [items, setItems] = useState<JoineryItem[]>([]);
  
  // Add/Edit Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'window' | 'door' | 'bay' | 'velux' | 'garage'>('window');
  const [formLabel, setFormLabel] = useState('Fenêtre');
  const [formW, setFormW] = useState('');
  const [formH, setFormH] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formMat, setFormMat] = useState<'pvc' | 'alu' | 'wood'>('pvc');
  const [formShutter, setFormShutter] = useState<'none' | 'rolling' | 'swing'>('none');

  // --- 2. Installation & Supplies ---
  const [installType, setInstallType] = useState<'new' | 'reno' | 'tunnel'>('new'); // Applique (Neuf), Rénovation, Tunnel
  const [useCompriband, setUseCompriband] = useState(true);
  const [useSilicone, setUseSilicone] = useState(true);
  const [useFoam, setUseFoam] = useState(true);
  const [useFixings, setUseFixings] = useState(true); // Pattes/Vis
  const [wastePct, setWastePct] = useState(10); // % for supplies

  // --- 3. Pricing ---
  const [prices, setPrices] = useState({
    // Supply Base Prices (Estimates)
    window: 250,
    door: 800,
    bay: 1200,
    velux: 400,
    garage: 1500,
    // Options
    shutterRolling: 300,
    shutterSwing: 200,
    materialAlu: 1.4, // Coef multiplier
    materialWood: 1.5,
    // Labor (per unit)
    installWindow: 150,
    installDoor: 250,
    installBay: 350,
    installVelux: 200,
    installGarage: 400,
    renoSurcharge: 50, // Extra per unit for renovation
    // Supplies
    compribandM: 2.5, // €/m
    siliconeCart: 8, // €/u
    foamCart: 12, // €/u
    fixingKit: 5, // €/u per window
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Form Handlers ---
  const handleAddItem = () => {
    setShowForm(true);
    setEditingId(null);
    resetForm();
  };

  const handleEditItem = (item: JoineryItem) => {
    setShowForm(true);
    setEditingId(item.id);
    setFormType(item.type);
    setFormLabel(item.label);
    setFormW(item.width.toString());
    setFormH(item.height.toString());
    setFormQty(item.quantity);
    setFormMat(item.material);
    setFormShutter(item.shutter);
  };

  const handleSaveItem = () => {
    const w = parseFloat(formW);
    const h = parseFloat(formH);
    if (!w || !h) return;

    const newItem: JoineryItem = {
      id: editingId || Date.now().toString(),
      type: formType,
      label: formLabel || getTypeLabel(formType),
      width: w,
      height: h,
      quantity: formQty,
      material: formMat,
      shutter: formShutter
    };

    if (editingId) {
      setItems(items.map(i => i.id === editingId ? newItem : i));
    } else {
      setItems([...items, newItem]);
    }
    setShowForm(false);
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleDuplicateItem = (item: JoineryItem) => {
    setItems([...items, { ...item, id: Date.now().toString() }]);
  };

  const resetForm = () => {
    setFormType('window');
    setFormLabel('Fenêtre');
    setFormW('');
    setFormH('');
    setFormQty(1);
    setFormMat('pvc');
    setFormShutter('none');
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'window': return 'Fenêtre';
      case 'door': return 'Porte Entrée';
      case 'bay': return 'Baie Coulissante';
      case 'velux': return 'Velux / Toit';
      case 'garage': return 'Porte Garage';
      default: return 'Menuiserie';
    }
  };

  const applyPreset = (presetLabel: string) => {
    const p = [...OPENING_PRESETS.WINDOWS, ...OPENING_PRESETS.DOORS].find(x => x.label === presetLabel);
    if (p) {
      setFormW(p.width.toString());
      setFormH(p.height.toString());
      setFormLabel(presetLabel);
      if (presetLabel.toLowerCase().includes('porte')) setFormType('door');
      else setFormType('window');
    }
  };

  // --- Calculation Engine ---
  useEffect(() => {
    if (items.length === 0) return;

    let totalCost = 0;
    let totalArea = 0;
    let totalPerimeter = 0;
    const materialsList: any[] = [];

    // 1. Joinery Items (Supply & Install)
    items.forEach(item => {
      // Dimensions
      const area = item.width * item.height * item.quantity;
      const perim = 2 * (item.width + item.height) * item.quantity;
      totalArea += area;
      totalPerimeter += perim;

      // Price Estimation
      let basePrice = prices[item.type as keyof typeof prices] || 250;
      
      // Material multiplier
      if (item.material === 'alu') basePrice *= prices.materialAlu;
      if (item.material === 'wood') basePrice *= prices.materialWood;

      // Shutter option
      if (item.shutter === 'rolling') basePrice += prices.shutterRolling;
      if (item.shutter === 'swing') basePrice += prices.shutterSwing;

      // User override?
      const unitPrice = item.priceOverride || basePrice;
      const supplyCost = unitPrice * item.quantity;

      // Labor Cost
      let installUnitCost = 0;
      if (item.type === 'window') installUnitCost = prices.installWindow;
      else if (item.type === 'door') installUnitCost = prices.installDoor;
      else if (item.type === 'bay') installUnitCost = prices.installBay;
      else if (item.type === 'velux') installUnitCost = prices.installVelux;
      else if (item.type === 'garage') installUnitCost = prices.installGarage;

      if (installType === 'reno') installUnitCost += prices.renoSurcharge;

      const laborCost = installUnitCost * item.quantity;

      totalCost += supplyCost + laborCost;

      // Add to Materials List
      materialsList.push({
        id: item.id,
        name: `${item.label} ${item.material.toUpperCase()} ${item.width}x${item.height}m`,
        quantity: item.quantity,
        quantityRaw: item.quantity,
        unit: Unit.PIECE,
        unitPrice: parseFloat(unitPrice.toFixed(2)),
        totalPrice: parseFloat(supplyCost.toFixed(2)),
        category: CalculatorType.JOINERY,
        details: `Pose: ${installUnitCost}€/u${item.shutter !== 'none' ? ', Volet inclus' : ''}`
      });

      if (proMode) {
         materialsList.push({
            id: item.id + '_install',
            name: `Pose ${item.label}`,
            quantity: item.quantity,
            quantityRaw: item.quantity,
            unit: Unit.PIECE,
            unitPrice: parseFloat(installUnitCost.toFixed(2)),
            totalPrice: parseFloat(laborCost.toFixed(2)),
            category: CalculatorType.JOINERY
         });
      }
    });

    // 2. Supplies (Consumables)
    if (useCompriband) {
      const len = totalPerimeter * (1 + wastePct / 100);
      const cost = len * prices.compribandM;
      totalCost += cost;
      materialsList.push({
        id: 'compriband',
        name: 'Compribande (Étanchéité)',
        quantity: Math.ceil(len),
        quantityRaw: len,
        unit: Unit.METER,
        unitPrice: prices.compribandM,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.JOINERY
      });
    }

    if (useSilicone) {
      // Approx 15m per cartridge
      const len = totalPerimeter * (1 + wastePct / 100);
      const carts = Math.ceil(len / 15);
      const cost = carts * prices.siliconeCart;
      totalCost += cost;
      materialsList.push({
        id: 'silicone',
        name: 'Mastic Silicone',
        quantity: carts,
        quantityRaw: len,
        unit: Unit.PIECE,
        unitPrice: prices.siliconeCart,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.JOINERY
      });
    }

    if (useFoam) {
      // Approx 1 cartridge per 3 windows
      const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);
      const carts = Math.ceil(totalUnits / 3);
      const cost = carts * prices.foamCart;
      totalCost += cost;
      materialsList.push({
        id: 'foam',
        name: 'Mousse Expansive PU',
        quantity: carts,
        quantityRaw: carts,
        unit: Unit.PIECE,
        unitPrice: prices.foamCart,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.JOINERY
      });
    }

    if (useFixings) {
      const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);
      const cost = totalUnits * prices.fixingKit;
      totalCost += cost;
      materialsList.push({
        id: 'fixings',
        name: 'Kit Fixations (Pattes/Vis/Cales)',
        quantity: totalUnits,
        quantityRaw: totalUnits,
        unit: Unit.PACKAGE,
        unitPrice: prices.fixingKit,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.JOINERY
      });
    }

    onCalculate({
      summary: `${items.reduce((a,i)=>a+i.quantity,0)} Menuiseries`,
      details: [
        { label: 'Surface Totale', value: totalArea.toFixed(1), unit: 'm²' },
        { label: 'Périmètre Total', value: totalPerimeter.toFixed(1), unit: 'm' },
        { label: 'Type de Pose', value: installType === 'new' ? 'Neuf (Applique)' : installType === 'reno' ? 'Rénovation' : 'Tunnel' }
      ],
      materials: materialsList,
      totalCost: parseFloat(totalCost.toFixed(2))
    });

  }, [step, items, installType, useCompriband, useSilicone, useFoam, useFixings, wastePct, prices, proMode]);

  return (
    <div className="space-y-6 animate-in fade-in">
       {/* Step Navigation */}
       <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg">
            {[1, 2, 3].map(s => (
            <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Liste'}
                {s === 2 && '2. Pose'}
                {s === 3 && '3. Prix'}
            </button>
            ))}
        </div>

        {/* STEP 1: INVENTORY LIST */}
        {step === 1 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Info size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Créez la liste de vos menuiseries.
              </div>

              {/* Items List */}
              {items.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <BoxSelect size={32} className="mx-auto mb-2 opacity-50"/>
                    <p className="text-sm">Aucune menuiserie ajoutée.</p>
                 </div>
              ) : (
                 <div className="space-y-3">
                    {items.map(item => (
                       <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col relative">
                          <div className="flex justify-between items-start mb-1">
                             <div>
                                <span className="font-bold text-slate-800">{item.quantity}x {item.label}</span>
                                <span className="text-xs text-slate-500 ml-2 uppercase bg-slate-100 px-1 rounded">{item.material}</span>
                             </div>
                             <div className="flex space-x-1">
                                <button onClick={() => handleDuplicateItem(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"><Copy size={14}/></button>
                                <button onClick={() => handleEditItem(item)} className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded"><Edit2 size={14}/></button>
                                <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                             </div>
                          </div>
                          <div className="text-sm text-slate-600">
                             {item.width} x {item.height} m
                             {item.shutter !== 'none' && <span className="ml-2 text-xs text-blue-600 font-medium">+ Volet {item.shutter === 'rolling' ? 'Roulant' : 'Battant'}</span>}
                          </div>
                       </div>
                    ))}
                 </div>
              )}

              <button onClick={handleAddItem} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center shadow-md active:scale-95 transition-transform">
                 <Plus size={20} className="mr-2"/> Ajouter une menuiserie
              </button>

              {items.length > 0 && (
                 <button onClick={() => setStep(2)} className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex justify-center items-center">
                    Suivant <ArrowRight size={18} className="ml-2"/>
                 </button>
              )}

              {/* Add/Edit Modal */}
              {showForm && (
                 <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                       <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                          <h3 className="font-bold text-slate-800">{editingId ? 'Modifier' : 'Ajouter'} Menuiserie</h3>
                          <button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400"/></button>
                       </div>
                       
                       <div className="p-4 space-y-4">
                          <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                             <select value={formType} onChange={e => { setFormType(e.target.value as any); setFormLabel(getTypeLabel(e.target.value)); }} className="w-full p-2 border rounded bg-white text-slate-900">
                                <option value="window">Fenêtre</option>
                                <option value="door">Porte Entrée</option>
                                <option value="bay">Baie Coulissante</option>
                                <option value="velux">Velux / Toit</option>
                                <option value="garage">Porte Garage</option>
                             </select>
                          </div>

                          {!editingId && (
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Presets</label>
                                <select onChange={e => applyPreset(e.target.value)} className="w-full p-2 border rounded bg-white text-sm text-slate-900">
                                   <option value="">-- Choisir standard --</option>
                                   {[...OPENING_PRESETS.WINDOWS, ...OPENING_PRESETS.DOORS].map(p => (
                                      <option key={p.label} value={p.label}>{p.label}</option>
                                   ))}
                                </select>
                             </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
                                <input type="number" value={formW} onChange={e => setFormW(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900"/>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur (m)</label>
                                <input type="number" value={formH} onChange={e => setFormH(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900"/>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Quantité</label>
                                <input type="number" value={formQty} onChange={e => setFormQty(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Matériau</label>
                                <select value={formMat} onChange={e => setFormMat(e.target.value as any)} className="w-full p-2 border rounded bg-white text-slate-900">
                                   <option value="pvc">PVC</option>
                                   <option value="alu">Alu</option>
                                   <option value="wood">Bois</option>
                                </select>
                             </div>
                          </div>

                          {formType === 'window' || formType === 'bay' ? (
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Volet</label>
                                <div className="flex bg-slate-100 p-1 rounded">
                                   <button onClick={() => setFormShutter('none')} className={`flex-1 py-1 text-xs rounded ${formShutter === 'none' ? 'bg-white shadow' : ''}`}>Aucun</button>
                                   <button onClick={() => setFormShutter('rolling')} className={`flex-1 py-1 text-xs rounded ${formShutter === 'rolling' ? 'bg-white shadow' : ''}`}>Roulant</button>
                                   <button onClick={() => setFormShutter('swing')} className={`flex-1 py-1 text-xs rounded ${formShutter === 'swing' ? 'bg-white shadow' : ''}`}>Battant</button>
                                </div>
                             </div>
                          ) : null}

                          <div>
                             <label className="block text-xs font-bold text-slate-500 mb-1">Nom / Label</label>
                             <input type="text" value={formLabel} onChange={e => setFormLabel(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900"/>
                          </div>
                       </div>

                       <div className="p-4 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
                          <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-slate-500 font-bold">Annuler</button>
                          <button onClick={handleSaveItem} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Valider</button>
                       </div>
                    </div>
                 </div>
              )}
           </div>
        )}

        {/* STEP 2: INSTALLATION & SUPPLIES */}
        {step === 2 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Hammer size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Définissez le type de pose et les consommables nécessaires.
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Type de Pose</label>
                 <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setInstallType('new')} className={`p-2 rounded border text-xs font-bold ${installType === 'new' ? 'bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500' : 'bg-white text-slate-500'}`}>
                       Neuf (Applique)
                    </button>
                    <button onClick={() => setInstallType('reno')} className={`p-2 rounded border text-xs font-bold ${installType === 'reno' ? 'bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500' : 'bg-white text-slate-500'}`}>
                       Rénovation
                    </button>
                    <button onClick={() => setInstallType('tunnel')} className={`p-2 rounded border text-xs font-bold ${installType === 'tunnel' ? 'bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500' : 'bg-white text-slate-500'}`}>
                       Tunnel
                    </button>
                 </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                 <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Fournitures de pose</h4>
                 <div className="space-y-2">
                    <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                       <span className="text-sm">Compribande (Étanchéité)</span>
                       <input type="checkbox" checked={useCompriband} onChange={e => setUseCompriband(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                       <span className="text-sm">Silicone (Joints finition)</span>
                       <input type="checkbox" checked={useSilicone} onChange={e => setUseSilicone(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                       <span className="text-sm">Mousse PU (Calfeutrement)</span>
                       <input type="checkbox" checked={useFoam} onChange={e => setUseFoam(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                       <span className="text-sm">Kit Fixation (Vis/Pattes)</span>
                       <input type="checkbox" checked={useFixings} onChange={e => setUseFixings(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                 </div>
                 <div className="mt-3 flex items-center justify-end space-x-2">
                    <span className="text-xs text-slate-500">Marge pertes (%)</span>
                    <input type="number" value={wastePct} onChange={e => setWastePct(Number(e.target.value))} className="w-16 p-1 text-sm border rounded text-right bg-white text-slate-900"/>
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
                 <DollarSign size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Ajustez les prix de base. Le calcul final prendra en compte les options (volets, matériaux).
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                 <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Prix Fourniture (Base PVC)</h4>
                    <button onClick={() => setProMode(!proMode)} className="text-xs text-blue-600 flex items-center"><Settings size={12} className="mr-1"/> {proMode ? 'Mode Simple' : 'Mode Pro'}</button>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1">Fenêtre (€/u)</label>
                       <input type="number" value={prices.window} onChange={e => updatePrice('window', e.target.value)} className="w-full p-2 border rounded text-sm bg-white text-slate-900"/>
                    </div>
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1">Porte (€/u)</label>
                       <input type="number" value={prices.door} onChange={e => updatePrice('door', e.target.value)} className="w-full p-2 border rounded text-sm bg-white text-slate-900"/>
                    </div>
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1">Baie Vitrée (€/u)</label>
                       <input type="number" value={prices.bay} onChange={e => updatePrice('bay', e.target.value)} className="w-full p-2 border rounded text-sm bg-white text-slate-900"/>
                    </div>
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1">Porte Garage (€/u)</label>
                       <input type="number" value={prices.garage} onChange={e => updatePrice('garage', e.target.value)} className="w-full p-2 border rounded text-sm bg-white text-slate-900"/>
                    </div>
                 </div>

                 {proMode && (
                    <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose Fenêtre (€/u)</label>
                            <input type="number" value={prices.installWindow} onChange={e => updatePrice('installWindow', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose Baie (€/u)</label>
                            <input type="number" value={prices.installBay} onChange={e => updatePrice('installBay', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
                        </div>
                    </div>
                 )}
              </div>

              <div className="flex gap-3 pt-2">
                 <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                 <button disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
                    <Check size={18} className="mr-2"/> Calculé
                 </button>
              </div>
           </div>
        )}
    </div>
  );
};
