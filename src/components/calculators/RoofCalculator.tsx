
import React, { useState, useEffect } from 'react';
import { CalculatorType, CalculationResult, Unit } from '../../../types';
import { DEFAULT_PRICES } from '../../constants';
import { Home, Ruler, ChevronDown, ChevronUp, Layers, Droplets, Info, CircleDollarSign, Check, Hammer, Settings, ArrowRight, Umbrella } from 'lucide-react';

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

export const RoofCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Geometry & Type ---
  const [roofType, setRoofType] = useState<'1pan' | '2pans' | '4pans' | 'flat'>('2pans');
  const [dimL, setDimL] = useState<string>(''); // Length
  const [dimW, setDimW] = useState<string>(''); // Width
  const [overhang, setOverhang] = useState<string>('30'); // cm (débord)
  const [slope, setSlope] = useState<string>('35'); // %

  // --- 2. Covering (Couverture) ---
  const [coverMaterial, setCoverMaterial] = useState<'tile_mech' | 'tile_flat' | 'slate' | 'steel' | 'zinc'>('tile_mech');
  const [wastePct, setWastePct] = useState(10);
  
  // Specifics
  const [tileConsump, setTileConsump] = useState(10); // u/m2 or kg/m2
  
  // --- 3. Underlayers ---
  const [useScreen, setUseScreen] = useState(true); // Ecran sous-toiture
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState('200'); // mm
  const [useVapor, setUseVapor] = useState(false);

  // --- 4. Rainwater & Zinc ---
  const [gutterType, setGutterType] = useState<'pvc' | 'zinc' | 'alu' | 'copper'>('pvc');
  const [downspouts, setDownspouts] = useState<number>(4);
  const [valleyLen, setValleyLen] = useState<string>('0'); // Noues (m)
  
  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    coverM2: 25, // Base price depending on material
    ridgeM: 15, // Faîtage
    vergeM: 12, // Rives
    hipM: 15, // Arêtiers
    valleyM: 25, // Noues
    screenM2: DEFAULT_PRICES.UNDERLAY_ROLL_75M2 / 75, // approx
    insulM2: 15,
    gutterM: 15, // Gouttière
    downspoutU: 40, // Descente + Naissance
    laborM2: 45
  });

  // --- Auto-update Defaults based on Material ---
  useEffect(() => {
    if (coverMaterial === 'tile_mech') { // Tuile Mécanique
        setPrices(p => ({ ...p, coverM2: 25, ridgeM: 15, vergeM: 12 }));
        setTileConsump(10); // ~10-12/m2
    } else if (coverMaterial === 'tile_flat') { // Tuile Plate
        setPrices(p => ({ ...p, coverM2: 45, ridgeM: 18, vergeM: 15 }));
        setTileConsump(60); // ~60-70/m2
    } else if (coverMaterial === 'slate') { // Ardoise
        setPrices(p => ({ ...p, coverM2: 60, ridgeM: 20, vergeM: 15 }));
        setTileConsump(30); 
    } else if (coverMaterial === 'steel') { // Bac Acier
        setPrices(p => ({ ...p, coverM2: 20, ridgeM: 12, vergeM: 10 }));
        setTileConsump(1);
    } else if (coverMaterial === 'zinc') { // Zinc joint debout
        setPrices(p => ({ ...p, coverM2: 120, ridgeM: 30, vergeM: 25 }));
        setTileConsump(1);
    }
  }, [coverMaterial]);

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Calculation Engine ---
  useEffect(() => {
    const L_g = parseFloat(dimL) || 0;
    const W_g = parseFloat(dimW) || 0;
    
    if (L_g <= 0 || W_g <= 0) return;

    // 1. Geometry Calculation
    const oh_m = parseFloat(overhang) / 100 || 0;
    // Dimensions with overhang
    const L = L_g + (2 * oh_m); 
    const W = W_g + (2 * oh_m);
    
    const slopePct = parseFloat(slope) || 0;
    const angleRad = Math.atan(slopePct / 100);
    const slopeFactor = 1 / Math.cos(angleRad); // Secant

    let projectedArea = L * W;
    let realArea = 0;
    let ridgeLen = 0; // Faitage
    let eavesLen = 0; // Egout (Gouttières)
    let vergeLen = 0; // Rives
    let hipLen = 0;   // Arêtiers
    let slopeLen = 0; // Rampant (used for chevrons estimate)

    if (roofType === 'flat') {
        realArea = projectedArea;
        eavesLen = (L + W) * 2; // Acrotère perimeter basically
    } else if (roofType === '1pan') {
        realArea = projectedArea * slopeFactor;
        ridgeLen = L; // High side
        eavesLen = L; // Low side
        slopeLen = W * slopeFactor;
        vergeLen = slopeLen * 2;
    } else if (roofType === '2pans') {
        realArea = projectedArea * slopeFactor;
        ridgeLen = L;
        eavesLen = L * 2;
        slopeLen = (W / 2) * slopeFactor;
        vergeLen = slopeLen * 4;
    } else if (roofType === '4pans') {
        // Simplified calculation for Hip Roof
        realArea = projectedArea * slopeFactor;
        eavesLen = (L + W) * 2;
        slopeLen = (W / 2) * slopeFactor; // Approximate mean rampant
        // Ridge length approx: Length - Width (if regular hips)
        ridgeLen = Math.max(0, L - W);
        // Hips (Arêtiers): 4 hips. Length of one hip = sqrt( (W/2)^2 + (W/2)^2 + height^2 ) approx
        // Simplified: slopeLen * 1.45 roughly for standard slopes
        hipLen = slopeLen * 1.5 * 4; 
    }

    const totalAreaWithWaste = realArea * (1 + wastePct / 100);

    // 2. Materials
    const materialsList: any[] = [];
    let totalCost = 0;

    // Cover
    const costCover = totalAreaWithWaste * prices.coverM2;
    totalCost += costCover;
    materialsList.push({
        id: 'cover',
        name: coverMaterial === 'tile_mech' ? 'Tuiles Mécaniques' : coverMaterial === 'tile_flat' ? 'Tuiles Plates' : coverMaterial === 'slate' ? 'Ardoises' : coverMaterial === 'steel' ? 'Bac Acier' : 'Zinc',
        quantity: Math.ceil(totalAreaWithWaste),
        quantityRaw: totalAreaWithWaste,
        unit: Unit.M2,
        unitPrice: prices.coverM2,
        totalPrice: parseFloat(costCover.toFixed(2)),
        category: CalculatorType.ROOF,
        details: `Surface réelle: ${realArea.toFixed(1)}m² (+${wastePct}%)`
    });

    // Ridge (Faîtage)
    if (ridgeLen > 0) {
        const costRidge = ridgeLen * prices.ridgeM;
        totalCost += costRidge;
        materialsList.push({
            id: 'ridge',
            name: 'Faîtage (Tuiles/Accessoires)',
            quantity: parseFloat(ridgeLen.toFixed(1)),
            quantityRaw: ridgeLen,
            unit: Unit.METER,
            unitPrice: prices.ridgeM,
            totalPrice: parseFloat(costRidge.toFixed(2)),
            category: CalculatorType.ROOF
        });
    }

    // Verges (Rives)
    if (vergeLen > 0) {
        const costVerge = vergeLen * prices.vergeM;
        totalCost += costVerge;
        materialsList.push({
            id: 'verge',
            name: 'Rives (Tuiles/Bandes)',
            quantity: parseFloat(vergeLen.toFixed(1)),
            quantityRaw: vergeLen,
            unit: Unit.METER,
            unitPrice: prices.vergeM,
            totalPrice: parseFloat(costVerge.toFixed(2)),
            category: CalculatorType.ROOF
        });
    }

    // Hips (Arêtiers) - 4 Pans only
    if (hipLen > 0) {
        const costHip = hipLen * prices.hipM;
        totalCost += costHip;
        materialsList.push({
            id: 'hip',
            name: 'Arêtiers (Tuiles/Bandes)',
            quantity: parseFloat(hipLen.toFixed(1)),
            quantityRaw: hipLen,
            unit: Unit.METER,
            unitPrice: prices.hipM,
            totalPrice: parseFloat(costHip.toFixed(2)),
            category: CalculatorType.ROOF
        });
    }

    // Valleys (Noues)
    const vLen = parseFloat(valleyLen) || 0;
    if (vLen > 0) {
        const costValley = vLen * prices.valleyM;
        totalCost += costValley;
        materialsList.push({
            id: 'valley',
            name: 'Noues (Zinc/Alu)',
            quantity: vLen,
            quantityRaw: vLen,
            unit: Unit.METER,
            unitPrice: prices.valleyM,
            totalPrice: parseFloat(costValley.toFixed(2)),
            category: CalculatorType.ROOF
        });
    }

    // 3. Underlayers
    if (useScreen) {
        const screenArea = realArea * 1.1; // +10% overlap
        const costScreen = screenArea * prices.screenM2;
        totalCost += costScreen;
        materialsList.push({
            id: 'screen',
            name: 'Écran sous-toiture (HPV)',
            quantity: Math.ceil(screenArea),
            quantityRaw: screenArea,
            unit: Unit.M2,
            unitPrice: prices.screenM2,
            totalPrice: parseFloat(costScreen.toFixed(2)),
            category: CalculatorType.ROOF
        });
        
        // Counter-battens (Liteaux de ventilation)
        // Estim: 1.5ml / m2
        const cbLen = realArea * 1.5;
        const costCB = cbLen * 0.80; // Fixed cheap price for wood
        totalCost += costCB;
        materialsList.push({
            id: 'counter_batten',
            name: 'Contre-lattage (Ventilation)',
            quantity: Math.ceil(cbLen),
            quantityRaw: cbLen,
            unit: Unit.METER,
            unitPrice: 0.80,
            totalPrice: parseFloat(costCB.toFixed(2)),
            category: CalculatorType.ROOF
        });
    }

    if (useInsulation) {
        const insulArea = realArea * 1.05; // 5% cuts
        const costInsul = insulArea * prices.insulM2;
        totalCost += costInsul;
        materialsList.push({
            id: 'insulation',
            name: `Isolation Rampants (${insulThick}mm)`,
            quantity: Math.ceil(insulArea),
            quantityRaw: insulArea,
            unit: Unit.M2,
            unitPrice: prices.insulM2,
            totalPrice: parseFloat(costInsul.toFixed(2)),
            category: CalculatorType.ROOF
        });
    }

    // 4. Rainwater
    if (eavesLen > 0) {
        const costGutter = eavesLen * prices.gutterM;
        totalCost += costGutter;
        materialsList.push({
            id: 'gutter',
            name: `Gouttières (${gutterType})`,
            quantity: Math.ceil(eavesLen),
            quantityRaw: eavesLen,
            unit: Unit.METER,
            unitPrice: prices.gutterM,
            totalPrice: parseFloat(costGutter.toFixed(2)),
            category: CalculatorType.ROOF,
            details: `Crochets inclus (1/50cm)`
        });

        // Downspouts
        const costDS = downspouts * prices.downspoutU;
        totalCost += costDS;
        materialsList.push({
            id: 'downspouts',
            name: 'Descentes EP + Naissances',
            quantity: downspouts,
            quantityRaw: downspouts,
            unit: Unit.PIECE,
            unitPrice: prices.downspoutU,
            totalPrice: costDS,
            category: CalculatorType.ROOF
        });
    }

    // 5. Labor (Pro Mode)
    if (proMode) {
        const costLabor = realArea * prices.laborM2;
        totalCost += costLabor;
        materialsList.push({
            id: 'labor',
            name: 'Main d\'œuvre Couverture',
            quantity: parseFloat(realArea.toFixed(1)),
            quantityRaw: realArea,
            unit: Unit.M2,
            unitPrice: prices.laborM2,
            totalPrice: parseFloat(costLabor.toFixed(2)),
            category: CalculatorType.ROOF
        });
    }

    const details = [
        { label: 'Surface Sol', value: projectedArea.toFixed(1), unit: 'm²' },
        { label: 'Pente', value: slope, unit: '%' },
        { label: 'Surface Toiture', value: realArea.toFixed(1), unit: 'm²' },
        { label: 'Faîtage', value: ridgeLen.toFixed(1), unit: 'm' },
        { label: 'Egouts', value: eavesLen.toFixed(1), unit: 'm' }
    ];

    const warnings = [];
    if (parseFloat(slope) < 10 && roofType !== 'flat' && coverMaterial === 'tile_mech') warnings.push("Pente faible (<10%) pour de la tuile mécanique.");
    if (roofType === 'flat' && coverMaterial !== 'steel' && coverMaterial !== 'zinc') warnings.push("Toit plat : le bac acier ou l'EPDM sont recommandés.");

    onCalculate({
       summary: `${realArea.toFixed(1)} m² de couverture`,
       details,
       materials: materialsList,
       totalCost: parseFloat(totalCost.toFixed(2)),
       warnings: warnings.length ? warnings : undefined
    });

  }, [step, roofType, dimL, dimW, overhang, slope, coverMaterial, wastePct, useScreen, useInsulation, insulThick, gutterType, downspouts, valleyLen, prices, proMode]);

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
                {s === 1 && '1. Plan'}
                {s === 2 && '2. Tuiles'}
                {s === 3 && '3. Sous-c.'}
                {s === 4 && '4. Zinc'}
                {s === 5 && '5. Devis'}
            </button>
            ))}
        </div>

        {/* STEP 1: GEOMETRY */}
        {step === 1 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Info size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Définissez la forme du toit et ses dimensions au sol (hors tout).
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Type de toit</label>
                 <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => setRoofType('1pan')} className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${roofType === '1pan' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>
                       <Home size={18} className="mb-1"/> 1 Pan
                    </button>
                    <button onClick={() => setRoofType('2pans')} className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${roofType === '2pans' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>
                       <Home size={18} className="mb-1"/> 2 Pans
                    </button>
                    <button onClick={() => setRoofType('4pans')} className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${roofType === '4pans' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>
                       <Home size={18} className="mb-1"/> 4 Pans
                    </button>
                    <button onClick={() => setRoofType('flat')} className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${roofType === 'flat' ? 'bg-stone-100 border-stone-500 text-stone-800' : 'bg-white text-slate-500'}`}>
                       <Layers size={18} className="mb-1"/> Plat
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (m)</label>
                    <input type="number" value={dimL} onChange={(e) => setDimL(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
                    <input type="number" value={dimW} onChange={(e) => setDimW(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Pente (%)</label>
                    <input type="number" value={slope} onChange={(e) => setSlope(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"/>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Débord toit (cm)</label>
                    <input type="number" value={overhang} onChange={(e) => setOverhang(e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"/>
                 </div>
              </div>

              <button onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center">
                 Suivant <ArrowRight size={18} className="ml-2"/>
              </button>
           </div>
        )}

        {/* STEP 2: COVERING */}
        {step === 2 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Home size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Choix du matériau de couverture.
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Matériau</label>
                 <select value={coverMaterial} onChange={(e) => setCoverMaterial(e.target.value as any)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900">
                    <option value="tile_mech">Tuiles Mécaniques</option>
                    <option value="tile_flat">Tuiles Plates</option>
                    <option value="slate">Ardoises</option>
                    <option value="steel">Bac Acier</option>
                    <option value="zinc">Zinc (Joint debout)</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Pertes (%)</label>
                    <input type="number" value={wastePct} onChange={(e) => setWastePct(Number(e.target.value))} className="w-full p-2 border rounded bg-white text-slate-900"/>
                 </div>
                 {/* Can add tile specific inputs here later */}
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                 <button onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
              </div>
           </div>
        )}

        {/* STEP 3: UNDERLAYERS */}
        {step === 3 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Layers size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Isolation et écrans de protection.
              </div>

              <div className="space-y-3">
                 <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                    <span className="text-sm font-bold text-slate-700">Écran sous-toiture (HPV)</span>
                    <input type="checkbox" checked={useScreen} onChange={(e) => setUseScreen(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                 </label>

                 <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
                    <span className="text-sm font-bold text-slate-700">Isolation Rampants</span>
                    <input type="checkbox" checked={useInsulation} onChange={(e) => setUseInsulation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded"/>
                 </label>
                 {useInsulation && (
                    <div className="pl-4">
                       <label className="block text-xs text-slate-500 mb-1">Épaisseur (mm)</label>
                       <input type="number" value={insulThick} onChange={(e) => setInsulThick(e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900"/>
                    </div>
                 )}
              </div>

              <div className="flex gap-3">
                 <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Retour</button>
                 <button onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Suivant</button>
              </div>
           </div>
        )}

        {/* STEP 4: ZINC/RAINWATER */}
        {step === 4 && (
           <div className="space-y-4">
              <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
                 <Droplets size={16} className="mr-2 shrink-0 mt-0.5"/>
                 Évacuation des eaux pluviales et zinguerie.
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">Gouttières</label>
                 <select value={gutterType} onChange={(e) => setGutterType(e.target.value as any)} className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900">
                    <option value="pvc">PVC</option>
                    <option value="zinc">Zinc</option>
                    <option value="alu">Aluminium</option>
                    <option value="copper">Cuivre</option>
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nb Descentes</label>
                    <div className="flex items-center">
                        <button onClick={() => setDownspouts(Math.max(0, downspouts-1))} className="p-2 bg-slate-100 rounded-l border border-r-0">-</button>
                        <input type="number" value={downspouts} onChange={(e) => setDownspouts(Number(e.target.value))} className="w-full p-2 border text-center bg-white text-slate-900"/>
                        <button onClick={() => setDownspouts(downspouts+1)} className="p-2 bg-slate-100 rounded-r border border-l-0">+</button>
                    </div>
                 </div>
                 {roofType === '4pans' || roofType === '2pans' ? ( // Show valleys only if complex roof implied or pro mode
                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Noues (ml)</label>
                        <input type="number" value={valleyLen} onChange={(e) => setValleyLen(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900"/>
                     </div>
                 ) : null}
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
                        <Settings size={12} className="mr-1"/> {proMode ? 'Mode Simple' : 'Mode Pro'}
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Couv. (€/m²)</label>
                        <input type="number" value={prices.coverM2} onChange={(e) => updatePrice('coverM2', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Gouttière (€/m)</label>
                        <input type="number" value={prices.gutterM} onChange={(e) => updatePrice('gutterM', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                    </div>
                    <div>
                        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Faîtage (€/m)</label>
                        <input type="number" value={prices.ridgeM} onChange={(e) => updatePrice('ridgeM', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                    </div>
                    {proMode && (
                        <>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Rives (€/m)</label>
                            <input type="number" value={prices.vergeM} onChange={(e) => updatePrice('vergeM', e.target.value)} className="w-full p-2 border rounded bg-white text-sm"/>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Main d'œuvre (€/m²)</label>
                            <input type="number" value={prices.laborM2} onChange={(e) => updatePrice('laborM2', e.target.value)} className="w-full p-2 border border-blue-200 rounded bg-white text-sm"/>
                        </div>
                        </>
                    )}
                 </div>
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
