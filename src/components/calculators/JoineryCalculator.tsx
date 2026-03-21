// src/components/calculators/JoineryCalculator.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CalculatorType, CalculationResult, Unit, CalculatorSnapshot } from "../../../types";
import { DEFAULT_PRICES, getOpeningPresets } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";

import {
  BoxSelect,
  Plus,
  Trash2,
  Settings,
  Info,
  Check,
  Hammer,
  CircleDollarSign,
  Copy,
  Edit2,
  X,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";

type JoineryType = "window" | "door" | "bay" | "velux" | "garage";
type JoineryMaterial = "pvc" | "alu" | "wood";
type ShutterType = "none" | "rolling" | "swing";
type InstallType = "new" | "reno" | "tunnel";

interface JoineryItem {
  id: string;
  type: JoineryType;
  label: string;
  width: number; // m
  height: number; // m
  quantity: number;
  material: JoineryMaterial;
  shutter: ShutterType;
  priceOverride?: number; // supply €/u
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialSnapshot?: CalculatorSnapshot;
}

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clampInt = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(n)));

type TFn = (key: string, opts?: any) => string;

const getTypeLabel = (t: TFn, type: JoineryType) => {
  switch (type) {
    case "window":
      return t("joinery.type.window", { defaultValue: "Window" });
    case "door":
      return t("joinery.type.door", { defaultValue: "Front door" });
    case "bay":
      return t("joinery.type.bay", { defaultValue: "Sliding bay" });
    case "velux":
      return t("joinery.type.velux", { defaultValue: "Roof window" });
    case "garage":
      return t("joinery.type.garage", { defaultValue: "Garage door" });
    default:
      return t("joinery.type.generic", { defaultValue: "Joinery" });
  }
};

export const JoineryCalculator: React.FC<Props> = ({ onCalculate,
  initialSnapshot
}) => {
  const { t, i18n } = useTranslation();

  const OPENING_PRESETS = useMemo(() => getOpeningPresets(), [i18n.language]);

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1) Inventory ---
  const [items, setItems] = useState<JoineryItem[]>([]);

  // Add/Edit form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formType, setFormType] = useState<JoineryType>("window");
  const [formLabel, setFormLabel] = useState(() => getTypeLabel(t, "window"));
  const [formW, setFormW] = useState("");
  const [formH, setFormH] = useState("");
  const [formQty, setFormQty] = useState(1);
  const [formMat, setFormMat] = useState<JoineryMaterial>("pvc");
  const [formShutter, setFormShutter] = useState<ShutterType>("none");
  const [formPriceOverride, setFormPriceOverride] = useState<string>("");

  // --- 2) Install & supplies ---
  const [installType, setInstallType] = useState<InstallType>("new");
  const [useCompriband, setUseCompriband] = useState(true);
  const [useSilicone, setUseSilicone] = useState(true);
  const [useFoam, setUseFoam] = useState(true);
  const [useFixings, setUseFixings] = useState(true);
  const [wastePct, setWastePct] = useState(10);

  // --- Price helper: catalog > DEFAULT_PRICES > fallback ---
  const priceOr = (key: string, fallback: number) => {
    const v = getUnitPrice(key);
    if (typeof v === "number" && !Number.isNaN(v) && v !== 0) return v;

    const d = (DEFAULT_PRICES as any)[key];
    if (d !== undefined) {
      const nd = Number(d);
      if (!Number.isNaN(nd)) return nd;
    }
    return fallback;
  };

  // --- 3) Pricing ---
  const [prices, setPrices] = useState(() => ({
    // Supply base (PVC)
    window: priceOr("JOINERY_WINDOW_UNIT", 250),
    door: priceOr("JOINERY_DOOR_UNIT", 800),
    bay: priceOr("JOINERY_BAY_UNIT", 1200),
    velux: priceOr("JOINERY_VELUX_UNIT", 400),
    garage: priceOr("JOINERY_GARAGE_UNIT", 1500),

    // Options
    shutterRolling: priceOr("JOINERY_SHUTTER_ROLLING_UNIT", 300),
    shutterSwing: priceOr("JOINERY_SHUTTER_SWING_UNIT", 200),

    // Material coefficients
    materialAlu: 1.4,
    materialWood: 1.5,

    // Labor (€/u)
    installWindow: priceOr("JOINERY_INSTALL_WINDOW_UNIT", 150),
    installDoor: priceOr("JOINERY_INSTALL_DOOR_UNIT", 250),
    installBay: priceOr("JOINERY_INSTALL_BAY_UNIT", 350),
    installVelux: priceOr("JOINERY_INSTALL_VELUX_UNIT", 200),
    installGarage: priceOr("JOINERY_INSTALL_GARAGE_UNIT", 400),
    renoSurcharge: priceOr("JOINERY_RENO_SURCHARGE_UNIT", 50),

    // Supplies
    compribandM: priceOr("JOINERY_COMPRIBAND_M", 2.5),
    siliconeCart: priceOr("JOINERY_SILICONE_CART", 8),
    foamCart: priceOr("JOINERY_FOAM_CART", 12),
    fixingKit: priceOr("JOINERY_FIXING_KIT", 5),
  }));

  useEffect(() => {
    const values = initialSnapshot?.values as Record<string, any> | undefined;
    if (!values) return;
    if (values.step !== undefined) setStep(values.step as any);
    if (values.proMode !== undefined) setProMode(values.proMode as any);
    if (values.items !== undefined) setItems(values.items as any);
    if (values.showForm !== undefined) setShowForm(values.showForm as any);
    if (values.editingId !== undefined) setEditingId(values.editingId as any);
    if (values.formType !== undefined) setFormType(values.formType as any);
    if (values.formLabel !== undefined) setFormLabel(values.formLabel as any);
    if (values.formW !== undefined) setFormW(values.formW as any);
    if (values.formH !== undefined) setFormH(values.formH as any);
    if (values.formQty !== undefined) setFormQty(values.formQty as any);
    if (values.formMat !== undefined) setFormMat(values.formMat as any);
    if (values.formShutter !== undefined) setFormShutter(values.formShutter as any);
    if (values.formPriceOverride !== undefined) setFormPriceOverride(values.formPriceOverride as any);
    if (values.installType !== undefined) setInstallType(values.installType as any);
    if (values.useCompriband !== undefined) setUseCompriband(values.useCompriband as any);
    if (values.useSilicone !== undefined) setUseSilicone(values.useSilicone as any);
    if (values.useFoam !== undefined) setUseFoam(values.useFoam as any);
    if (values.useFixings !== undefined) setUseFixings(values.useFixings as any);
    if (values.wastePct !== undefined) setWastePct(values.wastePct as any);
    if (values.prices !== undefined) setPrices(values.prices as any);
  }, [initialSnapshot]);

  const snapshot: CalculatorSnapshot = {
    version: 1,
    calculatorType: CalculatorType.JOINERY,
    values: {
      step,
      proMode,
      items,
      showForm,
      editingId,
      formType,
      formLabel,
      formW,
      formH,
      formQty,
      formMat,
      formShutter,
      formPriceOverride,
      installType,
      useCompriband,
      useSilicone,
      useFoam,
      useFixings,
      wastePct,
      prices,
    },
  };


  type PriceKey = keyof typeof prices;
  const updatePrice = (key: PriceKey, val: string) =>
    setPrices((p) => ({ ...p, [key]: toNum(val, 0) }));

  // --- Presets (supports multiple shapes) ---
  const presetOptions = useMemo(() => {
    const src = OPENING_PRESETS as any;

    type Preset = { label: string; width: number; height: number; type?: JoineryType };
    const list: Preset[] = [];

    const add = (label: string, w: any, h: any, type?: JoineryType) => {
      const W = toNum(w, 0);
      const H = toNum(h, 0);
      if (!label || !(W > 0) || !(H > 0)) return;
      list.push({ label: String(label), width: W, height: H, type });
    };

    if (src) {
      // Legacy arrays
      if (Array.isArray(src.WINDOWS))
        src.WINDOWS.forEach((p: any) =>
          add(p.label ?? t("joinery.type.window", { defaultValue: "Window" }), p.width, p.height, "window")
        );
      if (Array.isArray(src.DOORS))
        src.DOORS.forEach((p: any) =>
          add(p.label ?? t("joinery.type.door", { defaultValue: "Door" }), p.width, p.height, "door")
        );

      // Object presets
      if (src.window) add(t("joinery.type.window", { defaultValue: "Window" }), src.window.w, src.window.h, "window");
      if (src.door) add(t("joinery.type.door", { defaultValue: "Door" }), src.door.w, src.door.h, "door");
      if (src.bay) add(t("joinery.type.bay", { defaultValue: "Sliding bay" }), src.bay.w, src.bay.h, "bay");
      if (src.garage) add(t("joinery.type.garage", { defaultValue: "Garage door" }), src.garage.w, src.garage.h, "garage");
    }

    // Deduplicate by label
    const uniq = new Map<string, Preset>();
    for (const p of list) uniq.set(p.label, p);

    return Array.from(uniq.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [t]);

  // --- Form handlers ---
  const resetForm = () => {
    setFormType("window");
    setFormLabel(getTypeLabel(t, "window"));
    setFormW("");
    setFormH("");
    setFormQty(1);
    setFormMat("pvc");
    setFormShutter("none");
    setFormPriceOverride("");
  };

  const handleAddItem = () => {
    setShowForm(true);
    setEditingId(null);
    resetForm();
  };

  const handleEditItem = (item: JoineryItem) => {
    setShowForm(true);
    setEditingId(item.id);
    setFormType(item.type);
    setFormLabel(item.label);
    setFormW(String(item.width));
    setFormH(String(item.height));
    setFormQty(item.quantity);
    setFormMat(item.material);
    setFormShutter(item.shutter);
    setFormPriceOverride(item.priceOverride !== undefined ? String(item.priceOverride) : "");
  };

  const handleSaveItem = () => {
    const w = toNum(formW, 0);
    const h = toNum(formH, 0);
    const q = clampInt(toNum(formQty, 1), 1, 999);
    if (!(w > 0) || !(h > 0)) return;

    const override = formPriceOverride.trim() ? toNum(formPriceOverride, NaN) : NaN;

    const next: JoineryItem = {
      id: editingId || Date.now().toString(),
      type: formType,
      label: (formLabel || getTypeLabel(t, formType)).trim(),
      width: w,
      height: h,
      quantity: q,
      material: formMat,
      shutter: formShutter,
      ...(Number.isFinite(override) ? { priceOverride: override } : {}),
    };

    setItems((prev) =>
      editingId ? prev.map((i) => (i.id === editingId ? next : i)) : [...prev, next]
    );
    setShowForm(false);
  };

  const handleDeleteItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));
  const handleDuplicateItem = (item: JoineryItem) =>
    setItems((prev) => [...prev, { ...item, id: Date.now().toString() }]);

  const applyPreset = (presetLabel: string) => {
    const p = presetOptions.find((x) => x.label === presetLabel);
    if (!p) return;

    setFormW(String(p.width));
    setFormH(String(p.height));
    setFormLabel(p.label);

    if (p.type) {
      setFormType(p.type);
      if (p.type === "door" || p.type === "garage" || p.type === "velux") setFormShutter("none");
    }
  };

  // --- Calculation ---
  const calc = useMemo(() => {
    let totalCost = 0;
    let totalArea = 0;
    let totalPerimeter = 0;
    const materialsList: any[] = [];
    const warnings: string[] = [];

    const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

    const installUnitPriceFor = (type: JoineryType) => {
      let u = 0;
      if (type === "window") u = prices.installWindow;
      else if (type === "door") u = prices.installDoor;
      else if (type === "bay") u = prices.installBay;
      else if (type === "velux") u = prices.installVelux;
      else if (type === "garage") u = prices.installGarage;

      if (installType === "reno") u += prices.renoSurcharge;
      return u;
    };

    items.forEach((item) => {
      const area = item.width * item.height * item.quantity;
      const perim = 2 * (item.width + item.height) * item.quantity;
      totalArea += area;
      totalPerimeter += perim;

      let baseSupply = (prices as any)[item.type] ?? prices.window;

      if (item.material === "alu") baseSupply *= prices.materialAlu;
      if (item.material === "wood") baseSupply *= prices.materialWood;

      if (item.shutter === "rolling") baseSupply += prices.shutterRolling;
      if (item.shutter === "swing") baseSupply += prices.shutterSwing;

      const unitSupply = item.priceOverride ?? baseSupply;
      const supplyCost = unitSupply * item.quantity;

      const installUnit = installUnitPriceFor(item.type);
      const laborCost = installUnit * item.quantity;

      totalCost += supplyCost + laborCost;

      const shutterLabel =
        item.shutter === "none"
          ? undefined
          : item.shutter === "rolling"
          ? t("joinery.shutter.rolling", { defaultValue: "Rolling" })
          : t("joinery.shutter.swing", { defaultValue: "Swing" });

      if (!proMode) {
        materialsList.push({
          id: item.id,
          name: `${item.label} ${item.material.toUpperCase()} ${item.width}×${item.height}m`,
          quantity: item.quantity,
          unit: Unit.PIECE,
          unitPrice: round2(unitSupply + installUnit),
          totalPrice: round2(supplyCost + laborCost),
          category: CalculatorType.JOINERY,
          details: t("joinery.details.supply_install", {
            defaultValue: "Supply: {{supply}}€/u • Install: {{install}}€/u",
            supply: round2(unitSupply),
            install: round2(installUnit),
          }),
        });
      } else {
        materialsList.push(
          {
            id: `${item.id}_supply`,
            name: t("joinery.line.supply_name", {
              defaultValue: "{{label}} (supply) {{mat}} {{w}}×{{h}}m",
              label: item.label,
              mat: item.material.toUpperCase(),
              w: item.width,
              h: item.height,
            }),
            quantity: item.quantity,
            unit: Unit.PIECE,
            unitPrice: round2(unitSupply),
            totalPrice: round2(supplyCost),
            category: CalculatorType.JOINERY,
            details:
              item.shutter !== "none"
                ? t("joinery.details.shutter", {
                    defaultValue: "Shutter: {{shutter}}",
                    shutter: shutterLabel ?? "",
                  })
                : undefined,
          },
          {
            id: `${item.id}_install`,
            name: t("joinery.line.install_name", {
              defaultValue: "Install {{label}}",
              label: item.label,
            }),
            quantity: item.quantity,
            unit: Unit.PIECE,
            unitPrice: round2(installUnit),
            totalPrice: round2(laborCost),
            category: CalculatorType.JOINERY,
            details: t("joinery.details.install_type", {
              defaultValue: "Install type: {{type}}",
              type:
                installType === "new"
                  ? t("joinery.install.new_full", { defaultValue: "New build (surface mount)" })
                  : installType === "reno"
                  ? t("joinery.install.reno_full", { defaultValue: "Renovation" })
                  : t("joinery.install.tunnel_full", { defaultValue: "Tunnel" }),
            }),
          }
        );
      }

      if (item.priceOverride !== undefined && item.priceOverride < 50) {
        warnings.push(
          t("joinery.warn.low_override", {
            defaultValue: 'Very low override price for "{{label}}".',
            label: item.label,
          })
        );
      }
    });

    // Consumables
    const wasteCoef = 1 + toNum(wastePct, 0) / 100;

    if (totalUnits > 0) {
      if (useCompriband) {
        const len = totalPerimeter * wasteCoef;
        const cost = len * prices.compribandM;
        totalCost += cost;
        materialsList.push({
          id: "compriband",
          name: t("joinery.supplies.compriband", { defaultValue: "Compriband (sealing)" }),
          quantity: Math.ceil(len),
          unit: Unit.METER,
          unitPrice: prices.compribandM,
          totalPrice: round2(cost),
          category: CalculatorType.JOINERY,
          details: t("common.waste_plus", { defaultValue: "+{{pct}}%", pct: toNum(wastePct, 0) }),
        });
      }

      if (useSilicone) {
        const len = totalPerimeter * wasteCoef;
        const carts = Math.ceil(len / 15);
        const cost = carts * prices.siliconeCart;
        totalCost += cost;
        materialsList.push({
          id: "silicone",
          name: t("joinery.supplies.silicone", { defaultValue: "Silicone sealant" }),
          quantity: carts,
          unit: Unit.PIECE,
          unitPrice: prices.siliconeCart,
          totalPrice: round2(cost),
          category: CalculatorType.JOINERY,
          details: t("joinery.supplies.silicone_yield", { defaultValue: "≈ 15m/cart." }),
        });
      }

      if (useFoam) {
        const carts = Math.ceil(totalUnits / 3);
        const cost = carts * prices.foamCart;
        totalCost += cost;
        materialsList.push({
          id: "foam",
          name: t("joinery.supplies.foam", { defaultValue: "PU expanding foam" }),
          quantity: carts,
          unit: Unit.PIECE,
          unitPrice: prices.foamCart,
          totalPrice: round2(cost),
          category: CalculatorType.JOINERY,
        });
      }

      if (useFixings) {
        const cost = totalUnits * prices.fixingKit;
        totalCost += cost;
        materialsList.push({
          id: "fixings",
          name: t("joinery.supplies.fixings", { defaultValue: "Fixing kit (screws/brackets/shims)" }),
          quantity: totalUnits,
          unit: Unit.PACKAGE,
          unitPrice: prices.fixingKit,
          totalPrice: round2(cost),
          category: CalculatorType.JOINERY,
        });
      }
    } else {
      warnings.push(t("joinery.warn.no_items", { defaultValue: "No joinery items added." }));
    }

    if (toNum(wastePct, 0) > 30)
      warnings.push(t("joinery.warn.high_waste", { defaultValue: "High waste allowance." }));

    return {
      totalCost: round2(totalCost),
      totalArea,
      totalPerimeter,
      totalUnits,
      materials: materialsList,
      warnings,
    };
  }, [
    items,
    installType,
    useCompriband,
    useSilicone,
    useFoam,
    useFixings,
    wastePct,
    prices,
    proMode,
    t,
  ]);

  // Push to parent
  useEffect(() => {
    onCalculate({
      snapshot,
      summary: `${calc.totalUnits} ${t("joinery.summary.units", { defaultValue: "items" })}`,
      details: [
        {
          label: t("joinery.stats.area", { defaultValue: "Total area" }),
          value: calc.totalArea.toFixed(1),
          unit: "m²",
        },
        {
          label: t("joinery.stats.perimeter", { defaultValue: "Total perimeter" }),
          value: calc.totalPerimeter.toFixed(1),
          unit: "m",
        },
        {
          label: t("joinery.stats.install", { defaultValue: "Install type" }),
          value:
            installType === "new"
              ? t("joinery.install.new_full", { defaultValue: "New build (surface mount)" })
              : installType === "reno"
              ? t("joinery.install.reno_full", { defaultValue: "Renovation" })
              : t("joinery.install.tunnel_full", { defaultValue: "Tunnel" }),
          unit: "",
        },
      ],
      materials: calc.materials,
      totalCost: calc.totalCost,
      warnings: calc.warnings.length ? calc.warnings : undefined,
    });
  }, [calc, installType, onCalculate, t]);

  return (
    <div className="space-y-5 rounded-[28px] border border-white/70 bg-white/74 p-3.5 shadow-[0_22px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-5 animate-in fade-in">
      {/* Steps */}
      <div className="mb-5 flex items-center gap-1.5 overflow-x-auto rounded-[20px] border border-white/80 bg-slate-50/90 p-1.5 shadow-inner no-scrollbar">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && t("joinery.steps.1", { defaultValue: "1. List" })}
            {s === 2 && t("joinery.steps.2", { defaultValue: "2. Install" })}
            {s === 3 && t("joinery.steps.3", { defaultValue: "3. Prices" })}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("joinery.step1.hint", { defaultValue: "Create your joinery list." })}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <BoxSelect size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("joinery.empty", { defaultValue: "No joinery items yet." })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 block truncate">
                        {item.quantity}× {item.label}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {item.width}×{item.height}m • {item.material.toUpperCase()}
                        {item.shutter !== "none" && (
                          <span className="ml-2 text-blue-600 font-medium">
                            + {t("joinery.shutter", { defaultValue: "Shutter" })}{" "}
                            {item.shutter === "rolling"
                              ? t("joinery.shutter.rolling", { defaultValue: "Rolling" })
                              : t("joinery.shutter.swing", { defaultValue: "Swing" })}
                          </span>
                        )}
                        {item.priceOverride !== undefined && (
                          <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-1 rounded">
                            {t("joinery.price_override", { defaultValue: "override" })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                        title={t("common.duplicate", { defaultValue: "Duplicate" })}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                        title={t("common.edit", { defaultValue: "Edit" })}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title={t("common.delete", { defaultValue: "Delete" })}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center shadow-md active:scale-95 transition-transform"
          >
            <Plus size={20} className="mr-2" /> {t("joinery.add", { defaultValue: "Add joinery item" })}
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex justify-center items-center"
            disabled={items.length === 0}
          >
            {t("common.next", { defaultValue: "Next" })} <ArrowRight size={18} className="ml-2" />
          </button>

          {/* Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                  <h3 className="font-bold text-slate-800">
                    {editingId ? t("common.edit", { defaultValue: "Edit" }) : t("common.add", { defaultValue: "Add" })}
                  </h3>
                  <button type="button" onClick={() => setShowForm(false)} aria-label="Close">
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("common.type", { defaultValue: "Type" })}
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        const tt = e.target.value as JoineryType;
                        setFormType(tt);
                        setFormLabel(getTypeLabel(t, tt));
                        if (tt === "door" || tt === "garage" || tt === "velux") setFormShutter("none");
                      }}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                    >
                      <option value="window">{t("joinery.type.window", { defaultValue: "Window" })}</option>
                      <option value="door">{t("joinery.type.door", { defaultValue: "Door" })}</option>
                      <option value="bay">{t("joinery.type.bay", { defaultValue: "Sliding bay" })}</option>
                      <option value="velux">{t("joinery.type.velux", { defaultValue: "Roof window" })}</option>
                      <option value="garage">{t("joinery.type.garage", { defaultValue: "Garage door" })}</option>
                    </select>
                  </div>

                  {!editingId && presetOptions.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {t("common.preset", { defaultValue: "Preset" })}
                      </label>
                      <select
                        onChange={(e) => applyPreset(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                        defaultValue=""
                      >
                        <option value="">{t("common.choose", { defaultValue: "-- Choose --" })}</option>
                        {presetOptions.map((p) => (
                          <option key={p.label} value={p.label}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {t("struct.common.width_m", { defaultValue: "Width (m)" })}
                      </label>
                      <input
                        type="number"
                        value={formW}
                        onChange={(e) => setFormW(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {t("struct.common.height_m", { defaultValue: "Height (m)" })}
                      </label>
                      <input
                        type="number"
                        value={formH}
                        onChange={(e) => setFormH(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {t("struct.common.qty", { defaultValue: "Qty" })}
                      </label>
                      <input
                        type="number"
                        value={formQty}
                        onChange={(e) => setFormQty(clampInt(toNum(e.target.value, 1), 1, 999))}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {t("joinery.material", { defaultValue: "Material" })}
                      </label>
                      <select
                        value={formMat}
                        onChange={(e) => setFormMat(e.target.value as JoineryMaterial)}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      >
                        <option value="pvc">PVC</option>
                        <option value="alu">ALU</option>
                        <option value="wood">{t("joinery.material.wood", { defaultValue: "Wood" })}</option>
                      </select>
                    </div>
                  </div>

                  {(formType === "window" || formType === "bay") && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">
                        {t("joinery.shutter", { defaultValue: "Shutter" })}
                      </label>
                      <div className="flex bg-slate-100 p-1 rounded">
                        <button
                          type="button"
                          onClick={() => setFormShutter("none")}
                          className={`flex-1 py-1 text-xs rounded ${formShutter === "none" ? "bg-white shadow" : ""}`}
                        >
                          {t("common.none", { defaultValue: "None" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormShutter("rolling")}
                          className={`flex-1 py-1 text-xs rounded ${formShutter === "rolling" ? "bg-white shadow" : ""}`}
                        >
                          {t("joinery.shutter.rolling", { defaultValue: "Rolling" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormShutter("swing")}
                          className={`flex-1 py-1 text-xs rounded ${formShutter === "swing" ? "bg-white shadow" : ""}`}
                        >
                          {t("joinery.shutter.swing", { defaultValue: "Swing" })}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("common.label", { defaultValue: "Label" })}
                    </label>
                    <input
                      type="text"
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {t("joinery.override_supply", { defaultValue: "Override supply price (€/unit)" })}{" "}
                      <span className="text-[10px] font-normal text-slate-400">
                        {t("common.optional", { defaultValue: "(optional)" })}
                      </span>
                    </label>
                    <input
                      type="number"
                      value={formPriceOverride}
                      onChange={(e) => setFormPriceOverride(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                      placeholder={t("joinery.override_placeholder", { defaultValue: "Leave empty for auto" })}
                    />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 text-slate-500 font-bold"
                  >
                    {t("common.cancel", { defaultValue: "Cancel" })}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveItem}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
                  >
                    {t("common.save", { defaultValue: "Save" })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Hammer size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("joinery.step2.hint", { defaultValue: "Install type + consumables." })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("joinery.install_type", { defaultValue: "Install type" })}
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setInstallType("new")}
                className={`p-2 rounded border text-xs font-bold ${
                  installType === "new"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                {t("joinery.install.new", { defaultValue: "New" })}
              </button>
              <button
                type="button"
                onClick={() => setInstallType("reno")}
                className={`p-2 rounded border text-xs font-bold ${
                  installType === "reno"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                {t("joinery.install.reno", { defaultValue: "Reno" })}
              </button>
              <button
                type="button"
                onClick={() => setInstallType("tunnel")}
                className={`p-2 rounded border text-xs font-bold ${
                  installType === "tunnel"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                {t("joinery.install.tunnel", { defaultValue: "Tunnel" })}
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">
              {t("joinery.supplies_title", { defaultValue: "Installation supplies" })}
            </h4>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">{t("joinery.supplies.compriband", { defaultValue: "Compriband" })}</span>
                <input
                  type="checkbox"
                  checked={useCompriband}
                  onChange={(e) => setUseCompriband(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">{t("joinery.supplies.silicone", { defaultValue: "Silicone" })}</span>
                <input
                  type="checkbox"
                  checked={useSilicone}
                  onChange={(e) => setUseSilicone(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">{t("joinery.supplies.foam", { defaultValue: "PU foam" })}</span>
                <input
                  type="checkbox"
                  checked={useFoam}
                  onChange={(e) => setUseFoam(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">{t("joinery.supplies.fixings", { defaultValue: "Fixings" })}</span>
                <input
                  type="checkbox"
                  checked={useFixings}
                  onChange={(e) => setUseFixings(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end space-x-2">
              <span className="text-xs text-slate-500">
                {t("struct.common.waste", { defaultValue: "Waste" })} (%)
              </span>
              <input
                type="number"
                value={wastePct}
                onChange={(e) => setWastePct(toNum(e.target.value, 0))}
                className="w-16 p-1 text-sm border rounded text-right bg-white text-slate-900"
              />
            </div>

            {toNum(wastePct, 0) > 30 && (
              <div className="mt-2 flex items-start text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" />
                {t("joinery.warn.high_waste", { defaultValue: "High waste allowance." })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold"
            >
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("joinery.step3.hint", { defaultValue: "Adjust unit prices." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">
                {t("struct.common.unit_prices", { defaultValue: "Unit prices" })}
              </h4>
              <button
                type="button"
                onClick={() => setProMode(!proMode)}
                className="text-xs text-blue-600 flex items-center"
              >
                <Settings size={12} className="mr-1" />{" "}
                {proMode
                  ? t("struct.common.pro_mode", { defaultValue: "Pro mode" })
                  : t("struct.common.simple_mode", { defaultValue: "Simple mode" })}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(["window", "door", "bay", "velux", "garage"] as const).map((k) => (
                <div key={k}>
                  <label className="block text-[10px] text-slate-500 mb-1">
                    {getTypeLabel(t, k)} (€/u)
                  </label>
                  <input
                    type="number"
                    value={(prices as any)[k]}
                    onChange={(e) => updatePrice(k as any, e.target.value)}
                    className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                  />
                </div>
              ))}

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.shutter.rolling", { defaultValue: "Rolling shutter" })} (+€/u)
                </label>
                <input
                  type="number"
                  value={prices.shutterRolling}
                  onChange={(e) => updatePrice("shutterRolling", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.shutter.swing", { defaultValue: "Swing shutter" })} (+€/u)
                </label>
                <input
                  type="number"
                  value={prices.shutterSwing}
                  onChange={(e) => updatePrice("shutterSwing", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.prices.coef_alu", { defaultValue: "ALU coefficient (x)" })}
                </label>
                <input
                  type="number"
                  value={prices.materialAlu}
                  onChange={(e) => updatePrice("materialAlu", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.prices.coef_wood", { defaultValue: "WOOD coefficient (x)" })}
                </label>
                <input
                  type="number"
                  value={prices.materialWood}
                  onChange={(e) => updatePrice("materialWood", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">
                    {t("joinery.prices.install_window", { defaultValue: "Install window (€/u)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.installWindow}
                    onChange={(e) => updatePrice("installWindow", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">
                    {t("joinery.prices.install_door", { defaultValue: "Install door (€/u)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.installDoor}
                    onChange={(e) => updatePrice("installDoor", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">
                    {t("joinery.prices.install_bay", { defaultValue: "Install bay (€/u)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.installBay}
                    onChange={(e) => updatePrice("installBay", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">
                    {t("joinery.prices.install_velux", { defaultValue: "Install roof window (€/u)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.installVelux}
                    onChange={(e) => updatePrice("installVelux", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">
                    {t("joinery.prices.install_garage", { defaultValue: "Install garage door (€/u)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.installGarage}
                    onChange={(e) => updatePrice("installGarage", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">
                    {t("joinery.prices.reno_surcharge", { defaultValue: "Renovation surcharge (€/u)" })}
                  </label>
                  <input
                    type="number"
                    value={prices.renoSurcharge}
                    onChange={(e) => updatePrice("renoSurcharge", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.prices.compriband_m", { defaultValue: "Compriband (€/m)" })}
                </label>
                <input
                  type="number"
                  value={prices.compribandM}
                  onChange={(e) => updatePrice("compribandM", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.prices.silicone_cart", { defaultValue: "Silicone (€/cart.)" })}
                </label>
                <input
                  type="number"
                  value={prices.siliconeCart}
                  onChange={(e) => updatePrice("siliconeCart", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.prices.foam_cart", { defaultValue: "PU foam (€/cart.)" })}
                </label>
                <input
                  type="number"
                  value={prices.foamCart}
                  onChange={(e) => updatePrice("foamCart", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">
                  {t("joinery.prices.fixing_kit", { defaultValue: "Fixing kit (€/unit)" })}
                </label>
                <input
                  type="number"
                  value={prices.fixingKit}
                  onChange={(e) => updatePrice("fixingKit", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
            </div>
          </div>

          {calc.warnings.length > 0 && (
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
              {calc.warnings.map((w, i) => (
                <div key={i} className="flex items-center">
                  <AlertTriangle size={12} className="mr-2" /> {w}
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button
              type="button"
              disabled
              className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center"
            >
              <Check size={18} className="mr-2" /> {t("struct.common.calculated", { defaultValue: "Calculated" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};