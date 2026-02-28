import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CalculatorType, CalculationResult, Unit } from "../../../types";
import { MATERIAL_METADATA, DEFAULT_PRICES } from "../../constants";
import { getUnitPrice, incrementUsage } from "../../services/materialsService";
import {
  Fence,
  Pickaxe,
  Layers,
  Check,
  CircleDollarSign,
  Trash2,
  Plus,
  Sprout,
  Sun,
  Flower2,
  RotateCcw,
  Pencil,
  X,
  AlertTriangle,
  Settings,
  ArrowRight, // ✅ AJOUT
} from "lucide-react";

// --- TYPES ---
type ZoneType = "terrace" | "driveway" | "path" | "other";
type CoatingType =
  | "concrete"
  | "pavers"
  | "wood"
  | "composite"
  | "gravel"
  | "asphalt"
  | "tile";

interface ExtZone {
  id: string;
  label: string;
  type: ZoneType;
  area: number; // m2
  perimeter: number; // m
  coating: CoatingType;
  excavationDepth: number; // cm
  geotextile: boolean;
  foundationThick: number; // cm
  beddingThick: number; // cm
  slabThick: number; // cm
  borders: boolean;
  drain: boolean;
}

interface ExtWall {
  id: string;
  label: string;
  length: number; // m
  height: number; // m
  width: number; // cm
  type: "block_wall" | "low_wall" | "retaining";
  foundation: boolean;
  foundW: number; // cm
  foundH: number; // cm
  coating: "none" | "1side" | "2sides";
  coping: boolean;
}

interface ExtItem {
  id: string;
  category: "fence" | "gate" | "pool";
  type: string;
  label: string;
  quantity: number; // ml or u
  systemKey: string;
  optionKey?: string;
  optionQty?: number;
  height?: number;
}

interface ExtNetwork {
  id: string;
  type: "water" | "sewer" | "elec" | "drain" | "light";
  label: string;
  length: number; // ml
  trench: boolean;
  trenchW: number; // cm
  trenchD: number; // cm
  manholes: number;
  points: number;
}

interface ExtGardenItem {
  id: string;
  category: "lawn" | "planting" | "irrigation" | "soil";
  label: string;
  quantity: number;
  unit: Unit;
  systemKey: string;
  meta?: any;
}

interface Props {
  onCalculate: (result: CalculationResult) => void;
}

const fmt2 = (n: number) => (Number.isFinite(n) ? Number(n.toFixed(2)) : 0);

export const ExteriorCalculator: React.FC<Props> = ({ onCalculate }) => {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [proMode, setProMode] = useState(false);

  // --- DATA STATES ---
  const [zones, setZones] = useState<ExtZone[]>([]);
  const [walls, setWalls] = useState<ExtWall[]>([]);
  const [items, setItems] = useState<ExtItem[]>([]);
  const [networks, setNetworks] = useState<ExtNetwork[]>([]);
  const [gardenItems, setGardenItems] = useState<ExtGardenItem[]>([]);

  // --- PRICE OVERRIDE STATE ---
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  /**
   * Prix: Override local > Catalogue > DEFAULT_PRICES > fallback
   */
  const getP = (key: string, defaultVal: number = 0): number => {
    const o = overrides[key];
    if (o !== undefined && Number.isFinite(o)) return o;

    const catalog = getUnitPrice(key);
    if (catalog && catalog !== 0) return catalog;

    const dp = (DEFAULT_PRICES as any)[key];
    if (dp !== undefined) {
      const v = Number(dp);
      return !Number.isNaN(v) ? v : defaultVal;
    }

    return defaultVal;
  };

  // --- TEMP INPUT STATES ---
  const [newZoneLabel, setNewZoneLabel] = useState<string>(
    t("calc.exterior.defaults.zone_label", { defaultValue: "Terrasse" })
  );
  const [newZoneArea, setNewZoneArea] = useState("");
  const [newZoneType, setNewZoneType] = useState<ZoneType>("terrace");

  const [wallLen, setWallLen] = useState("");
  const [wallHeight, setWallHeight] = useState("1.60");
  const [wallWidth, setWallWidth] = useState("20"); // cm

  const [fenceLen, setFenceLen] = useState("");
  const [fenceType, setFenceType] = useState("mesh_rigid");

  const [netLen, setNetLen] = useState("");
  const [netType, setNetType] = useState<ExtNetwork["type"]>("elec");

  const [lawnArea, setLawnArea] = useState("");
  const [plantCount, setPlantCount] = useState("");
  const [plantType, setPlantType] = useState("PLANT_UNIT");

  // --- i18n helpers ---
  const zoneTypeLabel = (z: ZoneType) =>
    t(`calc.exterior.zone_types.${z}`, { defaultValue: z });

  const coatingLabel = (c: CoatingType) =>
    t(`calc.exterior.coatings.${c}`, { defaultValue: c });

  const networkTypeLabel = (n: ExtNetwork["type"]) =>
    t(`calc.exterior.network_types.${n}`, { defaultValue: n });

  const fenceTypeLabel = (ft: string) =>
    t(`calc.exterior.fence_types.${ft}`, { defaultValue: ft });

  // --- ACTIONS ---
  const addZone = () => {
    const area = parseFloat(newZoneArea);
    if (!area || area <= 0) return;

    let def: Partial<ExtZone> = {
      excavationDepth: 20,
      geotextile: true,
      foundationThick: 15,
      beddingThick: 4,
      slabThick: 0,
      coating: "pavers",
      borders: true,
      drain: false,
    };

    if (newZoneType === "driveway") {
      def = {
        ...def,
        excavationDepth: 30,
        foundationThick: 20,
        coating: "gravel",
        beddingThick: 0,
      };
    }

    setZones((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: newZoneLabel || t("calc.exterior.defaults.zone_fallback", { defaultValue: "Zone" }),
        type: newZoneType,
        area,
        perimeter: Math.sqrt(area) * 4, // estimation simple
        coating: def.coating!,
        excavationDepth: def.excavationDepth!,
        foundationThick: def.foundationThick!,
        beddingThick: def.beddingThick!,
        slabThick: def.slabThick!,
        geotextile: def.geotextile!,
        borders: def.borders!,
        drain: def.drain ?? false,
      },
    ]);

    setNewZoneArea("");
  };

  const addWall = () => {
    const L = parseFloat(wallLen);
    const H = parseFloat(wallHeight);
    const W = parseFloat(wallWidth);
    if (!L || !H || !W) return;

    setWalls((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        label: t("calc.exterior.defaults.wall_label", { defaultValue: "Mur" }),
        length: L,
        height: H,
        width: W,
        type: "block_wall",
        foundation: true,
        foundW: 50,
        foundH: 30,
        coating: "2sides",
        coping: true,
      },
    ]);

    setWallLen("");
  };

  const addFence = () => {
    const L = parseFloat(fenceLen);
    if (!L || L <= 0) return;

    let key = "FENCE_RIGID_M";
    if (fenceType === "mesh_soft") key = "FENCE_MESH_M";
    if (fenceType === "wood") key = "FENCE_WOOD_M";

    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        category: "fence",
        type: fenceType,
        label: t("calc.exterior.items.fence", { defaultValue: "Clôture" }),
        quantity: L,
        systemKey: key,
      },
    ]);

    setFenceLen("");
  };

  const addGate = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        category: "gate",
        type: "standard",
        label: t("calc.exterior.items.gate", { defaultValue: "Portail" }),
        quantity: 1,
        systemKey: "GATE_UNIT",
        optionKey: "GATE_MOTOR_UNIT",
        optionQty: 0,
      },
    ]);
  };

  const addPool = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        category: "pool",
        type: "standard",
        label: t("calc.exterior.items.pool", { defaultValue: "Piscine" }),
        quantity: 1,
        systemKey: "POOL_UNIT",
        optionKey: "POOL_INSTALL_UNIT",
        optionQty: 1,
      },
    ]);
  };

  const addNetwork = () => {
    const L = parseFloat(netLen);
    if (!L || L <= 0) return;

    setNetworks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: netType,
        label: t(`calc.exterior.network_labels.${netType}`, { defaultValue: netType.toUpperCase() }),
        length: L,
        trench: true,
        trenchW: 40,
        trenchD: 60,
        manholes: 0,
        points: 0,
      },
    ]);

    setNetLen("");
  };

  const addGarden = (cat: ExtGardenItem["category"], key: string, label: string, qty: number, unit: Unit) => {
    if (!qty || qty <= 0) return;
    incrementUsage(key);

    setGardenItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        category: cat,
        label,
        systemKey: key,
        quantity: qty,
        unit,
      },
    ]);
  };

  // --- CALCULATION ENGINE ---
  const calculationData = useMemo(() => {
    let totalCost = 0;
    const materialsList: any[] = [];
    const warnings: string[] = [];
    const usedKeys = new Set<string>();

    const addMat = (
      id: string,
      name: string,
      qty: number,
      unit: Unit,
      key: string,
      cat: CalculatorType,
      details?: string
    ) => {
      const unitPrice = getP(key);
      const q = Number.isFinite(qty) ? qty : 0;
      const total = q * unitPrice;

      usedKeys.add(key);

      materialsList.push({
        id,
        name,
        quantity: fmt2(q),
        unit,
        unitPrice: fmt2(unitPrice),
        totalPrice: fmt2(total),
        category: cat,
        details,
        systemKey: key,
      });

      return total;
    };

    // 1) ZONES
    zones.forEach((z) => {
      const excavVol = z.area * (z.excavationDepth / 100);
      const foundVol = z.area * (z.foundationThick / 100);
      const bedVol = z.area * (z.beddingThick / 100);
      const slabVol = z.area * (z.slabThick / 100);

      if (excavVol > 0) {
        totalCost += addMat(
          `excav_${z.id}`,
          t("calc.exterior.materials.excavation_named", { defaultValue: "Décaissement {{label}}", label: z.label }),
          fmt2(excavVol),
          Unit.M3,
          "EXCAVATION_M3",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.thickness_cm", { defaultValue: "{{n}} cm", n: z.excavationDepth })
        );
      }

      if (z.geotextile) {
        totalCost += addMat(
          `geo_${z.id}`,
          t("calc.exterior.materials.geotextile", { defaultValue: "Géotextile" }),
          Math.ceil(z.area * 1.1),
          Unit.M2,
          "GEOTEXTILE_M2",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.overlap_plus", { defaultValue: "+10% recouvrement" })
        );
      }

      if (foundVol > 0) {
        const tons = foundVol * 1.8;
        totalCost += addMat(
          `found_${z.id}`,
          t("calc.exterior.materials.foundation_gravel", { defaultValue: "Tout-venant (Grave)" }),
          fmt2(tons),
          Unit.TON,
          "GRAVEL_FOUNDATION_TON",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.thickness_cm", { defaultValue: "{{n}} cm", n: z.foundationThick })
        );
      }

      if (bedVol > 0) {
        const tons = bedVol * 1.6;
        totalCost += addMat(
          `bed_${z.id}`,
          t("calc.exterior.materials.bedding_sand", { defaultValue: "Sable (Lit de pose)" }),
          fmt2(tons),
          Unit.TON,
          "SAND_TON",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.thickness_cm", { defaultValue: "{{n}} cm", n: z.beddingThick })
        );
      }

      if (slabVol > 0) {
        totalCost += addMat(
          `slab_${z.id}`,
          t("calc.exterior.materials.concrete_slab", { defaultValue: "Béton (Dalle)" }),
          fmt2(slabVol),
          Unit.M3,
          "BPE_M3",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.thickness_cm", { defaultValue: "{{n}} cm", n: z.slabThick })
        );
      }

      // Revêtement
      let coatKey = "";
      let coatUnit: Unit = Unit.M2;
      let coatQty = z.area;

      if (z.coating === "pavers") coatKey = "PAVERS_M2";
      else if (z.coating === "wood") coatKey = "WOOD_DECK_M2";
      else if (z.coating === "composite") coatKey = "COMPOSITE_DECK_M2";
      else if (z.coating === "tile") coatKey = "TILE_M2";
      else if (z.coating === "asphalt") coatKey = "ASPHALT_M2";
      else if (z.coating === "gravel") {
        coatKey = "DECOR_GRAVEL_TON";
        coatUnit = Unit.TON;
        coatQty = z.area * 0.05 * 1.5; // ~ 5cm, 1.5 t/m3
      } else if (z.coating === "concrete") {
        if (z.slabThick <= 0) {
          warnings.push(
            t("calc.exterior.warnings.concrete_no_slab", {
              defaultValue: "Zone \"{{label}}\" : revêtement béton mais dalle = 0 cm.",
              label: z.label,
            })
          );
        }
      }

      if (coatKey) {
        totalCost += addMat(
          `coat_${z.id}`,
          t("calc.exterior.materials.coating_named", {
            defaultValue: "Revêtement {{name}}",
            name: coatingLabel(z.coating),
          }),
          fmt2(coatQty),
          coatUnit,
          coatKey,
          CalculatorType.EXTERIOR
        );
      }

      if (z.borders) {
        totalCost += addMat(
          `bord_${z.id}`,
          t("calc.exterior.materials.borders", { defaultValue: "Bordures P1" }),
          Math.ceil(z.perimeter),
          Unit.METER,
          "BORDER_CONCRETE_M",
          CalculatorType.EXTERIOR
        );
      }
    });

    // 2) WALLS
    walls.forEach((w) => {
      const area = w.length * w.height;

      if (w.foundation) {
        const vol = w.length * (w.foundW / 100) * (w.foundH / 100);
        totalCost += addMat(
          `w_found_${w.id}`,
          t("calc.exterior.materials.wall_footing_named", { defaultValue: "Semelle {{label}}", label: w.label }),
          fmt2(vol),
          Unit.M3,
          "BPE_M3",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.dim_cm", { defaultValue: "{{w}}x{{h}} cm", w: w.foundW, h: w.foundH })
        );
      }

      const tcm = Math.round(w.width || 20);
      const blockKey =
        tcm === 10 ? "BLOCK_10_UNIT" : tcm === 15 ? "BLOCK_15_UNIT" : tcm === 25 ? "BLOCK_25_UNIT" : "BLOCK_20_UNIT";

      const blocks = Math.ceil(area * 10);
      totalCost += addMat(
        `w_blk_${w.id}`,
        t("calc.exterior.materials.blocks_named", { defaultValue: "Parpaings {{t}}cm", t: tcm }),
        blocks,
        Unit.PIECE,
        blockKey,
        CalculatorType.EXTERIOR
      );

      const bags = Math.ceil(area / 3);
      totalCost += addMat(
        `w_mor_${w.id}`,
        t("calc.exterior.materials.mortar", { defaultValue: "Mortier" }),
        bags,
        Unit.BAG,
        "MORTAR_BAG_25KG",
        CalculatorType.EXTERIOR
      );

      if (w.coating !== "none") {
        const sides = w.coating === "2sides" ? 2 : 1;
        const bagsCoat = Math.ceil((area * sides) / 1.5);
        totalCost += addMat(
          `w_coat_${w.id}`,
          t("calc.exterior.materials.facade_coating", { defaultValue: "Enduit Façade" }),
          bagsCoat,
          Unit.BAG,
          "FACADE_COATING_BAG",
          CalculatorType.EXTERIOR
        );
      }

      if (w.coping) {
        const pcs = Math.ceil(w.length / 0.5);
        totalCost += addMat(
          `w_cop_${w.id}`,
          t("calc.exterior.materials.coping", { defaultValue: "Couvertines" }),
          pcs,
          Unit.PIECE,
          "WALL_COPING_UNIT",
          CalculatorType.EXTERIOR
        );
      }
    });

    // 3) ITEMS
    items.forEach((it) => {
      totalCost += addMat(
        it.id,
        it.label,
        it.quantity,
        it.category === "fence" ? Unit.METER : Unit.PIECE,
        it.systemKey,
        CalculatorType.EXTERIOR
      );

      if (it.category === "fence") {
        const posts = Math.ceil(it.quantity / 2.5) + 1;
        totalCost += addMat(
          `${it.id}_post`,
          t("calc.exterior.materials.fence_posts", { defaultValue: "Poteaux" }),
          posts,
          Unit.PIECE,
          "FENCE_POST_UNIT",
          CalculatorType.EXTERIOR
        );
      }

      if (it.optionKey && it.optionQty && it.optionQty > 0) {
        totalCost += addMat(
          `${it.id}_opt`,
          t("calc.exterior.materials.option_install_named", { defaultValue: "Option / Pose ({{label}})", label: it.label }),
          it.optionQty,
          Unit.PIECE,
          it.optionKey,
          CalculatorType.EXTERIOR
        );
      }
    });

    // 4) NETWORKS
    networks.forEach((n) => {
      let pipeKey = "ELECTRIC_CONDUIT_M";
      if (n.type === "water") pipeKey = "WATER_PIPE_M";
      if (n.type === "sewer") pipeKey = "SEWER_PIPE_M";
      if (n.type === "light") pipeKey = "ELECTRIC_CONDUIT_M";

      if (n.trench) {
        const vol = n.length * (n.trenchW / 100) * (n.trenchD / 100);
        totalCost += addMat(
          `tr_${n.id}`,
          t("calc.exterior.materials.trench_named", { defaultValue: "Tranchée {{label}}", label: n.label }),
          fmt2(vol),
          Unit.M3,
          "TRENCH_EXCAVATION_M3",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.dim_cm", { defaultValue: "{{w}}x{{h}} cm", w: n.trenchW, h: n.trenchD })
        );

        const volBackfill = n.length * (n.trenchW / 100) * 0.1;
        totalCost += addMat(
          `bk_${n.id}`,
          t("calc.exterior.materials.backfill", { defaultValue: "Remblai (sable/grave)" }),
          fmt2(volBackfill),
          Unit.M3,
          "BACKFILL_M3",
          CalculatorType.EXTERIOR
        );
      }

      if (n.type === "drain") {
        const rolls = Math.ceil(n.length / 50);
        totalCost += addMat(
          `pp_${n.id}`,
          t("calc.exterior.materials.drain_roll_named", { defaultValue: "Drain Ø100 ({{label}})", label: n.label }),
          rolls,
          Unit.ROLL,
          "DRAIN_PIPE_50M",
          CalculatorType.EXTERIOR,
          t("calc.exterior.details.rolls_for_length", { defaultValue: "{{len}} ml (≈ {{r}} rouleaux)", len: n.length, r: rolls })
        );
      } else {
        totalCost += addMat(
          `pp_${n.id}`,
          t("calc.exterior.materials.pipe_named", { defaultValue: "Gaine/Tuyau {{label}}", label: n.label }),
          fmt2(n.length),
          Unit.METER,
          pipeKey,
          CalculatorType.EXTERIOR
        );
      }

      if (n.manholes > 0) {
        totalCost += addMat(
          `mh_${n.id}`,
          t("calc.exterior.materials.manholes", { defaultValue: "Regards" }),
          n.manholes,
          Unit.PIECE,
          "MANHOLE_UNIT",
          CalculatorType.EXTERIOR
        );
      }

      if (n.points > 0 && n.type === "light") {
        totalCost += addMat(
          `lp_${n.id}`,
          t("calc.exterior.materials.garden_lights", { defaultValue: "Points Éclairage" }),
          n.points,
          Unit.PIECE,
          "GARDEN_LIGHT_UNIT",
          CalculatorType.EXTERIOR
        );
      }
    });

    // 5) GARDEN
    gardenItems.forEach((g) => {
      totalCost += addMat(g.id, g.label, g.quantity, g.unit, g.systemKey, CalculatorType.EXTERIOR);
    });

    return {
      totalCost: fmt2(totalCost),
      materials: materialsList,
      warnings,
      activeKeys: Array.from(usedKeys),
    };
  }, [zones, walls, items, networks, gardenItems, overrides, t]);

  useEffect(() => {
    onCalculate({
      summary: t("calc.exterior.summary", { defaultValue: "Aménagement Extérieur Complet" }),
      details: [
        { label: t("calc.exterior.kpi.zones", { defaultValue: "Sols" }), value: zones.length, unit: t("calc.exterior.units.zones", { defaultValue: "zones" }) },
        {
          label: t("calc.exterior.kpi.fences_walls", { defaultValue: "Clôtures/Murs" }),
          value: items.filter((i) => i.category === "fence").length + walls.length,
          unit: t("calc.exterior.units.items", { defaultValue: "éléments" }),
        },
        {
          label: t("calc.exterior.kpi.networks", { defaultValue: "Réseaux" }),
          value: fmt2(networks.reduce((a, b) => a + b.length, 0)),
          unit: t("calc.exterior.units.mlin", { defaultValue: "ml" }),
        },
      ],
      materials: calculationData.materials,
      totalCost: calculationData.totalCost,
      warnings: calculationData.warnings,
    });
  }, [calculationData, onCalculate, zones.length, walls.length, items, networks, t]);

  // --- SUB-COMPONENT: Price Editor ---
  const PriceEditor: React.FC = () => {
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const startEdit = (key: string, current: number) => {
      setEditingKey(key);
      setEditValue(String(current));
    };

    const saveEdit = () => {
      if (!editingKey) return;
      const val = parseFloat(editValue);
      if (!Number.isNaN(val)) {
        setOverrides((prev) => ({ ...prev, [editingKey]: val }));
      }
      setEditingKey(null);
    };

    const resetPrice = (key: string) => {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEditingKey(null);
    };

    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase">
            {t("calc.exterior.price_editor.title", { defaultValue: "Ajustement Prix Unitaires" })}
          </h4>
          <div className="text-[10px] text-slate-400 italic">
            {t("calc.exterior.price_editor.subtitle", { defaultValue: "Modifications locales au projet" })}
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {calculationData.activeKeys.map((key) => {
            const meta = (MATERIAL_METADATA as any)[key] || { label: key, unit: "" };
            const currentPrice = getP(key);
            const isOverridden = overrides[key] !== undefined;
            const isEditing = editingKey === key;
            const catalog = getUnitPrice(key);

            return (
              <div
                key={key}
                className={`flex justify-between items-center p-2 rounded text-xs ${
                  isOverridden ? "bg-amber-50 border border-amber-100" : "bg-slate-50 border border-slate-100"
                }`}
              >
                <div className="flex-1 mr-2">
                  <span className="font-bold text-slate-700 block truncate">{meta.label}</span>
                  {isOverridden && (
                    <span className="text-[9px] text-amber-600 font-bold">
                      {t("calc.exterior.price_editor.overridden_catalog", {
                        defaultValue: "Modifié (Catalogue: {{p}}€)",
                        p: (catalog || 0).toFixed(2),
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {isEditing ? (
                    <div className="flex items-center">
                      <input
                        type="number"
                        autoFocus
                        className="w-16 p-1 border border-blue-400 rounded text-right font-bold text-blue-700"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                      <button onClick={saveEdit} className="ml-1 p-1 bg-blue-600 text-white rounded" title={t("common.save", { defaultValue: "Enregistrer" })}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingKey(null)} className="ml-1 p-1 text-slate-400" title={t("common.cancel", { defaultValue: "Annuler" })}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold w-16 text-right">{currentPrice.toFixed(2)} €</span>
                      <span className="text-slate-400 w-8 text-right">{String(meta.unit || "").replace("€/", "")}</span>
                      <button
                        onClick={() => startEdit(key, currentPrice)}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-500"
                        title={t("calc.exterior.price_editor.edit", { defaultValue: "Modifier" })}
                      >
                        <Pencil size={12} />
                      </button>
                      {isOverridden && (
                        <button
                          onClick={() => resetPrice(key)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-400"
                          title={t("calc.exterior.price_editor.reset", { defaultValue: "Rétablir prix catalogue" })}
                        >
                          <RotateCcw size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- RENDER ---
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
            {s === 1 && t("calc.exterior.steps.1", { defaultValue: "1. Sols" })}
            {s === 2 && t("calc.exterior.steps.2", { defaultValue: "2. Clôtures" })}
            {s === 3 && t("calc.exterior.steps.3", { defaultValue: "3. Réseaux" })}
            {s === 4 && t("calc.exterior.steps.4", { defaultValue: "4. Jardin" })}
            {s === 5 && t("calc.exterior.steps.5", { defaultValue: "5. Devis" })}
          </button>
        ))}
      </div>

      {/* STEP 1: SOLS */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.exterior.step1.hint", { defaultValue: "Terrasses, allées et zones de stationnement (multi-couches)." })}
          </div>

          <div className="space-y-3">
            {zones.map((z) => (
              <div key={z.id} className="bg-white border border-slate-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-slate-700">{z.label}</span>
                    <span className="text-xs text-slate-500 block">
                      {z.area} m² • {coatingLabel(z.coating).toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setZones((prev) => prev.filter((x) => x.id !== z.id))}
                    className="text-red-400"
                    title={t("common.delete", { defaultValue: "Supprimer" })}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
                  <span>{t("calc.exterior.zone_fields.excav", { defaultValue: "Décaissement: {{n}}cm", n: z.excavationDepth })}</span>
                  <span>{t("calc.exterior.zone_fields.foundation", { defaultValue: "Fondation: {{n}}cm", n: z.foundationThick })}</span>
                  <span>{t("calc.exterior.zone_fields.bedding", { defaultValue: "Lit pose: {{n}}cm", n: z.beddingThick })}</span>
                  <span>{t("calc.exterior.zone_fields.slab", { defaultValue: "Dalle: {{n}}cm", n: z.slabThick })}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-blue-200">
            <div className="flex gap-2 mb-2">
              <select
                value={newZoneType}
                onChange={(e) => setNewZoneType(e.target.value as any)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              >
                <option value="terrace">{zoneTypeLabel("terrace")}</option>
                <option value="driveway">{zoneTypeLabel("driveway")}</option>
                <option value="path">{zoneTypeLabel("path")}</option>
                <option value="other">{zoneTypeLabel("other")}</option>
              </select>

              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.area_m2", { defaultValue: "Surface m²" })}
                value={newZoneArea}
                onChange={(e) => setNewZoneArea(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />
            </div>

            <input
              type="text"
              placeholder={t("calc.exterior.placeholders.zone_name", { defaultValue: "Nom (ex: Terrasse Sud)" })}
              value={newZoneLabel}
              onChange={(e) => setNewZoneLabel(e.target.value)}
              className="w-full p-2 text-xs border rounded bg-white text-slate-900 mb-2"
            />

            <button
              type="button"
              onClick={addZone}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs flex justify-center items-center"
            >
              <Plus size={14} className="mr-1" /> {t("calc.exterior.actions.add_zone", { defaultValue: "Ajouter Zone" })}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center mt-2"
          >
            {t("common.next", { defaultValue: "Suivant" })} <ArrowRight size={18} className="ml-2" />
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Fence size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.exterior.step2.hint", { defaultValue: "Délimitation, maçonnerie paysagère et piscine." })}
          </div>

          <div className="space-y-2">
            {walls.map((w) => (
              <div key={w.id} className="bg-white border rounded p-2 flex justify-between items-center">
                <span className="text-sm font-bold">
                  {w.label} ({w.length} {t("calc.exterior.units.mlin", { defaultValue: "ml" })} • {w.height} m • {Math.round(w.width)} cm)
                </span>
                <button
                  type="button"
                  onClick={() => setWalls((prev) => prev.filter((x) => x.id !== w.id))}
                  className="text-red-400"
                  title={t("common.delete", { defaultValue: "Supprimer" })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {items.map((it) => (
              <div key={it.id} className="bg-white border rounded p-2 flex justify-between items-center">
                <span className="text-sm font-bold">
                  {it.label} ({it.category === "fence" ? `${it.quantity} ${t("calc.exterior.units.mlin", { defaultValue: "ml" })}` : `${it.quantity} ${t("calc.exterior.units.unit", { defaultValue: "u" })}`})
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                  className="text-red-400"
                  title={t("common.delete", { defaultValue: "Supprimer" })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white p-3 rounded border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("calc.exterior.wall.title", { defaultValue: "Mur / Muret" })}</h4>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.length_ml", { defaultValue: "L (ml)" })}
                value={wallLen}
                onChange={(e) => setWallLen(e.target.value)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.height_m", { defaultValue: "H (m)" })}
                value={wallHeight}
                onChange={(e) => setWallHeight(e.target.value)}
                className="w-20 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.thickness_cm", { defaultValue: "Ép (cm)" })}
                value={wallWidth}
                onChange={(e) => setWallWidth(e.target.value)}
                className="w-20 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <button type="button" onClick={addWall} className="bg-blue-100 text-blue-700 px-3 rounded font-bold text-xs" title={t("common.add", { defaultValue: "Ajouter" })}>
                +
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{t("calc.exterior.fence.title", { defaultValue: "Clôture" })}</h4>
            <div className="flex gap-2 mb-2">
              <select
                value={fenceType}
                onChange={(e) => setFenceType(e.target.value)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              >
                <option value="mesh_rigid">{fenceTypeLabel("mesh_rigid")}</option>
                <option value="mesh_soft">{fenceTypeLabel("mesh_soft")}</option>
                <option value="wood">{fenceTypeLabel("wood")}</option>
              </select>

              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.length_ml", { defaultValue: "L (ml)" })}
                value={fenceLen}
                onChange={(e) => setFenceLen(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />

              <button type="button" onClick={addFence} className="bg-blue-100 text-blue-700 px-3 rounded font-bold text-xs" title={t("common.add", { defaultValue: "Ajouter" })}>
                +
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={addGate}
              className="py-2 border border-dashed border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              + {t("calc.exterior.items.gate", { defaultValue: "Portail" })}
            </button>
            <button
              type="button"
              onClick={addPool}
              className="py-2 border border-dashed border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              + {t("calc.exterior.items.pool", { defaultValue: "Piscine" })}
            </button>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Pickaxe size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.exterior.step3.hint", { defaultValue: "VRD : eau, électricité, évacuation. Calcul tranchée inclus." })}
          </div>

          <div className="space-y-2">
            {networks.map((n) => (
              <div key={n.id} className="bg-white border rounded p-2 flex justify-between items-center">
                <div>
                  <span className="text-sm font-bold block">{n.label}</span>
                  <span className="text-xs text-slate-500">
                    {n.length} {t("calc.exterior.units.mlin", { defaultValue: "ml" })} •{" "}
                    {n.trench ? t("calc.exterior.network.trench", { defaultValue: "Tranchée" }) : t("calc.exterior.network.surface", { defaultValue: "Pose au sol" })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNetworks((prev) => prev.filter((x) => x.id !== n.id))}
                  className="text-red-400"
                  title={t("common.delete", { defaultValue: "Supprimer" })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex gap-2 mb-2">
              <select
                value={netType}
                onChange={(e) => setNetType(e.target.value as any)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              >
                <option value="elec">{networkTypeLabel("elec")}</option>
                <option value="water">{networkTypeLabel("water")}</option>
                <option value="sewer">{networkTypeLabel("sewer")}</option>
                <option value="drain">{networkTypeLabel("drain")}</option>
                <option value="light">{networkTypeLabel("light")}</option>
              </select>

              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.length_ml_full", { defaultValue: "Long. (ml)" })}
                value={netLen}
                onChange={(e) => setNetLen(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />

              <button type="button" onClick={addNetwork} className="bg-blue-600 text-white px-3 rounded font-bold text-xs" title={t("common.add", { defaultValue: "Ajouter" })}>
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Sprout size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.exterior.step4.hint", { defaultValue: "Végétaux, gazon et arrosage." })}
          </div>

          <div className="space-y-2">
            {gardenItems.map((g) => (
              <div key={g.id} className="bg-white border rounded p-2 flex justify-between items-center">
                <span className="text-sm font-bold">
                  {g.quantity} {g.unit} {g.label}
                </span>
                <button
                  type="button"
                  onClick={() => setGardenItems((prev) => prev.filter((x) => x.id !== g.id))}
                  className="text-red-400"
                  title={t("common.delete", { defaultValue: "Supprimer" })}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center">
              <Sun size={14} className="mr-1" /> {t("calc.exterior.garden.lawn", { defaultValue: "Gazon" })}
            </h4>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.area_m2", { defaultValue: "Surface m²" })}
                value={lawnArea}
                onChange={(e) => setLawnArea(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <button
                type="button"
                onClick={() => {
                  addGarden("lawn", "LAWN_ROLL_M2", t("calc.exterior.garden.lawn_roll", { defaultValue: "Gazon rouleau" }), parseFloat(lawnArea), Unit.M2);
                  setLawnArea("");
                }}
                className="flex-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded border border-emerald-200"
              >
                {t("calc.exterior.garden.roll", { defaultValue: "Rouleau" })}
              </button>
              <button
                type="button"
                onClick={() => {
                  const area = parseFloat(lawnArea) || 0;
                  const kg = area * 0.04;
                  addGarden("lawn", "LAWN_SEED_KG", t("calc.exterior.garden.lawn_seed", { defaultValue: "Semence gazon" }), fmt2(kg), Unit.KG);
                  setLawnArea("");
                }}
                className="flex-1 bg-slate-50 text-slate-700 font-bold text-xs rounded border border-slate-200"
              >
                {t("calc.exterior.garden.seed", { defaultValue: "Semis" })}
              </button>
            </div>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center">
              <Flower2 size={14} className="mr-1" /> {t("calc.exterior.garden.planting", { defaultValue: "Plantation" })}
            </h4>
            <div className="flex gap-2">
              <select
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              >
                <option value="PLANT_UNIT">{t("calc.exterior.plants.PLANT_UNIT", { defaultValue: "Plante / Vivace" })}</option>
                <option value="SHRUB_UNIT">{t("calc.exterior.plants.SHRUB_UNIT", { defaultValue: "Arbuste" })}</option>
                <option value="HEDGE_PLANT_UNIT">{t("calc.exterior.plants.HEDGE_PLANT_UNIT", { defaultValue: "Haie" })}</option>
                <option value="TREE_UNIT">{t("calc.exterior.plants.TREE_UNIT", { defaultValue: "Arbre" })}</option>
              </select>

              <input
                type="number"
                placeholder={t("calc.exterior.placeholders.qty", { defaultValue: "Qté" })}
                value={plantCount}
                onChange={(e) => setPlantCount(e.target.value)}
                className="w-16 p-2 text-xs border rounded bg-white text-slate-900"
              />

              <button
                type="button"
                onClick={() => {
                  const q = parseFloat(plantCount) || 0;
                  const label = t(`calc.exterior.plant_labels.${plantType}`, { defaultValue: t("calc.exterior.plant_labels.default", { defaultValue: "Plante" }) });
                  addGarden("planting", plantType, label, q, Unit.PIECE);
                  setPlantCount("");
                }}
                className="bg-emerald-600 text-white px-3 rounded font-bold text-xs"
                title={t("common.add", { defaultValue: "Ajouter" })}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" onClick={() => setStep(5)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">
              {t("common.next", { defaultValue: "Suivant" })}
            </button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            {t("calc.exterior.step5.hint", { defaultValue: "Récapitulatif. Les prix peuvent être modifiés pour ce calcul." })}
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => setProMode((p) => !p)} className="text-xs flex items-center text-blue-600">
              <Settings size={12} className="mr-1" />{" "}
              {proMode ? t("calc.exterior.modes.pro", { defaultValue: "Mode Pro" }) : t("calc.exterior.modes.simple", { defaultValue: "Mode Simple" })}
            </button>
          </div>

          <PriceEditor />

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-800">{t("calc.exterior.total.title", { defaultValue: "Coût Total Estimé" })}</h3>
            <div className="text-3xl font-bold text-blue-600 mb-6">{calculationData.totalCost.toFixed(2)} €</div>

            <div className="space-y-2 text-sm">
              {calculationData.materials.map((m: any) => (
                <div key={m.id} className="flex justify-between items-center py-1 border-b border-slate-50">
                  <div>
                    <span className="block font-medium text-slate-700">{m.name}</span>
                    <span className="text-xs text-slate-400">
                      {m.quantity} {m.unit} × {Number(m.unitPrice).toFixed(2)}€
                    </span>
                  </div>
                  <span className="font-bold text-slate-600">{Number(m.totalPrice).toFixed(2)}€</span>
                </div>
              ))}
            </div>
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

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={() => setStep(4)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">
              {t("common.back", { defaultValue: "Retour" })}
            </button>
            <button type="button" className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> {t("calc.exterior.done", { defaultValue: "Terminé" })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};