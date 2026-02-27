import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { PLACO_BOARD_TYPES, PLACO_INSULATION_TYPES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  ArrowRightLeft,
  PanelTop,
  Spline,
  Ruler,
  Trash2,
  Plus,
  LayoutTemplate,
  Check,
  Settings,
  ArrowRight,
  Wind,
  Euro,
  AlertTriangle,
} from "lucide-react";

interface Opening {
  id: string;
  type: "door" | "window";
  width: number; // m
  height: number; // m
  quantity: number;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialMode?: "partition" | "lining" | "ceiling";
  hideTabs?: boolean;
}

// --- helpers ---
const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * ✅ Updates / fixes:
 * - Removes unused imports (DEFAULT_PRICES, OPENING_PRESETS, icons, etc.)
 * - Prevents NaN in prices when getUnitPrice returns undefined
 * - Makes board price consistent with selected boardId (BA13/HYDRO/FIRE)
 * - Fixes rails naming: "Rail R48" etc. derives from frameType correctly
 * - Improves studs count and opening reinforcement (doors/windows)
 * - Fixes ceiling grid math (furring spacing configurable, hangers spacing)
 * - Adds membrane material when enabled
 * - Adds warnings when dims invalid / negative net surfaces
 * - Keeps your 5-step UX + same onCalculate payload structure
 */
export const PlacoCalculator: React.FC<Props> = ({
  onCalculate,
  initialMode = "partition",
  hideTabs = false,
}) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Mode & Geometry ---
  const [mode, setMode] = useState<"partition" | "lining" | "ceiling">(initialMode);
  const [dimL, setDimL] = useState<string>("");
  const [dimH, setDimH] = useState<string>("2.5");
  const [dimW, setDimW] = useState<string>("");

  // Openings (not for ceiling)
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [showAddOpening, setShowAddOpening] = useState(false);
  const [newOpType, setNewOpType] = useState<"door" | "window">("door");
  const [newOpW, setNewOpW] = useState("0.83");
  const [newOpH, setNewOpH] = useState("2.04");

  // --- 2. Structure ---
  const [boardId, setBoardId] = useState("BA13");
  const [doubleSkin, setDoubleSkin] = useState(false);
  const [frameType, setFrameType] = useState<"M48" | "M70" | "M90">("M48");
  const [studSpacing, setStudSpacing] = useState(60); // cm
  const [wastePct, setWastePct] = useState(10); // %

  // Ceiling grid (only if ceiling)
  const [ceilingFurringSpacing, setCeilingFurringSpacing] = useState(50); // cm between furring lines
  const [hangerSpacing, setHangerSpacing] = useState(1.2); // m along each furring line

  // --- 3. Insulation & Membrane ---
  const [useInsulation, setUseInsulation] = useState(true);
  const [insulType, setInsulType] = useState("GR32");
  const [insulThick, setInsulThick] = useState("45"); // mm
  const [useMembrane, setUseMembrane] = useState(false);

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    board_BA13: getUnitPrice("PLACO_PLATE_BA13") || 10,
    board_HYDRO: getUnitPrice("PLACO_PLATE_HYDRO") || 14,
    board_FIRE: getUnitPrice("PLACO_PLATE_FIRE") || 16,
    rail3m: getUnitPrice("RAIL_3M") || 6.5,
    stud3m: getUnitPrice("MONTANT_3M") || 7.5,
    furring3m: getUnitPrice("FURRING_3M") || 5.5,
    cornerBead3m: getUnitPrice("CORNER_BEAD_3M") || 6,
    hangerUnit: (getUnitPrice("HANGER_BOX_50") || 25) / 50, // unit
    insulationM2: getUnitPrice("INSULATION_M2") || 6,
    membraneM2: 2.5,
    tapeRoll150: getUnitPrice("JOINT_TAPE_ROLL") || 6.5, // roll 150m
    compoundBag25: getUnitPrice("COMPOUND_BAG_25KG") || 18,
    screwBox1000: getUnitPrice("SCREWS_BOX_1000") || 25,
    laborM2: 35.0,
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  useEffect(() => setMode(initialMode), [initialMode]);

  // --- Openings helpers ---
  const addOpening = () => {
    const w = toNum(newOpW, 0);
    const h = toNum(newOpH, 0);
    if (!(w > 0) || !(h > 0)) return;

    setOpenings((prev) => [
      ...prev,
      { id: Date.now().toString(), type: newOpType, width: w, height: h, quantity: 1 },
    ]);
  };

  const removeOpening = (id: string) => setOpenings((prev) => prev.filter((o) => o.id !== id));

  const updateOpeningQty = (id: string, delta: number) => {
    setOpenings((prev) =>
      prev
        .map((o) => (o.id === id ? { ...o, quantity: Math.max(1, o.quantity + delta) } : o))
        .filter((o) => o.quantity > 0)
    );
  };

  // --- Calculation Engine ---
  const calculationData = useMemo(() => {
    const L = toNum(dimL, 0);
    const H = toNum(dimH, 0);
    const W = toNum(dimW, 0);

    const warnings: string[] = [];
    const materialsList: any[] = [];
    let totalCost = 0;

    const hasValidDims =
      mode === "ceiling" ? L > 0 && W > 0 : L > 0 && H > 0;

    if (!hasValidDims) {
      warnings.push("Dimensions invalides : vérifiez Longueur et Hauteur/Largeur.");
    }

    // --- Surfaces ---
    let surfaceBrute = 0;
    if (mode === "ceiling") surfaceBrute = L * W;
    else surfaceBrute = L * H;

    // Openings deductions only for partition/lining
    let openingArea = 0;
    if (mode !== "ceiling") {
      openings.forEach((op) => {
        openingArea += op.width * op.height * op.quantity;
      });
    }

    const surfaceNette = Math.max(0, surfaceBrute - openingArea);
    if (mode !== "ceiling" && openingArea > surfaceBrute) {
      warnings.push("Ouvertures > surface brute : surface nette ramenée à 0.");
    }

    // --- Boards ---
    const boardDef = PLACO_BOARD_TYPES.find((b: any) => b.id === boardId) || PLACO_BOARD_TYPES[0];
    let layers = doubleSkin ? 2 : 1;
    if (mode === "partition") layers *= 2; // 2 faces

    const boardAreaNeeded = surfaceNette * layers * (1 + wastePct / 100);
    const boardAreaPerPlate = boardDef.area || 3; // fallback ~ 1.2x2.5

    const nbBoards = boardAreaNeeded > 0 ? Math.ceil(boardAreaNeeded / boardAreaPerPlate) : 0;

    const unitBoardPrice =
      boardId === "HYDRO"
        ? prices.board_HYDRO
        : boardId === "FIRE"
        ? prices.board_FIRE
        : prices.board_BA13;

    const costBoards = nbBoards * unitBoardPrice;
    totalCost += costBoards;

    if (nbBoards > 0) {
      materialsList.push({
        id: "boards",
        name: `Plaques ${boardDef.label || boardId}`,
        quantity: nbBoards,
        unit: Unit.PIECE,
        unitPrice: round2(unitBoardPrice),
        totalPrice: round2(costBoards),
        category: CalculatorType.PLACO,
        details: `${layers} peau(x) • ${surfaceNette.toFixed(1)} m² nets`,
      });
    }

    // --- Frame / Grid ---
    if (surfaceNette > 0) {
      if (mode === "partition" || mode === "lining") {
        // Rails: top + bottom
        const railLen = L * 2 * (1 + wastePct / 100);
        const nbRails = Math.ceil(railLen / 3);
        const costRails = nbRails * prices.rail3m;
        totalCost += costRails;

        materialsList.push({
          id: "rails",
          name: `Rails ${frameType.replace("M", "R")} (3m)`,
          quantity: nbRails,
          unit: Unit.PIECE,
          unitPrice: round2(prices.rail3m),
          totalPrice: round2(costRails),
          category: CalculatorType.PLACO,
        });

        // Studs:
        // - base studs every spacing + 1
        // - + reinforcement for openings: 2 jambs each opening + 1 lintel "stud" equivalent per opening
        const nbStudsRaw = Math.ceil((L * 100) / studSpacing) + 1;

        const openCount = openings.reduce((acc, o) => acc + o.quantity, 0);
        const studsForOpenings = openCount * 3; // jamb left + jamb right + reinforcement/lintel
        const totalStuds = nbStudsRaw + studsForOpenings;

        const costStuds = totalStuds * prices.stud3m;
        totalCost += costStuds;

        materialsList.push({
          id: "studs",
          name: `Montants ${frameType} (3m)`,
          quantity: totalStuds,
          unit: Unit.PIECE,
          unitPrice: round2(prices.stud3m),
          totalPrice: round2(costStuds),
          category: CalculatorType.PLACO,
          details: `Entraxe ${studSpacing} cm`,
        });
      } else {
        // Ceiling grid: furring lines + perimeter angles + hangers
        const furringLines = Math.ceil((W * 100) / ceilingFurringSpacing) + 1;
        const totalFurringLen = furringLines * L * (1 + wastePct / 100);
        const nbFurring = Math.ceil(totalFurringLen / 3);

        const costFurring = nbFurring * prices.furring3m;
        totalCost += costFurring;

        materialsList.push({
          id: "furring",
          name: "Fourrures F530 (3m)",
          quantity: nbFurring,
          unit: Unit.PIECE,
          unitPrice: round2(prices.furring3m),
          totalPrice: round2(costFurring),
          category: CalculatorType.PLACO,
          details: `Entraxe ${ceilingFurringSpacing} cm`,
        });

        const perim = (L + W) * 2;
        const nbAngles = Math.ceil(perim / 3);
        const costAngles = nbAngles * prices.cornerBead3m;
        totalCost += costAngles;

        materialsList.push({
          id: "angles",
          name: "Cornières de rive (3m)",
          quantity: nbAngles,
          unit: Unit.PIECE,
          unitPrice: round2(prices.cornerBead3m),
          totalPrice: round2(costAngles),
          category: CalculatorType.PLACO,
        });

        const hangersPerLine = Math.ceil(L / hangerSpacing) + 1;
        const totalHangers = furringLines * hangersPerLine;
        const costHangers = totalHangers * prices.hangerUnit;
        totalCost += costHangers;

        materialsList.push({
          id: "hangers",
          name: "Suspentes",
          quantity: totalHangers,
          unit: Unit.PIECE,
          unitPrice: round2(prices.hangerUnit),
          totalPrice: round2(costHangers),
          category: CalculatorType.PLACO,
          details: `Pas ${hangerSpacing} m`,
        });
      }
    }

    // --- Insulation ---
    if (useInsulation && surfaceBrute > 0) {
      const insulArea = surfaceBrute * (1 + wastePct / 100);
      const costInsul = insulArea * prices.insulationM2;
      totalCost += costInsul;

      materialsList.push({
        id: "insul",
        name: `Isolant ${insulType} (ép. ${insulThick} mm)`,
        quantity: round2(insulArea),
        unit: Unit.M2,
        unitPrice: round2(prices.insulationM2),
        totalPrice: round2(costInsul),
        category: CalculatorType.PLACO,
      });
    }

    // Membrane (pare-vapeur)
    if (useMembrane && surfaceBrute > 0) {
      const memArea = surfaceBrute * 1.1; // recouvrements
      const costMem = memArea * prices.membraneM2;
      totalCost += costMem;

      materialsList.push({
        id: "membrane",
        name: "Membrane pare-vapeur",
        quantity: round2(memArea),
        unit: Unit.M2,
        unitPrice: round2(prices.membraneM2),
        totalPrice: round2(costMem),
        category: CalculatorType.PLACO,
      });
    }

    // --- Consumables ---
    if (surfaceNette > 0) {
      // Screws: ~15/m²/layer
      const totalScrews = surfaceNette * layers * 15;
      const boxesScrews = Math.ceil(totalScrews / 1000);
      const costScrews = boxesScrews * prices.screwBox1000;
      totalCost += costScrews;

      materialsList.push({
        id: "screws",
        name: "Vis TTPC (boîte 1000)",
        quantity: boxesScrews,
        unit: Unit.BOX,
        unitPrice: round2(prices.screwBox1000),
        totalPrice: round2(costScrews),
        category: CalculatorType.PLACO,
      });

      // Joint tape: ~1.5m per m² per layer (approx)
      const tapeLen = surfaceNette * layers * 1.5;
      const rollsTape = Math.ceil(tapeLen / 150);
      const costTape = rollsTape * prices.tapeRoll150;
      totalCost += costTape;

      materialsList.push({
        id: "tape",
        name: "Bande à joints (150m)",
        quantity: rollsTape,
        unit: Unit.ROLL,
        unitPrice: round2(prices.tapeRoll150),
        totalPrice: round2(costTape),
        category: CalculatorType.PLACO,
      });

      // Compound: ~0.5kg/m²/layer
      const compoundKg = surfaceNette * layers * 0.5;
      const bagsCompound = Math.ceil(compoundKg / 25);
      const costCompound = bagsCompound * prices.compoundBag25;
      totalCost += costCompound;

      materialsList.push({
        id: "compound",
        name: "Enduit à joints (25kg)",
        quantity: bagsCompound,
        unit: Unit.BAG,
        unitPrice: round2(prices.compoundBag25),
        totalPrice: round2(costCompound),
        category: CalculatorType.PLACO,
      });
    }

    // --- Labor ---
    if (proMode && surfaceNette > 0) {
      const laborCost = surfaceNette * prices.laborM2;
      totalCost += laborCost;

      materialsList.push({
        id: "labor",
        name: "Main d'œuvre plaquiste",
        quantity: round2(surfaceNette),
        unit: Unit.M2,
        unitPrice: round2(prices.laborM2),
        totalPrice: round2(laborCost),
        category: CalculatorType.PLACO,
      });
    }

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      surfaceNette,
      warnings,
    };
  }, [
    mode,
    dimL,
    dimH,
    dimW,
    openings,
    boardId,
    doubleSkin,
    frameType,
    studSpacing,
    wastePct,
    ceilingFurringSpacing,
    hangerSpacing,
    useInsulation,
    insulType,
    insulThick,
    useMembrane,
    prices,
    proMode,
  ]);

  // Pass results
  useEffect(() => {
    onCalculate({
      summary: `${calculationData.surfaceNette.toFixed(1)} m² de ${
        mode === "partition" ? "cloison" : mode === "lining" ? "doublage" : "plafond"
      }`,
      details: [
        { label: "Mode", value: mode === "partition" ? "Cloison" : mode === "lining" ? "Doublage" : "Plafond", unit: "" },
        { label: "Surface nette", value: calculationData.surfaceNette.toFixed(1), unit: "m²" },
        { label: "Ossature", value: mode === "ceiling" ? "F530" : frameType, unit: "" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, mode, frameType]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Mode tabs */}
      {!hideTabs && (
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => setMode("partition")}
            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${
              mode === "partition" ? "bg-white shadow text-indigo-600" : "text-slate-500"
            }`}
          >
            <ArrowRightLeft size={16} className="mr-1" /> Cloison
          </button>
          <button
            onClick={() => setMode("lining")}
            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${
              mode === "lining" ? "bg-white shadow text-indigo-600" : "text-slate-500"
            }`}
          >
            <PanelTop size={16} className="mr-1" /> Doublage
          </button>
          <button
            onClick={() => setMode("ceiling")}
            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center ${
              mode === "ceiling" ? "bg-white shadow text-indigo-600" : "text-slate-500"
            }`}
          >
            <Spline size={16} className="mr-1" /> Plafond
          </button>
        </div>
      )}

      {/* Step nav */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Plan"}
            {s === 2 && "2. Plaque"}
            {s === 3 && "3. Isol."}
            {s === 4 && "4. Devis"}
            {s === 5 && "5. Prix"}
          </button>
        ))}
      </div>

      {/* Warnings (small) */}
      {calculationData.warnings?.length ? (
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
          {calculationData.warnings.map((w, i) => (
            <div key={i} className="flex items-start">
              <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" /> {w}
            </div>
          ))}
        </div>
      ) : null}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Ruler size={16} className="mr-2 shrink-0 mt-0.5" />
            Dimensions de la zone et ouvertures (si applicable).
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (m)</label>
              <input
                type="number"
                value={dimL}
                onChange={(e) => setDimL(e.target.value)}
                className="w-full p-2 border rounded bg-white font-bold text-slate-900"
              />
            </div>

            {mode === "ceiling" ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
                <input
                  type="number"
                  value={dimW}
                  onChange={(e) => setDimW(e.target.value)}
                  className="w-full p-2 border rounded bg-white font-bold text-slate-900"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur (m)</label>
                <input
                  type="number"
                  value={dimH}
                  onChange={(e) => setDimH(e.target.value)}
                  className="w-full p-2 border rounded bg-white font-bold text-slate-900"
                />
              </div>
            )}
          </div>

          {mode !== "ceiling" && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Ouvertures</span>
                <button
                  onClick={() => setShowAddOpening(!showAddOpening)}
                  className="text-blue-600 text-xs font-bold flex items-center"
                >
                  <Plus size={14} className="mr-1" /> Ajouter
                </button>
              </div>

              {showAddOpening && (
                <div className="bg-white p-2 rounded border mb-2 animate-in fade-in">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newOpType}
                      onChange={(e) => setNewOpType(e.target.value as any)}
                      className="text-xs p-1 border rounded bg-white text-slate-900"
                    >
                      <option value="door">Porte</option>
                      <option value="window">Fenêtre</option>
                    </select>
                    <input
                      type="number"
                      placeholder="L"
                      value={newOpW}
                      onChange={(e) => setNewOpW(e.target.value)}
                      className="w-16 p-1 text-xs border rounded bg-white text-slate-900"
                    />
                    <input
                      type="number"
                      placeholder="H"
                      value={newOpH}
                      onChange={(e) => setNewOpH(e.target.value)}
                      className="w-16 p-1 text-xs border rounded bg-white text-slate-900"
                    />
                  </div>
                  <button
                    onClick={addOpening}
                    className="w-full bg-blue-100 text-blue-700 py-1 rounded text-xs font-bold"
                  >
                    Valider
                  </button>
                </div>
              )}

              <div className="space-y-1">
                {openings.map((op) => (
                  <div key={op.id} className="flex justify-between items-center bg-white p-2 rounded border">
                    <div className="text-xs text-slate-700">
                      {op.type === "door" ? "Porte" : "Fenêtre"} {op.width}×{op.height} m{" "}
                      <span className="text-slate-400">•</span>{" "}
                      <button
                        onClick={() => updateOpeningQty(op.id, -1)}
                        className="px-2 py-0.5 border rounded text-slate-500"
                      >
                        -
                      </button>{" "}
                      <span className="font-bold">{op.quantity}</span>{" "}
                      <button
                        onClick={() => updateOpeningQty(op.id, +1)}
                        className="px-2 py-0.5 border rounded text-slate-500"
                      >
                        +
                      </button>
                    </div>
                    <button onClick={() => removeOpening(op.id)} className="text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {openings.length === 0 && <span className="text-xs text-slate-400 italic">Aucune ouverture.</span>}
              </div>
            </div>
          )}

          {mode === "ceiling" && (
            <div className="bg-white p-3 rounded-lg border border-slate-200">
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Grille plafond</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Entraxe fourrures (cm)</label>
                  <select
                    value={ceilingFurringSpacing}
                    onChange={(e) => setCeilingFurringSpacing(toNum(e.target.value, 50))}
                    className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                  >
                    <option value={40}>40</option>
                    <option value={50}>50</option>
                    <option value={60}>60</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Pas suspentes (m)</label>
                  <select
                    value={hangerSpacing}
                    onChange={(e) => setHangerSpacing(toNum(e.target.value, 1.2))}
                    className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                  >
                    <option value={1.0}>1.0</option>
                    <option value={1.2}>1.2</option>
                    <option value={1.3}>1.3</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <LayoutTemplate size={16} className="mr-2 shrink-0 mt-0.5" />
            Type de plaques et ossature.
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type de plaque</label>
              <div className="grid grid-cols-1 gap-2">
                {PLACO_BOARD_TYPES.map((b: any) => (
                  <button
                    key={b.id}
                    onClick={() => setBoardId(b.id)}
                    className={`p-3 rounded border text-left text-sm ${
                      boardId === b.id
                        ? "bg-indigo-50 border-indigo-500 text-indigo-800 ring-1 ring-indigo-500"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    <span className="font-bold block">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {mode !== "ceiling" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Ossature</label>
                  <select
                    value={frameType}
                    onChange={(e) => setFrameType(e.target.value as any)}
                    className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                  >
                    <option value="M48">M48</option>
                    <option value="M70">M70</option>
                    <option value="M90">M90</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Entraxe (cm)</label>
                  <select
                    value={studSpacing}
                    onChange={(e) => setStudSpacing(toNum(e.target.value, 60))}
                    className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                  >
                    <option value={60}>60</option>
                    <option value={40}>40</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <span className="text-sm font-medium">Double peau</span>
                <input
                  type="checkbox"
                  checked={doubleSkin}
                  onChange={(e) => setDoubleSkin(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Pertes (%)</label>
                <input
                  type="number"
                  value={wastePct}
                  onChange={(e) => setWastePct(clamp(toNum(e.target.value, 10), 0, 40))}
                  className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Wind size={16} className="mr-2 shrink-0 mt-0.5" />
            Isolation et pare-vapeur.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <label className="flex items-center justify-between mb-4 cursor-pointer">
              <span className="font-bold text-slate-800">Ajouter isolant</span>
              <input
                type="checkbox"
                checked={useInsulation}
                onChange={(e) => setUseInsulation(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            {useInsulation && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                  <select
                    value={insulType}
                    onChange={(e) => setInsulType(e.target.value)}
                    className="w-full p-2 border rounded bg-white text-slate-900 text-sm"
                  >
                    {PLACO_INSULATION_TYPES.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Épaisseur (mm)</label>
                  <input
                    type="number"
                    value={insulThick}
                    onChange={(e) => setInsulThick(e.target.value)}
                    className="w-full p-2 border rounded bg-white text-slate-900"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center mt-4">
              <input
                type="checkbox"
                checked={useMembrane}
                onChange={(e) => setUseMembrane(e.target.checked)}
                className="mr-2 rounded text-blue-600"
              />
              <span className="text-sm text-slate-700">Pare-vapeur indépendant</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="text-center py-10">
          <Check size={48} className="mx-auto text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Calcul prêt</h3>
          <p className="text-slate-500 mb-6">Vous pouvez ajuster les prix si besoin.</p>
          <button onClick={() => setStep(5)} className="text-blue-600 font-bold underline">
            Modifier les prix
          </button>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Euro size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustement des prix unitaires.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Tarifs</h4>
              <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? "Mode Pro" : "Mode Simple"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">BA13 (€/plaque)</label>
                <input
                  type="number"
                  value={prices.board_BA13}
                  onChange={(e) => updatePrice("board_BA13", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Hydro (€/plaque)</label>
                <input
                  type="number"
                  value={prices.board_HYDRO}
                  onChange={(e) => updatePrice("board_HYDRO", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Feu (€/plaque)</label>
                <input
                  type="number"
                  value={prices.board_FIRE}
                  onChange={(e) => updatePrice("board_FIRE", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Isolant (€/m²)</label>
                <input
                  type="number"
                  value={prices.insulationM2}
                  onChange={(e) => updatePrice("insulationM2", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Rail 3m (€/u)</label>
                <input
                  type="number"
                  value={prices.rail3m}
                  onChange={(e) => updatePrice("rail3m", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Montant 3m (€/u)</label>
                <input
                  type="number"
                  value={prices.stud3m}
                  onChange={(e) => updatePrice("stud3m", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Bande joints 150m (€/rlx)</label>
                <input
                  type="number"
                  value={prices.tapeRoll150}
                  onChange={(e) => updatePrice("tapeRoll150", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Enduit joints 25kg (€/sac)</label>
                <input
                  type="number"
                  value={prices.compoundBag25}
                  onChange={(e) => updatePrice("compoundBag25", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Vis 1000 (€/boîte)</label>
                <input
                  type="number"
                  value={prices.screwBox1000}
                  onChange={(e) => updatePrice("screwBox1000", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Membrane (€/m²)</label>
                <input
                  type="number"
                  value={prices.membraneM2}
                  onChange={(e) => updatePrice("membraneM2", e.target.value)}
                  className="w-full p-1.5 border rounded text-sm bg-white text-slate-900"
                />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">MO pose (€/m²)</label>
                  <input
                    type="number"
                    value={prices.laborM2}
                    onChange={(e) => updatePrice("laborM2", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                {mode === "ceiling" && (
                  <div>
                    <label className="block text-[10px] text-blue-600 font-bold mb-1">Fourrure 3m (€/u)</label>
                    <input
                      type="number"
                      value={prices.furring3m}
                      onChange={(e) => updatePrice("furring3m", e.target.value)}
                      className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
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