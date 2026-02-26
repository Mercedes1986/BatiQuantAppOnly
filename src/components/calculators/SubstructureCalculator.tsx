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

/**
 * ✅ MAJ (SAFE) :
 * - Les prix suivent Matériaux & Prix (catalogue) via getUnitPrice(key)
 * - Override local (écran “Coûts”) > Catalogue > Fallback DEFAULT_PRICES
 * - Les blocs suivent la variante sélectionnée via getWallUnitPriceKey(spec)
 * - Ajout systemKey sur les postes importants (bloc, mortier/colle, béton, etc.)
 */
export const SubstructureCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Murs ---
  const [perimeter, setPerimeter] = useState<string>("");
  const [height, setHeight] = useState<string>("0.60"); // 3 rangs
  const [openingsArea, setOpeningsArea] = useState<string>("");

  const [wallMode, setWallMode] = useState<WallMode>("masonry");

  const [wallFamily, setWallFamily] = useState<WallFamily>("parpaing");
  const [wallBlockId, setWallBlockId] = useState<string>("parpaing-20");

  // Béton banché
  const [wallThickness, setWallThickness] = useState("20"); // cm

  // Pertes
  const [wasteBlock, setWasteBlock] = useState(5);

  // Stepoc : override remplissage si le catalogue n'a pas fillM3PerM2
  const [stepocFillRate, setStepocFillRate] = useState(140); // L/m² fallback

  // --- 2. Étanchéité ---
  const [percentBuried, setPercentBuried] = useState(100);
  const [useArase, setUseArase] = useState(true);
  const [useBitumen, setUseBitumen] = useState(true);
  const [bitumenLayers, setBitumenLayers] = useState(2);
  const [useDeltaMS, setUseDeltaMS] = useState(true);

  // --- 3. Drainage ---
  const [useDrain, setUseDrain] = useState(true);
  const [trenchWidth, setTrenchWidth] = useState("0.30");
  const [gravelHeight, setGravelHeight] = useState("0.40");
  const [useGeo, setUseGeo] = useState(true);
  const [manholes, setManholes] = useState(4);

  /**
   * ✅ Override local par clé (variante)
   * ex: BLOCK_15_UNIT, BLOCK_STEPOC_25_UNIT, MORTAR_BAG_25KG, etc.
   */
  const [unitOverrides, setUnitOverrides] = useState<Record<string, number>>(
    {}
  );

  // ✅ Helper prix: Override > Catalogue > Fallback
  const getUnit = (key: string, fallback: number) => {
    if (unitOverrides[key] !== undefined) return unitOverrides[key];
    const v = getUnitPrice(key);
    if (v && v !== 0) return v;
    return fallback;
  };

  const setUnit = (key: string, val: number) =>
    setUnitOverrides((prev) => ({ ...prev, [key]: val }));

  // --- Prix UI (fallbacks + édition locale sur l'écran “Coûts”) ---
  // Note: le CALCUL utilise getUnit(key, fallback) => donc suit le catalogue.
  const [prices, setPrices] = useState({
    concrete: Number(DEFAULT_PRICES.BPE_M3),
    mortarBag: Number(DEFAULT_PRICES.MORTAR_BAG_25KG),
    bitumenBucket: Number(DEFAULT_PRICES.BITUMEN_COATING_BUCKET_25KG),
    deltaM2: Number(DEFAULT_PRICES.DELTA_MS_ROLL_20M) / 20, // €/m²
    drainM: Number(DEFAULT_PRICES.DRAIN_PIPE_50M) / 50, // €/m
    gravelTon: Number(DEFAULT_PRICES.GRAVEL_FOUNDATION_TON),
    geoM2: Number(DEFAULT_PRICES.GEOTEXTILE_M2),
    manhole: 45,
    // petits forfaits internes
    araseRoll: 15,
    deltaProfile: 8,
  });

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // Spec sélectionnée (si masonry)
  const selectedSpec = useMemo(() => {
    if (wallMode !== "masonry") return undefined;
    return getWallBlockSpec(wallBlockId) ?? WALL_BLOCK_SPECS[0];
  }, [wallMode, wallBlockId]);

  // Clé prix bloc active (selon famille/épaisseur)
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

  // --- CALC ---
  useEffect(() => {
    const P = parseFloat(perimeter) || 0;
    const H = parseFloat(height) || 0;
    const deductions = parseFloat(openingsArea) || 0;

    if (P <= 0 || H <= 0) return;

    const grossSurface = P * H;
    const netSurface = Math.max(0, grossSurface - deductions);
    const treatedSurface = netSurface * (percentBuried / 100);

    const materials: any[] = [];
    let totalCost = 0;
    const details: any[] = [];

    // --- 1. Walls ---
    if (wallMode === "masonry" && selectedSpec) {
      const blocks = netSurface * selectedSpec.unitsPerM2;
      const totalBlocks = Math.ceil(blocks * (1 + wasteBlock / 100));

      // ✅ Prix bloc selon variante (clé prix)
      const fallbackUnitPrice =
        selectedSpec.family === "stepoc"
          ? Number(DEFAULT_PRICES.BLOCK_STEPOC_UNIT)
          : Number(DEFAULT_PRICES.BLOCK_20_UNIT);

      const priceKey =
        activeBlockPriceKey ??
        (selectedSpec.family === "stepoc" ? "BLOCK_STEPOC_UNIT" : "BLOCK_20_UNIT");

      const unitPriceBlock = getUnit(priceKey, fallbackUnitPrice);

      const costBlocks = totalBlocks * unitPriceBlock;
      totalCost += costBlocks;

      materials.push({
        id: "blocks_sub",
        name: selectedSpec.label,
        quantity: totalBlocks,
        quantityRaw: totalBlocks,
        unit: Unit.PIECE,
        unitPrice: unitPriceBlock,
        totalPrice: parseFloat(costBlocks.toFixed(2)),
        category: CalculatorType.SUBSTRUCTURE,
        details: `${selectedSpec.unitsPerM2.toFixed(2)} u/m² — ép. ${selectedSpec.thicknessCm}cm`,
        systemKey: priceKey,
      });

      // Mortier / colle
      const bagsPerM2 =
        selectedSpec.mortarKind === "mortier" ? 1 / 3 : 1 / 5; // colle ~1 sac/5m²
      const bags = Math.max(0, Math.ceil(netSurface * bagsPerM2));

      const mortarKey =
        selectedSpec.mortarKind === "mortier"
          ? "MORTAR_BAG_25KG"
          : "GLUE_MORTAR_BAG_25KG";

      // ✅ suit Matériaux & Prix (ou override local) automatiquement
      const mortarUnitPrice = getUnit(mortarKey, prices.mortarBag);

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
        totalPrice: parseFloat(costMortar.toFixed(2)),
        category: CalculatorType.SUBSTRUCTURE,
        details:
          selectedSpec.mortarKind === "mortier"
            ? "~1 sac / 3 m²"
            : "~1 sac / 5 m²",
        systemKey: mortarKey,
      });

      // Stepoc : béton de remplissage
      if (selectedSpec.family === "stepoc") {
        const fillM3PerM2 = selectedSpec.fillM3PerM2 ?? stepocFillRate / 1000;
        const volFill = netSurface * fillM3PerM2;

        const concreteKey = "BPE_M3";
        const concreteUnit = getUnit(concreteKey, prices.concrete);

        const costFill = volFill * concreteUnit;
        totalCost += costFill;

        materials.push({
          id: "concrete_fill",
          name: "Béton de remplissage",
          quantity: parseFloat(volFill.toFixed(2)),
          quantityRaw: volFill,
          unit: Unit.M3,
          unitPrice: concreteUnit,
          totalPrice: parseFloat(costFill.toFixed(2)),
          category: CalculatorType.SUBSTRUCTURE,
          details:
            selectedSpec.fillM3PerM2 != null
              ? `${(fillM3PerM2 * 1000).toFixed(0)} L/m² (catalogue)`
              : `${stepocFillRate} L/m² (override)`,
          systemKey: concreteKey,
        });
      }
    } else {
      // Concrete wall
      const thM = (parseFloat(wallThickness) || 20) / 100;
      const vol = netSurface * thM * 1.05;

      const concreteKey = "BPE_M3";
      const concreteUnit = getUnit(concreteKey, prices.concrete);

      const costConc = vol * concreteUnit;
      totalCost += costConc;

      materials.push({
        id: "concrete_wall",
        name: `Béton Mur Banché (ép. ${wallThickness}cm)`,
        quantity: parseFloat(vol.toFixed(2)),
        quantityRaw: vol,
        unit: Unit.M3,
        unitPrice: concreteUnit,
        totalPrice: parseFloat(costConc.toFixed(2)),
        category: CalculatorType.SUBSTRUCTURE,
        systemKey: concreteKey,
      });
    }

    // --- 2. Waterproofing ---
    if (useArase) {
      const rolls = Math.ceil(P / 20);
      const costArase = rolls * prices.araseRoll;
      totalCost += costArase;
      materials.push({
        id: "arase",
        name: "Arase Étanche (Bande)",
        quantity: rolls,
        quantityRaw: P,
        unit: Unit.PIECE,
        unitPrice: prices.araseRoll,
        totalPrice: costArase,
        category: CalculatorType.SUBSTRUCTURE,
      });
    }

    if (useBitumen) {
      const kgNeeded = treatedSurface * 0.5 * bitumenLayers * 1.1;
      const buckets = Math.ceil(kgNeeded / 25);

      const bitumenKey = "BITUMEN_COATING_BUCKET_25KG";
      const bitumenUnit = getUnit(bitumenKey, prices.bitumenBucket);

      const costBit = buckets * bitumenUnit;
      totalCost += costBit;

      materials.push({
        id: "bitumen",
        name: `Enduit Bitumineux (${bitumenLayers} couches)`,
        quantity: buckets,
        quantityRaw: kgNeeded,
        unit: Unit.BUCKET,
        unitPrice: bitumenUnit,
        totalPrice: parseFloat(costBit.toFixed(2)),
        category: CalculatorType.SUBSTRUCTURE,
        details: `${kgNeeded.toFixed(1)}kg sur ${treatedSurface.toFixed(1)}m²`,
        systemKey: bitumenKey,
      });
    }

    if (useDeltaMS) {
      const areaDelta = treatedSurface * 1.15;
      const costDelta = areaDelta * prices.deltaM2;
      totalCost += costDelta;

      materials.push({
        id: "deltams",
        name: "Protection Delta MS",
        quantity: parseFloat(areaDelta.toFixed(1)),
        quantityRaw: areaDelta,
        unit: Unit.M2,
        unitPrice: prices.deltaM2,
        totalPrice: parseFloat(costDelta.toFixed(2)),
        category: CalculatorType.SUBSTRUCTURE,
      });

      const profiles = Math.ceil(P / 2);
      const costProf = profiles * prices.deltaProfile;
      totalCost += costProf;

      materials.push({
        id: "delta_profile",
        name: "Profilé de finition",
        quantity: profiles,
        quantityRaw: P,
        unit: Unit.PIECE,
        unitPrice: prices.deltaProfile,
        totalPrice: costProf,
        category: CalculatorType.SUBSTRUCTURE,
      });
    }

    // --- 3. Drainage ---
    if (useDrain) {
      const len = P * 1.05;
      const costDrain = len * prices.drainM;
      totalCost += costDrain;

      materials.push({
        id: "drain_pipe",
        name: "Drain Agricole Ø100",
        quantity: Math.ceil(len),
        quantityRaw: len,
        unit: Unit.METER,
        unitPrice: prices.drainM,
        totalPrice: parseFloat(costDrain.toFixed(2)),
        category: CalculatorType.SUBSTRUCTURE,
      });

      const w = parseFloat(trenchWidth) || 0.3;
      const h = parseFloat(gravelHeight) || 0.4;
      const volGrav = P * w * h;
      const tonsGrav = volGrav * 1.5;
      const costGrav = tonsGrav * prices.gravelTon;
      totalCost += costGrav;

      materials.push({
        id: "gravel_drain",
        name: "Gravier Drainant",
        quantity: parseFloat(tonsGrav.toFixed(1)),
        quantityRaw: volGrav,
        unit: Unit.TON,
        unitPrice: prices.gravelTon,
        totalPrice: parseFloat(costGrav.toFixed(2)),
        category: CalculatorType.SUBSTRUCTURE,
        details: `Vol: ${volGrav.toFixed(2)}m³`,
      });

      if (useGeo) {
        const linearW = w + 2 * h + 0.3;
        const areaGeo = P * linearW;
        const costGeo = areaGeo * prices.geoM2;
        totalCost += costGeo;

        materials.push({
          id: "geo_drain",
          name: "Géotextile (Enrobage)",
          quantity: Math.ceil(areaGeo),
          quantityRaw: areaGeo,
          unit: Unit.M2,
          unitPrice: prices.geoM2,
          totalPrice: parseFloat(costGeo.toFixed(2)),
          category: CalculatorType.SUBSTRUCTURE,
        });
      }

      if (manholes > 0) {
        const costMan = manholes * prices.manhole;
        totalCost += costMan;

        materials.push({
          id: "manhole",
          name: "Regards de visite (Angles)",
          quantity: manholes,
          quantityRaw: manholes,
          unit: Unit.PIECE,
          unitPrice: prices.manhole,
          totalPrice: costMan,
          category: CalculatorType.SUBSTRUCTURE,
        });
      }
    }

    details.push({ label: "Périmètre", value: P, unit: "m" });
    details.push({ label: "Hauteur", value: H, unit: "m" });
    details.push({
      label: "Surface Mur (nette)",
      value: netSurface.toFixed(1),
      unit: "m²",
    });

    if (wallMode === "masonry" && selectedSpec) {
      details.push({ label: "Bloc", value: selectedSpec.label, unit: "" });
      details.push({
        label: "Consommation",
        value: selectedSpec.unitsPerM2.toFixed(2),
        unit: "u/m²",
      });
    } else {
      details.push({ label: "Mur", value: "Béton banché", unit: "" });
      details.push({ label: "Épaisseur", value: wallThickness, unit: "cm" });
    }

    onCalculate({
      summary: `${netSurface.toFixed(1)} m² de soubassement`,
      details,
      materials,
      totalCost: parseFloat(totalCost.toFixed(2)),
    });
  }, [
    step,
    perimeter,
    height,
    openingsArea,
    wallMode,
    wallFamily,
    wallBlockId,
    wallThickness,
    wasteBlock,
    stepocFillRate,
    useArase,
    useBitumen,
    bitumenLayers,
    useDeltaMS,
    percentBuried,
    useDrain,
    trenchWidth,
    gravelHeight,
    useGeo,
    manholes,
    prices,
    unitOverrides,
    selectedSpec,
    activeBlockPriceKey,
    onCalculate,
  ]);

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

      {/* --- STEP 1: WALLS --- */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            Définissez le périmètre et la hauteur des murs de soubassement (vide
            sanitaire ou sous-sol).
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Périmètre (m)
              </label>
              <input
                type="number"
                value={perimeter}
                onChange={(e) => setPerimeter(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Hauteur (m)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
          </div>

          {/* Mode mur */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type de mur
            </label>
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

          {/* Catalogue blocs */}
          {wallMode === "masonry" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Famille
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["parpaing", "brique", "cellulaire", "stepoc"] as const).map(
                    (fam) => (
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
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Format / Épaisseur
                </label>
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

          {/* Béton banché : épaisseur */}
          {wallMode === "concrete" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Épaisseur (cm)
              </label>
              <input
                type="number"
                value={wallThickness}
                onChange={(e) => setWallThickness(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
          )}

          {/* Advanced Options */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <button
              onClick={() => setProMode(!proMode)}
              className="flex items-center text-xs font-bold text-slate-500 mb-2 uppercase"
            >
              <Settings size={12} className="mr-1" /> Options Avancées
            </button>

            {proMode ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">
                    Déductions (m²)
                  </label>
                  <input
                    type="number"
                    placeholder="Ouvertures"
                    value={openingsArea}
                    onChange={(e) => setOpeningsArea(e.target.value)}
                    className="w-full p-1.5 text-sm border rounded bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">
                    Pertes (%)
                  </label>
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
                      Remplissage (L/m²) — override
                    </label>
                    <input
                      type="number"
                      value={stepocFillRate}
                      onChange={(e) => setStepocFillRate(Number(e.target.value))}
                      className="w-full p-1.5 text-sm border rounded bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Si ton catalogue définit déjà un volume béton/m², il est
                      prioritaire. Sinon cet override est utilisé.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Cliquez pour ajuster les pertes, ouvertures ou dosage.
              </p>
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

      {/* --- STEP 2: WATERPROOFING --- */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Droplets size={16} className="mr-2 shrink-0 mt-0.5" />
            Protection des murs contre l'humidité (indispensable pour les murs
            enterrés).
          </div>

          <div className="space-y-3">
            <label className="block">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Surface enterrée (à traiter)
                </span>
                <span className="text-xs font-bold text-blue-600">
                  {percentBuried}%
                </span>
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
                <span className="text-sm font-bold text-slate-700">
                  Arase Étanche
                </span>
                <p className="text-xs text-slate-400">
                  Rupture de capillarité sous le plancher
                </p>
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
                <span className="text-sm font-bold text-slate-700">
                  Enduit Bitumineux
                </span>
                <p className="text-xs text-slate-400">
                  Impression noire sur face extérieure
                </p>
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
                <span className="text-xs text-slate-500">
                  Nombre de couches :
                </span>
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
                <span className="text-sm font-bold text-slate-700">
                  Protection Delta MS
                </span>
                <p className="text-xs text-slate-400">
                  Nappe à excroissances (protection mécanique)
                </p>
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

      {/* --- STEP 3: DRAINAGE --- */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <ScanLine size={16} className="mr-2 shrink-0 mt-0.5" />
            Système de drainage périphérique pour évacuer les eaux de
            ruissellement.
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
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  Tranchée drainante
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Largeur (m)
                    </label>
                    <input
                      type="number"
                      value={trenchWidth}
                      onChange={(e) => setTrenchWidth(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      Hauteur Gravier (m)
                    </label>
                    <input
                      type="number"
                      value={gravelHeight}
                      onChange={(e) => setGravelHeight(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 border rounded bg-white">
                  <span className="text-sm font-medium">Géotextile (Enrobage)</span>
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
                    <span className="w-4 text-center font-bold text-sm">
                      {manholes}
                    </span>
                    <button
                      onClick={() => setManholes(manholes + 1)}
                      className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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

      {/* --- STEP 4: COSTS --- */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Vérifiez les prix unitaires pour affiner l'estimation.
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* ✅ Prix bloc selon variante active */}
            {wallMode === "masonry" && selectedSpec && (
              <div className="col-span-2">
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                  {selectedSpec.family === "stepoc" ? "Bloc à bancher" : "Bloc"}{" "}
                  (€/u) — {selectedSpec.label}
                </label>
                <input
                  type="number"
                  value={getUnit(
                    activeBlockPriceKey ??
                      (selectedSpec.family === "stepoc"
                        ? "BLOCK_STEPOC_UNIT"
                        : "BLOCK_20_UNIT"),
                    selectedSpec.family === "stepoc"
                      ? Number(DEFAULT_PRICES.BLOCK_STEPOC_UNIT)
                      : Number(DEFAULT_PRICES.BLOCK_20_UNIT)
                  )}
                  onChange={(e) => {
                    const key =
                      activeBlockPriceKey ??
                      (selectedSpec.family === "stepoc"
                        ? "BLOCK_STEPOC_UNIT"
                        : "BLOCK_20_UNIT");
                    setUnit(key, parseFloat(e.target.value) || 0);
                  }}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>
            )}

            {wallMode === "concrete" && (
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                  Béton (€/m³)
                </label>
                <input
                  type="number"
                  value={prices.concrete}
                  onChange={(e) => updatePrice("concrete", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>
            )}

            {wallMode === "masonry" && (
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                  Mortier/Colle (€/sac 25kg)
                </label>
                <input
                  type="number"
                  value={prices.mortarBag}
                  onChange={(e) => updatePrice("mortarBag", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>
            )}

            {useBitumen && (
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                  Seau Bitume (€/25kg)
                </label>
                <input
                  type="number"
                  value={prices.bitumenBucket}
                  onChange={(e) => updatePrice("bitumenBucket", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>
            )}

            {useDeltaMS && (
              <div>
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                  Delta MS (€/m²)
                </label>
                <input
                  type="number"
                  value={prices.deltaM2}
                  onChange={(e) => updatePrice("deltaM2", e.target.value)}
                  className="w-full p-2 border rounded bg-white text-sm"
                />
              </div>
            )}

            {useDrain && (
              <>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                    Drain (€/m)
                  </label>
                  <input
                    type="number"
                    value={prices.drainM}
                    onChange={(e) => updatePrice("drainM", e.target.value)}
                    className="w-full p-2 border rounded bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                    Gravier (€/T)
                  </label>
                  <input
                    type="number"
                    value={prices.gravelTon}
                    onChange={(e) => updatePrice("gravelTon", e.target.value)}
                    className="w-full p-2 border rounded bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">
                    Regard (€/u)
                  </label>
                  <input
                    type="number"
                    value={prices.manhole}
                    onChange={(e) => updatePrice("manhole", e.target.value)}
                    className="w-full p-2 border rounded bg-white text-sm"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              disabled
              className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center"
            >
              <Check size={18} className="mr-2" /> Calculé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};