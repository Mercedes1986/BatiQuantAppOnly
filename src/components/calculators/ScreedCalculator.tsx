import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES, MESH_TYPES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  Layers,
  Plus,
  Trash2,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  BoxSelect,
  AlertTriangle,
  Truck,
  CircleDollarSign,
} from "lucide-react";

interface ScreedZone {
  id: string;
  label: string;
  area: number;
  thickness: number; // cm (min if sloped)
  isSloped: boolean;
  slopePct: number; // %
  slopeLen: number; // m
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

type ScreedType = "trad" | "fluid_anh" | "fluid_cem" | "light" | "ravoirage";
type ReinforceType = "none" | "mesh" | "fiber";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Prefer catalog price > DEFAULT_PRICES > fallback */
const priceOr = (catalogKey: string, defaultKey: string | null, fallback: number) => {
  const c = getUnitPrice(catalogKey);
  if (typeof c === "number" && Number.isFinite(c) && c !== 0) return c;

  if (defaultKey) {
    const d = (DEFAULT_PRICES as any)?.[defaultKey];
    const nd = Number(d);
    if (d !== undefined && Number.isFinite(nd) && nd !== 0) return nd;
  }
  return fallback;
};

export const ScreedCalculator: React.FC<Props> = ({ onCalculate }) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Zones ---
  const [zones, setZones] = useState<ScreedZone[]>([]);
  const [newZoneLabel, setNewZoneLabel] = useState("");
  const [newZoneArea, setNewZoneArea] = useState("");
  const [newZoneThick, setNewZoneThick] = useState("5");

  // --- 2. Tech Specs ---
  const [screedType, setScreedType] = useState<ScreedType>("trad");

  // Underlayers
  const [usePolyane, setUsePolyane] = useState(true);
  const [useStrip, setUseStrip] = useState(true);
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState("4"); // cm (info)

  // Reinforcement & joints
  const [reinforceType, setReinforceType] = useState<ReinforceType>("mesh");
  const [meshTypeId, setMeshTypeId] = useState<string>(() => {
    const first = (MESH_TYPES as any[])?.[0]?.id;
    return first || "ST10";
  });
  const [fiberDosage, setFiberDosage] = useState(0.6); // kg/m3
  const [useJoints, setUseJoints] = useState(true);

  // Mix parameters
  const [cementDosage, setCementDosage] = useState(350); // kg/m3
  const [sandRatio, setSandRatio] = useState(1200); // kg/m3
  const [lightBagVol, setLightBagVol] = useState(15); // L per bag

  // --- Pricing ---
  const [prices, setPrices] = useState(() => ({
    cementBag: priceOr("CEMENT_BAG_35KG", "CEMENT_BAG_35KG", 11.5),
    sandTon: priceOr("SAND_TON", "SAND_TON", 45),

    fiberKg: priceOr("FIBER_KG", null, 15),
    polyaneM2: priceOr("POLYANE_M2", null, 1.5),
    stripM: priceOr("PERIPHERAL_BAND_M", null, 0.8),
    insulM2: priceOr("INSULATION_UNDER_SCREED_M2", null, 10),

    bpeM3: priceOr("BPE_M3", null, 160),
    pumpFlat: priceOr("PUMP_FLAT", null, 300),

    premixBag: priceOr("SCREED_PREMIX_BAG", null, 12),

    laborM2: priceOr("LABOR_SCREED_M2", null, 25),
    jointM: priceOr("JOINT_M", null, 3),

    meshPanel: priceOr("MESH_PANEL_UNIT", null, 5),
  }));

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // Auto: fluid screed often fiber; keep user choice unless empty zones + mesh
  useEffect(() => {
    if ((screedType === "fluid_anh" || screedType === "fluid_cem") && zones.length === 0 && reinforceType === "mesh") {
      setReinforceType("fiber");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screedType]);

  const addZone = () => {
    const area = toNum(newZoneArea, 0);
    const thick = toNum(newZoneThick, 0);
    if (!(area > 0) || !(thick > 0)) return;

    setZones((prev) => [
      ...prev,
      {
        id: uid(),
        label: (newZoneLabel || t("calc.screed.default_zone", { n: prev.length + 1 })).trim(),
        area,
        thickness: thick,
        isSloped: false,
        slopePct: 1.5,
        slopeLen: 2,
      },
    ]);

    setNewZoneArea("");
    setNewZoneLabel("");
  };

  const updateZone = (id: string, field: keyof ScreedZone, value: any) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, [field]: value } : z)));
  };

  const removeZone = (id: string) => setZones((prev) => prev.filter((z) => z.id !== id));

  const meshOptions = useMemo(() => {
    const list = (MESH_TYPES as any[]) || [];
    return list
      .map((m) => ({
        id: String(m.id ?? ""),
        // ⚠️ idéalement: m.labelKey → t(m.labelKey)
        label: String(m.label ?? m.id ?? t("calc.screed.mesh.fallback_label")),
        coverM2: Number.isFinite(Number(m.coverM2)) ? Number(m.coverM2) : undefined,
        price: Number.isFinite(Number(m.price)) ? Number(m.price) : undefined,
      }))
      .filter((m) => m.id);
  }, [t]);

  const findMesh = (id: string) => meshOptions.find((m) => m.id === id);

  const screedTypeLabel = (s: ScreedType) => t(`calc.screed.type.${s}`, { defaultValue: s });
  const reinforceLabel = (r: ReinforceType) => t(`calc.screed.reinforce.${r}`, { defaultValue: r });

  const stepLabel = (s: number) => {
    if (s === 1) return t("calc.screed.step_1");
    if (s === 2) return t("calc.screed.step_2");
    if (s === 3) return t("calc.screed.step_3");
    return t("calc.screed.step_4");
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalArea = 0;
    let totalVolume = 0; // m3
    let totalPerimeter = 0;

    const warnings: string[] = [];
    const materialsList: any[] = [];
    let totalCost = 0;

    zones.forEach((z) => {
      totalArea += z.area;
      totalPerimeter += Math.sqrt(z.area) * 4;

      let avgThickCm = z.thickness;

      if (z.isSloped) {
        const sPct = clamp(toNum(z.slopePct, 0), 0, 10);
        const sLen = clamp(toNum(z.slopeLen, 0), 0, 50);
        const hMaxCm = z.thickness + sPct * sLen;
        avgThickCm = (z.thickness + hMaxCm) / 2;

        if (hMaxCm > 15) warnings.push(t("calc.screed.warn_max_thickness", { label: z.label, h: hMaxCm.toFixed(1) }));
      }

      totalVolume += z.area * (avgThickCm / 100);
    });

    const wasteVol = totalVolume * 1.05;

    // Screed material
    if (screedType === "trad" || screedType === "ravoirage") {
      if (screedType === "ravoirage" && cementDosage > 300) warnings.push(t("calc.screed.warn_ravoirage_dosage"));

      const cementKg = wasteVol * cementDosage;
      const sandKg = wasteVol * sandRatio;

      const bagsCement = Math.ceil(cementKg / 35);
      const costCement = bagsCement * prices.cementBag;

      const sandTon = sandKg / 1000;
      const costSand = sandTon * prices.sandTon;

      totalCost += costCement + costSand;

      materialsList.push(
        {
          id: "cement",
          name: t("calc.screed.mat.cement", { dosage: cementDosage }),
          quantity: bagsCement,
          quantityRaw: cementKg,
          unit: Unit.BAG,
          unitPrice: round2(prices.cementBag),
          totalPrice: round2(costCement),
          category: CalculatorType.SCREED,
          details: t("calc.screed.mat.cement_details"),
        },
        {
          id: "sand",
          name: t("calc.screed.mat.sand"),
          quantity: round2(sandTon),
          quantityRaw: sandKg,
          unit: Unit.TON,
          unitPrice: round2(prices.sandTon),
          totalPrice: round2(costSand),
          category: CalculatorType.SCREED,
        }
      );
    } else if (screedType === "light") {
      const bagsPerM3 = 1000 / Math.max(1, lightBagVol);
      const totalBags = Math.ceil(wasteVol * bagsPerM3);
      const costBags = totalBags * prices.premixBag;

      totalCost += costBags;
      materialsList.push({
        id: "light_mix",
        name: t("calc.screed.mat.light_mix"),
        quantity: totalBags,
        quantityRaw: wasteVol,
        unit: Unit.BAG,
        unitPrice: round2(prices.premixBag),
        totalPrice: round2(costBags),
        category: CalculatorType.SCREED,
        details: t("calc.screed.mat.light_mix_details", { bagL: lightBagVol, vol: wasteVol.toFixed(2) }),
      });
    } else {
      const costBpe = wasteVol * prices.bpeM3;
      totalCost += costBpe;
      materialsList.push({
        id: "bpe",
        name: t("calc.screed.mat.fluid", { kind: screedType === "fluid_anh" ? t("calc.screed.fluid_kind.anh") : t("calc.screed.fluid_kind.cem") }),
        quantity: round2(wasteVol),
        quantityRaw: wasteVol,
        unit: Unit.M3,
        unitPrice: round2(prices.bpeM3),
        totalPrice: round2(costBpe),
        category: CalculatorType.SCREED,
      });

      if (prices.pumpFlat > 0) {
        totalCost += prices.pumpFlat;
        materialsList.push({
          id: "pump",
          name: t("calc.screed.mat.pump"),
          quantity: 1,
          unit: Unit.PACKAGE,
          unitPrice: round2(prices.pumpFlat),
          totalPrice: round2(prices.pumpFlat),
          category: CalculatorType.SCREED,
        });
      }
    }

    // Reinforcement
    if (reinforceType === "mesh") {
      const mesh = findMesh(meshTypeId);
      const coverM2 = mesh?.coverM2 ?? 2;
      const meshPrice = mesh?.price ?? prices.meshPanel;

      const panels = totalArea > 0 ? Math.ceil(totalArea / Math.max(0.5, coverM2)) : 0;
      const costMesh = panels * meshPrice;

      if (panels > 0 && meshPrice > 0) {
        totalCost += costMesh;
        materialsList.push({
          id: "mesh",
          name: t("calc.screed.mat.mesh", { mesh: mesh?.label ?? meshTypeId }),
          quantity: panels,
          quantityRaw: totalArea,
          unit: Unit.PIECE,
          unitPrice: round2(meshPrice),
          totalPrice: round2(costMesh),
          category: CalculatorType.SCREED,
          details: t("calc.screed.mat.mesh_details", { cover: coverM2 }),
        });
      }
    } else if (reinforceType === "fiber") {
      const totalFiberKg = wasteVol * fiberDosage;
      const qtyKg = Math.ceil(Math.max(0, totalFiberKg));
      const costFiber = qtyKg * prices.fiberKg;

      if (qtyKg > 0 && prices.fiberKg > 0) {
        totalCost += costFiber;
        materialsList.push({
          id: "fiber",
          name: t("calc.screed.mat.fiber"),
          quantity: qtyKg,
          quantityRaw: totalFiberKg,
          unit: Unit.KG,
          unitPrice: round2(prices.fiberKg),
          totalPrice: round2(costFiber),
          category: CalculatorType.SCREED,
          details: t("calc.screed.mat.fiber_details", { g: Math.round(fiberDosage * 1000) }),
        });
      }
    }

    // Underlayers
    if (usePolyane && totalArea > 0) {
      const areaPoly = totalArea * 1.15;
      const costPoly = areaPoly * prices.polyaneM2;
      totalCost += costPoly;
      materialsList.push({
        id: "polyane",
        name: t("calc.screed.mat.polyane"),
        quantity: Math.ceil(areaPoly),
        quantityRaw: areaPoly,
        unit: Unit.M2,
        unitPrice: round2(prices.polyaneM2),
        totalPrice: round2(costPoly),
        category: CalculatorType.SCREED,
      });
    }

    if (useStrip && totalPerimeter > 0) {
      const len = totalPerimeter * 1.05;
      const costStrip = len * prices.stripM;
      totalCost += costStrip;
      materialsList.push({
        id: "strip",
        name: t("calc.screed.mat.strip"),
        quantity: Math.ceil(len),
        quantityRaw: len,
        unit: Unit.METER,
        unitPrice: round2(prices.stripM),
        totalPrice: round2(costStrip),
        category: CalculatorType.SCREED,
      });
    }

    if (useInsulation && totalArea > 0) {
      const areaIns = totalArea * 1.05;
      const costIns = areaIns * prices.insulM2;
      totalCost += costIns;
      materialsList.push({
        id: "insul",
        name: t("calc.screed.mat.insulation", { thick: insulThick }),
        quantity: Math.ceil(areaIns),
        quantityRaw: areaIns,
        unit: Unit.M2,
        unitPrice: round2(prices.insulM2),
        totalPrice: round2(costIns),
        category: CalculatorType.SCREED,
      });
    }

    // Joints (rough)
    if (useJoints && totalArea > 40) {
      const jointLen = Math.max(0, Math.sqrt(totalArea));
      const costJoint = jointLen * prices.jointM;
      totalCost += costJoint;
      materialsList.push({
        id: "joints",
        name: t("calc.screed.mat.joints"),
        quantity: Math.ceil(jointLen),
        quantityRaw: jointLen,
        unit: Unit.METER,
        unitPrice: round2(prices.jointM),
        totalPrice: round2(costJoint),
        category: CalculatorType.SCREED,
      });
    }

    // Labor
    if (proMode && totalArea > 0) {
      const costLab = totalArea * prices.laborM2;
      totalCost += costLab;
      materialsList.push({
        id: "labor",
        name: t("calc.screed.mat.labor"),
        quantity: round2(totalArea),
        quantityRaw: totalArea,
        unit: Unit.M2,
        unitPrice: round2(prices.laborM2),
        totalPrice: round2(costLab),
        category: CalculatorType.SCREED,
      });
    }

    const avgThicknessCm = totalArea > 0 ? (totalVolume / totalArea) * 100 : 0;

    if (zones.length === 0) warnings.push(t("calc.screed.warn_add_zone"));
    if (avgThicknessCm > 12 && screedType !== "light") warnings.push(t("calc.screed.warn_high_thickness"));
    if ((screedType === "fluid_anh" || screedType === "fluid_cem") && wasteVol > 0 && wasteVol < 1) warnings.push(t("calc.screed.warn_small_fluid"));

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      totalArea,
      totalVolume,
      avgThickness: avgThicknessCm,
      warnings,
    };
  }, [
    t,
    zones,
    screedType,
    cementDosage,
    sandRatio,
    lightBagVol,
    reinforceType,
    meshTypeId,
    fiberDosage,
    usePolyane,
    useStrip,
    useInsulation,
    insulThick,
    useJoints,
    prices,
    proMode,
    meshOptions,
  ]);

  useEffect(() => {
    onCalculate({
      summary: t("calc.screed.summary", { vol: calculationData.totalVolume.toFixed(2), n: zones.length }),
      details: [
        { label: t("calc.screed.detail.area"), value: calculationData.totalArea.toFixed(1), unit: "m²" },
        { label: t("calc.screed.detail.avg_thick"), value: calculationData.avgThickness.toFixed(1), unit: "cm" },
        { label: t("calc.screed.detail.vol"), value: calculationData.totalVolume.toFixed(2), unit: "m³" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, t, zones.length]);

  return (
    <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/72 p-3 sm:p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner overflow-x-auto no-scrollbar backdrop-blur-xl">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[80px] py-2 text-xs font-extrabold rounded-2xl transition-all ${
              step === s ? "bg-white text-slate-950 shadow-[0_14px_32px_rgba(59,130,246,0.18)]" : "text-slate-400"
            }`}
          >
            {stepLabel(s)}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.screed.help_step1")}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("calc.screed.screed_type")}</label>
            <select
              value={screedType}
              onChange={(e) => setScreedType(e.target.value as any)}
              className="w-full p-2.5 border rounded bg-white text-slate-900"
            >
              {(["trad", "fluid_cem", "fluid_anh", "light", "ravoirage"] as ScreedType[]).map((v) => (
                <option key={v} value={v}>
                  {screedTypeLabel(v)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {zones.map((z) => (
              <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-700">{z.label}</span>
                  <button type="button" onClick={() => removeZone(z.id)} className="text-red-400" aria-label={t("common.remove")}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700">
                  <div>{t("calc.screed.zone_area_line", { area: z.area })}</div>
                  <div>{t("calc.screed.zone_thick_line", { thick: z.thickness })}</div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={z.isSloped}
                      onChange={(e) => updateZone(z.id, "isSloped", e.target.checked)}
                      className="mr-2 rounded text-blue-600"
                    />
                    {t("calc.screed.sloped")}
                  </label>

                  {z.isSloped && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={z.slopePct}
                        onChange={(e) => updateZone(z.id, "slopePct", clamp(toNum(e.target.value, 0), 0, 10))}
                        className="w-12 p-1 border rounded text-xs bg-white text-slate-900"
                        placeholder={t("calc.screed.ph_pct")}
                      />
                      <span className="text-xs">{t("calc.screed.pct_over")}</span>
                      <input
                        type="number"
                        value={z.slopeLen}
                        onChange={(e) => updateZone(z.id, "slopeLen", clamp(toNum(e.target.value, 0), 0, 50))}
                        className="w-12 p-1 border rounded text-xs bg-white text-slate-900"
                        placeholder={t("calc.screed.ph_m")}
                      />
                      <span className="text-xs">{t("calc.screed.m")}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="bg-slate-50 p-3 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-2">
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder={t("calc.screed.ph_zone_name")}
                    value={newZoneLabel}
                    onChange={(e) => setNewZoneLabel(e.target.value)}
                    className="w-full p-2 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                  />
                </div>
                <input
                  type="number"
                  placeholder={t("calc.screed.ph_m2")}
                  value={newZoneArea}
                  onChange={(e) => setNewZoneArea(e.target.value)}
                  className="w-full p-2 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
                <input
                  type="number"
                  placeholder={t("calc.screed.ph_thick_cm")}
                  value={newZoneThick}
                  onChange={(e) => setNewZoneThick(e.target.value)}
                  className="w-full p-2 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl"
                />
                <button
                  type="button"
                  onClick={addZone}
                  className="w-full bg-blue-600 text-white rounded font-bold text-sm flex justify-center items-center"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <button type="button" onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center mt-2">
            {t("common.next")} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.screed.help_step2")}
          </div>

          <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
            <label className="flex flex-wrap items-center justify-between gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
              <span className="text-sm font-medium">{t("calc.screed.opt_polyane")}</span>
              <input type="checkbox" checked={usePolyane} onChange={(e) => setUsePolyane(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex flex-wrap items-center justify-between gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
              <span className="text-sm font-medium">{t("calc.screed.opt_strip")}</span>
              <input type="checkbox" checked={useStrip} onChange={(e) => setUseStrip(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <div className="border-t border-slate-100 pt-2">
              <label className="flex flex-wrap items-center justify-between gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                <span className="text-sm font-medium">{t("calc.screed.opt_insulation")}</span>
                <input type="checkbox" checked={useInsulation} onChange={(e) => setUseInsulation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>

              {useInsulation && (
                <div className="px-2 pb-2">
                  <label className="block text-xs text-slate-500 mb-1">{t("calc.screed.insul_thick_cm")}</label>
                  <input type="number" value={insulThick} onChange={(e) => setInsulThick(e.target.value)} className="w-20 p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back")}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <BoxSelect size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.screed.help_step3")}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t("calc.screed.reinforce_title")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {(["none", "mesh", "fiber"] as ReinforceType[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReinforceType(r)}
                    className={`p-2 border rounded text-xs font-bold ${
                      reinforceType === r ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500" : "bg-white text-slate-500"
                    }`}
                  >
                    {reinforceLabel(r)}
                  </button>
                ))}
              </div>

              {reinforceType === "mesh" && (
                <div className="mt-2">
                  <label className="block text-xs text-slate-500 mb-1">{t("calc.screed.mesh.type")}</label>
                  <select value={meshTypeId} onChange={(e) => setMeshTypeId(e.target.value)} className="w-full p-2 border rounded bg-white text-slate-900 text-sm">
                    {meshOptions.length
                      ? meshOptions.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))
                      : ["ST10", "ST25"].map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                  </select>
                </div>
              )}

              {reinforceType === "fiber" && (
                <div className="mt-2">
                  <label className="block text-xs text-slate-500 mb-1">{t("calc.screed.fiber_dosage")}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={fiberDosage}
                    onChange={(e) => setFiberDosage(Math.max(0, toNum(e.target.value, 0.6)))}
                    className="w-full p-2 border rounded bg-white text-slate-900"
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              {(screedType === "trad" || screedType === "ravoirage") && (
                <>
                  <div className="mb-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t("calc.screed.cement_dosage")}</label>
                    <input type="number" value={cementDosage} onChange={(e) => setCementDosage(Math.max(0, Math.floor(toNum(e.target.value, 350))))} className="w-full p-2 border rounded bg-white text-slate-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t("calc.screed.sand_ratio")}</label>
                    <input type="number" value={sandRatio} onChange={(e) => setSandRatio(Math.max(0, Math.floor(toNum(e.target.value, 1200))))} className="w-full p-2 border rounded bg-white text-slate-900" />
                  </div>
                </>
              )}

              {screedType === "light" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t("calc.screed.light_bag_vol")}</label>
                  <input type="number" value={lightBagVol} onChange={(e) => setLightBagVol(Math.max(1, Math.floor(toNum(e.target.value, 15))))} className="w-full p-2 border rounded bg-white text-slate-900" />
                  <p className="text-[11px] text-slate-400 mt-1">{t("calc.screed.light_bag_help")}</p>
                </div>
              )}

              {(screedType === "fluid_anh" || screedType === "fluid_cem") && (
                <div className="flex items-start text-xs text-slate-500">
                  <Truck size={16} className="mr-2 shrink-0" />
                  {t("calc.screed.fluid_help")}
                </div>
              )}
            </div>

            <label className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white border rounded-lg cursor-pointer">
              <span className="text-sm font-medium">{t("calc.screed.use_joints")}</span>
              <input type="checkbox" checked={useJoints} onChange={(e) => setUseJoints(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back")}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.screed.help_step4")}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.screed.prices_title")}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? t("common.pro_mode") : t("common.simple_mode")}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(screedType === "trad" || screedType === "ravoirage") && (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.cement")}</label>
                    <input type="number" value={prices.cementBag} onChange={(e) => updatePrice("cementBag", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.sand")}</label>
                    <input type="number" value={prices.sandTon} onChange={(e) => updatePrice("sandTon", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                  </div>
                </>
              )}

              {screedType === "light" && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.premix")}</label>
                  <input type="number" value={prices.premixBag} onChange={(e) => updatePrice("premixBag", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {(screedType === "fluid_anh" || screedType === "fluid_cem") && (
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.fluid")}</label>
                  <input type="number" value={prices.bpeM3} onChange={(e) => updatePrice("bpeM3", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {reinforceType === "mesh" && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.mesh_fallback")}</label>
                  <input type="number" value={prices.meshPanel} onChange={(e) => updatePrice("meshPanel", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {reinforceType === "fiber" && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.fiber")}</label>
                  <input type="number" value={prices.fiberKg} onChange={(e) => updatePrice("fiberKg", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {usePolyane && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.polyane")}</label>
                  <input type="number" value={prices.polyaneM2} onChange={(e) => updatePrice("polyaneM2", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {useStrip && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.strip")}</label>
                  <input type="number" value={prices.stripM} onChange={(e) => updatePrice("stripM", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {useInsulation && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.insulation")}</label>
                  <input type="number" value={prices.insulM2} onChange={(e) => updatePrice("insulM2", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}

              {useJoints && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("calc.screed.price.joints")}</label>
                  <input type="number" value={prices.jointM} onChange={(e) => updatePrice("jointM", e.target.value)} className="w-full p-1.5 border border-white/80 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] backdrop-blur-xl" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-blue-600 font-bold mb-1">{t("calc.screed.price.labor")}</label>
                  <input type="number" value={prices.laborM2} onChange={(e) => updatePrice("laborM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl" />
                </div>
                {(screedType === "fluid_anh" || screedType === "fluid_cem") && (
                  <div>
                    <label className="block text-[11px] text-blue-600 font-bold mb-1">{t("calc.screed.price.pump")}</label>
                    <input type="number" value={prices.pumpFlat} onChange={(e) => updatePrice("pumpFlat", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded-2xl text-sm bg-white/92 text-slate-900 shadow-[0_10px_24px_rgba(37,99,235,0.08)] backdrop-blur-xl" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back")}
            </button>
            <button type="button" className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold shadow-sm flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("common.done")}
            </button>
          </div>
        </div>
      )}

      {calculationData.warnings.length > 0 && (
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