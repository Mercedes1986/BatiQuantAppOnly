import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { DEFAULT_PRICES, MESH_TYPES, CONCRETE_MIX_RATIOS } from "../../constants";
import { getUnitPrice } from "../../services/materialsService";

import { ArrowRight, Check, CircleDollarSign, Info, Layers, Settings, Truck } from "lucide-react";

interface Props {
  onCalculate: (result: CalculationResult) => void;
  initialArea?: number;
  initialPerimeter?: number;
}

type Usage = "interior" | "terrace" | "driveway";
type ShapeMode = "rect" | "area";

export const ConcreteCalculator: React.FC<Props> = ({ onCalculate, initialArea, initialPerimeter }) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- 1. Geometry & Usage ---
  const [usage, setUsage] = useState<Usage>("terrace");
  const [shapeMode, setShapeMode] = useState<ShapeMode>("rect");
  const [dimL, setDimL] = useState("");
  const [dimW, setDimW] = useState("");
  const [areaInput, setAreaInput] = useState<string>(initialArea?.toString() || "");
  const [perimInput, setPerimInput] = useState<string>(initialPerimeter?.toString() || "");

  // --- 2. Layers ---
  const [layerHerisson, setLayerHerisson] = useState("0"); // cm
  const [usePolyane, setUsePolyane] = useState(false);
  const [useInsulation, setUseInsulation] = useState(false);
  const [insulThick, setInsulThick] = useState("0"); // cm
  const [useEdgeStrip, setUseEdgeStrip] = useState(false);

  // --- 3. Concrete & Structure ---
  const [slabThick, setSlabThick] = useState("12"); // cm
  const [wastePct, setWastePct] = useState(5);
  const [isBPE, setIsBPE] = useState(true);

  // Mix Config (site mix)
  const [mixDosage, setMixDosage] = useState(350);
  const [bagSize, setBagSize] = useState(35);

  // Reinforcement
  const [useMesh, setUseMesh] = useState(true);
  const [meshTypeId, setMeshTypeId] = useState("ST25C");

  // Formwork & Joints
  const [useFormwork, setUseFormwork] = useState(false);
  const [useJoints, setUseJoints] = useState(false);
  const [jointSpacing, setJointSpacing] = useState("4"); // meters

  // --- 4. Pricing & Logistics ---
  const [usePump, setUsePump] = useState(false);

  // helper price: catalog > defaultPrices > fallback
  const priceOr = (key: string, defaultVal: number) => {
    const v = getUnitPrice(key);
    if (typeof v === "number" && !Number.isNaN(v) && v !== 0) return v;

    const d = (DEFAULT_PRICES as any)[key];
    if (d !== undefined) {
      const nd = Number(d);
      if (!Number.isNaN(nd)) return nd;
    }
    return defaultVal;
  };

  const [prices, setPrices] = useState(() => ({
    // béton
    concreteBPE: priceOr("BPE_M3", Number(DEFAULT_PRICES.BPE_M3 ?? 150)),
    delivery: priceOr("DELIVERY_FEE", Number(DEFAULT_PRICES.DELIVERY_FEE ?? 120)),
    pump: priceOr("PUMP_FEE", Number(DEFAULT_PRICES.PUMP_FEE ?? 250)),

    // site mix
    cementBag: priceOr("CEMENT_BAG_35KG", 9.5),
    sandTon: priceOr("SAND_TON", 35),
    gravelTon: priceOr("GRAVEL_TON", 45),

    // couches
    herissonM3: 45,
    polyaneM2: (priceOr("POLYANE_ROLL_150M2", 120) / 150) || 0.8,
    insulationM2: 15,
    stripMl: 1.5,

    // structure
    meshPanel: priceOr("MESH_PANEL_ST25", 35),
    formworkM2: priceOr("FORM_PANEL_M2", 9),

    // joints
    jointMl: 5,

    // pro
    laborM2: 28,
  }));

  const updatePrice = (key: keyof typeof prices, val: string) => {
    setPrices((prev) => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  // --- Presets ---
  useEffect(() => {
    if (usage === "interior") {
      setSlabThick("12");
      setUsePolyane(true);
      setUseInsulation(true);
      setInsulThick("6");
      setUseEdgeStrip(true);
      setUseMesh(true);
      setMeshTypeId("ST25C");
      setUseFormwork(false);
      setUseJoints(false);
    } else if (usage === "terrace") {
      setSlabThick("12");
      setUsePolyane(false);
      setUseInsulation(false);
      setUseEdgeStrip(true);
      setUseMesh(true);
      setMeshTypeId("ST25C");
      setUseFormwork(true);
      setUseJoints(true);
    } else if (usage === "driveway") {
      setSlabThick("15");
      setUsePolyane(true);
      setUseInsulation(false);
      setUseEdgeStrip(false);
      setUseMesh(true);
      setMeshTypeId("ST40C");
      setUseFormwork(true);
      setUseJoints(true);
    }
  }, [usage]);

  // --- Calculation Engine ---
  const calculationData = useMemo(() => {
    // 1) Geometry
    let area = 0;
    let perimeter = 0;

    if (shapeMode === "rect") {
      const L = parseFloat(dimL) || 0;
      const W = parseFloat(dimW) || 0;
      area = L * W;
      perimeter = 2 * (L + W);
    } else {
      area = parseFloat(areaInput) || 0;
      perimeter = parseFloat(perimInput) || (area > 0 ? Math.sqrt(area) * 4 : 0);
    }

    if (area <= 0) {
      return {
        totalCost: 0,
        materials: [],
        details: [],
        summary: t("calc.concrete.summary_zero", { defaultValue: "Enter dimensions to see results." }),
      };
    }

    const materialsList: any[] = [];
    const details: any[] = [];
    let totalCost = 0;

    const safePanelUnit = ((Unit as any).PANEL ?? Unit.PIECE) as Unit;

    const add = (m: any) => {
      materialsList.push(m);
      totalCost += Number(m.totalPrice || 0);
    };

    // 2) Layers
    const hHerisson = (parseFloat(layerHerisson) || 0) / 100;
    if (hHerisson > 0) {
      const vol = area * hHerisson;
      const cost = vol * prices.herissonM3;
      add({
        id: "herisson",
        name: t("calc.concrete.materials.herisson", { defaultValue: "Sub-base (crushed aggregate)" }),
        quantity: parseFloat(vol.toFixed(2)),
        unit: Unit.M3,
        unitPrice: prices.herissonM3,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.CONCRETE,
        details: t("calc.concrete.details.thickness_cm", { defaultValue: "Thk. {{cm}} cm", cm: layerHerisson }),
      });
    }

    if (usePolyane) {
      const a = area * 1.15;
      const cost = a * prices.polyaneM2;
      add({
        id: "polyane",
        name: t("calc.concrete.materials.polyane", { defaultValue: "Film Polyane (Sous-dalle)" }),
        quantity: Math.ceil(a),
        unit: Unit.M2,
        unitPrice: prices.polyaneM2,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.CONCRETE,
        details: t("calc.concrete.details.overlap_15", { defaultValue: "+15% recouvrement" }),
      });
    }

    if (useInsulation) {
      const h = parseFloat(insulThick) || 0;
      const a = area * 1.05;
      const cost = a * prices.insulationM2;
      add({
        id: "insulation",
        name: t("calc.concrete.materials.insulation_named", {
          defaultValue: "Isolant sous dalle ({{cm}}cm)",
          cm: h,
        }),
        quantity: parseFloat(a.toFixed(2)),
        unit: Unit.M2,
        unitPrice: prices.insulationM2,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.CONCRETE,
      });
    }

    if (useEdgeStrip && perimeter > 0) {
      const cost = perimeter * prices.stripMl;
      add({
        id: "strip",
        name: t("calc.concrete.materials.edge_strip", { defaultValue: "Perimeter strip" }),
        quantity: Math.ceil(perimeter),
        unit: Unit.METER,
        unitPrice: prices.stripMl,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.CONCRETE,
      });
    }

    // 3) Concrete volume
    const hSlab = (parseFloat(slabThick) || 12) / 100;
    const volRaw = area * hSlab;
    const volTotal = volRaw * (1 + (wastePct || 0) / 100);

    if (isBPE) {
      const volOrdered = Math.ceil(volTotal * 2) / 2; // 0.5m3
      const costConc = volOrdered * prices.concreteBPE;
      const costDeliv = prices.delivery + (usePump ? prices.pump : 0);

      add({
        id: "concrete_bpe",
        name: t("calc.concrete.materials.bpe", { defaultValue: "Ready-mix concrete (truck)" }),
        quantity: volOrdered,
        unit: Unit.M3,
        unitPrice: prices.concreteBPE,
        totalPrice: parseFloat(costConc.toFixed(2)),
        category: CalculatorType.CONCRETE,
        details: t("calc.concrete.details.bpe_step", {
          defaultValue: "Ordered in 0.5 m³ increments (need: {{need}} m³)",
          need: volTotal.toFixed(2),
        }),
      });

      add({
        id: "logistics",
        name: usePump
          ? t("calc.concrete.materials.delivery_pump", { defaultValue: "Livraison + Pompe" })
          : t("calc.concrete.materials.delivery", { defaultValue: "Livraison Toupie" }),
        quantity: 1,
        unit: Unit.PACKAGE,
        unitPrice: costDeliv,
        totalPrice: parseFloat(costDeliv.toFixed(2)),
        category: CalculatorType.CONCRETE,
      });
    } else {
      const ratio = (CONCRETE_MIX_RATIOS as any)[mixDosage] || (CONCRETE_MIX_RATIOS as any)[350];

      const cementKg = volTotal * mixDosage;
      const bags = Math.ceil(cementKg / (bagSize || 35));

      const sandKg = volTotal * (ratio?.sand || 700);
      const gravelKg = volTotal * (ratio?.gravel || 1100);

      const costCement = bags * prices.cementBag;
      const costSand = (sandKg / 1000) * prices.sandTon;
      const costGravel = (gravelKg / 1000) * prices.gravelTon;

      add({
        id: "cement",
        name: t("calc.concrete.materials.cement_named", {
          defaultValue: "Cement ({{dosage}} kg/m³)",
          dosage: mixDosage,
        }),
        quantity: bags,
        unit: Unit.BAG,
        unitPrice: prices.cementBag,
        totalPrice: parseFloat(costCement.toFixed(2)),
        category: CalculatorType.CONCRETE,
        details: t("calc.concrete.details.bags_of", {
          defaultValue: "{{bags}} sacs de {{kg}}kg",
          bags,
          kg: bagSize,
        }),
      });

      add({
        id: "sand",
        name: t("calc.concrete.materials.sand", { defaultValue: "Concrete sand (0/4)" }),
        quantity: parseFloat((sandKg / 1000).toFixed(2)),
        unit: Unit.TON,
        unitPrice: prices.sandTon,
        totalPrice: parseFloat(costSand.toFixed(2)),
        category: CalculatorType.CONCRETE,
      });

      add({
        id: "gravel",
        name: t("calc.concrete.materials.gravel", { defaultValue: "Gravier (5/20)" }),
        quantity: parseFloat((gravelKg / 1000).toFixed(2)),
        unit: Unit.TON,
        unitPrice: prices.gravelTon,
        totalPrice: parseFloat(costGravel.toFixed(2)),
        category: CalculatorType.CONCRETE,
      });
    }

    // 4) Reinforcement
    if (useMesh) {
      const meshDef = MESH_TYPES.find((m) => m.id === meshTypeId) || MESH_TYPES[0];
      const panelArea = (meshDef as any).width * (meshDef as any).height;
      const usefulArea = panelArea * 0.85;
      const panels = Math.ceil(area / (usefulArea || 1));

      const cost = panels * prices.meshPanel;
      add({
        id: "mesh",
        name: t("calc.concrete.materials.mesh_named", {
          defaultValue: "Welded mesh {{label}}",
          label: meshDef.label,
        }),
        quantity: panels,
        unit: safePanelUnit,
        unitPrice: prices.meshPanel,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.CONCRETE,
        details: t("calc.concrete.details.useful_area_panel", {
          defaultValue: "≈ {{m2}} m² usable/panel",
          m2: usefulArea.toFixed(2),
        }),
      });
    }

    // 5) Formwork & joints
    if (useFormwork && perimeter > 0) {
      const formArea = perimeter * hSlab;
      const cost = formArea * prices.formworkM2;
      add({
        id: "formwork",
        name: t("calc.concrete.materials.formwork", { defaultValue: "Perimeter formwork" }),
        quantity: parseFloat(formArea.toFixed(2)),
        unit: Unit.M2,
        unitPrice: prices.formworkM2,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.CONCRETE,
        details: t("calc.concrete.details.formwork_calc", {
          defaultValue: "{{ml}}ml × {{h}}m",
          ml: perimeter.toFixed(1),
          h: hSlab.toFixed(2),
        }),
      });
    }

    if (useJoints) {
      const sp = parseFloat(jointSpacing) || 4;
      let jointLen = 0;

      if (shapeMode === "rect") {
        const L = parseFloat(dimL) || 0;
        const W = parseFloat(dimW) || 0;
        const cutsL = Math.floor(L / sp);
        const cutsW = Math.floor(W / sp);
        jointLen = cutsL * W + cutsW * L;
      } else {
        const side = Math.sqrt(area);
        jointLen = (Math.floor(side / sp) * side) * 2;
      }

      if (jointLen > 0) {
        const cost = jointLen * prices.jointMl;
        add({
          id: "joints",
          name: t("calc.concrete.materials.joints", { defaultValue: "Joints de dilatation / fractionnement" }),
          quantity: Math.ceil(jointLen),
          unit: Unit.METER,
          unitPrice: prices.jointMl,
          totalPrice: parseFloat(cost.toFixed(2)),
          category: CalculatorType.CONCRETE,
          details: t("calc.concrete.details.spacing_m", { defaultValue: "Spacing ≈ {{m}} m", m: sp }),
        });
      }
    }

    // 6) Pro labor (option)
    if (proMode) {
      const cost = area * prices.laborM2;
      add({
        id: "labor",
        name: t("calc.concrete.materials.labor", { defaultValue: "Labor (placing/finishing)" }),
        quantity: parseFloat(area.toFixed(2)),
        unit: Unit.M2,
        unitPrice: prices.laborM2,
        totalPrice: parseFloat(cost.toFixed(2)),
        category: CalculatorType.CONCRETE,
      });
    }

    details.push({ label: t("calc.concrete.kpi.area", { defaultValue: "Area" }), value: area.toFixed(2), unit: "m²" });
    details.push({ label: t("calc.concrete.kpi.thickness", { defaultValue: "Thickness" }), value: slabThick, unit: "cm" });
    details.push({ label: t("calc.concrete.kpi.volume", { defaultValue: "Concrete volume" }), value: volTotal.toFixed(2), unit: "m³" });

    return {
      totalCost: parseFloat(totalCost.toFixed(2)),
      materials: materialsList,
      details,
      summary: t("calc.concrete.summary", { defaultValue: "{{m3}} m³ of concrete", m3: volTotal.toFixed(1) }),
    };
  }, [
    shapeMode,
    dimL,
    dimW,
    areaInput,
    perimInput,

    layerHerisson,
    usePolyane,
    useInsulation,
    insulThick,
    useEdgeStrip,

    slabThick,
    wastePct,
    isBPE,
    mixDosage,
    bagSize,

    useMesh,
    meshTypeId,
    useFormwork,
    useJoints,
    jointSpacing,

    usePump,
    prices,
    proMode,
    t,
  ]);

  useEffect(() => {
    onCalculate({
      summary: calculationData.summary,
      details: calculationData.details,
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
    });
  }, [calculationData, onCalculate]);

  return (
    <div className="space-y-6 rounded-[32px] border border-white/70 bg-white/72 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
      {/* Step Navigation */}
      <div className="flex justify-between items-center mb-6 rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner overflow-x-auto backdrop-blur-xl">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-extrabold rounded-2xl transition-all ${
              step === s ? "bg-white text-slate-950 shadow-[0_14px_32px_rgba(59,130,246,0.18)]" : "text-slate-400"
            }`}
          >
            {s === 1 && t("calc.concrete.steps.1", { defaultValue: "1. Dalle" })}
            {s === 2 && t("calc.concrete.steps.2", { defaultValue: "2. Couches" })}
            {s === 3 && t("calc.concrete.steps.3", { defaultValue: "3. Concrete" })}
            {s === 4 && t("calc.concrete.steps.4", { defaultValue: "4. Devis" })}
          </button>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Info size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.concrete.step1.hint", {
              defaultValue: "Set slab area and usage to preconfigure options.",
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t("calc.concrete.usage.label", { defaultValue: "Usage" })}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setUsage("interior")}
                className={`p-2 rounded border text-xs font-bold ${
                  usage === "interior" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                {t("calc.concrete.usage.interior", { defaultValue: "Interior" })}
              </button>
              <button
                type="button"
                onClick={() => setUsage("terrace")}
                className={`p-2 rounded border text-xs font-bold ${
                  usage === "terrace" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                {t("calc.concrete.usage.terrace", { defaultValue: "Terrasse" })}
              </button>
              <button
                type="button"
                onClick={() => setUsage("driveway")}
                className={`p-2 rounded border text-xs font-bold ${
                  usage === "driveway" ? "bg-stone-100 border-stone-500 text-stone-800" : "bg-white text-slate-500"
                }`}
              >
                {t("calc.concrete.usage.driveway", { defaultValue: "Carrossable" })}
              </button>
            </div>
          </div>

          <div className="flex rounded-[24px] border border-white/80 bg-slate-100/70 p-1.5 shadow-inner backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setShapeMode("rect")}
              className={`flex-1 py-1.5 text-xs font-bold rounded ${shapeMode === "rect" ? "bg-white shadow" : "text-slate-500"}`}
            >
              {t("calc.concrete.shape.rect", { defaultValue: "Rectangle" })}
            </button>
            <button
              type="button"
              onClick={() => setShapeMode("area")}
              className={`flex-1 py-1.5 text-xs font-bold rounded ${shapeMode === "area" ? "bg-white shadow" : "text-slate-500"}`}
            >
              {t("calc.concrete.shape.area", { defaultValue: "Area" })}
            </button>
          </div>

          {shapeMode === "rect" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t("calc.concrete.inputs.length_m", { defaultValue: "Longueur (m)" })}
                </label>
                <input
                  type="number"
                  value={dimL}
                  onChange={(e) => setDimL(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t("calc.concrete.inputs.width_m", { defaultValue: "Largeur (m)" })}
                </label>
                <input
                  type="number"
                  value={dimW}
                  onChange={(e) => setDimW(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t("calc.concrete.inputs.area_m2", { defaultValue: "Area (m²)" })}
                </label>
                <input
                  type="number"
                  value={areaInput}
                  onChange={(e) => setAreaInput(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900 font-bold"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  {t("calc.concrete.inputs.perimeter_m", { defaultValue: "Perimeter (m)" })}{" "}
                  <span className="text-[10px] font-normal text-slate-400">
                    {t("calc.concrete.inputs.perimeter_opt", { defaultValue: "(optionnel, utile pour coffrage)" })}
                  </span>
                </label>
                <input
                  type="number"
                  value={perimInput}
                  onChange={(e) => setPerimInput(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm flex justify-center items-center"
          >
            {t("common.next", { defaultValue: "Next" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.concrete.step2.hint", { defaultValue: "Preparation layers under the slab." })}
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-3">
            <div>
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-slate-700">{t("calc.concrete.layers.herisson_cm", { defaultValue: "Sub-base (cm)" })}</span>
                <input
                  type="number"
                  value={layerHerisson}
                  onChange={(e) => setLayerHerisson(e.target.value)}
                  className="w-20 p-1 text-sm border rounded text-right bg-white text-slate-900"
                />
              </label>
              <p className="text-[10px] text-slate-400">{t("calc.concrete.layers.herisson_help", { defaultValue: "Compacted draining layer." })}</p>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-bold text-slate-700">{t("calc.concrete.layers.polyane", { defaultValue: "Polyane" })}</span>
                <input type="checkbox" checked={usePolyane} onChange={(e) => setUsePolyane(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>
            </div>

            <div className="border-t border-slate-100 pt-2">
              <label className="flex items-center justify-between cursor-pointer mb-2">
                <span className="text-sm font-bold text-slate-700">{t("calc.concrete.layers.insulation", { defaultValue: "Isolation sous dalle" })}</span>
                <input type="checkbox" checked={useInsulation} onChange={(e) => setUseInsulation(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>
              {useInsulation && (
                <div className="flex items-center justify-between pl-4">
                  <span className="text-xs text-slate-500">{t("calc.concrete.layers.insulation_thickness", { defaultValue: "Thickness (cm)" })}</span>
                  <input
                    type="number"
                    value={insulThick}
                    onChange={(e) => setInsulThick(e.target.value)}
                    className="w-20 p-1 text-sm border rounded text-right bg-white text-slate-900"
                  />
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-bold text-slate-700">{t("calc.concrete.layers.edge_strip", { defaultValue: "Perimeter strip" })}</span>
                <input type="checkbox" checked={useEdgeStrip} onChange={(e) => setUseEdgeStrip(e.target.checked)} className="h-5 w-5 text-blue-600 rounded" />
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <Truck size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.concrete.step3.hint", { defaultValue: "Concrete setup, reinforcement, formwork and joints." })}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.concrete.concrete.slab_thickness_cm", { defaultValue: "Thickness dalle (cm)" })}</label>
              <input type="number" value={slabThick} onChange={(e) => setSlabThick(e.target.value)} className="w-full p-2 border rounded font-bold text-slate-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">{t("calc.concrete.concrete.waste_pct", { defaultValue: "Pertes (%)" })}</label>
              <input type="number" value={wastePct} onChange={(e) => setWastePct(Math.max(0, Number(e.target.value)))} className="w-full p-2 border rounded font-bold text-slate-900 bg-white" />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-slate-700">{t("calc.concrete.concrete.type", { defaultValue: "Concrete type" })}</span>
              <div className="flex bg-white rounded border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setIsBPE(true)}
                  className={`px-2 py-1 text-xs rounded ${isBPE ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-500"}`}
                >
                  {t("calc.concrete.concrete.bpe", { defaultValue: "Toupie" })}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBPE(false)}
                  className={`px-2 py-1 text-xs rounded ${!isBPE ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-500"}`}
                >
                  {t("calc.concrete.concrete.site_mix", { defaultValue: "Site mix" })}
                </button>
              </div>
            </div>

            {!isBPE && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("calc.concrete.site_mix.dosage", { defaultValue: "Dosage (kg/m³)" })}</label>
                  <select value={mixDosage} onChange={(e) => setMixDosage(Number(e.target.value))} className="w-full p-1.5 text-sm border rounded bg-white text-slate-900">
                    <option value={300}>{t("calc.concrete.site_mix.dosage_300", { defaultValue: "300 kg" })}</option>
                    <option value={350}>{t("calc.concrete.site_mix.dosage_350", { defaultValue: "350 kg" })}</option>
                    <option value={400}>{t("calc.concrete.site_mix.dosage_400", { defaultValue: "400 kg" })}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("calc.concrete.site_mix.bag_size", { defaultValue: "Sac ciment" })}</label>
                  <select value={bagSize} onChange={(e) => setBagSize(Number(e.target.value))} className="w-full p-1.5 text-sm border rounded bg-white text-slate-900">
                    <option value={25}>{t("calc.concrete.site_mix.bag_25", { defaultValue: "25 kg" })}</option>
                    <option value={35}>{t("calc.concrete.site_mix.bag_35", { defaultValue: "35 kg" })}</option>
                  </select>
                </div>
              </div>
            )}

            {isBPE && (
              <label className="flex items-center mt-3">
                <input type="checkbox" checked={usePump} onChange={(e) => setUsePump(e.target.checked)} className="h-4 w-4 text-blue-600 rounded mr-2" />
                <span className="text-sm">{t("calc.concrete.concrete.add_pump", { defaultValue: "Ajouter pompe" })}</span>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 border rounded bg-white">
              <div className="flex items-center">
                <input type="checkbox" checked={useMesh} onChange={(e) => setUseMesh(e.target.checked)} className="h-4 w-4 text-blue-600 rounded mr-2" />
                <span className="text-sm font-medium">{t("calc.concrete.structure.mesh", { defaultValue: "Welded mesh" })}</span>
              </div>
              {useMesh && (
                <select value={meshTypeId} onChange={(e) => setMeshTypeId(e.target.value)} className="text-xs p-1 border rounded max-w-[140px] bg-white text-slate-900">
                  {MESH_TYPES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="flex items-center justify-between p-2 border rounded bg-white">
              <span className="text-sm font-medium">{t("calc.concrete.structure.formwork", { defaultValue: "Perimeter formwork" })}</span>
              <input type="checkbox" checked={useFormwork} onChange={(e) => setUseFormwork(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
            </label>

            <div className="flex items-center justify-between p-2 border rounded bg-white">
              <div className="flex items-center">
                <input type="checkbox" checked={useJoints} onChange={(e) => setUseJoints(e.target.checked)} className="h-4 w-4 text-blue-600 rounded mr-2" />
                <span className="text-sm font-medium">{t("calc.concrete.structure.joints", { defaultValue: "Joints de fractionnement" })}</span>
              </div>
              {useJoints && (
                <div className="flex items-center">
                  <input type="number" value={jointSpacing} onChange={(e) => setJointSpacing(e.target.value)} className="w-12 p-1 text-xs border rounded text-center bg-white text-slate-900" />
                  <span className="text-xs ml-1 text-slate-500">m</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-extrabold shadow-sm">
              {t("common.next", { defaultValue: "Next" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-blue-100 bg-blue-50/90 p-3 text-xs text-blue-800 flex items-start shadow-sm">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.concrete.step4.hint", { defaultValue: "Ajustez les prix unitaires." })}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase">{t("calc.concrete.prices.title", { defaultValue: "Tarifs" })}</h4>
              <button type="button" onClick={() => setProMode(!proMode)} className="text-xs flex items-center text-blue-600">
                <Settings size={12} className="mr-1" />{" "}
                {proMode ? t("calc.concrete.prices.pro", { defaultValue: "Mode Pro" }) : t("calc.concrete.prices.simple", { defaultValue: "Mode Simple" })}
              </button>
            </div>

            {isBPE ? (
              <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded border border-blue-100">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-800 mb-1">{t("calc.concrete.prices.bpe_m3", { defaultValue: "Ready-mix (€/m³)" })}</label>
                  <input type="number" value={prices.concreteBPE} onChange={(e) => updatePrice("concreteBPE", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-blue-800 mb-1">{t("calc.concrete.prices.delivery", { defaultValue: "Delivery (€)" })}</label>
                  <input type="number" value={prices.delivery} onChange={(e) => updatePrice("delivery", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-blue-800 mb-1">{t("calc.concrete.prices.pump", { defaultValue: "Pump (€)" })}</label>
                  <input type="number" value={prices.pump} onChange={(e) => updatePrice("pump", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("calc.concrete.prices.cement_bag", { defaultValue: "Cement (€/bag)" })}</label>
                  <input type="number" value={prices.cementBag} onChange={(e) => updatePrice("cementBag", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("calc.concrete.prices.sand_ton", { defaultValue: "Sand (€/t)" })}</label>
                  <input type="number" value={prices.sandTon} onChange={(e) => updatePrice("sandTon", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("calc.concrete.prices.gravel_ton", { defaultValue: "Gravel (€/t)" })}</label>
                  <input type="number" value={prices.gravelTon} onChange={(e) => updatePrice("gravelTon", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("calc.concrete.prices.mesh_panel", { defaultValue: "Mesh panel (€/panel)" })}</label>
                <input type="number" value={prices.meshPanel} onChange={(e) => updatePrice("meshPanel", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">{t("calc.concrete.prices.formwork_m2", { defaultValue: "Formwork (€/m²)" })}</label>
                <input type="number" value={prices.formworkM2} onChange={(e) => updatePrice("formworkM2", e.target.value)} className="w-full p-2 text-sm border rounded bg-white text-slate-900" />
              </div>
            </div>

            {proMode && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <label className="block text-[10px] text-blue-600 font-bold mb-1">{t("calc.concrete.prices.labor_m2", { defaultValue: "Labor (€/m²)" })}</label>
                <input type="number" value={prices.laborM2} onChange={(e) => updatePrice("laborM2", e.target.value)} className="w-full p-2 text-sm border border-blue-200 rounded bg-white text-slate-900" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-extrabold shadow-sm">
              {t("common.back", { defaultValue: "Back" })}
            </button>
            <button type="button" disabled className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-2xl font-extrabold shadow-sm flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("calc.concrete.calculated", { defaultValue: "Calculated" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};