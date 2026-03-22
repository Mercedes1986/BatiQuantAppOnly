import React, { useEffect, useMemo, useState } from "react";
  const formatWallSpecOption = (s: WallBlockSpec) => {
    const anyS = s as any;
    const parts: string[] = [];

    const label = (s.label ?? "").toString().trim();
    if (label) parts.push(label);

    const dimsStr =
      (typeof anyS.dimensions === "string" && anyS.dimensions) ||
      (typeof anyS.size === "string" && anyS.size) ||
      (typeof anyS.format === "string" && anyS.format) ||
      (typeof anyS.dimLabel === "string" && anyS.dimLabel) ||
      "";

    if (dimsStr && dimsStr.toString().trim()) {
      parts.push(dimsStr.toString().trim());
    } else {
      const l = anyS.lengthCm ?? anyS.lCm;
      const w = anyS.widthCm ?? anyS.wCm;
      const h = anyS.heightCm ?? anyS.hCm;
      const nums = [l, w, h].filter((n: any) => typeof n === "number" && Number.isFinite(n)) as number[];
      if (nums.length >= 2) parts.push(nums.map((n) => `${n}cm`).join("×"));
    }

    parts.push(`${s.unitsPerM2.toFixed(2)} units/m²`);
    if (typeof (s as any).thicknessCm === "number") parts.push(`${(s as any).thicknessCm}cm`);
    return parts.join(" — ");
  };


import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit, CalculatorSnapshot } from "@/types";
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
  AlertTriangle,
} from "lucide-react";

import {
  WALL_BLOCK_SPECS,
  getWallBlockSpec,
  getSpecsByFamily,
  type WallBlockSpec,
} from "../../data/blockSpecs";

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialSnapshot?: CalculatorSnapshot;
}

type WallFamily = WallBlockSpec["family"];
type WallMode = "masonry" | "concrete";

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * ✅ UPDATE (i18n + no hardcoded UI strings)
 * - UI texts moved to i18n (t(..., defaultValue))
 * - Warnings moved to i18n (still accept dynamic values)
 * - Same pricing logic: Override local > Catalog > DEFAULT_PRICES > fallback
 * - Roll-based conversions kept (DeltaMS 20m², drain 50m) to €/m² or €/m
 * - Keeps "advanced options" separate from step 4 pricing overrides
 */

const KEYS = {
  CONCRETE: "BPE_M3",
  MORTAR: "MORTAR_BAG_25KG",
  GLUE: "GLUE_MORTAR_BAG_25KG",
  BITUMEN: "BITUMEN_COATING_BUCKET_25KG",
  // roll-based
  DELTA_ROLL: "DELTA_MS_ROLL_20M", // ~20m²
  DRAIN_ROLL: "DRAIN_PIPE_50M", // 50m
  // drainage
  GRAVEL_TON: "GRAVEL_FOUNDATION_TON",
  GEO_M2: "GEOTEXTILE_M2",
  MANHOLE: "MANHOLE_UNIT",
  // often missing in catalogs -> keep local fallbacks if needed
  ARASE_ROLL: "ARASE_ROLL_20M", // ~20m
  DELTA_PROFILE: "DELTA_PROFILE_UNIT",
} as const;

export const SubstructureCalculator: React.FC<Props> = ({ onCalculate,
  initialSnapshot
}) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);

  // “Advanced options” (UI only)
  const [advanced, setAdvanced] = useState(false);

  // --- 1) Walls ---
  const [perimeter, setPerimeter] = useState<string>("");
  const [height, setHeight] = useState<string>("0.60"); // ~3 rows
  const [openingsArea, setOpeningsArea] = useState<string>("");

  const [wallMode, setWallMode] = useState<WallMode>("masonry");
  const [wallFamily, setWallFamily] = useState<WallFamily>("parpaing");
  const [wallBlockId, setWallBlockId] = useState<string>("parpaing-20");

  // Poured concrete wall
  const [wallThickness, setWallThickness] = useState("20"); // cm

  // Waste
  const [wasteBlock, setWasteBlock] = useState(5);

  // Stepoc: fallback fill if spec has no fillM3PerM2
  const [stepocFillRate, setStepocFillRate] = useState(140); // L/m² fallback

  // --- 2) Waterproofing ---
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
   * Local overrides (highest priority)
   * ex: BPE_M3, DELTA_MS_ROLL_20M, DRAIN_PIPE_50M, etc.
   */
  const [unitOverrides, setUnitOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    const values = initialSnapshot?.values as Record<string, any> | undefined;
    if (!values) return;
    if (values.step !== undefined) setStep(values.step as any);
    if (values.advanced !== undefined) setAdvanced(values.advanced as any);
    if (values.perimeter !== undefined) setPerimeter(values.perimeter as any);
    if (values.height !== undefined) setHeight(values.height as any);
    if (values.openingsArea !== undefined) setOpeningsArea(values.openingsArea as any);
    if (values.wallMode !== undefined) setWallMode(values.wallMode as any);
    if (values.wallFamily !== undefined) setWallFamily(values.wallFamily as any);
    if (values.wallBlockId !== undefined) setWallBlockId(values.wallBlockId as any);
    if (values.wallThickness !== undefined) setWallThickness(values.wallThickness as any);
    if (values.wasteBlock !== undefined) setWasteBlock(values.wasteBlock as any);
    if (values.stepocFillRate !== undefined) setStepocFillRate(values.stepocFillRate as any);
    if (values.percentBuried !== undefined) setPercentBuried(values.percentBuried as any);
    if (values.useArase !== undefined) setUseArase(values.useArase as any);
    if (values.useBitumen !== undefined) setUseBitumen(values.useBitumen as any);
    if (values.bitumenLayers !== undefined) setBitumenLayers(values.bitumenLayers as any);
    if (values.useDeltaMS !== undefined) setUseDeltaMS(values.useDeltaMS as any);
    if (values.useDrain !== undefined) setUseDrain(values.useDrain as any);
    if (values.trenchWidth !== undefined) setTrenchWidth(values.trenchWidth as any);
    if (values.gravelHeight !== undefined) setGravelHeight(values.gravelHeight as any);
    if (values.useGeo !== undefined) setUseGeo(values.useGeo as any);
    if (values.manholes !== undefined) setManholes(values.manholes as any);
    if (values.unitOverrides !== undefined) setUnitOverrides(values.unitOverrides as any);
  }, [initialSnapshot]);

  const snapshot: CalculatorSnapshot = {
    version: 1,
    calculatorType: CalculatorType.SUBSTRUCTURE,
    values: {
      step,
      advanced,
      perimeter,
      height,
      openingsArea,
      wallMode,
      wallFamily,
      wallBlockId,
      wallThickness,
      wasteBlock,
      stepocFillRate,
      percentBuried,
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
    },
  };


  const setOverride = (key: string, val: number) => setUnitOverrides((prev) => ({ ...prev, [key]: val }));

  const fromDefaults = (key: string) => {
    const raw = (DEFAULT_PRICES as any)?.[key];
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  // ✅ price helper: Override > Catalog > DEFAULT_PRICES > fallback
  const getP = (key: string, fallback: number) => {
    const o = unitOverrides[key];
    if (o !== undefined && Number.isFinite(o)) return o;

    const v = getUnitPrice(key);
    if (typeof v === "number" && Number.isFinite(v) && v !== 0) return v;

    const d = fromDefaults(key);
    if (d !== undefined && d !== 0) return d;

    return fallback;
  };

  // --- Selected masonry spec ---
  const selectedSpec = useMemo(() => {
    if (wallMode !== "masonry") return undefined;
    return getWallBlockSpec(wallBlockId) ?? WALL_BLOCK_SPECS[0];
  }, [wallMode, wallBlockId]);

  // --- Active block price key (depending on variant) ---
  const activeBlockPriceKey = useMemo(() => {
    if (!selectedSpec) return null;
    try {
      return getWallUnitPriceKey(selectedSpec as any) as string;
    } catch {
      return null;
    }
  }, [selectedSpec]);

  // Force a valid block when family changes
  useEffect(() => {
    if (wallMode !== "masonry") return;
    const list = getSpecsByFamily(wallFamily);
    if (!list.length) return;

    const cur = getWallBlockSpec(wallBlockId);
    if (!cur || cur.family !== wallFamily) setWallBlockId(list[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallFamily, wallMode]);

  // Keep step in bounds
  useEffect(() => setStep((s) => clamp(s, 1, 4)), []);

  const wallModeLabel = (m: WallMode) =>
    t(`calc.substructure.wall_mode.${m}`, {
      defaultValue: m === "masonry" ? "Maçonnerie (blocs)" : "Béton coulé",
    });

  const wallFamilyLabel = (fam: WallFamily) =>
    t(`calc.substructure.wall_family.${fam}`, {
      defaultValue:
        fam === "parpaing"
          ? "Bloc béton"
          : fam === "brique"
          ? "Brique"
          : fam === "cellulaire"
          ? "Bloc cellulaire"
          : "Bloc à bancher",
    });

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
        summary: t("calc.substructure.title", { defaultValue: "Substructure" }),
        warnings: [
          t("calc.substructure.warn.fill_perimeter_height", {
            defaultValue: "Enter a perimeter and height to calculate.",
          }),
        ],
      };
    }

    const grossSurface = P * H;
    const netSurface = Math.max(0, grossSurface - deductions);
    const treatedSurface = netSurface * (Math.max(0, Math.min(100, percentBuried)) / 100);

    if (deductions > 0 && deductions > grossSurface) {
      warnings.push(
        t("calc.substructure.warn.deductions_over_gross", {
          defaultValue: "Deductions exceed gross surface (net surface set to 0).",
        })
      );
    }

    const materials: any[] = [];
    let totalCost = 0;

    // --- 1) Walls ---
    if (wallMode === "masonry" && selectedSpec) {
      const blocksRaw = netSurface * selectedSpec.unitsPerM2;
      const totalBlocks = Math.ceil(blocksRaw * (1 + Math.max(0, wasteBlock) / 100));

      const fallbackBlock =
        selectedSpec.family === "stepoc"
          ? Number((DEFAULT_PRICES as any)?.BLOCK_STEPOC_UNIT ?? 2.5)
          : Number((DEFAULT_PRICES as any)?.BLOCK_20_UNIT ?? 1.6);

      const blockKey =
        activeBlockPriceKey ??
        (selectedSpec.family === "stepoc" ? "BLOCK_STEPOC_UNIT" : "BLOCK_20_UNIT");

      const unitPriceBlock = getP(blockKey, fallbackBlock);
      const costBlocks = totalBlocks * unitPriceBlock;
      totalCost += costBlocks;

      materials.push({
        id: "blocks_sub",
        name: selectedSpec.label || t("calc.substructure.mat.block_generic", { defaultValue: "Masonry block" }),
        quantity: totalBlocks,
        quantityRaw: totalBlocks,
        unit: Unit.PIECE,
        unitPrice: round2(unitPriceBlock),
        totalPrice: round2(costBlocks),
        category: CalculatorType.SUBSTRUCTURE,
        details: t("calc.substructure.mat.blocks_details", {
          units: selectedSpec.unitsPerM2.toFixed(2),
          th: selectedSpec.thicknessCm,
          defaultValue: `${selectedSpec.unitsPerM2.toFixed(2)} units/m² — th. ${selectedSpec.thicknessCm} cm`,
        }),
        refKey: blockKey,
      });

      // Mortar / glue
      const bagsPerM2 = selectedSpec.mortarKind === "mortier" ? 1 / 3 : 1 / 5;
      const bags = Math.max(0, Math.ceil(netSurface * bagsPerM2));

      const mortarKey = selectedSpec.mortarKind === "mortier" ? KEYS.MORTAR : KEYS.GLUE;
      const mortarFallback = Number((DEFAULT_PRICES as any)?.MORTAR_BAG_25KG ?? 8);
      const mortarUnitPrice = getP(mortarKey, mortarFallback);
      const costMortar = bags * mortarUnitPrice;
      totalCost += costMortar;

      materials.push({
        id: "mortar",
        name:
          selectedSpec.mortarKind === "mortier"
            ? t("calc.substructure.mat.mortar", { defaultValue: "Masonry mortar (25kg bag)" })
            : t("calc.substructure.mat.glue", { defaultValue: "Adhesive / thin-bed mortar (25kg bag)" }),
        quantity: bags,
        quantityRaw: bags,
        unit: Unit.BAG,
        unitPrice: round2(mortarUnitPrice),
        totalPrice: round2(costMortar),
        category: CalculatorType.SUBSTRUCTURE,
        details:
          selectedSpec.mortarKind === "mortier"
            ? t("calc.substructure.mat.mortar_ratio", { defaultValue: "~1 bag / 3 m²" })
            : t("calc.substructure.mat.glue_ratio", { defaultValue: "~1 bag / 5 m²" }),
        refKey: mortarKey,
      });

      // Stepoc: concrete infill
      if (selectedSpec.family === "stepoc") {
        const fillM3PerM2 = selectedSpec.fillM3PerM2 ?? stepocFillRate / 1000;
        const volFill = netSurface * fillM3PerM2;

        const concFallback = Number((DEFAULT_PRICES as any)?.BPE_M3 ?? 130);
        const concUnit = getP(KEYS.CONCRETE, concFallback);
        const costFill = volFill * concUnit;
        totalCost += costFill;

        materials.push({
          id: "concrete_fill",
          name: t("calc.substructure.mat.stepoc_fill", { defaultValue: "Concrete infill (Stepoc)" }),
          quantity: round2(volFill),
          quantityRaw: volFill,
          unit: Unit.M3,
          unitPrice: round2(concUnit),
          totalPrice: round2(costFill),
          category: CalculatorType.SUBSTRUCTURE,
          details:
            selectedSpec.fillM3PerM2 != null
              ? t("calc.substructure.mat.stepoc_fill_detail_spec", {
                  lpm2: (fillM3PerM2 * 1000).toFixed(0),
                  defaultValue: `${(fillM3PerM2 * 1000).toFixed(0)} L/m² (spec)`,
                })
              : t("calc.substructure.mat.stepoc_fill_detail_fallback", {
                  lpm2: stepocFillRate,
                  defaultValue: `${stepocFillRate} L/m² (fallback)`,
                }),
          refKey: KEYS.CONCRETE,
        });
      }
    } else {
      // Poured concrete wall
      const thM = (Math.max(0, toNum(wallThickness, 20)) || 20) / 100;
      const vol = netSurface * thM * 1.05;

      const concFallback = Number((DEFAULT_PRICES as any)?.BPE_M3 ?? 130);
      const concUnit = getP(KEYS.CONCRETE, concFallback);
      const costConc = vol * concUnit;
      totalCost += costConc;

      materials.push({
        id: "concrete_wall",
        name: t("calc.substructure.mat.poured_wall", {
          th: toNum(wallThickness, 20).toFixed(0),
          defaultValue: `Poured concrete wall (th. ${toNum(wallThickness, 20).toFixed(0)}cm)`,
        }),
        quantity: round2(vol),
        quantityRaw: vol,
        unit: Unit.M3,
        unitPrice: round2(concUnit),
        totalPrice: round2(costConc),
        category: CalculatorType.SUBSTRUCTURE,
        refKey: KEYS.CONCRETE,
      });
    }

    // --- 2) Waterproofing ---
    if (useArase) {
      // 1 roll ~20m
      const rolls = Math.max(1, Math.ceil(P / 20));
      const araseUnit = getP(KEYS.ARASE_ROLL, 15);
      const costArase = rolls * araseUnit;
      totalCost += costArase;

      materials.push({
        id: "arase",
        name: t("calc.substructure.mat.dpc", { defaultValue: "DPC strip (damp-proof course)" }),
        quantity: rolls,
        quantityRaw: P,
        unit: Unit.ROLL,
        unitPrice: round2(araseUnit),
        totalPrice: round2(costArase),
        category: CalculatorType.SUBSTRUCTURE,
        details: t("calc.substructure.mat.dpc_ratio", { defaultValue: "≈ 1 roll / 20 m" }),
        refKey: KEYS.ARASE_ROLL,
      });
    }

    if (useBitumen) {
      // ~0.5 kg/m² per coat, +10%
      const kgNeeded = treatedSurface * 0.5 * Math.max(1, bitumenLayers) * 1.1;
      const buckets = Math.ceil(kgNeeded / 25);

      const bitUnit = getP(KEYS.BITUMEN, Number((DEFAULT_PRICES as any)?.BITUMEN_COATING_BUCKET_25KG ?? 55));
      const costBit = buckets * bitUnit;
      totalCost += costBit;

      materials.push({
        id: "bitumen",
        name: t("calc.substructure.mat.bitumen", {
          n: bitumenLayers,
          defaultValue: `Bitumen coating (${bitumenLayers} coat${bitumenLayers > 1 ? "s" : ""})`,
        }),
        quantity: buckets,
        quantityRaw: kgNeeded,
        unit: Unit.BUCKET,
        unitPrice: round2(bitUnit),
        totalPrice: round2(costBit),
        category: CalculatorType.SUBSTRUCTURE,
        details: t("calc.substructure.mat.bitumen_detail", {
          kg: kgNeeded.toFixed(1),
          m2: treatedSurface.toFixed(1),
          defaultValue: `${kgNeeded.toFixed(1)} kg over ${treatedSurface.toFixed(1)} m²`,
        }),
        refKey: KEYS.BITUMEN,
      });
    }

    if (useDeltaMS) {
      const areaDelta = treatedSurface * 1.15;

      // Delta: roll price 20m² -> €/m²
      const rollUnit = getP(KEYS.DELTA_ROLL, Number((DEFAULT_PRICES as any)?.DELTA_MS_ROLL_20M ?? 120));
      const deltaM2 = rollUnit / 20;

      const costDelta = areaDelta * deltaM2;
      totalCost += costDelta;

      materials.push({
        id: "deltams",
        name: t("calc.substructure.mat.delta_ms", { defaultValue: "Delta MS protection" }),
        quantity: round2(areaDelta),
        quantityRaw: areaDelta,
        unit: Unit.M2,
        unitPrice: round2(deltaM2),
        totalPrice: round2(costDelta),
        category: CalculatorType.SUBSTRUCTURE,
        details: t("calc.substructure.mat.delta_ms_overlap", { defaultValue: "≈ +15% overlaps" }),
        refKey: KEYS.DELTA_ROLL,
      });

      // Profiles: ~1 per 2m
      const profiles = Math.max(1, Math.ceil(P / 2));
      const profUnit = getP(KEYS.DELTA_PROFILE, 8);
      const costProf = profiles * profUnit;
      totalCost += costProf;

      materials.push({
        id: "delta_profile",
        name: t("calc.substructure.mat.delta_profile", { defaultValue: "Delta finishing profile" }),
        quantity: profiles,
        quantityRaw: P,
        unit: Unit.PIECE,
        unitPrice: round2(profUnit),
        totalPrice: round2(costProf),
        category: CalculatorType.SUBSTRUCTURE,
        refKey: KEYS.DELTA_PROFILE,
      });
    }

    // --- 3) Drainage ---
    if (useDrain) {
      const len = P * 1.05;

      // Drain: roll price 50m -> €/m
      const drainRoll = getP(KEYS.DRAIN_ROLL, Number((DEFAULT_PRICES as any)?.DRAIN_PIPE_50M ?? 70));
      const drainM = drainRoll / 50;

      const costDrain = len * drainM;
      totalCost += costDrain;

      materials.push({
        id: "drain_pipe",
        name: t("calc.substructure.mat.drain_pipe", { defaultValue: "Drain pipe Ø100" }),
        quantity: Math.ceil(len),
        quantityRaw: len,
        unit: Unit.METER,
        unitPrice: round2(drainM),
        totalPrice: round2(costDrain),
        category: CalculatorType.SUBSTRUCTURE,
        refKey: KEYS.DRAIN_ROLL,
      });

      // Gravel
      const w = Math.max(0, toNum(trenchWidth, 0.3));
      const h = Math.max(0, toNum(gravelHeight, 0.4));
      const volGrav = P * w * h; // m3
      const tonsGrav = volGrav * 1.5; // approx

      const gravUnit = getP(KEYS.GRAVEL_TON, Number((DEFAULT_PRICES as any)?.GRAVEL_FOUNDATION_TON ?? 45));
      const costGrav = tonsGrav * gravUnit;
      totalCost += costGrav;

      materials.push({
        id: "gravel_drain",
        name: t("calc.substructure.mat.gravel", { defaultValue: "Drainage gravel" }),
        quantity: round2(tonsGrav),
        quantityRaw: volGrav,
        unit: Unit.TON,
        unitPrice: round2(gravUnit),
        totalPrice: round2(costGrav),
        category: CalculatorType.SUBSTRUCTURE,
        details: t("calc.substructure.mat.gravel_detail", {
          vol: volGrav.toFixed(2),
          defaultValue: `Vol: ${volGrav.toFixed(2)} m³`,
        }),
        refKey: KEYS.GRAVEL_TON,
      });

      // Geotextile
      if (useGeo) {
        const linearW = w + 2 * h + 0.3; // wrap
        const areaGeo = P * linearW;

        const geoUnit = getP(KEYS.GEO_M2, Number((DEFAULT_PRICES as any)?.GEOTEXTILE_M2 ?? 1.2));
        const costGeo = areaGeo * geoUnit;
        totalCost += costGeo;

        materials.push({
          id: "geo_drain",
          name: t("calc.substructure.mat.geotextile", { defaultValue: "Geotextile (drain wrap)" }),
          quantity: Math.ceil(areaGeo),
          quantityRaw: areaGeo,
          unit: Unit.M2,
          unitPrice: round2(geoUnit),
          totalPrice: round2(costGeo),
          category: CalculatorType.SUBSTRUCTURE,
          refKey: KEYS.GEO_M2,
        });
      }

      // Manholes
      const mh = Math.max(0, Math.floor(manholes));
      if (mh > 0) {
        const manUnit = getP(KEYS.MANHOLE, 45);
        const costMan = mh * manUnit;
        totalCost += costMan;

        materials.push({
          id: "manhole",
          name: t("calc.substructure.mat.manholes", { defaultValue: "Inspection chambers" }),
          quantity: mh,
          quantityRaw: mh,
          unit: Unit.PIECE,
          unitPrice: round2(manUnit),
          totalPrice: round2(costMan),
          category: CalculatorType.SUBSTRUCTURE,
          refKey: KEYS.MANHOLE,
        });
      }
    }

    const details: any[] = [
      { label: t("calc.substructure.detail.perimeter", { defaultValue: "Perimeter" }), value: P.toFixed(1), unit: "m" },
      { label: t("calc.substructure.detail.height", { defaultValue: "Height" }), value: H.toFixed(2), unit: "m" },
      { label: t("calc.substructure.detail.net_surface", { defaultValue: "Net surface" }), value: netSurface.toFixed(1), unit: "m²" },
      { label: t("calc.substructure.detail.treated_surface", { defaultValue: "Treated surface" }), value: treatedSurface.toFixed(1), unit: "m²" },
    ];

    if (wallMode === "masonry" && selectedSpec) {
      details.push({ label: t("calc.substructure.detail.block", { defaultValue: "Block" }), value: selectedSpec.label, unit: "" });
      details.push({ label: t("calc.substructure.detail.consumption", { defaultValue: "Consumption" }), value: selectedSpec.unitsPerM2.toFixed(2), unit: "units/m²" });
    } else {
      details.push({ label: t("calc.substructure.detail.wall", { defaultValue: "Wall" }), value: t("calc.substructure.detail.poured_concrete", { defaultValue: "Poured concrete" }), unit: "" });
      details.push({ label: t("calc.substructure.detail.thickness", { defaultValue: "Thickness" }), value: `${toNum(wallThickness, 20).toFixed(0)}`, unit: "cm" });
    }

    if (netSurface <= 0) {
      warnings.push(
        t("calc.substructure.warn.net_zero", {
          defaultValue: "Net surface is zero: check perimeter/height/deductions.",
        })
      );
    }

    return {
      ok: true,
      summary: t("calc.substructure.summary", {
        m2: netSurface.toFixed(1),
        defaultValue: `${netSurface.toFixed(1)} m²`,
      }),
      totalCost: round2(totalCost),
      materials,
      details,
      warnings,
    };
  }, [
    t,
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
  ]);

  useEffect(() => {
    onCalculate({
      snapshot,
      summary: calculationData.summary,
      details: calculationData.details,
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings?.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate]);

  // --- UI helpers Step 4 ---
  const PriceInput = ({
    label,
    k,
    hint,
    fallback,
  }: {
    label: string;
    k: string;
    hint?: string;
    fallback: number;
  }) => {
    const v = getP(k, fallback);
    return (
      <div>
        <label className="block text-[10px] uppercase text-slate-500 font-bold mb-1">{label}</label>
        <input
          type="number"
          value={v}
          onChange={(e) => setOverride(k, toNum(e.target.value, 0))}
          className="w-full p-2 border rounded bg-white text-sm"
        />
        {hint ? <p className="text-[10px] text-slate-400 mt-1">{hint}</p> : null}
      </div>
    );
  };

  const stepLabel = (s: number) =>
    t(`calc.substructure.steps.${s}`, {
      defaultValue: s === 1 ? "1. Murs" : s === 2 ? "2. Étanchéité" : s === 3 ? "3. Drainage" : "4. Prix",
    });

  return (
    <div className="space-y-5 rounded-[28px] border border-white/70 bg-white/74 p-3.5 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-5">
      {/* Step Navigation */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-[20px] border border-white/80 bg-slate-50/90 p-1.5 shadow-inner no-scrollbar">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`min-w-[92px] flex-1 py-2 text-xs font-extrabold rounded-2xl transition-all ${
              step === s ? "bg-white text-slate-950 shadow-[0_14px_32px_rgba(59,130,246,0.18)]" : "text-slate-400"
            }`}
          >
            {stepLabel(s)}
          </button>
        ))}
      </div>

      {/* Warnings */}
      {calculationData.warnings?.length ? (
        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
          {calculationData.warnings.map((w, i) => (
            <div key={i} className="flex items-start">
              <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" /> {w}
            </div>
          ))}
        </div>
      ) : null}

      {/* STEP 1: WALLS */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.substructure.ui.step1_hint", {
              defaultValue: "Define the perimeter and height of the substructure walls.",
            })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.substructure.ui.perimeter_m", { defaultValue: "Perimeter (m)" })}
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
                {t("calc.substructure.ui.height_m", { defaultValue: "Height (m)" })}
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("calc.substructure.ui.wall_type", { defaultValue: "Wall type" })}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["masonry", "concrete"] as WallMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setWallMode(m)}
                  className={`p-2 rounded border text-xs font-medium ${
                    wallMode === m
                      ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {wallModeLabel(m)}
                </button>
              ))}
            </div>
          </div>

          {wallMode === "masonry" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t("calc.substructure.ui.family", { defaultValue: "Family" })}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["parpaing", "brique", "cellulaire", "stepoc"] as WallFamily[]).map((fam) => (
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
                      {wallFamilyLabel(fam)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t("calc.substructure.ui.block_variant", { defaultValue: "Format / thickness" })}
                </label>
                <select
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                  value={wallBlockId}
                  onChange={(e) => setWallBlockId(e.target.value)}
                >
                  {getSpecsByFamily(wallFamily).map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatWallSpecOption(s)}
                    </option>
                  ))}
                </select>

                {selectedSpec ? (
                  <p className="text-xs text-slate-500 mt-1">
                    {t("calc.substructure.ui.thickness", { defaultValue: "Thickness" })}:{" "}
                    <b>{selectedSpec.thicknessCm}cm</b> •{" "}
                    {t("calc.substructure.ui.consumption", { defaultValue: "Consumption" })}:{" "}
                    <b>{selectedSpec.unitsPerM2.toFixed(2)} units/m²</b>
                  </p>
                ) : null}
              </div>
            </div>
          )}

          {wallMode === "concrete" && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                {t("calc.substructure.ui.thickness_cm", { defaultValue: "Thickness (cm)" })}
              </label>
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
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              className="flex items-center text-xs font-bold text-slate-500 mb-2 uppercase"
            >
              <Settings size={12} className="mr-1" />{" "}
              {t("calc.substructure.ui.advanced", { defaultValue: "Advanced options" })}
            </button>

            {advanced ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">
                    {t("calc.substructure.ui.deductions_m2", { defaultValue: "Deductions (m²)" })}
                  </label>
                  <input
                    type="number"
                    value={openingsArea}
                    onChange={(e) => setOpeningsArea(e.target.value)}
                    className="w-full p-1.5 text-sm border rounded bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">
                    {t("calc.substructure.ui.waste_pct", { defaultValue: "Waste (%)" })}
                  </label>
                  <input
                    type="number"
                    value={wasteBlock}
                    onChange={(e) => setWasteBlock(clamp(toNum(e.target.value, 5), 0, 40))}
                    className="w-full p-1.5 text-sm border rounded bg-white"
                  />
                </div>

                {wallMode === "masonry" && selectedSpec?.family === "stepoc" && (
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-500 uppercase">
                      {t("calc.substructure.ui.stepoc_fill_fallback", {
                        defaultValue: "Stepoc fill (L/m²) — fallback",
                      })}
                    </label>
                    <input
                      type="number"
                      value={stepocFillRate}
                      onChange={(e) => setStepocFillRate(clamp(toNum(e.target.value, 140), 50, 400))}
                      className="w-full p-1.5 text-sm border rounded bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {t("calc.substructure.ui.stepoc_fill_note", {
                        defaultValue: "If the spec provides fillM3PerM2, it is used first.",
                      })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                {t("calc.substructure.ui.advanced_hint", { defaultValue: "Deductions, waste, Stepoc fill…" })}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center"
          >
            {t("common.next", { defaultValue: "Next" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2: WATERPROOFING */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Droplets size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.substructure.ui.step2_hint", {
              defaultValue: "Waterproofing protection (buried walls).",
            })}
          </div>

          <div className="space-y-3">
            <label className="block">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  {t("calc.substructure.ui.buried_share", { defaultValue: "Buried share" })}
                </span>
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
                <span className="text-sm font-bold text-slate-700">
                  {t("calc.substructure.ui.dpc", { defaultValue: "DPC strip" })}
                </span>
                <p className="text-xs text-slate-400">
                  {t("calc.substructure.ui.dpc_help", { defaultValue: "Capillary break" })}
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
                  {t("calc.substructure.ui.bitumen", { defaultValue: "Bitumen coating" })}
                </span>
                <p className="text-xs text-slate-400">
                  {t("calc.substructure.ui.bitumen_help", { defaultValue: "External waterproofing" })}
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
                  {t("calc.substructure.ui.coats", { defaultValue: "Coats:" })}
                </span>
                <div className="flex bg-slate-100 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setBitumenLayers(1)}
                    className={`px-2 py-0.5 text-xs rounded ${bitumenLayers === 1 ? "bg-white shadow font-bold" : ""}`}
                  >
                    1
                  </button>
                  <button
                    type="button"
                    onClick={() => setBitumenLayers(2)}
                    className={`px-2 py-0.5 text-xs rounded ${bitumenLayers === 2 ? "bg-white shadow font-bold" : ""}`}
                  >
                    2
                  </button>
                </div>
              </div>
            )}

            <label className="flex items-center justify-between p-3 bg-white border rounded-lg cursor-pointer hover:bg-slate-50">
              <div>
                <span className="text-sm font-bold text-slate-700">
                  {t("calc.substructure.ui.delta_ms", { defaultValue: "Delta MS membrane" })}
                </span>
                <p className="text-xs text-slate-400">
                  {t("calc.substructure.ui.delta_ms_help", { defaultValue: "Mechanical protection" })}
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DRAINAGE */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <ScanLine size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.substructure.ui.step3_hint", {
              defaultValue: "Perimeter drainage (pipe + gravel + geotextile).",
            })}
          </div>

          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-slate-800">
              {t("calc.substructure.ui.install_drain", { defaultValue: "Install drain?" })}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useDrain}
                onChange={(e) => setUseDrain(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {useDrain && (
            <div className="space-y-4 animate-in slide-in-from-right-2">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
                  {t("calc.substructure.ui.trench", { defaultValue: "Drain trench" })}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      {t("calc.substructure.ui.trench_width_m", { defaultValue: "Width (m)" })}
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
                      {t("calc.substructure.ui.gravel_height_m", { defaultValue: "Gravel height (m)" })}
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

              <label className="flex items-center justify-between p-3 border rounded bg-white">
                <span className="text-sm font-medium">
                  {t("calc.substructure.ui.geotextile", { defaultValue: "Geotextile" })}
                </span>
                <input
                  type="checkbox"
                  checked={useGeo}
                  onChange={(e) => setUseGeo(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <div className="flex items-center justify-between p-3 border rounded bg-white">
                <span className="text-sm font-medium">
                  {t("calc.substructure.ui.manholes", { defaultValue: "Inspection chambers" })}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setManholes((v) => Math.max(0, v - 1))}
                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold"
                    aria-label={t("common.decrease", { defaultValue: "Decrease" })}
                  >
                    -
                  </button>
                  <span className="w-4 text-center font-bold text-sm">{manholes}</span>
                  <button
                    type="button"
                    onClick={() => setManholes((v) => v + 1)}
                    className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold"
                    aria-label={t("common.increase", { defaultValue: "Increase" })}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: PRICING */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.substructure.ui.step4_hint", {
              defaultValue: "Local overrides (highest priority) for this calculation.",
            })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 gap-3">
              {/* Block */}
              {wallMode === "masonry" && selectedSpec ? (
                <div className="col-span-2">
                  {(() => {
                    const fallbackBlock =
                      selectedSpec.family === "stepoc"
                        ? Number((DEFAULT_PRICES as any)?.BLOCK_STEPOC_UNIT ?? 2.5)
                        : Number((DEFAULT_PRICES as any)?.BLOCK_20_UNIT ?? 1.6);

                    const blockKey =
                      activeBlockPriceKey ??
                      (selectedSpec.family === "stepoc" ? "BLOCK_STEPOC_UNIT" : "BLOCK_20_UNIT");

                    return (
                      <PriceInput
                        label={t("calc.substructure.ui.price.block_unit", {
                          label: selectedSpec.label,
                          defaultValue: `Block (€/pc) — ${selectedSpec.label}`,
                        })}
                        k={blockKey}
                        fallback={fallbackBlock}
                        hint={t("calc.substructure.ui.price.key_hint", {
                          k: blockKey,
                          defaultValue: `Key: ${blockKey}`,
                        })}
                      />
                    );
                  })()}
                </div>
              ) : null}

              <PriceInput
                label={t("calc.substructure.ui.price.concrete", { defaultValue: "Concrete (€/m³)" })}
                k={KEYS.CONCRETE}
                fallback={Number((DEFAULT_PRICES as any)?.BPE_M3 ?? 130)}
                hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.CONCRETE, defaultValue: `Key: ${KEYS.CONCRETE}` })}
              />

              {wallMode === "masonry" ? (
                <>
                  <PriceInput
                    label={t("calc.substructure.ui.price.mortar", { defaultValue: "Mortar (€/25kg bag)" })}
                    k={KEYS.MORTAR}
                    fallback={Number((DEFAULT_PRICES as any)?.MORTAR_BAG_25KG ?? 8)}
                    hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.MORTAR, defaultValue: `Key: ${KEYS.MORTAR}` })}
                  />
                  <PriceInput
                    label={t("calc.substructure.ui.price.glue", { defaultValue: "Adhesive (€/25kg bag)" })}
                    k={KEYS.GLUE}
                    fallback={Number((DEFAULT_PRICES as any)?.MORTAR_BAG_25KG ?? 8)}
                    hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.GLUE, defaultValue: `Key: ${KEYS.GLUE}` })}
                  />
                </>
              ) : null}

              {useBitumen ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.bitumen", { defaultValue: "Bitumen (€/25kg bucket)" })}
                  k={KEYS.BITUMEN}
                  fallback={Number((DEFAULT_PRICES as any)?.BITUMEN_COATING_BUCKET_25KG ?? 55)}
                  hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.BITUMEN, defaultValue: `Key: ${KEYS.BITUMEN}` })}
                />
              ) : null}

              {useDeltaMS ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.delta_roll", { defaultValue: "Delta MS (€/roll ~20m²)" })}
                  k={KEYS.DELTA_ROLL}
                  fallback={Number((DEFAULT_PRICES as any)?.DELTA_MS_ROLL_20M ?? 120)}
                  hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.DELTA_ROLL, defaultValue: `Key: ${KEYS.DELTA_ROLL}` })}
                />
              ) : null}

              {useDeltaMS ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.delta_profile", { defaultValue: "Delta profile (€/pc)" })}
                  k={KEYS.DELTA_PROFILE}
                  fallback={8}
                  hint={t("calc.substructure.ui.price.fallback_hint", { defaultValue: "Local fallback (if not in catalog)" })}
                />
              ) : null}

              {useArase ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.dpc_roll", { defaultValue: "DPC strip (€/roll 20m)" })}
                  k={KEYS.ARASE_ROLL}
                  fallback={15}
                  hint={t("calc.substructure.ui.price.fallback_hint", { defaultValue: "Local fallback (if not in catalog)" })}
                />
              ) : null}

              {useDrain ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.drain_roll", { defaultValue: "Drain pipe (€/roll 50m)" })}
                  k={KEYS.DRAIN_ROLL}
                  fallback={Number((DEFAULT_PRICES as any)?.DRAIN_PIPE_50M ?? 70)}
                  hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.DRAIN_ROLL, defaultValue: `Key: ${KEYS.DRAIN_ROLL}` })}
                />
              ) : null}

              {useDrain ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.gravel_ton", { defaultValue: "Gravel (€/ton)" })}
                  k={KEYS.GRAVEL_TON}
                  fallback={Number((DEFAULT_PRICES as any)?.GRAVEL_FOUNDATION_TON ?? 45)}
                  hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.GRAVEL_TON, defaultValue: `Key: ${KEYS.GRAVEL_TON}` })}
                />
              ) : null}

              {useDrain && useGeo ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.geo_m2", { defaultValue: "Geotextile (€/m²)" })}
                  k={KEYS.GEO_M2}
                  fallback={Number((DEFAULT_PRICES as any)?.GEOTEXTILE_M2 ?? 1.2)}
                  hint={t("calc.substructure.ui.price.key_hint", { k: KEYS.GEO_M2, defaultValue: `Key: ${KEYS.GEO_M2}` })}
                />
              ) : null}

              {useDrain ? (
                <PriceInput
                  label={t("calc.substructure.ui.price.manhole_unit", { defaultValue: "Manhole (€/pc)" })}
                  k={KEYS.MANHOLE}
                  fallback={45}
                  hint={t("calc.substructure.ui.price.fallback_value_hint", { v: 45, defaultValue: "Fallback: 45" })}
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold shadow-sm flex justify-center items-center"
            >
              <Check size={18} className="mr-2" /> {t("common.done", { defaultValue: "Done" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * i18n keys you should add (examples):
 * - common.next / common.back / common.done / common.increase / common.decrease
 * - calc.substructure.*
 *
 * This file now contains no hardcoded UI strings (everything goes through t(..., defaultValue)).
 * Remaining non-translated text comes from data/specs (selectedSpec.label), which is expected.
 */