import React, { useState, useEffect, useMemo } from "react";
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

export const ExteriorCalculator: React.FC<Props> = ({ onCalculate }) => {
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
   * ✅ Helper prix (cohérent avec le reste de l’app)
   * Priorité : Override local > Catalogue (Matériaux & Prix) > DEFAULT_PRICES > fallback
   */
  const getP = (key: string, defaultVal: number = 0): number => {
    if (overrides[key] !== undefined) return overrides[key];

    const catalog = getUnitPrice(key);
    if (catalog && catalog !== 0) return catalog;

    if ((DEFAULT_PRICES as any)[key] !== undefined) {
      const v = Number((DEFAULT_PRICES as any)[key]);
      return !Number.isNaN(v) ? v : defaultVal;
    }

    return defaultVal;
  };

  // --- TEMP INPUT STATES ---
  const [newZoneLabel, setNewZoneLabel] = useState("Terrasse");
  const [newZoneArea, setNewZoneArea] = useState("");
  const [newZoneType, setNewZoneType] = useState<ZoneType>("terrace");

  const [wallLen, setWallLen] = useState("");
  const [wallHeight, setWallHeight] = useState("1.60");
  const [wallWidth, setWallWidth] = useState("20"); // ✅ cm

  const [fenceLen, setFenceLen] = useState("");
  const [fenceType, setFenceType] = useState("mesh_rigid");

  const [netLen, setNetLen] = useState("");
  const [netType, setNetType] = useState<ExtNetwork["type"]>("elec");

  const [lawnArea, setLawnArea] = useState("");
  const [plantCount, setPlantCount] = useState("");
  const [plantType, setPlantType] = useState("PLANT_UNIT");

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
        label: newZoneLabel,
        type: newZoneType,
        area,
        perimeter: Math.sqrt(area) * 4, // simple estimation
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
        label: "Mur",
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
        label: "Clôture",
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
        label: "Portail",
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
        label: "Piscine",
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
        label: netType.toUpperCase(),
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

  const addGarden = (
    cat: ExtGardenItem["category"],
    key: string,
    label: string,
    qty: number,
    unit: Unit
  ) => {
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

    // ✅ add material helper (stores systemKey)
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
      const total = qty * unitPrice;
      usedKeys.add(key);
      materialsList.push({
        id,
        name,
        quantity: qty,
        unit,
        unitPrice,
        totalPrice: total,
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
          `Décaissement ${z.label}`,
          parseFloat(excavVol.toFixed(2)),
          Unit.M3,
          "EXCAVATION_M3",
          CalculatorType.EXTERIOR,
          `${z.excavationDepth} cm`
        );
      }

      if (z.geotextile) {
        totalCost += addMat(
          `geo_${z.id}`,
          "Géotextile",
          Math.ceil(z.area * 1.1),
          Unit.M2,
          "GEOTEXTILE_M2",
          CalculatorType.EXTERIOR
        );
      }

      if (foundVol > 0) {
        const tons = foundVol * 1.8;
        totalCost += addMat(
          `found_${z.id}`,
          "Tout-venant (Grave)",
          parseFloat(tons.toFixed(2)),
          Unit.TON,
          "GRAVEL_FOUNDATION_TON",
          CalculatorType.EXTERIOR,
          `${z.foundationThick} cm`
        );
      }

      if (bedVol > 0) {
        const tons = bedVol * 1.6;
        totalCost += addMat(
          `bed_${z.id}`,
          "Sable (Lit de pose)",
          parseFloat(tons.toFixed(2)),
          Unit.TON,
          "SAND_TON",
          CalculatorType.EXTERIOR,
          `${z.beddingThick} cm`
        );
      }

      if (slabVol > 0) {
        totalCost += addMat(
          `slab_${z.id}`,
          "Béton (Dalle)",
          parseFloat(slabVol.toFixed(2)),
          Unit.M3,
          "BPE_M3",
          CalculatorType.EXTERIOR,
          `${z.slabThick} cm`
        );
      }

      // revêtement
      let coatKey = "";
      let coatUnit: Unit = Unit.M2;
      let qty = z.area;

      if (z.coating === "pavers") coatKey = "PAVERS_M2";
      else if (z.coating === "wood") coatKey = "WOOD_DECK_M2";
      else if (z.coating === "composite") coatKey = "COMPOSITE_DECK_M2";
      else if (z.coating === "tile") coatKey = "TILE_M2";
      else if (z.coating === "gravel") {
        coatKey = "DECOR_GRAVEL_TON";
        coatUnit = Unit.TON;
        // approx 5 cm * 1.5 t/m3
        qty = z.area * 0.05 * 1.5;
      } else if (z.coating === "concrete") {
        // si l'utilisateur sélectionne "concrete" mais slabThick=0 => warning
        if (z.slabThick <= 0) {
          warnings.push(
            `Zone "${z.label}" : revêtement béton mais épaisseur dalle = 0 cm.`
          );
        }
      }

      if (coatKey) {
        totalCost += addMat(
          `coat_${z.id}`,
          `Revêtement ${z.coating}`,
          parseFloat(qty.toFixed(2)),
          coatUnit,
          coatKey,
          CalculatorType.EXTERIOR
        );
      }

      if (z.borders) {
        totalCost += addMat(
          `bord_${z.id}`,
          "Bordures P1",
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
          `Semelle ${w.label}`,
          parseFloat(vol.toFixed(2)),
          Unit.M3,
          "BPE_M3",
          CalculatorType.EXTERIOR,
          `${w.foundW}x${w.foundH} cm`
        );
      }

      /**
       * ✅ Blocs : on garde simple (parpaings standard) MAIS on choisit la clé prix
       * en fonction de l’épaisseur si l’utilisateur change wallWidth :
       * 10 => BLOCK_10_UNIT ; 15 => BLOCK_15_UNIT ; 20 => BLOCK_20_UNIT ; 25 => BLOCK_25_UNIT
       * fallback => BLOCK_20_UNIT
       */
      const t = Math.round(w.width || 20);
      const blockKey =
        t === 10
          ? "BLOCK_10_UNIT"
          : t === 15
          ? "BLOCK_15_UNIT"
          : t === 25
          ? "BLOCK_25_UNIT"
          : "BLOCK_20_UNIT";

      // consommation basique (à affiner si tu veux) : 10 u/m²
      const blocks = Math.ceil(area * 10);
      totalCost += addMat(
        `w_blk_${w.id}`,
        `Parpaings ${t}cm`,
        blocks,
        Unit.PIECE,
        blockKey,
        CalculatorType.EXTERIOR
      );

      // Mortier (clé catalogue)
      const bags = Math.ceil(area / 3); // ~1 sac / 3m² (cohérent avec murs)
      totalCost += addMat(
        `w_mor_${w.id}`,
        "Mortier",
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
          "Enduit Façade",
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
          "Couvertines",
          pcs,
          Unit.PIECE,
          "WALL_COPING_UNIT",
          CalculatorType.EXTERIOR
        );
      }
    });

    // 3) ITEMS
    items.forEach((item) => {
      totalCost += addMat(
        item.id,
        item.label,
        item.quantity,
        item.category === "fence" ? Unit.METER : Unit.PIECE,
        item.systemKey,
        CalculatorType.EXTERIOR
      );

      if (item.category === "fence") {
        // posts ~1 tous les 2.5m + extrémités
        const posts = Math.ceil(item.quantity / 2.5) + 1;
        totalCost += addMat(
          `${item.id}_post`,
          "Poteaux",
          posts,
          Unit.PIECE,
          "FENCE_POST_UNIT",
          CalculatorType.EXTERIOR
        );
      }

      if (item.optionKey && item.optionQty && item.optionQty > 0) {
        totalCost += addMat(
          `${item.id}_opt`,
          `Option / Pose (${item.label})`,
          item.optionQty,
          Unit.PIECE,
          item.optionKey,
          CalculatorType.EXTERIOR
        );
      }
    });

    // 4) NETWORKS
    networks.forEach((n) => {
      // ✅ clé et unité cohérentes
      let pipeKey = "ELECTRIC_CONDUIT_M";
      if (n.type === "water") pipeKey = "WATER_PIPE_M";
      if (n.type === "sewer") pipeKey = "SEWER_PIPE_M";
      if (n.type === "light") pipeKey = "ELECTRIC_CONDUIT_M";

      if (n.trench) {
        const vol = n.length * (n.trenchW / 100) * (n.trenchD / 100);
        totalCost += addMat(
          `tr_${n.id}`,
          `Tranchée ${n.label}`,
          parseFloat(vol.toFixed(2)),
          Unit.M3,
          "TRENCH_EXCAVATION_M3",
          CalculatorType.EXTERIOR,
          `${n.trenchW}x${n.trenchD} cm`
        );

        // Remblai (volume)
        const volBackfill = n.length * (n.trenchW / 100) * 0.1;
        totalCost += addMat(
          `bk_${n.id}`,
          "Remblai (sable/grave)",
          parseFloat(volBackfill.toFixed(2)),
          Unit.M3,
          "BACKFILL_M3",
          CalculatorType.EXTERIOR
        );
      }

      // ✅ Tuyau/Gaine
      if (n.type === "drain") {
        // rouleaux 50m
        const rolls = Math.ceil(n.length / 50);
        totalCost += addMat(
          `pp_${n.id}`,
          `Drain Ø100 (${n.label})`,
          rolls,
          Unit.ROLL,
          "DRAIN_PIPE_50M",
          CalculatorType.EXTERIOR,
          `${n.length} ml (≈ ${rolls} rouleaux)`
        );
      } else {
        totalCost += addMat(
          `pp_${n.id}`,
          `Gaine/Tuyau ${n.label}`,
          parseFloat(n.length.toFixed(1)),
          Unit.METER,
          pipeKey,
          CalculatorType.EXTERIOR
        );
      }

      if (n.manholes > 0) {
        totalCost += addMat(
          `mh_${n.id}`,
          "Regards",
          n.manholes,
          Unit.PIECE,
          "MANHOLE_UNIT",
          CalculatorType.EXTERIOR
        );
      }

      if (n.points > 0 && n.type === "light") {
        totalCost += addMat(
          `lp_${n.id}`,
          "Points Éclairage",
          n.points,
          Unit.PIECE,
          "GARDEN_LIGHT_UNIT",
          CalculatorType.EXTERIOR
        );
      }
    });

    // 5) GARDEN
    gardenItems.forEach((g) => {
      totalCost += addMat(
        g.id,
        g.label,
        g.quantity,
        g.unit,
        g.systemKey,
        CalculatorType.EXTERIOR
      );
    });

    return {
      totalCost,
      materials: materialsList,
      warnings,
      activeKeys: Array.from(usedKeys),
    };
  }, [zones, walls, items, networks, gardenItems, overrides]);

  useEffect(() => {
    onCalculate({
      summary: "Aménagement Extérieur Complet",
      details: [
        { label: "Sols", value: zones.length, unit: "zones" },
        {
          label: "Clôtures/Murs",
          value:
            items.filter((i) => i.category === "fence").length + walls.length,
          unit: "éléments",
        },
        {
          label: "Réseaux",
          value: networks.reduce((a, b) => a + b.length, 0),
          unit: "ml",
        },
      ],
      materials: calculationData.materials,
      totalCost: parseFloat(calculationData.totalCost.toFixed(2)),
      warnings: calculationData.warnings,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculationData]);

  // --- SUB-COMPONENT: Price Editor ---
  const PriceEditor: React.FC = () => {
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const startEdit = (key: string, current: number) => {
      setEditingKey(key);
      setEditValue(current.toString());
    };

    const saveEdit = () => {
      if (!editingKey) return;
      const val = parseFloat(editValue);
      if (!isNaN(val)) {
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
            Ajustement Prix Unitaires
          </h4>
          <div className="text-[10px] text-slate-400 italic">
            Modifications locales au projet
          </div>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {calculationData.activeKeys.map((key) => {
            const meta = MATERIAL_METADATA[key] || { label: key, unit: "" };
            const currentPrice = getP(key);
            const isOverridden = overrides[key] !== undefined;
            const isEditing = editingKey === key;
            const catalog = getUnitPrice(key);

            return (
              <div
                key={key}
                className={`flex justify-between items-center p-2 rounded text-xs ${
                  isOverridden
                    ? "bg-amber-50 border border-amber-100"
                    : "bg-slate-50 border border-slate-100"
                }`}
              >
                <div className="flex-1 mr-2">
                  <span className="font-bold text-slate-700 block truncate">
                    {meta.label}
                  </span>
                  {isOverridden && (
                    <span className="text-[9px] text-amber-600 font-bold">
                      Modifié (Catalogue: {(catalog || 0).toFixed(2)}€)
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
                      <button
                        onClick={saveEdit}
                        className="ml-1 p-1 bg-blue-600 text-white rounded"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingKey(null)}
                        className="ml-1 p-1 text-slate-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold w-16 text-right">
                        {currentPrice.toFixed(2)} €
                      </span>
                      <span className="text-slate-400 w-8 text-right">
                        {(meta.unit || "").replace("€/", "")}
                      </span>
                      <button
                        onClick={() => startEdit(key, currentPrice)}
                        className="p-1.5 hover:bg-slate-200 rounded text-slate-500"
                      >
                        <Pencil size={12} />
                      </button>
                      {isOverridden && (
                        <button
                          onClick={() => resetPrice(key)}
                          className="p-1.5 hover:bg-red-100 rounded text-red-400"
                          title="Rétablir prix catalogue"
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
            onClick={() => setStep(s)}
            className={`flex-1 min-w-[70px] py-2 text-xs font-bold rounded transition-all ${
              step === s ? "bg-white shadow text-blue-600" : "text-slate-400"
            }`}
          >
            {s === 1 && "1. Sols"}
            {s === 2 && "2. Clôtures"}
            {s === 3 && "3. Réseaux"}
            {s === 4 && "4. Jardin"}
            {s === 5 && "5. Devis"}
          </button>
        ))}
      </div>

      {/* STEP 1: SOLS */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Layers size={16} className="mr-2 shrink-0 mt-0.5" />
            Terrasses, allées et zones de stationnement (multi-couches).
          </div>

          <div className="space-y-3">
            {zones.map((z) => (
              <div
                key={z.id}
                className="bg-white border border-slate-200 rounded-lg p-3 relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-slate-700">{z.label}</span>
                    <span className="text-xs text-slate-500 block">
                      {z.area} m² • {z.coating.toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => setZones(zones.filter((x) => x.id !== z.id))}
                    className="text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 bg-slate-50 p-2 rounded">
                  <span>Décaissement: {z.excavationDepth}cm</span>
                  <span>Fondation: {z.foundationThick}cm</span>
                  <span>Lit pose: {z.beddingThick}cm</span>
                  <span>Dalle: {z.slabThick}cm</span>
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
                <option value="terrace">Terrasse</option>
                <option value="driveway">Allée Voiture</option>
                <option value="path">Chemin Piéton</option>
                <option value="other">Autre</option>
              </select>
              <input
                type="number"
                placeholder="Surface m²"
                value={newZoneArea}
                onChange={(e) => setNewZoneArea(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />
            </div>

            <input
              type="text"
              placeholder="Nom (ex: Terrasse Sud)"
              value={newZoneLabel}
              onChange={(e) => setNewZoneLabel(e.target.value)}
              className="w-full p-2 text-xs border rounded bg-white text-slate-900 mb-2"
            />

            <button
              onClick={addZone}
              className="w-full py-2 bg-blue-600 text-white font-bold rounded text-xs flex justify-center items-center"
            >
              <Plus size={14} className="mr-1" /> Ajouter Zone
            </button>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold mt-2"
          >
            Suivant
          </button>
        </div>
      )}

      {/* STEP 2: CLOTURES / MURS / PORTAIL / PISCINE */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Fence size={16} className="mr-2 shrink-0 mt-0.5" />
            Délimitation, Maçonnerie Paysagère et Piscine.
          </div>

          <div className="space-y-2">
            {/* Walls */}
            {walls.map((w) => (
              <div
                key={w.id}
                className="bg-white border rounded p-2 flex justify-between items-center"
              >
                <span className="text-sm font-bold">
                  {w.label} ({w.length} ml • {w.height} m)
                </span>
                <button
                  onClick={() => setWalls(walls.filter((x) => x.id !== w.id))}
                  className="text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {/* Items */}
            {items.map((it) => (
              <div
                key={it.id}
                className="bg-white border rounded p-2 flex justify-between items-center"
              >
                <span className="text-sm font-bold">
                  {it.label} (
                  {it.category === "fence"
                    ? `${it.quantity} ml`
                    : `${it.quantity} u`}
                  )
                </span>
                <button
                  onClick={() => setItems(items.filter((x) => x.id !== it.id))}
                  className="text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Wall */}
          <div className="bg-white p-3 rounded border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
              Mur / Muret
            </h4>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                placeholder="L (ml)"
                value={wallLen}
                onChange={(e) => setWallLen(e.target.value)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder="H (m)"
                value={wallHeight}
                onChange={(e) => setWallHeight(e.target.value)}
                className="w-20 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <input
                type="number"
                placeholder="Ép (cm)"
                value={wallWidth}
                onChange={(e) => setWallWidth(e.target.value)}
                className="w-20 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <button
                onClick={addWall}
                className="bg-blue-100 text-blue-700 px-3 rounded font-bold text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Add Fence */}
          <div className="bg-white p-3 rounded border border-slate-200">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
              Clôture
            </h4>
            <div className="flex gap-2 mb-2">
              <select
                value={fenceType}
                onChange={(e) => setFenceType(e.target.value)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              >
                <option value="mesh_rigid">Rigide</option>
                <option value="mesh_soft">Souple</option>
                <option value="wood">Bois</option>
              </select>
              <input
                type="number"
                placeholder="L (ml)"
                value={fenceLen}
                onChange={(e) => setFenceLen(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <button
                onClick={addFence}
                className="bg-blue-100 text-blue-700 px-3 rounded font-bold text-xs"
              >
                +
              </button>
            </div>
          </div>

          {/* Gate/Pool */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={addGate}
              className="py-2 border border-dashed border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              + Portail
            </button>
            <button
              onClick={addPool}
              className="py-2 border border-dashed border-slate-300 rounded text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              + Piscine
            </button>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RESEAUX */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Pickaxe size={16} className="mr-2 shrink-0 mt-0.5" />
            VRD : Eau, Électricité, Évacuation. Calcul tranchée inclus.
          </div>

          <div className="space-y-2">
            {networks.map((n) => (
              <div
                key={n.id}
                className="bg-white border rounded p-2 flex justify-between items-center"
              >
                <div>
                  <span className="text-sm font-bold block">{n.label}</span>
                  <span className="text-xs text-slate-500">
                    {n.length}ml • {n.trench ? "Tranchée" : "Sol"}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setNetworks(networks.filter((x) => x.id !== n.id))
                  }
                  className="text-red-400"
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
                <option value="elec">Élec (Gaine TPC)</option>
                <option value="water">Eau (PEHD)</option>
                <option value="sewer">Tout-à-l'égout</option>
                <option value="drain">Drainage Pluvial</option>
                <option value="light">Eclairage Jardin</option>
              </select>
              <input
                type="number"
                placeholder="Long. (ml)"
                value={netLen}
                onChange={(e) => setNetLen(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <button
                onClick={addNetwork}
                className="bg-blue-600 text-white px-3 rounded font-bold text-xs"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: JARDIN */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <Sprout size={16} className="mr-2 shrink-0 mt-0.5" />
            Végétaux, Gazon et Arrosage.
          </div>

          <div className="space-y-2">
            {gardenItems.map((g) => (
              <div
                key={g.id}
                className="bg-white border rounded p-2 flex justify-between items-center"
              >
                <span className="text-sm font-bold">
                  {g.quantity} {g.unit} {g.label}
                </span>
                <button
                  onClick={() =>
                    setGardenItems(gardenItems.filter((x) => x.id !== g.id))
                  }
                  className="text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Add LAWN */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center">
              <Sun size={14} className="mr-1" /> Gazon
            </h4>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Surface m²"
                value={lawnArea}
                onChange={(e) => setLawnArea(e.target.value)}
                className="w-24 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <button
                onClick={() => {
                  addGarden(
                    "lawn",
                    "LAWN_ROLL_M2",
                    "Gazon Rouleau",
                    parseFloat(lawnArea),
                    Unit.M2
                  );
                  setLawnArea("");
                }}
                className="flex-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded border border-emerald-200"
              >
                Rouleau
              </button>
              <button
                onClick={() => {
                  const area = parseFloat(lawnArea) || 0;
                  const kg = area * 0.04;
                  addGarden(
                    "lawn",
                    "LAWN_SEED_KG",
                    "Semence Gazon",
                    parseFloat(kg.toFixed(1)),
                    Unit.KG
                  );
                  setLawnArea("");
                }}
                className="flex-1 bg-slate-50 text-slate-700 font-bold text-xs rounded border border-slate-200"
              >
                Semis
              </button>
            </div>
          </div>

          {/* Add PLANTS */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-emerald-600 uppercase mb-2 flex items-center">
              <Flower2 size={14} className="mr-1" /> Plantation
            </h4>
            <div className="flex gap-2">
              <select
                value={plantType}
                onChange={(e) => setPlantType(e.target.value)}
                className="flex-1 p-2 text-xs border rounded bg-white text-slate-900"
              >
                <option value="PLANT_UNIT">Plante / Vivace</option>
                <option value="SHRUB_UNIT">Arbuste</option>
                <option value="HEDGE_PLANT_UNIT">Haie</option>
                <option value="TREE_UNIT">Arbre</option>
              </select>
              <input
                type="number"
                placeholder="Qté"
                value={plantCount}
                onChange={(e) => setPlantCount(e.target.value)}
                className="w-16 p-2 text-xs border rounded bg-white text-slate-900"
              />
              <button
                onClick={() => {
                  const q = parseFloat(plantCount) || 0;
                  const labelMap: Record<string, string> = {
                    PLANT_UNIT: "Plante",
                    SHRUB_UNIT: "Arbuste",
                    HEDGE_PLANT_UNIT: "Haie",
                    TREE_UNIT: "Arbre",
                  };
                  addGarden(
                    "planting",
                    plantType,
                    labelMap[plantType] || "Plant",
                    q,
                    Unit.PIECE
                  );
                  setPlantCount("");
                }}
                className="bg-emerald-600 text-white px-3 rounded font-bold text-xs"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button
              onClick={() => setStep(5)}
              className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: DEVIS */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg flex items-start">
            <CircleDollarSign size={16} className="mr-2 shrink-0 mt-0.5" />
            Récapitulatif. Les prix peuvent être modifiés pour ce calcul.
          </div>

          <PriceEditor />

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-800">
              Coût Total Estimé
            </h3>
            <div className="text-3xl font-bold text-blue-600 mb-6">
              {calculationData.totalCost.toFixed(2)} €
            </div>

            <div className="space-y-2 text-sm">
              {calculationData.materials.map((m: any) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center py-1 border-b border-slate-50"
                >
                  <div>
                    <span className="block font-medium text-slate-700">
                      {m.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {m.quantity} {m.unit} x {Number(m.unitPrice).toFixed(2)}€
                    </span>
                  </div>
                  <span className="font-bold text-slate-600">
                    {Number(m.totalPrice).toFixed(2)}€
                  </span>
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
            <button
              onClick={() => setStep(4)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Retour
            </button>
            <button className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex justify-center items-center">
              <Check size={18} className="mr-2" /> Terminé
            </button>
          </div>
        </div>
      )}
    </div>
  );
};