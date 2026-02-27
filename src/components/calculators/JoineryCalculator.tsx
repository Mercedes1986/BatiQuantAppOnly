import React, { useEffect, useMemo, useState } from "react";
import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { OPENING_PRESETS } from "../../constants";
import {
  BoxSelect,
  Plus,
  Trash2,
  Settings,
  Info,
  Check,
  Hammer,
  DollarSign,
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
  priceOverride?: number; // User defined supply price per unit
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

const toNum = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const clampInt = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.trunc(n)));

const typeLabel = (type: JoineryType) => {
  switch (type) {
    case "window":
      return "Fenêtre";
    case "door":
      return "Porte Entrée";
    case "bay":
      return "Baie Coulissante";
    case "velux":
      return "Velux / Toit";
    case "garage":
      return "Porte Garage";
    default:
      return "Menuiserie";
  }
};

export const JoineryCalculator: React.FC<Props> = ({ onCalculate }) => {
  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Inventory ---
  const [items, setItems] = useState<JoineryItem[]>([]);

  // Add/Edit Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formType, setFormType] = useState<JoineryType>("window");
  const [formLabel, setFormLabel] = useState("Fenêtre");
  const [formW, setFormW] = useState("");
  const [formH, setFormH] = useState("");
  const [formQty, setFormQty] = useState(1);
  const [formMat, setFormMat] = useState<JoineryMaterial>("pvc");
  const [formShutter, setFormShutter] = useState<ShutterType>("none");
  const [formPriceOverride, setFormPriceOverride] = useState<string>(""); // optional supply override

  // --- 2. Installation & Supplies ---
  const [installType, setInstallType] = useState<InstallType>("new"); // Applique, Rénovation, Tunnel
  const [useCompriband, setUseCompriband] = useState(true);
  const [useSilicone, setUseSilicone] = useState(true);
  const [useFoam, setUseFoam] = useState(true);
  const [useFixings, setUseFixings] = useState(true);
  const [wastePct, setWastePct] = useState(10);

  // --- 3. Pricing ---
  const [prices, setPrices] = useState({
    // Supply Base Prices (PVC base)
    window: 250,
    door: 800,
    bay: 1200,
    velux: 400,
    garage: 1500,

    // Options
    shutterRolling: 300,
    shutterSwing: 200,

    materialAlu: 1.4, // coef multiplier
    materialWood: 1.5,

    // Labor (per unit)
    installWindow: 150,
    installDoor: 250,
    installBay: 350,
    installVelux: 200,
    installGarage: 400,
    renoSurcharge: 50,

    // Supplies
    compribandM: 2.5, // €/m
    siliconeCart: 8, // €/u
    foamCart: 12, // €/u
    fixingKit: 5, // €/u
  });

  type PriceKey = keyof typeof prices;
  const updatePrice = (key: PriceKey, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: toNum(val, 0) }));
  };

  // --- Presets support (safe if constants change shape) ---
  const presetOptions = useMemo(() => {
    const windows = (OPENING_PRESETS as any)?.WINDOWS ?? [];
    const doors = (OPENING_PRESETS as any)?.DOORS ?? [];
    const merged = [...windows, ...doors].filter(Boolean);
    return merged
      .map((p: any) => ({
        label: String(p.label ?? ""),
        width: toNum(p.width, 0),
        height: toNum(p.height, 0),
      }))
      .filter((p: any) => p.label && p.width > 0 && p.height > 0);
  }, []);

  // --- Form handlers ---
  const resetForm = () => {
    setFormType("window");
    setFormLabel("Fenêtre");
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
      label: (formLabel || typeLabel(formType)).trim(),
      width: w,
      height: h,
      quantity: q,
      material: formMat,
      shutter: formShutter,
      ...(Number.isFinite(override) ? { priceOverride: override } : {}),
    };

    setItems((prev) => (editingId ? prev.map((i) => (i.id === editingId ? next : i)) : [...prev, next]));
    setShowForm(false);
  };

  const handleDeleteItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const handleDuplicateItem = (item: JoineryItem) => setItems((prev) => [...prev, { ...item, id: Date.now().toString() }]);

  const applyPreset = (presetLabel: string) => {
    const p = presetOptions.find((x) => x.label === presetLabel);
    if (!p) return;

    setFormW(String(p.width));
    setFormH(String(p.height));
    setFormLabel(presetLabel);

    const low = presetLabel.toLowerCase();
    if (low.includes("porte")) setFormType("door");
    else setFormType("window");
  };

  // --- Calculations (memo, then pushed via effect) ---
  const calc = useMemo(() => {
    let totalCost = 0;
    let totalArea = 0;
    let totalPerimeter = 0;
    const materialsList: any[] = [];
    const warnings: string[] = [];

    const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

    // 1) Joinery items (supply + optionally labor)
    items.forEach((item) => {
      const area = item.width * item.height * item.quantity;
      const perim = 2 * (item.width + item.height) * item.quantity;
      totalArea += area;
      totalPerimeter += perim;

      // Supply base
      let baseSupply = (prices as any)[item.type] ?? 250;

      // Material multiplier
      if (item.material === "alu") baseSupply *= prices.materialAlu;
      if (item.material === "wood") baseSupply *= prices.materialWood;

      // Shutter option
      if (item.shutter === "rolling") baseSupply += prices.shutterRolling;
      if (item.shutter === "swing") baseSupply += prices.shutterSwing;

      // Override supply price per unit?
      const unitSupply = item.priceOverride ?? baseSupply;
      const supplyCost = unitSupply * item.quantity;

      // Labor per unit
      let installUnit = 0;
      if (item.type === "window") installUnit = prices.installWindow;
      else if (item.type === "door") installUnit = prices.installDoor;
      else if (item.type === "bay") installUnit = prices.installBay;
      else if (item.type === "velux") installUnit = prices.installVelux;
      else if (item.type === "garage") installUnit = prices.installGarage;

      if (installType === "reno") installUnit += prices.renoSurcharge;

      const laborCost = installUnit * item.quantity;

      // Total cost logic:
      // - en mode simple: on met fourniture + pose dans la même ligne (comme ton script d’origine),
      //   mais on garde un détail lisible.
      // - en mode pro: on sépare fourniture et pose en 2 lignes.
      if (!proMode) {
        totalCost += supplyCost + laborCost;
        materialsList.push({
          id: item.id,
          name: `${item.label} ${item.material.toUpperCase()} ${item.width}x${item.height}m`,
          quantity: item.quantity,
          quantityRaw: item.quantity,
          unit: Unit.PIECE,
          unitPrice: round2(unitSupply + installUnit),
          totalPrice: round2(supplyCost + laborCost),
          category: CalculatorType.JOINERY,
          details:
            `Fourniture: ${round2(unitSupply)}€/u • Pose: ${round2(installUnit)}€/u` +
            (item.shutter !== "none" ? " • Volet inclus" : ""),
        });
      } else {
        totalCost += supplyCost + laborCost;

        materialsList.push({
          id: `${item.id}_supply`,
          name: `${item.label} (fourniture) ${item.material.toUpperCase()} ${item.width}x${item.height}m`,
          quantity: item.quantity,
          quantityRaw: item.quantity,
          unit: Unit.PIECE,
          unitPrice: round2(unitSupply),
          totalPrice: round2(supplyCost),
          category: CalculatorType.JOINERY,
          details: item.shutter !== "none" ? `Volet: ${item.shutter === "rolling" ? "roulant" : "battant"}` : undefined,
        });

        materialsList.push({
          id: `${item.id}_install`,
          name: `Pose ${item.label}`,
          quantity: item.quantity,
          quantityRaw: item.quantity,
          unit: Unit.PIECE,
          unitPrice: round2(installUnit),
          totalPrice: round2(laborCost),
          category: CalculatorType.JOINERY,
          details: `Type pose: ${installType === "new" ? "Neuf (applique)" : installType === "reno" ? "Rénovation" : "Tunnel"}`,
        });
      }

      if (item.priceOverride !== undefined && item.priceOverride < 50) {
        warnings.push(`Prix forcé très bas détecté sur "${item.label}" (${item.priceOverride}€/u).`);
      }
    });

    // 2) Supplies (consumables)
    const wasteCoef = 1 + wastePct / 100;

    if (totalUnits > 0) {
      if (useCompriband) {
        const len = totalPerimeter * wasteCoef;
        const cost = len * prices.compribandM;
        totalCost += cost;
        materialsList.push({
          id: "compriband",
          name: "Compribande (étanchéité)",
          quantity: Math.ceil(len),
          quantityRaw: len,
          unit: Unit.METER,
          unitPrice: prices.compribandM,
          totalPrice: round2(cost),
          category: CalculatorType.JOINERY,
        });
      }

      if (useSilicone) {
        // approx 15m / cartouche
        const len = totalPerimeter * wasteCoef;
        const carts = Math.ceil(len / 15);
        const cost = carts * prices.siliconeCart;
        totalCost += cost;
        materialsList.push({
          id: "silicone",
          name: "Mastic silicone",
          quantity: carts,
          quantityRaw: carts,
          unit: Unit.PIECE,
          unitPrice: prices.siliconeCart,
          totalPrice: round2(cost),
          category: CalculatorType.JOINERY,
          details: `≈ ${(len / 15).toFixed(1)} cart. théoriques`,
        });
      }

      if (useFoam) {
        // approx 1 cartouche / 3 unités
        const carts = Math.ceil(totalUnits / 3);
        const cost = carts * prices.foamCart;
        totalCost += cost;
        materialsList.push({
          id: "foam",
          name: "Mousse expansive PU",
          quantity: carts,
          quantityRaw: carts,
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
          name: "Kit fixations (vis/pattes/cales)",
          quantity: totalUnits,
          quantityRaw: totalUnits,
          unit: Unit.PACKAGE,
          unitPrice: prices.fixingKit,
          totalPrice: round2(cost),
          category: CalculatorType.JOINERY,
        });
      }
    }

    if (items.length === 0) {
      warnings.push("Aucune menuiserie ajoutée.");
    }

    return {
      totalCost: round2(totalCost),
      totalArea,
      totalPerimeter,
      totalUnits,
      materials: materialsList,
      warnings,
    };
  }, [items, installType, useCompriband, useSilicone, useFoam, useFixings, wastePct, prices, proMode]);

  // Push to parent
  useEffect(() => {
    if (!items.length) return;

    onCalculate({
      summary: `${calc.totalUnits} Menuiseries`,
      details: [
        { label: "Surface totale", value: calc.totalArea.toFixed(1), unit: "m²" },
        { label: "Périmètre total", value: calc.totalPerimeter.toFixed(1), unit: "m" },
        {
          label: "Type de pose",
          value: installType === "new" ? "Neuf (Applique)" : installType === "reno" ? "Rénovation" : "Tunnel",
          unit: "",
        },
      ],
      materials: calc.materials,
      totalCost: calc.totalCost,
      warnings: calc.warnings.length ? calc.warnings : undefined,
    });
  }, [calc, installType, items.length, onCalculate]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Step Navigation */}
      <div className="flex justify-between items-center mb-6 bg-slate-50 p-1 rounded-lg">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Liste"}
            {s === 2 && "2. Pose"}
            {s === 3 && "3. Prix"}
          </button>
        ))}
      </div>

      {/* STEP 1: INVENTORY LIST */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            Créez la liste de vos menuiseries.
          </div>

          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
              <BoxSelect size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune menuiserie ajoutée.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col relative"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <span className="font-bold text-slate-800">
                        {item.quantity}x {item.label}
                      </span>
                      <span className="text-xs text-slate-500 ml-2 uppercase bg-slate-100 px-1 rounded">
                        {item.material}
                      </span>
                      {item.priceOverride !== undefined && (
                        <span className="text-[10px] ml-2 font-bold text-amber-700 bg-amber-50 px-1 rounded">
                          prix forcé
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDuplicateItem(item)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => handleEditItem(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600">
                    {item.width} x {item.height} m
                    {item.shutter !== "none" && (
                      <span className="ml-2 text-xs text-blue-600 font-medium">
                        + Volet {item.shutter === "rolling" ? "Roulant" : "Battant"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleAddItem}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center shadow-md active:scale-95 transition-transform"
          >
            <Plus size={20} className="mr-2" /> Ajouter une menuiserie
          </button>

          {items.length > 0 && (
            <button
              onClick={() => setStep(2)}
              className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold flex justify-center items-center"
            >
              Suivant <ArrowRight size={18} className="ml-2" />
            </button>
          )}

          {/* Add/Edit Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                  <h3 className="font-bold text-slate-800">{editingId ? "Modifier" : "Ajouter"} Menuiserie</h3>
                  <button onClick={() => setShowForm(false)}>
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        const t = e.target.value as JoineryType;
                        setFormType(t);
                        setFormLabel(typeLabel(t));
                        if (t === "door" || t === "garage" || t === "velux") setFormShutter("none");
                      }}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                    >
                      <option value="window">Fenêtre</option>
                      <option value="door">Porte Entrée</option>
                      <option value="bay">Baie Coulissante</option>
                      <option value="velux">Velux / Toit</option>
                      <option value="garage">Porte Garage</option>
                    </select>
                  </div>

                  {!editingId && presetOptions.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Presets</label>
                      <select
                        onChange={(e) => applyPreset(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-sm text-slate-900"
                        defaultValue=""
                      >
                        <option value="">-- Choisir standard --</option>
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
                      <label className="block text-xs font-bold text-slate-500 mb-1">Largeur (m)</label>
                      <input
                        type="number"
                        value={formW}
                        onChange={(e) => setFormW(e.target.value)}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Hauteur (m)</label>
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
                      <label className="block text-xs font-bold text-slate-500 mb-1">Quantité</label>
                      <input
                        type="number"
                        value={formQty}
                        onChange={(e) => setFormQty(toNum(e.target.value, 1))}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Matériau</label>
                      <select
                        value={formMat}
                        onChange={(e) => setFormMat(e.target.value as JoineryMaterial)}
                        className="w-full p-2 border rounded bg-white text-slate-900"
                      >
                        <option value="pvc">PVC</option>
                        <option value="alu">Alu</option>
                        <option value="wood">Bois</option>
                      </select>
                    </div>
                  </div>

                  {(formType === "window" || formType === "bay") && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Volet</label>
                      <div className="flex bg-slate-100 p-1 rounded">
                        <button
                          onClick={() => setFormShutter("none")}
                          className={`flex-1 py-1 text-xs rounded ${formShutter === "none" ? "bg-white shadow" : ""}`}
                        >
                          Aucun
                        </button>
                        <button
                          onClick={() => setFormShutter("rolling")}
                          className={`flex-1 py-1 text-xs rounded ${formShutter === "rolling" ? "bg-white shadow" : ""}`}
                        >
                          Roulant
                        </button>
                        <button
                          onClick={() => setFormShutter("swing")}
                          className={`flex-1 py-1 text-xs rounded ${formShutter === "swing" ? "bg-white shadow" : ""}`}
                        >
                          Battant
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nom / Label</label>
                    <input
                      type="text"
                      value={formLabel}
                      onChange={(e) => setFormLabel(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Prix fourniture forcé (€/u) <span className="text-[10px] font-normal text-slate-400">(optionnel)</span>
                    </label>
                    <input
                      type="number"
                      value={formPriceOverride}
                      onChange={(e) => setFormPriceOverride(e.target.value)}
                      className="w-full p-2 border rounded bg-white text-slate-900"
                      placeholder="Laisser vide pour calcul auto"
                    />
                  </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 sticky bottom-0 bg-white">
                  <button onClick={() => setShowForm(false)} className="flex-1 py-3 text-slate-500 font-bold">
                    Annuler
                  </button>
                  <button onClick={handleSaveItem} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
                    Valider
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
            Définissez le type de pose et les consommables nécessaires.
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Type de pose</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setInstallType("new")}
                className={`p-2 rounded border text-xs font-bold ${
                  installType === "new"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                Neuf
              </button>
              <button
                onClick={() => setInstallType("reno")}
                className={`p-2 rounded border text-xs font-bold ${
                  installType === "reno"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                Rénov.
              </button>
              <button
                onClick={() => setInstallType("tunnel")}
                className={`p-2 rounded border text-xs font-bold ${
                  installType === "tunnel"
                    ? "bg-stone-100 border-stone-500 text-stone-800 ring-1 ring-stone-500"
                    : "bg-white text-slate-500"
                }`}
              >
                Tunnel
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Fournitures de pose</h4>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">Compribande (étanchéité)</span>
                <input
                  type="checkbox"
                  checked={useCompriband}
                  onChange={(e) => setUseCompriband(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">Silicone (joints finition)</span>
                <input
                  type="checkbox"
                  checked={useSilicone}
                  onChange={(e) => setUseSilicone(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">Mousse PU (calfeutrement)</span>
                <input
                  type="checkbox"
                  checked={useFoam}
                  onChange={(e) => setUseFoam(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 cursor-pointer">
                <span className="text-sm">Kit fixations (vis/pattes)</span>
                <input
                  type="checkbox"
                  checked={useFixings}
                  onChange={(e) => setUseFixings(e.target.checked)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end space-x-2">
              <span className="text-xs text-slate-500">Marge pertes (%)</span>
              <input
                type="number"
                value={wastePct}
                onChange={(e) => setWastePct(toNum(e.target.value, 0))}
                className="w-16 p-1 text-sm border rounded text-right bg-white text-slate-900"
              />
            </div>

            {wastePct > 30 && (
              <div className="mt-2 flex items-start text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                <AlertTriangle size={14} className="mr-2 mt-0.5 shrink-0" />
                Marge pertes élevée : vérifiez si c’est volontaire.
              </div>
            )}
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

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <DollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Ajustez les prix de base. Les options (volets, matériaux) sont appliquées automatiquement.
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Prix</h4>
              <button onClick={() => setProMode(!proMode)} className="text-xs text-blue-600 flex items-center">
                <Settings size={12} className="mr-1" /> {proMode ? "Mode Pro" : "Mode Simple"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Fenêtre (€/u)</label>
                <input
                  type="number"
                  value={prices.window}
                  onChange={(e) => updatePrice("window", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Porte (€/u)</label>
                <input
                  type="number"
                  value={prices.door}
                  onChange={(e) => updatePrice("door", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Baie (€/u)</label>
                <input
                  type="number"
                  value={prices.bay}
                  onChange={(e) => updatePrice("bay", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Velux (€/u)</label>
                <input
                  type="number"
                  value={prices.velux}
                  onChange={(e) => updatePrice("velux", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Garage (€/u)</label>
                <input
                  type="number"
                  value={prices.garage}
                  onChange={(e) => updatePrice("garage", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Volet roulant (+€/u)</label>
                <input
                  type="number"
                  value={prices.shutterRolling}
                  onChange={(e) => updatePrice("shutterRolling", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Volet battant (+€/u)</label>
                <input
                  type="number"
                  value={prices.shutterSwing}
                  onChange={(e) => updatePrice("shutterSwing", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Coef ALU (x)</label>
                <input
                  type="number"
                  value={prices.materialAlu}
                  onChange={(e) => updatePrice("materialAlu", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Coef BOIS (x)</label>
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
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose fenêtre (€/u)</label>
                  <input
                    type="number"
                    value={prices.installWindow}
                    onChange={(e) => updatePrice("installWindow", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose porte (€/u)</label>
                  <input
                    type="number"
                    value={prices.installDoor}
                    onChange={(e) => updatePrice("installDoor", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose baie (€/u)</label>
                  <input
                    type="number"
                    value={prices.installBay}
                    onChange={(e) => updatePrice("installBay", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose velux (€/u)</label>
                  <input
                    type="number"
                    value={prices.installVelux}
                    onChange={(e) => updatePrice("installVelux", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Pose garage (€/u)</label>
                  <input
                    type="number"
                    value={prices.installGarage}
                    onChange={(e) => updatePrice("installGarage", e.target.value)}
                    className="w-full p-1.5 border border-blue-200 rounded text-sm bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-blue-600 font-bold mb-1">Surcoût rénovation (€/u)</label>
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
                <label className="block text-[10px] text-slate-500 mb-1">Compribande (€/m)</label>
                <input
                  type="number"
                  value={prices.compribandM}
                  onChange={(e) => updatePrice("compribandM", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Silicone (€/cart.)</label>
                <input
                  type="number"
                  value={prices.siliconeCart}
                  onChange={(e) => updatePrice("siliconeCart", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Mousse PU (€/cart.)</label>
                <input
                  type="number"
                  value={prices.foamCart}
                  onChange={(e) => updatePrice("foamCart", e.target.value)}
                  className="w-full p-2 border rounded text-sm bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Kit fixations (€/u)</label>
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

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
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