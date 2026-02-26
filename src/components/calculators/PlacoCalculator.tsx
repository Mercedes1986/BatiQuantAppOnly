
import React, { useState, useEffect, useMemo } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES, PLACO_BOARD_TYPES, OPENING_PRESETS, PLACO_INSULATION_TYPES } from '../../constants';
import { getUnitPrice } from '../../services/materialsService';
import { ChevronDown, ChevronUp, ArrowRightLeft, PanelTop, Spline, Ruler, Hammer, Trash2, Plus, PenTool, LayoutTemplate, Euro, Check, Settings, ArrowRight, Wind, ScrollText } from 'lucide-react';

interface Opening {
  id: string;
  type: 'door' | 'window';
  width: number; // m
  height: number; // m
  quantity: number;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialMode?: 'partition' | 'lining' | 'ceiling';
  hideTabs?: boolean;
}

export const PlacoCalculator: React.FC<Props> = ({ onCalculate, initialMode = 'partition', hideTabs = false }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Mode & Geometry ---
  const [mode, setMode] = useState<'partition' | 'lining' | 'ceiling'>(initialMode);
  const [dimL, setDimL] = useState<string>(''); // Length
  const [dimH, setDimH] = useState<string>('2.5'); // Height
  const [dimW, setDimW] = useState<string>(''); // Width (Ceiling)
  
  // Openings
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [newOpType, setNewOpType] = useState<'door' | 'window'>('door');
  const [newOpW, setNewOpW] = useState('0.83');
  const [newOpH, setNewOpH] = useState('2.04');

  // --- 2. Structure (Plaques & Ossature) ---
  const [boardId, setBoardId] = useState('BA13');
  const [doubleSkin, setDoubleSkin] = useState(false); // Double peau
  const [frameType, setFrameType] = useState<'M48' | 'M70' | 'M90'>('M48'); // Montants
  const [studSpacing, setStudSpacing] = useState(60); // cm
  const [wastePct, setWastePct] = useState(10); // %

  // --- 3. Insulation & Membrane ---
  const [useInsulation, setUseInsulation] = useState(true);
  const [insulType, setInsulType] = useState('GR32'); // Laine de verre
  const [insulThick, setInsulThick] = useState('45'); // mm
  const [useMembrane, setUseMembrane] = useState(false); // Pare-vapeur

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    board: getUnitPrice('PLACO_PLATE_BA13'),
    rail: getUnitPrice('RAIL_3M'),
    stud: getUnitPrice('MONTANT_3M'),
    furring: getUnitPrice('FURRING_3M'),
    hanger: getUnitPrice('HANGER_BOX_50') / 50, // Unit price
    insulation: getUnitPrice('INSULATION_M2'),
    membrane: 2.50, // €/m2
    tape: getUnitPrice('JOINT_TAPE_ROLL') / 150, // €/m
    compound: getUnitPrice('COMPOUND_BAG_25KG') / 25, // €/kg
    screwBox: getUnitPrice('SCREWS_BOX_1000'), // €/box
    laborM2: 35.00
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // --- Helpers ---
  const addOpening = () => {
    const w = parseFloat(newOpW);
    const h = parseFloat(newOpH);
    if (!w || !h) return;
    setOpenings([...openings, { id: Date.now().toString(), type: newOpType, width: w, height: h, quantity: 1 }]);
  };

  const removeOpening = (id: string) => setOpenings(openings.filter(o => o.id !== id));

  // --- Calculation Engine ---
  const calculationData = useMemo(() => {
    const L = parseFloat(dimL) || 0;
    const H = parseFloat(dimH) || 0;
    const W = parseFloat(dimW) || 0;

    let surfaceBrute = 0;
    if (mode === 'ceiling') surfaceBrute = L * W;
    else surfaceBrute = L * H;

    // Deductions
    let openingArea = 0;
    openings.forEach(op => openingArea += op.width * op.height * op.quantity);
    const surfaceNette = Math.max(0, surfaceBrute - openingArea);

    const materialsList: any[] = [];
    let totalCost = 0;

    // 1. Plasterboards
    const boardDef = PLACO_BOARD_TYPES.find(b => b.id === boardId) || PLACO_BOARD_TYPES[0];
    let layers = doubleSkin ? 2 : 1;
    if (mode === 'partition') layers *= 2; // 2 sides

    const boardAreaNeeded = surfaceNette * layers * (1 + wastePct/100);
    const nbBoards = Math.ceil(boardAreaNeeded / boardDef.area);
    
    // Determine price based on board type
    let unitBoardPrice = prices.board;
    if (boardId === 'HYDRO') unitBoardPrice = getUnitPrice('PLACO_PLATE_HYDRO');
    if (boardId === 'FIRE') unitBoardPrice = getUnitPrice('PLACO_PLATE_FIRE');

    const totalBoardCost = nbBoards * unitBoardPrice;
    totalCost += totalBoardCost;

    materialsList.push({
        id: 'boards',
        name: `Plaques ${boardDef.label}`,
        quantity: nbBoards,
        quantityRaw: boardAreaNeeded / 3, // approx
        unit: Unit.PIECE,
        unitPrice: unitBoardPrice,
        totalPrice: parseFloat(totalBoardCost.toFixed(2)),
        category: CalculatorType.PLACO,
        details: `${layers} peau(x), surf. couverte ${surfaceNette.toFixed(1)}m²`
    });

    // 2. Framework (Ossature)
    if (mode === 'partition' || mode === 'lining') {
        // Rails (Top + Bottom)
        const railLen = L * 2 * (1 + wastePct/100);
        const nbRails = Math.ceil(railLen / 3);
        const costRails = nbRails * prices.rail;
        totalCost += costRails;
        materialsList.push({ id: 'rails', name: `Rails R${frameType.slice(1)} (3m)`, quantity: nbRails, unit: Unit.PIECE, unitPrice: prices.rail, totalPrice: costRails, category: CalculatorType.PLACO });

        // Studs (Montants)
        const nbStudsRaw = Math.ceil((L * 100) / studSpacing) + 1;
        const studsForOpenings = openings.length * 2;
        const totalStudsCount = nbStudsRaw + studsForOpenings;
        
        const costStuds = totalStudsCount * prices.stud;
        totalCost += costStuds;
        materialsList.push({ id: 'studs', name: `Montants ${frameType} (3m)`, quantity: totalStudsCount, unit: Unit.PIECE, unitPrice: prices.stud, totalPrice: costStuds, category: CalculatorType.PLACO, details: `Entraxe ${studSpacing}cm` });
    } else {
        // Ceiling (Furring + Angles + Hangers)
        const nbFurringLines = Math.ceil((W * 100) / 50) + 1;
        const totalFurringLen = nbFurringLines * L * (1 + wastePct/100);
        const nbFurring = Math.ceil(totalFurringLen / 3);
        const costFurring = nbFurring * prices.furring;
        totalCost += costFurring;
        materialsList.push({ id: 'furring', name: 'Fourrures F530 (3m)', quantity: nbFurring, unit: Unit.PIECE, unitPrice: prices.furring, totalPrice: costFurring, category: CalculatorType.PLACO });

        // Angle (Perimeter)
        const perim = (L + W) * 2;
        const nbAngles = Math.ceil(perim / 3);
        const costAngles = nbAngles * getUnitPrice('CORNER_BEAD_3M'); 
        totalCost += costAngles;
        materialsList.push({ id: 'angles', name: 'Cornières de rive (3m)', quantity: nbAngles, unit: Unit.PIECE, unitPrice: getUnitPrice('CORNER_BEAD_3M') || 6, totalPrice: costAngles, category: CalculatorType.PLACO });

        // Hangers
        const hangersPerLine = Math.ceil(L / 1.2);
        const totalHangers = nbFurringLines * hangersPerLine;
        const costHangers = totalHangers * prices.hanger;
        totalCost += costHangers;
        materialsList.push({ id: 'hangers', name: 'Suspentes', quantity: totalHangers, unit: Unit.PIECE, unitPrice: prices.hanger, totalPrice: costHangers, category: CalculatorType.PLACO });
    }

    // 3. Insulation
    if (useInsulation) {
        const insulArea = surfaceBrute * (1 + wastePct/100);
        const costInsul = insulArea * prices.insulation;
        totalCost += costInsul;
        materialsList.push({ id: 'insul', name: `Isolant ${insulType} (Ep. ${insulThick}mm)`, quantity: parseFloat(insulArea.toFixed(1)), unit: Unit.M2, unitPrice: prices.insulation, totalPrice: costInsul, category: CalculatorType.PLACO });
    }

    // 4. Consumables
    // Screws: approx 15 per m2 of board
    const totalScrews = surfaceNette * layers * 15; 
    const boxesScrews = Math.ceil(totalScrews / 1000);
    if (boxesScrews > 0) {
        const costScrews = boxesScrews * prices.screwBox;
        totalCost += costScrews;
        materialsList.push({ id: 'screws', name: 'Vis TTPC 25/35mm (Boîte 1000)', quantity: boxesScrews, unit: Unit.BOX, unitPrice: prices.screwBox, totalPrice: costScrews, category: CalculatorType.PLACO });
    }

    // Joint Tape & Compound
    const tapeLen = surfaceNette * layers * 1.5;
    const rollsTape = Math.ceil(tapeLen / 150);
    const costTape = rollsTape * (prices.tape * 150); 
    totalCost += costTape;
    materialsList.push({ id: 'tape', name: 'Bande à joints (Rlx 150m)', quantity: rollsTape, unit: Unit.ROLL, unitPrice: prices.tape * 150, totalPrice: costTape, category: CalculatorType.PLACO });

    const compoundKg = surfaceNette * layers * 0.5;
    const bagsCompound = Math.ceil(compoundKg / 25);
    const costCompound = bagsCompound * (prices.compound * 25);
    totalCost += costCompound;
    materialsList.push({ id: 'compound', name: 'Enduit à joints (Sac 25kg)', quantity: bagsCompound, unit: Unit.BAG, unitPrice: prices.compound * 25, totalPrice: costCompound, category: CalculatorType.PLACO });

    // 5. Labor
    if (proMode) {
        const laborCost = surfaceNette * prices.laborM2;
        totalCost += laborCost;
        materialsList.push({ id: 'labor', name: 'Main d\'œuvre Plaquiste', quantity: parseFloat(surfaceNette.toFixed(1)), unit: Unit.M2, unitPrice: prices.laborM2, totalPrice: laborCost, category: CalculatorType.PLACO });
    }

    return {
        totalCost,
        materials: materialsList,
        surfaceNette
    };
  }, [mode, dimL, dimH, dimW, openings, boardId, doubleSkin, frameType, studSpacing, wastePct, useInsulation, insulType, insulThick, useMembrane, prices, proMode]);

  // Pass results
  useEffect(() => {
      onCalculate({
          summary: `${calculationData.surfaceNette.toFixed(1)} m² de ${mode === 'partition' ? 'cloison' : mode === 'lining' ? 'doublage' : 'plafond'}`,
          details: [
              { label: 'Mode', value: mode === 'partition' ? 'Cloison' : mode === 'lining' ? 'Doublage' : 'Plafond', unit: '' },
              { label: 'Surface Nette', value: calculationData.surfaceNette.toFixed(1), unit: 'm²' },
              { label: 'Ossature', value: frameType, unit: '' }
          ],
          materials: calculationData.materials,
          totalCost: parseFloat(calculationData.totalCost.toFixed(2))
      });
  }, [calculationData]);

  return (
    <div className="space-y-6 animate-in fade-in">
        {/* Navigation */}
        {!hideTabs && (
            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button onClick={() => setMode('partition')} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${mode === 'partition' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                    <ArrowRightLeft size={16} className="mr-1"/> Cloison
                </button>
                <button onClick={() => setMode('lining')} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${mode === 'lining' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                    <PanelTop size={16} className="mr-1"/> Doublage
                </button>
                <button onClick={() => setMode('ceiling')} className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${mode === 'ceiling' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>
                    <Spline size={16} className="mr-1"/> Plafond
                </button>
            </div>
        )}

        <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4, 5].map(s => (
            <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Plan'}
                {s === 2 && '2. Plaque'}
                {s === 3 && '3. Isol.'}
                {s === 4 && '4. Devis'}
                {s === 5 && '5. Prix'}
            </button>
            ))}
        </div>

        {/* STEP 1: GEOMETRY & OPENINGS */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Ruler size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Dimensions de la zone et ouvertures à déduire.
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (m)</label>
                        <input type="number" value={dimL} onChange={e => setDimL(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-slate-900"/>
                    </div>
                    {mode === 'ceiling' ? (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
                            <input type="number" value={dimW} onChange={e => setDimW(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-slate-900"/>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur (m)</label>
                            <input type="number" value={dimH} onChange={e => setDimH(e.target.value)} className="w-full p-2 border rounded bg-white font-bold text-slate-900"/>
                        </div>
                    )}
                </div>

                {mode !== 'ceiling' && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Ouvertures</span>
                            <button onClick={() => setShowAddOpening(!showAddOpening)} className="text-blue-600 text-xs font-bold flex items-center">
                                <Plus size={14} className="mr-1"/> Ajouter
                            </button>
                        </div>
                        
                        {showAddOpening && (
                            <div className="bg-white p-2 rounded border mb-2 animate-in fade-in">
                                <div className="flex gap-2 mb-2">
                                    <select value={newOpType} onChange={e => setNewOpType(e.target.value as any)} className="text-xs p-1 border rounded bg-white text-slate-900">
                                        <option value="door">Porte</option>
                                        <option value="window">Fenêtre</option>
                                    </select>
                                    <input type="number" placeholder="L" value={newOpW} onChange={e => setNewOpW(e.target.value)} className="w-16 p-1 text-xs border rounded bg-white text-slate-900"/>
                                    <input type="number" placeholder="H" value={newOpH} onChange={e => setNewOpH(e.target.value)} className="w-16 p-1 text-xs border rounded bg-white text-slate-900"/>
                                </div>
                                <button onClick={addOpening} className="w-full bg-blue-100 text-blue-700 py-1 rounded text-xs font-bold">Valider</button>
                            </div>
                        )}

                        <div className="space-y-1">
                            {openings.map(op => (
                                <div key={op.id} className="flex justify-between items-center bg-white p-2 rounded border">
                                    <span className="text-xs text-slate-700">{op.type === 'door' ? 'Porte' : 'Fenêtre'} {op.width}x{op.height}m</span>
                                    <button onClick={() => removeOpening(op.id)} className="text-red-400"><Trash2 size={14}/></button>
                                </div>
                            ))}
                            {openings.length === 0 && <span className="text-xs text-slate-400 italic">Aucune ouverture.</span>}
                        </div>
                    </div>
                )}

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: STRUCTURE */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <LayoutTemplate size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Type de plaques et ossature métallique.
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type de Plaque</label>
                        <div className="grid grid-cols-1 gap-2">
                            {PLACO_BOARD_TYPES.map(b => (
                                <button key={b.id} onClick={() => setBoardId(b.id)} className={`p-3 rounded border text-left text-sm ${boardId === b.id ? 'bg-indigo-50 border-indigo-500 text-indigo-800 ring-1 ring-indigo-500' : 'bg-white text-slate-600'}`}>
                                    <span className="font-bold block">{b.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Ossature</label>
                            <select value={frameType} onChange={e => setFrameType(e.target.value as any)} className="w-full p-2 border rounded bg-white text-slate-900 text-sm">
                                <option value="M48">M48 (Std)</option>
                                <option value="M70">M70 (Iso+)</option>
                                <option value="M90">M90 (Haut)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Entraxe (cm)</label>
                            <select value={studSpacing} onChange={e => setStudSpacing(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900 text-sm">
                                <option value={60}>60 cm (Std)</option>
                                <option value={40}>40 cm (Renforcé)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <span className="text-sm font-medium">Double peau (2 plaques/face)</span>
                        <input type="checkbox" checked={doubleSkin} onChange={e => setDoubleSkin(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 3: INSULATION */}
        {step === 3 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Wind size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Isolation thermique et phonique.
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <label className="flex items-center justify-between mb-4 cursor-pointer">
                        <span className="font-bold text-slate-800">Ajouter Isolant</span>
                        <input type="checkbox" checked={useInsulation} onChange={e => setUseInsulation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>

                    {useInsulation && (
                        <div className="space-y-3 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                                <select value={insulType} onChange={e => setInsulType(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900 text-sm">
                                    {PLACO_INSULATION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Épaisseur (mm)</label>
                                <input type="number" value={insulThick} onChange={e => setInsulThick(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900"/>
                            </div>
                            <label className="flex items-center mt-2">
                                <input type="checkbox" checked={useMembrane} onChange={e => setUseMembrane(e.target.checked)} className="mr-2 rounded text-blue-600"/>
                                <span className="text-sm text-slate-700">Pare-vapeur indépendant</span>
                            </label>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 4: DEVIS (Handled by parent, redirecting to Step 5 for prices) */}
        {step === 4 && (
            <div className="text-center py-10">
                <Check size={48} className="mx-auto text-emerald-500 mb-4"/>
                <h3 className="text-xl font-bold text-slate-800">Calcul prêt !</h3>
                <p className="text-slate-500 mb-6">Vérifiez les prix unitaires si nécessaire.</p>
                <button onClick={() => setStep(5)} className="text-blue-600 font-bold underline">Modifier les prix</button>
            </div>
        )}

        {/* STEP 5: PRICING */}
        {step === 5 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Euro size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajustement des prix unitaires.
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
                            <label className="block text-[10px] text-slate-500 mb-1">Plaque ({boardId})</label>
                            <input type="number" value={prices.board} onChange={e => updatePrice('board', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Montant (3m)</label>
                            <input type="number" value={prices.stud} onChange={e => updatePrice('stud', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Rail (3m)</label>
                            <input type="number" value={prices.rail} onChange={e => updatePrice('rail', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-500 mb-1">Isolant /m²</label>
                            <input type="number" value={prices.insulation} onChange={e => updatePrice('insulation', e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"/>
                        </div>
                    </div>

                    {proMode && (
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] text-blue-600 font-bold mb-1">MO Pose (€/m²)</label>
                                <input type="number" value={prices.laborM2} onChange={e => updatePrice('laborM2', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"/>
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
