import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES } from "../../constants";
import {
  Home,
  Ruler,
  Layers,
  Droplets,
  Info,
  CircleDollarSign,
  Check,
  Settings,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

type RoofType = "1pan" | "2pans" | "4pans" | "flat";
type CoverMaterial = "tile_mech" | "tile_flat" | "slate" | "steel" | "zinc";
type GutterType = "pvc" | "zinc" | "alu" | "copper";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const RoofCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Geometry & Type ---
  const [roofType, setRoofType] = useState<RoofType>("2pans");
  const [dimL, setDimL] = useState<string>(""); // m
  const [dimW, setDimW] = useState<string>(""); // m
  const [overhang, setOverhang] = useState<string>("30"); // cm
  const [slope, setSlope] = useState<string>("35"); // %

  // --- 2. Covering ---
  const [coverMaterial, setCoverMaterial] = useState<CoverMaterial>("tile_mech");
  const [wastePct, setWastePct] = useState(10);

  // --- 3. Underlayers ---
  const [useScreen, setUseScreen] = useState(true);
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState("200"); // mm
  const [useVapor, setUseVapor] = useState(false); // kept for later (not priced yet)

  // --- 4. Rainwater & Zinc ---
  const [gutterType, setGutterType] = useState<GutterType>("pvc");
  const [downspouts, setDownspouts] = useState<number>(4);
  const [valleyLen, setValleyLen] = useState<string>("0"); // m

  // --- 5. Pricing ---
  const [prices, setPrices] = useState({
    coverM2: 25,
    ridgeM: 15,
    vergeM: 12,
    hipM: 15,
    valleyM: 25,
    screenM2: (DEFAULT_PRICES as any).UNDERLAY_ROLL_75M2 ? (DEFAULT_PRICES as any).UNDERLAY_ROLL_75M2 / 75 : 1.4,
    insulM2: 15,
    vaporM2: 1.2,
    gutterM: 15,
    downspoutU: 40,
    laborM2: 45,
    // small timber defaults
    counterBattenM: 0.8,
  });

  // --- Auto-update Defaults based on Cover Material ---
  useEffect(() => {
    setPrices((p) => {
      if (coverMaterial === "tile_mech") return { ...p, coverM2: 25, ridgeM: 15, vergeM: 12, hipM: 15, valleyM: 25 };
      if (coverMaterial === "tile_flat") return { ...p, coverM2: 45, ridgeM: 18, vergeM: 15, hipM: 18, valleyM: 30 };
      if (coverMaterial === "slate") return { ...p, coverM2: 60, ridgeM: 20, vergeM: 15, hipM: 20, valleyM: 35 };
      if (coverMaterial === "steel") return { ...p, coverM2: 20, ridgeM: 12, vergeM: 10, hipM: 12, valleyM: 22 };
      // zinc
      return { ...p, coverM2: 120, ridgeM: 30, vergeM: 25, hipM: 30, valleyM: 45 };
    });
  }, [coverMaterial]);

  // --- Auto-update Defaults based on Gutter Material (simple) ---
  useEffect(() => {
    setPrices((p) => {
      if (gutterType === "pvc") return { ...p, gutterM: 15, downspoutU: 40 };
      if (gutterType === "alu") return { ...p, gutterM: 22, downspoutU: 55 };
      if (gutterType === "zinc") return { ...p, gutterM: 28, downspoutU: 70 };
      return { ...p, gutterM: 45, downspoutU: 110 }; // copper
    });
  }, [gutterType]);

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    const L_g = toNum(dimL, 0);
    const W_g = toNum(dimW, 0);

    if (L_g <= 0 || W_g <= 0) {
      return {
        ok: false,
        projectedArea: 0,
        realArea: 0,
        ridgeLen: 0,
        eavesLen: 0,
        vergeLen: 0,
        hipLen: 0,
        totalAreaWithWaste: 0,
        materials: [] as any[],
        totalCost: 0,
        warnings: [] as string[],
      };
    }

    // 1) geometry with overhang
    const oh_m = clamp(toNum(overhang, 30), 0, 200) / 100;
    const L = L_g + 2 * oh_m;
    const W = W_g + 2 * oh_m;

    const slopePct = clamp(toNum(slope, 0), 0, 200);
    const angleRad = Math.atan(slopePct / 100);
    const slopeFactor = roofType === "flat" ? 1 : 1 / Math.cos(angleRad);

    const projectedArea = L * W;

    let realArea = 0;
    let ridgeLen = 0;
    let eavesLen = 0;
    let vergeLen = 0;
    let hipLen = 0;

    if (roofType === "flat") {
      realArea = projectedArea;
      eavesLen = (L + W) * 2;
    } else if (roofType === "1pan") {
      realArea = projectedArea * slopeFactor;
      ridgeLen = L; // high side
      eavesLen = L; // low side
      const slopeLen = W * slopeFactor;
      vergeLen = slopeLen * 2;
    } else if (roofType === "2pans") {
      realArea = projectedArea * slopeFactor;
      ridgeLen = L;
      eavesLen = L * 2;
      const slopeLen = (W / 2) * slopeFactor;
      vergeLen = slopeLen * 4;
    } else {
      // 4 pans (approx)
      realArea = projectedArea * slopeFactor;
      eavesLen = (L + W) * 2;
      const slopeLen = (W / 2) * slopeFactor;
      ridgeLen = Math.max(0, L - W);
      hipLen = slopeLen * 1.5 * 4;
    }

    const totalAreaWithWaste = realArea * (1 + wastePct / 100);

    const materials: any[] = [];
    let totalCost = 0;
    const warnings: string[] = [];

    const coverName =
      coverMaterial === "tile_mech"
        ? "Tuiles mécaniques"
        : coverMaterial === "tile_flat"
        ? "Tuiles plates"
        : coverMaterial === "slate"
        ? "Ardoises"
        : coverMaterial === "steel"
        ? "Bac acier"
        : "Zinc (joint debout)";

    // Cover
    const costCover = totalAreaWithWaste * prices.coverM2;
    totalCost += costCover;
    materials.push({
      id: "cover",
      name: coverName,
      quantity: Math.ceil(totalAreaWithWaste),
      quantityRaw: totalAreaWithWaste,
      unit: Unit.M2,
      unitPrice: round2(prices.coverM2),
      totalPrice: round2(costCover),
      category: CalculatorType.ROOF,
      details: `Surface réelle: ${realArea.toFixed(1)} m² (+${wastePct}%)`,
    });

    // Ridge
    if (ridgeLen > 0) {
      const costRidge = ridgeLen * prices.ridgeM;
      totalCost += costRidge;
      materials.push({
        id: "ridge",
        name: "Faîtage",
        quantity: round2(ridgeLen),
        quantityRaw: ridgeLen,
        unit: Unit.METER,
        unitPrice: round2(prices.ridgeM),
        totalPrice: round2(costRidge),
        category: CalculatorType.ROOF,
      });
    }

    // Verges (rives)
    if (vergeLen > 0) {
      const costVerge = vergeLen * prices.vergeM;
      totalCost += costVerge;
      materials.push({
        id: "verge",
        name: "Rives",
        quantity: round2(vergeLen),
        quantityRaw: vergeLen,
        unit: Unit.METER,
        unitPrice: round2(prices.vergeM),
        totalPrice: round2(costVerge),
        category: CalculatorType.ROOF,
      });
    }

    // Hips
    if (hipLen > 0) {
      const costHip = hipLen * prices.hipM;
      totalCost += costHip;
      materials.push({
        id: "hip",
        name: "Arêtiers",
        quantity: round2(hipLen),
        quantityRaw: hipLen,
        unit: Unit.METER,
        unitPrice: round2(prices.hipM),
        totalPrice: round2(costHip),
        category: CalculatorType.ROOF,
      });
    }

    // Valleys
    const vLen = clamp(toNum(valleyLen, 0), 0, 10_000);
    if (vLen > 0) {
      const costValley = vLen * prices.valleyM;
      totalCost += costValley;
      materials.push({
        id: "valley",
        name: "Noues (zinguerie)",
        quantity: round2(vLen),
        quantityRaw: vLen,
        unit: Unit.METER,
        unitPrice: round2(prices.valleyM),
        totalPrice: round2(costValley),
        category: CalculatorType.ROOF,
      });
    }

    // Underlay screen
    if (useScreen && roofType !== "flat") {
      const screenArea = realArea * 1.1;
      const costScreen = screenArea * prices.screenM2;
      totalCost += costScreen;
      materials.push({
        id: "screen",
        name: "Écran sous-toiture (HPV)",
        quantity: Math.ceil(screenArea),
        quantityRaw: screenArea,
        unit: Unit.M2,
        unitPrice: round2(prices.screenM2),
        totalPrice: round2(costScreen),
        category: CalculatorType.ROOF,
      });

      // Counter-battens
      const cbLen = realArea * 1.5;
      const costCB = cbLen * prices.counterBattenM;
      totalCost += costCB;
      materials.push({
        id: "counter_batten",
        name: "Contre-lattage (ventilation)",
        quantity: Math.ceil(cbLen),
        quantityRaw: cbLen,
        unit: Unit.METER,
        unitPrice: round2(prices.counterBattenM),
        totalPrice: round2(costCB),
        category: CalculatorType.ROOF,
      });
    }

    // Insulation
    if (useInsulation) {
      const insulArea = realArea * 1.05;
      const costInsul = insulArea * prices.insulM2;
      totalCost += costInsul;
      materials.push({
        id: "insulation",
        name: `Isolation rampants (${insulThick}mm)`,
        quantity: Math.ceil(insulArea),
        quantityRaw: insulArea,
        unit: Unit.M2,
        unitPrice: round2(prices.insulM2),
        totalPrice: round2(costInsul),
        category: CalculatorType.ROOF,
      });

      if (useVapor) {
        const vaporArea = realArea * 1.05;
        const costVapor = vaporArea * prices.vaporM2;
        totalCost += costVapor;
        materials.push({
          id: "vapor",
          name: "Pare-vapeur / frein-vapeur",
          quantity: Math.ceil(vaporArea),
          quantityRaw: vaporArea,
          unit: Unit.M2,
          unitPrice: round2(prices.vaporM2),
          totalPrice: round2(costVapor),
          category: CalculatorType.ROOF,
        });
      }
    }

    // Rainwater (gutters only on eaves)
    if (eavesLen > 0) {
      const costGutter = eavesLen * prices.gutterM;
      totalCost += costGutter;
      materials.push({
        id: "gutter",
        name: `Gouttières (${gutterType.toUpperCase()})`,
        quantity: Math.ceil(eavesLen),
        quantityRaw: eavesLen,
        unit: Unit.METER,
        unitPrice: round2(prices.gutterM),
        totalPrice: round2(costGutter),
        category: CalculatorType.ROOF,
        details: "Crochets inclus (approx.)",
      });

      const ds = Math.max(0, Math.floor(downspouts));
      if (ds > 0) {
        const costDS = ds * prices.downspoutU;
        totalCost += costDS;
        materials.push({
          id: "downspouts",
          name: "Descentes EP + naissances",
          quantity: ds,
          unit: Unit.PIECE,
          unitPrice: round2(prices.downspoutU),
          totalPrice: round2(costDS),
          category: CalculatorType.ROOF,
        });
      }
    }

    // Labor
    if (proMode) {
      const costLabor = realArea * prices.laborM2;
      totalCost += costLabor;
      materials.push({
        id: "labor",
        name: "Main d'œuvre couverture",
        quantity: round2(realArea),
        quantityRaw: realArea,
        unit: Unit.M2,
        unitPrice: round2(prices.laborM2),
        totalPrice: round2(costLabor),
        category: CalculatorType.ROOF,
      });
    }

    // Warnings
    if (roofType !== "flat") {
      if (coverMaterial.startsWith("tile") && slopePct < 10) warnings.push("Pente faible (<10%) pour une couverture en tuiles.");
      if (coverMaterial === "zinc" && slopePct < 5) warnings.push("Zinc joint debout : pente très faible, vérifier prescriptions fabricant.");
    } else {
      if (coverMaterial !== "steel" && coverMaterial !== "zinc")
        warnings.push("Toit plat : bac acier/zinc/EPDM sont généralement plus adaptés qu'une tuile.");
    }

    return {
      ok: true,
      projectedArea,
      realArea,
      ridgeLen,
      eavesLen,
      vergeLen,
      hipLen,
      totalAreaWithWaste,
      materials,
      totalCost: round2(totalCost),
      warnings,
    };
  }, [
    roofType,
    dimL,
    dimW,
    overhang,
    slope,
    coverMaterial,
    wastePct,
    useScreen,
    useInsulation,
    insulThick,
    useVapor,
    gutterType,
    downspouts,
    valleyLen,
    prices,
    proMode,
  ]);

  // Pass results
  useEffect(() => {
    if (!calculationData.ok) return;

    onCalculate({
      summary: `${calculationData.realArea.toFixed(1)} m² de couverture`,
      details: [
        { label: "Surface au sol", value: calculationData.projectedArea.toFixed(1), unit: "m²" },
        { label: "Pente", value: slope, unit: "%" },
        { label: "Surface toiture", value: calculationData.realArea.toFixed(1), unit: "m²" },
        { label: "Faîtage", value: calculationData.ridgeLen.toFixed(1), unit: "m" },
        { label: "Égouts", value: calculationData.eavesLen.toFixed(1), unit: "m" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, slope]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Step Navigation */}
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
            {s === 2 && "2. Couvert."}
            {s === 3 && "3. Sous-c."}
            {s === 4 && "4. EP / Zinc"}
            {s === 5 && "5. Prix"}
          </button>
        ))}
      </div>

      {/* STEP 1: GEOMETRY */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez la forme du toit et les dimensions au sol (hors tout).
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type de toit</label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setRoofType("1pan")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  roofType === "1pan" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <Home size={18} className="mb-1" />1 pan
              </button>
              <button
                onClick={() => setRoofType("2pans")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  roofType === "2pans" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <Home size={18} className="mb-1" />2 pans
              </button>
              <button
                onClick={() => setRoofType("4pans")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  roofType === "4pans" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <Home size={18} className="mb-1" />4 pans
              </button>
              <button
                onClick={() => setRoofType("flat")}
                className={`p-2 rounded border text-xs font-bold flex flex-col items-center ${
                  roofType === "flat" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                <Layers size={18} className="mb-1" />
                plat
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Longueur (m)</label>
              <input
                type="number"
                value={dimL}
                onChange={(e) => setDimL(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
              <input
                type="number"
                value={dimW}
                onChange={(e) => setDimW(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Pente (%)</label>
              <input
                type="number"
                value={slope}
                onChange={(e) => setSlope(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Débord (cm)</label>
              <input
                type="number"
                value={overhang}
                onChange={(e) => setOverhang(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: COVERING */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Ruler size={16} className="mr-2 shrink-0 mt-0.5" />
            Choix de la couverture et pertes.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Matériau</label>
            <select
              value={coverMaterial}
              onChange={(e) => setCoverMaterial(e.target.value as any)}
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
            >
              <option value="tile_mech">Tuiles mécaniques</option>
              <option value="tile_flat">Tuiles plates</option>
              <option value="slate">Ardoises</option>
              <option value="steel">Bac acier</option>
              <option value="zinc">Zinc (joint debout)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Pertes (%)</label>
              <input
                type="number"
                value={wastePct}
                onChange={(e) => setWastePct(clamp(toNum(e.target.value, 10), 0, 40))}
                className="w-full p-2 border rounded bg-white text-slate-900"
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

      {/* STEP 3: UNDERLAYERS */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            Écran sous-toiture, isolation et pare-vapeur.
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <span className="text-sm font-bold text-slate-700">Écran sous-toiture (HPV)</span>
              <input
                type="checkbox"
                checked={useScreen}
                onChange={(e) => setUseScreen(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer">
              <span className="text-sm font-bold text-slate-700">Isolation rampants</span>
              <input
                type="checkbox"
                checked={useInsulation}
                onChange={(e) => setUseInsulation(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            {useInsulation && (
              <div className="bg-white border rounded-lg p-3 space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Épaisseur isolant (mm)</label>
                  <input
                    type="number"
                    value={insulThick}
                    onChange={(e) => setInsulThick(e.target.value)}
                    className="w-full p-2 text-sm border rounded bg-white text-slate-900"
                  />
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">Pare-vapeur / frein-vapeur</span>
                    <span className="text-[10px] text-slate-400">Ajouté si isolation activée</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useVapor}
                    onChange={(e) => setUseVapor(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </label>
              </div>
            )}
          </div>

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

      {/* STEP 4: EP / ZINC */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Droplets size={16} className="mr-2 shrink-0 mt-0.5" />
            Gouttières, descentes et noues.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Gouttières</label>
            <select
              value={gutterType}
              onChange={(e) => setGutterType(e.target.value as any)}
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
            >
              <option value="pvc">PVC</option>
              <option value="alu">Aluminium</option>
              <option value="zinc">Zinc</option>
              <option value="copper">Cuivre</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nb descentes</label>
              <input
                type="number"
                value={downspouts}
                onChange={(e) => setDownspouts(clamp(toNum(e.target.value, 0), 0, 20))}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Noues (ml)</label>
              <input
                type="number"
                value={valleyLen}
                onChange={(e) => setValleyLen(e.target.value)}
                className="w-full p-2 border rounded bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: PRICING */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustez les prix unitaires.
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
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Couverture (€/m²)</label>
                <input
                  type="number"
                  value={prices.coverM2}
                  onChange={(e) => updatePrice("coverM2", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Gouttière (€/m)</label>
                <input
                  type="number"
                  value={prices.gutterM}
                  onChange={(e) => updatePrice("gutterM", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Faîtage (€/m)</label>
                <input
                  type="number"
                  value={prices.ridgeM}
                  onChange={(e) => updatePrice("ridgeM", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Noues (€/m)</label>
                <input
                  type="number"
                  value={prices.valleyM}
                  onChange={(e) => updatePrice("valleyM", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>

              {useScreen && roofType !== "flat" && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Écran (€/m²)</label>
                  <input
                    type="number"
                    value={prices.screenM2}
                    onChange={(e) => updatePrice("screenM2", e.target.value)}
                    className="w-full p-2 border rounded bg-white text-sm"
                  />
                </div>
              )}

              {useInsulation && (
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">Isolant (€/m²)</label>
                  <input
                    type="number"
                    value={prices.insulM2}
                    onChange={(e) => updatePrice("insulM2", e.target.value)}
                    className="w-full p-2 border rounded bg-white text-sm"
                  />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Main d'œuvre (€/m²)</label>
                  <input
                    type="number"
                    value={prices.laborM2}
                    onChange={(e) => updatePrice("laborM2", e.target.value)}
                    className="w-full p-2 border border-blue-200 rounded bg-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              Retour
            </button>
            <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> Terminé
            </button>
          </div>
        </div>
      )}

      {/* Small warning display (optional) */}
      {calculationData.ok && calculationData.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-xs text-amber-800">
          <AlertTriangle size={16} className="mr-2 shrink-0" />
          <div className="space-y-1">
            {calculationData.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};