import { DEFAULT_PRICES, getMaterialMetadata } from "../constants";
import type {
  CustomMaterial,
  TaxSettings,
  LaborSettings,
  AppDataBackup,
  UsageStats,
  Project,
  HouseProject,
  UserSettings,
  CompanyProfile,
  QuoteDocument,
  InvoiceDocument,
} from "../types";
import {
  canUsePersistentStorage,
  markNamespaceMigrated,
  migrateLegacyKey,
  readJson,
  writeJson,
} from "./persistentStorage";
import {
  getProjects,
  getHouseProjects,
  getSettings,
  replaceHouseProjects,
  replaceProjects,
  replaceSettings,
} from "./storage";
import {
  getCompanyProfile,
  getDocumentCounters,
  getInvoices,
  getQuotes,
  replaceCompanyProfile,
  replaceDocumentCounters,
  replaceInvoices,
  replaceQuotes,
} from "./documentsStorage";

const BRAND_NEW = "batiquant";
const BRAND_OLD = "baticalc";
const STORAGE_NAMESPACE = "materials";

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
  key?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const emitMaterialsChanged = (detail: MaterialsEventDetail) => {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(MATERIALS_EVENT, { detail }));
  } catch {
    // noop
  }
};

export const onMaterialsChanged = (handler: (detail: MaterialsEventDetail) => void) => {
  if (typeof window === "undefined") return () => {};

  const fn = (e: Event) => {
    const ce = e as CustomEvent<MaterialsEventDetail>;
    handler(ce.detail);
  };

  window.addEventListener(MATERIALS_EVENT, fn);
  return () => window.removeEventListener(MATERIALS_EVENT, fn);
};

const sanitizePriceMap = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, amount]) => typeof key === "string" && typeof amount === "number" && Number.isFinite(amount)
    )
  ) as Record<string, number>;
};

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)));
};

const sanitizeMappings = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key, customId]) => typeof key === "string" && typeof customId === "string" && customId.trim().length > 0
    )
  ) as Record<string, string>;
};

const sanitizeUsage = (value: unknown): Record<string, UsageStats> => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, stats]) => {
        if (!isRecord(stats)) return null;
        const count = typeof stats.count === "number" && Number.isFinite(stats.count) ? Math.max(0, stats.count) : 0;
        const lastUsedAt =
          typeof stats.lastUsedAt === "number" && Number.isFinite(stats.lastUsedAt) ? stats.lastUsedAt : 0;
        return [key, { count, lastUsedAt }] as const;
      })
      .filter((entry): entry is readonly [string, UsageStats] => !!entry)
  );
};

const sanitizeCustomMaterials = (value: unknown): CustomMaterial[] => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (material): material is CustomMaterial =>
      isRecord(material) &&
      typeof material.id === "string" &&
      typeof material.label === "string" &&
      typeof material.category === "string" &&
      typeof material.unit === "string" &&
      typeof material.price === "number" &&
      Number.isFinite(material.price) &&
      typeof material.createdAt === "number" &&
      Number.isFinite(material.createdAt)
  );
};

const sanitizeTaxSettings = (value: unknown): TaxSettings => {
  if (!isRecord(value)) {
    return { mode: "HT", vatRate: 20 };
  }

  const mode = value.mode === "HT" || value.mode === "TTC" ? value.mode : "HT";
  const vatRate = typeof value.vatRate === "number" && Number.isFinite(value.vatRate) ? value.vatRate : 20;
  return { mode, vatRate };
};

const sanitizeLaborSettings = (value: unknown): LaborSettings => {
  if (!isRecord(value)) {
    return { enabled: false, globalHourlyRate: 45 };
  }

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : false,
    globalHourlyRate:
      typeof value.globalHourlyRate === "number" && Number.isFinite(value.globalHourlyRate)
        ? value.globalHourlyRate
        : 45,
  };
};

let didMigrate = false;
const migrateOnce = () => {
  if (didMigrate) return;
  didMigrate = true;

  if (!canUsePersistentStorage()) return;

  const pairs: Array<[string, string]> = [
    [STORAGE_KEYS_NEW.PRICES, STORAGE_KEYS_OLD.PRICES],
    [STORAGE_KEYS_NEW.CUSTOM_MATS, STORAGE_KEYS_OLD.CUSTOM_MATS],
    [STORAGE_KEYS_NEW.MAPPINGS, STORAGE_KEYS_OLD.MAPPINGS],
    [STORAGE_KEYS_NEW.FAVORITES, STORAGE_KEYS_OLD.FAVORITES],
    [STORAGE_KEYS_NEW.USAGE, STORAGE_KEYS_OLD.USAGE],
    [STORAGE_KEYS_NEW.TAX, STORAGE_KEYS_OLD.TAX],
    [STORAGE_KEYS_NEW.LABOR, STORAGE_KEYS_OLD.LABOR],
  ];

  pairs.forEach(([newKey, oldKey]) => {
    migrateLegacyKey(newKey, [oldKey]);
  });

  markNamespaceMigrated(STORAGE_NAMESPACE);
};

const readPriceMap = (): Record<string, number> => sanitizePriceMap(readJson<unknown>(STORAGE_KEYS_NEW.PRICES, {}));
const readCustomMaterials = (): CustomMaterial[] => sanitizeCustomMaterials(readJson<unknown>(STORAGE_KEYS_NEW.CUSTOM_MATS, []));
const readMappings = (): Record<string, string> => sanitizeMappings(readJson<unknown>(STORAGE_KEYS_NEW.MAPPINGS, {}));
const readFavorites = (): string[] => sanitizeStringArray(readJson<unknown>(STORAGE_KEYS_NEW.FAVORITES, []));
const readUsage = (): Record<string, UsageStats> => sanitizeUsage(readJson<unknown>(STORAGE_KEYS_NEW.USAGE, {}));
const readTaxSettings = (): TaxSettings => sanitizeTaxSettings(readJson<unknown>(STORAGE_KEYS_NEW.TAX, { mode: "HT", vatRate: 20 }));
const readLaborSettings = (): LaborSettings =>
  sanitizeLaborSettings(readJson<unknown>(STORAGE_KEYS_NEW.LABOR, { enabled: false, globalHourlyRate: 45 }));

const setPriceMap = (value: Record<string, number>) => {
  writeJson(STORAGE_KEYS_NEW.PRICES, sanitizePriceMap(value));
};

const setCustomMaterials = (value: CustomMaterial[]) => {
  writeJson(STORAGE_KEYS_NEW.CUSTOM_MATS, sanitizeCustomMaterials(value));
};

const setMappings = (value: Record<string, string>) => {
  writeJson(STORAGE_KEYS_NEW.MAPPINGS, sanitizeMappings(value));
};

const setFavorites = (value: string[]) => {
  writeJson(STORAGE_KEYS_NEW.FAVORITES, sanitizeStringArray(value));
};

const setUsage = (value: Record<string, UsageStats>) => {
  writeJson(STORAGE_KEYS_NEW.USAGE, sanitizeUsage(value));
};

const setTaxSettingsSafe = (value: TaxSettings) => {
  writeJson(STORAGE_KEYS_NEW.TAX, sanitizeTaxSettings(value));
};

const setLaborSettingsSafe = (value: LaborSettings) => {
  writeJson(STORAGE_KEYS_NEW.LABOR, sanitizeLaborSettings(value));
};

export const getTaxSettings = (): TaxSettings => {
  migrateOnce();
  return readTaxSettings();
};

export const setTaxSettings = (settings: TaxSettings) => {
  migrateOnce();
  setTaxSettingsSafe(settings);
  emitMaterialsChanged({ reason: "tax" });
};

export const getLaborSettings = (): LaborSettings => {
  migrateOnce();
  return readLaborSettings();
};

export const setLaborSettings = (settings: LaborSettings) => {
  migrateOnce();
  setLaborSettingsSafe(settings);
  emitMaterialsChanged({ reason: "labor" });
};

const getUnitPriceHT = (systemKey: string): number => {
  if (!systemKey) return 0;

  const mappings = readMappings();
  const customId = mappings[systemKey];

  if (customId) {
    const customMat = readCustomMaterials().find((material) => material.id === customId);
    if (customMat) return customMat.price;

    const overrides = readPriceMap();
    if (overrides[systemKey] !== undefined) return overrides[systemKey];
    return (DEFAULT_PRICES as Record<string, number>)[systemKey] || 0;
  }

  const overrides = readPriceMap();
  if (overrides[systemKey] !== undefined) return overrides[systemKey];

  return (DEFAULT_PRICES as Record<string, number>)[systemKey] || 0;
};

export const getUnitPrice = (systemKey: string): number => {
  migrateOnce();
  if (!systemKey) return 0;
  const baseHT = getUnitPriceHT(systemKey);
  const tax = getTaxSettings();
  return tax.mode === "TTC" ? baseHT * (1 + tax.vatRate / 100) : baseHT;
};

export const incrementUsage = (systemKey: string) => {
  migrateOnce();
  if (!systemKey) return;

  const usage = readUsage();
  const current = usage[systemKey] || { count: 0, lastUsedAt: 0 };
  usage[systemKey] = { count: current.count + 1, lastUsedAt: Date.now() };
  setUsage(usage);
  emitMaterialsChanged({ reason: "usage", key: systemKey });
};

export const getMostUsedMaterials = (limit = 10): string[] => {
  migrateOnce();
  const usage = readUsage();
  return Object.entries(usage)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, limit)
    .map(([key]) => key);
};

export const getFavorites = (): string[] => {
  migrateOnce();
  return readFavorites();
};

export const toggleFavorite = (systemKey: string) => {
  migrateOnce();
  if (!systemKey) return;

  const favorites = getFavorites();
  const next = favorites.includes(systemKey)
    ? favorites.filter((key) => key !== systemKey)
    : [...favorites, systemKey];

  setFavorites(next);
  emitMaterialsChanged({ reason: "favorite", key: systemKey });
};

export const getCustomMaterials = (): CustomMaterial[] => {
  migrateOnce();
  return readCustomMaterials();
};

export const saveCustomMaterial = (material: CustomMaterial) => {
  migrateOnce();
  const materials = getCustomMaterials();
  const idx = materials.findIndex((item) => item.id === material.id);
  if (idx >= 0) materials[idx] = material;
  else materials.push(material);
  setCustomMaterials(materials);
  emitMaterialsChanged({ reason: "custom_material" });
};

export const deleteCustomMaterial = (id: string) => {
  migrateOnce();
  const materials = getCustomMaterials().filter((material) => material.id !== id);
  setCustomMaterials(materials);

  const mappings = readMappings();
  const nextMappings: Record<string, string> = {};
  Object.entries(mappings).forEach(([systemKey, customId]) => {
    if (customId !== id) nextMappings[systemKey] = customId;
  });
  setMappings(nextMappings);

  emitMaterialsChanged({ reason: "custom_material" });
};

export const getMappings = (): Record<string, string> => {
  migrateOnce();
  return readMappings();
};

export const setMapping = (systemKey: string, customId: string | null) => {
  migrateOnce();
  const mappings = getMappings();
  if (customId) mappings[systemKey] = customId;
  else delete mappings[systemKey];
  setMappings(mappings);
  emitMaterialsChanged({ reason: "mapping", key: systemKey });
};

export const saveCustomPrice = (key: string, price: number) => {
  migrateOnce();
  if (!key || !Number.isFinite(price)) return;
  const overrides = readPriceMap();
  overrides[key] = price;
  setPriceMap(overrides);
  emitMaterialsChanged({ reason: "price_override", key });
};

export const resetCustomPrice = (key: string) => {
  migrateOnce();
  const overrides = readPriceMap();
  delete overrides[key];
  setPriceMap(overrides);
  emitMaterialsChanged({ reason: "price_override", key });
};

const mergeById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
  const map = new Map<string, T>();
  current.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
};

const sanitizeBackupProjects = (value: unknown): Project[] =>
  Array.isArray(value) ? (value.filter((item): item is Project => isRecord(item) && typeof item.id === "string") as Project[]) : [];

const sanitizeBackupHouseProjects = (value: unknown): HouseProject[] =>
  Array.isArray(value)
    ? (value.filter((item): item is HouseProject => isRecord(item) && typeof item.id === "string") as HouseProject[])
    : [];

const sanitizeBackupSettings = (value: unknown): UserSettings | undefined =>
  isRecord(value)
    ? {
        currency: typeof value.currency === "string" && value.currency.trim() ? value.currency : "€",
        taxRate: typeof value.taxRate === "number" && Number.isFinite(value.taxRate) ? value.taxRate : 20,
        isPro: typeof value.isPro === "boolean" ? value.isPro : false,
      }
    : undefined;

const sanitizeBackupCompanyProfile = (value: unknown): CompanyProfile | null | undefined => {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  if (typeof value.name !== "string") return undefined;

  return {
    name: typeof value.name === "string" ? value.name : "",
    address: typeof value.address === "string" ? value.address : "",
    city: typeof value.city === "string" ? value.city : "",
    zip: typeof value.zip === "string" ? value.zip : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    email: typeof value.email === "string" ? value.email : "",
    siret: typeof value.siret === "string" ? value.siret : "",
    tvaNumber: typeof value.tvaNumber === "string" ? value.tvaNumber : undefined,
    logoUrl: typeof value.logoUrl === "string" ? value.logoUrl : undefined,
    footerNote: typeof value.footerNote === "string" ? value.footerNote : undefined,
    terms: typeof value.terms === "string" ? value.terms : undefined,
  };
};

const sanitizeBackupQuotes = (value: unknown): QuoteDocument[] =>
  Array.isArray(value)
    ? (value.filter(
        (item): item is QuoteDocument =>
          isRecord(item) && typeof item.id === "string" && typeof item.number === "string" && item.type === "quote"
      ) as QuoteDocument[])
    : [];

const sanitizeBackupInvoices = (value: unknown): InvoiceDocument[] =>
  Array.isArray(value)
    ? (value.filter(
        (item): item is InvoiceDocument =>
          isRecord(item) && typeof item.id === "string" && typeof item.number === "string" && item.type === "invoice"
      ) as InvoiceDocument[])
    : [];

const sanitizeBackupCounters = (
  value: unknown
): { quote: number; invoice: number; year: number } | undefined => {
  if (!isRecord(value)) return undefined;
  const currentYear = new Date().getFullYear();
  return {
    quote: typeof value.quote === "number" && Number.isFinite(value.quote) ? Math.max(0, value.quote) : 0,
    invoice: typeof value.invoice === "number" && Number.isFinite(value.invoice) ? Math.max(0, value.invoice) : 0,
    year: typeof value.year === "number" && Number.isFinite(value.year) ? value.year : currentYear,
  };
};

export const exportAppData = (): string => {
  migrateOnce();

  const data: AppDataBackup = {
    version: 2,
    exportedAt: Date.now(),
    customPrices: readPriceMap(),
    customMaterials: getCustomMaterials(),
    favorites: getFavorites(),
    usage: readUsage(),
    mappings: getMappings(),
    taxSettings: getTaxSettings(),
    laborSettings: getLaborSettings(),
    projects: getProjects(),
    houseProjects: getHouseProjects(),
    userSettings: getSettings(),
    companyProfile: getCompanyProfile(),
    quotes: getQuotes(),
    invoices: getInvoices(),
    docCounters: getDocumentCounters(),
  };

  return JSON.stringify(data, null, 2);
};

export const importAppData = (jsonString: string, mode: "merge" | "replace"): boolean => {
  migrateOnce();

  try {
    const parsed = JSON.parse(jsonString) as Partial<AppDataBackup>;
    if (!parsed || typeof parsed !== "object") return false;
    if (typeof parsed.version !== "number" || parsed.version < 1) return false;

    const customPrices = sanitizePriceMap(parsed.customPrices);
    const customMaterials = sanitizeCustomMaterials(parsed.customMaterials);
    const favorites = sanitizeStringArray(parsed.favorites);
    const usage = sanitizeUsage(parsed.usage);
    const mappings = sanitizeMappings(parsed.mappings);
    const taxSettings = sanitizeTaxSettings(parsed.taxSettings);
    const laborSettings = sanitizeLaborSettings(parsed.laborSettings);
    const projects = sanitizeBackupProjects(parsed.projects);
    const houseProjects = sanitizeBackupHouseProjects(parsed.houseProjects);
    const userSettings = sanitizeBackupSettings(parsed.userSettings);
    const companyProfile = sanitizeBackupCompanyProfile(parsed.companyProfile);
    const quotes = sanitizeBackupQuotes(parsed.quotes);
    const invoices = sanitizeBackupInvoices(parsed.invoices);
    const docCounters = sanitizeBackupCounters(parsed.docCounters);

    if (mode === "replace") {
      setPriceMap(customPrices);
      setCustomMaterials(customMaterials);
      setFavorites(favorites);
      setUsage(usage);
      setMappings(mappings);
      setTaxSettingsSafe(taxSettings);
      setLaborSettingsSafe(laborSettings);
      replaceProjects(projects);
      replaceHouseProjects(houseProjects);
      if (userSettings) replaceSettings(userSettings);
      if (companyProfile !== undefined) replaceCompanyProfile(companyProfile);
      replaceQuotes(quotes);
      replaceInvoices(invoices);
      if (docCounters) replaceDocumentCounters(docCounters);
    } else {
      setCustomMaterials(mergeById(getCustomMaterials(), customMaterials));
      setPriceMap({ ...readPriceMap(), ...customPrices });
      setMappings({ ...getMappings(), ...mappings });
      setFavorites([...getFavorites(), ...favorites]);
      setUsage({ ...readUsage(), ...usage });
      setTaxSettingsSafe(taxSettings);
      setLaborSettingsSafe(laborSettings);
      replaceProjects(mergeById(getProjects(), projects));
      replaceHouseProjects(mergeById(getHouseProjects(), houseProjects));
      if (userSettings) replaceSettings({ ...getSettings(), ...userSettings });
      if (companyProfile) replaceCompanyProfile(companyProfile);
      replaceQuotes(mergeById(getQuotes(), quotes));
      replaceInvoices(mergeById(getInvoices(), invoices));
      if (docCounters) replaceDocumentCounters(docCounters);
    }

    emitMaterialsChanged({ reason: "import" });
    return true;
  } catch (error) {
    console.error("Import failed", error);
    return false;
  }
};

export const getSystemMaterialsList = () => {
  migrateOnce();
  const overrides = readPriceMap();
  const mappings = getMappings();
  const tax = getTaxSettings();
  const customs = getCustomMaterials();

  const keys = Object.keys(DEFAULT_PRICES)
    .map((key) => String(key).toUpperCase().trim())
    .sort();

  return keys.map((key) => {
    const meta = getMaterialMetadata(String(key || "").toUpperCase().trim());
    const safeLabel = meta.label;
    const safeCategory = meta.category;
    const safeUnit = meta.unit;
    const imageUrl = (meta as { imageUrl?: string }).imageUrl;
    const defaultPrice = (DEFAULT_PRICES as Record<string, number>)[key] as number;

    const userOverride = overrides[key];
    const mappedId = mappings[key];
    const mappedMaterial = mappedId ? customs.find((custom) => custom.id === mappedId) : null;

    let priceHT = defaultPrice;
    if (mappedMaterial) priceHT = mappedMaterial.price;
    else if (userOverride !== undefined) priceHT = userOverride;

    const displayPrice = tax.mode === "TTC" ? priceHT * (1 + tax.vatRate / 100) : priceHT;

    return {
      key,
      imageUrl,
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
