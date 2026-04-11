import { FREE_HOUSE_PROJECT_LIMIT } from "@/config/premiumConfig";
import type { HouseProject, Project, UserSettings } from "../types";
import {
  canUsePersistentStorage,
  markNamespaceMigrated,
  migrateLegacyKey,
  readJson,
  writeJson,
} from "./persistentStorage";

const BRAND_PREFIX_NEW = "batiquant";
const BRAND_PREFIX_OLD = "baticalc";

const PROJECTS_KEY = `${BRAND_PREFIX_NEW}_projects`;
const HOUSE_PROJECTS_KEY = `${BRAND_PREFIX_NEW}_house_projects`;
const SETTINGS_KEY = `${BRAND_PREFIX_NEW}_settings`;

const PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_projects`;
const HOUSE_PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_house_projects`;
const SETTINGS_KEY_OLD = `${BRAND_PREFIX_OLD}_settings`;

const PROJECTS_EVENT = "batiquant:projects_changed";
const STORAGE_NAMESPACE = "projects";

type ProjectsEventDetail = {
  reason: "save" | "delete" | "settings" | "import";
  key: "projects" | "house_projects" | "settings";
};

export type SaveHouseProjectResult =
  | { ok: true; project: HouseProject }
  | { ok: false; reason: "invalid" | "limit-reached"; limit?: number; currentCount?: number };

const DEFAULT_SETTINGS: UserSettings = {
  currency: "€",
  taxRate: 20,
  isPro: false,
};

const PURCHASE_CACHE_KEY = "batiquant:purchase_cache_v2";

const isBrowser = (): boolean => typeof window !== "undefined";

const hasCachedProEntitlement = (): boolean => {
  if (!isBrowser()) return false;

  try {
    const raw = window.localStorage.getItem(PURCHASE_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { entitled?: unknown };
    return parsed.entitled === true;
  } catch {
    return false;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const toTrimmedString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toIsoDateString = (value: unknown): string => {
  const raw = typeof value === "string" && value.trim() ? value : new Date().toISOString();
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString();
};

const sanitizeMaterialItem = (value: unknown): Project["items"][number] | null => {
  if (!isRecord(value)) return null;

  const id = toTrimmedString(value.id);
  const name = toTrimmedString(value.name);
  if (!id || !name) return null;

  const quantity = Math.max(0, toFiniteNumber(value.quantity));
  const unitPrice = Math.max(0, toFiniteNumber(value.unitPrice));
  const quantityRaw = Math.max(0, toFiniteNumber(value.quantityRaw, quantity));
  const explicitTotal = toFiniteNumber(value.totalPrice, quantity * unitPrice);
  const totalPrice = Math.max(0, explicitTotal || quantity * unitPrice);

  return {
    id,
    name,
    quantity,
    quantityRaw,
    unit: toTrimmedString(value.unit, "unit") as Project["items"][number]["unit"],
    unitPrice,
    totalPrice,
    category: toTrimmedString(value.category, "STRUCTURAL") as Project["items"][number]["category"],
    details: toTrimmedString(value.details) || undefined,
    stepId: toTrimmedString(value.stepId) || undefined,
    refKey: toTrimmedString(value.refKey) || undefined,
    imageUrl: toTrimmedString(value.imageUrl) || undefined,
  };
};

const sanitizeProject = (value: unknown): Project | null => {
  if (!isRecord(value)) return null;

  const id = toTrimmedString(value.id);
  const name = toTrimmedString(value.name);
  if (!id || !name) return null;

  const items = Array.isArray(value.items)
    ? value.items
        .map((item) => sanitizeMaterialItem(item))
        .filter((item): item is Project["items"][number] => item !== null)
    : [];

  return {
    id,
    name,
    date: toIsoDateString(value.date),
    items,
    notes: typeof value.notes === "string" ? value.notes : "",
    calculatorType: toTrimmedString(value.calculatorType) || undefined,
    calculatorLabel: toTrimmedString(value.calculatorLabel) || undefined,
    calculatorSnapshot: isRecord(value.calculatorSnapshot)
      ? (value.calculatorSnapshot as Project["calculatorSnapshot"])
      : undefined,
  };
};

const sanitizeHouseStep = (value: unknown): HouseProject["steps"][keyof HouseProject["steps"]] => {
  if (!isRecord(value)) return undefined;

  const materials = Array.isArray(value.materials)
    ? value.materials
        .map((item) => sanitizeMaterialItem(item))
        .filter((item): item is Project["items"][number] => item !== null)
    : [];

  const explicitCost = toFiniteNumber(value.cost, materials.reduce((sum, item) => sum + item.totalPrice, 0));
  const status = value.status === "done" ? "done" : "pending";

  return {
    status,
    materials,
    cost: Math.max(0, explicitCost),
    notes: typeof value.notes === "string" ? value.notes : undefined,
    calculatorType: toTrimmedString(value.calculatorType) || undefined,
    calculatorSnapshot: isRecord(value.calculatorSnapshot)
      ? (value.calculatorSnapshot as NonNullable<HouseProject["steps"][keyof HouseProject["steps"]]>["calculatorSnapshot"])
      : undefined,
  };
};

const sanitizeHouseProject = (value: unknown): HouseProject | null => {
  if (!isRecord(value)) return null;

  const id = toTrimmedString(value.id);
  const name = toTrimmedString(value.name);
  if (!id || !name) return null;

  const params = isRecord(value.params) ? value.params : {};
  const rawSteps = isRecord(value.steps) ? value.steps : {};
  const nextSteps: HouseProject["steps"] = {};

  Object.entries(rawSteps).forEach(([stepId, stepValue]) => {
    const sanitizedStep = sanitizeHouseStep(stepValue);
    if (sanitizedStep) {
      nextSteps[stepId as keyof HouseProject["steps"]] = sanitizedStep;
    }
  });

  return {
    id,
    name,
    date: toIsoDateString(value.date),
    params: {
      surfaceArea: Math.max(0, toFiniteNumber(params.surfaceArea)),
      groundArea: Math.max(0, toFiniteNumber(params.groundArea, params.surfaceArea)),
      perimeter: Math.max(0, toFiniteNumber(params.perimeter)),
      levels: Math.max(1, Math.trunc(toFiniteNumber(params.levels, 1)) || 1),
      ceilingHeight: Math.max(0, toFiniteNumber(params.ceilingHeight, 2.5)),
    },
    steps: nextSteps,
    quote: isRecord(value.quote) ? (value.quote as HouseProject["quote"]) : undefined,
  };
};

const sanitizeProjectList = (value: unknown): Project[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((project) => sanitizeProject(project))
    .filter((project): project is Project => project !== null);
};

const sanitizeHouseProjectList = (value: unknown): HouseProject[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((project) => sanitizeHouseProject(project))
    .filter((project): project is HouseProject => project !== null);
};

const sanitizeSettings = (value: unknown): UserSettings => {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

  const currency = typeof value.currency === "string" && value.currency.trim() ? value.currency : "€";
  const taxRate =
    typeof value.taxRate === "number" && Number.isFinite(value.taxRate) ? value.taxRate : DEFAULT_SETTINGS.taxRate;
  const isPro = typeof value.isPro === "boolean" ? value.isPro : DEFAULT_SETTINGS.isPro;

  return {
    currency,
    taxRate,
    isPro,
  };
};

function emitChanged(detail: ProjectsEventDetail) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(PROJECTS_EVENT, { detail }));
  } catch {
    // ignore
  }
}

export const onProjectsChanged = (handler: (detail: ProjectsEventDetail) => void) => {
  if (typeof window === "undefined") return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<ProjectsEventDetail>).detail);
  window.addEventListener(PROJECTS_EVENT, fn);
  return () => window.removeEventListener(PROJECTS_EVENT, fn);
};

let didMigrate = false;
function ensureMigratedOnce() {
  if (didMigrate) return;
  didMigrate = true;

  if (!canUsePersistentStorage()) return;

  migrateLegacyKey(PROJECTS_KEY, [PROJECTS_KEY_OLD]);
  migrateLegacyKey(HOUSE_PROJECTS_KEY, [HOUSE_PROJECTS_KEY_OLD]);
  migrateLegacyKey(SETTINGS_KEY, [SETTINGS_KEY_OLD]);
  markNamespaceMigrated(STORAGE_NAMESPACE);
}

const readProjects = (): Project[] => sanitizeProjectList(readJson<unknown>(PROJECTS_KEY, []));
const readHouseProjects = (): HouseProject[] => sanitizeHouseProjectList(readJson<unknown>(HOUSE_PROJECTS_KEY, []));
const readSettings = (): UserSettings => sanitizeSettings(readJson<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS));

const isHouseProjectsPremiumEnabled = (): boolean => {
  const settings = readSettings();
  return settings.isPro === true || hasCachedProEntitlement();
};

export const getProjects = (): Project[] => {
  ensureMigratedOnce();
  return readProjects();
};

export const saveProject = (project: Project): void => {
  ensureMigratedOnce();
  const projects = getProjects();
  const sanitized = sanitizeProject(project);
  if (!sanitized) return;

  const idx = projects.findIndex((p) => p.id === sanitized.id);

  if (idx >= 0) projects[idx] = sanitized;
  else projects.push(sanitized);

  writeJson(PROJECTS_KEY, projects);
  emitChanged({ reason: "save", key: "projects" });
};

export const replaceProjects = (projects: Project[]): void => {
  ensureMigratedOnce();
  writeJson(PROJECTS_KEY, sanitizeProjectList(projects));
  emitChanged({ reason: "import", key: "projects" });
};

export const deleteProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getProjects().filter((p) => p.id !== id);
  writeJson(PROJECTS_KEY, projects);
  emitChanged({ reason: "delete", key: "projects" });
};

export const getHouseProjects = (): HouseProject[] => {
  ensureMigratedOnce();
  return readHouseProjects();
};

export const saveHouseProject = (project: HouseProject): SaveHouseProjectResult => {
  ensureMigratedOnce();
  const projects = getHouseProjects();
  const sanitized = sanitizeHouseProject(project);
  if (!sanitized) return { ok: false, reason: "invalid" };

  const idx = projects.findIndex((p) => p.id === sanitized.id);

  if (idx >= 0) {
    projects[idx] = sanitized;
  } else {
    if (!isHouseProjectsPremiumEnabled() && projects.length >= FREE_HOUSE_PROJECT_LIMIT) {
      return {
        ok: false,
        reason: "limit-reached",
        limit: FREE_HOUSE_PROJECT_LIMIT,
        currentCount: projects.length,
      };
    }

    projects.push(sanitized);
  }

  writeJson(HOUSE_PROJECTS_KEY, projects);
  emitChanged({ reason: "save", key: "house_projects" });
  return { ok: true, project: sanitized };
};

export const replaceHouseProjects = (projects: HouseProject[]): void => {
  ensureMigratedOnce();
  writeJson(HOUSE_PROJECTS_KEY, sanitizeHouseProjectList(projects));
  emitChanged({ reason: "import", key: "house_projects" });
};

export const deleteHouseProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getHouseProjects().filter((p) => p.id !== id);
  writeJson(HOUSE_PROJECTS_KEY, projects);
  emitChanged({ reason: "delete", key: "house_projects" });
};

export const getSettings = (): UserSettings => {
  ensureMigratedOnce();
  return readSettings();
};

export const saveSettings = (settings: UserSettings): void => {
  ensureMigratedOnce();
  writeJson(SETTINGS_KEY, sanitizeSettings(settings));
  emitChanged({ reason: "settings", key: "settings" });
};

export const replaceSettings = (settings: UserSettings): void => {
  ensureMigratedOnce();
  writeJson(SETTINGS_KEY, sanitizeSettings(settings));
  emitChanged({ reason: "import", key: "settings" });
};

export const generateId = (): string => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
};
