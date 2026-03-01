import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";
import {
  PaintBucket,
  Plus,
  Trash2,
  LayoutGrid,
  Settings,
  Check,
  ArrowRight,
  AlertTriangle,
  Eraser,
  CircleDollarSign,
  BoxSelect,
} from "lucide-react";

interface PaintRoom {
  id: string;
  label: string;
  length: number;
  width: number;
  height: number;
  doors: number;
  windows: number;
  includeCeiling: boolean;
  includeWalls: boolean;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const PaintCalculator: React.FC<Props> = ({ onCalculate }) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Rooms ---
  const [rooms, setRooms] = useState<PaintRoom[]>([]);
  const [newRoomLabel, setNewRoomLabel] = useState("");
  const [newL, setNewL] = useState("");
  const [newW, setNewW] = useState("");
  const [newH, setNewH] = useState("2.5");

  // --- 2. Prep & State ---
  const [substrateState, setSubstrateState] = useState<"good" | "medium" | "bad">("good");
  const [usePrimer, setUsePrimer] = useState(true);
  const [useFiller, setUseFiller] = useState(false);
  const [useSmoothing, setUseSmoothing] = useState(false);

  // --- 3. Paint Specs ---
  const [ceilingLayers, setCeilingLayers] = useState(2);
  const [wallLayers, setWallLayers] = useState(2);
  const [paintTypeWall, setPaintTypeWall] = useState<"acry_mat" | "acry_satin" | "velours">("velours");
  const [paintTypeCeiling, setPaintTypeCeiling] = useState<"acry_mat" | "acry_satin">("acry_mat");
  const [paintWood, setPaintWood] = useState(false);

  // --- 4. Supplies ---
  const [protectFloor, setProtectFloor] = useState(true);
  const [useTape, setUseTape] = useState(true);

  const priceOr = (key: string, fallback: number) => {
    const v = getUnitPrice(key);
    if (typeof v === "number" && !Number.isNaN(v) && v !== 0) return v;

    const d = (DEFAULT_PRICES as any)[key];
    if (d !== undefined) {
      const nd = Number(d);
      if (!Number.isNaN(nd) && nd !== 0) return nd;
    }
    return fallback;
  };

  // --- 5. Pricing ---
  const [prices, setPrices] = useState(() => ({
    primerL: priceOr("PRIMER_LITER", 8),
    paintWallL: priceOr("PAINT_LITER", 12),
    paintCeilingL: priceOr("PAINT_CEILING_LITER", priceOr("PAINT_LITER", 12) * 0.9),
    paintWoodL: priceOr("PAINT_WOOD_LITER", 25),
    fillerKg: priceOr("FILLER_KG", 4),
    smoothingKg: priceOr("SMOOTHING_KG", 3),
    tapeRoll: priceOr("MASKING_TAPE_ROLL", 4),
    tarpUnit: priceOr("PROTECT_TARP_UNIT", 15),
    kitTools: priceOr("PAINT_TOOLS_KIT", 45),
    laborPrepM2: priceOr("LABOR_PREP_M2", 15),
    laborPaintM2: priceOr("LABOR_PAINT_M2", 25),
  }));

  const updatePrice = (key: keyof typeof prices, val: string) => setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));

  // --- Helpers ---
  const addRoom = () => {
    const l = toNum(newL, 0);
    const w = toNum(newW, 0);
    const h = toNum(newH, 0);
    if (!(l > 0) || !(w > 0) || !(h > 0)) return;

    setRooms((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: (newRoomLabel || t("calc.paint.default_room", { n: prev.length + 1 })).trim(),
        length: l,
        width: w,
        height: h,
        doors: 1,
        windows: 1,
        includeCeiling: true,
        includeWalls: true,
      },
    ]);

    setNewL("");
    setNewW("");
    setNewRoomLabel("");
  };

  const removeRoom = (id: string) => setRooms((prev) => prev.filter((r) => r.id !== id));
  const updateRoom = (id: string, field: keyof PaintRoom, val: any) =>
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  // Auto-prep suggestions
  useEffect(() => {
    if (substrateState === "good") {
      setUseFiller(false);
      setUseSmoothing(false);
    } else if (substrateState === "medium") {
      setUseFiller(true);
      setUseSmoothing(false);
    } else {
      setUseFiller(true);
      setUseSmoothing(true);
    }
  }, [substrateState]);

  const substrateLabel = (s: "good" | "medium" | "bad") =>
    s === "good" ? t("calc.paint.state_good") : s === "medium" ? t("calc.paint.state_medium") : t("calc.paint.state_bad");

  // --- Calculation engine ---
  const calculationData = useMemo(() => {
    let areaWalls = 0;
    let areaCeiling = 0;
    let areaWood = 0;
    let perimeterTotal = 0;
    const warnings: string[] = [];

    const DOOR_W = 0.83;
    const DOOR_H = 2.04;
    const WINDOW_W = 1.2;
    const WINDOW_H = 1.25;

    rooms.forEach((r) => {
      const floorArea = r.length * r.width;
      const perimeter = 2 * (r.length + r.width);
      const grossWallArea = perimeter * r.height;

      const doorArea = DOOR_W * DOOR_H;
      const windowArea = WINDOW_W * WINDOW_H;

      const deductions = r.doors * doorArea + r.windows * windowArea;
      const netWallArea = Math.max(0, grossWallArea - deductions);

      if (r.includeWalls) areaWalls += netWallArea;
      if (r.includeCeiling) areaCeiling += floorArea;

      perimeterTotal += perimeter;

      if (paintWood) {
        areaWood += r.doors * doorArea * 2;
        areaWood += perimeter * 0.1;
      }

      if (grossWallArea <= 0) warnings.push(t("calc.paint.warn_invalid_dimensions", { room: r.label }));
      if (deductions > grossWallArea) warnings.push(t("calc.paint.warn_too_many_openings", { room: r.label }));
    });

    const totalPaintArea = areaWalls + areaCeiling;

    const materialsList: any[] = [];
    let totalCost = 0;

    if (totalPaintArea > 0) {
      if (useFiller) {
        const kgFiller = totalPaintArea * 0.2;
        const qty = Math.max(0, Math.ceil(kgFiller));
        const cost = qty * prices.fillerKg;
        totalCost += cost;
        materialsList.push({
          id: "filler",
          name: t("calc.paint.mat_filler"),
          quantity: qty,
          unit: Unit.KG,
          unitPrice: round2(prices.fillerKg),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      if (useSmoothing) {
        const kgSmooth = totalPaintArea * 1.5;
        const qty = Math.max(0, Math.ceil(kgSmooth));
        const cost = qty * prices.smoothingKg;
        totalCost += cost;
        materialsList.push({
          id: "smooth",
          name: t("calc.paint.mat_smoothing"),
          quantity: qty,
          unit: Unit.KG,
          unitPrice: round2(prices.smoothingKg),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      if (usePrimer) {
        const vol = totalPaintArea / 10;
        const qty = Math.max(0, Math.ceil(vol));
        const cost = qty * prices.primerL;
        totalCost += cost;
        materialsList.push({
          id: "primer",
          name: t("calc.paint.mat_primer"),
          quantity: qty,
          unit: Unit.LITER,
          unitPrice: round2(prices.primerL),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }
    }

    if (areaCeiling > 0) {
      const vol = (areaCeiling * ceilingLayers) / 10;
      const qty = Math.max(0, Math.ceil(vol));
      const cost = qty * prices.paintCeilingL;
      totalCost += cost;
      materialsList.push({
        id: "paint_ceil",
        name: t("calc.paint.mat_paint_ceiling", { type: paintTypeCeiling }),
        quantity: qty,
        unit: Unit.LITER,
        unitPrice: round2(prices.paintCeilingL),
        totalPrice: round2(cost),
        category: CalculatorType.PAINT,
        details: t("calc.paint.layers_n", { n: ceilingLayers }),
      });
    }

    if (areaWalls > 0) {
      const vol = (areaWalls * wallLayers) / 10;
      const qty = Math.max(0, Math.ceil(vol));
      const cost = qty * prices.paintWallL;
      totalCost += cost;
      materialsList.push({
        id: "paint_wall",
        name: t("calc.paint.mat_paint_walls", { type: paintTypeWall }),
        quantity: qty,
        unit: Unit.LITER,
        unitPrice: round2(prices.paintWallL),
        totalPrice: round2(cost),
        category: CalculatorType.PAINT,
        details: t("calc.paint.layers_n", { n: wallLayers }),
      });
    }

    if (areaWood > 0) {
      const vol = (areaWood * 2) / 12;
      const qty = Math.max(0, Math.ceil(vol));
      const cost = qty * prices.paintWoodL;
      totalCost += cost;
      materialsList.push({
        id: "paint_wood",
        name: t("calc.paint.mat_paint_wood"),
        quantity: qty,
        unit: Unit.LITER,
        unitPrice: round2(prices.paintWoodL),
        totalPrice: round2(cost),
        category: CalculatorType.PAINT,
        details: t("calc.paint.layers_n", { n: 2 }),
      });
    }

    if (totalPaintArea > 0) {
      if (protectFloor) {
        const floorTotal = rooms.reduce((acc, r) => acc + r.length * r.width, 0);
        const tarps = Math.max(0, Math.ceil(floorTotal / 20));
        const cost = tarps * prices.tarpUnit;
        totalCost += cost;
        materialsList.push({
          id: "tarp",
          name: t("calc.paint.mat_tarps"),
          quantity: tarps,
          unit: Unit.PIECE,
          unitPrice: round2(prices.tarpUnit),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      if (useTape) {
        const tapeM = perimeterTotal * 3;
        const rolls = Math.max(0, Math.ceil(tapeM / 50));
        const cost = rolls * prices.tapeRoll;
        totalCost += cost;
        materialsList.push({
          id: "tape",
          name: t("calc.paint.mat_tape"),
          quantity: rolls,
          unit: Unit.PIECE,
          unitPrice: round2(prices.tapeRoll),
          totalPrice: round2(cost),
          category: CalculatorType.PAINT,
        });
      }

      totalCost += prices.kitTools;
      materialsList.push({
        id: "tools",
        name: t("calc.paint.mat_tools_kit"),
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: round2(prices.kitTools),
        totalPrice: round2(prices.kitTools),
        category: CalculatorType.PAINT,
      });
    }

    if (proMode && totalPaintArea > 0) {
      const coef = substrateState === "bad" ? 1.5 : 1;
      const costLabPrep = totalPaintArea * prices.laborPrepM2 * coef;
      const costLabPaint = totalPaintArea * prices.laborPaintM2;
      totalCost += costLabPrep + costLabPaint;

      materialsList.push(
        {
          id: "lab_prep",
          name: t("calc.paint.mat_labor_prep"),
          quantity: round2(totalPaintArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborPrepM2),
          totalPrice: round2(costLabPrep),
          category: CalculatorType.PAINT,
          details: coef > 1 ? t("calc.paint.labor_coef_bad") : undefined,
        },
        {
          id: "lab_paint",
          name: t("calc.paint.mat_labor_paint"),
          quantity: round2(totalPaintArea),
          unit: Unit.M2,
          unitPrice: round2(prices.laborPaintM2),
          totalPrice: round2(costLabPaint),
          category: CalculatorType.PAINT,
        }
      );
    }

    if (rooms.length === 0) warnings.push(t("calc.paint.warn_add_room"));
    if (totalPaintArea <= 0 && rooms.length > 0) warnings.push(t("calc.paint.warn_no_surface_selected"));

    return {
      totalCost: round2(totalCost),
      materials: materialsList,
      areaWalls,
      areaCeiling,
      areaWood,
      warnings,
    };
  }, [
    t,
    rooms,
    substrateState,
    usePrimer,
    useFiller,
    useSmoothing,
    ceilingLayers,
    wallLayers,
    paintTypeWall,
    paintTypeCeiling,
    paintWood,
    protectFloor,
    useTape,
    prices,
    proMode,
  ]);

  useEffect(() => {
    const totalSurface = calculationData.areaWalls + calculationData.areaCeiling;
    onCalculate({
      summary: t("calc.paint.summary", { area: totalSurface.toFixed(1) }),
      details: [
        { label: t("calc.paint.detail_walls"), value: calculationData.areaWalls.toFixed(1), unit: "m²" },
        { label: t("calc.paint.detail_ceilings"), value: calculationData.areaCeiling.toFixed(1), unit: "m²" },
        { label: t("calc.paint.detail_state"), value: substrateLabel(substrateState), unit: "" },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings.length ? calculationData.warnings : undefined,
    });
  }, [calculationData, onCalculate, substrateState, t]);

  const stepLabel = (s: number) => {
    if (s === 1) return t("calc.paint.step_1");
    if (s === 2) return t("calc.paint.step_2");
    if (s === 3) return t("calc.paint.step_3");
    if (s === 4) return t("calc.paint.step_4");
    return t("calc.paint.step_5");
  };

  const paintTypeLabel = (type: string) => t(`calc.paint.paint_type.${type}`);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg overflow-x-auto">
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {stepLabel(s)}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <LayoutGrid size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.paint.help_step1")}
          </div>

          <div className="space-y-3">
            {rooms.map((r) => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-700">{r.label}</span>
                  <button type="button" onClick={() => removeRoom(r.id)} className="text-red-400" aria-label={t("common.remove")}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="text-xs text-slate-500 mb-2">
                  {t("calc.paint.room_dims_line", { l: r.length, w: r.width, h: r.height })}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center justify-between bg-slate-50 border rounded p-2">
                    <span>{t("calc.paint.doors")}</span>
                    <input
                      type="number"
                      min={0}
                      value={r.doors}
                      onChange={(e) => updateRoom(r.id, "doors", clamp(toNum(e.target.value, 0), 0, 20))}
                      className="w-16 p-1 border rounded bg-white text-right"
                    />
                  </label>
                  <label className="flex items-center justify-between bg-slate-50 border rounded p-2">
                    <span>{t("calc.paint.windows")}</span>
                    <input
                      type="number"
                      min={0}
                      value={r.windows}
                      onChange={(e) => updateRoom(r.id, "windows", clamp(toNum(e.target.value, 0), 0, 50))}
                      className="w-16 p-1 border rounded bg-white text-right"
                    />
                  </label>
                </div>

                <div className="flex gap-3 border-t pt-2 mt-2">
                  <label className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={r.includeCeiling}
                      onChange={(e) => updateRoom(r.id, "includeCeiling", e.target.checked)}
                      className="mr-1 rounded text-blue-600"
                    />
                    {t("calc.paint.ceiling")}
                  </label>
                  <label className="flex items-center text-xs">
                    <input
                      type="checkbox"
                      checked={r.includeWalls}
                      onChange={(e) => updateRoom(r.id, "includeWalls", e.target.checked)}
                      className="mr-1 rounded text-blue-600"
                    />
                    {t("calc.paint.walls")}
                  </label>
                </div>
              </div>
            ))}

            <div className="bg-slate-50 p-3 rounded-lg border border-blue-200">
              <input
                type="text"
                placeholder={t("calc.paint.ph_room_name")}
                value={newRoomLabel}
                onChange={(e) => setNewRoomLabel(e.target.value)}
                className="w-full p-2 mb-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
              />
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="number"
                  placeholder={t("calc.paint.ph_len")}
                  value={newL}
                  onChange={(e) => setNewL(e.target.value)}
                  className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                />
                <input
                  type="number"
                  placeholder={t("calc.paint.ph_wid")}
                  value={newW}
                  onChange={(e) => setNewW(e.target.value)}
                  className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                />
                <input
                  type="number"
                  placeholder={t("calc.paint.ph_hgt")}
                  value={newH}
                  onChange={(e) => setNewH(e.target.value)}
                  className="p-2 border border-slate-300 rounded text-sm bg-white text-slate-900"
                />
              </div>

              <button type="button" onClick={addRoom} className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm flex justify-center items-center">
                <Plus size={16} className="mr-1" /> {t("common.add")}
              </button>
            </div>
          </div>

          <button type="button" onClick={() => setStep(2)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2">
            {t("common.next")} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Eraser size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.paint.help_step2")}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">{t("calc.paint.state_title")}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSubstrateState("good")}
                className={`p-2 rounded border text-xs font-bold ${
                  substrateState === "good" ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-white"
                }`}
              >
                {t("calc.paint.state_good")}
              </button>
              <button
                type="button"
                onClick={() => setSubstrateState("medium")}
                className={`p-2 rounded border text-xs font-bold ${
                  substrateState === "medium" ? "bg-amber-50 border-amber-500 text-amber-800" : "bg-white"
                }`}
              >
                {t("calc.paint.state_medium")}
              </button>
              <button
                type="button"
                onClick={() => setSubstrateState("bad")}
                className={`p-2 rounded border text-xs font-bold ${
                  substrateState === "bad" ? "bg-red-50 border-red-500 text-red-800" : "bg-white"
                }`}
              >
                {t("calc.paint.state_bad")}
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.paint.prep_title")}</h4>

            <label className="flex items-center justify-between">
              <span className="text-sm">{t("calc.paint.prep_filler")}</span>
              <input type="checkbox" checked={useFiller} onChange={(e) => setUseFiller(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between">
              <span className="text-sm">{t("calc.paint.prep_smoothing")}</span>
              <input type="checkbox" checked={useSmoothing} onChange={(e) => setUseSmoothing(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm block">{t("calc.paint.prep_primer")}</span>
                <span className="text-[10px] text-slate-400">{t("calc.paint.prep_primer_help")}</span>
              </div>
              <input type="checkbox" checked={usePrimer} onChange={(e) => setUsePrimer(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back")}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <PaintBucket size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.paint.help_step3")}
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("calc.paint.ceilings_title")}</h4>
            <div className="flex gap-2">
              <select value={paintTypeCeiling} onChange={(e) => setPaintTypeCeiling(e.target.value as any)} className="flex-1 p-2 text-sm border rounded bg-white text-slate-900">
                <option value="acry_mat">{paintTypeLabel("acry_mat")}</option>
                <option value="acry_satin">{paintTypeLabel("acry_satin")}</option>
              </select>
              <select value={ceilingLayers} onChange={(e) => setCeilingLayers(toNum(e.target.value, 2))} className="w-24 p-2 text-sm border rounded bg-white text-slate-900">
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {t("calc.paint.layers_n", { n })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("calc.paint.walls_title")}</h4>
            <div className="flex gap-2">
              <select value={paintTypeWall} onChange={(e) => setPaintTypeWall(e.target.value as any)} className="flex-1 p-2 text-sm border rounded bg-white text-slate-900">
                <option value="acry_mat">{paintTypeLabel("acry_mat")}</option>
                <option value="velours">{paintTypeLabel("velours")}</option>
                <option value="acry_satin">{paintTypeLabel("acry_satin")}</option>
              </select>
              <select value={wallLayers} onChange={(e) => setWallLayers(toNum(e.target.value, 2))} className="w-24 p-2 text-sm border rounded bg-white text-slate-900">
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {t("calc.paint.layers_n", { n })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-bold text-slate-700">{t("calc.paint.opt_wood")}</span>
              <input type="checkbox" checked={paintWood} onChange={(e) => setPaintWood(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back")}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <BoxSelect size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.paint.help_step4")}
          </div>

          <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200">
            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
              <div>
                <span className="text-sm font-medium block">{t("calc.paint.opt_floor_protection")}</span>
                <span className="text-[10px] text-slate-400">{t("calc.paint.opt_floor_protection_help")}</span>
              </div>
              <input type="checkbox" checked={protectFloor} onChange={(e) => setProtectFloor(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <label className="flex items-center justify-between p-2 hover:bg-slate-50 rounded cursor-pointer">
              <div>
                <span className="text-sm font-medium block">{t("calc.paint.opt_tape")}</span>
                <span className="text-[10px] text-slate-400">{t("calc.paint.opt_tape_help")}</span>
              </div>
              <input type="checkbox" checked={useTape} onChange={(e) => setUseTape(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
            </label>

            <div className="p-2 bg-slate-50 rounded text-xs text-slate-600">
              {t("calc.paint.tools_included_price", { price: round2(prices.kitTools) })}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back")}
            </button>
            <button type="button" onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next")}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.paint.help_step5")}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.paint.prices_title")}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" /> {proMode ? t("common.pro_mode") : t("common.simple_mode")}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_wall_paint")}</label>
                <input type="number" value={prices.paintWallL} onChange={(e) => updatePrice("paintWallL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_ceiling_paint")}</label>
                <input type="number" value={prices.paintCeilingL} onChange={(e) => updatePrice("paintCeilingL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              {usePrimer && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_primer")}</label>
                  <input type="number" value={prices.primerL} onChange={(e) => updatePrice("primerL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              {useFiller && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_filler")}</label>
                  <input type="number" value={prices.fillerKg} onChange={(e) => updatePrice("fillerKg", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              {useSmoothing && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_smoothing")}</label>
                  <input type="number" value={prices.smoothingKg} onChange={(e) => updatePrice("smoothingKg", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_tarp")}</label>
                <input type="number" value={prices.tarpUnit} onChange={(e) => updatePrice("tarpUnit", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_tape")}</label>
                <input type="number" value={prices.tapeRoll} onChange={(e) => updatePrice("tapeRoll", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
              </div>

              {paintWood && (
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">{t("calc.paint.price_wood_paint")}</label>
                  <input type="number" value={prices.paintWoodL} onChange={(e) => updatePrice("paintWoodL", e.target.value)} className="w-full p-1.5 border rounded text-sm bg-white text-slate-900" />
                </div>
              )}
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.paint.price_labor_prep")}</label>
                  <input type="number" value={prices.laborPrepM2} onChange={(e) => updatePrice("laborPrepM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.paint.price_labor_paint")}</label>
                  <input type="number" value={prices.laborPaintM2} onChange={(e) => updatePrice("laborPaintM2", e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900" />
                </div>
              </div>
            )}
          </div>

          {calculationData.warnings.length > 0 && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
              {calculationData.warnings.map((w, i) => (
                <div key={i} className="flex items-center">
                  <AlertTriangle size={12} className="mr-2" /> {w}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back")}
            </button>
            <button type="button" disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("common.calculated")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};