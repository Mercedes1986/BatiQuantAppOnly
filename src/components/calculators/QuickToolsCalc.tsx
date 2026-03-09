import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  Cable,
  Grid2x2,
  Package2,
  PanelsTopLeft,
  Ruler,
  TrendingUp,
  Home,
  LayoutGrid,
  PaintBucket,
} from "lucide-react";

import { CalculatorType, CalculationResult, MaterialItem, Unit } from "../../types";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

export type ToolKey =
  | "convert"
  | "netArea"
  | "packaging"
  | "slope"
  | "linear"
  | "voltageDrop"
  | "decking"
  | "drywallFrame"
  | "tileDetailed"
  | "packagingAdvanced"
  | "roofFrame"
  | "fence"
  | "bulkFill"
  | "insulation";

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialArea?: number;
  initialPerimeter?: number;
  forcedTool?: ToolKey;
  hideToolSelector?: boolean;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const toNum = (v: string | number, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const ceilUnits = new Set<Unit>([Unit.PIECE, Unit.BAG, Unit.BUCKET, Unit.BOX, Unit.ROLL, Unit.PALLET]);
const formatQty = (value: number, unit: Unit) => (ceilUnits.has(unit) ? Math.ceil(value) : round2(value));

const makeMaterial = (
  id: string,
  name: string,
  quantityRaw: number,
  unit: Unit,
  details?: string,
  unitPrice = 0
): MaterialItem => {
  const finalQty = formatQty(quantityRaw, unit);
  return {
    id,
    name,
    quantityRaw: round2(quantityRaw),
    quantity: finalQty,
    unit,
    unitPrice,
    totalPrice: round2(finalQty * unitPrice),
    category: CalculatorType.QUICK_TOOLS,
    details,
  };
};


const getLang = () => {
  try {
    const stored = typeof window !== "undefined" ? window.localStorage?.getItem("i18nextLng") : "";
    if (stored) return stored;
  } catch {}
  try {
    if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  } catch {}
  return "fr";
};

const tr = (fr: string, en: string) => (getLang().toLowerCase().startsWith("fr") ? fr : en);
const trText = (fr: string, en: string) => tr(fr, en);

const toolButtonMeta = [
  { key: "convert" as const, icon: ArrowRightLeft },
  { key: "netArea" as const, icon: Ruler },
  { key: "packaging" as const, icon: Package2 },
  { key: "slope" as const, icon: TrendingUp },
  { key: "linear" as const, icon: Ruler },
  { key: "voltageDrop" as const, icon: Cable },
  { key: "decking" as const, icon: LayoutGrid },
  { key: "drywallFrame" as const, icon: PanelsTopLeft },
  { key: "tileDetailed" as const, icon: Grid2x2 },
  { key: "packagingAdvanced" as const, icon: PaintBucket },
  { key: "roofFrame" as const, icon: Home },
  { key: "fence" as const, icon: Ruler },
  { key: "bulkFill" as const, icon: Package2 },
  { key: "insulation" as const, icon: PanelsTopLeft },
];

const packagingPresets = {
  tileAdhesive: {
    label: trText("Colle carrelage", "Tile adhesive"),
    baseUnit: "m²",
    consumptionUnit: "kg",
    packageUnit: Unit.BAG,
    rate: 4.5,
    packSize: 25,
    unitPrice: 18,
  },
  grout: {
    label: "Joint poudre",
    baseUnit: "m²",
    consumptionUnit: "kg",
    packageUnit: Unit.BAG,
    rate: 0.4,
    packSize: 5,
    unitPrice: 9,
  },
  paint: {
    label: "Peinture finition",
    baseUnit: "m²",
    consumptionUnit: "L",
    packageUnit: Unit.BUCKET,
    rate: 0.12,
    packSize: 10,
    unitPrice: 85,
  },
  primer: {
    label: trText("Primaire", "Primer"),
    baseUnit: "m²",
    consumptionUnit: "L",
    packageUnit: Unit.BUCKET,
    rate: 0.15,
    packSize: 5,
    unitPrice: 35,
  },
  silicone: {
    label: "Silicone",
    baseUnit: "m",
    consumptionUnit: "cartouche",
    packageUnit: Unit.PIECE,
    rate: 1 / 12,
    packSize: 1,
    unitPrice: 7.5,
  },
  foam: {
    label: "Mousse PU",
    baseUnit: "m",
    consumptionUnit: "cartouche",
    packageUnit: Unit.PIECE,
    rate: 0.45,
    packSize: 1,
    unitPrice: 9.9,
  },
} as const;

type PackagingPresetKey = keyof typeof packagingPresets;

export const QuickToolsCalculator: React.FC<Props> = ({
  onCalculate,
  initialArea,
  initialPerimeter,
  forcedTool,
  hideToolSelector = false,
}) => {
  const { t, i18n } = useTranslation();
  const [tool, setTool] = useState<ToolKey>(forcedTool ?? "convert");

  useEffect(() => {
    if (forcedTool) setTool(forcedTool);
  }, [forcedTool]);

  const isFr = (i18n.resolvedLanguage || i18n.language || getLang()).toLowerCase().startsWith("fr");
  const trText = (fr: string, en: string) => (isFr ? fr : en);
  const qt = (key: string, fr: string, en: string, options: Record<string, unknown> = {}) =>
    t(key, { ...options, defaultValue: trText(fr, en) });
  const unitLabel = (unit: string) => {
    switch (unit) {
      case "cartouche":
        return trText("cartouche", "cartridge");
      case "sac":
        return trText("sac", "bag");
      case "rangs":
        return trText("rangs", "rows");
      default:
        return unit;
    }
  };
  const packPresetLabel = (key: PackagingPresetKey) => ({
    tileAdhesive: trText("Colle carrelage", "Tile adhesive"),
    grout: trText("Joint poudre", "Powder grout"),
    paint: trText("Peinture finition", "Finish paint"),
    primer: trText("Primaire", "Primer"),
    silicone: trText("Silicone", "Silicone"),
    foam: trText("Mousse PU", "PU foam"),
  }[key]);

  // Shared basic tools
  const [area, setArea] = useState(String(initialArea ?? 50));
  const [thicknessCm, setThicknessCm] = useState("10");
  const [liters, setLiters] = useState("200");
  const [bagYieldM3, setBagYieldM3] = useState("0.015");

  const [wallLength, setWallLength] = useState("8");
  const [wallHeight, setWallHeight] = useState("2.5");
  const [openingsCount, setOpeningsCount] = useState("2");
  const [openingArea, setOpeningArea] = useState("1.8");
  const [wastePercent, setWastePercent] = useState("10");

  const [consumptionBase, setConsumptionBase] = useState("35");
  const [consumptionRate, setConsumptionRate] = useState("1.7");
  const [packSize, setPackSize] = useState("25");
  const [packUnitPrice, setPackUnitPrice] = useState("18");
  const [baseUnit, setBaseUnit] = useState<"m²" | "m³" | "m">("m²");
  const [consumptionUnit, setConsumptionUnit] = useState<"kg" | "L" | "cartouche" | "sac">("kg");
  const [packageUnit, setPackageUnit] = useState<Unit>(Unit.BAG);

  const [run, setRun] = useState("4");
  const [rise, setRise] = useState("0.08");

  const [totalLength, setTotalLength] = useState(String(initialPerimeter ?? 24));
  const [pieceLength, setPieceLength] = useState("3");
  const [overlapCm, setOverlapCm] = useState("5");
  const [linearWastePercent, setLinearWastePercent] = useState("8");

  const [phase, setPhase] = useState<"mono" | "tri">("mono");
  const [power, setPower] = useState("3500");
  const [voltage, setVoltage] = useState("230");
  const [cableLength, setCableLength] = useState("25");
  const [section, setSection] = useState("2.5");
  const [conductor, setConductor] = useState<"copper" | "aluminium">("copper");

  // New calculators
  const [deckLength, setDeckLength] = useState("6");
  const [deckWidth, setDeckWidth] = useState("4");
  const [boardWidthMm, setBoardWidthMm] = useState("145");
  const [boardGapMm, setBoardGapMm] = useState("5");
  const [boardLengthM, setBoardLengthM] = useState("4");
  const [joistSpacingCm, setJoistSpacingCm] = useState("40");
  const [joistLengthM, setJoistLengthM] = useState("4");
  const [pedestalSpacingCm, setPedestalSpacingCm] = useState("50");
  const [screwsPerSupport, setScrewsPerSupport] = useState("2");
  const [deckWastePercent, setDeckWastePercent] = useState("8");

  const [drywallMode, setDrywallMode] = useState<"partition" | "lining" | "ceiling">("partition");
  const [drywallLength, setDrywallLength] = useState("5");
  const [drywallHeight, setDrywallHeight] = useState("2.5");
  const [drywallArea, setDrywallArea] = useState(String(initialArea ?? 25));
  const [studSpacingCm, setStudSpacingCm] = useState("60");
  const [boardWidthM, setBoardWidthM] = useState("1.2");
  const [boardHeightM, setBoardHeightM] = useState("2.5");
  const [boardLayers, setBoardLayers] = useState("1");
  const [railLengthM, setRailLengthM] = useState("3");
  const [studLengthM, setStudLengthM] = useState("2.5");
  const [screwsPerBoard, setScrewsPerBoard] = useState("35");

  const [tileLength, setTileLength] = useState("5");
  const [tileWidth, setTileWidth] = useState("4");
  const [tileAreaOpenings, setTileAreaOpenings] = useState("0");
  const [tileWastePercent, setTileWastePercent] = useState("10");
  const [poseType, setPoseType] = useState<"straight" | "diagonal">("straight");
  const [tileLenCm, setTileLenCm] = useState("60");
  const [tileWidCm, setTileWidCm] = useState("60");
  const [adhesiveRate, setAdhesiveRate] = useState("4.5");
  const [groutRate, setGroutRate] = useState("0.4");
  const [skirtingHeightCm, setSkirtingHeightCm] = useState("8");

  const [packPreset, setPackPreset] = useState<PackagingPresetKey>("tileAdhesive");
  const [advBaseQty, setAdvBaseQty] = useState("35");
  const [advBaseUnit, setAdvBaseUnit] = useState<"m²" | "m³" | "m" | "unit">("m²");
  const [advConsumptionRate, setAdvConsumptionRate] = useState("4.5");
  const [advConsumptionUnit, setAdvConsumptionUnit] = useState<"kg" | "L" | "cartouche" | "sac">("kg");
  const [advPackSize, setAdvPackSize] = useState("25");
  const [advPackUnit, setAdvPackUnit] = useState<Unit>(Unit.BAG);
  const [advUnitPrice, setAdvUnitPrice] = useState("18");
  const [advCoats, setAdvCoats] = useState("1");
  const [advWaste, setAdvWaste] = useState("8");

  const [roofSpanM, setRoofSpanM] = useState("8");
  const [roofLengthM, setRoofLengthM] = useState("10");
  const [roofRiseM, setRoofRiseM] = useState("2");
  const [roofOverhangCm, setRoofOverhangCm] = useState("30");
  const [rafterSpacingCm, setRafterSpacingCm] = useState("60");
  const [battenGapCm, setBattenGapCm] = useState("35");
  const [battenLengthM, setBattenLengthM] = useState("4");
  const [underlayRollM2, setUnderlayRollM2] = useState("75");
  const [tileCoveragePerM2, setTileCoveragePerM2] = useState("10");

  const [fenceLength, setFenceLength] = useState("20");
  const [fenceHeight, setFenceHeight] = useState("1.8");
  const [panelWidth, setPanelWidth] = useState("2");
  const [concretePerPostM3, setConcretePerPostM3] = useState("0.025");
  const [fenceWastePercent, setFenceWastePercent] = useState("5");

  const [bulkLength, setBulkLength] = useState("5");
  const [bulkWidth, setBulkWidth] = useState("3");
  const [bulkDepthCm, setBulkDepthCm] = useState("10");
  const [bulkWastePercent, setBulkWastePercent] = useState("5");
  const [bulkDensity, setBulkDensity] = useState("1.6");
  const [bigBagSizeTons, setBigBagSizeTons] = useState("1");
  const [geoOverlapPercent, setGeoOverlapPercent] = useState("10");

  const [insulationMode, setInsulationMode] = useState<"wall" | "attic">("wall");
  const [insulationArea, setInsulationArea] = useState(String(initialArea ?? 50));
  const [insulationThicknessMm, setInsulationThicknessMm] = useState("120");
  const [insulationLambda, setInsulationLambda] = useState("0.038");
  const [insulationCoverageRoll, setInsulationCoverageRoll] = useState("10");
  const [insulationWastePercent, setInsulationWastePercent] = useState("8");

  useEffect(() => {
    const preset = packagingPresets[packPreset];
    setAdvBaseUnit(preset.baseUnit as "m²" | "m³" | "m");
    setAdvConsumptionUnit(preset.consumptionUnit);
    setAdvPackUnit(preset.packageUnit);
    setAdvConsumptionRate(String(preset.rate));
    setAdvPackSize(String(preset.packSize));
    setAdvUnitPrice(String(preset.unitPrice));
  }, [packPreset]);

  const toolLabels: Record<ToolKey, string> = {
    convert: qt("quick.tools.convert", "Convertisseur", "Converter"),
    netArea: qt("quick.tools.net_area", "Surface nette", "Net area"),
    packaging: qt("quick.tools.packaging", "Conditionnements", "Packaging"),
    slope: qt("quick.tools.slope", "Pente", "Slope"),
    linear: qt("quick.tools.linear", "Linéaires", "Linear runs"),
    voltageDrop: qt("quick.tools.voltage_drop", "Chute de tension", "Voltage drop"),
    decking: qt("quick.tools.decking", "Terrasse bois", "Timber deck"),
    drywallFrame: qt("quick.tools.drywall_frame", "Placo détaillé ossature", "Detailed drywall"),
    tileDetailed: qt("quick.tools.tile_detailed", "Carrelage détaillé", "Detailed tiling"),
    packagingAdvanced: qt("quick.tools.packaging_advanced", "Sacs / seaux / cartouches", "Bags / buckets / cartridges"),
    roofFrame: qt("quick.tools.roof_frame", "Toiture / chevrons / liteaux", "Roof / rafters / battens"),
    fence: qt("quick.tools.fence", "Clôture / grillage", "Fence / mesh"),
    bulkFill: qt("quick.tools.bulk_fill", "Gravier / remblai / sable", "Gravel / fill / sand"),
    insulation: qt("quick.tools.insulation", "Isolation murs / combles", "Wall / attic insulation"),
  };

  const toolButtons = toolButtonMeta.map(({ key, icon }) => ({
    key,
    icon,
    label: toolLabels[key],
  }));

  const result = useMemo<CalculationResult>(() => {
    const warnings: string[] = [];
    let details: CalculationResult["details"] = [];
    let materials: MaterialItem[] = [];
    let summary = "";
    let totalCost = 0;

    switch (tool) {
      case "convert": {
        const a = toNum(area);
        const tCm = toNum(thicknessCm);
        const l = toNum(liters);
        const yieldM3 = toNum(bagYieldM3, 0.015);
        const volume = a * (tCm / 100);
        const m3FromLiters = l / 1000;
        const bags = yieldM3 > 0 ? volume / yieldM3 : 0;

        if (tCm <= 0)
          warnings.push(
            t("quick.warn_thickness", { defaultValue: "L'épaisseur doit être supérieure à 0." })
          );

        summary = t("quick.summary.convert", {
          defaultValue: "{{area}} m² sur {{thickness}} cm représentent {{volume}} m³.",
          area: round2(a),
          thickness: round2(tCm),
          volume: round2(volume),
        });

        details = [
          {
            label: t("quick.detail.area", { defaultValue: "Surface" }),
            value: round2(a),
            unit: "m²",
          },
          {
            label: t("quick.detail.thickness", { defaultValue: "Épaisseur" }),
            value: round2(tCm),
            unit: "cm",
          },
          {
            label: t("quick.detail.volume", { defaultValue: "Volume" }),
            value: round2(volume),
            unit: "m³",
          },
          {
            label: t("quick.detail.liters_to_m3", {
              defaultValue: "Conversion litres → m³",
            }),
            value: round2(m3FromLiters),
            unit: "m³",
          },
          {
            label: t("quick.detail.bags_needed", { defaultValue: "Sacs nécessaires" }),
            value: Math.ceil(bags),
            unit: Unit.BAG,
          },
        ];

        materials = [
          makeMaterial(
            "bags",
            t("quick.material.bags", { defaultValue: "Sacs théoriques" }),
            bags,
            Unit.BAG,
            t("quick.material.bags_detail", { defaultValue: "Basé sur le rendement saisi" })
          ),
        ];
        break;
      }

      case "netArea": {
        const l = toNum(wallLength);
        const h = toNum(wallHeight);
        const count = Math.max(0, Math.floor(toNum(openingsCount)));
        const oneOpeningArea = toNum(openingArea);
        const waste = Math.max(0, toNum(wastePercent));

        const gross = l * h;
        const openings = count * oneOpeningArea;
        const net = Math.max(0, gross - openings);
        const withWaste = net * (1 + waste / 100);

        if (openings > gross)
          warnings.push(
            t("quick.warn_openings", {
              defaultValue: "La surface des ouvertures dépasse la surface brute.",
            })
          );

        summary = t("quick.summary.net_area", {
          defaultValue: "Surface nette calculée : {{net}} m², soit {{withWaste}} m² avec pertes.",
          net: round2(net),
          withWaste: round2(withWaste),
        });

        details = [
          {
            label: t("quick.detail.gross_area", { defaultValue: "Surface brute" }),
            value: round2(gross),
            unit: "m²",
          },
          {
            label: t("quick.detail.openings", { defaultValue: "Déduction ouvertures" }),
            value: round2(openings),
            unit: "m²",
          },
          {
            label: t("quick.detail.net_area", { defaultValue: "Surface nette" }),
            value: round2(net),
            unit: "m²",
          },
          {
            label: t("quick.detail.loss", { defaultValue: "Pertes" }),
            value: round2(waste),
            unit: "%",
          },
          {
            label: t("quick.detail.with_waste", { defaultValue: "Surface avec pertes" }),
            value: round2(withWaste),
            unit: "m²",
          },
        ];

        materials = [
          makeMaterial(
            "net-area",
            t("quick.material.net_area", { defaultValue: "Surface exploitable" }),
            withWaste,
            Unit.M2
          ),
        ];
        break;
      }

      case "packaging": {
        const base = toNum(consumptionBase);
        const rate = toNum(consumptionRate);
        const size = toNum(packSize);
        const unitPrice = toNum(packUnitPrice);
        const rawQty = base * rate;
        const packs = size > 0 ? rawQty / size : 0;
        totalCost = Math.ceil(packs) * unitPrice;

        summary = t("quick.summary.packaging", {
          defaultValue: "{{raw}} {{unit}} nécessaires, soit {{packs}} conditionnements.",
          raw: round2(rawQty),
          unit: consumptionUnit,
          packs: Math.ceil(packs),
        });

        details = [
          {
            label: t("quick.detail.base_quantity", { defaultValue: `Base (${baseUnit})` }),
            value: round2(base),
            unit: baseUnit,
          },
          {
            label: t("quick.detail.consumption", { defaultValue: "Consommation unitaire" }),
            value: round2(rate),
            unit: `${consumptionUnit}/${baseUnit}`,
          },
          {
            label: t("quick.detail.total_need", { defaultValue: "Besoin total" }),
            value: round2(rawQty),
            unit: consumptionUnit,
          },
          {
            label: t("quick.detail.pack_size", { defaultValue: "Conditionnement" }),
            value: round2(size),
            unit: consumptionUnit,
          },
          {
            label: t("quick.detail.pack_count", {
              defaultValue: "Nombre de conditionnements",
            }),
            value: Math.ceil(packs),
            unit: packageUnit,
          },
        ];

        materials = [
          makeMaterial(
            "packaging",
            t("quick.material.packaging", { defaultValue: "Conditionnements nécessaires" }),
            packs,
            packageUnit,
            `${round2(rawQty)} ${consumptionUnit} au total`,
            unitPrice
          ),
        ];
        break;
      }

      case "slope": {
        const horizontal = toNum(run);
        const vertical = toNum(rise);
        const percent = horizontal > 0 ? (vertical / horizontal) * 100 : 0;
        const angle = Math.atan2(vertical, horizontal) * (180 / Math.PI);
        const cmPerM = horizontal > 0 ? (vertical / horizontal) * 100 : 0;
        const hyp = Math.sqrt(horizontal ** 2 + vertical ** 2);

        summary = t("quick.summary.slope", {
          defaultValue: "Pente de {{percent}} %, soit {{cm}} cm/m et {{angle}}°.",
          percent: round2(percent),
          cm: round2(cmPerM),
          angle: round2(angle),
        });

        details = [
          {
            label: t("quick.detail.horizontal", {
              defaultValue: "Longueur horizontale",
            }),
            value: round2(horizontal),
            unit: "m",
          },
          {
            label: t("quick.detail.vertical", { defaultValue: "Dénivelé" }),
            value: round2(vertical),
            unit: "m",
          },
          {
            label: t("quick.detail.percent", { defaultValue: "Pente" }),
            value: round2(percent),
            unit: "%",
          },
          {
            label: t("quick.detail.cm_per_m", {
              defaultValue: "Centimètres par mètre",
            }),
            value: round2(cmPerM),
            unit: "cm/m",
          },
          {
            label: t("quick.detail.angle", { defaultValue: "Angle" }),
            value: round2(angle),
            unit: "°",
          },
          {
            label: t("quick.detail.ramp_length", {
              defaultValue: "Longueur réelle",
            }),
            value: round2(hyp),
            unit: "m",
          },
        ];
        break;
      }

      case "linear": {
        const total = toNum(totalLength);
        const piece = toNum(pieceLength);
        const overlap = toNum(overlapCm) / 100;
        const waste = toNum(linearWastePercent);
        const effectivePiece = Math.max(0, piece - overlap);
        const adjustedTotal = total * (1 + waste / 100);
        const pieces = effectivePiece > 0 ? adjustedTotal / effectivePiece : 0;
        const purchasedLength = Math.ceil(pieces) * piece;
        const offcut = Math.max(0, purchasedLength - adjustedTotal);

        summary = t("quick.summary.linear", {
          defaultValue:
            "{{pieces}} pièces nécessaires pour couvrir {{total}} m linéaires.",
          pieces: Math.ceil(pieces),
          total: round2(adjustedTotal),
        });

        details = [
          {
            label: t("quick.detail.linear_total", { defaultValue: "Longueur utile" }),
            value: round2(total),
            unit: "m",
          },
          {
            label: t("quick.detail.linear_overlap", { defaultValue: "Recouvrement" }),
            value: round2(overlap * 100),
            unit: "cm",
          },
          {
            label: t("quick.detail.linear_effective", {
              defaultValue: "Longueur utile par pièce",
            }),
            value: round2(effectivePiece),
            unit: "m",
          },
          {
            label: t("quick.detail.linear_with_waste", {
              defaultValue: "Longueur avec pertes",
            }),
            value: round2(adjustedTotal),
            unit: "m",
          },
          {
            label: t("quick.detail.linear_pieces", {
              defaultValue: "Nombre de pièces",
            }),
            value: Math.ceil(pieces),
            unit: Unit.PIECE,
          },
          {
            label: t("quick.detail.linear_offcut", {
              defaultValue: "Chutes estimées",
            }),
            value: round2(offcut),
            unit: "m",
          },
        ];

        materials = [
          makeMaterial(
            "linear-pieces",
            t("quick.material.linear_pieces", { defaultValue: "Pièces linéaires" }),
            pieces,
            Unit.PIECE,
            `${round2(piece)} m par pièce`
          ),
        ];
        break;
      }

      case "voltageDrop": {
        const p = toNum(power);
        const u = toNum(voltage, phase === "mono" ? 230 : 400);
        const l = toNum(cableLength);
        const s = toNum(section);
        const rho = conductor === "copper" ? 0.018 : 0.028;
        const current = phase === "mono" ? p / u : p / (Math.sqrt(3) * u);
        const dropVolts =
          s > 0
            ? phase === "mono"
              ? (2 * rho * l * current) / s
              : (Math.sqrt(3) * rho * l * current) / s
            : 0;
        const dropPercent = u > 0 ? (dropVolts / u) * 100 : 0;

        const candidateSections = [1.5, 2.5, 4, 6, 10, 16, 25, 35];
        const recommended =
          candidateSections.find((candidate) => {
            const dv =
              phase === "mono"
                ? (2 * rho * l * current) / candidate
                : (Math.sqrt(3) * rho * l * current) / candidate;
            return u > 0 ? (dv / u) * 100 <= 3 : false;
          }) || candidateSections[candidateSections.length - 1];

        if (dropPercent > 5)
          warnings.push(
            t("quick.warn_voltage_high", {
              defaultValue:
                "Chute de tension élevée : section ou longueur à revoir.",
            })
          );
        else if (dropPercent > 3)
          warnings.push(
            t("quick.warn_voltage_medium", {
              defaultValue:
                "La chute de tension dépasse 3 %, à vérifier selon l'usage.",
            })
          );

        summary = t("quick.summary.voltage", {
          defaultValue:
            "Chute estimée : {{volts}} V ({{percent}} %). Section indicative recommandée : {{section}} mm².",
          volts: round2(dropVolts),
          percent: round2(dropPercent),
          section: recommended,
        });

        details = [
          {
            label: t("quick.detail.phase", { defaultValue: "Réseau" }),
            value: phase === "mono" ? "Monophasé" : "Triphasé",
          },
          {
            label: t("quick.detail.current", {
              defaultValue: "Intensité estimée",
            }),
            value: round2(current),
            unit: "A",
          },
          {
            label: t("quick.detail.length", { defaultValue: "Longueur" }),
            value: round2(l),
            unit: "m",
          },
          {
            label: t("quick.detail.section", { defaultValue: "Section utilisée" }),
            value: round2(s),
            unit: "mm²",
          },
          {
            label: t("quick.detail.drop_volts", {
              defaultValue: "Chute de tension",
            }),
            value: round2(dropVolts),
            unit: "V",
          },
          {
            label: t("quick.detail.drop_percent", {
              defaultValue: "Chute de tension",
            }),
            value: round2(dropPercent),
            unit: "%",
          },
          {
            label: t("quick.detail.section_recommended", {
              defaultValue: "Section indicative recommandée",
            }),
            value: recommended,
            unit: "mm²",
          },
        ];
        break;
      }

      case "decking": {
        const length = toNum(deckLength);
        const width = toNum(deckWidth);
        const boardWidth = toNum(boardWidthMm) / 1000;
        const gap = toNum(boardGapMm) / 1000;
        const boardLen = toNum(boardLengthM);
        const joistSpacing = toNum(joistSpacingCm) / 100;
        const joistPieceLen = toNum(joistLengthM);
        const pedestalSpacing = toNum(pedestalSpacingCm) / 100;
        const screwRate = Math.max(2, toNum(screwsPerSupport));
        const waste = toNum(deckWastePercent);

        const areaVal = length * width;
        const rowModule = Math.max(0.001, boardWidth + gap);
        const rows = Math.ceil(width / rowModule);
        const totalBoardLinear = rows * length * (1 + waste / 100);
        const boardPieces = boardLen > 0 ? totalBoardLinear / boardLen : 0;
        const joistLines = joistSpacing > 0 ? Math.ceil(length / joistSpacing) + 1 : 0;
        const joistLinear = joistLines * width * (1 + waste / 100);
        const joistPieces = joistPieceLen > 0 ? joistLinear / joistPieceLen : 0;
        const pedestalsPerJoist =
          pedestalSpacing > 0 ? Math.ceil(width / pedestalSpacing) + 1 : 0;
        const pedestals = joistLines * pedestalsPerJoist;
        const screws = rows * joistLines * screwRate;

        if (boardLen <= 0 || joistPieceLen <= 0)
          warnings.push(trText("Renseigner des longueurs de pièces supérieures à 0.", "Enter piece lengths greater than 0."));

        summary = trText(`${round2(areaVal)} m² de terrasse ≈ ${Math.ceil(boardPieces)} lames, ${Math.ceil(joistPieces)} lambourdes et ${Math.ceil(pedestals)} plots.`, `${round2(areaVal)} m² of deck ≈ ${Math.ceil(boardPieces)} boards, ${Math.ceil(joistPieces)} joists and ${Math.ceil(pedestals)} pedestals.`);
        details = [
          { label: trText("Surface terrasse", "Deck area"), value: round2(areaVal), unit: "m²" },
          { label: trText("Nombre de rangs", "Number of rows"), value: rows, unit: unitLabel("rangs") },
          { label: trText("ML de lames", "Board linear metres"), value: round2(totalBoardLinear), unit: "m" },
          { label: trText("Lames", "Boards"), value: Math.ceil(boardPieces), unit: Unit.PIECE },
          { label: trText("ML de lambourdes", "Joist linear metres"), value: round2(joistLinear), unit: "m" },
          { label: trText("Lambourdes", "Joists"), value: Math.ceil(joistPieces), unit: Unit.PIECE },
          { label: trText("Plots", "Pedestals"), value: Math.ceil(pedestals), unit: Unit.PIECE },
          { label: trText("Vis inox", "Stainless screws"), value: Math.ceil(screws), unit: Unit.PIECE },
        ];
        materials = [
          makeMaterial(
            "deck-boards",
            trText("Lames de terrasse", "Deck boards"),
            boardPieces,
            Unit.PIECE,
            trText(`${round2(boardLen)} m par lame`, `${round2(boardLen)} m per board`)
          ),
          makeMaterial(
            "deck-joists",
            trText("Lambourdes", "Joists"),
            joistPieces,
            Unit.PIECE,
            trText(`${round2(joistPieceLen)} m par lambourde`, `${round2(joistPieceLen)} m per joist`)
          ),
          makeMaterial("deck-pedestals", trText("Plots", "Pedestals"), pedestals, Unit.PIECE),
          makeMaterial("deck-screws", trText("Vis inox", "Stainless screws"), screws, Unit.PIECE),
        ];
        break;
      }

      case "drywallFrame": {
        const mode = drywallMode;
        const length = toNum(drywallLength);
        const height = toNum(drywallHeight);
        const explicitArea = toNum(drywallArea);
        const spacing = toNum(studSpacingCm) / 100;
        const boardArea = toNum(boardWidthM) * toNum(boardHeightM);
        const layers = Math.max(1, Math.round(toNum(boardLayers, 1)));
        const railLen = toNum(railLengthM);
        const studLen = toNum(studLengthM);
        const screwQtyPerBoard = Math.max(20, Math.round(toNum(screwsPerBoard, 35)));

        const baseArea = mode === "ceiling" ? explicitArea : length * height;
        const areaWithLayers = baseArea * layers;
        const boards = boardArea > 0 ? areaWithLayers / boardArea : 0;

        let railsLinear = 0;
        let studCount = 0;
        let hangerCount = 0;
        let furringLinear = 0;

        if (mode === "partition") {
          railsLinear = length * 2;
          studCount = spacing > 0 ? Math.ceil(length / spacing) + 1 : 0;
        } else if (mode === "lining") {
          railsLinear = length * 2;
          studCount = spacing > 0 ? Math.ceil(length / spacing) + 1 : 0;
        } else {
          const side = Math.sqrt(Math.max(baseArea, 0));
          furringLinear =
            side > 0 && spacing > 0
              ? (Math.ceil(side / spacing) + 1) * side
              : 0;
          hangerCount =
            side > 0 && spacing > 0
              ? (Math.ceil(side / 1.2) + 1) * (Math.ceil(side / spacing) + 1)
              : 0;
        }

        const studPieces = studLen > 0 ? (studCount * height) / studLen : 0;
        const railPieces = railLen > 0 ? railsLinear / railLen : 0;
        const furringPieces = railLen > 0 ? furringLinear / railLen : 0;
        const screws = boards * screwQtyPerBoard;
        const tapeMl = baseArea * 1.3;
        const jointCompoundKg = baseArea * 0.35 * layers;
        totalCost = 0;

        summary =
          mode === "ceiling"
            ? trText(
                `${round2(baseArea)} m² de plafond ≈ ${Math.ceil(boards)} plaques, ${Math.ceil(furringPieces)} fourrures et ${Math.ceil(hangerCount)} suspentes.`,
                `${round2(baseArea)} m² ceiling ≈ ${Math.ceil(boards)} boards, ${Math.ceil(furringPieces)} furrings and ${Math.ceil(hangerCount)} hangers.`
              )
            : trText(
                `${round2(baseArea)} m² de ${mode === "partition" ? "cloison" : "doublage"} ≈ ${Math.ceil(boards)} plaques, ${Math.ceil(railPieces)} rails et ${Math.ceil(studPieces)} montants.`,
                `${round2(baseArea)} m² ${mode === "partition" ? "partition" : "lining"} ≈ ${Math.ceil(boards)} boards, ${Math.ceil(railPieces)} tracks and ${Math.ceil(studPieces)} studs.`
              );

        details = [
          {
            label: "Mode",
            value:
              mode === "partition"
                ? trText("Cloison", "Partition")
                : mode === "lining"
                ? trText("Doublage", "Lining")
                : trText("Plafond", "Ceiling"),
          },
          { label: trText("Surface utile", "Useful area"), value: round2(baseArea), unit: "m²" },
          { label: trText("Plaques", "Boards"), value: Math.ceil(boards), unit: Unit.PLATE },
          ...(mode === "ceiling"
            ? [
                {
                  label: trText("ML de fourrures", "Furring linear metres"),
                  value: round2(furringLinear),
                  unit: "m",
                },
                {
                  label: trText("Fourrures", "Furrings"),
                  value: Math.ceil(furringPieces),
                  unit: Unit.PIECE,
                },
                {
                  label: trText("Suspentes", "Hangers"),
                  value: Math.ceil(hangerCount),
                  unit: Unit.PIECE,
                },
              ]
            : [
                {
                  label: trText("ML de rails", "Track linear metres"),
                  value: round2(railsLinear),
                  unit: "m",
                },
                {
                  label: trText("Rails", "Tracks"),
                  value: Math.ceil(railPieces),
                  unit: Unit.PIECE,
                },
                {
                  label: trText("Montants", "Studs"),
                  value: Math.ceil(studPieces),
                  unit: Unit.PIECE,
                },
              ]),
          { label: trText("Vis placo", "Drywall screws"), value: Math.ceil(screws), unit: Unit.PIECE },
          { label: trText("Bande à joint", "Joint tape"), value: round2(tapeMl), unit: "m" },
          {
            label: trText("Enduit à joint", "Joint compound"),
            value: round2(jointCompoundKg),
            unit: "kg",
          },
        ];

        materials = [
          makeMaterial(
            "drywall-boards",
            trText("Plaques de plâtre", "Plasterboards"),
            boards,
            Unit.PLATE,
            `${round2(toNum(boardWidthM))} × ${round2(toNum(boardHeightM))} m`
          ),
          ...(mode === "ceiling"
            ? [
                makeMaterial(
                  "drywall-furrings",
                  "Fourrures",
                  furringPieces,
                  Unit.PIECE,
                  trText(`${round2(railLen)} m par fourrure`, `${round2(railLen)} m per furring`)
                ),
                makeMaterial(
                  "drywall-hangers",
                  trText("Suspentes", "Hangers"),
                  hangerCount,
                  Unit.PIECE
                ),
              ]
            : [
                makeMaterial(
                  "drywall-rails",
                  "Rails",
                  railPieces,
                  Unit.PIECE,
                  trText(`${round2(railLen)} m par rail`, `${round2(railLen)} m per track`)
                ),
                makeMaterial(
                  "drywall-studs",
                  trText("Montants", "Studs"),
                  studPieces,
                  Unit.PIECE,
                  trText(`${round2(studLen)} m par montant`, `${round2(studLen)} m per stud`)
                ),
              ]),
          makeMaterial("drywall-screws", trText("Vis placo", "Drywall screws"), screws, Unit.PIECE),
          makeMaterial("drywall-tape", trText("Bande à joint", "Joint tape"), tapeMl, Unit.METER),
          makeMaterial(
            "drywall-joint",
            trText("Enduit à joint", "Joint compound"),
            jointCompoundKg / 25,
            Unit.BAG,
            trText(`${round2(jointCompoundKg)} kg au total`, `${round2(jointCompoundKg)} kg total`)
          ),
        ];
        break;
      }

      case "tileDetailed": {
        const length = toNum(tileLength);
        const width = toNum(tileWidth);
        const openings = toNum(tileAreaOpenings);
        const baseArea = Math.max(0, length * width - openings);
        const poseWaste = toNum(tileWastePercent) + (poseType === "diagonal" ? 5 : 0);
        const withWaste = baseArea * (1 + poseWaste / 100);
        const tileAreaM2 =
          (toNum(tileLenCm) / 100) * (toNum(tileWidCm) / 100);
        const tiles = tileAreaM2 > 0 ? withWaste / tileAreaM2 : 0;
        const adhesive = baseArea * toNum(adhesiveRate);
        const grout = baseArea * toNum(groutRate);
        const perimeter = 2 * (length + width);
        const skirtingMl = perimeter;
        const skirtingPieces =
          (skirtingMl * 100) / Math.max(1, toNum(tileLenCm));
        const primer = baseArea * 0.15;

        summary = trText(
          `${round2(baseArea)} m² à carreler ≈ ${Math.ceil(tiles)} carreaux, ${Math.ceil(adhesive / 25)} sacs de colle et ${Math.ceil(grout / 5)} sacs de joint.`,
          `${round2(baseArea)} m² to tile ≈ ${Math.ceil(tiles)} tiles, ${Math.ceil(adhesive / 25)} bags of adhesive and ${Math.ceil(grout / 5)} bags of grout.`
        );
        details = [
          { label: trText("Surface nette", "Net area"), value: round2(baseArea), unit: "m²" },
          { label: trText("Pose", "Layout"), value: poseType === "straight" ? trText("Droite", "Straight") : trText("Diagonale", "Diagonal") },
          { label: trText("Pertes retenues", "Applied wastage"), value: round2(poseWaste), unit: "%" },
          {
            label: trText("Surface avec pertes", "Area incl. wastage"),
            value: round2(withWaste),
            unit: "m²",
          },
          { label: trText("Carreaux", "Tiles"), value: Math.ceil(tiles), unit: Unit.PIECE },
          { label: trText("Colle", "Adhesive"), value: round2(adhesive), unit: "kg" },
          { label: trText("Joint", "Grout"), value: round2(grout), unit: "kg" },
          { label: trText("Plinthes", "Skirtings"), value: Math.ceil(skirtingPieces), unit: Unit.PIECE },
          { label: trText("Primaire", "Primer"), value: round2(primer), unit: "L" },
        ];
        materials = [
          makeMaterial(
            "tile-tiles",
            trText("Carreaux", "Tiles"),
            tiles,
            Unit.PIECE,
            `${round2(toNum(tileLenCm))} × ${round2(toNum(tileWidCm))} cm`
          ),
          makeMaterial(
            "tile-adhesive",
            trText("Colle carrelage", "Tile adhesive"),
            adhesive / 25,
            Unit.BAG,
            trText(`${round2(adhesive)} kg au total`, `${round2(adhesive)} kg total`)
          ),
          makeMaterial(
            "tile-grout",
            trText("Joint carrelage", "Tile grout"),
            grout / 5,
            Unit.BAG,
            trText(`${round2(grout)} kg au total`, `${round2(grout)} kg total`)
          ),
          makeMaterial(
            "tile-skirtings",
            trText("Plinthes carrelage", "Tile skirtings"),
            skirtingPieces,
            Unit.PIECE,
            trText(`${round2(toNum(skirtingHeightCm))} cm de hauteur`, `${round2(toNum(skirtingHeightCm))} cm high`)
          ),
          makeMaterial(
            "tile-primer",
            trText("Primaire", "Primer"),
            primer / 5,
            Unit.BUCKET,
            trText(`${round2(primer)} L au total`, `${round2(primer)} L total`)
          ),
        ];
        break;
      }

      case "packagingAdvanced": {
        const preset = packagingPresets[packPreset];
        const base = toNum(advBaseQty);
        const coats = Math.max(1, toNum(advCoats, 1));
        const waste = Math.max(0, toNum(advWaste));
        const rate = toNum(advConsumptionRate);
        const size = toNum(advPackSize);
        const price = toNum(advUnitPrice);
        const rawNeed = base * rate * coats * (1 + waste / 100);
        const packs = size > 0 ? rawNeed / size : 0;
        totalCost = Math.ceil(packs) * price;

        summary = `${round2(
          rawNeed
        )} ${advConsumptionUnit} de ${packPresetLabel(packPreset).toLowerCase()} ≈ ${Math.ceil(
          packs
        )} ${advPackUnit}.`;
        details = [
          { label: trText("Produit", "Product"), value: packPresetLabel(packPreset) },
          { label: "Base", value: round2(base), unit: advBaseUnit },
          {
            label: "Consommation unitaire",
            value: round2(rate),
            unit: `${advConsumptionUnit}/${advBaseUnit}`,
          },
          { label: trText("Couches / passes", "Coats / coats"), value: round2(coats), unit: "x" },
          { label: trText("Pertes", "Wastage"), value: round2(waste), unit: "%" },
          {
            label: "Besoin total",
            value: round2(rawNeed),
            unit: advConsumptionUnit,
          },
          {
            label: "Conditionnements",
            value: Math.ceil(packs),
            unit: advPackUnit,
          },
          { label: trText("Coût estimé", "Estimated cost"), value: round2(totalCost), unit: "€" },
        ];
        materials = [
          makeMaterial(
            "pack-advanced",
            packPresetLabel(packPreset),
            packs,
            advPackUnit,
            `${round2(rawNeed)} ${advConsumptionUnit} au total`,
            price
          ),
        ];
        break;
      }

      case "roofFrame": {
        const span = toNum(roofSpanM);
        const roofLen = toNum(roofLengthM);
        const riseVal = toNum(roofRiseM);
        const overhang = toNum(roofOverhangCm) / 100;
        const rafterSpacing = toNum(rafterSpacingCm) / 100;
        const battenGap = toNum(battenGapCm) / 100;
        const battenPiece = toNum(battenLengthM);
        const underlayRoll = toNum(underlayRollM2);
        const tileRate = toNum(tileCoveragePerM2);

        const halfSpan = span / 2 + overhang;
        const rafterLength = Math.sqrt(halfSpan ** 2 + riseVal ** 2);
        const pitchPercent = halfSpan > 0 ? (riseVal / halfSpan) * 100 : 0;
        const pitchAngle = Math.atan2(riseVal, halfSpan) * (180 / Math.PI);
        const roofArea = 2 * rafterLength * roofLen;
        const rafterLines = rafterSpacing > 0 ? Math.ceil(roofLen / rafterSpacing) + 1 : 0;
        const rafters = rafterLines * 2;
        const counterBattensMl = rafters * rafterLength;
        const battenRowsPerSlope = battenGap > 0 ? Math.ceil(rafterLength / battenGap) + 1 : 0;
        const battenMl = battenRowsPerSlope * roofLen * 2;
        const battenPieces = battenPiece > 0 ? battenMl / battenPiece : 0;
        const underlayRolls = underlayRoll > 0 ? (roofArea * 1.08) / underlayRoll : 0;
        const tiles = roofArea * tileRate * 1.08;

        summary = trText(`${round2(roofArea)} m² de toiture ≈ ${rafters} chevrons, ${Math.ceil(battenPieces)} liteaux et ${Math.ceil(tiles)} tuiles.`, `${round2(roofArea)} m² of roof ≈ ${rafters} rafters, ${Math.ceil(battenPieces)} battens and ${Math.ceil(tiles)} tiles.`);
        details = [
          { label: trText("Pente", "Slope"), value: round2(pitchPercent), unit: "%" },
          { label: trText("Angle", "Angle"), value: round2(pitchAngle), unit: "°" },
          { label: trText("Longueur chevron", "Rafter length"), value: round2(rafterLength), unit: "m" },
          { label: trText("Surface de toiture", "Roof area"), value: round2(roofArea), unit: "m²" },
          { label: trText("Chevrons", "Rafters"), value: rafters, unit: Unit.PIECE },
          {
            label: trText("Contre-liteaux", "Counter battens"),
            value: round2(counterBattensMl),
            unit: "m",
          },
          { label: trText("Liteaux", "Battens"), value: Math.ceil(battenPieces), unit: Unit.PIECE },
          {
            label: trText("Écran sous-toiture", "Roof underlay"),
            value: Math.ceil(underlayRolls),
            unit: Unit.ROLL,
          },
          { label: trText("Couverture", "Covering"), value: Math.ceil(tiles), unit: Unit.PIECE },
        ];
        materials = [
          makeMaterial(
            "roof-rafters",
            trText("Chevrons", "Rafters"),
            rafters,
            Unit.PIECE,
            trText(`${round2(rafterLength)} m par chevron`, `${round2(rafterLength)} m per rafter`)
          ),
          makeMaterial(
            "roof-counter-battens",
            trText("Contre-liteaux", "Counter battens"),
            counterBattensMl / battenPiece,
            Unit.PIECE,
            trText(`${round2(counterBattensMl)} ml au total`, `${round2(counterBattensMl)} lm total`)
          ),
          makeMaterial(
            "roof-battens",
            trText("Liteaux", "Battens"),
            battenPieces,
            Unit.PIECE,
            trText(`${round2(battenPiece)} m par liteau`, `${round2(battenPiece)} m per batten`)
          ),
          makeMaterial(
            "roof-underlay",
            trText("Écran sous-toiture", "Roof underlay"),
            underlayRolls,
            Unit.ROLL,
            trText(`${round2(underlayRoll)} m² par rouleau`, `${round2(underlayRoll)} m² per roll`)
          ),
          makeMaterial("roof-tiles", trText("Tuiles / ardoises", "Tiles / slates"), tiles, Unit.PIECE),
        ];
        break;
      }

      case "fence": {
        const length = toNum(fenceLength);
        const height = toNum(fenceHeight);
        const panelW = toNum(panelWidth);
        const waste = Math.max(0, toNum(fenceWastePercent));
        const perPostM3 = Math.max(0, toNum(concretePerPostM3, 0.025));

        const effectiveLength = length * (1 + waste / 100);
        const panels = panelW > 0 ? Math.ceil(effectiveLength / panelW) : 0;
        const posts = panels > 0 ? panels + 1 : 0;
        const meshArea = length * height;
        const concreteVolume = posts * perPostM3;
        const bagVolumeM3 = 0.012; // ~12L pour un sac de 25kg
        const concreteBags = bagVolumeM3 > 0 ? concreteVolume / bagVolumeM3 : 0;

        summary = trText(`${round2(length)} m de clôture ≈ ${panels} panneaux, ${posts} poteaux et ${Math.ceil(concreteBags)} sacs de béton.`, `${round2(length)} m of fence ≈ ${panels} panels, ${posts} posts and ${Math.ceil(concreteBags)} bags of concrete.`);
        details = [
          {
            label: trText("Longueur de clôture", "Fence length"),
            value: round2(length),
            unit: "m",
          },
          { label: trText("Hauteur", "Height"), value: round2(height), unit: "m" },
          {
            label: trText("Surface de grillage", "Mesh area"),
            value: round2(meshArea),
            unit: "m²",
          },
          { label: trText("Pertes", "Wastage"), value: round2(waste), unit: "%" },
          { label: trText("Panneaux", "Panels"), value: panels, unit: Unit.PIECE },
          { label: trText("Poteaux", "Posts"), value: posts, unit: Unit.PIECE },
          {
            label: trText("Volume béton", "Concrete volume"),
            value: round2(concreteVolume),
            unit: "m³",
          },
          {
            label: trText("Sacs béton (25 kg)", "Concrete bags (25 kg)"),
            value: Math.ceil(concreteBags),
            unit: Unit.BAG,
          },
        ];
        materials = [
          makeMaterial(
            "fence-panels",
            trText("Panneaux de clôture", "Fence panels"),
            panels,
            Unit.PIECE,
            trText(`${round2(height)} m de haut × ${round2(panelW)} m de large`, `${round2(height)} m high × ${round2(panelW)} m wide`)
          ),
          makeMaterial("fence-posts", trText("Poteaux", "Posts"), posts, Unit.PIECE),
          makeMaterial(
            "fence-concrete",
            trText("Béton de scellement 25 kg", "Post concrete 25 kg"),
            concreteBags,
            Unit.BAG,
            trText(`${round2(concreteVolume)} m³ de béton`, `${round2(concreteVolume)} m³ of concrete`)
          ),
        ];
        break;
      }

      case "bulkFill": {
        const length = toNum(bulkLength);
        const width = toNum(bulkWidth);
        const depthM = toNum(bulkDepthCm) / 100;
        const waste = Math.max(0, toNum(bulkWastePercent));
        const density = Math.max(0, toNum(bulkDensity, 1.6));
        const bigBagTons = Math.max(0.1, toNum(bigBagSizeTons, 1));
        const overlap = Math.max(0, toNum(geoOverlapPercent));

        const baseVolume = length * width * depthM;
        const volumeWithWaste = baseVolume * (1 + waste / 100);
        const tons = volumeWithWaste * density;
        const bigBags = bigBagTons > 0 ? tons / bigBagTons : 0;
        const geoArea = length * width * (1 + overlap / 100);
        const geoRollM2 = 75;
        const geoRolls = geoRollM2 > 0 ? geoArea / geoRollM2 : 0;

        summary = trText(`${round2(volumeWithWaste)} m³ ≈ ${round2(tons)} t, soit ${Math.ceil(bigBags)} big bags et ${Math.ceil(geoRolls)} rouleaux de géotextile.`, `${round2(volumeWithWaste)} m³ ≈ ${round2(tons)} t, i.e. ${Math.ceil(bigBags)} big bags and ${Math.ceil(geoRolls)} geotextile rolls.`);
        details = [
          { label: trText("Longueur", "Length"), value: round2(length), unit: "m" },
          { label: trText("Largeur", "Width"), value: round2(width), unit: "m" },
          { label: trText("Épaisseur", "Thickness"), value: round2(depthM * 100), unit: "cm" },
          {
            label: trText("Volume avec pertes", "Volume incl. wastage"),
            value: round2(volumeWithWaste),
            unit: "m³",
          },
          { label: trText("Densité", "Density"), value: round2(density), unit: "t/m³" },
          { label: trText("Tonnage", "Tonnage"), value: round2(tons), unit: "t" },
          { label: trText("Big bags", "Big bags"), value: Math.ceil(bigBags), unit: Unit.BAG },
          {
            label: trText("Surface géotextile", "Geotextile area"),
            value: round2(geoArea),
            unit: "m²",
          },
          {
            label: trText("Rouleaux géotextile", "Geotextile rolls"),
            value: Math.ceil(geoRolls),
            unit: Unit.ROLL,
          },
        ];
        materials = [
          makeMaterial(
            "bulk-fill",
            trText("Granulat (gravier / remblai / sable)", "Aggregate (gravel / fill / sand)"),
            bigBags,
            Unit.BAG,
            `${round2(volumeWithWaste)} m³ ≈ ${round2(tons)} t`
          ),
          makeMaterial(
            "bulk-geotextile",
            trText("Géotextile", "Geotextile"),
            geoRolls,
            Unit.ROLL,
            trText(`${round2(geoArea)} m² environ`, `about ${round2(geoArea)} m²`)
          ),
        ];
        break;
      }

      case "insulation": {
        const mode = insulationMode;
        const areaVal = Math.max(0, toNum(insulationArea));
        const thickM = toNum(insulationThicknessMm) / 1000;
        const lambda = Math.max(0.01, toNum(insulationLambda, 0.038));
        const waste = Math.max(0, toNum(insulationWastePercent));
        const covRoll = Math.max(0.1, toNum(insulationCoverageRoll));
        const areaWithWaste = areaVal * (1 + waste / 100);
        const R = thickM / lambda;
        const volume = areaVal * thickM;
        const rolls = covRoll > 0 ? areaWithWaste / covRoll : 0;

        summary = trText(`Isolation ${mode === "wall" ? "murs" : "combles"} : ${round2(areaVal)} m² en ${insulationThicknessMm} mm (R ≈ ${round2(R)} m².K/W) ≈ ${Math.ceil(rolls)} rouleaux.`, `${mode === "wall" ? "Wall" : "Attic"} insulation: ${round2(areaVal)} m² at ${insulationThicknessMm} mm (R ≈ ${round2(R)} m².K/W) ≈ ${Math.ceil(rolls)} rolls.`);
        details = [
          { label: trText("Zone", "Zone"), value: mode === "wall" ? trText("Murs", "Walls") : trText("Combles", "Attic") },
          {
            label: trText("Surface utile", "Useful area"),
            value: round2(areaVal),
            unit: "m²",
          },
          {
            label: trText("Épaisseur", "Thickness"),
            value: round2(thickM * 1000),
            unit: "mm",
          },
          { label: trText("Lambda", "Lambda"), value: round2(lambda), unit: "W/m.K" },
          {
            label: trText("Résistance R", "R value"),
            value: round2(R),
            unit: "m².K/W",
          },
          {
            label: trText("Volume isolant", "Insulation volume"),
            value: round2(volume),
            unit: "m³",
          },
          { label: trText("Pertes", "Wastage"), value: round2(waste), unit: "%" },
          {
            label: trText("Surface avec pertes", "Area incl. wastage"),
            value: round2(areaWithWaste),
            unit: "m²",
          },
          { label: trText("Rouleaux", "Rolls"), value: Math.ceil(rolls), unit: Unit.ROLL },
        ];
        materials = [
          makeMaterial(
            "insulation-rolls",
            mode === "wall" ? trText("Rouleaux isolant murs", "Wall insulation rolls") : trText("Rouleaux isolant combles", "Attic insulation rolls"),
            rolls,
            Unit.ROLL,
            trText(`${round2(areaWithWaste)} m² à couvrir, couverture ${round2(covRoll)} m²/rouleau`, `${round2(areaWithWaste)} m² to cover, ${round2(covRoll)} m²/roll`)
          ),
        ];
        break;
      }
    }

    return { summary, details, materials, totalCost, warnings };
  }, [
    area,
    thicknessCm,
    liters,
    bagYieldM3,
    wallLength,
    wallHeight,
    openingsCount,
    openingArea,
    wastePercent,
    consumptionBase,
    consumptionRate,
    packSize,
    packUnitPrice,
    baseUnit,
    consumptionUnit,
    packageUnit,
    run,
    rise,
    totalLength,
    pieceLength,
    overlapCm,
    linearWastePercent,
    phase,
    power,
    voltage,
    cableLength,
    section,
    conductor,
    tool,
    t,
    deckLength,
    deckWidth,
    boardWidthMm,
    boardGapMm,
    boardLengthM,
    joistSpacingCm,
    joistLengthM,
    pedestalSpacingCm,
    screwsPerSupport,
    deckWastePercent,
    drywallMode,
    drywallLength,
    drywallHeight,
    drywallArea,
    studSpacingCm,
    boardWidthM,
    boardHeightM,
    boardLayers,
    railLengthM,
    studLengthM,
    screwsPerBoard,
    tileLength,
    tileWidth,
    tileAreaOpenings,
    tileWastePercent,
    poseType,
    tileLenCm,
    tileWidCm,
    adhesiveRate,
    groutRate,
    skirtingHeightCm,
    packPreset,
    advBaseQty,
    advBaseUnit,
    advConsumptionRate,
    advConsumptionUnit,
    advPackSize,
    advPackUnit,
    advUnitPrice,
    advCoats,
    advWaste,
    roofSpanM,
    roofLengthM,
    roofRiseM,
    roofOverhangCm,
    rafterSpacingCm,
    battenGapCm,
    battenLengthM,
    underlayRollM2,
    tileCoveragePerM2,
    fenceLength,
    fenceHeight,
    panelWidth,
    concretePerPostM3,
    fenceWastePercent,
    bulkLength,
    bulkWidth,
    bulkDepthCm,
    bulkWastePercent,
    bulkDensity,
    bigBagSizeTons,
    geoOverlapPercent,
    insulationMode,
    insulationArea,
    insulationThicknessMm,
    insulationLambda,
    insulationCoverageRoll,
    insulationWastePercent,
  ]);

  useEffect(() => {
    onCalculate(result);
  }, [result, onCalculate]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">
          {qt("quick.title", "Calculs rapides chantier", "Quick site tools")}
        </h3>
        <p className="text-sm text-slate-500">
          {qt("quick.subtitle", "Micro-outils pour conversions, surfaces, quantités, terrasse bois, ossature placo, carrelage détaillé, toiture, clôture, gravier / remblai et isolation.", "Standalone tools for conversions, areas, quantities, timber decking, drywall framing, detailed tiling, roofing, fencing, gravel / fill and insulation.")}
        </p>
      </div>

      {!hideToolSelector && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
          {toolButtons.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTool(key)}
              className={`rounded-xl border px-3 py-3 text-left transition-all ${
                tool === key
                  ? "border-blue-600 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon size={16} className="mb-2" />
              <div className="text-sm font-bold leading-tight">{label}</div>
            </button>
          ))}
        </div>
      )}

      {tool === "convert" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={t("quick.field.area", { defaultValue: "Surface (m²)" })}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.thickness_cm", {
              defaultValue: "Épaisseur (cm)",
            })}
            value={thicknessCm}
            onChange={(e) => setThicknessCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.liters", { defaultValue: "Litres" })}
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.bag_yield", {
              defaultValue: "Rendement d'un sac (m³)",
            })}
            value={bagYieldM3}
            onChange={(e) => setBagYieldM3(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "netArea" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={t("quick.field.length", { defaultValue: "Longueur (m)" })}
            value={wallLength}
            onChange={(e) => setWallLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.height", { defaultValue: "Hauteur (m)" })}
            value={wallHeight}
            onChange={(e) => setWallHeight(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.openings_count", {
              defaultValue: "Nombre d'ouvertures",
            })}
            value={openingsCount}
            onChange={(e) => setOpeningsCount(e.target.value)}
            inputMode="numeric"
          />
          <Input
            label={t("quick.field.opening_area", {
              defaultValue: "Surface moyenne d'une ouverture (m²)",
            })}
            value={openingArea}
            onChange={(e) => setOpeningArea(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.waste_percent", {
              defaultValue: "Pertes (%)",
            })}
            value={wastePercent}
            onChange={(e) => setWastePercent(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "packaging" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={t("quick.field.base_quantity", {
              defaultValue: "Quantité de base",
            })}
            value={consumptionBase}
            onChange={(e) => setConsumptionBase(e.target.value)}
            inputMode="decimal"
          />
          <Select
            label={t("quick.field.base_unit", { defaultValue: "Unité de base" })}
            value={baseUnit}
            onChange={(e) =>
              setBaseUnit(e.target.value as "m²" | "m³" | "m")
            }
          >
            <option value="m²">m²</option>
            <option value="m³">m³</option>
            <option value="m">m</option>
          </Select>
          <Input
            label={t("quick.field.consumption_rate", {
              defaultValue: "Consommation unitaire",
            })}
            value={consumptionRate}
            onChange={(e) => setConsumptionRate(e.target.value)}
            inputMode="decimal"
          />
          <Select
            label={t("quick.field.consumption_unit", {
              defaultValue: "Unité consommée",
            })}
            value={consumptionUnit}
            onChange={(e) =>
              setConsumptionUnit(
                e.target.value as "kg" | "L" | "cartouche" | "sac"
              )
            }
          >
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="cartouche">{trText("cartouche", "cartridge")}</option>
            <option value="sac">{trText("sac", "bag")}</option>
          </Select>
          <Input
            label={t("quick.field.pack_size", {
              defaultValue: "Taille d'un conditionnement",
            })}
            value={packSize}
            onChange={(e) => setPackSize(e.target.value)}
            inputMode="decimal"
          />
          <Select
            label={t("quick.field.package_type", {
              defaultValue: "Type de conditionnement",
            })}
            value={packageUnit}
            onChange={(e) => setPackageUnit(e.target.value as Unit)}
          >
            <option value={Unit.BAG}>{trText("Sac", "Bag")}</option>
            <option value={Unit.BUCKET}>{trText("Seau", "Bucket")}</option>
            <option value={Unit.BOX}>{trText("Boîte", "Box")}</option>
            <option value={Unit.ROLL}>{trText("Rouleau", "Roll")}</option>
            <option value={Unit.PIECE}>{trText("Pièce", "Piece")}</option>
          </Select>
          <Input
            label={t("quick.field.package_price", {
              defaultValue: "Prix par conditionnement (€)",
            })}
            value={packUnitPrice}
            onChange={(e) => setPackUnitPrice(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "slope" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={t("quick.field.horizontal_length", {
              defaultValue: "Longueur horizontale (m)",
            })}
            value={run}
            onChange={(e) => setRun(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.vertical_drop", {
              defaultValue: "Dénivelé (m)",
            })}
            value={rise}
            onChange={(e) => setRise(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "linear" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={t("quick.field.total_length", {
              defaultValue: "Longueur totale à couvrir (m)",
            })}
            value={totalLength}
            onChange={(e) => setTotalLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.piece_length", {
              defaultValue: "Longueur d'une pièce (m)",
            })}
            value={pieceLength}
            onChange={(e) => setPieceLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.overlap_cm", {
              defaultValue: "Recouvrement par jonction (cm)",
            })}
            value={overlapCm}
            onChange={(e) => setOverlapCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.linear_waste", {
              defaultValue: "Pertes (%)",
            })}
            value={linearWastePercent}
            onChange={(e) => setLinearWastePercent(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "voltageDrop" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label={t("quick.field.phase", { defaultValue: "Type de réseau" })}
            value={phase}
            onChange={(e) => {
              const next = e.target.value as "mono" | "tri";
              setPhase(next);
              setVoltage(next === "mono" ? "230" : "400");
            }}
          >
            <option value="mono">Monophasé 230 V</option>
            <option value="tri">Triphasé 400 V</option>
          </Select>
          <Select
            label={t("quick.field.conductor", { defaultValue: "Conducteur" })}
            value={conductor}
            onChange={(e) =>
              setConductor(e.target.value as "copper" | "aluminium")
            }
          >
            <option value="copper">Cuivre</option>
            <option value="aluminium">Aluminium</option>
          </Select>
          <Input
            label={t("quick.field.power", { defaultValue: "Puissance (W)" })}
            value={power}
            onChange={(e) => setPower(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.voltage", { defaultValue: "Tension (V)" })}
            value={voltage}
            onChange={(e) => setVoltage(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.cable_length", {
              defaultValue: "Longueur de câble (m)",
            })}
            value={cableLength}
            onChange={(e) => setCableLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={t("quick.field.section_mm2", {
              defaultValue: "Section (mm²)",
            })}
            value={section}
            onChange={(e) => setSection(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "decking" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={trText("Longueur terrasse (m)", "Deck length (m)")}
            value={deckLength}
            onChange={(e) => setDeckLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Largeur terrasse (m)", "Deck width (m)")}
            value={deckWidth}
            onChange={(e) => setDeckWidth(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Largeur lame (mm)", "Board width (mm)")}
            value={boardWidthMm}
            onChange={(e) => setBoardWidthMm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Jeu entre lames (mm)", "Gap between boards (mm)")}
            value={boardGapMm}
            onChange={(e) => setBoardGapMm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Longueur d'une lame (m)", "Single board length (m)")}
            value={boardLengthM}
            onChange={(e) => setBoardLengthM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Entraxe lambourdes (cm)", "Joist spacing (cm)")}
            value={joistSpacingCm}
            onChange={(e) => setJoistSpacingCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Longueur lambourde (m)", "Joist length (m)")}
            value={joistLengthM}
            onChange={(e) => setJoistLengthM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Entraxe plots (cm)", "Pedestal spacing (cm)")}
            value={pedestalSpacingCm}
            onChange={(e) => setPedestalSpacingCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Vis par appui", "Screws per support")}
            value={screwsPerSupport}
            onChange={(e) => setScrewsPerSupport(e.target.value)}
            inputMode="numeric"
          />
          <Input
            label={trText("Pertes (%)", "Wastage (%)")}
            value={deckWastePercent}
            onChange={(e) => setDeckWastePercent(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "drywallFrame" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label={trText("Type d'ouvrage", "System type")}
            value={drywallMode}
            onChange={(e) =>
              setDrywallMode(
                e.target.value as "partition" | "lining" | "ceiling"
              )
            }
          >
            <option value="partition">{trText("Cloison", "Partition")}</option>
            <option value="lining">{trText("Doublage", "Lining")}</option>
            <option value="ceiling">{trText("Plafond", "Ceiling")}</option>
          </Select>
          {drywallMode === "ceiling" ? (
            <Input
              label={trText("Surface plafond (m²)", "Ceiling area (m²)")}
              value={drywallArea}
              onChange={(e) => setDrywallArea(e.target.value)}
              inputMode="decimal"
            />
          ) : (
            <>
              <Input
                label={trText("Longueur (m)", "Length (m)")}
                value={drywallLength}
                onChange={(e) => setDrywallLength(e.target.value)}
                inputMode="decimal"
              />
              <Input
                label={trText("Hauteur (m)", "Height (m)")}
                value={drywallHeight}
                onChange={(e) => setDrywallHeight(e.target.value)}
                inputMode="decimal"
              />
            </>
          )}
          <Input
            label={trText("Entraxe montants / fourrures (cm)", "Stud / furring spacing (cm)")}
            value={studSpacingCm}
            onChange={(e) => setStudSpacingCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Largeur plaque (m)", "Board width (m)")}
            value={boardWidthM}
            onChange={(e) => setBoardWidthM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Hauteur plaque (m)", "Board height (m)")}
            value={boardHeightM}
            onChange={(e) => setBoardHeightM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Nombre de peaux", "Number of layers")}
            value={boardLayers}
            onChange={(e) => setBoardLayers(e.target.value)}
            inputMode="numeric"
          />
          <Input
            label={trText("Longueur rail / fourrure (m)", "Track / furring length (m)")}
            value={railLengthM}
            onChange={(e) => setRailLengthM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Longueur montant (m)", "Stud length (m)")}
            value={studLengthM}
            onChange={(e) => setStudLengthM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Vis par plaque", "Screws per board")}
            value={screwsPerBoard}
            onChange={(e) => setScrewsPerBoard(e.target.value)}
            inputMode="numeric"
          />
        </div>
      )}

      {tool === "tileDetailed" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={trText("Longueur pièce (m)", "Room length (m)")}
            value={tileLength}
            onChange={(e) => setTileLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Largeur pièce (m)", "Room width (m)")}
            value={tileWidth}
            onChange={(e) => setTileWidth(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Ouvertures / zones à déduire (m²)", "Openings / areas to deduct (m²)")}
            value={tileAreaOpenings}
            onChange={(e) => setTileAreaOpenings(e.target.value)}
            inputMode="decimal"
          />
          <Select
            label={trText("Type de pose", "Layout type")}
            value={poseType}
            onChange={(e) =>
              setPoseType(e.target.value as "straight" | "diagonal")
            }
          >
            <option value="straight">{trText("Droite", "Straight")}</option>
            <option value="diagonal">{trText("Diagonale", "Diagonal")}</option>
          </Select>
          <Input
            label={trText("Longueur carreau (cm)", "Tile length (cm)")}
            value={tileLenCm}
            onChange={(e) => setTileLenCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Largeur carreau (cm)", "Tile width (cm)")}
            value={tileWidCm}
            onChange={(e) => setTileWidCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Pertes (%)", "Wastage (%)")}
            value={tileWastePercent}
            onChange={(e) => setTileWastePercent(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Colle (kg/m²)", "Adhesive (kg/m²)")}
            value={adhesiveRate}
            onChange={(e) => setAdhesiveRate(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Joint (kg/m²)", "Grout (kg/m²)")}
            value={groutRate}
            onChange={(e) => setGroutRate(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Hauteur plinthe (cm)", "Skirting height (cm)")}
            value={skirtingHeightCm}
            onChange={(e) => setSkirtingHeightCm(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "packagingAdvanced" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label={trText("Produit", "Product")}
            value={packPreset}
            onChange={(e) => setPackPreset(e.target.value as PackagingPresetKey)}
          >
            <option value="tileAdhesive">{packPresetLabel("tileAdhesive")}</option>
            <option value="grout">{packPresetLabel("grout")}</option>
            <option value="paint">{packPresetLabel("paint")}</option>
            <option value="primer">{packPresetLabel("primer")}</option>
            <option value="silicone">{packPresetLabel("silicone")}</option>
            <option value="foam">{packPresetLabel("foam")}</option>
          </Select>
          <Input
            label={trText("Quantité de base", "Base quantity")}
            value={advBaseQty}
            onChange={(e) => setAdvBaseQty(e.target.value)}
            inputMode="decimal"
          />
          <Select
            label={trText("Unité de base", "Base unit")}
            value={advBaseUnit}
            onChange={(e) =>
              setAdvBaseUnit(e.target.value as "m²" | "m³" | "m" | "unit")
            }
          >
            <option value="m²">m²</option>
            <option value="m³">m³</option>
            <option value="m">m</option>
            <option value="unit">unité</option>
          </Select>
          <Input
            label={trText("Consommation unitaire", "Unit consumption")}
            value={advConsumptionRate}
            onChange={(e) => setAdvConsumptionRate(e.target.value)}
            inputMode="decimal"
          />
          <Select
            label={trText("Unité consommée", "Consumed unit")}
            value={advConsumptionUnit}
            onChange={(e) =>
              setAdvConsumptionUnit(
                e.target.value as "kg" | "L" | "cartouche" | "sac"
              )
            }
          >
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="cartouche">{trText("cartouche", "cartridge")}</option>
            <option value="sac">{trText("sac", "bag")}</option>
          </Select>
          <Input
            label={trText("Taille d'un conditionnement", "Package size")}
            value={advPackSize}
            onChange={(e) => setAdvPackSize(e.target.value)}
            inputMode="decimal"
          />
          <Select
            label={trText("Type de conditionnement", "Package type")}
            value={advPackUnit}
            onChange={(e) => setAdvPackUnit(e.target.value as Unit)}
          >
            <option value={Unit.BAG}>{trText("Sac", "Bag")}</option>
            <option value={Unit.BUCKET}>{trText("Seau", "Bucket")}</option>
            <option value={Unit.BOX}>{trText("Boîte", "Box")}</option>
            <option value={Unit.ROLL}>{trText("Rouleau", "Roll")}</option>
            <option value={Unit.PIECE}>{trText("Pièce", "Piece")}</option>
          </Select>
          <Input
            label={trText("Prix unitaire (€)", "Unit price (€)")}
            value={advUnitPrice}
            onChange={(e) => setAdvUnitPrice(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Nombre de couches / passes", "Number of coats / passes")}
            value={advCoats}
            onChange={(e) => setAdvCoats(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Pertes (%)", "Wastage (%)")}
            value={advWaste}
            onChange={(e) => setAdvWaste(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "fence" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={trText("Longueur de clôture (m)", "Fence length (m)")}
            value={fenceLength}
            onChange={(e) => setFenceLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Hauteur de clôture (m)", "Fence height (m)")}
            value={fenceHeight}
            onChange={(e) => setFenceHeight(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Largeur d'un panneau (m)", "Panel width (m)")}
            value={panelWidth}
            onChange={(e) => setPanelWidth(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Béton par poteau (m³)", "Concrete per post (m³)")}
            value={concretePerPostM3}
            onChange={(e) => setConcretePerPostM3(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Pertes (%)", "Wastage (%)")}
            value={fenceWastePercent}
            onChange={(e) => setFenceWastePercent(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "bulkFill" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={trText("Longueur de la zone (m)", "Zone length (m)")}
            value={bulkLength}
            onChange={(e) => setBulkLength(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Largeur de la zone (m)", "Zone width (m)")}
            value={bulkWidth}
            onChange={(e) => setBulkWidth(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Épaisseur (cm)", "Thickness (cm)")}
            value={bulkDepthCm}
            onChange={(e) => setBulkDepthCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Pertes (%)", "Wastage (%)")}
            value={bulkWastePercent}
            onChange={(e) => setBulkWastePercent(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Densité (t/m³)", "Density (t/m³)")}
            value={bulkDensity}
            onChange={(e) => setBulkDensity(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Poids d'un big bag (t)", "Big bag weight (t)")}
            value={bigBagSizeTons}
            onChange={(e) => setBigBagSizeTons(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Pertes / recouvrements géotextile (%)", "Geotextile overlap / wastage (%)")}
            value={geoOverlapPercent}
            onChange={(e) => setGeoOverlapPercent(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "insulation" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select
            label={trText("Zone à isoler", "Area to insulate")}
            value={insulationMode}
            onChange={(e) =>
              setInsulationMode(e.target.value as "wall" | "attic")
            }
          >
            <option value="wall">{trText("Murs", "Walls")}</option>
            <option value="attic">{trText("Combles", "Attic")}</option>
          </Select>
          <Input
            label={trText("Surface à isoler (m²)", "Area to insulate (m²)")}
            value={insulationArea}
            onChange={(e) => setInsulationArea(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Épaisseur isolant (mm)", "Insulation thickness (mm)")}
            value={insulationThicknessMm}
            onChange={(e) => setInsulationThicknessMm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label="Lambda (W/m.K)"
            value={insulationLambda}
            onChange={(e) => setInsulationLambda(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Couverture par rouleau (m²)", "Coverage per roll (m²)")}
            value={insulationCoverageRoll}
            onChange={(e) => setInsulationCoverageRoll(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Pertes (%)", "Wastage (%)")}
            value={insulationWastePercent}
            onChange={(e) => setInsulationWastePercent(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {tool === "roofFrame" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label={trText("Largeur bâtiment (m)", "Building width (m)")}
            value={roofSpanM}
            onChange={(e) => setRoofSpanM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Longueur bâtiment (m)", "Building length (m)")}
            value={roofLengthM}
            onChange={(e) => setRoofLengthM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Relèvement faîtage (m)", "Ridge rise (m)")}
            value={roofRiseM}
            onChange={(e) => setRoofRiseM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Débord de toit (cm)", "Roof overhang (cm)")}
            value={roofOverhangCm}
            onChange={(e) => setRoofOverhangCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Entraxe chevrons (cm)", "Rafter spacing (cm)")}
            value={rafterSpacingCm}
            onChange={(e) => setRafterSpacingCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Pas liteaux (cm)", "Batten spacing (cm)")}
            value={battenGapCm}
            onChange={(e) => setBattenGapCm(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Longueur liteau (m)", "Batten length (m)")}
            value={battenLengthM}
            onChange={(e) => setBattenLengthM(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Écran sous-toiture par rouleau (m²)", "Roof underlay per roll (m²)")}
            value={underlayRollM2}
            onChange={(e) => setUnderlayRollM2(e.target.value)}
            inputMode="decimal"
          />
          <Input
            label={trText("Couverture (u/m²)", "Covering (u/m²)")}
            value={tileCoveragePerM2}
            onChange={(e) => setTileCoveragePerM2(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">
          {qt("quick.note_title", "Important", "Important")}
        </div>
        <p className="text-sm text-slate-600">
          {t("quick.note", {
            defaultValue:
              trText("Les résultats sont indicatifs et destinés à l'estimation chantier rapide. Vérifier les contraintes techniques, les entraxes fabricants et les règles de mise en œuvre avant exécution.", "These tools give quick estimates only. Always cross-check with standards, manufacturer data and applicable regulations before carrying out the works."),
          })}
        </p>
      </div>
    </div>
  );
};
