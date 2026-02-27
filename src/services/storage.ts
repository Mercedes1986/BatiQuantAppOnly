// src/services/projectStorage.ts (ou ton chemin actuel)
import type { Project, UserSettings, HouseProject } from "../types";

/**
 * Brand rename: BatiCalc -> BatiQuant
 * Strategy:
 * - New keys (batiquant_*)
 * - Backward compatible: reads old keys if new ones are empty
 * - One-time migration: if old exists and new missing => copy old -> new
 * - Safe for SSR / private mode (localStorage may throw)
 */

const BRAND_PREFIX_NEW = "batiquant";
const BRAND_PREFIX_OLD = "baticalc";

// New keys
const PROJECTS_KEY = `${BRAND_PREFIX_NEW}_projects`;
const HOUSE_PROJECTS_KEY = `${BRAND_PREFIX_NEW}_house_projects`;
const SETTINGS_KEY = `${BRAND_PREFIX_NEW}_settings`;

// Old keys (legacy)
const PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_projects`;
const HOUSE_PROJECTS_KEY_OLD = `${BRAND_PREFIX_OLD}_house_projects`;
const SETTINGS_KEY_OLD = `${BRAND_PREFIX_OLD}_settings`;

// Optional event to refresh UI if needed
const PROJECTS_EVENT = "batiquant:projects_changed";
type ProjectsEventDetail = { reason: "save" | "delete" | "settings" | "import"; key: "projects" | "house_projects" | "settings" };

const canUseStorage = () => {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeGet(key: string): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

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

/** Copy old key -> new key only if new is empty and old exists */
function migrateKey(oldKey: string, newKey: string) {
  const newVal = safeGet(newKey);
  if (newVal && newVal.trim().length > 0) return;

  const oldVal = safeGet(oldKey);
  if (!oldVal || oldVal.trim().length === 0) return;

  safeSet(newKey, oldVal);
  // Optionnel: supprimer l'ancienne clé après migration
  // try { window.localStorage.removeItem(oldKey); } catch {}
}

let didMigrate = false;
function ensureMigratedOnce() {
  if (didMigrate) return;
  didMigrate = true;

  migrateKey(PROJECTS_KEY_OLD, PROJECTS_KEY);
  migrateKey(HOUSE_PROJECTS_KEY_OLD, HOUSE_PROJECTS_KEY);
  migrateKey(SETTINGS_KEY_OLD, SETTINGS_KEY);
}

// --- Projects ---
export const getProjects = (): Project[] => {
  ensureMigratedOnce();
  return safeJsonParse<Project[]>(safeGet(PROJECTS_KEY), []);
};

export const saveProject = (project: Project): void => {
  ensureMigratedOnce();
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);

  if (idx >= 0) projects[idx] = project;
  else projects.push(project);

  safeSet(PROJECTS_KEY, JSON.stringify(projects));
  emitChanged({ reason: "save", key: "projects" });
};

export const deleteProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getProjects().filter((p) => p.id !== id);
  safeSet(PROJECTS_KEY, JSON.stringify(projects));
  emitChanged({ reason: "delete", key: "projects" });
};

// --- HOUSE PROJECTS ---
export const getHouseProjects = (): HouseProject[] => {
  ensureMigratedOnce();
  return safeJsonParse<HouseProject[]>(safeGet(HOUSE_PROJECTS_KEY), []);
};

export const saveHouseProject = (project: HouseProject): void => {
  ensureMigratedOnce();
  const projects = getHouseProjects();
  const idx = projects.findIndex((p) => p.id === project.id);

  if (idx >= 0) projects[idx] = project;
  else projects.push(project);

  safeSet(HOUSE_PROJECTS_KEY, JSON.stringify(projects));
  emitChanged({ reason: "save", key: "house_projects" });
};

export const deleteHouseProject = (id: string): void => {
  ensureMigratedOnce();
  const projects = getHouseProjects().filter((p) => p.id !== id);
  safeSet(HOUSE_PROJECTS_KEY, JSON.stringify(projects));
  emitChanged({ reason: "delete", key: "house_projects" });
};

// --- SETTINGS ---
const DEFAULT_SETTINGS: UserSettings = {
  currency: "€",
  taxRate: 20,
  isPro: false,
};

export const getSettings = (): UserSettings => {
  ensureMigratedOnce();
  return safeJsonParse<UserSettings>(safeGet(SETTINGS_KEY), DEFAULT_SETTINGS);
};

export const saveSettings = (settings: UserSettings): void => {
  ensureMigratedOnce();
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
  emitChanged({ reason: "settings", key: "settings" });
};

export const generateId = (): string => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
};