// src/services/materialsService.ts
import { DEFAULT_PRICES, getMaterialMetadata } from "../constants";
import type {
  CustomMaterial,
  TaxSettings,
  LaborSettings,
  AppDataBackup,
  UsageStats,
} from "../types";

/**
 * ✅ MAJ BatiCalc -> BatiQuant
 * - Nouvelles clés localStorage : batiquant_*
 * - Compat lecture anciennes clés : baticalc_*
 * - Migration automatique (copie) si nouvelles vides
 * - Event global "batiquant:materials_changed"
 */

const BRAND_NEW = "batiquant";
const BRAND_OLD = "baticalc";

const STORAGE_KEYS_NEW = {
  PRICES: `${BRAND_NEW}_prices`,
  CUSTOM_MATS: `${BRAND_NEW}_custom_materials`,
  MAPPINGS: `${BRAND_NEW}_mappings`,
  FAVORITES: `${BRAND_NEW}_favorites`,
  USAGE: `${BRAND_NEW}_usage`,
  TAX: `${BRAND_NEW}_tax_settings`,
  LABOR: `${BRAND_NEW}_labor_settings`,
};

const STORAGE_KEYS_OLD = {
  PRICES: `${BRAND_OLD}_prices`,
  CUSTOM_MATS: `${BRAND_OLD}_custom_materials`,
  MAPPINGS: `${BRAND_OLD}_mappings`,
  FAVORITES: `${BRAND_OLD}_favorites`,
  USAGE: `${BRAND_OLD}_usage`,
  TAX: `${BRAND_OLD}_tax_settings`,
  LABOR: `${BRAND_OLD}_labor_settings`,
};

const MATERIALS_EVENT = "batiquant:materials_changed";

type MaterialsEventDetail = {
  reason:
    | "price_override"
    | "mapping"
    | "custom_material"
    | "favorite"
    | "usage"
    | "tax"
    | "labor"
    | "import";
  key?: string; // systemKey
};

const emitMaterialsChanged = (detail: MaterialsEventDetail) => {
  try {
    window.dispatchEvent(new CustomEvent(MATERIALS_EVENT, { detail }));
  } catch {
    // noop
  }
};

export const onMaterialsChanged = (
  handler: (detail: MaterialsEventDetail) => void
) => {
  const fn = (e: Event) => {
    const ce = e as CustomEvent<MaterialsEventDetail>;
    handler(ce.detail);
  };
  window.addEventListener(MATERIALS_EVENT, fn);
  return () => window.removeEventListener(MATERIALS_EVENT, fn);
};

// --- JSON helpers ---
const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const getJSON = <T>(keyNew: string, keyOld: string, defaultVal: T): T => {
  const newRaw = localStorage.getItem(keyNew);
  if (newRaw != null) return safeParse<T>(newRaw, defaultVal);

  const oldRaw = localStorage.getItem(keyOld);
  if (oldRaw != null) return safeParse<T>(oldRaw, defaultVal);

  return defaultVal;
};

const setJSON = (keyNew: string, data: any) => {
  localStorage.setItem(keyNew, JSON.stringify(data));
};

// --- One-time migration ---
const migrateOnce = (() => {
  let done = false;
  return () => {
    if (done) return;
    done = true;

    const pairs: Array<[string, string]> = [
      [STORAGE_KEYS_NEW.PRICES, STORAGE_KEYS_OLD.PRICES],
      [STORAGE_KEYS_NEW.CUSTOM_MATS, STORAGE_KEYS_OLD.CUSTOM_MATS],
      [STORAGE_KEYS_NEW.MAPPINGS, STORAGE_KEYS_OLD.MAPPINGS],
      [STORAGE_KEYS_NEW.FAVORITES, STORAGE_KEYS_OLD.FAVORITES],
      [STORAGE_KEYS_NEW.USAGE, STORAGE_KEYS_OLD.USAGE],
      [STORAGE_KEYS_NEW.TAX, STORAGE_KEYS_OLD.TAX],
      [STORAGE_KEYS_NEW.LABOR, STORAGE_KEYS_OLD.LABOR],
    ];

    pairs.forEach(([kNew, kOld]) => {
      const hasNew = localStorage.getItem(kNew) != null;
      const oldVal = localStorage.getItem(kOld);
      if (!hasNew && oldVal != null) {
        localStorage.setItem(kNew, oldVal);
      }
    });
  };
})();

// --- SETTINGS ---
export const getTaxSettings = (): TaxSettings => {
  migrateOnce();
  return getJSON<TaxSettings>(STORAGE_KEYS_NEW.TAX, STORAGE_KEYS_OLD.TAX, {
    mode: "HT",
    vatRate: 20,
  });
};

export const setTaxSettings = (s: TaxSettings) => {
  migrateOnce();
  setJSON(STORAGE_KEYS_NEW.TAX, s);
  emitMaterialsChanged({ reason: "tax" });
};

export const getLaborSettings = (): LaborSettings => {
  migrateOnce();
  return getJSON<LaborSettings>(
    STORAGE_KEYS_NEW.LABOR,
    STORAGE_KEYS_OLD.LABOR,
    { enabled: false, globalHourlyRate: 45 }
  );
};

export const setLaborSettings = (s: LaborSettings) => {
  migrateOnce();
  setJSON(STORAGE_KEYS_NEW.LABOR, s);
  emitMaterialsChanged({ reason: "labor" });
};

// --- CORE PRICING ENGINE ---
const getUnitPriceHT = (systemKey: string): number => {
  if (!systemKey) return 0;

  // mapping
  const mappings = getJSON<Record<string, string>>(
    STORAGE_KEYS_NEW.MAPPINGS,
    STORAGE_KEYS_OLD.MAPPINGS,
    {}
  );
  const customId = mappings[systemKey];

  if (customId) {
    const customs = getJSON<CustomMaterial[]>(
      STORAGE_KEYS_NEW.CUSTOM_MATS,
      STORAGE_KEYS_OLD.CUSTOM_MATS,
      []
    );
    const customMat = customs.find((m) => m.id === customId);

    if (customMat) return customMat.price;

    // mapping cassé -> fallback override puis default
    const overrides = getJSON<Record<string, number>>(
      STORAGE_KEYS_NEW.PRICES,
      STORAGE_KEYS_OLD.PRICES,
      {}
    );
    if (overrides[systemKey] !== undefined) return overrides[systemKey];
    return (DEFAULT_PRICES as any)[systemKey] || 0;
  }

  // override
  const overrides = getJSON<Record<string, number>>(
    STORAGE_KEYS_NEW.PRICES,
    STORAGE_KEYS_OLD.PRICES,
    {}
  );
  if (overrides[systemKey] !== undefined) return overrides[systemKey];

  // default
  return (DEFAULT_PRICES as any)[systemKey] || 0;
};

export const getUnitPrice = (systemKey: string): number => {
  migrateOnce();
  if (!systemKey) return 0;
  const baseHT = getUnitPriceHT(systemKey);
  const tax = getTaxSettings();
  return tax.mode === "TTC" ? baseHT * (1 + tax.vatRate / 100) : baseHT;
};

// --- USAGE ---
export const incrementUsage = (systemKey: string) => {
  migrateOnce();
  const usage = getJSON<Record<string, UsageStats>>(
    STORAGE_KEYS_NEW.USAGE,
    STORAGE_KEYS_OLD.USAGE,
    {}
  );
  const current = usage[systemKey] || { count: 0, lastUsedAt: 0 };
  usage[systemKey] = { count: current.count + 1, lastUsedAt: Date.now() };
  setJSON(STORAGE_KEYS_NEW.USAGE, usage);
  emitMaterialsChanged({ reason: "usage", key: systemKey });
};

export const getMostUsedMaterials = (limit = 10): string[] => {
  migrateOnce();
  const usage = getJSON<Record<string, UsageStats>>(
    STORAGE_KEYS_NEW.USAGE,
    STORAGE_KEYS_OLD.USAGE,
    {}
  );
  return Object.entries(usage)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, limit)
    .map(([key]) => key);
};

// --- FAVORITES ---
export const getFavorites = (): string[] => {
  migrateOnce();
  return getJSON<string[]>(
    STORAGE_KEYS_NEW.FAVORITES,
    STORAGE_KEYS_OLD.FAVORITES,
    []
  );
};

export const toggleFavorite = (systemKey: string) => {
  migrateOnce();
  const favs = getFavorites();
  const next = favs.includes(systemKey)
    ? favs.filter((k) => k !== systemKey)
    : [...favs, systemKey];
  setJSON(STORAGE_KEYS_NEW.FAVORITES, next);
  emitMaterialsChanged({ reason: "favorite", key: systemKey });
};

// --- CUSTOM MATERIALS / MAPPINGS ---
export const getCustomMaterials = (): CustomMaterial[] => {
  migrateOnce();
  return getJSON<CustomMaterial[]>(
    STORAGE_KEYS_NEW.CUSTOM_MATS,
    STORAGE_KEYS_OLD.CUSTOM_MATS,
    []
  );
};

export const saveCustomMaterial = (mat: CustomMaterial) => {
  migrateOnce();
  const list = getCustomMaterials();
  const idx = list.findIndex((m) => m.id === mat.id);
  if (idx >= 0) list[idx] = mat;
  else list.push(mat);
  setJSON(STORAGE_KEYS_NEW.CUSTOM_MATS, list);
  emitMaterialsChanged({ reason: "custom_material" });
};

export const deleteCustomMaterial = (id: string) => {
  migrateOnce();
  const list = getCustomMaterials().filter((m) => m.id !== id);
  setJSON(STORAGE_KEYS_NEW.CUSTOM_MATS, list);

  const mappings = getJSON<Record<string, string>>(
    STORAGE_KEYS_NEW.MAPPINGS,
    STORAGE_KEYS_OLD.MAPPINGS,
    {}
  );
  const newMappings: Record<string, string> = {};
  Object.entries(mappings).forEach(([k, v]) => {
    if (v !== id) newMappings[k] = v;
  });
  setJSON(STORAGE_KEYS_NEW.MAPPINGS, newMappings);

  emitMaterialsChanged({ reason: "custom_material" });
};

export const getMappings = () => {
  migrateOnce();
  return getJSON<Record<string, string>>(
    STORAGE_KEYS_NEW.MAPPINGS,
    STORAGE_KEYS_OLD.MAPPINGS,
    {}
  );
};

export const setMapping = (systemKey: string, customId: string | null) => {
  migrateOnce();
  const mappings = getMappings();
  if (customId) mappings[systemKey] = customId;
  else delete mappings[systemKey];
  setJSON(STORAGE_KEYS_NEW.MAPPINGS, mappings);
  emitMaterialsChanged({ reason: "mapping", key: systemKey });
};

// --- PRICE OVERRIDES ---
export const saveCustomPrice = (key: string, price: number) => {
  migrateOnce();
  const overrides = getJSON<Record<string, number>>(
    STORAGE_KEYS_NEW.PRICES,
    STORAGE_KEYS_OLD.PRICES,
    {}
  );
  overrides[key] = price;
  setJSON(STORAGE_KEYS_NEW.PRICES, overrides);
  emitMaterialsChanged({ reason: "price_override", key });
};

export const resetCustomPrice = (key: string) => {
  migrateOnce();
  const overrides = getJSON<Record<string, number>>(
    STORAGE_KEYS_NEW.PRICES,
    STORAGE_KEYS_OLD.PRICES,
    {}
  );
  delete overrides[key];
  setJSON(STORAGE_KEYS_NEW.PRICES, overrides);
  emitMaterialsChanged({ reason: "price_override", key });
};

// --- IMPORT / EXPORT ---
export const exportAppData = (): string => {
  migrateOnce();
  const data: AppDataBackup = {
    version: 1,
    exportedAt: Date.now(),
    customPrices: getJSON(STORAGE_KEYS_NEW.PRICES, STORAGE_KEYS_OLD.PRICES, {}),
    customMaterials: getCustomMaterials(),
    favorites: getFavorites(),
    usage: getJSON(STORAGE_KEYS_NEW.USAGE, STORAGE_KEYS_OLD.USAGE, {}),
    mappings: getMappings(),
    taxSettings: getTaxSettings(),
    laborSettings: getLaborSettings(),
  };
  return JSON.stringify(data, null, 2);
};

export const importAppData = (
  jsonString: string,
  mode: "merge" | "replace"
): boolean => {
  migrateOnce();
  try {
    const data: AppDataBackup = JSON.parse(jsonString);
    if (!data.version) return false;

    if (mode === "replace") {
      setJSON(STORAGE_KEYS_NEW.PRICES, data.customPrices || {});
      setJSON(STORAGE_KEYS_NEW.CUSTOM_MATS, data.customMaterials || []);
      setJSON(STORAGE_KEYS_NEW.FAVORITES, data.favorites || []);
      setJSON(STORAGE_KEYS_NEW.USAGE, data.usage || {});
      setJSON(STORAGE_KEYS_NEW.MAPPINGS, data.mappings || {});
      setJSON(STORAGE_KEYS_NEW.TAX, data.taxSettings || getTaxSettings());
      setJSON(STORAGE_KEYS_NEW.LABOR, data.laborSettings || getLaborSettings());
    } else {
      const currentCustoms = getCustomMaterials();
      const mergedCustoms = [
        ...currentCustoms,
        ...(data.customMaterials || []).filter(
          (m) => !currentCustoms.find((c) => c.id === m.id)
        ),
      ];
      setJSON(STORAGE_KEYS_NEW.CUSTOM_MATS, mergedCustoms);

      setJSON(STORAGE_KEYS_NEW.PRICES, {
        ...getJSON(STORAGE_KEYS_NEW.PRICES, STORAGE_KEYS_OLD.PRICES, {}),
        ...(data.customPrices || {}),
      });

      setJSON(STORAGE_KEYS_NEW.MAPPINGS, {
        ...getJSON(STORAGE_KEYS_NEW.MAPPINGS, STORAGE_KEYS_OLD.MAPPINGS, {}),
        ...(data.mappings || {}),
      });

      const currentFavs = getFavorites();
      const newFavs = Array.from(new Set([...currentFavs, ...(data.favorites || [])]));
      setJSON(STORAGE_KEYS_NEW.FAVORITES, newFavs);
    }

    emitMaterialsChanged({ reason: "import" });
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};

// --- LIST FOR UI ---
export const getSystemMaterialsList = () => {
  migrateOnce();
  const overrides = getJSON<Record<string, number>>(
    STORAGE_KEYS_NEW.PRICES,
    STORAGE_KEYS_OLD.PRICES,
    {}
  );
  const mappings = getMappings();
  const tax = getTaxSettings();
  const customs = getCustomMaterials();

    const keys = Object.keys(DEFAULT_PRICES).sort();

  return keys.map((key) => {
        const meta = getMaterialMetadata(key);
    const safeLabel = meta.label;
    const safeCategory = meta.category;
    const safeUnit = meta.unit;
    const defaultPrice = (DEFAULT_PRICES as any)[key] as number;

    const userOverride = overrides[key];
    const mappedId = mappings[key];
    const mappedMaterial = mappedId ? customs.find((c) => c.id === mappedId) : null;

    let priceHT = defaultPrice;
    if (mappedMaterial) priceHT = mappedMaterial.price;
    else if (userOverride !== undefined) priceHT = userOverride;

    const displayPrice = tax.mode === "TTC" ? priceHT * (1 + tax.vatRate / 100) : priceHT;

    return {
      key,
            label: safeLabel,
      category: safeCategory,
      unit: safeUnit,
      defaultPrice,
      displayPrice,
      priceHT,
      isModified: userOverride !== undefined,
      isMapped: !!mappedId,
      mappedLabel: mappedMaterial?.label,
    };
  });
};