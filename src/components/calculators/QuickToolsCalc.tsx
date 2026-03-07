import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit, MaterialItem } from "../../types";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { ArrowRightLeft, Ruler, Package2, TrendingUp, Cable } from "lucide-react";

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialArea?: number;
  initialPerimeter?: number;
}

type ToolKey = "convert" | "netArea" | "packaging" | "slope" | "linear" | "voltageDrop";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const ceil2 = (n: number) => Math.ceil((n - Number.EPSILON) * 100) / 100;
const toNum = (v: string | number, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

const makeMaterial = (
  id: string,
  name: string,
  quantityRaw: number,
  unit: Unit,
  details?: string,
  unitPrice = 0
): MaterialItem => ({
  id,
  name,
  quantityRaw: round2(quantityRaw),
  quantity: unit === Unit.PIECE || unit === Unit.BAG || unit === Unit.BUCKET || unit === Unit.BOX || unit === Unit.ROLL || unit === Unit.PALLET
    ? Math.ceil(quantityRaw)
    : round2(quantityRaw),
  unit,
  unitPrice,
  totalPrice: round2((unit === Unit.PIECE || unit === Unit.BAG || unit === Unit.BUCKET || unit === Unit.BOX || unit === Unit.ROLL || unit === Unit.PALLET ? Math.ceil(quantityRaw) : round2(quantityRaw)) * unitPrice),
  category: CalculatorType.QUICK_TOOLS,
  details,
});

export const QuickToolsCalculator: React.FC<Props> = ({ onCalculate, initialArea, initialPerimeter }) => {
  const { t } = useTranslation();
  const [tool, setTool] = useState<ToolKey>("convert");

  const [area, setArea] = useState(String(initialArea ?? 50));
  const [thicknessCm, setThicknessCm] = useState("10");
  const [liters, setLiters] = useState("1000");
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

  const toolButtons = [
    { key: "convert" as const, label: t("quick.tools.convert", { defaultValue: "Convertisseur" }), icon: ArrowRightLeft },
    { key: "netArea" as const, label: t("quick.tools.net_area", { defaultValue: "Surface nette" }), icon: Ruler },
    { key: "packaging" as const, label: t("quick.tools.packaging", { defaultValue: "Conditionnements" }), icon: Package2 },
    { key: "slope" as const, label: t("quick.tools.slope", { defaultValue: "Pente" }), icon: TrendingUp },
    { key: "linear" as const, label: t("quick.tools.linear", { defaultValue: "Linéaires" }), icon: Ruler },
    { key: "voltageDrop" as const, label: t("quick.tools.voltage_drop", { defaultValue: "Chute de tension" }), icon: Cable },
  ];

  const result = useMemo<CalculationResult>(() => {
    const warnings: string[] = [];
    let details: CalculationResult["details"] = [];
    let materials: MaterialItem[] = [];
    let summary = "";
    let totalCost = 0;

    if (tool === "convert") {
      const a = toNum(area);
      const tCm = toNum(thicknessCm);
      const l = toNum(liters);
      const yieldM3 = toNum(bagYieldM3, 0.015);
      const volume = a * (tCm / 100);
      const m3FromLiters = l / 1000;
      const bags = yieldM3 > 0 ? volume / yieldM3 : 0;

      if (tCm <= 0) warnings.push(t("quick.warn_thickness", { defaultValue: "L'épaisseur doit être supérieure à 0." }));

      summary = t("quick.summary.convert", {
        defaultValue: "{{area}} m² sur {{thickness}} cm représentent {{volume}} m³.",
        area: round2(a),
        thickness: round2(tCm),
        volume: round2(volume),
      });

      details = [
        { label: t("quick.detail.area", { defaultValue: "Surface" }), value: round2(a), unit: "m²" },
        { label: t("quick.detail.thickness", { defaultValue: "Épaisseur" }), value: round2(tCm), unit: "cm" },
        { label: t("quick.detail.volume", { defaultValue: "Volume" }), value: round2(volume), unit: "m³" },
        { label: t("quick.detail.liters_to_m3", { defaultValue: "Conversion litres → m³" }), value: round2(m3FromLiters), unit: "m³" },
        { label: t("quick.detail.bags_needed", { defaultValue: "Sacs nécessaires" }), value: Math.ceil(bags), unit: Unit.BAG },
      ];

      materials = [
        makeMaterial("bags", t("quick.material.bags", { defaultValue: "Sacs théoriques" }), bags, Unit.BAG, t("quick.material.bags_detail", { defaultValue: "Basé sur le rendement saisi" })),
      ];
    }

    if (tool === "netArea") {
      const l = toNum(wallLength);
      const h = toNum(wallHeight);
      const count = Math.max(0, Math.floor(toNum(openingsCount)));
      const oneOpeningArea = toNum(openingArea);
      const waste = Math.max(0, toNum(wastePercent));

      const gross = l * h;
      const openings = count * oneOpeningArea;
      const net = Math.max(0, gross - openings);
      const withWaste = net * (1 + waste / 100);

      if (openings > gross) warnings.push(t("quick.warn_openings", { defaultValue: "La surface des ouvertures dépasse la surface brute." }));

      summary = t("quick.summary.net_area", {
        defaultValue: "Surface nette calculée : {{net}} m², soit {{withWaste}} m² avec pertes.",
        net: round2(net),
        withWaste: round2(withWaste),
      });

      details = [
        { label: t("quick.detail.gross_area", { defaultValue: "Surface brute" }), value: round2(gross), unit: "m²" },
        { label: t("quick.detail.openings", { defaultValue: "Déduction ouvertures" }), value: round2(openings), unit: "m²" },
        { label: t("quick.detail.net_area", { defaultValue: "Surface nette" }), value: round2(net), unit: "m²" },
        { label: t("quick.detail.loss", { defaultValue: "Pertes" }), value: round2(waste), unit: "%" },
        { label: t("quick.detail.with_waste", { defaultValue: "Surface avec pertes" }), value: round2(withWaste), unit: "m²" },
      ];

      materials = [makeMaterial("net-area", t("quick.material.net_area", { defaultValue: "Surface exploitable" }), withWaste, Unit.M2)];
    }

    if (tool === "packaging") {
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
        { label: t("quick.detail.base_quantity", { defaultValue: `Base (${baseUnit})` }), value: round2(base), unit: baseUnit },
        { label: t("quick.detail.consumption", { defaultValue: "Consommation unitaire" }), value: round2(rate), unit: `${consumptionUnit}/${baseUnit}` },
        { label: t("quick.detail.total_need", { defaultValue: "Besoin total" }), value: round2(rawQty), unit: consumptionUnit },
        { label: t("quick.detail.pack_size", { defaultValue: "Conditionnement" }), value: round2(size), unit: consumptionUnit },
        { label: t("quick.detail.pack_count", { defaultValue: "Nombre de conditionnements" }), value: Math.ceil(packs), unit: packageUnit },
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
    }

    if (tool === "slope") {
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
        { label: t("quick.detail.horizontal", { defaultValue: "Longueur horizontale" }), value: round2(horizontal), unit: "m" },
        { label: t("quick.detail.vertical", { defaultValue: "Dénivelé" }), value: round2(vertical), unit: "m" },
        { label: t("quick.detail.percent", { defaultValue: "Pente" }), value: round2(percent), unit: "%" },
        { label: t("quick.detail.cm_per_m", { defaultValue: "Centimètres par mètre" }), value: round2(cmPerM), unit: "cm/m" },
        { label: t("quick.detail.angle", { defaultValue: "Angle" }), value: round2(angle), unit: "°" },
        { label: t("quick.detail.ramp_length", { defaultValue: "Longueur réelle" }), value: round2(hyp), unit: "m" },
      ];
    }

    if (tool === "linear") {
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
        defaultValue: "{{pieces}} pièces nécessaires pour couvrir {{total}} m linéaires.",
        pieces: Math.ceil(pieces),
        total: round2(adjustedTotal),
      });

      details = [
        { label: t("quick.detail.linear_total", { defaultValue: "Longueur utile" }), value: round2(total), unit: "m" },
        { label: t("quick.detail.linear_overlap", { defaultValue: "Recouvrement" }), value: round2(overlap * 100), unit: "cm" },
        { label: t("quick.detail.linear_effective", { defaultValue: "Longueur utile par pièce" }), value: round2(effectivePiece), unit: "m" },
        { label: t("quick.detail.linear_with_waste", { defaultValue: "Longueur avec pertes" }), value: round2(adjustedTotal), unit: "m" },
        { label: t("quick.detail.linear_pieces", { defaultValue: "Nombre de pièces" }), value: Math.ceil(pieces), unit: Unit.PIECE },
        { label: t("quick.detail.linear_offcut", { defaultValue: "Chutes estimées" }), value: round2(offcut), unit: "m" },
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
    }

    if (tool === "voltageDrop") {
      const p = toNum(power);
      const u = toNum(voltage, phase === "mono" ? 230 : 400);
      const l = toNum(cableLength);
      const s = toNum(section);
      const rho = conductor === "copper" ? 0.018 : 0.028;
      const current = phase === "mono" ? p / u : p / (Math.sqrt(3) * u);
      const dropVolts = s > 0
        ? phase === "mono"
          ? (2 * rho * l * current) / s
          : (Math.sqrt(3) * rho * l * current) / s
        : 0;
      const dropPercent = u > 0 ? (dropVolts / u) * 100 : 0;

      const candidateSections = [1.5, 2.5, 4, 6, 10, 16, 25, 35];
      const recommended = candidateSections.find((candidate) => {
        const dv = phase === "mono"
          ? (2 * rho * l * current) / candidate
          : (Math.sqrt(3) * rho * l * current) / candidate;
        return u > 0 ? (dv / u) * 100 <= 3 : false;
      }) || candidateSections[candidateSections.length - 1];

      if (dropPercent > 5) warnings.push(t("quick.warn_voltage_high", { defaultValue: "Chute de tension élevée : section ou longueur à revoir." }));
      else if (dropPercent > 3) warnings.push(t("quick.warn_voltage_medium", { defaultValue: "La chute de tension dépasse 3 %, à vérifier selon l'usage." }));

      summary = t("quick.summary.voltage", {
        defaultValue: "Chute estimée : {{volts}} V ({{percent}} %). Section indicative recommandée : {{section}} mm².",
        volts: round2(dropVolts),
        percent: round2(dropPercent),
        section: recommended,
      });

      details = [
        { label: t("quick.detail.phase", { defaultValue: "Réseau" }), value: phase === "mono" ? "Monophasé" : "Triphasé" },
        { label: t("quick.detail.current", { defaultValue: "Intensité estimée" }), value: round2(current), unit: "A" },
        { label: t("quick.detail.length", { defaultValue: "Longueur" }), value: round2(l), unit: "m" },
        { label: t("quick.detail.section", { defaultValue: "Section utilisée" }), value: round2(s), unit: "mm²" },
        { label: t("quick.detail.drop_volts", { defaultValue: "Chute de tension" }), value: round2(dropVolts), unit: "V" },
        { label: t("quick.detail.drop_percent", { defaultValue: "Chute de tension" }), value: round2(dropPercent), unit: "%" },
        { label: t("quick.detail.section_recommended", { defaultValue: "Section indicative recommandée" }), value: recommended, unit: "mm²" },
      ];
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
  ]);

  useEffect(() => {
    onCalculate(result);
  }, [result, onCalculate]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">
          {t("quick.title", { defaultValue: "Calculs rapides chantier" })}
        </h3>
        <p className="text-sm text-slate-500">
          {t("quick.subtitle", { defaultValue: "Micro-outils pour conversions, surfaces, quantités, pente, linéaires et chute de tension." })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {toolButtons.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTool(key)}
            className={`rounded-xl border px-3 py-3 text-left transition-all ${tool === key ? "border-blue-600 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
          >
            <Icon size={16} className="mb-2" />
            <div className="text-sm font-bold leading-tight">{label}</div>
          </button>
        ))}
      </div>

      {tool === "convert" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label={t("quick.field.area", { defaultValue: "Surface (m²)" })} value={area} onChange={(e) => setArea(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.thickness_cm", { defaultValue: "Épaisseur (cm)" })} value={thicknessCm} onChange={(e) => setThicknessCm(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.liters", { defaultValue: "Litres" })} value={liters} onChange={(e) => setLiters(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.bag_yield", { defaultValue: "Rendement d'un sac (m³)" })} value={bagYieldM3} onChange={(e) => setBagYieldM3(e.target.value)} inputMode="decimal" />
        </div>
      )}

      {tool === "netArea" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label={t("quick.field.length", { defaultValue: "Longueur (m)" })} value={wallLength} onChange={(e) => setWallLength(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.height", { defaultValue: "Hauteur (m)" })} value={wallHeight} onChange={(e) => setWallHeight(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.openings_count", { defaultValue: "Nombre d'ouvertures" })} value={openingsCount} onChange={(e) => setOpeningsCount(e.target.value)} inputMode="numeric" />
          <Input label={t("quick.field.opening_area", { defaultValue: "Surface moyenne d'une ouverture (m²)" })} value={openingArea} onChange={(e) => setOpeningArea(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.waste_percent", { defaultValue: "Pertes (%)" })} value={wastePercent} onChange={(e) => setWastePercent(e.target.value)} inputMode="decimal" />
        </div>
      )}

      {tool === "packaging" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label={t("quick.field.base_quantity", { defaultValue: "Quantité de base" })} value={consumptionBase} onChange={(e) => setConsumptionBase(e.target.value)} inputMode="decimal" />
          <Select label={t("quick.field.base_unit", { defaultValue: "Unité de base" })} value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as any)}>
            <option value="m²">m²</option>
            <option value="m³">m³</option>
            <option value="m">m</option>
          </Select>
          <Input label={t("quick.field.consumption_rate", { defaultValue: "Consommation unitaire" })} value={consumptionRate} onChange={(e) => setConsumptionRate(e.target.value)} inputMode="decimal" />
          <Select label={t("quick.field.consumption_unit", { defaultValue: "Unité consommée" })} value={consumptionUnit} onChange={(e) => setConsumptionUnit(e.target.value as any)}>
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="cartouche">cartouche</option>
            <option value="sac">sac</option>
          </Select>
          <Input label={t("quick.field.pack_size", { defaultValue: "Taille d'un conditionnement" })} value={packSize} onChange={(e) => setPackSize(e.target.value)} inputMode="decimal" />
          <Select label={t("quick.field.package_type", { defaultValue: "Type de conditionnement" })} value={packageUnit} onChange={(e) => setPackageUnit(e.target.value as Unit)}>
            <option value={Unit.BAG}>Sac</option>
            <option value={Unit.BUCKET}>Seau</option>
            <option value={Unit.BOX}>Boîte</option>
            <option value={Unit.ROLL}>Rouleau</option>
            <option value={Unit.PIECE}>Pièce</option>
          </Select>
          <Input label={t("quick.field.package_price", { defaultValue: "Prix par conditionnement (€)" })} value={packUnitPrice} onChange={(e) => setPackUnitPrice(e.target.value)} inputMode="decimal" />
        </div>
      )}

      {tool === "slope" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label={t("quick.field.horizontal_length", { defaultValue: "Longueur horizontale (m)" })} value={run} onChange={(e) => setRun(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.vertical_drop", { defaultValue: "Dénivelé (m)" })} value={rise} onChange={(e) => setRise(e.target.value)} inputMode="decimal" />
        </div>
      )}

      {tool === "linear" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label={t("quick.field.total_length", { defaultValue: "Longueur totale à couvrir (m)" })} value={totalLength} onChange={(e) => setTotalLength(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.piece_length", { defaultValue: "Longueur d'une pièce (m)" })} value={pieceLength} onChange={(e) => setPieceLength(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.overlap_cm", { defaultValue: "Recouvrement par jonction (cm)" })} value={overlapCm} onChange={(e) => setOverlapCm(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.linear_waste", { defaultValue: "Pertes (%)" })} value={linearWastePercent} onChange={(e) => setLinearWastePercent(e.target.value)} inputMode="decimal" />
        </div>
      )}

      {tool === "voltageDrop" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label={t("quick.field.phase", { defaultValue: "Type de réseau" })} value={phase} onChange={(e) => {
            const next = e.target.value as "mono" | "tri";
            setPhase(next);
            setVoltage(next === "mono" ? "230" : "400");
          }}>
            <option value="mono">Monophasé 230 V</option>
            <option value="tri">Triphasé 400 V</option>
          </Select>
          <Select label={t("quick.field.conductor", { defaultValue: "Conducteur" })} value={conductor} onChange={(e) => setConductor(e.target.value as any)}>
            <option value="copper">Cuivre</option>
            <option value="aluminium">Aluminium</option>
          </Select>
          <Input label={t("quick.field.power", { defaultValue: "Puissance (W)" })} value={power} onChange={(e) => setPower(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.voltage", { defaultValue: "Tension (V)" })} value={voltage} onChange={(e) => setVoltage(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.cable_length", { defaultValue: "Longueur de câble (m)" })} value={cableLength} onChange={(e) => setCableLength(e.target.value)} inputMode="decimal" />
          <Input label={t("quick.field.section_mm2", { defaultValue: "Section (mm²)" })} value={section} onChange={(e) => setSection(e.target.value)} inputMode="decimal" />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 font-bold mb-2">
          {t("quick.note_title", { defaultValue: "Note" })}
        </div>
        <p className="text-sm text-slate-600">
          {t("quick.note", { defaultValue: "Les résultats sont indicatifs et destinés à l'estimation chantier rapide. Vérifier les contraintes techniques et normatives avant exécution." })}
        </p>
      </div>
    </div>
  );
};
