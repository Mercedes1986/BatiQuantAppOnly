
import React, { useState, useEffect } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES } from '../../constants';
import { Ruler, TrendingUp, Layers, Hammer, Info, AlertTriangle, CircleDollarSign, Check, Settings, ArrowRight, Activity, BoxSelect } from 'lucide-react';

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const StairCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Type & Dimensions ---
  const [stairType, setStairType] = useState<'straight' | 'quarter' | 'half'>('straight');
  const [height, setHeight] = useState<string>('280'); // H total (cm)
  const [width, setWidth] = useState<string>('90'); // W (cm)
  const [run, setRun] = useState<string>('350'); // Reculement (cm)
  const [landingDepth, setLandingDepth] = useState<string>('0'); // Palier (cm)

  // --- 2. Steps & Comfort ---
  const [calcMode, setCalcMode] = useState<'auto' | 'fixed_N'>('auto');
  const [numSteps, setNumSteps] = useState<number>(15);
  const [tread, setTread] = useState<number>(25); // Giron (cm)
  const [riser, setRiser] = useState<number>(18); // Hauteur (cm)
  
  // --- 3. Structure (Concrete) ---
  const [slabThickness, setSlabThickness] = useState<string>('15'); // paillasse (cm)
  const [wasteConcrete, setWasteConcrete] = useState(5);
  
  // --- 4. Formwork & Steel ---
  const [wasteForm, setWasteForm] = useState(10);
  const [steelRatio, setSteelRatio] = useState<number>(100); // kg/m3
  const [useProps, setUseProps] = useState(true); // Étaiement

  // --- 5. Finishes ---
  const [finishTiling, setFinishTiling] = useState(false);
  const [finishRailing, setFinishRailing] = useState(false);
  const [finishCoating, setFinishCoating] = useState(false); // Enduit sous-face

  // --- Prices ---
  const [prices, setPrices] = useState({
    concrete: DEFAULT_PRICES.BPE_M3,
    steel: DEFAULT_PRICES.REBAR_KG,
    formwork: DEFAULT_PRICES.FORM_PANEL_M2, // Material cost
    formworkLabor: 45, // €/m2 (Main d'oeuvre coffrage)
    prop: DEFAULT_PRICES.PROP_UNIT, // Purchase/Rent estimate
    tiling: 60, // €/m2 fournitures + pose
    railing: 150, // €/ml
    coating: 35, // €/m2
    pump: DEFAULT_PRICES.PUMP_FEE
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Auto-Calculation of Steps (Blondel) ---
  useEffect(() => {
    const H = parseFloat(height) || 0;
    const L = parseFloat(run) || 0;
    
    if (H <= 0) return;

    if (calcMode === 'auto') {
        // Target h ~17.5cm
        const idealN = Math.round(H / 17.5);
        setNumSteps(idealN);
    }
  }, [calcMode, height, run]);

  // Derived Geometry
  const effectiveRun = parseFloat(run) || 0;
  const H_cm = parseFloat(height) || 0;
  const W_cm = parseFloat(width) || 0;
  const slab_cm = parseFloat(slabThickness) || 0;
  const landing_cm = parseFloat(landingDepth) || 0;

  // Recalculate Riser/Tread whenever inputs change
  useEffect(() => {
     if (numSteps > 0) {
        setRiser(H_cm / numSteps);
        // Tread calculation: 
        // If straight: g = Run / (N-1) usually (last step is floor level) or N if last step is a nose.
        // Let's assume Run is the horizontal projection of the stairs.
        // g = Run / (N-1) is standard if top riser lands on floor.
        const calculatedTread = (numSteps > 1) ? effectiveRun / (numSteps - 1) : 30;
        setTread(calculatedTread);
     }
  }, [numSteps, H_cm, effectiveRun]);

  // --- Global Calculation ---
  useEffect(() => {
    if (H_cm <= 0 || W_cm <= 0) return;

    // 1. Geometry & Comfort
    const blondel = 2 * riser + tread;
    const slopeLen_cm = Math.sqrt(Math.pow(effectiveRun, 2) + Math.pow(H_cm, 2)); // Approx straight line
    const slopeAngle = Math.atan(H_cm / effectiveRun) * (180 / Math.PI);

    // 2. Concrete Volume
    const Wm = W_cm / 100;
    const slabM = slab_cm / 100;
    const slopeM = slopeLen_cm / 100;
    const landingM = landing_cm / 100;
    const riserHm = riser / 100;
    const treadGm = tread / 100;

    // Vol Paillasse (Slab)
    // For straight stair: Length * Width * Thickness
    let Ld = slopeM; 
    if (stairType !== 'straight') Ld *= 1.1; // Add 10% length for turns complexity approx
    
    const volSlab = Ld * Wm * slabM;
    
    // Vol Steps (Triangles)
    // Area of one step side triangle = (g * h) / 2
    const volSteps = (treadGm * riserHm / 2) * Wm * numSteps;

    // Vol Landing
    const volLanding = landingM * Wm * slabM; 

    const volTotalRaw = volSlab + volSteps + volLanding;
    const volTotal = volTotalRaw * (1 + wasteConcrete / 100);

    // 3. Formwork Area
    // Underside
    const formUnder = (Ld * Wm) + (landingM * Wm);
    // Sides (Joues) - approx: (Area of triangle under slab + steps profile) * 2 sides
    const areaSideProfile = (Ld * (slabM + riserHm/2)); // Simplified profile area
    const formSides = areaSideProfile * 2;
    // Risers (Contremarches) front face
    const formRisers = numSteps * riserHm * Wm;
    
    const formTotalRaw = formUnder + formSides + formRisers;
    const formTotal = formTotalRaw * (1 + wasteForm / 100);

    // 4. Steel
    const steelKg = volTotal * steelRatio;

    // 5. Finishes
    const areaTiling = (treadGm * Wm * numSteps) + (riserHm * Wm * numSteps) + (landingM * Wm); // Top of steps + risers + landing
    const lenRailing = slopeM + landingM;
    const areaCoating = formUnder + formSides; // Visible concrete

    // 6. Costing
    let totalCost = 0;
    const materials = [];

    // Concrete
    const costConc = volTotal * prices.concrete;
    totalCost += costConc;
    materials.push({
        id: 'concrete',
        name: 'Béton (Dosé 350kg)',
        quantity: parseFloat(volTotal.toFixed(2)),
        quantityRaw: volTotal,
        unit: Unit.M3,
        unitPrice: prices.concrete,
        totalPrice: parseFloat(costConc.toFixed(2)),
        category: CalculatorType.STAIRS,
        details: `Paillasse + Marches`
    });

    // Steel
    const costSteel = steelKg * prices.steel;
    totalCost += costSteel;
    materials.push({
        id: 'steel',
        name: `Armatures (${steelRatio}kg/m³)`,
        quantity: Math.ceil(steelKg),
        quantityRaw: steelKg,
        unit: Unit.KG,
        unitPrice: prices.steel,
        totalPrice: parseFloat(costSteel.toFixed(2)),
        category: CalculatorType.STAIRS
    });

    // Formwork (Material + Labor)
    const costFormMat = formTotal * prices.formwork;
    const costFormLab = formTotal * prices.formworkLabor;
    totalCost += costFormMat + (proMode ? costFormLab : 0);
    materials.push({
        id: 'formwork_mat',
        name: 'Bois de coffrage (Panneaux)',
        quantity: parseFloat(formTotal.toFixed(1)),
        quantityRaw: formTotal,
        unit: Unit.M2,
        unitPrice: prices.formwork,
        totalPrice: parseFloat(costFormMat.toFixed(2)),
        category: CalculatorType.STAIRS
    });
    if (proMode) {
        materials.push({
            id: 'formwork_lab',
            name: 'Main d\'œuvre Coffrage',
            quantity: parseFloat(formTotal.toFixed(1)),
            quantityRaw: formTotal,
            unit: Unit.M2,
            unitPrice: prices.formworkLabor,
            totalPrice: parseFloat(costFormLab.toFixed(2)),
            category: CalculatorType.STAIRS
        });
    }

    // Finishes
    if (finishTiling) {
        const costT = areaTiling * prices.tiling;
        totalCost += costT;
        materials.push({
            id: 'tiling',
            name: 'Carrelage / Revêtement',
            quantity: parseFloat(areaTiling.toFixed(1)),
            quantityRaw: areaTiling,
            unit: Unit.M2,
            unitPrice: prices.tiling,
            totalPrice: parseFloat(costT.toFixed(2)),
            category: CalculatorType.STAIRS
        });
    }
    if (finishRailing) {
        const costR = lenRailing * prices.railing;
        totalCost += costR;
        materials.push({
            id: 'railing',
            name: 'Garde-corps',
            quantity: parseFloat(lenRailing.toFixed(1)),
            quantityRaw: lenRailing,
            unit: Unit.METER,
            unitPrice: prices.railing,
            totalPrice: parseFloat(costR.toFixed(2)),
            category: CalculatorType.STAIRS
        });
    }

    // Warnings
    const warnings = [];
    if (blondel < 60 || blondel > 64) warnings.push(`Blondel ${blondel.toFixed(1)}cm : Confort moyen (Idéal 60-64).`);
    if (riser > 19) warnings.push(`Marches hautes (${riser.toFixed(1)}cm) : Escalier raide.`);
    if (tread < 22) warnings.push(`Giron court (${tread.toFixed(1)}cm) : Pied instable.`);
    if (slopeAngle > 40) warnings.push(`Pente forte (${slopeAngle.toFixed(0)}°).`);

    onCalculate({
        summary: `${numSteps} marches de ${riser.toFixed(1)} cm`,
        details: [
            { label: 'Hauteur Totale', value: H_cm, unit: 'cm' },
            { label: 'Reculement', value: effectiveRun.toFixed(0), unit: 'cm' },
            { label: 'Giron', value: tread.toFixed(1), unit: 'cm' },
            { label: 'Blondel', value: blondel.toFixed(1), unit: 'cm' },
            { label: 'Volume Béton', value: volTotal.toFixed(2), unit: 'm³' },
            { label: 'Surf. Coffrage', value: formTotal.toFixed(1), unit: 'm²' }
        ],
        materials,
        totalCost: parseFloat(totalCost.toFixed(2)),
        warnings: warnings.length ? warnings : undefined
    });

  }, [step, stairType, height, width, run, landingDepth, calcMode, numSteps, slabThickness, wasteConcrete, wasteForm, steelRatio, finishTiling, finishRailing, finishCoating, prices, proMode]);

  return (
    <div className="space-y-6 animate-in fade-in">
        {/* Step Navigation */}
        <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
            {[1, 2, 3, 4, 5].map(s => (
            <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${step === s ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
            >
                {s === 1 && '1. Type'}
                {s === 2 && '2. Confort'}
                {s === 3 && '3. Béton'}
                {s === 4 && '4. Finitions'}
                {s === 5 && '5. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: TYPE & DIMENSIONS */}
        {step === 1 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Info size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Définissez la forme et l'encombrement de l'escalier.
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Forme</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setStairType('straight')} className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${stairType === 'straight' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>
                            <TrendingUp size={20} className="mb-1"/> Droit
                        </button>
                        <button onClick={() => setStairType('quarter')} className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${stairType === 'quarter' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>
                            <TrendingUp size={20} className="mb-1 rotate-45"/> 1/4 Tournant
                        </button>
                        <button onClick={() => setStairType('half')} className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${stairType === 'half' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>
                            <TrendingUp size={20} className="mb-1 -rotate-90"/> 1/2 Tournant
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur à monter (cm)</label>
                        <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"/>
                        <p className="text-[10px] text-slate-400 mt-1">Sol fini bas → Sol fini haut</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Reculement (cm)</label>
                        <input type="number" value={run} onChange={(e) => setRun(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"/>
                        <p className="text-[10px] text-slate-400 mt-1">Longueur au sol disponible</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (cm)</label>
                        <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Palier (cm)</label>
                        <input type="number" value={landingDepth} onChange={(e) => setLandingDepth(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"/>
                    </div>
                </div>

                <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center">
                   Suivant <ArrowRight size={18} className="ml-2"/>
                </button>
            </div>
        )}

        {/* STEP 2: COMFORT */}
        {step === 2 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Activity size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajustez le nombre de marches pour le confort. Règle de Blondel (60-64cm) recommandée.
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="text-sm text-slate-500 mb-1">Hauteur de marche</div>
                    <div className="text-3xl font-bold text-slate-800 mb-1">{riser.toFixed(1)} cm</div>
                    <div className="flex justify-center items-center space-x-4 mt-4">
                        <button onClick={() => {setCalcMode('fixed_N'); setNumSteps(Math.max(1, numSteps-1))}} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200">-</button>
                        <div className="text-center">
                            <span className="block text-xl font-bold text-blue-600">{numSteps}</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Marches</span>
                        </div>
                        <button onClick={() => {setCalcMode('fixed_N'); setNumSteps(numSteps+1)}} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-200">+</button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-xs text-slate-500 mb-1">Giron (Profondeur)</span>
                        <span className={`block text-lg font-bold ${tread < 22 ? 'text-red-500' : 'text-slate-800'}`}>{tread.toFixed(1)} cm</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-xs text-slate-500 mb-1">Blondel (2h+g)</span>
                        <span className={`block text-lg font-bold ${(2*riser+tread) < 60 || (2*riser+tread) > 64 ? 'text-amber-500' : 'text-emerald-600'}`}>{(2*riser+tread).toFixed(1)} cm</span>
                    </div>
                </div>

                {(2*riser+tread) < 60 || (2*riser+tread) > 64 ? (
                    <div className="flex items-start text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0"/>
                        <span>Attention : le pas de foulée (Blondel) est hors de la zone de confort idéale (60-64cm). Ajustez le nombre de marches ou le reculement.</span>
                    </div>
                ) : (
                    <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                        <Check size={14} className="mr-2 shrink-0"/>
                        <span>Confort optimal respecté.</span>
                    </div>
                )}

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
                   <Layers size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Paramètres de la structure béton armé.
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ép. Paillasse (cm)</label>
                        <input type="number" value={slabThickness} onChange={(e) => setSlabThickness(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900 font-bold"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Pertes Béton (%)</label>
                        <input type="number" value={wasteConcrete} onChange={(e) => setWasteConcrete(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                    </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Ferraillage</h4>
                    <div className="flex items-center space-x-4">
                        <div className="flex-1">
                            <label className="block text-[10px] text-slate-400 mb-1">Ratio (kg/m³)</label>
                            <input type="number" value={steelRatio} onChange={(e) => setSteelRatio(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-sm"/>
                        </div>
                        <div className="flex-[2] text-xs text-slate-500 italic pt-3">
                            Standard : 80-120 kg/m³ pour un escalier.
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 4: FINISHES & FORMWORK */}
        {step === 4 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <Hammer size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Sélectionnez les options de finition et de coffrage.
                </div>

                <div className="space-y-2">
                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                        <span className="text-sm font-bold text-slate-700">Carrelage / Revêtement</span>
                        <input type="checkbox" checked={finishTiling} onChange={(e) => setFinishTiling(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                    <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
                        <span className="text-sm font-bold text-slate-700">Garde-corps</span>
                        <input type="checkbox" checked={finishRailing} onChange={(e) => setFinishRailing(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </label>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Coffrage</h4>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-700">Pertes découpes (%)</span>
                        <input type="number" value={wasteForm} onChange={(e) => setWasteForm(Number(e.target.value))} className="w-16 p-1 border rounded text-center text-sm"/>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Compter la main d'œuvre (Pro)</span>
                        <input type="checkbox" checked={proMode} onChange={(e) => setProMode(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                    </div>
                </div>

                <div className="flex gap-3">
                   <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                   <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
                </div>
            </div>
        )}

        {/* STEP 5: DEVIS */}
        {step === 5 && (
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                   <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5"/>
                   Ajustez les prix unitaires pour finaliser l'estimation.
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Béton (€/m³)</label>
                        <input type="number" value={prices.concrete} onChange={(e) => updatePrice('concrete', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Acier (€/kg)</label>
                        <input type="number" value={prices.steel} onChange={(e) => updatePrice('steel', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Coffrage (€/m²)</label>
                        <input type="number" value={prices.formwork} onChange={(e) => updatePrice('formwork', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                    </div>
                    {proMode && (
                        <div>
                            <label className="block text-[10px] uppercase text-blue-600 font-bold mb-1">MO Coffrage (€/m²)</label>
                            <input type="number" value={prices.formworkLabor} onChange={(e) => updatePrice('formworkLabor', e.target.value)} className="w-full p-2 border border-blue-200 rounded bg-white text-sm"/>
                        </div>
                    )}
                    {finishTiling && (
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Carrelage (€/m²)</label>
                            <input type="number" value={prices.tiling} onChange={(e) => updatePrice('tiling', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                        </div>
                    )}
                    {finishRailing && (
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Garde-corps (€/ml)</label>
                            <input type="number" value={prices.railing} onChange={(e) => updatePrice('railing', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 pt-4">
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
