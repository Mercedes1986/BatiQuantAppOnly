import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES, getWallUnitPriceKey } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  Droplets,
  Info,
  ScanLine,
  ArrowRight,
  Settings,
  Check,
  CircleDollarSign,
} from "lucide-react";

import {
  WALL_BLOCK_SPECS,
  getWallBlockSpec,
  getSpecsByFamily,
  type WallBlockSpec,
} from "../../data/blockSpecs";

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

type WallFamily = WallBlockSpec["family"];
type WallMode = "masonry" | "concrete";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * ✅ MAJ (cohérente avec le reste de l’app)
 * - Prix: Override local (Step 4) > Catalogue (getUnitPrice) > DEFAULT_PRICES/fallback
 * - Chaque poste important expose un systemKey (quand possible)
 * - Delta MS et drain gèrent les clés “au rouleau” / “au rouleau 50m” avec conversion en €/m² ou €/m
 * - Calcul déplacé en useMemo + useEffect (évite les effets “qui recalculent tout” au changement de step)
 */
export const SubstructureCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1) Murs ---
  const [perimeter, setPerimeter] = useState<string>("");
  const [height, setHeight] = useState<string>("0.60"); // ~3 rangs
  const [openingsArea, setOpeningsArea] = useState<string>("");

  const [wallMode, setWallMode] = useState<WallMode>("masonry");
  const [wallFamily, setWallFamily] = useState<WallFamily>("parpaing");
  const [wallBlockId, setWallBlockId] = useState<string>("parpaing-20");

  // Béton banché
  const [wallThickness, setWallThickness] = useState("20"); // cm

  // Pertes
  const [wasteBlock, setWasteBlock] = useState(5);

  // Stepoc : fallback remplissage si spec n'a pas fillM3PerM2
  const [stepocFillRate, setStepocFillRate] = useState(140); // L/m² fallback

  // --- 2) Étanchéité ---
  const [percentBuried, setPercentBuried] = useState(100);
  const [useArase, setUseArase] = useState(true);
  const [useBitumen, setUseBitumen] = useState(true);
  const [bitumenLayers, setBitumenLayers] = useState(2);
  const [useDeltaMS, setUseDeltaMS] = useState(true);

  // --- 3) Drainage ---
  const [useDrain, setUseDrain] = useState(true);
  const [trenchWidth, setTrenchWidth] = useState("0.30"); // m
  const [gravelHeight, setGravelHeight] = useState("0.40"); // m
  const [useGeo, setUseGeo] = useState(true);
  const [manholes, setManholes] = useState(4);

  /**
   * Override local par clé (variante)
   * ex: BLOCK_20_UNIT, MORTAR_BAG_25KG, BPE_M3, DRAIN_PIPE_50M, DELTA_MS_ROLL_20M, etc.
   */
  const [unitOverrides, setUnitOverrides] = useState<Record<string, number>>({});

  // ✅ helper prix: Override > Catalogue > fallback
  const getP = (key: string, fallback: number) => {
    if (unitOverrides[key] !== undefined) return unitOverrides[key];
    const v = getUnitPrice(key);
    if (v && v !== 0) return v;
    return fallback;
  };

  const setOverride = (key: string, val: number) =>
    setUnitOverrides((prev) => ({ ...prev, [key]: val }));

  // --- Spec sélectionnée (maçonnerie) ---
  const selectedSpec = useMemo(() => {
    if (wallMode !== "masonry") return undefined;
    return getWallBlockSpec(wallBlockId) ?? WALL_BLOCK_SPECS[0];
  }, [wallMode, wallBlockId]);

  // --- Clé prix bloc active (selon variante) ---
  const activeBlockPriceKey = useMemo(() => {
    if (!selectedSpec) return null;
    try {
      return getWallUnitPriceKey(selectedSpec as any);
    } catch {
      return null;
    }
  }, [selectedSpec]);

  // Force un bloc valide quand on change de famille
  useEffect(() => {
    if (wallMode !== "masonry") return;
    const list = getSpecsByFamily(wallFamily);
    if (!list.length) return;

    const cur = getWallBlockSpec(wallBlockId);
    if (!cur || cur.family !== wallFamily) setWallBlockId(list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallFamily, wallMode]);

  // --- Constantes de clés "catalogue" + fallback ---
  const KEYS = useMemo(() => {
    return {
      CONCRETE: "BPE_M3",
      MORTAR: "MORTAR_BAG_25KG",
      GLUE: "GLUE_MORTAR_BAG_25KG",
      BITUMEN: "BITUMEN_COATING_BUCKET_25KG",
      // Delta MS: souvent un prix catalogue “au rouleau”
      DELTA_ROLL: "DELTA_MS_ROLL_20M", // couvre ~20m²
      DRAIN_ROLL: "DRAIN_PIPE_50M", // 50m
      GRAVEL_TON: "GRAVEL_FOUNDATION_TON",
      GEO_M2: "GEOTEXTILE_M2",
      MANHOLE: "MANHOLE_UNIT",
      // ces 2-là sont parfois “non-catalogue” dans certains projets => on garde local fallback
      ARASE_ROLL: "ARASE_ROLL_20M", // 20m (si non existant dans le catalogue => fallback)
      DELTA_PROFILE: "DELTA_PROFILE_UNIT",
    } as const;
  }, []);

  // --- CALC ENGINE ---
  const calculationData = useMemo(() => {
    const P = Math.max(0, toNum(perimeter, 0));
    const H = Math.max(0, toNum(height, 0));
    const deductions = Math.max(0, toNum(openingsArea, 0));

    const warnings: string[] = [];

    if (P <= 0 || H <= 0) {
      return {
        ok: false,
        totalCost: 0,
        materials: [] as any[],
        details: [] as any[],
        summary: "Soubassement",
        warnings: ["Renseignez un périmètre et une hauteur pour calculer."],
      };
    }

    const grossSurface = P * H;
    const netSurface = Math.max(0, grossSurface - deductions);
    const treatedSurface = netSurface * (Math.max(0, Math.min(100, percentBuried)) / 100);

    const materials: any[] = [];
    let totalCost = 0;

    // --- 1) Walls ---
    if (wallMode === "masonry" && selectedSpec) {
      const blocksRaw = netSurface * selectedSpec.unitsPerM2;
      const totalBlocks = Math.ceil(blocksRaw * (1 + Math.max(0, wasteBlock) / 100));

      const fallbackBlock =
        selectedSpec.family === "stepoc"
          ? Number((DEFAULT_PRICES as any).BLOCK_STEPOC_UNIT ?? 2.5)
          : Number((DEFAULT_PRICES as any).BLOCK_20_UNIT ?? 1.6);

      const blockKey =
        activeBlockPriceKey ??
        (selectedSpec.family === "stepoc" ? "BLOCK_STEPOC_UNIT" : "BLOCK_20_UNIT");

      const unitPriceBlock = getP(blockKey, fallbackBlock);
      const costBlocks = totalBlocks * unitPriceBlock;
      totalCost += costBlocks;

      materials.push({
        id: "blocks_sub",
        name: selectedSpec.label,
        quantity: totalBlocks,
        quantityRaw: totalBlocks,
        unit: Unit.PIECE,
        unitPrice: unitPriceBlock,
        totalPrice: round2(costBlocks),
        category: CalculatorType.SUBSTRUCTURE,
        details: `${selectedSpec.unitsPerM2.toFixed(2)} u/m² — ép. ${selectedSpec.thicknessCm}cm`,
        systemKey: blockKey,
      });

      // Mortier / colle
      const bagsPerM2 = selectedSpec.mortarKind === "mortier" ? 1 / 3 : 1 / 5;
      const bags = Math.max(0, Math.ceil(netSurface * bagsPerM2));

      const mortarKey = selectedSpec.mortarKind === "mortier" ? KEYS.MORTAR : KEYS.GLUE;
      const mortarFallback = Number((DEFAULT_PRICES as any).MORTAR_BAG_25KG ?? 8);
      const mortarUnitPrice = getP(mortarKey, mortarFallback);
      const costMortar = bags * mortarUnitPrice;
      totalCost += costMortar;

      materials.push({
        id: "mortar",
        name:
          selectedSpec.mortarKind === "mortier"
            ? "Mortier de montage (Sac 25kg)"
            : "Colle / Mortier-colle (Sac 25kg)",
        quantity: bags,
        quantityRaw: bags,
        unit: Unit.BAG,
        unitPrice: mortarUnitPrice,
        totalPrice: round2(costMortar),
        category: CalculatorType.SUBSTRUCTURE,
        details: selectedSpec.mortarKind === "mortier" ? "~1 sac / 3 m²" : "~1 sac / 5 m²",
        systemKey: mortarKey,
      });

      // Stepoc : béton de remplissage
      if (selectedSpec.family === "stepoc") {
        const fillM3PerM2 = selectedSpec.fillM3PerM2 ?? stepocFillRate / 1000;
        const volFill = netSurface * fillM3PerM2;

        const concFallback = Number((DEFAULT_PRICES as any).BPE_M3 ?? 130);
        const concUnit = getP(KEYS.CONCRETE, concFallback);
        const costFill = volFill * concUnit;
        totalCost += costFill;

        materials.push({
          id: "concrete_fill",
          name: "Béton de remplissage (Stepoc)",
          quantity: round2(volFill),
          quantityRaw: volFill,
          unit: Unit.M3,
          unitPrice: concUnit,
          totalPrice: round2(costFill),
          category: CalculatorType.SUBSTRUCTURE,
          details:
            selectedSpec.fillM3PerM2 != null
              ? `${(fillM3PerM2 * 1000).toFixed(0)} L/m² (catalogue)`
              : `${stepocFillRate} L/m² (override)`,
          systemKey: KEYS.CONCRETE,
        });
      }
    } else {
      // Mur béton banché
      const thM = (Math.max(0, toNum(wallThickness, 20)) || 20) / 100;
      const vol = netSurface * thM * 1.05;

      const concFallback = Number((DEFAULT_PRICES as any).BPE_M3 ?? 130);
      const concUnit = getP(KEYS.CONCRETE, concFallback);
      const costConc = vol * concUnit;
      totalCost += costConc;

      materials.push({
        id: "concrete_wall",
        name: `Béton Mur Banché (ép. ${wallThickness}cm)`,
        quantity: round2(vol),
        quantityRaw: vol,
        unit: Unit.M3,
        unitPrice: concUnit,
        totalPrice: round2(costConc),
        category: CalculatorType.SUBSTRUCTURE,
        systemKey: KEYS.CONCRETE,
      });
    }

    // --- 2) Waterproofing ---
    if (useArase) {
      // 1 rouleau ~20m (fallback local)
      const rolls = Math.max(1, Math.ceil(P / 20));
      const araseFallback = 15; // fallback UI
      const araseUnit = getP(KEYS.ARASE_ROLL, araseFallback);
      const costArase = rolls * araseUnit;
      totalCost += costArase;

      materials.push({
        id: "arase",
        name: "Arase étanche (bande)",
        quantity: rolls,
        quantityRaw: P,
        unit: Unit.ROLL,
        unitPrice: araseUnit,
        totalPrice: round2(costArase),
        category: CalculatorType.SUBSTRUCTURE,
        details: "≈ 1 rouleau / 20 m",
        systemKey: KEYS.ARASE_ROLL,
      });
    }

    if (useBitumen) {
      // ~0.5 kg/m² par couche, +10%
      const kgNeeded = treatedSurface * 0.5 * Math.max(1, bitumenLayers) * 1.1;
      const buckets = Math.ceil(kgNeeded / 25);

      const bitFallback = Number((DEFAULT_PRICES as any).BITUMEN_COATING_BUCKET_25KG ?? 55);
      const bitUnit = getP(KEYS.BITUMEN, bitFallback);
      const costBit = buckets * bitUnit;
      totalCost += costBit;

      materials.push({
        id: "bitumen",
        name: `Enduit bitumineux (${bitumenLayers} couche${bitumenLayers > 1 ? "s" : ""})`,
        quantity: buckets,
        quantityRaw: kgNeeded,
        unit: Unit.BUCKET,
        unitPrice: bitUnit,
        totalPrice: round2(costBit),
        category: CalculatorType.SUBSTRUCTURE,
        details: `${kgNeeded.toFixed(1)} kg sur ${treatedSurface.toFixed(1)} m²`,
        systemKey: KEYS.BITUMEN,
      });
    }

    if (useDeltaMS) {
      const areaDelta = treatedSurface * 1.15;

      // Delta: prix au rouleau 20m² -> €/m²
      const rollFallback = Number((DEFAULT_PRICES as any).DELTA_MS_ROLL_20M ?? 120);
      const rollUnit = getP(KEYS.DELTA_ROLL, rollFallback);
      const deltaM2 = rollUnit / 20;

      const costDelta = areaDelta * deltaM2;
      totalCost += costDelta;

      materials.push({
        id: "deltams",
        name: "Protection Delta MS",
        quantity: round2(areaDelta),
        quantityRaw: areaDelta,
        unit: Unit.M2,
        unitPrice: round2(deltaM2),
        totalPrice: round2(costDelta),
        category: CalculatorType.SUBSTRUCTURE,
        details: "≈ +15% recouvrement",
        systemKey: KEYS.DELTA_ROLL,
      });

      // Profilés: fallback local / unité
      const profiles = Math.ceil(P / 2);
      const profFallback = 8;
      const profUnit = getP(KEYS.DELTA_PROFILE, profFallback);
      const costProf = profiles * profUnit;
      totalCost += costProf;

      materials.push({
        id: "delta_profile",
        name: "Profilé de finition Delta",
        quantity: profiles,
        quantityRaw: P,
        unit: Unit.PIECE,
        unitPrice: profUnit,
        totalPrice: round2(costProf),
        category: CalculatorType.SUBSTRUCTURE,
        systemKey: KEYS.DELTA_PROFILE,
      });
    }

    // --- 3) Drainage ---
    if (useDrain) {
      const len = P * 1.05;

      // Drain: prix au rouleau 50m -> €/m
      const drainRollFallback = Number((DEFAULT_PRICES as any).DRAIN_PIPE_50M ?? 70);
      const drainRoll = getP(KEYS.DRAIN_ROLL, drainRollFallback);
      const drainM = drainRoll / 50;

      const costDrain = len * drainM;
      totalCost += costDrain;

      materials.push({
        id: "drain_pipe",
        name: "Drain agricole Ø100",
        quantity: Math.ceil(len),
        quantityRaw: len,
        unit: Unit.METER,
        unitPrice: round2(drainM),
        totalPrice: round2(costDrain),
        category: CalculatorType.SUBSTRUCTURE,
        systemKey: KEYS.DRAIN_ROLL,
      });

      // Gravier drainant
      const w = Math.max(0, toNum(trenchWidth, 0.3));
      const h = Math.max(0, toNum(gravelHeight, 0.4));
      const volGrav = P * w * h;
      const tonsGrav = volGrav * 1.5;

      const gravFallback = Number((DEFAULT_PRICES as any).GRAVEL_FOUNDATION_TON ?? 45);
      const gravUnit = getP(KEYS.GRAVEL_TON, gravFallback);

      const costGrav = tonsGrav * gravUnit;
      totalCost += costGrav;

      materials.push({
        id: "gravel_drain",
        name: "Gravier drainant",
        quantity: round2(tonsGrav),
        quantityRaw: volGrav,
        unit: Unit.TON,
        unitPrice: gravUnit,
        totalPrice: round2(costGrav),
        category: CalculatorType.SUBSTRUCTURE,
        details: `Vol: ${volGrav.toFixed(2)} m³`,
        systemKey: KEYS.GRAVEL_TON,
      });

      // Géotextile
      if (useGeo) {
        const linearW = w + 2 * h + 0.3; // enveloppe
        const areaGeo = P * linearW;

        const geoFallback = Number((DEFAULT_PRICES as any).GEOTEXTILE_M2 ?? 1.2);
        const geoUnit = getP(KEYS.GEO_M2, geoFallback);

        const costGeo = areaGeo * geoUnit;
        totalCost += costGeo;

        materials.push({
          id: "geo_drain",
          name: "Géotextile (enrobage drain)",
          quantity: Math.ceil(areaGeo),
          quantityRaw: areaGeo,
          unit: Unit.M2,
          unitPrice: geoUnit,
          totalPrice: round2(costGeo),
          category: CalculatorType.SUBSTRUCTURE,
          systemKey: KEYS.GEO_M2,
        });
      }

      // Regards
      if (manholes > 0) {
        const manFallback = 45;
        const manUnit = getP(KEYS.MANHOLE, manFallback);
        const costMan = manholes * manUnit;
        totalCost += costMan;

        materials.push({
          id: "manhole",
          name: "Regards de visite",
          quantity: manholes,
          quantityRaw: manholes,
          unit: Unit.PIECE,
          unitPrice: manUnit,
          totalPrice: round2(costMan),
          category: CalculatorType.SUBSTRUCTURE,
          systemKey: KEYS.MANHOLE,
        });
      }
    }

    // --- Details / warnings ---
    const details: any[] = [
      { label: "Périmètre", value: P.toFixed(1), unit: "m" },
      { label: "Hauteur", value: H.toFixed(2), unit: "m" },
      { label: "Surface mur (nette)", value: netSurface.toFixed(1), unit: "m²" },
      { label: "Surface traitée", value: treatedSurface.toFixed(1), unit: "m²" },
    ];

    if (wallMode === "masonry" && selectedSpec) {
      details.push({ label: "Bloc", value: selectedSpec.label, unit: "" });
      details.push({ label: "Consommation", value: selectedSpec.unitsPerM2.toFixed(2), unit: "u/m²" });
    } else {
      details.push({ label: "Mur", value: "Béton banché", unit: "" });
      details.push({ label: "Épaisseur", value: `${toNum(wallThickness, 20).toFixed(0)}`, unit: "cm" });
    }

    if (deductions > 0 && deductions > grossSurface) warnings.push("Les déductions dépassent la surface brute (vérifiez les valeurs).");

    return {
      ok: true,
      summary: `${netSurface.toFixed(1)} m² de soubassement`,
      totalCost: round2(totalCost),
      materials,
      details,
      warnings,
    };
  }, [
    perimeter,
    height,
    openingsArea,
    percentBuried,
    wallMode,
    selectedSpec,
    wallThickness,
    wasteBlock,
    stepocFillRate,
    useArase,
    useBitumen,
    bitumenLayers,
    useDeltaMS,
    useDrain,
    trenchWidth,
    gravelHeight,
    useGeo,
    manholes,
    unitOverrides,
    activeBlockPriceKey,
    KEYS,
  ]);

  useEffect(() => {
    onCalculate({
      summary: calculationData.summary,
      details: calculationData.details,
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings?.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate]);

  // --- UI helpers for Step 4 ---
  const priceInput = (
    label: string,
    key: string,
    value: number,
    hint?: string,
    disabled?: boolean
  ) => (
    <div>
      <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
        {label}
      </label>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => setOverride(key, toNum(e.target.value, 0))}
        className={`w-full p-2 border rounded bg-white text-sm ${disabled ? "opacity-60" : ""}`}
      />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Step Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Murs"}
            {s === 2 && "2. Étanche."}
            {s === 3 && "3. Drain."}
            {s === 4 && "4. Coûts"}
          </button>
        ))}
      </div>

      {/* STEP 1: WALLS */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez le périmètre et la hauteur des murs de soubassement.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Périmètre (m)</label>
              <input
                type="number"
                value={perimeter}
                onChange={(e) => setPerimeter(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur (m)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type de mur</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setWallMode("masonry")}
                className={`p-2 rounded border text-xs font-medium ${
                  wallMode === "masonry"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                Maçonnerie (blocs)
              </button>
              <button
                onClick={() => setWallMode("concrete")}
                className={`p-2 rounded border text-xs font-medium ${
                  wallMode === "concrete"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                Béton banché
              </button>
            </div>
          </div>

          {wallMode === "masonry" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Famille</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["parpaing", "brique", "cellulaire", "stepoc"] as const).map((fam) => (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setWallFamily(fam)}
                      className={`p-2 rounded border text-xs font-medium ${
                        wallFamily === fam
                          ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {fam === "parpaing" && "Parpaing"}
                      {fam === "brique" && "Brique"}
                      {fam === "cellulaire" && "Béton cellulaire"}
                      {fam === "stepoc" && "Bloc à bancher"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Format / Épaisseur</label>
                <select
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  value={wallBlockId}
                  onChange={(e) => setWallBlockId(e.target.value)}
                >
                  {getSpecsByFamily(wallFamily).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — {s.unitsPerM2.toFixed(2)} u/m²
                    </option>
                  ))}
                </select>

                {selectedSpec && (
                  <p className="text-xs text-slate-500 mt-1">
                    Épaisseur : <b>{selectedSpec.thicknessCm}cm</b> • Conso :{" "}
                    <b>{selectedSpec.unitsPerM2.toFixed(2)} u/m²</b>
                  </p>
                )}
              </div>
            </div>
          )}

          {wallMode === "concrete" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Épaisseur (cm)</label>
              <input
                type="number"
                value={wallThickness}
                onChange={(e) => setWallThickness(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <button
              onClick={() => setProMode(!proMode)}
              className="flex items-center text-xs font-bold text-slate-500 mb-2 uppercase"
            >
              <Settings size={12} className="mr-1" /> Options avancées
            </button>

            {proMode ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Déductions (m²)</label>
                  <input
                    type="number"
                    value={openingsArea}
                    onChange={(e) => setOpeningsArea(e.target.value)}
                    className="w-full p-1.5 text-sm border rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Pertes (%)</label>
                  <input
                    type="number"
                    value={wasteBlock}
                    onChange={(e) => setWasteBlock(Number(e.target.value))}
                    className="w-full p-1.5 text-sm border rounded bg-white"
                  />
                </div>

                {wallMode === "masonry" && selectedSpec?.family === "stepoc" && (
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 uppercase">
                      Remplissage Stepoc (L/m²) — override
                    </label>
                    <input
                      type="number"
                      value={stepocFillRate}
                      onChange={(e) => setStepocFillRate(Number(e.target.value))}
                      className="w-full p-1.5 text-sm border rounded bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Si la spec catalogue définit déjà un volume béton/m², elle est prioritaire.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Cliquez pour ajuster pertes, ouvertures, Stepoc…</p>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center"
          >
            Suivant <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: WATERPROOFING */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Droplets size={16} className="mr-2 shrink-0 mt-0.5" />
            Protection des murs contre l’humidité (murs enterrés).
          </div>

          <div className="space-y-3">
            <label className="block">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Surface enterrée</span>
                <span className="text-xs font-bold text-blue-600">{percentBuried}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="10"
                value={percentBuried}
                onChange={(e) => setPercentBuried(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <div>
                <span className="text-sm font-bold text-slate-700">Arase étanche</span>
                <p className="text-xs text-slate-400">Rupture de capillarité</p>
              </div>
              <input
                type="checkbox"
                checked={useArase}
                onChange={(e) => setUseArase(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <div>
                <span className="text-sm font-bold text-slate-700">Enduit bitumineux</span>
                <p className="text-xs text-slate-400">Imperméabilisation extérieure</p>
              </div>
              <input
                type="checkbox"
                checked={useBitumen}
                onChange={(e) => setUseBitumen(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>

            {useBitumen && (
              <div className="pl-4 flex items-center space-x-2">
                <span className="text-xs text-slate-500">Couches :</span>
                <div className="flex bg-slate-100 rounded p-0.5">
                  <button
                    onClick={() => setBitumenLayers(1)}
                    className={`px-2 py-0.5 text-xs rounded ${
                      bitumenLayers === 1 ? "bg-white shadow font-bold" : ""
                    }`}
                  >
                    1
                  </button>
                  <button
                    onClick={() => setBitumenLayers(2)}
                    className={`px-2 py-0.5 text-xs rounded ${
                      bitumenLayers === 2 ? "bg-white shadow font-bold" : ""
                    }`}
                  >
                    2
                  </button>
                </div>
              </div>
            )}

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <div>
                <span className="text-sm font-bold text-slate-700">Delta MS</span>
                <p className="text-xs text-slate-400">Protection mécanique</p>
              </div>
              <input
                type="checkbox"
                checked={useDeltaMS}
                onChange={(e) => setUseDeltaMS(e.target.checked)}
                className="h-5 w-5 text-blue-600 rounded"
              />
            </label>
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

      {/* STEP 3: DRAINAGE */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <ScanLine size={16} className="mr-2 shrink-0 mt-0.5" />
            Drainage périphérique (drain + gravier + géotextile).
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-slate-800">Installer un drain ?</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useDrain}
                onChange={(e) => setUseDrain(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {useDrain && (
            <div className="space-y-4 animate-in slide-in-from-right-2">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Tranchée drainante</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Largeur (m)</label>
                    <input
                      type="number"
                      value={trenchWidth}
                      onChange={(e) => setTrenchWidth(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Hauteur gravier (m)</label>
                    <input
                      type="number"
                      value={gravelHeight}
                      onChange={(e) => setGravelHeight(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center justify-between p-3 border rounded bg-white">
                <span className="text-sm font-medium">Géotextile</span>
                <input
                  type="checkbox"
                  checked={useGeo}
                  onChange={(e) => setUseGeo(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <div className="flex items-center justify-between p-3 border rounded bg-white">
                <span className="text-sm font-medium">Regards de visite</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setManholes(Math.max(0, manholes - 1))}
                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="w-4 text-center font-bold text-sm">{manholes}</span>
                  <button
                    onClick={() => setManholes(manholes + 1)}
                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
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

      {/* STEP 4: COSTS */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Overrides locaux (prioritaires sur le catalogue) pour ce calcul.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Prix unitaires</h4>
              <button onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? "Mode Pro" : "Mode Simple"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Bloc selon variante */}
              {wallMode === "masonry" && selectedSpec && (
                <div className="col-span-2">
                  {(() => {
                    const fallbackBlock =
                      selectedSpec.family === "stepoc"
                        ? Number((DEFAULT_PRICES as any).BLOCK_STEPOC_UNIT ?? 2.5)
                        : Number((DEFAULT_PRICES as any).BLOCK_20_UNIT ?? 1.6);

                    const blockKey =
                      activeBlockPriceKey ??
                      (selectedSpec.family === "stepoc" ? "BLOCK_STEPOC_UNIT" : "BLOCK_20_UNIT");

                    const v = getP(blockKey, fallbackBlock);
                    return priceInput(
                      `Bloc (€/u) — ${selectedSpec.label}`,
                      blockKey,
                      v,
                      `Clé: ${blockKey}`
                    );
                  })()}
                </div>
              )}

              {/* Béton */}
              {(() => {
                const v = getP(KEYS.CONCRETE, Number((DEFAULT_PRICES as any).BPE_M3 ?? 130));
                return priceInput("Béton (€/m³)", KEYS.CONCRETE, v, `Clé: ${KEYS.CONCRETE}`);
              })()}

              {/* Mortier/colle */}
              {wallMode === "masonry" && (
                <>
                  {(() => {
                    const v = getP(KEYS.MORTAR, Number((DEFAULT_PRICES as any).MORTAR_BAG_25KG ?? 8));
                    return priceInput("Mortier (€/sac 25kg)", KEYS.MORTAR, v, `Clé: ${KEYS.MORTAR}`);
                  })()}
                  {(() => {
                    const v = getP(KEYS.GLUE, Number((DEFAULT_PRICES as any).MORTAR_BAG_25KG ?? 8));
                    return priceInput("Colle (€/sac 25kg)", KEYS.GLUE, v, `Clé: ${KEYS.GLUE}`);
                  })()}
                </>
              )}

              {/* Étanchéité */}
              {useBitumen &&
                (() => {
                  const v = getP(KEYS.BITUMEN, Number((DEFAULT_PRICES as any).BITUMEN_COATING_BUCKET_25KG ?? 55));
                  return priceInput("Bitume (€/seau 25kg)", KEYS.BITUMEN, v, `Clé: ${KEYS.BITUMEN}`);
                })()}

              {useDeltaMS &&
                (() => {
                  const v = getP(KEYS.DELTA_ROLL, Number((DEFAULT_PRICES as any).DELTA_MS_ROLL_20M ?? 120));
                  return priceInput("Delta MS (€/rouleau ~20m²)", KEYS.DELTA_ROLL, v, `Clé: ${KEYS.DELTA_ROLL}`);
                })()}

              {useDeltaMS && priceInput("Profilé Delta (€/u)", KEYS.DELTA_PROFILE, getP(KEYS.DELTA_PROFILE, 8), "fallback local")}

              {/* Drainage */}
              {useDrain &&
                (() => {
                  const v = getP(KEYS.DRAIN_ROLL, Number((DEFAULT_PRICES as any).DRAIN_PIPE_50M ?? 70));
                  return priceInput("Drain (€/rouleau 50m)", KEYS.DRAIN_ROLL, v, `Clé: ${KEYS.DRAIN_ROLL}`);
                })()}

              {useDrain &&
                (() => {
                  const v = getP(KEYS.GRAVEL_TON, Number((DEFAULT_PRICES as any).GRAVEL_FOUNDATION_TON ?? 45));
                  return priceInput("Gravier (€/T)", KEYS.GRAVEL_TON, v, `Clé: ${KEYS.GRAVEL_TON}`);
                })()}

              {useDrain && useGeo &&
                (() => {
                  const v = getP(KEYS.GEO_M2, Number((DEFAULT_PRICES as any).GEOTEXTILE_M2 ?? 1.2));
                  return priceInput("Géotextile (€/m²)", KEYS.GEO_M2, v, `Clé: ${KEYS.GEO_M2}`);
                })()}

              {useDrain &&
                (() => {
                  const v = getP(KEYS.MANHOLE, 45);
                  return priceInput("Regard (€/u)", KEYS.MANHOLE, v, `Clé: ${KEYS.MANHOLE} (fallback 45)`);
                })()}

              {/* Arase */}
              {useArase && priceInput("Arase (€/rouleau 20m)", KEYS.ARASE_ROLL, getP(KEYS.ARASE_ROLL, 15), "fallback local")}
            </div>
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